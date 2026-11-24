require('dotenv').config();
const express = require('express');
const cors = require('cors'); // تعريف واحد فقط هنا
const { initializeClient } = require('./client');
const sendRoute = require('./routes/send');
const statusRoute = require('./routes/status');

const app = express();

// إعداد الكورس بشكل صحيح لمنع الـ Block والرفرفة
app.use(cors({
    origin: ['http://127.0.0.1:8000', 'http://localhost:8000'],
    credentials: true
}));

app.use(express.json());

// تسجيل المسارات
app.use('/send', sendRoute);
app.use('/status', statusRoute);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`🚀 WhatsApp Microservice is running on port ${PORT}`);
    initializeClient();
});
