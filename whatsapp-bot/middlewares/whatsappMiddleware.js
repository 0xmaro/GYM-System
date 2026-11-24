// whatsappMiddleware.js - Middleware محدث مع دعم الرسائل المنتظرة للاتصال

const whatsappService = require('../services/whatsappService');
const fs = require('fs').promises;
const path = require('path');

// إعدادات نظام إعادة المحاولة
const RETRY_CONFIG = {
  maxAttempts: 30,
  initialDelay: 5 * 60 * 1000, // 5 دقائق
  retryDelays: [5 * 60 * 1000, 15 * 60 * 1000, 30 * 60 * 1000] // 5، 15، 30 دقيقة
};

// مسارات ملفات السجلات
const MESSAGE_LOG_FILE = path.join(__dirname, '../logs/messages.json');
const FAILED_MESSAGES_FILE = path.join(__dirname, '../logs/retry_queue.json');
const PENDING_CONNECTION_FILE = path.join(__dirname, '../logs/pending_connection.json');

// إعداد Rate Limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // دقيقة واحدة
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 رسالة في الدقيقة

// دالة التأكد من وجود مجلد السجلات
async function ensureLogDirectory() {
  const logDir = path.dirname(MESSAGE_LOG_FILE);
  const failedLogDir = path.dirname(FAILED_MESSAGES_FILE);
  const pendingLogDir = path.dirname(PENDING_CONNECTION_FILE);

  try {
    // التحقق من وجود مجلد سجل الرسائل العادية
    await fs.access(logDir);
    console.log('✅ مجلد السجلات موجود:', logDir);
  } catch {
    console.log('📁 إنشاء مجلد السجلات:', logDir);
    await fs.mkdir(logDir, { recursive: true });
  }

  // التحقق من وجود مجلد سجل الرسائل الفاشلة (إذا كان مختلف)
  if (logDir !== failedLogDir) {
    try {
      await fs.access(failedLogDir);
      console.log('✅ مجلد سجل الرسائل الفاشلة موجود:', failedLogDir);
    } catch {
      console.log('📁 إنشاء مجلد سجل الرسائل الفاشلة:', failedLogDir);
      await fs.mkdir(failedLogDir, { recursive: true });
    }
  }

  // التحقق من وجود مجلد سجل الرسائل المنتظرة للاتصال
  if (logDir !== pendingLogDir) {
    try {
      await fs.access(pendingLogDir);
      console.log('✅ مجلد سجل الرسائل المنتظرة للاتصال موجود:', pendingLogDir);
    } catch {
      console.log('📁 إنشاء مجلد سجل الرسائل المنتظرة للاتصال:', pendingLogDir);
      await fs.mkdir(pendingLogDir, { recursive: true });
    }
  }
}

// إضافة رسالة منتظرة للاتصال مع معالجة أفضل للأخطاء
async function addToPendingConnectionMessages(messageData) {
  try {
    console.log('📝 بدء إضافة رسالة منتظرة للاتصال...');
    console.log('📊 بيانات الرسالة:', {
      to: messageData.to,
      messageLength: messageData.message?.length,
      reason: messageData.reason
    });

    // التأكد من وجود مجلد السجلات
    await ensureLogDirectory();

    const pendingMessages = await whatsappService.readPendingConnectionMessages();

    const pendingMessage = {
      ...messageData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: messageData.createdAt || new Date().toISOString(),
      status: 'waiting_for_connection',
      waitingSince: new Date().toISOString(),
      maxWaitingDate: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString() // 30 يوم
    };

    console.log(`📝 معرف الرسالة المنتظرة الجديد: ${pendingMessage.id}`);
    console.log(`⏰ أقصى فترة انتظار حتى: ${pendingMessage.maxWaitingDate}`);

    pendingMessages.push(pendingMessage);

    await whatsappService.writePendingConnectionMessages(pendingMessages);

    console.log(`✅ تم إضافة رسالة لانتظار الاتصال: ${pendingMessage.id}`);
    console.log(`📊 إجمالي الرسائل المنتظرة للاتصال: ${pendingMessages.length}`);

    return pendingMessage.id;
  } catch (error) {
    console.error('❌ فشل في إضافة الرسالة المنتظرة للاتصال:', error);
    console.error('تفاصيل الخطأ:', error.stack);
    console.error('بيانات الرسالة:', messageData);
    return null;
  }
}

// قراءة سجل الرسائل الفاشلة
async function readFailedMessages() {
  try {
    await ensureLogDirectory();
    const data = await fs.readFile(FAILED_MESSAGES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log('📝 إنشاء ملف سجل الرسائل الفاشلة الجديد');
    return [];
  }
}

// كتابة سجل الرسائل الفاشلة
async function writeFailedMessages(messages) {
  try {
    await ensureLogDirectory();

    // التأكد من أن البيانات صالحة قبل الكتابة
    if (!Array.isArray(messages)) {
      throw new Error('البيانات ليست مصفوفة صالحة');
    }

    const dataToWrite = JSON.stringify(messages, null, 2);
    console.log(`💾 كتابة ${messages.length} رسالة فاشلة في الملف...`);

    await fs.writeFile(FAILED_MESSAGES_FILE, dataToWrite, 'utf8');
    console.log('✅ تم حفظ الرسائل الفاشلة بنجاح');

  } catch (error) {
    console.error('❌ فشل في كتابة سجل الرسائل الفاشلة:', error);
    console.error('مسار الملف:', FAILED_MESSAGES_FILE);
    console.error('عدد الرسائل:', messages ? messages.length : 'غير معروف');
    throw error;
  }
}

// إضافة رسالة فاشلة مع معالجة أفضل للأخطاء - محسن للرسائل المنتظرة للاتصال
async function addToFailedMessages(messageData) {
  try {
    console.log('📝 بدء إضافة رسالة فاشلة...');
    console.log('📊 بيانات الرسالة:', {
      to: messageData.to,
      messageLength: messageData.message?.length,
      error: messageData.error,
      reason: messageData.reason
    });

    // تحديد إذا كان الخطأ بسبب انقطاع الاتصال
    const errorMsg = (messageData.error || '').toLowerCase();
    const isBotDisconnected = errorMsg.includes('غير متصل') ||
                              errorMsg.includes('غير جاهز') ||
                              errorMsg.includes('disconnected') ||
                              messageData.reason === 'bot_disconnected';

    // إذا كان البوت غير متصل، أضف للرسائل المنتظرة للاتصال
    if (isBotDisconnected) {
      console.log('🔌 البوت غير متصل - إضافة للرسائل المنتظرة للاتصال');
      return await addToPendingConnectionMessages({
        ...messageData,
        reason: messageData.reason || 'bot_disconnected'
      });
    }

    // خلاف ذلك، أضف لقائمة إعادة المحاولة العادية
    console.log('🔄 إضافة لقائمة إعادة المحاولة العادية');

    // التأكد من وجود مجلد السجلات
    await ensureLogDirectory();

    const failedMessages = await readFailedMessages();

    const failedMessage = {
      ...messageData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      attempts: 0,
      maxAttempts: RETRY_CONFIG.maxAttempts,
      nextRetry: new Date(Date.now() + RETRY_CONFIG.initialDelay).toISOString(),
      createdAt: messageData.createdAt || new Date().toISOString(),
      status: 'pending_retry'
    };

    console.log(`📝 معرف الرسالة الفاشلة الجديد: ${failedMessage.id}`);
    console.log(`⏰ موعد المحاولة القادمة: ${failedMessage.nextRetry}`);

    failedMessages.push(failedMessage);

    await writeFailedMessages(failedMessages);

    console.log(`✅ تم إضافة رسالة للإعادة المحاولة: ${failedMessage.id}`);
    console.log(`📊 إجمالي الرسائل الفاشلة: ${failedMessages.length}`);

    return failedMessage.id;
  } catch (error) {
    console.error('❌ فشل في إضافة الرسالة الفاشلة:', error);
    console.error('تفاصيل الخطأ:', error.stack);
    console.error('بيانات الرسالة:', messageData);
    return null;
  }
}

// Middleware للتسجيل
const logWhatsAppRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress;

  console.log(`📝 [${timestamp}] ${method} ${url} من ${ip}`);

  if (method === 'POST' && req.body) {
    const bodyLog = {
      to: req.body.to || req.body.phone || 'غير محدد',
      messageLength: req.body.message ? req.body.message.length : 0,
      hasOptions: !!req.body.options
    };
    console.log('📊 بيانات الطلب:', bodyLog);
  }

  const startTime = Date.now();

  res.on('finish', () => {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`⏱️  [${timestamp}] ${method} ${url} - ${res.statusCode} - ${duration}ms`);
  });

  next();
};

// Middleware للتحقق من حالة الاتصال - محسن للرسائل المنتظرة للاتصال
const checkWhatsAppConnection = async (req, res, next) => {
  try {
    const status = await whatsappService.getStatus();

    if (status.status !== 'connected') {
      console.log('❌ واتساب غير متصل - الحالة:', status.status);

      // رسائل تحذيرية مفصلة حسب حالة الاتصال
      let warningMessage = 'خدمة واتساب غير متوفرة حالياً';
      let suggestion = 'يرجى المحاولة لاحقاً';
      let code = 'WHATSAPP_DISCONNECTED';

      switch (status.status) {
        case 'disconnected':
          warningMessage = '⚠️ بوت واتساب غير متصل';
          suggestion = 'يرجى التأكد من مسح كود QR في إعدادات واتساب';
          code = 'BOT_DISCONNECTED';
          break;

        case 'loading':
          warningMessage = '🔄 بوت واتساب في طور الاتصال';
          suggestion = 'يرجى الانتظار بضع دقائق حتى يكتمل الاتصال';
          code = 'BOT_CONNECTING';
          break;

        case 'qr_needed':
          warningMessage = '📱 يتطلب مسح كود QR';
          suggestion = 'يرجى الذهاب لإعدادات واتساب ومسح كود QR';
          code = 'QR_SCAN_REQUIRED';
          break;

        default:
          warningMessage = `❌ بوت واتساب في حالة غير معروفة: ${status.status}`;
          code = 'UNKNOWN_STATUS';
      }

      // إضافة الرسالة لقائمة انتظار الاتصال إذا كانت هناك بيانات رسالة
      let savedForWaiting = false;
      if (req.body && req.body.message && (req.body.to || req.body.phone)) {
        try {
          const phoneNumber = req.body.to || req.body.phone;
          const cleanNumber = phoneNumber.toString().replace(/\D/g, '');

          console.log('📝 محاولة حفظ الرسالة لانتظار الاتصال...');
          console.log('📱 الرقم:', cleanNumber);
          console.log('💬 الرسالة:', req.body.message.substring(0, 50) + '...');

          await addToFailedMessages({
            type: 'sent',
            to: cleanNumber,
            message: req.body.message,
            error: `البوت غير متصل - الحالة: ${status.status}`,
            options: req.body.options || {},
            disconnectedAt: new Date().toISOString(),
            reason: 'bot_disconnected'
          });

          savedForWaiting = true;
          console.log('✅ تم حفظ الرسالة لانتظار الاتصال بنجاح');
          suggestion += '. تم حفظ رسالتك وسيتم إرسالها تلقائياً عند اتصال البوت';

        } catch (error) {
          console.error('❌ فشل في إضافة الرسالة لقائمة انتظار الاتصال:', error);
          console.error('تفاصيل الخطأ:', error.stack);
        }
      } else {
        console.log('⚠️ لا توجد بيانات رسالة كافية للحفظ');
        console.log('req.body:', req.body);
      }

      // إضافة معلومات الرسائل المنتظرة للاتصال
      const pendingConnectionMessages = await whatsappService.getPendingConnectionMessages();

      return res.status(503).json({
        success: false,
        message: warningMessage,
        whatsappStatus: status.status,
        code: code,
        suggestion: suggestion,
        details: {
          lastActivity: status.lastActivity,
          connectionLost: status.connectionStartTime ?
            new Date().toISOString() : null,
          qrRequired: status.status === 'disconnected',
          canRetryAutomatically: !!(req.body && req.body.message && (req.body.to || req.body.phone)),
          savedForWaiting: savedForWaiting,
          totalWaitingMessages: pendingConnectionMessages.length,
          waitingInfo: savedForWaiting ? {
            message: 'تم حفظ رسالتك في قائمة انتظار الاتصال',
            willBeSentWhen: 'عند عودة اتصال البوت',
            maxWaitingTime: '30 يوم'
          } : null
        },
        actions: {
          refreshStatus: '/api/whatsapp/status',
          getQR: '/api/whatsapp/qr',
          reconnect: '/api/whatsapp/reconnect',
          checkWaitingMessages: '/api/whatsapp/pending-messages'
        }
      });
    }

    // إضافة معلومات الحالة للطلب
    req.whatsappStatus = status;
    console.log('✅ واتساب متصل - الرقم:', status.number);
    next();

  } catch (error) {
    console.error('❌ خطأ في التحقق من حالة واتساب:', error.message);
    console.error('تفاصيل الخطأ:', error.stack);

    // في حالة الخطأ، إضافة الرسالة لقائمة انتظار الاتصال أيضاً
    let savedForWaiting = false;
    if (req.body && req.body.message && (req.body.to || req.body.phone)) {
      try {
        const phoneNumber = req.body.to || req.body.phone;
        const cleanNumber = phoneNumber.toString().replace(/\D/g, '');

        await addToFailedMessages({
          type: 'sent',
          to: cleanNumber,
          message: req.body.message,
          error: `خطأ في التحقق من الحالة: ${error.message}`,
          options: req.body.options || {},
          errorAt: new Date().toISOString(),
          reason: 'status_check_error'
        });
        savedForWaiting = true;
        console.log('✅ تم حفظ الرسالة لانتظار الاتصال بسبب خطأ التحقق');
      } catch (addError) {
        console.error('❌ فشل في إضافة الرسالة للقائمة:', addError);
      }
    }

    res.status(500).json({
      success: false,
      message: '🔧 خطأ فني في التحقق من حالة واتساب',
      error: error.message,
      code: 'WHATSAPP_STATUS_ERROR',
      suggestion: 'يرجى إعادة المحاولة خلال بضع دقائق. إذا استمر المشكل تواصل مع الدعم الفني',
      details: {
        timestamp: new Date().toISOString(),
        canRetryAutomatically: !!(req.body && req.body.message && (req.body.to || req.body.phone)),
        savedForWaiting: savedForWaiting
      }
    });
  }
};

// Middleware للتحقق من صحة رقم الهاتف
const validatePhoneNumber = (req, res, next) => {
  // ✅ عرّف المتغير الأول
  const phoneNumber = req.body.phoneNumber || req.body.phone || req.body.to;

  if (!phoneNumber) {
    return res.status(400).json({
      success: false,
      message: '📱 رقم الهاتف مطلوب',
      code: 'PHONE_REQUIRED',
      field: 'to'
    });
  }

  // تنظيف الرقم من الرموز غير الرقمية
  let cleanNumber = phoneNumber.toString().replace(/\D/g, '');

  // التحقق من الطول
  if (cleanNumber.length < 8) {
    return res.status(400).json({
      success: false,
      message: '📱 رقم الهاتف غير صحيح (يجب أن يكون على الأقل 8 أرقام)',
      code: 'INVALID_PHONE_FORMAT',
      provided: phoneNumber,
      cleaned: cleanNumber
    });
  }

  // ✅ تنسيق مصري
  if (cleanNumber.startsWith('0'))   cleanNumber = '2' + cleanNumber;
  if (!cleanNumber.startsWith('20')) cleanNumber = '20' + cleanNumber;

  req.cleanedPhone = cleanNumber;
  req.body.phone   = cleanNumber;
  console.log(`📱 رقم منظف: ${phoneNumber} -> ${cleanNumber}`);

  next();
};

// Middleware للتحقق من صحة نص الرسالة
const validateMessage = (req, res, next) => {
  const message = req.body.message;

  if (!message) {
    return res.status(400).json({
      success: false,
      message: '💬 نص الرسالة مطلوب',
      code: 'MESSAGE_REQUIRED',
      field: 'message'
    });
  }

  if (typeof message !== 'string') {
    return res.status(400).json({
      success: false,
      message: '💬 نص الرسالة يجب أن يكون نص',
      code: 'MESSAGE_INVALID_TYPE',
      provided: typeof message
    });
  }

  // التحقق من طول الرسالة
  if (message.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: '💬 نص الرسالة لا يمكن أن يكون فارغ',
      code: 'MESSAGE_EMPTY'
    });
  }

  if (message.length > 4096) {
    return res.status(400).json({
      success: false,
      message: '💬 نص الرسالة طويل جداً (الحد الأقصى 4096 حرف)',
      code: 'MESSAGE_TOO_LONG',
      length: message.length,
      maxLength: 4096
    });
  }

  // إضافة النص المنظف للطلب
  req.cleanedMessage = message.trim();
  console.log(`💬 طول الرسالة: ${message.length} حرف`);

  next();
};

// Middleware للحد من معدل الطلبات (Rate Limiting)
const rateLimitMiddleware = (req, res, next) => {
  const identifier = req.ip || 'unknown';
  const now = Date.now();

  // إنشاء مفتاح للمستخدم إذا لم يكن موجود
  if (!rateLimitMap.has(identifier)) {
    rateLimitMap.set(identifier, {
      requests: [],
      lastCleanup: now
    });
  }

  const userLimits = rateLimitMap.get(identifier);

  // تنظيف الطلبات القديمة
  if (now - userLimits.lastCleanup > RATE_LIMIT_WINDOW) {
    userLimits.requests = userLimits.requests.filter(
      requestTime => now - requestTime < RATE_LIMIT_WINDOW
    );
    userLimits.lastCleanup = now;
  }

  // التحقق من تجاوز الحد الأقصى
  if (userLimits.requests.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldestRequest = Math.min(...userLimits.requests);
    const resetTime = oldestRequest + RATE_LIMIT_WINDOW;
    const waitTime = Math.ceil((resetTime - now) / 1000);

    return res.status(429).json({
      success: false,
      message: `🚦 تم تجاوز الحد الأقصى للطلبات (${RATE_LIMIT_MAX_REQUESTS} طلب في الدقيقة)`,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: waitTime,
      limit: RATE_LIMIT_MAX_REQUESTS,
      window: RATE_LIMIT_WINDOW / 1000,
      current: userLimits.requests.length
    });
  }

  // إضافة الطلب الحالي
  userLimits.requests.push(now);

  // إضافة معلومات Rate Limiting للرد
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', RATE_LIMIT_MAX_REQUESTS - userLimits.requests.length);
  res.setHeader('X-RateLimit-Reset', Math.ceil((now + RATE_LIMIT_WINDOW) / 1000));

  next();
};

// Middleware لتسجيل الطلبات في قاعدة البيانات
const logToDatabase = async (req, res, next) => {
  try {
    // يمكن إضافة تسجيل قاعدة البيانات هنا إذا أردت
    // لكن الآن سنكتفي بالتسجيل في الملفات
    next();
  } catch (error) {
    console.error('❌ فشل في تسجيل الطلب في قاعدة البيانات:', error);
    next(); // استمرار حتى لو فشل التسجيل
  }
};

// Middleware لمعالجة أخطاء واتساب
const handleWhatsAppErrors = (error, req, res, next) => {
  console.error('❌ خطأ في واتساب:', error);

  // تحديد نوع الخطأ والرد المناسب
  let statusCode = 500;
  let errorCode = 'WHATSAPP_ERROR';
  let userMessage = 'حدث خطأ في إرسال الرسالة';
  let suggestion = 'يرجى المحاولة مرة أخرى';

  if (error.message.includes('عميل واتساب غير جاهز')) {
    statusCode = 503;
    errorCode = 'CLIENT_NOT_READY';
    userMessage = '🔌 عميل واتساب غير متصل';
    suggestion = 'يرجى التأكد من اتصال البوت ومسح كود QR. تم حفظ رسالتك لإرسالها عند عودة الاتصال';
  } else if (error.message.includes('PHONE_NOT_FOUND')) {
    statusCode = 404;
    errorCode = 'PHONE_NOT_FOUND';
    userMessage = '📱 رقم الهاتف غير موجود على واتساب';
    suggestion = 'تأكد من صحة الرقم ووجوده على واتساب';
  } else if (error.message.includes('MESSAGE_TOO_LONG')) {
    statusCode = 400;
    errorCode = 'MESSAGE_TOO_LONG';
    userMessage = '📝 الرسالة طويلة جداً';
    suggestion = 'يرجى تقصير نص الرسالة';
  } else if (error.message.includes('NETWORK_ERROR')) {
    statusCode = 503;
    errorCode = 'NETWORK_ERROR';
    userMessage = '🌐 مشكلة في الاتصال بالإنترنت';
    suggestion = 'يرجى التحقق من الاتصال والمحاولة مرة أخرى';
  }

  res.status(statusCode).json({
    success: false,
    message: userMessage,
    code: errorCode,
    suggestion: suggestion,
    timestamp: new Date().toISOString(),
    requestId: req.id || 'unknown',
    details: {
      originalError: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      willRetryAutomatically: statusCode === 503 // سيتم إعادة المحاولة تلقائياً للأخطاء المؤقتة
    }
  });
};

// تنظيف بيانات Rate Limiting بشكل دوري
setInterval(() => {
  const now = Date.now();
  for (const [identifier, data] of rateLimitMap.entries()) {
    // إزالة المستخدمين الذين لم يرسلوا طلبات لمدة ساعة
    if (now - data.lastCleanup > 60 * 60 * 1000) {
      rateLimitMap.delete(identifier);
    }
  }
}, 10 * 60 * 1000); // تنظيف كل 10 دقائق

module.exports = {
  logWhatsAppRequest,
  checkWhatsAppConnection,
  validatePhoneNumber,
  validateMessage,
  handleWhatsAppErrors,
  logToDatabase,
  rateLimitMiddleware,

  // وظائف مساعدة
  ensureLogDirectory,
  addToFailedMessages,
  addToPendingConnectionMessages, // جديد
  writeFailedMessages,
  readFailedMessages
};
