const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'jkzm-secret-2025';

function verifyToken(req) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    try { return jwt.verify(auth.split(' ')[1], JWT_SECRET); } catch { return null; }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!verifyToken(req)) {
        return res.status(401).json({ error: 'Neautorizovaný prístup' });
    }

    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Chýba ID' });

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('admin_users')
                .select('id, username, email, role, is_active, last_login, created_at')
                .eq('id', id)
                .single();
            
            if (error || !data) return res.status(404).json({ error: 'Používateľ nenájdený' });
            return res.status(200).json(data);
        }

        if (req.method === 'PUT') {
            const { username, email, password, role, is_active } = req.body;
            
            const updateData = {};
            if (username !== undefined) updateData.username = username;
            if (email !== undefined) updateData.email = email;
            if (role !== undefined) updateData.role = role;
            if (is_active !== undefined) updateData.is_active = is_active;
            
            if (password && password.length >= 6) {
                updateData.password_hash = await bcrypt.hash(password, 10);
            }
            
            const { data, error } = await supabase
                .from('admin_users')
                .update(updateData)
                .eq('id', id)
                .select('id, username, email, role, is_active, last_login, created_at')
                .single();
            
            if (error || !data) return res.status(404).json({ error: 'Používateľ nenájdený' });
            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            // Ochrana: nemožno zmazať posledného aktívneho admina
            const { data: activeAdmins } = await supabase
                .from('admin_users')
                .select('id')
                .eq('is_active', true);
            
            if (activeAdmins && activeAdmins.length <= 1) {
                return res.status(409).json({ error: 'Nemožno zmazať posledného aktívneho administrátora' });
            }
            
            const { error } = await supabase.from('admin_users').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ success: true, message: 'Používateľ zmazaný' });
        }

        return res.status(405).json({ error: 'Metóda nie je povolená' });
    } catch (error) {
        console.error('Admin users ID error:', error);
        res.status(500).json({ error: 'Chyba servera', details: error.message });
    }
};
