<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            ['key' => 'gym_name',                      'value' => 'GymOS'],
            ['key' => 'gym_logo_url',                   'value' => null],
            ['key' => 'attendance_cooldown_minutes',    'value' => '240'],
            ['key' => 'expiry_reminder_days',           'value' => '[3, 7]'],
            ['key' => 'max_discount_without_approval',  'value' => '1000'],
            ['key' => 'send_time_start',                'value' => '09:00'],
            ['key' => 'send_time_end',                  'value' => '21:00'],
            ['key' => 'daily_whatsapp_limit',           'value' => '200'],
            ['key' => 'session_timeout_hours',          'value' => '8'],
            ['key' => 'backup_enabled',                 'value' => 'true'],
            ['key' => 'backup_frequency',               'value' => 'daily'],
        ];

        foreach ($settings as $setting) {
            Setting::firstOrCreate(['key' => $setting['key']], ['value' => $setting['value']]);
        }

        $this->command->info('✅ Default settings seeded');
    }
}
