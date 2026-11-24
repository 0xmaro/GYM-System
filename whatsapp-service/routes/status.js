const express = require('express');
const router = express.Router();
const { isConnected, getQrCode, getClient } = require('../client');

router.get('/', (req, res) => {
    const connected = isConnected();
    const client    = getClient();

    res.json({
        connected,
        // ✅ رجّع الاتنين عشان ما تتكسرش أي حاجة
        number:       connected && client ? client.info.wid.user : null,
        phone_number: connected && client ? client.info.wid.user : null,
        // ✅ رجّع الـ QR في نفس الـ endpoint
        qr_code:      !connected ? getQrCode() : null,
        // ✅ معلومات إضافية للـ frontend
        queue_pending: 0,
        queue_failed:  0,
        timestamp:    new Date().toISOString(),
    });
});

router.get('/qr', (req, res) => {
    if (isConnected()) {
        return res.json({ connected: true, message: 'Already connected' });
    }

    const qr = getQrCode();
    if (qr) {
        res.json({ connected: false, qr_code: qr });
    } else {
        res.status(404).json({ connected: false, message: 'QR Code not generated yet' });
    }
});

module.exports = router;
