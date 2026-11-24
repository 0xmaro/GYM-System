<?php

namespace Database\Seeders;

use App\Models\SubscriptionType;
use Illuminate\Database\Seeder;

class SubscriptionTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            [
                'name'           => 'عادي',
                'price_monthly'  => 15000,
                'price_3months'  => 40000,
                'price_6months'  => 70000,
                'sessions_count' => null,
                'duration_days'  => 30,
                'is_active'      => true,
            ],
            [
                'name'           => 'حديد',
                'price_monthly'  => 20000,
                'price_3months'  => 55000,
                'price_6months'  => 95000,
                'sessions_count' => null,
                'duration_days'  => 30,
                'is_active'      => true,
            ],
            [
                'name'           => 'فتنس',
                'price_monthly'  => 18000,
                'price_3months'  => 48000,
                'price_6months'  => 85000,
                'sessions_count' => null,
                'duration_days'  => 30,
                'is_active'      => true,
            ],
            [
                'name'           => 'بريفت',
                'price_monthly'  => 8000,
                'price_3months'  => null,
                'price_6months'  => null,
                'sessions_count' => 10,
                'duration_days'  => 60,
                'is_active'      => true,
            ],
        ];

        foreach ($types as $type) {
            SubscriptionType::firstOrCreate(
                ['name' => $type['name']],
                $type
            );
        }

        $this->command->info('✅ Subscription types seeded');
    }
}
