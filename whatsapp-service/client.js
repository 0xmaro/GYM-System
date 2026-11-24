const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal'); // المكتبة اللي سطبناها
const axios = require('axios');
require('dotenv').config();

let qrCodeData = null;
let isConnected = false;
let clientInstance = null;

const notifyLaravel = async (status, data = {}) => {
    try {
        await axios.post(process.env.LARAVEL_CALLBACK_URL, {
            status,
            ...data
        }, {
            headers: { Authorization: `Bearer ${process.env.WHATSAPP_SERVICE_SECRET}` },
            timeout: 3000,  // ✅ مش هينتظر أكتر من 3 ثواني
        });
    } catch (err) {
        // ✅ مجرد warning — مش بيوقف الـ bot
        console.warn('[Notify] Laravel unavailable:', err.message);
    }
};

const initializeClient = () => {
    clientInstance = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            // إضافة مسار الكروم في فيدورا لضمان التشغيل
            executablePath: '/usr/bin/google-chrome',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    clientInstance.on('qr', async (qr) => {
        console.log('--- SCAN THIS QR CODE ---');
        // ده السطر اللي هيعرض الـ QR قدامك في التيرمينال
        qrcodeTerminal.generate(qr, {small: true});

        qrCodeData = await qrcode.toDataURL(qr);
        isConnected = false;
    });

    clientInstance.on('ready', () => {
        console.log('✅ WhatsApp Client is Ready!');
        isConnected = true;
        qrCodeData = null;
        notifyLaravel('connected', { phone: clientInstance.info.wid.user });
    });

    clientInstance.on('disconnected', (reason) => {
        console.log('❌ WhatsApp Client Disconnected:', reason);
        isConnected = false;
        notifyLaravel('disconnected', { reason });
        setTimeout(initializeClient, 10000);
    });

    clientInstance.initialize();
};

module.exports = {
    initializeClient,
    getClient: () => clientInstance,
    getQrCode: () => qrCodeData,
    isConnected: () => isConnected
};
