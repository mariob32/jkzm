const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'jkzm-secret-2025';

function verifyToken(req) {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
        try { return jwt.verify(auth.split(' ')[1], JWT_SECRET); } catch { return null; }
    }
    if (req.query.token) {
        try { return jwt.verify(req.query.token, JWT_SECRET); } catch { return null; }
    }
    return null;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;
    if (!id) {
        return res.status(400).json({ error: 'Missing id parameter' });
    }

    try {
        const { data, error } = await supabase
            .from('official_exports')
            .select('id, type, created_at, actor_name, storage_bucket, storage_path, size_bytes, verified_at, verified_status, verified_details, verifier_actor_name')
            .eq('id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Export not found' });
        }

        const typeLabel = data.type === 'svps' ? 'ŠVPS' : 'SJF';
        const statusLabel = {
            'ok': 'OK - Integrita overená',
            'mismatch': 'NEZHODA - Zistené rozdiely',
            'error': 'CHYBA - Overenie zlyhalo'
        }[data.verified_status] || 'Neoverené';

        let report = `
================================================================================
                    PROTOKOL O OVERENÍ INTEGRITY EXPORTU
================================================================================

IDENTIFIKÁCIA EXPORTU
---------------------
ID exportu:        ${data.id}
Typ:               ${typeLabel}
Vytvorený:         ${data.created_at ? new Date(data.created_at).toLocaleString('sk-SK') : '-'}
Autor exportu:     ${data.actor_name || '-'}
Veľkosť:           ${data.size_bytes ? Math.round(data.size_bytes / 1024) + ' KB' : '-'}

UMIESTNENIE V ÚLOŽISKU
----------------------
Bucket:            ${data.storage_bucket || 'exports'}
Cesta:             ${data.storage_path || '-'}

VÝSLEDOK OVERENIA
-----------------
Stav:              ${statusLabel}
Čas overenia:      ${data.verified_at ? new Date(data.verified_at).toLocaleString('sk-SK') : 'Neoverené'}
Overil:            ${data.verifier_actor_name || '-'}
`;

        if (data.verified_details) {
            const d = data.verified_details;

            report += `
DETAILY OVERENIA
----------------
Kontrolné súčty:   ${d.checksums_verified ? 'OK' : 'NEZHODA'}
MANIFEST.json:     ${d.manifest_verified ? 'OK' : 'NEZHODA'}
Súbor CHECKSUMS:   ${d.has_checksum_file ? 'Prítomný' : 'Chýba'}
Súbor MANIFEST:    ${d.has_manifest_file ? 'Prítomný' : 'Chýba'}
Súborov v ZIP:     ${d.files_in_zip || '-'}
Súborov v DB:      ${d.files_in_db || '-'}
`;

            if (d.mismatches && d.mismatches.length > 0) {
                report += `
NEZHODY KONTROLNÝCH SÚČTOV
--------------------------
`;
                for (const m of d.mismatches) {
                    report += `Súbor: ${m.file}
  Očakávaný: ${m.expected}
  Skutočný:  ${m.actual}
`;
                }
            }

            if (d.missing && d.missing.length > 0) {
                report += `
CHÝBAJÚCE SÚBORY (v ZIP chýbajú)
--------------------------------
`;
                for (const f of d.missing) {
                    report += `- ${f}\n`;
                }
            }

            if (d.extra && d.extra.length > 0) {
                report += `
EXTRA SÚBORY (v DB nie sú evidované)
------------------------------------
`;
                for (const f of d.extra) {
                    report += `- ${f}\n`;
                }
            }

            if (d.manifest_details && !d.manifest_verified) {
                report += `
NEZHODY V MANIFESTE
-------------------
`;
                if (Array.isArray(d.manifest_details)) {
                    for (const m of d.manifest_details) {
                        report += `Pole: ${m.field}
  ZIP:  ${m.zip}
  DB:   ${m.db}
`;
                    }
                } else if (d.manifest_details.error) {
                    report += `Chyba: ${d.manifest_details.error}\n`;
                }
            }

            if (d.error) {
                report += `
CHYBA
-----
${d.error}
${d.message || ''}
`;
            }
        }

        report += `
================================================================================
POZNÁMKA
--------
Overenie integrity bolo vykonané porovnaním SHA-256 kontrolných súčtov súborov
v ZIP balíku s hodnotami uloženými v databáze pri vytvorení exportu.

Systém: JKZM (Jazdecký klub Zelená míľa)
Verzia: 6.16.0
================================================================================
`;

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="verify-report-${data.id}.txt"`);
        return res.status(200).send(report.trim());

    } catch (e) {
        console.error('Verification report API error:', e.message);
        return res.status(500).json({ error: e.message });
    }
};
