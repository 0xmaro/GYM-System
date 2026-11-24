<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\QrCard;
use App\Services\QrIdGenerator;
use Illuminate\Database\Seeder;

class ClientSeeder extends Seeder
{
    public function run(): void
    {
        $clients = [
            // ─── 5 رجال ───
            ['name' => 'أحمد محمد علي',     'phone' => '01011111111', 'gender' => 'male',   'age' => 25],
            ['name' => 'محمود حسن إبراهيم', 'phone' => '01022222222', 'gender' => 'male',   'age' => 30],
            ['name' => 'عمر خالد سعيد',     'phone' => '01033333333', 'gender' => 'male',   'age' => 22],
            ['name' => 'كريم عبدالله نصر',  'phone' => '01044444444', 'gender' => 'male',   'age' => 28],
            ['name' => 'يوسف طارق حسام',   'phone' => '01055555555', 'gender' => 'male',   'age' => 35],
            // ─── 5 حريم ───
            ['name' => 'سارة أحمد محمود',   'phone' => '01066666666', 'gender' => 'female', 'age' => 23],
            ['name' => 'منة الله حسين',     'phone' => '01077777777', 'gender' => 'female', 'age' => 27],
            ['name' => 'نور محمد عادل',     'phone' => '01088888888', 'gender' => 'female', 'age' => 31],
            ['name' => 'هبة الله رمضان',    'phone' => '01099999999', 'gender' => 'female', 'age' => 26],
            ['name' => 'ياسمين وليد فتحي',  'phone' => '01010101010', 'gender' => 'female', 'age' => 29],
        ];

        foreach ($clients as $data) {
            // سحب أول كارت available من الـ inventory
            $qrId = QrIdGenerator::getAvailable();

            // إنشاء العضو
            $client = Client::create([
                'qr_id'      => $qrId,
                'name'       => $data['name'],
                'phone'      => $data['phone'],
                'gender'     => $data['gender'],
                'age'        => $data['age'],
                'status'     => 'active',
            ]);

            // تحديث الكارت في الـ inventory
            QrCard::where('qr_id', $qrId)->update([
                'client_id' => $client->id,
                'status'    => 'distributed',
                'issued_at' => now(),
            ]);
        }

        $this->command->info('✅ 10 test clients created (5 male / 5 female) with QR cards from inventory');
    }
}
