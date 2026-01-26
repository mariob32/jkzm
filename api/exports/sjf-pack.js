let JSZip;
try {
    JSZip = require('jszip');
} catch (e) {
    JSZip = null;
}
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const { escapeValue, DELIMITER, BOM, NEWLINE } = require('../utils/csv');
const { logAudit, getRequestInfo } = require('../utils/audit');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'jkzm-secret-2025';
const VERSION = '6.15.0';

function verifyToken(req) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    try { return jwt.verify(auth.split(' ')[1], JWT_SECRET); } catch { return null; }
}

function getToday() {
    return new Date().toISOString().split('T')[0];
}

function buildCSV(headers, rows) {
    const headerLine = headers.join(DELIMITER);
    const dataLines = rows.map(row => row.map(v => escapeValue(v)).join(DELIMITER));
    return BOM + headerLine + NEWLINE + dataLines.join(NEWLINE) + NEWLINE;
}

function sha256(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (!JSZip) {
        return res.status(500).json({ error: 'JSZip library not available' });
    }

    const { ip, user_agent } = getRequestInfo(req);
    const { from, to } = req.query;

    try {
        const zip = new JSZip();
        const today = getToday();
        const generatedAt = new Date().toISOString();
        const exportId = crypto.randomUUID();
        const fileContents = {};
        const checksums = {};

        // 1) HORSES.CSV - SJF/FEI data
        const { data: horses } = await supabase
            .from('horses')
            .select('name, sjf_license_number, sjf_license_valid_until, fei_id, fei_passport_number')
            .order('name');
        
        const horsesCSV = buildCSV(
            ['name', 'sjf_license_number', 'sjf_license_valid_until', 'fei_id', 'fei_passport_number'],
            (horses || []).map(h => [h.name, h.sjf_license_number, h.sjf_license_valid_until, h.fei_id, h.fei_passport_number])
        );
        fileContents['horses.csv'] = horsesCSV;

        // 2) RIDERS.CSV
        const { data: riders } = await supabase
            .from('riders')
            .select('name, sjf_id, license_valid_until')
            .order('name');
        
        const ridersCSV = buildCSV(
            ['name', 'sjf_id', 'license_valid_until'],
            (riders || []).map(r => [r.name, r.sjf_id, r.license_valid_until])
        );
        fileContents['riders.csv'] = ridersCSV;

        // 3) TRAINERS.CSV
        const { data: trainers } = await supabase
            .from('trainers')
            .select('name, sjf_id, license_valid_until')
            .order('name');
        
        const trainersCSV = buildCSV(
            ['name', 'sjf_id', 'license_valid_until'],
            (trainers || []).map(t => [t.name, t.sjf_id, t.license_valid_until])
        );
        fileContents['trainers.csv'] = trainersCSV;

        // 4) COMPETITIONS.CSV
        let compQuery = supabase
            .from('competitions')
            .select('id, name, date')
            .order('date', { ascending: false });
        
        if (from) compQuery = compQuery.gte('date', from);
        if (to) compQuery = compQuery.lte('date', to);
        
        const { data: competitions } = await compQuery;
        
        let entriesData = [];
        if (competitions && competitions.length > 0) {
            const { data: entries } = await supabase
                .from('competition_entries')
                .select('id, competition_id, horse_id, rider_id');
            
            const { data: results } = await supabase
                .from('competition_results')
                .select('entry_id, place, points, time');
            
            const { data: horsesAll } = await supabase
                .from('horses')
                .select('id, name');
            const horsesById = (horsesAll || []).reduce((acc, h) => { acc[h.id] = h.name; return acc; }, {});
            
            const { data: ridersAll } = await supabase
                .from('riders')
                .select('id, name');
            const ridersById = (ridersAll || []).reduce((acc, r) => { acc[r.id] = r.name; return acc; }, {});
            
            const compsById = (competitions || []).reduce((acc, c) => { acc[c.id] = c; return acc; }, {});
            const resultsById = (results || []).reduce((acc, r) => { acc[r.entry_id] = r; return acc; }, {});
            
            entriesData = (entries || []).map(e => {
                const comp = compsById[e.competition_id] || {};
                const result = resultsById[e.id] || {};
                return [
                    comp.name || '',
                    comp.date || '',
                    horsesById[e.horse_id] || '',
                    ridersById[e.rider_id] || '',
                    result.place ? `${result.place}. miesto` : ''
                ];
            });
        }
        
        const competitionsCSV = buildCSV(
            ['competition_name', 'date', 'horse_name', 'rider_name', 'result'],
            entriesData
        );
        fileContents['competitions.csv'] = competitionsCSV;

        // 5) README.TXT
        const readmeText = `SJF EXPORT - Jazdecký klub Zelená míľa
======================================

Export pre Slovenskú jazdeckú federáciu (SJF).
Obsahuje licenčné a športové údaje.

Obsah balíka:
- horses.csv - Kone s SJF/FEI licenciami
- riders.csv - Jazdci s SJF licenciami
- trainers.csv - Tréneri s SJF licenciami
- competitions.csv - Súťažné výsledky
- MANIFEST.json - Metadata exportu
- CHECKSUMS.sha256 - Kontrolné súčty

Dátum exportu: ${today}
Systém: JKZM (Jazdecký klub Zelená míľa)
`;
        fileContents['README.txt'] = readmeText;

        // 6) MANIFEST.json
        const files = ['horses.csv', 'riders.csv', 'trainers.csv', 'competitions.csv', 'README.txt', 'MANIFEST.json', 'CHECKSUMS.sha256'];
        const manifest = {
            system: 'JKZM',
            version: VERSION,
            type: 'sjf',
            generated_at: generatedAt,
            filters: { from: from || null, to: to || null },
            files: files,
            note: 'Oficiálny export balík'
        };
        fileContents['MANIFEST.json'] = JSON.stringify(manifest, null, 2);

        // Calculate checksums
        for (const [filename, content] of Object.entries(fileContents)) {
            checksums[filename] = sha256(content);
        }

        // 7) CHECKSUMS.sha256
        const checksumLines = Object.entries(checksums)
            .map(([filename, hash]) => `${hash}  ${filename}`)
            .join('\n');
        fileContents['CHECKSUMS.sha256'] = checksumLines + '\n';

        // Add all files to ZIP
        for (const [filename, content] of Object.entries(fileContents)) {
            zip.file(filename, content);
        }

        // Generate ZIP buffer
        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const sizeBytes = zipBuffer.length;
        const filename = `jkzm_sjf_export_${today}.zip`;
        const storagePath = `official-exports/${exportId}.zip`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('exports')
            .upload(storagePath, zipBuffer, {
                contentType: 'application/zip',
                upsert: true
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError.message);
            return res.status(500).json({ error: 'Failed to upload export: ' + uploadError.message });
        }

        // Save metadata to DB (without zip_bytes)
        const { error: insertError } = await supabase
            .from('official_exports')
            .insert({
                id: exportId,
                type: 'sjf',
                actor_id: user.id || null,
                actor_name: user.email || user.name || 'admin',
                ip,
                user_agent,
                filters: { from: from || null, to: to || null },
                files: files,
                manifest: manifest,
                sha256: checksums,
                storage_path: storagePath,
                size_bytes: sizeBytes
            });

        if (insertError) {
            console.error('DB insert error:', insertError.message);
        }

        // Generate signed URL for download
        const { data: urlData, error: urlError } = await supabase.storage
            .from('exports')
            .createSignedUrl(storagePath, 3600);

        if (urlError) {
            console.error('Signed URL error:', urlError.message);
            return res.status(500).json({ error: 'Failed to generate download URL' });
        }

        // Audit log
        await logAudit(supabase, {
            action: 'export',
            entity_type: 'official-export',
            entity_id: exportId,
            actor_id: user.id || null,
            actor_name: user.email || user.name || 'admin',
            ip,
            user_agent,
            before_data: null,
            after_data: {
                type: 'sjf',
                filters: { from: from || null, to: to || null },
                files: files,
                generated_at: generatedAt,
                size_bytes: sizeBytes,
                export_id: exportId,
                storage_path: storagePath
            }
        });

        return res.status(200).json({
            success: true,
            export_id: exportId,
            filename: filename,
            size_bytes: sizeBytes,
            download_url: urlData.signedUrl
        });

    } catch (e) {
        console.error('SJF export error:', e.message);
        return res.status(500).json({ error: e.message || 'Failed to generate SJF export' });
    }
};
