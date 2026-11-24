const express      = require('express');
const router       = express.Router();
const messageQueue = require('../queues/messageQueue');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, async (req, res) => {
    const { phone, template, message, variables = {}, client_id, log_id, priority = 'normal' } = req.body;

    if (!phone) return res.status(400).json({ error: 'phone is required' });

    const priorityLevel = priority === 'high' ? 1 : priority === 'normal' ? 2 : 3;

    const job = await messageQueue.add(
        { phone, template, message, variables, client_id, log_id },
        { priority: priorityLevel, attempts: 3, backoff: { type: 'exponential', delay: 30000 } }
    );

    res.json({ queued: true, job_id: job.id });
});

module.exports = router;
