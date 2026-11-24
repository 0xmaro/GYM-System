<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;
use App\Models\Client;
use App\Models\SubscriptionType;
use App\Models\ClientSubscription;
use App\Jobs\SendWelcomeMessage;

class SubscriptionTest extends TestCase
{
    private function createClientAndType()
    {
        $client = Client::factory()->create();
        $subType = SubscriptionType::first(); // هنجيب الباقة من الـ Seeder
        return [$client, $subType];
    }

    public function test_freeze_extends_end_date_correctly()
    {
        $this->actAsAdmin();
        [$client, $subType] = $this->createClientAndType();

        // نعمل اشتراك ينتهي بعد 20 يوم
        $originalEndDate = now()->addDays(20);
        $subscription = ClientSubscription::create([
            'client_id' => $client->id,
            'subscription_type_id' => $subType->id,
            'start_date' => now()->subDays(10),
            'end_date' => $originalEndDate,
            'original_end_date' => $originalEndDate,
            'amount_paid' => $subType->price_monthly,
            'status' => 'active',
            'created_by' => auth()->id(),
        ]);

        // طلب تجميد لمدة 15 يوم
        $response = $this->postJson("/api/v1/clients/{$client->id}/freeze", [
            'freeze_days' => 15,
            'reason' => 'سفر طارئ'
        ]);

        $response->assertStatus(200);

        $subscription->refresh();
        $this->assertEquals('frozen', $subscription->status);
        $this->assertEquals(15, $subscription->freeze_days_count);

        // التأكد إن تاريخ الانتهاء زاد 15 يوم بالظبط
        $expectedNewDate = $originalEndDate->copy()->addDays(15)->toDateString();
        $this->assertEquals($expectedNewDate, $subscription->end_date->toDateString());
    }

    public function test_unfreeze_sets_status_active()
    {
        $this->actAsAdmin();
        [$client, $subType] = $this->createClientAndType();

        ClientSubscription::create([
            'client_id' => $client->id,
            'subscription_type_id' => $subType->id,
            'start_date' => now()->subDays(10),
            'end_date' => now()->addDays(35),
            'original_end_date' => now()->addDays(20),
            'amount_paid' => $subType->price_monthly,
            'status' => 'frozen',
            'freeze_days_count' => 15,
            'created_by' => auth()->id(),
        ]);

        $response = $this->postJson("/api/v1/clients/{$client->id}/unfreeze");

        $response->assertStatus(200);
        $this->assertDatabaseHas('client_subscriptions', [
            'client_id' => $client->id,
            'status' => 'active' // رجع نشط تاني
        ]);
    }

public function test_welcome_message_dispatched_on_new_subscription()
    {
        // بنوقف الطابور الوهمي عشان نختبر من غير ما نبعت رسالة واتساب بجد
        Queue::fake();

        $this->actAsReception();
        [$client, $subType] = $this->createClientAndType();

        $response = $this->postJson('/api/v1/subscriptions', [
            'client_id' => $client->id,
            'subscription_type_id' => $subType->id,
            'start_date' => now()->toDateString(), // <--- السطر اللي ضفناه
            'discount_amount' => 0,
            'amount_paid' => $subType->price_monthly,
            'payment_method' => 'cash'
        ]);

        $response->assertStatus(201); // Created

        // نتأكد إن السيستم حط رسالة الترحيب في الطابور عشان تتبعت للعميل
        Queue::assertPushed(SendWelcomeMessage::class);
    }
}
