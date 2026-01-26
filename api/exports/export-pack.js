const { createClient } = require('@supabase/supabase-js');
const JSZip = require('jszip');
const { buildCSV, buildEmptyCSV, getToday, escapeValue, DELIMITER, BOM, NEWLINE } = require('../utils/csv');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Export configurations
const EXPORTS = {
    tasks: {
        headers: ['id', 'title', 'description', 'priority', 'status', 'due_date', 'horse_id', 'horse_name', 'created_at', 'updated_at'],
        query: async () => {
            const { data, error } = await supabase.from('tasks').select('id, title, description, priority, status, due_date, horse_id, created_at, updated_at').order('created_at', { ascending: false });
            return { data, error, horseField: 'horse_id' };
        },
        mapRow: (t, horsesMap) => [t.id, t.title, t.description, t.priority, t.status, t.due_date, t.horse_id, t.horse_id ? (horsesMap[t.horse_id] || '') : '', t.created_at, t.updated_at]
    },
    'stable-log': {
        headers: ['id', 'event_date', 'event_time', 'event_type', 'horse_id', 'horse_name', 'passport_number', 'microchip', 'notes', 'responsible_person', 'created_at'],
        query: async () => {
            const { data, error } = await supabase.from('stable_log').select('id, event_date, event_time, event_type, horse_id, notes, responsible_person, created_at').order('event_date', { ascending: false });
            return { data, error, horseField: 'horse_id', needsHorseDetails: true };
        },
        mapRow: (l, horsesMap) => {
            const horse = l.horse_id ? (horsesMap[l.horse_id] || {}) : {};
            return [l.id, l.event_date, l.event_time, l.event_type, l.horse_id, horse.name || '', horse.passport || '', horse.chip || '', l.notes, l.responsible_person, l.created_at];
        }
    },
    'visit-log': {
        headers: ['id', 'arrival_date', 'arrival_time', 'departure_time', 'visitor_name', 'organization', 'purpose', 'contact_phone', 'contact_email', 'signature_text', 'notes', 'created_at'],
        query: async () => {
            const { data, error } = await supabase.from('visit_log').select('id, arrival_date, arrival_time, departure_time, visitor_name, organization, purpose, contact_phone, contact_email, signature_text, notes, created_at').order('arrival_date', { ascending: false });
            return { data, error };
        },
        mapRow: (v) => [v.id, v.arrival_date, v.arrival_time, v.departure_time, v.visitor_name, v.organization, v.purpose, v.contact_phone, v.contact_email, v.signature_text, v.notes, v.created_at]
    },
    vaccinations: {
        headers: ['id', 'horse_id', 'horse_name', 'passport_number', 'vaccine_type', 'vaccination_date', 'next_date', 'batch_number', 'vet_name', 'notes', 'created_at'],
        query: async () => {
            const { data, error } = await supabase.from('vaccinations').select('id, horse_id, vaccine_type, vaccination_date, next_date, batch_number, vet_name, notes, created_at').order('next_date', { ascending: true });
            return { data, error, horseField: 'horse_id', needsHorseDetails: true };
        },
        mapRow: (v, horsesMap) => {
            const horse = v.horse_id ? (horsesMap[v.horse_id] || {}) : {};
            return [v.id, v.horse_id, horse.name || '', horse.passport || '', v.vaccine_type, v.vaccination_date, v.next_date, v.batch_number, v.vet_name, v.notes, v.created_at];
        }
    },
    documents: {
        headers: ['id', 'document_date', 'title', 'category', 'horse_id', 'horse_name', 'entity_type', 'entity_id', 'file_name', 'file_url', 'description', 'created_at'],
        query: async () => {
            const { data, error } = await supabase.from('documents_v2').select('id, document_date, title, category, horse_id, entity_type, entity_id, file_name, file_url, description, created_at').order('document_date', { ascending: false });
            return { data, error, horseField: 'horse_id' };
        },
        mapRow: (d, horsesMap) => [d.id, d.document_date, d.title, d.category, d.horse_id, d.horse_id ? (horsesMap[d.horse_id] || '') : '', d.entity_type, d.entity_id, d.file_name, d.file_url, d.description, d.created_at]
    },
    notifications: {
        headers: ['id', 'title', 'message', 'severity', 'source', 'horse_id', 'horse_name', 'entity_type', 'entity_id', 'is_read', 'is_dismissed', 'expires_at', 'created_at'],
        query: async () => {
            const { data, error } = await supabase.from('notifications').select('id, title, message, severity, source, assigned_horse_id, entity_type, entity_id, is_read, is_dismissed, expires_at, created_at').order('created_at', { ascending: false });
            return { data, error, horseField: 'assigned_horse_id' };
        },
        mapRow: (n, horsesMap) => [n.id, n.title, n.message, n.severity, n.source, n.assigned_horse_id, n.assigned_horse_id ? (horsesMap[n.assigned_horse_id] || '') : '', n.entity_type, n.entity_id, n.is_read, n.is_dismissed, n.expires_at, n.created_at]
    },
    'horses-licenses': {
        headers: ['id', 'name', 'stable_name', 'passport_number', 'microchip', 'sjf_license_number', 'sjf_license_valid_until', 'fei_id', 'fei_passport_number', 'fei_passport_expiry', 'fei_registered', 'status'],
        query: async () => {
            const { data, error } = await supabase.from('horses').select('id, name, stable_name, passport_number, microchip, fei_id, fei_passport_number, fei_passport_expiry, fei_registered, sjf_license_number, sjf_license_valid_until, status').order('stable_name', { ascending: true });
            return { data, error };
        },
        mapRow: (h) => [h.id, h.name, h.stable_name, h.passport_number, h.microchip, h.sjf_license_number, h.sjf_license_valid_until, h.fei_id, h.fei_passport_number, h.fei_passport_expiry, h.fei_registered ? 'true' : 'false', h.status]
    }
};

async function fetchHorses(ids, needsDetails = false) {
    if (!ids || ids.length === 0) return {};
    try {
        const { data } = await supabase.from('horses').select('id, name, stable_name, passport_number, microchip').in('id', ids);
        if (!data) return {};
        if (needsDetails) {
            return data.reduce((acc, h) => {
                acc[h.id] = { name: h.stable_name || h.name || '', passport: h.passport_number || '', chip: h.microchip || '' };
                return acc;
            }, {});
        }
        return data.reduce((acc, h) => { acc[h.id] = h.stable_name || h.name || ''; return acc; }, {});
    } catch (e) {
        console.error('Export pack - horses fetch error:', e.message);
        return {};
    }
}

async function generateExportCSV(exportName) {
    const config = EXPORTS[exportName];
    if (!config) return buildEmptyCSV(['error']);
    
    try {
        const result = await config.query();
        if (result.error || !result.data || result.data.length === 0) {
            return buildEmptyCSV(config.headers);
        }
        
        let horsesMap = {};
        if (result.horseField) {
            const horseIds = [...new Set(result.data.filter(r => r[result.horseField]).map(r => r[result.horseField]))];
            horsesMap = await fetchHorses(horseIds, result.needsHorseDetails);
        }
        
        const rows = result.data.map(r => config.mapRow(r, horsesMap));
        return buildCSV(config.headers, rows);
    } catch (e) {
        console.error(`Export pack - ${exportName} error:`, e.message);
        return buildEmptyCSV(config.headers);
    }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const zip = new JSZip();
        const today = getToday();
        
        // Generate all CSVs
        for (const exportName of Object.keys(EXPORTS)) {
            const csvContent = await generateExportCSV(exportName);
            zip.file(`jkzm_${exportName}_${today}.csv`, csvContent);
        }
        
        // Generate ZIP
        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        
        const filename = `jkzm_export-pack_${today}.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.status(200).send(zipBuffer);
        
    } catch (e) {
        console.error('Export pack error:', e.message);
        return res.status(500).json({ error: 'Failed to generate export pack' });
    }
};
