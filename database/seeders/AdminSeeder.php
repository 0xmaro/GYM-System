<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['phone' => '01000000000'],   // ← شرط البحث
            [
                'name'          => 'مدير النظام',
                'email'         => 'admin@gymos.com',
                'password'      => Hash::make('gymos2024'),
                'role'          => 'admin',
                'gender_access' => 'both',
                'is_active'     => true,
            ]
        );

        $this->command->info('✅ Admin seeded');
    }
}
