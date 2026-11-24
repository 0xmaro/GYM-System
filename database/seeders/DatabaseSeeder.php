<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            // بننده على الملف الجديد ده بس لأنه متظبط فيه الأسعار والبيانات صح
            ProductionSeeder::class,
        ]);
    }
}
