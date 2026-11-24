<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SubscriptionType;
use App\Models\User;
use App\Models\Setting;
use Illuminate\Support\Facades\Hash;

class ProductionSeeder extends Seeder
{
    public function run(): void
    {
        // 1. باقات الاشتراك (الأسعار بالقروش)
        $types = [
            [
                'name' => 'عادي',
                'price_monthly'  => 15000,  // 150 ج.م
                'price_3months'  => 40000,  // 400 ج.م
                'price_6months'  => 70000,  // 700 ج.م
                'sessions_count' => null,   // غير محدود
                'duration_days'  => 30,
                'is_active'      => true,
            ],
            [
                'name' => 'حديد',
                'price_monthly'  => 20000,
                'price_3months'  => 55000,
                'price_6months'  => 95000,
                'sessions_count' => null,
                'duration_days'  => 30,
                'is_active'      => true,
            ],
            [
                'name' => 'فتنس',
                'price_monthly'  => 18000,
                'price_3months'  => 48000,
                'price_6months'  => 85000,
                'sessions_count' => null,
                'duration_days'  => 30,
                'is_active'      => true,
            ],
            [
                'name' => 'بريفت',
                'price_monthly'  => 8000,   // 80 ج.م للحصة
                'price_3months'  => 70000,  // باقة 10 حصص
                'price_6months'  => 130000, // باقة 20 حصة
                'sessions_count' => 10,
                'duration_days'  => 60,
                'is_active'      => true,
            ],
        ];

        foreach ($types as $type) {
            SubscriptionType::updateOrCreate(['name' => $type['name']], $type);
        }

        // 2. مدير النظام (من ملف الـ .env)
        User::updateOrCreate(
            ['phone' => env('ADMIN_PHONE', '01000000000')],
            [
                'name'          => env('ADMIN_NAME', 'مدير الجيم'),
                'email'         => env('ADMIN_EMAIL', 'admin@gymos.com'),
                'password'      => Hash::make(env('ADMIN_PASSWORD', '12345678')),
                'role'          => 'admin',
                'gender_access' => 'both',
                'is_active'     => true,
            ]
        );

        // 3. الإعدادات الافتراضية
        $settings = [
            'gym_name'                        => env('GYM_NAME', 'GymOS'),
            'gym_logo_url'                    => '',
            'attendance_cooldown_minutes'     => '240',
            'expiry_reminder_days'            => '[3, 7]',
            'max_discount_without_approval'   => '10000', // 100 ج.م بالقروش
            'whatsapp_send_start'             => '09:00',
            'whatsapp_send_end'               => '21:00',
            'daily_whatsapp_limit'            => '200',
            'session_timeout_hours'           => '8',
            'backup_enabled'                  => 'true',
            'backup_frequency'                => 'daily',
        ];

        foreach ($settings as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => $value]);
        }
    }
}
