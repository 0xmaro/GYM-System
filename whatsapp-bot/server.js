// server.js - WhatsApp Bot Standalone Server

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5004; // مختلف عن البوت الأول

// ✅ Middleware
app.use(cors({
  origin: '*', // أو حدد الـ domains
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📝 [${timestamp}] ${req.method} ${req.url} من ${req.ip}`);
  next();
});

// ✅ Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    bot: 'WhatsApp Bot Meme',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ✅ Import routes (بعد ما نتأكد الملفات موجودة)
let whatsappRoutes;
try {
  whatsappRoutes = require('./routes/whatsappRoutes');
  app.use('/api/whatsapp', whatsappRoutes);
  console.log('✅ WhatsApp routes loaded');
} catch (err) {
  console.error('❌ Failed to load routes:', err.message);
}

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// ✅ Start server
app.listen(PORT, async () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║  🤖 WhatsApp Bot Meme Started         ║
  ║  📍 Port: ${PORT}                      ║
  ║  🌐 URL: http://localhost:${PORT}     ║
  ║  🔥 Ready to serve!                   ║
  ╚═══════════════════════════════════════╝
  `);

  // ✅ Initialize WhatsApp (بعد التأكد من وجود الـ service)
  try {
    const whatsappService = require('./services/whatsappService');
    await whatsappService.initializeWhatsApp();
    console.log('✅ WhatsApp service initialized');
  } catch (error) {
    console.error('❌ WhatsApp initialization failed:', error.message);
  }
});

// ✅ Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔴 Shutting down...');
  try {
    const whatsappService = require('./services/whatsappService');
    await whatsappService.stopBot();
  } catch (err) {
    console.log('Shutdown without bot stop');
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔴 SIGTERM received...');
  process.exit(0);
});
