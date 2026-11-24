<?php

return [

    /*
    |─────────────────────────────────────────────
    | GymOS — الإعدادات العامة للنظام
    | كل القيم دي قابلة للتعديل من هنا
    |─────────────────────────────────────────────
    */

    // ─── الحضور ───
    'attendance' => [
        'duplicate_check_minutes' => env('ATTENDANCE_DUPLICATE_MINUTES', 240), // 4 ساعات
        'offline_sync_days'       => env('ATTENDANCE_OFFLINE_SYNC_DAYS', 1),
    ],

    // ─── Session ───
    'session_timeout_hours' => env('SESSION_TIMEOUT_HOURS', 8),

    // ─── Brute Force ───
    'brute_force' => [
        'max_attempts'    => 5,
        'lockout_minutes' => 15,
    ],

    // ─── العملة ───
    'currency' => [
        'symbol'    => 'ج.م',
        'divisor'   => 100, // 15000 قرش → 150 ج.م
        'decimals'  => 2,
    ],

    // ─── QR ───
    'qr' => [
        'prefix'    => 'GYM-',
        'pad_zeros' => 5,  // GYM-00142
    ],

    // ─── الاشتراكات ───
    'subscriptions' => [
        'expiry_warning_days' => 7,   // تنبيه قبل الانتهاء بـ 7 أيام
        'max_freeze_days'     => 30,  // أقصى تجميد في الشهر
    ],

];
