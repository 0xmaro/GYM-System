<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;

class SecurityTest extends TestCase
{
    public function test_audit_logs_cannot_be_modified()
    {
        $this->actAsAdmin();

        // محاولة تعديل أو حذف سجل مراقبة (يجب أن يفشل لأننا لم نبرمج مسارات لذلك)
        // لارافل هترجع 404 أو 405 لعدم وجود المسار، وده في حد ذاته هو الحماية المطلوبة
        $responsePut = $this->putJson('/api/v1/audit-logs/1', ['action' => 'hacked']);
        $this->assertTrue(in_array($responsePut->status(), [404, 405]));

        $responseDelete = $this->deleteJson('/api/v1/audit-logs/1');
        $this->assertTrue(in_array($responseDelete->status(), [404, 405]));
    }

    public function test_transactions_immutable()
    {
        $this->actAsAdmin();

        // محاولة تعديل أو حذف معاملة مالية سابقة (ممنوع في النظام المحاسبي السليم)
        $responsePut = $this->putJson('/api/v1/transactions/1', ['amount' => 99999]);
        $this->assertTrue(in_array($responsePut->status(), [404, 405]));

        $responseDelete = $this->deleteJson('/api/v1/transactions/1');
        $this->assertTrue(in_array($responseDelete->status(), [404, 405]));
    }

    public function test_brute_force_blocks_after_5_attempts()
    {
        // 5 محاولات دخول فاشلة
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'phone' => '01000000000',
                'password' => 'wrong_password'
            ]);
        }

        // المحاولة السادسة يجب أن يتم حظرها بـ 429 (Too Many Requests)
        $response = $this->postJson('/api/v1/auth/login', [
            'phone' => '01000000000',
            'password' => 'wrong_password'
        ]);

        $response->assertStatus(429);
    }

    public function test_reception_cannot_access_financial_reports()
    {
        $this->actAsReception();

        // موظف الاستقبال يحاول فتح التقرير المالي للأدمن
        $response = $this->getJson('/api/v1/reports/financial');

        // الـ Middleware الخاص بالصلاحيات يجب أن يرفض الطلب
        $response->assertStatus(403);
    }

public function test_captain_cannot_modify_subscriptions()
    {
        $captain = User::factory()->create(['role' => 'captain', 'gender_access' => 'both']);
        $this->actingAs($captain, 'sanctum');

        // نُنشئ عميل وهمي عشان الـ Validation ميضربش
        $client = Client::factory()->create();

        // الكابتن يحاول إنشاء اشتراك ببيانات سليمة 100%
        $response = $this->postJson('/api/v1/subscriptions', [
            'client_id' => $client->id,
            'subscription_type_id' => \App\Models\SubscriptionType::first()->id ?? 1,
            'start_date' => now()->toDateString(), // ضفنا التاريخ
            'amount_paid' => 100
        ]);

        // هنا السيستم هيكتشف إن البيانات سليمة، بس اللي باعتها كابتن، فهيرفضه!
        $response->assertStatus(403);
    }
}
