<?php

namespace Database\Seeders;

use App\Models\QrCard;
use Illuminate\Database\Seeder;

class QrCardInventorySeeder extends Seeder
{
    public function run(): void
    {
        $total = 0;

        // كروت من 9999 نزولاً لـ 1000
        for ($i = 9999; $i >= 1000; $i--) {
            QrCard::firstOrCreate(
                ['qr_id' => (string) $i],
                ['status' => 'available']
            );
            $total++;
        }

        $this->command->info("✅ {$total} QR cards added to inventory (9999 → 1000)");
    }
}
