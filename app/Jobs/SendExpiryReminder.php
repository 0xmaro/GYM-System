<?php

namespace App\Jobs;

use App\Models\ClientSubscription;
use App\Models\Setting;
use App\Models\WhatsappLog;
use App\Models\WhatsappTemplate;
use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendExpiryReminder implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public ClientSubscription $subscription;

    public function __construct(ClientSubscription $subscription)
    {
        $this->subscription = $subscription;
        $this->onQueue('whatsapp'); // تقدر تغير اسم الكيو حسب إعدادك
    }

    public function handle(): void
    {
        $subscription = $this->subscription->fresh(['client', 'subscriptionType']);

        if (! $subscription || $subscription->status !== 'active') {
            return;
        }

        $client = $subscription->client;

        if (! $client || ! $client->phone) {
            return;
        }

        $template = WhatsappTemplate::where('type', 'expiry_reminder')
            ->where('enabled', true)
            ->first();

        if (! $template) {
            return;
        }

        $phone = WhatsAppService::normalizePhone($client->phone);

        if (! $phone) {
            return;
        }

        $gymName       = Setting::getValue('gym_name', config('app.name', 'My gym'));
        $daysRemaining = now()->diffInDays($subscription->end_date, false);

        $variables = [
            'name'              => $client->name,
            'gym_name'          => $gymName,
            'subscription_type' => $subscription->subscriptionType?->name ?? 'اشتراك',
            'end_date'          => $subscription->end_date->toDateString(),
            'days_remaining'    => $daysRemaining,
        ];

        $messageBody = $template->render($variables);

        $log = WhatsappLog::create([
            'client_id'       => $client->id,
            'template_type'   => 'expiry_reminder',
            'message_content' => $messageBody,
            'phone_number'    => $phone,
            'status'          => 'pending',
        ]);

        // هنا بنستخدم نفس Job الإرسال الموحد
        SendWhatsAppMessage::dispatch($log);
    }
}
