<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use Database\Seeders\ProductionSeeder;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase; // لتنظيف الداتابيز بعد كل اختبار

    protected function setUp(): void
    {
        parent::setUp();
        // تشغيل الـ Seeder عشان نزرع الباقات والإعدادات
        $this->seed(ProductionSeeder::class);
    }

    protected function actAsAdmin(): User
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'gender_access' => 'both'
        ]);
        $this->actingAs($admin, 'sanctum');
        return $admin;
    }

    protected function actAsReception(string $gender = 'both'): User
    {
        $user = User::factory()->create([
            'role' => 'reception',
            'gender_access' => $gender
        ]);
        $this->actingAs($user, 'sanctum');
        return $user;
    }
}
