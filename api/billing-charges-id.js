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

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID is required' });

    const { ip, user_agent } = getRequestInfo(req);

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('billing_charges')
                .select(`
                    *,
                    rider:riders(id, first_name, last_name),
                    horse:horses(id, name),
                    training:trainings(id, training_date, date, discipline),
                    booking:training_bookings(id, slot_id, status)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) return res.status(404).json({ error: 'Charge not found' });

            return res.status(200).json(data);
        }

        if (req.method === 'PATCH') {
            // Get before data
            const { data: before } = await supabase
                .from('billing_charges')
                .select('*')
                .eq('id', id)
                .single();

            if (!before) return res.status(404).json({ error: 'Charge not found' });

            const updates = {};
            const allowedFields = ['amount_cents', 'due_date', 'note', 'status', 'currency'];
            
            for (const field of allowedFields) {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            }

            if (updates.status && !['unpaid', 'paid', 'void'].includes(updates.status)) {
                return res.status(400).json({ error: 'Neplatný status' });
            }

            if (updates.amount_cents !== undefined && updates.amount_cents < 0) {
                return res.status(400).json({ error: 'amount_cents musí byť >= 0' });
            }

            if (Object.keys(updates).length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            const { data, error } = await supabase
                .from('billing_charges')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            await logAudit(supabase, {
                action: 'update',
                entity_type: 'billing-charge',
                entity_id: id,
                actor_id: user.id || null,
                actor_name: user.email || user.name || 'admin',
                ip,
                user_agent,
                before_data: before,
                after_data: data
            });

            return res.status(200).json(data);
        }

        if (req.method === 'DELETE') {
            // Get charge first
            const { data: charge } = await supabase
                .from('billing_charges')
                .select('*')
                .eq('id', id)
                .single();

            if (!charge) return res.status(404).json({ error: 'Charge not found' });

            // Cannot delete paid charges
            if (charge.status === 'paid') {
                return res.status(409).json({ error: 'Nie je možné zmazať uhradenú položku. Použite void.' });
            }

            const { error } = await supabase
                .from('billing_charges')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await logAudit(supabase, {
                action: 'delete',
                entity_type: 'billing-charge',
                entity_id: id,
                actor_id: user.id || null,
                actor_name: user.email || user.name || 'admin',
                ip,
                user_agent,
                before_data: charge,
                after_data: null
            });

            return res.status(200).json({ message: 'Charge deleted' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Billing-charges-id error:', error);
        return res.status(500).json({ error: error.message });
    }
};
