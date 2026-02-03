let JSZip;
try {
    JSZip = require('jszip');
} catch (e) {
    JSZip = null;
}
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const { logAudit, getRequestInfo } = require('./utils/audit');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'jkzm-secret-2025';

function verifyToken(req) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    try { return jwt.verify(auth.split(' ')[1], JWT_SECRET); } catch { return null; }
}

function sha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

function parseChecksums(checksumText) {
    const result = {};
    if (!checksumText) return result;
    const lines = checksumText.trim().split('\n');
    for (const line of lines) {
        const match = line.match(/^([a-f0-9]{64})\s+(.+)$/);
        if (match) {
            result[match[2]] = match[1];
        }
    }
    return result;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!JSZip) {
        return res.status(500).json({ error: 'JSZip library not available' });
    }

    const { id } = req.query;
    if (!id) {
        return res.status(400).json({ error: 'Missing id parameter' });
    }

    const { ip, user_agent } = getRequestInfo(req);

    try {
        const { data: exportData, error: selectError } = await supabase
            .from('official_exports')
            .select('id, type, created_at, storage_bucket, storage_path, manifest_json, checksums_sha256, manifest, sha256')
            .eq('id', id)
            .single();

        if (selectError || !exportData) {
            return res.status(404).json({ error: 'Export not found' });
        }

        if (!exportData.storage_path) {
            return res.status(400).json({ error: 'Export has no storage path' });
        }

        const bucket = exportData.storage_bucket || 'exports';
        const storagePath = exportData.storage_path;

        const { data: fileData, error: downloadError } = await supabase.storage
            .from(bucket)
            .download(storagePath);

        if (downloadError || !fileData) {
            const verifiedAt = new Date().toISOString();
            const details = { error: 'Download failed', message: downloadError?.message };
            
            await supabase.from('official_exports').update({
                verified_at: verifiedAt,
                verified_status: 'error',
                verified_details: details,
                verifier_actor_id: user.id || null,
                verifier_actor_name: user.email || user.name || 'admin'
            }).eq('id', id);

            return res.status(200).json({
                success: false,
                status: 'error',
                verified_at: verifiedAt,
                error: 'Failed to download ZIP from storage',
                export_id: id,
                type: exportData.type
            });
        }

        const arrayBuffer = await fileData.arrayBuffer();
        const zipBuffer = Buffer.from(arrayBuffer);

        let zip;
        try {
            zip = await JSZip.loadAsync(zipBuffer);
        } catch (e) {
            const verifiedAt = new Date().toISOString();
            const details = { error: 'Invalid ZIP', message: e.message };
            
            await supabase.from('official_exports').update({
                verified_at: verifiedAt,
                verified_status: 'error',
                verified_details: details,
                verifier_actor_id: user.id || null,
                verifier_actor_name: user.email || user.name || 'admin'
            }).eq('id', id);

            return res.status(200).json({
                success: false,
                status: 'error',
                verified_at: verifiedAt,
                error: 'Invalid ZIP file',
                export_id: id,
                type: exportData.type
            });
        }

        const zipFiles = Object.keys(zip.files).filter(name => !zip.files[name].dir);
        const computedChecksums = {};

        for (const filename of zipFiles) {
            const content = await zip.files[filename].async('nodebuffer');
            computedChecksums[filename] = sha256(content);
        }

        const dbChecksums = parseChecksums(exportData.checksums_sha256) || exportData.sha256 || {};

        const mismatches = [];
        const missing = [];
        const extra = [];

        for (const [filename, expectedHash] of Object.entries(dbChecksums)) {
            if (filename === 'CHECKSUMS.sha256') continue;
            
            if (!computedChecksums[filename]) {
                missing.push(filename);
            } else if (computedChecksums[filename] !== expectedHash) {
                mismatches.push({
                    file: filename,
                    expected: expectedHash,
                    actual: computedChecksums[filename]
                });
            }
        }

        for (const filename of zipFiles) {
            if (filename === 'CHECKSUMS.sha256') continue;
            if (!dbChecksums[filename]) {
                extra.push(filename);
            }
        }

        let manifestMatch = true;
        let manifestDetails = null;
        
        if (zipFiles.includes('MANIFEST.json') && exportData.manifest_json) {
            const manifestContent = await zip.files['MANIFEST.json'].async('string');
            try {
                const zipManifest = JSON.parse(manifestContent);
                const dbManifest = exportData.manifest_json;
                
                const fieldsToCheck = ['type', 'system', 'version'];
                const manifestMismatches = [];
                
                for (const field of fieldsToCheck) {
                    if (zipManifest[field] !== dbManifest[field]) {
                        manifestMismatches.push({
                            field,
                            zip: zipManifest[field],
                            db: dbManifest[field]
                        });
                    }
                }
                
                if (manifestMismatches.length > 0) {
                    manifestMatch = false;
                    manifestDetails = manifestMismatches;
                }
            } catch (e) {
                manifestMatch = false;
                manifestDetails = { error: 'Invalid MANIFEST.json in ZIP' };
            }
        }

        const hasChecksumFile = zipFiles.includes('CHECKSUMS.sha256');
        const hasManifestFile = zipFiles.includes('MANIFEST.json');

        let status = 'ok';
        if (mismatches.length > 0 || missing.length > 0 || !manifestMatch) {
            status = 'mismatch';
        }

        const verifiedAt = new Date().toISOString();
        const details = {
            checksums_verified: mismatches.length === 0 && missing.length === 0,
            manifest_verified: manifestMatch,
            has_checksum_file: hasChecksumFile,
            has_manifest_file: hasManifestFile,
            mismatches,
            missing,
            extra,
            manifest_details: manifestDetails,
            files_in_zip: zipFiles.length,
            files_in_db: Object.keys(dbChecksums).length
        };

        await supabase.from('official_exports').update({
            verified_at: verifiedAt,
            verified_status: status,
            verified_details: details,
            verifier_actor_id: user.id || null,
            verifier_actor_name: user.email || user.name || 'admin'
        }).eq('id', id);

        await logAudit(supabase, {
            action: 'verify',
            entity_type: 'official-export',
            entity_id: id,
            actor_id: user.id || null,
            actor_name: user.email || user.name || 'admin',
            ip,
            user_agent,
            before_data: null,
            after_data: {
                type: exportData.type,
                status,
                verified_at: verifiedAt
            }
        });

        return res.status(200).json({
            success: status === 'ok',
            status,
            verified_at: verifiedAt,
            mismatches,
            missing,
            extra,
            manifest_match: manifestMatch,
            export_id: id,
            type: exportData.type
        });

    } catch (e) {
        console.error('Verify API error:', e.message);
        return res.status(500).json({ error: e.message });
    }
};
