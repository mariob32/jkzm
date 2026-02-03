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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!verifyToken(req)) {
        return res.status(401).json({ error: 'Neautorizovaný prístup' });
    }

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('admin_users')
                .select('id, username, email, role, is_active, last_login, created_at')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return res.status(200).json(data || []);
        }

        if (req.method === 'POST') {
            const { username, email, password, role } = req.body;
            
            if (!username || !password) {
                return res.status(400).json({ error: 'Používateľské meno a heslo sú povinné' });
            }
            
            if (password.length < 6) {
                return res.status(400).json({ error: 'Heslo musí mať minimálne 6 znakov' });
            }
            
            // Kontrola duplicity
            const { data: existing } = await supabase
                .from('admin_users')
                .select('id')
                .eq('username', username)
                .single();
            
            if (existing) {
                return res.status(409).json({ error: 'Používateľ s týmto menom už existuje' });
            }
            
            const password_hash = await bcrypt.hash(password, 10);
            
            const { data, error } = await supabase
                .from('admin_users')
                .insert([{
                    username,
                    email,
                    password_hash,
                    role: role || 'admin',
                    is_active: true
                }])
                .select('id, username, email, role, is_active, created_at')
                .single();
            
            if (error) throw error;
            return res.status(201).json(data);
        }

        return res.status(405).json({ error: 'Metóda nie je povolená' });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Chyba servera', details: error.message });
    }
};
