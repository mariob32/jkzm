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
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const chargeId = req.query.id;
    if (!chargeId) return res.status(400).json({ error: 'Charge ID is required' });

    const { reason } = req.body;
    const { ip, user_agent } = getRequestInfo(req);

    try {
        // Get charge
        const { data: before, error: fetchError } = await supabase
            .from('billing_charges')
            .select('*')
            .eq('id', chargeId)
            .single();

        if (fetchError || !before) {
            return res.status(404).json({ error: 'Charge nenájdený' });
        }

        if (before.status === 'void') {
            return res.status(400).json({ error: 'Charge je už void' });
        }

        // Update charge
        const noteUpdate = reason 
            ? (before.note ? `${before.note}\nVoid: ${reason}` : `Void: ${reason}`)
            : before.note;

        const { data: after, error: updateError } = await supabase
            .from('billing_charges')
            .update({
                status: 'void',
                note: noteUpdate
            })
            .eq('id', chargeId)
            .select()
            .single();

        if (updateError) throw updateError;

        // Sync to training if linked
        let training = null;
        if (after.training_id) {
            const { data: trainingData, error: trainingError } = await supabase
                .from('trainings')
                .update({
                    billing_status: 'void'
                })
                .eq('id', after.training_id)
                .select()
                .single();

            if (!trainingError) {
                training = trainingData;
            }
        }

        // Audit
        await logAudit(supabase, {
            action: 'void',
            entity_type: 'billing-charge',
            entity_id: chargeId,
            actor_id: user.id || null,
            actor_name: user.email || user.name || 'admin',
            ip,
            user_agent,
            before_data: before,
            after_data: after
        });

        return res.status(200).json({ charge: after, training });
    } catch (error) {
        console.error('Billing-charges-void error:', error);
        return res.status(500).json({ error: error.message });
    }
};
