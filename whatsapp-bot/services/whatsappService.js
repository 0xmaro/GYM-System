
const wppconnect = require('@wppconnect-team/wppconnect');
const fs = require('fs').promises;
const path = require('path');
const cron = require('node-cron');
const axios = require('axios'); // تأكد أنه مثبت: npm install axios

let latestQr = null;
let client = null;
let isReady = false;
let connectionStartTime = null;
let messageCount = 0;
let lastActivity = null;

// مسارات ملفات السجلات
const MESSAGE_LOG_FILE = path.join(__dirname, '../logs/messages.json');
const FAILED_MESSAGES_FILE = path.join(__dirname, '../logs/retry_queue.json');
const PENDING_CONNECTION_FILE = path.join(__dirname, '../logs/pending_connection.json');

// إعدادات نظام إعادة المحاولة مع التأخير العشوائي
const RETRY_CONFIG = {
  maxAttempts: 30,
  initialDelay: 5 * 60 * 1000, // 5 دقائق
  retryDelays: [5 * 60 * 1000, 15 * 60 * 1000, 30 * 60 * 1000], // 5، 15، 30 دقيقة

  // إعدادات التأخير العشوائي الجديدة
  randomDelay: {
    enabled: true,
    minSeconds: 30,    // أقل تأخير: 30 ثانية
    maxSeconds: 300,   // أكبر تأخير: 5 دقائق
    distribution: 'exponential' // 'linear' أو 'exponential'
  },

  // إعدادات خاصة بالرسائل المنتظرة للاتصال
  connectionWaiting: {
    maxWaitingDays: 30, // أقصى فترة انتظار للاتصال (30 يوم)
    processingDelayAfterConnection: 2 * 60 * 1000, // تأخير بعد الاتصال قبل بدء الإرسال (2 دقيقة)
    batchSize: 5, // عدد الرسائل المعالجة في كل دفعة
    betweenBatchDelay: 30 * 1000 // تأخير بين الدفعات (30 ثانية)
  }
};

// دالة توليد تأخير عشوائي
function generateRandomDelay() {
  const { minSeconds, maxSeconds, distribution } = RETRY_CONFIG.randomDelay;

  let randomSeconds;

  if (distribution === 'exponential') {
    // توزيع أسي - معظم الرسائل بتأخير قصير، قليل بتأخير طويل
    const lambda = 0.02; // معامل التوزيع الأسي
    const random = Math.random();
    randomSeconds = Math.min(maxSeconds, minSeconds + (-Math.log(random) / lambda));
  } else {
    // توزيع خطي عادي
    randomSeconds = minSeconds + Math.random() * (maxSeconds - minSeconds);
  }

  // إضافة تنويع إضافي بناءً على عدد الرسائل المرسلة مؤخراً
  const recentActivityMultiplier = getRecentActivityMultiplier();
  randomSeconds *= recentActivityMultiplier;

  return Math.floor(randomSeconds) * 1000; // تحويل لميللي ثانية
}

// دالة حساب معامل النشاط الحديث
function getRecentActivityMultiplier() {
  if (!lastActivity) return 1;

  const timeSinceLastActivity = Date.now() - lastActivity.getTime();
  const minutesSinceLastActivity = timeSinceLastActivity / (1000 * 60);

  // كلما قل الوقت منذ آخر نشاط، كلما زاد التأخير
  if (minutesSinceLastActivity < 1) return 2.0;      // نشاط حديث جداً
  if (minutesSinceLastActivity < 5) return 1.5;      // نشاط حديث
  if (minutesSinceLastActivity < 15) return 1.2;     // نشاط متوسط
  return 1.0; // لا يوجد نشاط حديث
}

// دالة توليد تأخير ذكي حسب نوع الخطأ
function generateSmartDelay(errorType = 'general', attemptNumber = 1) {
  let baseDelay = generateRandomDelay();

  // تعديل التأخير حسب نوع الخطأ
  switch (errorType) {
    case 'rate_limit':
      baseDelay *= (2 + attemptNumber); // تأخير أكبر لمشاكل معدل الإرسال
      break;
    case 'network':
      baseDelay *= 1.5; // تأخير متوسط لمشاكل الشبكة
      break;
    case 'server':
      baseDelay *= (1.2 + attemptNumber * 0.3); // تأخير متزايد لمشاكل السيرفر
      break;
    default:
      baseDelay *= 1.1; // تأخير طفيف للأخطاء العامة
  }

  // إضافة حد أقصى للتأخير (30 دقيقة)
  return Math.min(baseDelay, 30 * 60 * 1000);
}

// دالة تصنيف نوع الخطأ
function classifyError(errorMessage) {
  const errorMsg = errorMessage.toLowerCase();

  if (errorMsg.includes('rate') || errorMsg.includes('limit') || errorMsg.includes('spam')) {
    return 'rate_limit';
  }
  if (errorMsg.includes('network') || errorMsg.includes('timeout') || errorMsg.includes('connection')) {
    return 'network';
  }
  if (errorMsg.includes('server') || errorMsg.includes('503') || errorMsg.includes('502')) {
    return 'server';
  }
  if (errorMsg.includes('غير متصل') || errorMsg.includes('غير جاهز') || errorMsg.includes('disconnected')) {
    return 'bot_disconnected';
  }

  return 'general';
}

// إنشاء مجلد السجلات إذا لم يكن موجود
async function ensureLogDirectory() {
  const logDir = path.dirname(MESSAGE_LOG_FILE);
  try {
    await fs.access(logDir);
  } catch {
    await fs.mkdir(logDir, { recursive: true });
  }
}

// قراءة سجل الرسائل المنتظرة للاتصال
async function readPendingConnectionMessages() {
  try {
    await ensureLogDirectory();
    const data = await fs.readFile(PENDING_CONNECTION_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// كتابة سجل الرسائل المنتظرة للاتصال
async function writePendingConnectionMessages(messages) {
  try {
    await ensureLogDirectory();
    await fs.writeFile(PENDING_CONNECTION_FILE, JSON.stringify(messages, null, 2));
  } catch (error) {
    console.error('❌ فشل في كتابة سجل الرسائل المنتظرة للاتصال:', error);
  }
}

// قراءة سجل الرسائل
async function readMessageLog() {
  try {
    await ensureLogDirectory();
    const data = await fs.readFile(MESSAGE_LOG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// قراءة سجل الرسائل الفاشلة
async function readFailedMessages() {
  try {
    await ensureLogDirectory();
    const data = await fs.readFile(FAILED_MESSAGES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// كتابة سجل الرسائل
async function writeMessageLog(messages) {
  try {
    await ensureLogDirectory();
    await fs.writeFile(MESSAGE_LOG_FILE, JSON.stringify(messages, null, 2));
  } catch (error) {
    console.error('❌ فشل في كتابة سجل الرسائل:', error);
  }
}

// كتابة سجل الرسائل الفاشلة
async function writeFailedMessages(messages) {
  try {
    await ensureLogDirectory();
    await fs.writeFile(FAILED_MESSAGES_FILE, JSON.stringify(messages, null, 2));
  } catch (error) {
    console.error('❌ فشل في كتابة سجل الرسائل الفاشلة:', error);
  }
}

// إضافة رسالة للسجل
async function addToMessageLog(messageData) {
  try {
    const messages = await readMessageLog();
    const newMessage = {
      ...messageData,
      timestamp: new Date().toISOString(),
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date()
    };

    messages.push(newMessage);

    // الاحتفاظ بآخر 1000 رسالة فقط
    if (messages.length > 1000) {
      messages.splice(0, messages.length - 1000);
    }

    await writeMessageLog(messages);
    return newMessage.id;
  } catch (error) {
    console.error('❌ فشل في إضافة الرسالة للسجل:', error);
    return null;
  }
}

// إضافة رسالة منتظرة للاتصال (جديد)
async function addToPendingConnectionMessages(messageData, reason = 'bot_disconnected') {
  try {
    const pendingMessages = await readPendingConnectionMessages();

    const pendingMessage = {
      ...messageData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      status: 'waiting_for_connection',
      reason: reason,
      waitingSince: new Date().toISOString(),
      maxWaitingDate: new Date(Date.now() + (RETRY_CONFIG.connectionWaiting.maxWaitingDays * 24 * 60 * 60 * 1000)).toISOString()
    };

    pendingMessages.push(pendingMessage);
    await writePendingConnectionMessages(pendingMessages);

    console.log(`📝 تم إضافة رسالة منتظرة للاتصال: ${pendingMessage.id}`);
    console.log(`⏰ أقصى فترة انتظار حتى: ${pendingMessage.maxWaitingDate}`);

    return pendingMessage.id;
  } catch (error) {
    console.error('❌ فشل في إضافة الرسالة المنتظرة للاتصال:', error);
    return null;
  }
}

// إضافة رسالة فاشلة لنظام إعادة المحاولة مع تأخير عشوائي
async function addToFailedMessages(messageData, errorMessage = '') {
  try {
    const errorType = classifyError(errorMessage);

    // إذا كان الخطأ بسبب انقطاع الاتصال، أضف للرسائل المنتظرة للاتصال
    if (errorType === 'bot_disconnected') {
      return await addToPendingConnectionMessages(messageData, 'bot_disconnected');
    }

    // خلاف ذلك، أضف لقائمة إعادة المحاولة العادية
    const failedMessages = await readFailedMessages();
    const randomDelay = generateSmartDelay(errorType, 1);

    const failedMessage = {
      ...messageData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      attempts: 0,
      maxAttempts: RETRY_CONFIG.maxAttempts,
      nextRetry: new Date(Date.now() + randomDelay).toISOString(),
      createdAt: new Date().toISOString(),
      status: 'pending_retry',
      errorType: errorType,
      originalError: errorMessage,
      randomDelay: randomDelay,
      delayReason: `${errorType}_error_with_smart_delay`
    };

    failedMessages.push(failedMessage);
    await writeFailedMessages(failedMessages);

    const delayMinutes = Math.floor(randomDelay / (1000 * 60));
    const delaySeconds = Math.floor((randomDelay % (1000 * 60)) / 1000);

    console.log(`📝 تم إضافة رسالة للإعادة المحاولة: ${failedMessage.id}`);
    console.log(`⏰ التأخير العشوائي: ${delayMinutes}د ${delaySeconds}ث (نوع الخطأ: ${errorType})`);

    return failedMessage.id;
  } catch (error) {
    console.error('❌ فشل في إضافة الرسالة الفاشلة:', error);
    return null;
  }
}

// نقل الرسائل المنتظرة للاتصال إلى قائمة إعادة المحاولة عند الاتصال (جديد)
async function movePendingMessagesToRetryQueue() {
  try {
    const pendingMessages = await readPendingConnectionMessages();

    if (pendingMessages.length === 0) {
      console.log('📭 لا توجد رسائل منتظرة للاتصال');
      return 0;
    }

    console.log(`🔄 نقل ${pendingMessages.length} رسالة منتظرة إلى قائمة الإرسال...`);

    const failedMessages = await readFailedMessages();
    let movedCount = 0;

    for (const pendingMessage of pendingMessages) {
      // تحقق من عدم انتهاء فترة الانتظار المسموحة
      const maxWaitingTime = new Date(pendingMessage.maxWaitingDate);
      if (new Date() > maxWaitingTime) {
        console.log(`⏰ انتهت فترة الانتظار للرسالة: ${pendingMessage.id}`);
        continue;
      }

      // تحويل إلى رسالة فاشلة عادية مع تأخير قصير
      const initialDelay = RETRY_CONFIG.connectionWaiting.processingDelayAfterConnection +
                          (movedCount * RETRY_CONFIG.connectionWaiting.betweenBatchDelay);

      const retryMessage = {
        ...pendingMessage,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        attempts: 0,
        maxAttempts: RETRY_CONFIG.maxAttempts,
        nextRetry: new Date(Date.now() + initialDelay).toISOString(),
        status: 'pending_retry',
        errorType: 'connection_restored',
        originalError: 'تم نقل من قائمة انتظار الاتصال',
        randomDelay: initialDelay,
        delayReason: 'moved_from_connection_waiting',
        movedFromPending: true,
        originalPendingId: pendingMessage.id,
        waitedSince: pendingMessage.waitingSince
      };

      failedMessages.push(retryMessage);
      movedCount++;

      console.log(`✅ نقل الرسالة ${pendingMessage.id} -> ${retryMessage.id} (تأخير: ${Math.floor(initialDelay/1000)}ث)`);
    }

    if (movedCount > 0) {
      await writeFailedMessages(failedMessages);

      // مسح ملف الرسائل المنتظرة للاتصال
      await writePendingConnectionMessages([]);

      console.log(`🎉 تم نقل ${movedCount} رسالة منتظرة إلى قائمة الإرسال بنجاح`);
    }

    return movedCount;
  } catch (error) {
    console.error('❌ فشل في نقل الرسائل المنتظرة:', error);
    return 0;
  }
}

// تحديث حالة الرسالة في السجل
async function updateMessageStatus(messageId, status, error = null) {
  try {
    const messages = await readMessageLog();
    const messageIndex = messages.findIndex(msg => msg.id === messageId);

    if (messageIndex !== -1) {
      messages[messageIndex].status = status;
      messages[messageIndex].updatedAt = new Date().toISOString();

      if (error) {
        messages[messageIndex].error = error;
      }

      if (status === 'delivered' || status === 'read') {
        messages[messageIndex].deliveredAt = new Date().toISOString();
      }

      await writeMessageLog(messages);
      console.log(`✅ تم تحديث حالة الرسالة ${messageId} إلى: ${status}`);
    }
  } catch (error) {
    console.error('❌ فشل في تحديث حالة الرسالة:', error);
  }
}

// إعادة محاولة إرسال رسالة فاشلة مع تأخير ذكي
async function retryFailedMessage(failedMessage) {
  // فحص مزدوج للتأكد من الاتصال
  if (!client || !isReady) {
    console.log(`⏳ البوت غير متصل - لا يمكن إعادة إرسال الرسالة: ${failedMessage.id}`);
    return false;
  }

  try {
    console.log(`🔄 إعادة محاولة إرسال الرسالة: ${failedMessage.id} (المحاولة ${failedMessage.attempts + 1}/${failedMessage.maxAttempts})`);

    const cleanNumber = failedMessage.to.replace(/\D/g, '');
    const formattedNumber = cleanNumber.includes('@') ? cleanNumber : `${cleanNumber}@c.us`;

    const result = await client.sendText(formattedNumber, failedMessage.message);

    // نجح الإرسال - إزالة من قائمة الفاشلة وتحديث السجل الرئيسي
    await removeFromFailedMessages(failedMessage.id);

    const messageId = await addToMessageLog({
      type: 'sent',
      to: cleanNumber,
      message: failedMessage.message,
      status: 'sent',
      messageId: result.id,
      retryAttempt: failedMessage.attempts + 1,
      originalFailedId: failedMessage.id,
      retriedAt: new Date().toISOString(),
      wasDelayed: true,
      totalDelayUsed: failedMessage.randomDelay,
      movedFromPending: failedMessage.movedFromPending || false
    });

    console.log(`✅ نجح إرسال الرسالة في المحاولة ${failedMessage.attempts + 1}: ${result.id}`);
    return true;

  } catch (error) {
    console.error(`❌ فشل في إعادة الإرسال (المحاولة ${failedMessage.attempts + 1}):`, error.message);

    // تحديث عدد المحاولات مع تأخير ذكي جديد
    const failedMessages = await readFailedMessages();
    const messageIndex = failedMessages.findIndex(msg => msg.id === failedMessage.id);

    if (messageIndex !== -1) {
      const currentMessage = failedMessages[messageIndex];
      currentMessage.attempts += 1;
      currentMessage.lastError = error.message;
      currentMessage.lastAttempt = new Date().toISOString();

      // إذا وصل للحد الأقصى من المحاولات
      if (currentMessage.attempts >= currentMessage.maxAttempts) {
        console.log(`❌ تم الوصول للحد الأقصى من المحاولات للرسالة: ${failedMessage.id}`);
        currentMessage.status = 'failed_permanently';
        currentMessage.finalFailureAt = new Date().toISOString();
      } else {
        // توليد تأخير ذكي جديد بناءً على نوع الخطأ الجديد
        const newErrorType = classifyError(error.message);

        // إذا أصبح البوت غير متصل مرة أخرى، انقل للرسائل المنتظرة
        if (newErrorType === 'bot_disconnected') {
          console.log(`🔄 البوت انقطع مرة أخرى - نقل الرسالة ${failedMessage.id} للانتظار`);

          await addToPendingConnectionMessages({
            type: currentMessage.type,
            to: currentMessage.to,
            message: currentMessage.message,
            options: currentMessage.options || {},
            previousAttempts: currentMessage.attempts,
            previousErrors: currentMessage.lastError,
            transferredFromRetry: true,
            originalFailedId: failedMessage.id
          }, 'reconnection_lost');

          // إزالة من قائمة إعادة المحاولة
          await removeFromFailedMessages(failedMessage.id);
          return false;
        }

        const smartDelay = generateSmartDelay(newErrorType, currentMessage.attempts);

        currentMessage.nextRetry = new Date(Date.now() + smartDelay).toISOString();
        currentMessage.status = 'pending_retry';
        currentMessage.errorType = newErrorType;
        currentMessage.randomDelay = smartDelay;
        currentMessage.delayReason = `attempt_${currentMessage.attempts}_${newErrorType}_error`;

        const delayMinutes = Math.floor(smartDelay / (1000 * 60));
        const delaySeconds = Math.floor((smartDelay % (1000 * 60)) / 1000);

        console.log(`⏰ المحاولة القادمة للرسالة ${failedMessage.id}: ${currentMessage.nextRetry}`);
        console.log(`🎲 تأخير ذكي جديد: ${delayMinutes}د ${delaySeconds}ث (نوع: ${newErrorType})`);
      }

      await writeFailedMessages(failedMessages);
    }

    return false;
  }
}

// إزالة رسالة من قائمة الرسائل الفاشلة
async function removeFromFailedMessages(messageId) {
  try {
    const failedMessages = await readFailedMessages();
    const filteredMessages = failedMessages.filter(msg => msg.id !== messageId);
    await writeFailedMessages(filteredMessages);
  } catch (error) {
    console.error('❌ فشل في إزالة الرسالة من قائمة الفاشلة:', error);
  }
}

// معالجة قائمة الرسائل مع تطبيق التأخير العشوائي
async function processRetryQueue() {
  try {
    const failedMessages = await readFailedMessages();
    const now = new Date();

    const messagesToRetry = failedMessages.filter(msg =>
      msg.status === 'pending_retry' &&
      new Date(msg.nextRetry) <= now &&
      msg.attempts < msg.maxAttempts
    );

    console.log(`🔄 معالجة ${messagesToRetry.length} رسالة في قائمة الانتظار...`);

    // التحقق من حالة اتصال البوت أولاً
    if (!client || !isReady) {
      console.log('⚠️ البوت غير متصل - نقل الرسائل المنتظرة إلى قائمة انتظار الاتصال');

      // نقل الرسائل إلى قائمة انتظار الاتصال بدلاً من تأجيلها
      let movedCount = 0;
      for (const message of messagesToRetry) {
        await addToPendingConnectionMessages({
          type: message.type,
          to: message.to,
          message: message.message,
          options: message.options || {},
          previousAttempts: message.attempts,
          previousErrors: message.lastError,
          transferredFromRetry: true,
          originalFailedId: message.id
        }, 'bot_disconnected_during_retry');

        // إزالة من قائمة إعادة المحاولة
        await removeFromFailedMessages(message.id);
        movedCount++;
      }

      if (movedCount > 0) {
        console.log(`✅ تم نقل ${movedCount} رسالة لانتظار الاتصال`);
      }

      return;
    }

    // البوت متصل - معالجة الرسائل مع تأخيرات عشوائية بين الرسائل
    console.log('✅ البوت متصل - بدء إرسال الرسائل المنتظرة بتأخيرات عشوائية');

    for (let i = 0; i < messagesToRetry.length; i++) {
      const message = messagesToRetry[i];

      try {
        const success = await retryFailedMessage(message);

        if (success) {
          console.log(`✅ نجح إرسال الرسالة: ${message.id}`);
        } else {
          console.log(`❌ فشل إرسال الرسالة: ${message.id}`);
        }

        // تأخير عشوائي بين الرسائل لتجنب الحظر
        if (i < messagesToRetry.length - 1) { // ليس آخر رسالة
          const betweenMessageDelay = Math.floor(Math.random() * 5000) + 2000; // بين 2-7 ثواني
          console.log(`⏳ انتظار ${betweenMessageDelay/1000} ثانية قبل الرسالة التالية...`);
          await new Promise(resolve => setTimeout(resolve, betweenMessageDelay));
        }

      } catch (error) {
        console.error(`❌ خطأ في معالجة الرسالة ${message.id}:`, error.message);
      }
    }

  } catch (error) {
    console.error('❌ خطأ في معالجة قائمة إعادة المحاولة:', error);
  }
}

// تنظيف الرسائل القديمة (أكثر من 7 أيام) - مُحسّن
async function cleanupOldMessages() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // تنظيف سجل الرسائل المرسلة
    const messages = await readMessageLog();
    const filteredMessages = messages.filter(msg => {
      const messageDate = new Date(msg.timestamp || msg.createdAt);
      return messageDate > sevenDaysAgo;
    });
    const removedMessagesCount = messages.length - filteredMessages.length;
    if (removedMessagesCount > 0) {
      await writeMessageLog(filteredMessages);
      console.log(`🗑️ تم حذف ${removedMessagesCount} رسالة قديمة من سجل الرسائل`);
    }

    // تنظيف قائمة الرسائل الفاشلة (إعادة المحاولة)
    const failedMessages = await readFailedMessages();
    const filteredFailedMessages = failedMessages.filter(msg => {
      const messageDate = new Date(msg.createdAt);
      return messageDate > sevenDaysAgo;
    });
    const removedFailedCount = failedMessages.length - filteredFailedMessages.length;
    if (removedFailedCount > 0) {
      await writeFailedMessages(filteredFailedMessages);
      console.log(`🗑️ تم حذف ${removedFailedCount} رسالة فاشلة قديمة من قائمة إعادة المحاولة`);
    }

    // تنظيف الرسائل المنتظرة للاتصال (حذف المنتهية الصلاحية فقط)
    const pendingMessages = await readPendingConnectionMessages();
    const maxWaitingTime = RETRY_CONFIG.connectionWaiting.maxWaitingDays;
    const expiredCutoff = new Date(Date.now() - (maxWaitingTime * 24 * 60 * 60 * 1000));

    const filteredPendingMessages = pendingMessages.filter(msg => {
      const messageDate = new Date(msg.createdAt);
      return messageDate > expiredCutoff;
    });
    const removedPendingCount = pendingMessages.length - filteredPendingMessages.length;
    if (removedPendingCount > 0) {
      await writePendingConnectionMessages(filteredPendingMessages);
      console.log(`🗑️ تم حذف ${removedPendingCount} رسالة منتهية الصلاحية من قائمة انتظار الاتصال (أكثر من ${maxWaitingTime} يوم)`);
    }

    console.log(`🧹 تنظيف مكتمل: حذف ${removedMessagesCount + removedFailedCount + removedPendingCount} رسالة قديمة إجمالاً`);

  } catch (error) {
    console.error('❌ فشل في تنظيف الرسائل القديمة:', error);
  }
}
// تهيئة واتساب مع معالجة محسنة للأحداث
async function initializeWhatsApp() {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  console.log('🔄 بدء تهيئة عميل واتساب...');

  try {
    client = await wppconnect.create({
      session: 'whatsapp-business-session',
      catchQR: (base64Qr, asciiQR) => {
        console.log('📱 كود QR جديد متاح للمسح:');
        console.log(asciiQR);
        latestQr = base64Qr;
        isReady = false;
        connectionStartTime = null;
      },

      statusFind: async (statusSession) => {
        console.log('📡 حالة الجلسة:', statusSession);
        const readyStates = ['isLogged', 'inChat', 'qrReadSuccess', 'CONNECTED', 'successChat'];

        if (readyStates.includes(statusSession)) {
          const wasDisconnected = !isReady;
          isReady = true;
          latestQr = null;
          connectionStartTime = new Date();
          lastActivity = new Date();

          console.log('✅ عميل واتساب جاهز للاستخدام!');

          if (wasDisconnected) {
            console.log('🔄 البوت متصل مرة أخرى - معالجة الرسائل المنتظرة...');
            setTimeout(async () => {
              try {
                const movedCount = await movePendingMessagesToRetryQueue();
                if (movedCount > 0) {
                  console.log(`🎉 تم تفعيل ${movedCount} رسالة منتظرة للإرسال`);
                }
              } catch (error) {
                console.error('❌ فشل في معالجة الرسائل المنتظرة:', error);
              }
            }, 3000);
          }
        } else {
          isReady = false;
          connectionStartTime = null;
        }
      },

      headless: true,
      puppeteerOptions: {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ],
        executablePath: executablePath
      },

      waitForLogin: true,
      autoClose: 0,
      logQR: true
    });

    // إعداد معالجات الأحداث
    if (client) {

      // ✅ معالج الرسائل الواردة (NEW!)
      try {
        if (typeof client.onMessage === 'function') {
        // في دالة initializeWhatsApp() - معالج onMessage

client.onMessage(async (message) => {
  try {
    // تجاهل رسائل المجموعات والرسائل المرسلة منا
    if (message.isGroupMsg || message.fromMe) {
      return;
    }

    // تحديد نوع الرسالة
    let messageBody = '';
    let messageType = 'text';

    if (message.type === 'chat') {
      messageBody = message.body;
      messageType = 'text';
    } else if (message.type === 'image') {
      messageBody = '📷 صورة';
      messageType = 'image';
    } else if (message.type === 'video') {
      messageBody = '🎥 فيديو';
      messageType = 'video';
    } else if (message.type === 'audio' || message.type === 'ptt') {
      messageBody = '🎤 رسالة صوتية';
      messageType = 'audio';
    } else if (message.type === 'document') {
      messageBody = '📄 مستند';
      messageType = 'document';
    } else if (message.type === 'sticker') {
      messageBody = '🎨 ملصق';
      messageType = 'sticker';
    } else {
      messageBody = `📎 ${message.type}`;
      messageType = message.type;
    }

    console.log('📥 رسالة واردة جديدة:', {
      من: message.from,
      الاسم: message.notifyName || message.sender?.pushname || 'مجهول',
      النوع: messageType,
      النص: messageBody.substring(0, 50),
      الوقت: new Date(message.timestamp * 1000)
    });

    // إنشاء كائن الرسالة
    const incomingMessage = {
      id: message.id,
      from: message.from,
      name: message.notifyName || message.sender?.pushname || 'مجهول',
      body: messageBody,
      type: messageType,
      timestamp: new Date(message.timestamp * 1000),
      isRead: false,
      hasMedia: message.hasMedia || false
    };

    // 1️⃣ حفظ في ملف JSON
    await saveIncomingMessage(incomingMessage);

    // 2️⃣ بث الإشعار عبر Socket.IO
    const io = require('../server').io;
    if (io) {
      io.emit('whatsapp:incoming-message', {
        message: incomingMessage,
        totalUnread: await getUnreadIncomingCount()
      });
      console.log('✅ تم بث إشعار الرسالة الواردة عبر Socket.IO');
    }

    // 3️⃣ إرسال webhook للموقع (جديد) ✅
    await sendNotificationToWebsite(incomingMessage);

  } catch (error) {
    console.error('❌ خطأ في معالجة الرسالة الواردة:', error);
  }
});


          console.log('✅ تم تفعيل معالج الرسائل الواردة');
        }
      } catch (error) {
        console.warn('⚠️ لم يتم تفعيل معالج onMessage:', error.message);
      }

      // معالج ACK (موجود بالفعل)
      try {
        if (typeof client.onAck === 'function') {
          client.onAck(async (ackData) => {
            console.log('✓ تأكيد استلام:', ackData);
            lastActivity = new Date();

            if (ackData.id && ackData.ack) {
              let status = 'sent';
              switch (ackData.ack) {
                case 1: status = 'sent'; break;
                case 2: status = 'delivered'; break;
                case 3: status = 'read'; break;
              }

              const messages = await readMessageLog();
              const message = messages.find(msg => msg.messageId === ackData.id);
              if (message) {
                await updateMessageStatus(message.id, status);
              }
            }
          });
        }
      } catch (error) {
        console.warn('⚠️ لم يتم تفعيل معالج onAck:', error.message);
      }

      // معالج StateChange (موجود بالفعل)
      try {
        if (typeof client.onStateChange === 'function') {
          client.onStateChange((state) => {
            console.log('🔄 تغيير حالة الاتصال:', state);
            if (state === 'CONNECTED') {
              isReady = true;
              connectionStartTime = new Date();
            } else if (state === 'UNPAIRED' || state === 'DISCONNECTED') {
              isReady = false;
              connectionStartTime = null;
            }
          });
        }
      } catch (error) {
        console.warn('⚠️ لم يتم تفعيل معالج onStateChange:', error.message);
      }

      console.log('✅ تم إعداد عميل واتساب بنجاح');
    }

  } catch (error) {
    console.error('❌ فشل في تهيئة عميل واتساب:', error);
    isReady = false;
    latestQr = null;
    throw error;
  }

}

// إعدادات الموقع
const WEBSITE_CONFIG = {
  webhookUrl: process.env.LARAVEL_CALLBACK_URL || 'http://localhost:8000/api/v1/whatsapp/callback',
  apiToken: 'your-secret-webhook-token-12345' // نفس التوكن في PHP
};

/**
 * إرسال إشعار webhook للموقع
 */
async function sendNotificationToWebsite(incomingMessage) {
  try {
    console.log('📤 إرسال إشعار للموقع...');

    const response = await axios.post(WEBSITE_CONFIG.webhookUrl, {
      from: incomingMessage.from,
      name: incomingMessage.name,
      message: incomingMessage.body,
      type: incomingMessage.type,
      timestamp: incomingMessage.timestamp,
      messageId: incomingMessage.id,
      status: 'received'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WEBSITE_CONFIG.apiToken}`
      },
      timeout: 5000 // 5 ثواني
    });

    if (response.data && response.data.success) {
      console.log('✅ تم إرسال الإشعار للموقع بنجاح');
      console.log('📊 النتيجة:', response.data.message);
      return true;
    } else {
      console.warn('⚠️ الموقع رد بفشل:', response.data);
      return false;
    }

  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('❌ فشل إرسال الإشعار: انتهت المهلة (timeout)');
    } else if (error.response) {
      console.error('❌ فشل إرسال الإشعار:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('❌ فشل إرسال الإشعار: لا يوجد رد من الموقع');
    } else {
      console.error('❌ فشل إرسال الإشعار:', error.message);
    }
    return false;
  }
}

// إرسال الرسائل مع معالجة محسنة للأخطاء والتأخير العشوائي
async function sendMessage(to, message, options = {}) {
  if (!client || !isReady) {
    const error = new Error('عميل واتساب غير جاهز. يرجى التأكد من الاتصال أولاً.');
    console.error('❌', error.message);

    await addToFailedMessages({
      type: 'sent',
      to: to,
      message: message,
      options
    }, error.message);

    throw error;
  }

  let messageId = null;

  try {
    const cleanNumber = (() => { let n = to.replace(/\D/g, ''); if (n.startsWith('0')) n = '2' + n;
if (!n.startsWith('20')) n = '20' + n; return n; })();
    const formattedNumber = cleanNumber.includes('@') ? cleanNumber : `${cleanNumber}@c.us`;

    messageId = await addToMessageLog({
      type: 'sent',
      to: cleanNumber,
      message: message,
      status: 'pending',
      options
    });

    // تأخير عشوائي قبل الإرسال لتجنب الحظر
    if (options.useRandomDelay !== false) {
      const sendDelay = Math.floor(Math.random() * 3000) + 1000; // بين 1-4 ثواني
      console.log(`⏳ تأخير عشوائي قبل الإرسال: ${sendDelay/1000} ثانية`);
      await new Promise(resolve => setTimeout(resolve, sendDelay));
    }

    const result = await client.sendText(formattedNumber, message);

    messageCount++;
    lastActivity = new Date();

    console.log('✅ تم إرسال الرسالة بنجاح. ID:', result.id);

    if (messageId) {
      await updateMessageStatus(messageId, 'sent');

      const messages = await readMessageLog();
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      if (messageIndex !== -1) {
        messages[messageIndex].messageId = result.id;
        await writeMessageLog(messages);
      }
    }

    return {
      success: true,
      messageId: result.id,
      internalId: messageId,
      to: cleanNumber,
      message: message,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

  } catch (error) {
    console.error('❌ فشل في إرسال الرسالة:', error);

    if (messageId) {
      await updateMessageStatus(messageId, 'failed', error.message);
    }

    await addToFailedMessages({
      type: 'sent',
      to: to,
      message: message,
      options,
      originalMessageId: messageId
    }, error.message);

    throw error;
  }
}

// إعادة إرسال رسالة محددة يدوياً
async function resendMessage(messageId) {
  try {
    const messages = await readMessageLog();
    const message = messages.find(msg => msg.id === messageId);

    if (!message) {
      throw new Error('الرسالة غير موجودة');
    }

    if (message.status === 'sent' || message.status === 'delivered' || message.status === 'read') {
      throw new Error('الرسالة تم إرسالها بنجاح مسبقاً');
    }

    console.log(`🔄 إعادة إرسال الرسالة: ${messageId}`);

    const result = await sendMessage(message.to, message.message, message.options || {});

    await updateMessageStatus(messageId, 'resent', `تم إعادة الإرسال بمعرف جديد: ${result.internalId}`);

    return result;

  } catch (error) {
    console.error('❌ فشل في إعادة الإرسال:', error);
    throw error;
  }
}

// جلب إحصائيات مفصلة مع معلومات التأخير العشوائي
async function getStats() {
  try {
    const messages = await readMessageLog();
    const failedMessages = await readFailedMessages();
    const pendingMessages = await readPendingConnectionMessages();

    const totalMessages = messages.length;
    const sentMessages = messages.filter(msg => msg.status === 'sent' || msg.status === 'delivered' || msg.status === 'read').length;
    const failedMessagesCount = messages.filter(msg => msg.status === 'failed').length;
    const pendingMessagesCount = messages.filter(msg => msg.status === 'pending').length;
    const pendingRetries = failedMessages.filter(msg => msg.status === 'pending_retry').length;
    const permanentlyFailed = failedMessages.filter(msg => msg.status === 'failed_permanently').length;
    const waitingForConnection = pendingMessages.length;

    // إحصائيات التأخير العشوائي
    const messagesWithDelay = messages.filter(msg => msg.wasDelayed === true).length;
    const averageDelay = failedMessages.reduce((sum, msg) => {
      return sum + (msg.randomDelay || 0);
    }, 0) / (failedMessages.length || 1);

    const delayDistribution = {
      short: failedMessages.filter(msg => (msg.randomDelay || 0) < 60000).length, // أقل من دقيقة
      medium: failedMessages.filter(msg => (msg.randomDelay || 0) >= 60000 && (msg.randomDelay || 0) < 300000).length, // 1-5 دقائق
      long: failedMessages.filter(msg => (msg.randomDelay || 0) >= 300000).length // أكثر من 5 دقائق
    };

    return {
      totalMessages,
      sentMessages,
      failedMessagesCount,
      pendingMessagesCount,
      pendingRetries,
      permanentlyFailed,
      waitingForConnection, // إحصائية جديدة
      successRate: totalMessages > 0 ? ((sentMessages / totalMessages) * 100).toFixed(2) : 0,
      lastActivity,
      messageCount,
      // معلومات التأخير العشوائي
      randomDelayStats: {
        messagesWithRandomDelay: messagesWithDelay,
        averageDelaySeconds: Math.floor(averageDelay / 1000),
        delayDistribution,
        currentDelayConfig: RETRY_CONFIG.randomDelay
      },
      // إحصائيات انتظار الاتصال
      connectionWaitingStats: {
        totalWaitingMessages: waitingForConnection,
        oldestWaitingMessage: pendingMessages.length > 0 ?
          Math.min(...pendingMessages.map(msg => new Date(msg.createdAt).getTime())) : null,
        maxWaitingDays: RETRY_CONFIG.connectionWaiting.maxWaitingDays
      }
    };
  } catch (error) {
    console.error('❌ فشل في جلب الإحصائيات:', error);
    return {
      totalMessages: 0,
      sentMessages: 0,
      failedMessagesCount: 0,
      pendingMessagesCount: 0,
      pendingRetries: 0,
      permanentlyFailed: 0,
      waitingForConnection: 0,
      successRate: 0,
      lastActivity,
      messageCount,
      randomDelayStats: {
        messagesWithRandomDelay: 0,
        averageDelaySeconds: 0,
        delayDistribution: { short: 0, medium: 0, long: 0 },
        currentDelayConfig: RETRY_CONFIG.randomDelay
      },
      connectionWaitingStats: {
        totalWaitingMessages: 0,
        oldestWaitingMessage: null,
        maxWaitingDays: RETRY_CONFIG.connectionWaiting.maxWaitingDays
      }
    };
  }
}

// جلب سجل الرسائل مع فلترة
async function getFilteredMessageHistory(filters = {}) {
  try {
    let messages = await readMessageLog();

    if (filters.type) {
      messages = messages.filter(msg => msg.type === filters.type);
    }

    if (filters.status) {
      messages = messages.filter(msg => msg.status === filters.status);
    }

    if (filters.phone) {
      const cleanPhone = filters.phone.replace(/\D/g, '');
      messages = messages.filter(msg => msg.to && msg.to.includes(cleanPhone));
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      messages = messages.filter(msg => new Date(msg.timestamp) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      messages = messages.filter(msg => new Date(msg.timestamp) <= toDate);
    }

    // فلترة الرسائل التي استخدمت تأخير عشوائي
    if (filters.withRandomDelay === true) {
      messages = messages.filter(msg => msg.wasDelayed === true);
    } else if (filters.withRandomDelay === false) {
      messages = messages.filter(msg => msg.wasDelayed !== true);
    }

    messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (filters.limit) {
      messages = messages.slice(0, parseInt(filters.limit));
    }

    return messages;
  } catch (error) {
    console.error('❌ فشل في جلب سجل الرسائل:', error);
    return [];
  }
}

// جلب قائمة الرسائل الفاشلة مع معلومات التأخير
async function getFailedMessages() {
  try {
    const failedMessages = await readFailedMessages();

    // إضافة معلومات إضافية عن وقت المحاولة القادمة
    return failedMessages.map(msg => {
      const nextRetryTime = new Date(msg.nextRetry);
      const now = new Date();
      const timeUntilRetry = Math.max(0, nextRetryTime.getTime() - now.getTime());

      return {
        ...msg,
        timeUntilRetryMs: timeUntilRetry,
        timeUntilRetryMinutes: Math.floor(timeUntilRetry / (1000 * 60)),
        isReadyForRetry: timeUntilRetry <= 0,
        delayInfo: {
          delaySeconds: Math.floor((msg.randomDelay || 0) / 1000),
          errorType: msg.errorType || 'unknown',
          delayReason: msg.delayReason || 'unknown'
        }
      };
    });
  } catch (error) {
    console.error('❌ فشل في جلب الرسائل الفاشلة:', error);
    return [];
  }
}

// جلب قائمة الرسائل المنتظرة للاتصال (جديد)
async function getPendingConnectionMessages() {
  try {
    const pendingMessages = await readPendingConnectionMessages();

    return pendingMessages.map(msg => {
      const waitingSince = new Date(msg.waitingSince || msg.createdAt);
      const now = new Date();
      const waitingTime = now.getTime() - waitingSince.getTime();
      const maxWaitingTime = new Date(msg.maxWaitingDate);
      const remainingTime = Math.max(0, maxWaitingTime.getTime() - now.getTime());

      return {
        ...msg,
        waitingTimeMs: waitingTime,
        waitingTimeDays: Math.floor(waitingTime / (1000 * 60 * 60 * 24)),
        waitingTimeHours: Math.floor((waitingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        remainingTimeMs: remainingTime,
        remainingTimeDays: Math.floor(remainingTime / (1000 * 60 * 60 * 24)),
        isExpired: remainingTime <= 0
      };
    });
  } catch (error) {
    console.error('❌ فشل في جلب الرسائل المنتظرة للاتصال:', error);
    return [];
  }
}

// مسح سجل الرسائل
async function clearMessageHistory() {
  try {
    await writeMessageLog([]);
    console.log('🗑️ تم مسح سجل الرسائل');
    return true;
  } catch (error) {
    console.error('❌ فشل في مسح سجل الرسائل:', error);
    return false;
  }
}
// حذف رسالة واحدة من الرسائل المنتظرة للاتصال (جديد)
async function deleteSinglePendingMessage(messageId) {
  try {
    console.log(`🗑️ محاولة حذف رسالة منتظرة واحدة: ${messageId}`);

    const currentMessages = await readPendingConnectionMessages();

    // العثور على الرسالة
    const messageIndex = currentMessages.findIndex(msg =>
      msg.id === messageId || msg.id === parseInt(messageId)
    );

    if (messageIndex === -1) {
      console.log(`⚠️ الرسالة ${messageId} غير موجودة في قائمة الرسائل المنتظرة`);
      return false;
    }

    // إزالة الرسالة من القائمة
    const messageToDelete = currentMessages[messageIndex];
    currentMessages.splice(messageIndex, 1);

    // حفظ القائمة المحدثة
    await writePendingConnectionMessages(currentMessages);

    console.log(`✅ تم حذف الرسالة المنتظرة: ${messageId} (إلى: ${messageToDelete.to})`);
    console.log(`📊 عدد الرسائل المنتظرة المتبقية: ${currentMessages.length}`);

    return true;
  } catch (error) {
    console.error('❌ فشل في حذف الرسالة المنتظرة الواحدة:', error);
    return false;
  }
}
// مسح الرسائل المنتظرة للاتصال (جديد)
async function clearPendingConnectionMessages() {
  try {
    await writePendingConnectionMessages([]);
    console.log('🗑️ تم مسح الرسائل المنتظرة للاتصال');
    return true;
  } catch (error) {
    console.error('❌ فشل في مسح الرسائل المنتظرة للاتصال:', error);
    return false;
  }
}

// تحديث إعدادات التأخير العشوائي
function updateRandomDelayConfig(newConfig) {
  try {
    if (newConfig.minSeconds) RETRY_CONFIG.randomDelay.minSeconds = newConfig.minSeconds;
    if (newConfig.maxSeconds) RETRY_CONFIG.randomDelay.maxSeconds = newConfig.maxSeconds;
    if (newConfig.distribution) RETRY_CONFIG.randomDelay.distribution = newConfig.distribution;
    if (typeof newConfig.enabled === 'boolean') RETRY_CONFIG.randomDelay.enabled = newConfig.enabled;

    console.log('✅ تم تحديث إعدادات التأخير العشوائي:', RETRY_CONFIG.randomDelay);
    return true;
  } catch (error) {
    console.error('❌ فشل في تحديث إعدادات التأخير:', error);
    return false;
  }
}

// تحديث إعدادات انتظار الاتصال (جديد)
function updateConnectionWaitingConfig(newConfig) {
  try {
    if (newConfig.maxWaitingDays) RETRY_CONFIG.connectionWaiting.maxWaitingDays = newConfig.maxWaitingDays;
    if (newConfig.processingDelayAfterConnection) RETRY_CONFIG.connectionWaiting.processingDelayAfterConnection = newConfig.processingDelayAfterConnection;
    if (newConfig.batchSize) RETRY_CONFIG.connectionWaiting.batchSize = newConfig.batchSize;
    if (newConfig.betweenBatchDelay) RETRY_CONFIG.connectionWaiting.betweenBatchDelay = newConfig.betweenBatchDelay;

    console.log('✅ تم تحديث إعدادات انتظار الاتصال:', RETRY_CONFIG.connectionWaiting);
    return true;
  } catch (error) {
    console.error('❌ فشل في تحديث إعدادات انتظار الاتصال:', error);
    return false;
  }
}

// إعداد المهام المجدولة مع تحسينات التأخير العشوائي
function setupCronJobs() {
  // معالجة قائمة إعادة المحاولة كل 3 دقائق
  cron.schedule('*/3 * * * *', async () => {
    console.log('⏰ تشغيل معالج إعادة المحاولة مع التأخير العشوائي...');
    await processRetryQueue();
  });

  // تنظيف الرسائل القديمة يومياً في الساعة 2:00 صباحاً
  cron.schedule('0 2 * * *', async () => {
    console.log('⏰ تشغيل تنظيف الرسائل القديمة...');
    await cleanupOldMessages();
  });

  // إعداد الجدولة التلقائية للبوت (جديد)
  setupAutoSchedule();

  // إعداد فحص الرسائل المعلقة (جديد)
  setupPendingMessagesCheck();

  console.log('✅ تم إعداد المهام المجدولة مع إدارة محسنة للرسائل المنتظرة');
}

// باقي الوظائف (getQR, getStatus, logout, restartClient)
function getQR() {
  return latestQr;
}

async function getStatus() {
  let number = null;
  let deviceInfo = null;

  if (client && isReady) {
    try {
      const hostDevice = await client.getHostDevice();
      if (hostDevice?.wid?.user) {
        number = hostDevice.wid.user;
      }

      deviceInfo = {
        platform: hostDevice?.platform,
        version: hostDevice?.version,
        battery: await getBatteryInfo()
      };

    } catch (err) {
      console.error("❌ فشل في جلب معلومات الجهاز:", err.message);
    }
  }

  return {
    status: isReady ? 'connected' : 'disconnected',
    number,
    deviceInfo,
    connectionStartTime,
    uptime: connectionStartTime ? Math.floor((new Date() - connectionStartTime) / 1000) : null,
    lastActivity,
    randomDelayEnabled: RETRY_CONFIG.randomDelay.enabled
  };
}

async function getBatteryInfo() {
  if (!client || !isReady) return null;

  try {
    return await client.getBatteryLevel();
  } catch (error) {
    console.error('❌ فشل في جلب معلومات البطارية:', error);
    return null;
  }
}

async function restartClient() {
  try {
    console.log('🔄 بدء إعادة تشغيل عميل واتساب...');

    if (client) {
      try {
        await client.close();
        console.log("🧹 تم إغلاق الجلسة القديمة");
      } catch (error) {
        console.log("⚠️ تحذير أثناء إغلاق الجلسة:", error.message);
      }
    }

    client = null;
    isReady = false;
    latestQr = null;
    connectionStartTime = null;

    await new Promise(resolve => setTimeout(resolve, 2000));
    await initializeWhatsApp();
    console.log("🔁 تم إعادة تهيئة واتساب بنجاح");

    return true;
  } catch (error) {
    console.error('❌ فشل في إعادة تهيئة واتساب:', error);
    return false;
  }
}

async function logout() {
  try {
    if (client) {
      await client.logout();
      console.log('📤 تم تسجيل الخروج من واتساب');
    }

    isReady = false;
    latestQr = null;
    connectionStartTime = null;
    messageCount = 0;
    lastActivity = null;

    return true;
  } catch (error) {
    console.error('❌ فشل في تسجيل الخروج:', error);
    return false;
  }
}// إضافة متغيرات للتحكم في الجدولة
let autoScheduleEnabled = true; // تفعيل/تعطيل الجدولة التلقائية
let scheduledStartJob = null;
let scheduledStopJob = null;

// دالة تفعيل الجدولة التلقائية للبوت
function setupAutoSchedule() {
  // مسح الجداول القديمة إذا كانت موجودة
  if (scheduledStartJob) scheduledStartJob.stop();
  if (scheduledStopJob) scheduledStopJob.stop();

  if (!autoScheduleEnabled) {
    console.log('⏸️ الجدولة التلقائية معطلة');
    return;
  }

  // تشغيل البوت تلقائياً كل يوم الساعة 8 صباحاً
  scheduledStartJob = cron.schedule('0 2 * * *', async () => {
    console.log('⏰ [جدولة تلقائية] وقت تشغيل البوت - 8:00 صباحاً');
    try {
      const result = await startBot();
      console.log('✅ نتيجة التشغيل التلقائي:', result.message);

      // إذا احتاج QR، أرسل إشعار للموظفين
      if (result.needsQR) {
        console.log('⚠️ البوت يحتاج مسح QR Code - يرجى التدخل اليدوي');
        // TODO: يمكنك إرسال إشعار للموظفين عبر Socket.IO
      }
    } catch (error) {
      console.error('❌ فشل التشغيل التلقائي:', error);
    }
  }, {
    timezone: "Africa/Cairo" // تعديل حسب المنطقة الزمنية (السعودية: Asia/Riyadh)
  });

  // إيقاف البوت تلقائياً كل يوم الساعة 11 مساءً
  scheduledStopJob = cron.schedule('0 3 * * *', async () => {
    console.log('⏰ [جدولة تلقائية] وقت إيقاف البوت - 11:00 مساءً');
    try {
      const result = await stopBot();
      console.log('✅ نتيجة الإيقاف التلقائي:', result.message);
      console.log('📱 الإشعارات شغالة على الهاتف الآن');
    } catch (error) {
      console.error('❌ فشل الإيقاف التلقائي:', error);
    }
  }, {
    timezone: "Africa/Cairo"
  });

  console.log('✅ تم إعداد الجدولة التلقائية للبوت:');
  console.log('   🟢 تشغيل تلقائي: 2:00 صباحاً');
  console.log('   🔴 إيقاف تلقائي:   3:00 صباحا');
}

// دالة فحص الرسائل المعلقة وتشغيل البوت إذا لزم الأمر
async function checkAndSendPendingMessages() {
  try {
    const failedMessages = await readFailedMessages();
    const pendingConnectionMessages = await readPendingConnectionMessages();

    const messagesToSend = failedMessages.filter(msg =>
      msg.status === 'pending_retry' &&
      new Date(msg.nextRetry) <= new Date()
    );

    const totalPending = messagesToSend.length + pendingConnectionMessages.length;

    if (totalPending > 0) {
      console.log(`📬 يوجد ${totalPending} رسالة معلقة تحتاج إرسال`);

      // إذا البوت مش شغال، شغله تلقائياً
      if (!client || !isReady) {
        console.log('🔄 تشغيل البوت تلقائياً لإرسال الرسائل المعلقة...');
        const result = await startBot();

        if (result.needsQR) {
          console.log('⚠️ البوت يحتاج QR - الرسائل ستبقى معلقة حتى الربط اليدوي');
          return {
            success: false,
            needsQR: true,
            pendingCount: totalPending
          };
        }

        // انتظر 10 ثواني حتى يستقر الاتصال
        await new Promise(resolve => setTimeout(resolve, 10000));
      }

      // معالجة قائمة إعادة المحاولة
      if (client && isReady) {
        console.log('📤 بدء إرسال الرسائل المعلقة...');
        await processRetryQueue();

        return {
          success: true,
          sentCount: totalPending
        };
      }
    } else {
      console.log('✅ لا توجد رسائل معلقة للإرسال');
      return {
        success: true,
        pendingCount: 0
      };
    }
  } catch (error) {
    console.error('❌ خطأ في فحص الرسائل المعلقة:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// جدولة فحص الرسائل المعلقة كل 15 دقيقة
function setupPendingMessagesCheck() {
  cron.schedule('*/15 * * * *', async () => {
    console.log('⏰ فحص الرسائل المعلقة...');
    await checkAndSendPendingMessages();
  });

  console.log('✅ تم إعداد فحص الرسائل المعلقة (كل 15 دقيقة)');
}

// دالة تحديث إعدادات الجدولة
function updateAutoScheduleSettings(settings) {
  try {
    if (typeof settings.enabled === 'boolean') {
      autoScheduleEnabled = settings.enabled;
    }

    // إعادة تفعيل الجداول بالإعدادات الجديدة
    setupAutoSchedule();

    console.log('✅ تم تحديث إعدادات الجدولة التلقائية:', settings);
    return {
      success: true,
      settings: {
        enabled: autoScheduleEnabled
      }
    };
  } catch (error) {
    console.error('❌ فشل في تحديث إعدادات الجدولة:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// دالة الحصول على حالة الجدولة
function getAutoScheduleStatus() {
  return {
    enabled: autoScheduleEnabled,
    nextStart: scheduledStartJob ? '8:00 صباحاً يومياً' : 'غير مجدول',
    nextStop: scheduledStopJob ? '11:00 مساءً يومياً' : 'غير مجدول',
    currentTime: new Date().toLocaleString('ar-EG', {
      timeZone: 'Africa/Cairo'
    })
  };
}

// دالة تشغيل البوت (مع أو بدون QR)
async function startBot() {
  if (client && isReady) {
    return {
      success: true,
      message: 'البوت شغال بالفعل',
      needsQR: false
    };
  }

  try {
    console.log('🔄 بدء تشغيل البوت من الجلسة المحفوظة...');
    await initializeWhatsApp();

    // انتظر 5 ثواني لمعرفة إذا يحتاج QR
    await new Promise(resolve => setTimeout(resolve, 5000));

    if (isReady) {
      return {
        success: true,
        message: 'تم الاتصال من الجلسة المحفوظة ✅',
        needsQR: false
      };
    } else if (latestQr) {
      return {
        success: true,
        message: 'يرجى مسح QR Code',
        needsQR: true,
        qrCode: latestQr
      };
    }
  } catch (error) {
    console.error('❌ فشل تشغيل البوت:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// دالة إيقاف البوت (فصل كامل)
async function stopBot() {
  if (!client) {
    return {
      success: true,
      message: 'البوت مقفول بالفعل',
      phoneNotifications: true
    };
  }

  try {
    console.log('⏹️ إيقاف البوت وفصل الجلسة...');

    // فصل كامل (مع حفظ Session للمرة القادمة)
    if (client && typeof client.close === 'function') {
      await client.close();
    }

    client = null;
    isReady = false;
    latestQr = null;
    connectionStartTime = null;

    console.log('✅ تم فصل البوت - الإشعارات شغالة على الهاتف الآن');

    return {
      success: true,
      message: 'تم إيقاف البوت بنجاح',
      phoneNotifications: true
    };
  } catch (error) {
    console.error('❌ فشل في إيقاف البوت:', error);
    return {
      success: false,
      message: error.message
    };
  }
}// ملف لحفظ الرسائل الواردة
const INCOMING_MESSAGES_FILE = path.join(__dirname, '../logs/incoming_messages.json');
let incomingMessagesCache = [];

// حفظ رسالة واردة
async function saveIncomingMessage(message) {
  try {
    incomingMessagesCache.push(message);

    // الاحتفاظ بآخر 100 رسالة فقط
    if (incomingMessagesCache.length > 100) {
      incomingMessagesCache.shift();
    }

    await ensureLogDirectory();
    await fs.writeFile(
      INCOMING_MESSAGES_FILE,
      JSON.stringify(incomingMessagesCache, null, 2)
    );
  } catch (error) {
    console.error('❌ فشل في حفظ الرسالة الواردة:', error);
  }
}

// قراءة الرسائل الواردة
async function readIncomingMessages() {
  try {
    await ensureLogDirectory();
    const data = await fs.readFile(INCOMING_MESSAGES_FILE, 'utf8');
    incomingMessagesCache = JSON.parse(data);
    return incomingMessagesCache;
  } catch (error) {
    return [];
  }
}

// عدد الرسائل غير المقروءة
async function getUnreadIncomingCount() {
  const messages = incomingMessagesCache.length > 0
    ? incomingMessagesCache
    : await readIncomingMessages();

  return messages.filter(msg => !msg.isRead).length;
}

// تعليم رسالة كمقروءة
async function markIncomingAsRead(messageId) {
  const message = incomingMessagesCache.find(msg => msg.id === messageId);
  if (message) {
    message.isRead = true;
    await fs.writeFile(
      INCOMING_MESSAGES_FILE,
      JSON.stringify(incomingMessagesCache, null, 2)
    );
  }
}

// مسح الرسائل الواردة
async function clearIncomingMessages() {
  incomingMessagesCache = [];
  await fs.writeFile(INCOMING_MESSAGES_FILE, JSON.stringify([], null, 2));
}

// تهيئة المهام المجدولة عند تحميل الوحدة
setupCronJobs();

module.exports = {
  // الوظائف الأساسية
  initializeWhatsApp,
  sendMessage,
  getQR,
  getStatus,
  logout,
  restartClient,
  startBot,
  stopBot,

  // وظائف إدارة الرسائل المحسنة
  resendMessage,
  getStats,
  getFilteredMessageHistory,
  getFailedMessages,
  getPendingConnectionMessages,
  clearMessageHistory,
  clearPendingConnectionMessages,
  updateMessageStatus,

  // وظائف نظام إعادة المحاولة مع التأخير العشوائي
  processRetryQueue,
  addToFailedMessages,
  addToPendingConnectionMessages,
  movePendingMessagesToRetryQueue,
  removeFromFailedMessages,
  retryFailedMessage,

  // وظائف التنظيف
  cleanupOldMessages,

  // دوال السجلات
  readMessageLog,
  writeMessageLog,
  readFailedMessages,
  writeFailedMessages,
  readPendingConnectionMessages,
  writePendingConnectionMessages,
  ensureLogDirectory,

  // وظائف التأخير العشوائي
  generateRandomDelay,
  generateSmartDelay,
  classifyError,
  updateRandomDelayConfig,
  updateConnectionWaitingConfig,
  deleteSinglePendingMessage,

  // وظائف الجدولة التلقائية (جديد)
  setupAutoSchedule,
  checkAndSendPendingMessages,
  updateAutoScheduleSettings,
  getAutoScheduleStatus,

  // متغيرات مساعدة
  isClientReady: () => isReady,
  getMessageCount: () => messageCount,
  getLastActivity: () => lastActivity,
  getRandomDelayConfig: () => RETRY_CONFIG.randomDelay,
  getConnectionWaitingConfig: () => RETRY_CONFIG.connectionWaiting,

  readIncomingMessages,
  saveIncomingMessage,
  getUnreadIncomingCount,
  markIncomingAsRead,
  clearIncomingMessages,
  sendNotificationToWebsite,
  WEBSITE_CONFIG
};
