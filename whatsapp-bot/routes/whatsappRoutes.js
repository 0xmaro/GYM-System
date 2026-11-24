const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');
const { validateToken } = require('../middlewares/auth');

// استيراد middleware (اختياري)
// استيراد middleware مع fallback
let logToDatabase, rateLimitMiddleware, validatePhoneNumber, 
    validateMessage, checkWhatsAppConnection, handleWhatsAppErrors;

try {
  const middleware = require('../middlewares/whatsappMiddleware');
  logToDatabase = middleware.logToDatabase || ((req, res, next) => next());
  rateLimitMiddleware = middleware.rateLimitMiddleware || ((req, res, next) => next());
  validatePhoneNumber = middleware.validatePhoneNumber || ((req, res, next) => { req.cleanedPhone = req.body.phoneNumber; next(); });
  validateMessage = middleware.validateMessage || ((req, res, next) => { req.cleanedMessage = req.body.message; next(); });
  checkWhatsAppConnection = middleware.checkWhatsAppConnection || ((req, res, next) => next());
  handleWhatsAppErrors = middleware.handleWhatsAppErrors || ((err, req, res, next) => res.status(500).json({ success: false, message: err.message }));
} catch (err) {
  console.log('⚠️ whatsappMiddleware not found, using defaults');
  logToDatabase = (req, res, next) => next();
  rateLimitMiddleware = (req, res, next) => next();
  validatePhoneNumber = (req, res, next) => { req.cleanedPhone = req.body.phoneNumber; next(); };
  validateMessage = (req, res, next) => { req.cleanedMessage = req.body.message; next(); };
  checkWhatsAppConnection = (req, res, next) => next();
  handleWhatsAppErrors = (err, req, res, next) => res.status(500).json({ success: false, message: err.message });
}

// ==============================================
// 🔓 Public Routes (بدون حماية - للمراقبة فقط)
// ==============================================


// ==============================================
// 🔒 Protected Routes (محمية بـ Token)
// ==============================================

router.use(validateToken);
router.use(logToDatabase);

// ==================== Routes للتحكم في البوت ====================

// ==================== Routes للتحكم في البوت (جديد) ====================

// تشغيل البوت يدوياً
router.post('/start', async (req, res) => {
  try {
    const result = await whatsappService.startBot();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'فشل في تشغيل البوت',
      error: error.message 
    });
  }
});

// إيقاف البوت يدوياً
router.post('/stop', async (req, res) => {
  try {
    const result = await whatsappService.stopBot();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'فشل في إيقاف البوت',
      error: error.message 
    });
  }
});

// الحصول على حالة الجدولة التلقائية
router.get('/schedule-status', async (req, res) => {
  try {
    const status = whatsappService.getAutoScheduleStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'فشل في جلب حالة الجدولة',
      error: error.message 
    });
  }
});

// تحديث إعدادات الجدولة
router.post('/schedule-settings', async (req, res) => {
  try {
    const result = whatsappService.updateAutoScheduleSettings(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'فشل في تحديث إعدادات الجدولة',
      error: error.message 
    });
  }
});

// فحص وإرسال الرسائل المعلقة يدوياً
router.post('/send-pending', async (req, res) => {
  try {
    const result = await whatsappService.checkAndSendPendingMessages();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'فشل في إرسال الرسائل المعلقة',
      error: error.message 
    });
  }
});

// ==================== Routes الأساسية ====================

// جلب كود QR
router.get('/qr', async (req, res) => {
  try {
    const qr = whatsappService.getQR();
    const status = await whatsappService.getStatus();

    res.json({
      success: true,
      qr,
      hasQR: !!qr,
      message: qr ? '📱 كود QR متاح للمسح' : 'لا يوجد كود QR حالياً',
      whatsappStatus: status.status,
      instructions: qr ? 'افتح واتساب → الإعدادات → الأجهزة المرتبطة → ربط جهاز' : null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل في جلب كود QR',
      code: 'QR_FETCH_ERROR',
      error: error.message
    });
  }
});

// جلب حالة الاتصال مع معلومات شاملة
// ==============================================
// 🔓 Public /status Route (قبل validateToken)
// ==============================================

router.get('/status', async (req, res) => {
  try {
    const isConnected = whatsappService.isClientReady;
    const status = await whatsappService.getStatus();
    
    res.json({ 
      success: true, 
      connected: isConnected,
      status: status.status,
      number: status.number,
      uptime: status.uptime,
      message: isConnected ? '✅ متصل' : '⏳ غير متصل' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// إرسال رسالة نصية
router.post('/send',
  rateLimitMiddleware,
  validatePhoneNumber,
  validateMessage,
  checkWhatsAppConnection,
  async (req, res, next) => {
    try {
      const phoneNumber = req.cleanedPhone;
      const messageText = req.cleanedMessage;
      const options = req.body.options || {};

      console.log(`📤 إرسال رسالة إلى: ${phoneNumber}`);

      const result = await whatsappService.sendMessage(phoneNumber, messageText, options);

      res.json({
        success: true,
        message: '✅ تم إرسال الرسالة بنجاح',
        data: {
          messageId: result.messageId,
          internalId: result.internalId,
          to: phoneNumber,
          sentAt: result.timestamp,
          messageLength: messageText.length,
          status: result.status
        }
      });
    } catch (error) {
      console.error('❌ فشل إرسال الرسالة:', error.message);
      next(error);
    }
  }
);

// ==================== Routes الإحصائيات ====================

// جلب الإحصائيات المفصلة (Route واحد فقط)
router.get('/stats', async (req, res) => {
  try {
    const stats = await whatsappService.getStats();
    const status = await whatsappService.getStatus();
    const failedMessages = await whatsappService.getFailedMessages();
    const pendingMessages = await whatsappService.getPendingConnectionMessages();

    const detailedStats = {
      connection: {
        status: status.status,
        connectedNumber: status.number,
        uptime: status.uptime,
        lastActivity: status.lastActivity
      },
      messages: {
        total: stats.totalMessages,
        sent: stats.sentMessages,
        failed: stats.failedMessagesCount,
        pending: stats.pendingMessagesCount,
        waitingForConnection: pendingMessages.length,
        permanentlyFailed: stats.permanentlyFailed,
        successRate: stats.successRate
      },
      retrySystem: {
        pendingRetries: stats.pendingRetries,
        permanentlyFailed: stats.permanentlyFailed,
        queueLength: failedMessages.length,
        waitingQueueLength: pendingMessages.length,
        randomDelayStats: stats.randomDelayStats,
        connectionWaitingStats: stats.connectionWaitingStats
      },
      performance: {
        messageCount: stats.messageCount,
        averageProcessingTime: '0.5s',
        lastUpdate: new Date().toISOString()
      }
    };

    res.json({
      success: true,
      data: detailedStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الإحصائيات',
      code: 'STATS_ERROR',
      error: error.message
    });
  }
});

// ==================== Routes إدارة الرسائل ====================

// جلب الرسائل المنتظرة للاتصال
router.get('/pending-connection-messages', async (req, res) => {
  try {
    const pendingMessages = await whatsappService.getPendingConnectionMessages();

    res.json({
      success: true,
      message: 'تم جلب الرسائل المنتظرة للاتصال بنجاح',
      data: pendingMessages,
      total: pendingMessages.length,
      summary: {
        totalWaiting: pendingMessages.length,
        oldestWaiting: pendingMessages.length > 0 ?
          Math.min(...pendingMessages.map(msg => new Date(msg.createdAt).getTime())) : null,
        reasons: {
          botDisconnected: pendingMessages.filter(m => m.reason === 'bot_disconnected').length,
          reconnectionLost: pendingMessages.filter(m => m.reason === 'reconnection_lost').length,
          other: pendingMessages.filter(m => !['bot_disconnected', 'reconnection_lost'].includes(m.reason)).length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الرسائل المنتظرة للاتصال',
      code: 'PENDING_CONNECTION_ERROR',
      error: error.message
    });
  }
});

// حذف رسالة واحدة من الرسائل المنتظرة
router.delete('/pending-connection-messages/:messageId', async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const success = await whatsappService.deleteSinglePendingMessage(messageId);

    if (success) {
      res.json({
        success: true,
        message: 'تم حذف الرسالة المحددة بنجاح',
        data: {
          deletedMessageId: messageId,
          deletedAt: new Date().toISOString()
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'الرسالة غير موجودة',
        code: 'MESSAGE_NOT_FOUND'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل في حذف الرسالة',
      code: 'DELETE_SINGLE_PENDING_ERROR',
      error: error.message
    });
  }
});

// مسح جميع الرسائل المنتظرة
router.delete('/pending-connection-messages', async (req, res) => {
  try {
    const success = await whatsappService.clearPendingConnectionMessages();
    
    if (success) {
      res.json({
        success: true,
        message: 'تم مسح جميع الرسائل المنتظرة بنجاح',
        clearedAt: new Date().toISOString()
      });
    } else {
      throw new Error('فشل في مسح الرسائل');
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل في مسح الرسائل المنتظرة',
      code: 'CLEAR_PENDING_ERROR',
      error: error.message
    });
  }
});

// جلب قائمة الرسائل الفاشلة
router.get('/failed-messages', async (req, res) => {
  try {
    const failedMessages = await whatsappService.getFailedMessages();

    const pendingRetry = failedMessages.filter(msg => msg.status === 'pending_retry');
    const permanentlyFailed = failedMessages.filter(msg => msg.status === 'failed_permanently');

    res.json({
      success: true,
      data: failedMessages,
      summary: {
        total: failedMessages.length,
        pendingRetry: pendingRetry.length,
        permanentlyFailed: permanentlyFailed.length,
        nextRetry: pendingRetry.length > 0 ?
          Math.min(...pendingRetry.map(msg => new Date(msg.nextRetry).getTime())) : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل في جلب قائمة الرسائل الفاشلة',
      code: 'FAILED_MESSAGES_ERROR',
      error: error.message
    });
  }
});

// جلب سجل الرسائل
router.get('/history', async (req, res) => {
  try {
    const { limit = 50, type, status, phone, dateFrom, dateTo, page = 1 } = req.query;

    const filters = { limit: parseInt(limit), type, status, phone, dateFrom, dateTo };
    Object.keys(filters).forEach(key => !filters[key] && delete filters[key]);

    const history = await whatsappService.getFilteredMessageHistory(filters);

    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const startIndex = (pageNumber - 1) * pageSize;
    const paginatedHistory = history.slice(startIndex, startIndex + pageSize);

    res.json({
      success: true,
      count: paginatedHistory.length,
      totalCount: history.length,
      page: pageNumber,
      totalPages: Math.ceil(history.length / pageSize),
      data: paginatedHistory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل في جلب سجل الرسائل',
      code: 'HISTORY_ERROR',
      error: error.message
    });
  }
});

// ==================== Routes الإجراءات ====================

// معالجة قائمة إعادة المحاولة
router.post('/process-retry-queue', async (req, res) => {
  try {
    await whatsappService.processRetryQueue();
    res.json({
      success: true,
      message: '✅ تم معالجة قائمة إعادة المحاولة',
      processedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل في معالجة قائمة إعادة المحاولة',
      error: error.message
    });
  }
});

// نقل الرسائل المنتظرة إلى قائمة إعادة المحاولة
router.post('/move-pending-to-retry', checkWhatsAppConnection, async (req, res) => {
  try {
    const movedCount = await whatsappService.movePendingMessagesToRetryQueue();
    
    res.json({
      success: true,
      message: `تم نقل ${movedCount} رسالة إلى قائمة الإرسال`,
      data: {
        movedCount,
        movedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل في نقل الرسائل المنتظرة',
      error: error.message
    });
  }
});

// إعادة إرسال رسالة محددة
router.post('/resend/:messageId', checkWhatsAppConnection, async (req, res, next) => {
  try {
    const messageId = req.params.messageId;
    const result = await whatsappService.resendMessage(messageId);

    res.json({
      success: true,
      message: '✅ تم إعادة إرسال الرسالة بنجاح',
      data: {
        originalMessageId: messageId,
        newMessageId: result.messageId,
        newInternalId: result.internalId,
        to: result.to,
        resentAt: result.timestamp
      }
    });
  } catch (error) {
    next(error);
  }
});

// تسجيل الخروج
router.post('/logout', async (req, res) => {
  try {
    const result = await whatsappService.logout();
    res.json({
      success: result,
      message: result ? '📤 تم تسجيل الخروج بنجاح' : 'فشل في تسجيل الخروج',
      loggedOutAt: result ? new Date().toISOString() : null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل الخروج',
      error: error.message
    });
  }
});

// إعادة الاتصال
router.post('/reconnect', async (req, res) => {
  try {
    const result = await whatsappService.restartClient();
    res.json({
      success: result,
      message: result ? '🔄 تم إعادة الاتصال بنجاح' : 'فشل في إعادة الاتصال',
      reconnectedAt: result ? new Date().toISOString() : null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إعادة الاتصال',
      error: error.message
    });
  }
});

// Route صحة النظام
router.get('/health', async (req, res) => {
  try {
    const status = await whatsappService.getStatus();
    const stats = await whatsappService.getStats();
    const failedMessages = await whatsappService.getFailedMessages();
    const pendingMessages = await whatsappService.getPendingConnectionMessages();

    const health = {
      timestamp: new Date().toISOString(),
      whatsapp: {
        connected: status.status === 'connected',
        status: status.status,
        uptime: status.uptime
      },
      stats: {
        totalMessages: stats.totalMessages,
        sentMessages: stats.sentMessages,
        failedMessages: stats.failedMessagesCount,
        waitingForConnection: pendingMessages.length,
        successRate: stats.successRate
      },
      system: {
        retryQueueLength: failedMessages.length,
        waitingQueueLength: pendingMessages.length
      }
    };

    const isHealthy = status.status === 'connected' &&
                     stats.pendingRetries < 100 &&
                     failedMessages.length < 500 &&
                     pendingMessages.length < 200;

    res.json({
      success: true,
      healthy: isHealthy,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      healthy: false,
      error: error.message
    });
  }
});

// routes/whatsappRoutes.js

// ... كل الـ routes الموجودة

// ==================== Routes الرسائل الواردة (NEW) ====================

// ✅ جلب الرسائل الواردة
router.get('/incoming-messages', async (req, res) => {
  try {
    console.log('📝 جلب الرسائل الواردة...');
    
    const limit = parseInt(req.query.limit) || 50;
    
    // ✅ استخدام readIncomingMessages
    const messages = await whatsappService.readIncomingMessages();
    const unreadCount = await whatsappService.getUnreadIncomingCount();

    console.log(`✅ تم جلب ${messages.length} رسالة، منها ${unreadCount} غير مقروءة`);

    res.json({
      success: true,
      data: {
        messages: messages.slice(-limit).reverse(), // آخر X رسالة بترتيب عكسي
        unreadCount: unreadCount,
        total: messages.length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching incoming messages:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الرسائل الواردة',
      error: error.message
    });
  }
});

// ✅ تعليم رسالة كمقروءة
router.post('/incoming-messages/:messageId/read', async (req, res) => {
  try {
    const { messageId } = req.params;
    const success = await whatsappService.markIncomingAsRead(messageId);

    res.json({
      success: success,
      message: success ? 'تم تعليم الرسالة كمقروءة' : 'الرسالة غير موجودة'
    });
  } catch (error) {
    console.error('❌ Error marking as read:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث الحالة',
      error: error.message
    });
  }
});

// ✅ مسح الرسائل الواردة
router.delete('/incoming-messages', async (req, res) => {
  try {
    await whatsappService.clearIncomingMessages();

    res.json({
      success: true,
      message: 'تم مسح جميع الرسائل الواردة'
    });
  } catch (error) {
    console.error('❌ Error clearing messages:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في مسح الرسائل',
      error: error.message
    });
  }
});

// معالج الأخطاء النهائي
router.use(handleWhatsAppErrors);

module.exports = router;

