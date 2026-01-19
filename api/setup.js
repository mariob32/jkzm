const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    try {
        // Create proper hash for admin123
        const hash = bcrypt.hashSync('admin123', 10);
        
        // Delete old user
        await supabase.from('users').delete().eq('email', 'admin@jkzm.sk');
        
        // Create new user with correct hash
        const { data, error } = await supabase
            .from('users')
            .insert([{ 
                email: 'admin@jkzm.sk', 
                password_hash: hash, 
                name: 'Administrátor', 
                role: 'admin' 
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        res.status(200).json({ 
            message: 'Admin vytvorený!', 
            email: 'admin@jkzm.sk',
            password: 'admin123',
            hash: hash
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
