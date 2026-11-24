<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WhatsappTemplate extends Model
{
    protected $fillable = ['type', 'label', 'body', 'enabled', 'send_days_before'];
    protected $casts    = ['enabled' => 'boolean'];

    // استبدل الـ variables في الرسالة
    public function render(array $variables): string
    {
        $body = $this->body;
        foreach ($variables as $key => $value) {
            $body = str_replace("{{$key}}", $value, $body);
        }
        return $body;
    }

    public static function seedDefaults(): void
    {
        $templates = [
            ['type' => 'welcome',                       'label' => 'ترحيب عند التسجيل',          'enabled' => true,  'send_days_before' => null, 'body' => "أهلاً وسهلاً {name} 💪\nتم تسجيلك في {gym_name}!\n\n📋 اشتراكك: {subscription_type}\n📅 ينتهي: {end_date}\n🏋️ الحصص المتبقية: {sessions_count}"],
            ['type' => 'expiry_reminder',               'label' => 'تذكير انتهاء الاشتراك',       'enabled' => true,  'send_days_before' => 3,    'body' => "تنبيه هام 🔔\n\nعزيزي {name}\nاشتراكك ({subscription_type}) سينتهي خلال {days_remaining} أيام!\n📅 تاريخ الانتهاء: {end_date}\n\nللتجديد تواصل معنا ⚡"],
            ['type' => 'subscription_expired_reminder', 'label' => 'إشعار انتهاء الاشتراك',       'enabled' => true,  'send_days_before' => null, 'body' => "انتهى اشتراكك ⚠️\n\nأخ {name}\nاشتراكك انتهى بتاريخ {end_date}.\n\nلتجديد الاشتراك تواصل معنا الآن 📞"],
            ['type' => 'debt_reminder',                 'label' => 'تذكير دين',                   'enabled' => true,  'send_days_before' => null, 'body' => "تذكير مالي 📌\n\nأخ {name}\nيوجد مبلغ مستحق: {amount_display}\nالتفاصيل: {reason}\nتاريخ الاستحقاق: {due_date}"],
            ['type' => 'receipt',                       'label' => 'إيصال دفع',                   'enabled' => true,  'send_days_before' => null, 'body' => "إيصال استلام نقدية 🧾\n\nأخ {name}\nتم تسجيل الدفعة بنجاح.\nالاشتراك: {subscription_type}\nالمبلغ: {amount_display}\nالتاريخ: {date}\nرقم الإيصال: {receipt_number}"],
            ['type' => 'freeze_notification',           'label' => 'إشعار تجميد الاشتراك',        'enabled' => true,  'send_days_before' => null, 'body' => "إشعار تجميد ❄️\n\nعزيزي {name}\nتم تجميد اشتراكك حتى: {frozen_until}\nتاريخ الانتهاء الجديد: {new_end_date}"],
            ['type' => 'sessions_empty',                'label' => 'تنبيه انتهاء الحصص',          'enabled' => true,  'send_days_before' => null, 'body' => "تنبيه الحصص ⚡\n\nأخ {name}\nهذه كانت آخر حصة في اشتراكك!\nلتجديد الاشتراك تواصل معنا الآن 📞"],
            ['type' => 'birthday',                      'label' => 'تهنئة عيد ميلاد',             'enabled' => false, 'send_days_before' => null, 'body' => "عيد ميلاد سعيد 🎂\n\nعزيزنا {name}\nكل عام وأنت بخير وبصحة وعافية 💪\nمن فريق {gym_name}"],
            ['type' => 'custom',                        'label' => 'رسالة مخصصة',                 'enabled' => true,  'send_days_before' => null, 'body' => '{message}'],
        ];

        foreach ($templates as $t) {
            static::firstOrCreate(['type' => $t['type']], $t);
        }
    }
}
