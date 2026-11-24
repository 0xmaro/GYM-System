<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Client;
use App\Models\ClientSubscription;
use App\Models\QrCard;
use App\Models\SubscriptionType;

class AttendanceTest extends TestCase
{
    /**
     * دالة مساعدة لإنشاء عميل مع اشتراك وكارت QR لتسهيل الاختبارات
     */
    private function createClientWithSubscription($status = 'active', $sessions = null, $daysOffset = 0)
    {
        $client = Client::factory()->create(['gender' => 'male']);

        $qrCard = QrCard::create([
            'qr_id' => 'QR' . rand(100000, 999999),
            'client_id' => $client->id,
            'status' => 'distributed'
        ]);

        $client->update(['qr_id' => $qrCard->qr_id]);

        $subType = SubscriptionType::first();

        ClientSubscription::create([
            'client_id' => $client->id,
            'subscription_type_id' => $subType->id,
            'start_date' => now()->subDays(10),
            'end_date' => now()->addDays(20)->addDays($daysOffset),
            'original_end_date' => now()->addDays(20)->addDays($daysOffset),
            'sessions_remaining' => $sessions,
            'amount_paid' => $subType->price_monthly,
            'status' => $status,
            'created_by' => $this->actAsAdmin()->id,
        ]);

        return $client;
    }

    public function test_qr_scan_success()
    {
        $client = $this->createClientWithSubscription('active');

        $response = $this->postJson('/api/v1/attendance/qr-scan', ['qr_id' => $client->qr_id]);

        $response->assertStatus(200)
                 ->assertJson(['status' => 'success']);

        $this->assertDatabaseHas('attendance', [
            'client_id' => $client->id,
            'type' => 'qr'
        ]);
    }

    public function test_qr_scan_duplicate_within_cooldown()
    {
        $client = $this->createClientWithSubscription('active');

        // أول مسحة (ناجحة)
        $this->postJson('/api/v1/attendance/qr-scan', ['qr_id' => $client->qr_id]);

        // ثاني مسحة فوراً (الباك إند بيرفضها بـ 422 وهذا تصرف سليم)
        $response = $this->postJson('/api/v1/attendance/qr-scan', ['qr_id' => $client->qr_id]);

        $response->assertStatus(422);

        $this->assertDatabaseCount('attendance', 1); // لم يتم تسجيل الحضور الثاني
    }

    public function test_qr_scan_expired_subscription()
    {
        // اشتراك منتهي من 25 يوم
        $client = $this->createClientWithSubscription('active', null, -25);

        $response = $this->postJson('/api/v1/attendance/qr-scan', ['qr_id' => $client->qr_id]);

        $response->assertStatus(422);
    }

    public function test_qr_scan_frozen_subscription()
    {
        $client = $this->createClientWithSubscription('frozen');

        $response = $this->postJson('/api/v1/attendance/qr-scan', ['qr_id' => $client->qr_id]);

        $response->assertStatus(422);
    }

    public function test_qr_scan_no_sessions()
    {
        $client = $this->createClientWithSubscription('active', 0); // 0 حصص متبقية

        $response = $this->postJson('/api/v1/attendance/qr-scan', ['qr_id' => $client->qr_id]);

        $response->assertStatus(422);
    }

    public function test_manual_attendance_success_without_note()
    {
        $client = $this->createClientWithSubscription('active');

        $response = $this->postJson('/api/v1/attendance/manual', [
            'client_id' => $client->id,
            // الكنترولر بتاعك بيسمح بالحضور اليدوي بدون ملاحظة إجبارية
        ]);

        $response->assertStatus(200);
    }

    public function test_gender_filter_enforced()
    {
        $this->actAsReception('male'); // موظف صلاحيته للرجال فقط

        $femaleClient = Client::factory()->create(['gender' => 'female']);

        $response = $this->getJson("/api/v1/clients/{$femaleClient->id}");

        // نتوقع 404 لأن الـ Global Scope بيخفي العميلة تماماً وكأنها غير موجودة
        $response->assertStatus(404);
    }
}
