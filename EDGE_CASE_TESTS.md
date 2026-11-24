# GymOS - Edge Case Testing Scenarios 🧪

هذا الملف يحتوي على 15 اختبار قاسي (Edge Cases) لضمان استقرار نظام GymOS تحت الضغط والسيناريوهات غير المتوقعة.

---

## ━━━ مجموعة 1: تكامل البيانات (Data Integrity) ━━━

### TEST EC-01 — Double Submit Protection (الحماية من الطلبات المزدوجة)
* **السيناريو:** جهازين بعتوا نفس QR في نفس الثانية بالمللي.
* **الخطوات:**
  1. افتح نافذتين Terminal.
  2. نفذ أمر `curl POST /api/v1/attendance/qr-scan -d '{"qr_id": "GYM-00001"}'` في النافذتين في نفس اللحظة (أو استخدم أداة مثل Postman Runner).
* **المتوقع:**
  - طلب واحد فقط يُسجل بنجاح (يرجع `200 OK`).
  - الطلب الثاني يرجع `422 Unprocessable Entity` مع رسالة `{ status: 'duplicate' }`.
* **التحقق:** `SELECT COUNT(*) FROM attendance WHERE client_id=X AND DATE(check_in_at)=CURDATE();` (يجب أن يكون 1 فقط).

### TEST EC-02 — Freeze + Expiry Conflict (تعارض التجميد مع الانتهاء)
* **السيناريو:** اشتراك مجمَّد وتاريخ الانتهاء الأصلي مر عليه الزمن.
* **الإعداد:**
  - اشتراك `end_date` = أمس.
  - `frozen_at` = منذ 3 أيام.
  - `frozen_until` = بعد أسبوع.
* **المتوقع:**
  - حالة الاشتراك تفضل `frozen` وليس `expired`.
  - عند مسح الـ QR يرجع `{ status: 'frozen' }`.
  - لا يتم إرسال رسالة "تنبيه انتهاء" عبر الـ Cron Job.

### TEST EC-03 — Negative Sessions (حصص بالسالب)
* **السيناريو:** موظفان يسجلان حضور يدوي لنفس العضو في نفس اللحظة واشتراكه باقي فيه حصة واحدة.
* **الإعداد:** اشتراك بريفت `sessions_remaining = 1`.
* **الخطوات:** موظف A وموظف B يضغطان "تسجيل يدوي" معاً.
* **المتوقع:**
  - رصيد الحصص يصل إلى `0` ولا ينزل أبداً إلى `-1`.
  - طلب ينجح، والآخر يرفض بـ `{ status: 'no_sessions' }`.
* **التحقق:** الـ `lockForUpdate()` في `AttendanceController` سيمنع التضارب.

### TEST EC-04 — Open Shift Enforcement (إجبار فتح الشيفت)
* **السيناريو:** موظف يحاول تسجيل دفعة مالية بدون شيفت مفتوح، أو يفتح شيفتين معاً.
* **المتوقع 1:** عند محاولة تسجيل إيراد -> `422 "افتح شيفت أولاً"`.
* **المتوقع 2:** عند محاولة فتح شيفت ولديه واحد مفتوح -> `422 "لديك شيفت مفتوح بالفعل"`.

### TEST EC-05 — Discount Above Limit Without Approval (تجاوز حد الخصم)
* **السيناريو:** موظف استقبال يحاول تطبيق خصم يتجاوز الحد المسموح به تلقائياً.
* **الإعداد:** `max_discount_without_approval = 10000` (100 ج.م) في جدول الإعدادات.
* **الخطوات:**
  - طلب خصم 150 ج.م -> يُعلق بانتظار الأدمن.
  - طلب خصم 50 ج.م -> يُطبق فوراً (إذا كان مبرمجاً كذلك).

---

## ━━━ مجموعة 2: الأمان (Security) ━━━

### TEST EC-06 — Gender Access Enforcement على API
* **السيناريو:** موظف `gender_access=male` يحاول الوصول لبيانات عضوة (حريم).
* **الخطوات:**
  - `POST /api/v1/clients {gender: 'female', ...}` -> يرجع `403 Forbidden` للموظف، وينجح للأدمن.
  - `GET /api/v1/clients/{female_client_id}` -> يرجع `404 Not Found` (بسبب الـ Global Scope) أو `403`.

### TEST EC-07 — Audit Log Immutability (حصانة سجل الأحداث)
* **الخطوات:**
  - إرسال `PUT`, `PATCH`, `DELETE` إلى مسارات `/api/v1/audit-logs/{id}` أو `/api/v1/transactions/{id}`.
* **المتوقع:** ترجع جميعها `405 Method Not Allowed` عبر الـ `PreventImmutableModification` Middleware.

### TEST EC-08 — Brute Force Protection (الحماية من التخمين)
* **الخطوات:** إرسال 6 محاولات تسجيل دخول خاطئة متتالية لـ `/api/v1/auth/login`.
* **المتوقع:**
  - المحاولة السادسة ترجع `429 Too Many Requests`.
  - يتم تسجيل `auth.blocked` في الـ Audit Log.

### TEST EC-09 — File Upload Security (أمان رفع الملفات)
* **الخطوات:**
  - محاولة رفع ملف `.php` كصورة شخصية -> `422 Unprocessable Entity`.
  - محاولة رفع صورة أكبر من 2MB -> `422 Unprocessable Entity`.

### TEST EC-10 — Soft Delete Cascade (الحذف الوهمي المتسلسل)
* **السيناريو:** حذف عضو يمتلك اشتراك نشط وسجلات حضور.
* **المتوقع:**
  - `deleted_at` يُسجل في `clients` و `client_subscriptions`.
  - سجلات `attendance` و `transactions` تظل موجودة (للحفاظ على التقارير المالية).

---

## ━━━ مجموعة 3: الأداء (Performance) ━━━

### TEST EC-11 — Search Performance (أداء البحث)
* **الخطوات:** حقن 1000 عضو تجريبي، ثم استدعاء `GET /api/v1/clients?search=محمد`.
* **المتوقع:** زمن الاستجابة < 300ms.

### TEST EC-12 — Dashboard Load (تحميل الداشبورد)
* **الخطوات:** استدعاء `/api/v1/dashboard` مع وجود آلاف السجلات في DB.
* **المتوقع:** زمن الاستجابة < 500ms (إذا كان أبطأ، يجب تفعيل `Cache::remember`).

### TEST EC-13 — Concurrent QR Scans (مسح متزامن مكثف)
* **الخطوات:** إرسال 10 طلبات `qr-scan` لنفس العضو في نفس اللحظة عبر سكريبت (Apache Benchmark).
* **المتوقع:** يتم قبول طلب واحد فقط، والـ 9 الباقين يُرفضون بـ `duplicate` بدون أي Deadlock في الداتا بيز.

### TEST EC-14 — Queue Failure Recovery (التعافي من سقوط الطوابير)
* **الخطوات:**
  - إيقاف `queue:work` يدوياً.
  - إضافة اشتراك جديد (المفترض إرسال واتساب).
  - إعادة تشغيل `queue:work`.
* **المتوقع:** يتم تنفيذ الـ Job بنجاح وتُرسل الرسالة دون أن تضيع.

### TEST EC-15 — Offline -> Online Sync (مزامنة الأوفلاين)
* **الخطوات:**
  - فصل الإنترنت عن جهاز الاستقبال.
  - مسح كارتين (يُحفظان في IndexedDB في المتصفح).
  - إعادة الاتصال بالإنترنت.
* **المتوقع:** يتم إرسال السجلين للـ API بالـ `check_in_at` الأصلي ويُحفظان في الداتا بيز بشكل صحيح.
