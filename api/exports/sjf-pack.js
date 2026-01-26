let JSZip;
try {
    JSZip = require('jszip');
} catch (e) {
    JSZip = null;
}
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const { escapeValue, DELIMITER, BOM, NEWLINE } = require('../utils/csv');
const { logAudit, getRequestInfo } = require('../utils/audit');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'jkzm-secret-2025';

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

const README_TEXT = `SJF EXPORT - Jazdecký klub Zelená míľa
======================================

Export pre Slovenskú jazdeckú federáciu (SJF).
Obsahuje licenčné a športové údaje.

Obsah balíka:
- horses.csv - Kone s SJF/FEI licenciami
- riders.csv - Jazdci s SJF licenciami
- trainers.csv - Tréneri s SJF licenciami
- competitions.csv - Súťažné výsledky

Dátum exportu: ${getToday()}
Systém: JKZM (Jazdecký klub Zelená míľa)
`;

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

        // 1) HORSES.CSV - SJF/FEI data
        const { data: horses } = await supabase
            .from('horses')
            .select('name, sjf_license_number, sjf_license_valid_until, fei_id, fei_passport_number')
            .order('name');
        
        const horsesCSV = buildCSV(
            ['name', 'sjf_license_number', 'sjf_license_valid_until', 'fei_id', 'fei_passport_number'],
            (horses || []).map(h => [h.name, h.sjf_license_number, h.sjf_license_valid_until, h.fei_id, h.fei_passport_number])
        );
        zip.file('horses.csv', horsesCSV);

        // Build horses map
        const horsesMap = (horses || []).reduce((acc, h) => { acc[h.name] = h; return acc; }, {});

        // 2) RIDERS.CSV
        const { data: riders } = await supabase
            .from('riders')
            .select('name, sjf_id, license_valid_until')
            .order('name');
        
        const ridersCSV = buildCSV(
            ['name', 'sjf_id', 'license_valid_until'],
            (riders || []).map(r => [r.name, r.sjf_id, r.license_valid_until])
        );
        zip.file('riders.csv', ridersCSV);

        // Build riders map
        const ridersMap = (riders || []).reduce((acc, r) => { acc[r.id] = r; return acc; }, {});

        // 3) TRAINERS.CSV
        const { data: trainers } = await supabase
            .from('trainers')
            .select('name, sjf_id, license_valid_until')
            .order('name');
        
        const trainersCSV = buildCSV(
            ['name', 'sjf_id', 'license_valid_until'],
            (trainers || []).map(t => [t.name, t.sjf_id, t.license_valid_until])
        );
        zip.file('trainers.csv', trainersCSV);

        // 4) COMPETITIONS.CSV
        let compQuery = supabase
            .from('competitions')
            .select('name, date')
            .order('date', { ascending: false });
        
        if (from) compQuery = compQuery.gte('date', from);
        if (to) compQuery = compQuery.lte('date', to);
        
        const { data: competitions } = await compQuery;
        
        // Get competition entries with results
        let entriesData = [];
        if (competitions && competitions.length > 0) {
            const { data: entries } = await supabase
                .from('competition_entries')
                .select('competition_id, horse_id, rider_id');
            
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
        zip.file('competitions.csv', competitionsCSV);

        // 5) README.TXT
        zip.file('README.txt', README_TEXT.replace('${getToday()}', today));

        // Generate ZIP
        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

        // Audit log
        await logAudit(supabase, {
            action: 'export',
            entity_type: 'official-export',
            entity_id: null,
            actor_id: user.id || null,
            actor_name: user.email || user.name || 'admin',
            ip,
            user_agent,
            before_data: null,
            after_data: { type: 'sjf', filters: { from, to }, date: today }
        });

        const filename = `jkzm_sjf_export_${today}.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.status(200).send(zipBuffer);

    } catch (e) {
        console.error('SJF export error:', e.message);
        return res.status(500).json({ error: e.message || 'Failed to generate SJF export' });
    }
};
