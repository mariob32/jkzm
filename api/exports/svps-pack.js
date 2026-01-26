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

const README_TEXT = `ŠVPS EXPORT - Jazdecký klub Zelená míľa
========================================

Tento export je určený pre potreby ŠVPS SR.
Obsahuje evidenciu koní, pohybov v maštali,
očkovaní a súvisiacich dokumentov.

Obsah balíka:
- horses.csv - Zoznam koní s pasovými údajmi
- stable-log.csv - Maštaľná kniha (príjmy, odchody, karanténa)
- vaccinations.csv - Očkovania
- documents.csv - Súvisiace dokumenty

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

        // 1) HORSES.CSV
        const { data: horses } = await supabase
            .from('horses')
            .select('id, name, passport_number, microchip, status')
            .order('name');
        
        const horsesCSV = buildCSV(
            ['id', 'name', 'passport_number', 'microchip', 'status'],
            (horses || []).map(h => [h.id, h.name, h.passport_number, h.microchip, h.status])
        );
        zip.file('horses.csv', horsesCSV);

        // Build horses map for lookups
        const horsesMap = (horses || []).reduce((acc, h) => { acc[h.id] = h; return acc; }, {});

        // 2) STABLE-LOG.CSV
        let stableQuery = supabase
            .from('stable_log')
            .select('event_date, event_type, horse_id, notes')
            .order('event_date', { ascending: false });
        
        if (from) stableQuery = stableQuery.gte('event_date', from);
        if (to) stableQuery = stableQuery.lte('event_date', to);
        
        const { data: stableLogs } = await stableQuery;
        
        const stableCSV = buildCSV(
            ['event_date', 'event_type', 'horse_name', 'passport_number', 'notes'],
            (stableLogs || []).map(s => {
                const horse = horsesMap[s.horse_id] || {};
                return [s.event_date, s.event_type, horse.name || '', horse.passport_number || '', s.notes];
            })
        );
        zip.file('stable-log.csv', stableCSV);

        // 3) VACCINATIONS.CSV
        let vaccQuery = supabase
            .from('vaccinations')
            .select('horse_id, vaccine_type, vaccination_date, next_date, vet_name')
            .order('vaccination_date', { ascending: false });
        
        if (from) vaccQuery = vaccQuery.gte('vaccination_date', from);
        if (to) vaccQuery = vaccQuery.lte('vaccination_date', to);
        
        const { data: vaccinations } = await vaccQuery;
        
        const vaccCSV = buildCSV(
            ['horse_name', 'vaccine_type', 'vaccination_date', 'next_date', 'vet_name'],
            (vaccinations || []).map(v => {
                const horse = horsesMap[v.horse_id] || {};
                return [horse.name || '', v.vaccine_type, v.vaccination_date, v.next_date, v.vet_name];
            })
        );
        zip.file('vaccinations.csv', vaccCSV);

        // 4) DOCUMENTS.CSV
        let docsQuery = supabase
            .from('documents_v2')
            .select('horse_id, category, title, document_date, file_name')
            .order('document_date', { ascending: false });
        
        if (from) docsQuery = docsQuery.gte('document_date', from);
        if (to) docsQuery = docsQuery.lte('document_date', to);
        
        const { data: documents } = await docsQuery;
        
        const docsCSV = buildCSV(
            ['horse_name', 'category', 'title', 'document_date', 'file_name'],
            (documents || []).map(d => {
                const horse = horsesMap[d.horse_id] || {};
                return [horse.name || '', d.category, d.title, d.document_date, d.file_name];
            })
        );
        zip.file('documents.csv', docsCSV);

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
            after_data: { type: 'svps', filters: { from, to }, date: today }
        });

        const filename = `jkzm_svps_export_${today}.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.status(200).send(zipBuffer);

    } catch (e) {
        console.error('SVPS export error:', e.message);
        return res.status(500).json({ error: e.message || 'Failed to generate SVPS export' });
    }
};
