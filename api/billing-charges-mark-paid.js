const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const { logAudit, getRequestInfo } = require('./utils/audit');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'jkzm-secret-2025';

const VALID_PAID_METHODS = ['cash', 'card', 'bank', 'other'];

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

    const { paid_method, paid_reference } = req.body;

    // Validate paid_method
    if (!paid_method) {
        return res.status(400).json({ error: 'paid_method je povinný', valid_methods: VALID_PAID_METHODS });
    }
    if (!VALID_PAID_METHODS.includes(paid_method)) {
        return res.status(400).json({ error: 'Neplatný paid_method', valid_methods: VALID_PAID_METHODS });
    }

    const { ip, user_agent } = getRequestInfo(req);

    try {
        // Get charge
        const { data: charge, error: fetchError } = await supabase
            .from('billing_charges')
            .select('*')
            .eq('id', chargeId)
            .single();

        if (fetchError || !charge) {
            return res.status(404).json({ error: 'Charge nenájdený' });
        }

        // IDEMPOTENT: Already paid - return existing without changes
        if (charge.status === 'paid') {
            let training = null;
            if (charge.training_id) {
                const { data: t } = await supabase.from('trainings').select('*').eq('id', charge.training_id).single();
                training = t;
            }
            return res.status(200).json({ charge, training, idempotent: true });
        }

        // Cannot pay void charge
        if (charge.status === 'void') {
            return res.status(409).json({ error: 'cannot_pay_void', message: 'Stornovaný charge nie je možné uhradiť' });
        }

        // Process payment (unpaid -> paid)
        const before = { ...charge };
        const paidAtTime = new Date().toISOString();

        const { data: after, error: updateError } = await supabase
            .from('billing_charges')
            .update({
                status: 'paid',
                paid_at: paidAtTime,
                paid_method,
                paid_reference: paid_reference || null
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
                    billing_status: 'paid',
                    billing_charge_id: chargeId,
                    payment_status: 'paid'
                })
                .eq('id', after.training_id)
                .select()
                .single();

            if (!trainingError) {
                training = trainingData;
            }
        }

        // Audit with detailed diff
        await logAudit(supabase, {
            action: 'mark-paid',
            entity_type: 'billing-charge',
            entity_id: chargeId,
            actor_id: user.id || null,
            actor_name: user.email || user.name || 'admin',
            ip,
            user_agent,
            before_data: before,
            after_data: after,
            diff: {
                status: { from: before.status, to: 'paid' },
                paid_method: { from: null, to: paid_method },
                paid_reference: paid_reference ? { from: null, to: paid_reference } : undefined
            }
        });

        return res.status(200).json({ charge: after, training });
    } catch (error) {
        console.error('Billing-charges-mark-paid error:', error);
        return res.status(500).json({ error: error.message });
    }
};
