# GymOS Deployment & SSL Setup

## 1. Localhost (Development / Gym Local Server)
- إذا كنت تستخدم **Laragon** أو **Herd**، يتم تفعيل الـ SSL تلقائياً للـ Local domains ولست بحاجة لأي إعدادات إضافية.
- تأكد من تشغيل `php artisan queue:work` و `php artisan reverb:start` كخدمات خلفية (Windows Services).

## 2. VPS (Production - Ubuntu 22.04)
لحماية البيانات، يجب تفعيل SSL/TLS باستخدام Let's Encrypt مجاناً:

```bash
# 1. تثبيت Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# 2. توليد الشهادة وربطها بـ Nginx
sudo certbot --nginx -d yourdomain.com

# 3. التأكد من التجديد التلقائي
sudo certbot renew --dry-run
