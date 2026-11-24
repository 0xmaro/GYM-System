require('dotenv').config();

const Queue  = require('bull');
const axios  = require('axios');
const { getClient, isConnected } = require('../client');
const { isAllowedTime, getDelayUntilMorning } = require('../utils/timeGuard');

const messageQueue = new Queue('whatsapp-messages', process.env.REDIS_URL, {
    limiter: { max: 1, duration: 15000 } // رسالة كل 15 ثانية
});

const formatPhone = (phone) => {
    let p = String(phone).replace(/\D/g, '');
    if (p.startsWith('0'))  p = '2' + p;
    if (!p.startsWith('20')) p = '20' + p;
    return `${p}@c.us`;
};

const notifyLaravel = async (payload) => {
    try {
        await axios.post(process.env.LARAVEL_CALLBACK_URL, payload, {
            headers: { Authorization: `Bearer ${process.env.WHATSAPP_SERVICE_SECRET}` },
            timeout: 5000,
        });
    } catch (e) {
        console.error('[Callback] Failed to notify Laravel:', e.message);
    }
};

messageQueue.process(async (job) => {
    const { phone, message, template, variables = {}, client_id, log_id } = job.data;

    if (!isAllowedTime()) {
        const delay = getDelayUntilMorning();
        console.log(`[Queue] ⏰ Delayed until morning — ${phone}`);
        await messageQueue.add(job.data, { delay });
        return 'Delayed';
    }

    if (!isConnected()) throw new Error('WhatsApp not connected');

    const client      = getClient();
    const formatted   = formatPhone(phone);

    // الرسالة: إما message مباشرة، أو template مع variables
    let text = message || '';
    if (!text && variables) {
        text = Object.entries(variables).reduce(
            (msg, [k, v]) => msg.replace(`{${k}}`, v), text
        );
    }

    if (!text) throw new Error('No message content');

    await client.sendMessage(formatted, text);
    console.log(`[Queue] ✅ Sent to ${phone} (log_id: ${log_id})`);

    await notifyLaravel({ log_id, client_id, status: 'sent', error_message: null });
});

messageQueue.on('failed', async (job, err) => {
    console.error(`[Queue] ❌ Failed: ${job.data.phone} — ${err.message}`);
    if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
        await notifyLaravel({
            log_id:        job.data.log_id,
            client_id:     job.data.client_id,
            status:        'failed',
            error_message: err.message,
        });
    }
});

module.exports = messageQueue;
