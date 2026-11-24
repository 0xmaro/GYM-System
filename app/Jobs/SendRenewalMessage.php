<?php

namespace App\Jobs;

use App\Models\ClientSubscription;
use App\Models\Setting;
use App\Models\WhatsappLog;
use App\Models\WhatsappTemplate;
use App\Services\WhatsAppService;

class SendRenewalMessage
{
    public function __construct(public readonly ClientSubscription $subscription)
    {
    }

    public static function dispatch(ClientSubscription $subscription): void
    {
        (new self($subscription))->handle();
    }

    public function handle(): void
    {
        \Log::info('SendRenewalMessage started', [
            'subscription_id' => $this->subscription->id,
            'client_id'       => $this->subscription->client_id,
        ]);

        $subscription = ClientSubscription::with(['client', 'subscriptionType'])
            ->find($this->subscription->id);

        if (! $subscription) {
            \Log::warning('SendRenewalMessage subscription not found', [
                'subscription_id' => $this->subscription->id,
            ]);
            return;
        }

        $client = $subscription->client;
        $type   = $subscription->subscriptionType;

        if (! $client?->phone) {
            \Log::warning('SendRenewalMessage missing client phone', [
                'subscription_id' => $subscription->id,
                'client_id'       => $subscription->client_id,
            ]);
            return;
        }

        $gymName = Setting::getValue('gym_name', config('app.name', 'My gym'));

        $template = WhatsappTemplate::where('type', 'renewal')
            ->where('enabled', true)
            ->first();

        \Log::info('SendRenewalMessage template lookup', [
            'template_id'   => $template?->id,
            'template_type' => $template?->type,
        ]);

        if (! $template) {
            \Log::warning('SendRenewalMessage renewal template not found or disabled');
            return;
        }

        $phone = WhatsAppService::normalizePhone($client->phone);

        if (! $phone) {
            \Log::warning('SendRenewalMessage normalized phone is empty', [
                'subscription_id' => $subscription->id,
                'client_id'       => $subscription->client_id,
                'raw_phone'       => $client->phone,
            ]);
            return;
        }

        $variables = [
            'name'              => $client->name,
            'gym_name'          => $gymName,
            'subscription_type' => $type?->name ?? 'اشتراك',
            'end_date'          => $subscription->end_date->toDateString(),
            'sessions_count'    => $type?->sessions_count ?? 'غير محدود',
            'amount_display'    => number_format((float) $subscription->amount_paid, 0) . ' ج.م',
            'date'              => now()->toDateString(),
            'receipt_number'    => $subscription->id,
        ];

        $log = WhatsappLog::create([
            'client_id'       => $client->id,
            'template_type'   => 'renewal',
            'message_content' => $template->render($variables),
            'phone_number'    => $phone,
            'status'          => 'pending',
        ]);

        \Log::info('SendRenewalMessage whatsapp log created', [
            'whatsapp_log_id' => $log->id,
            'phone'           => $phone,
        ]);

        SendWhatsAppMessage::dispatch($log);
    }
}
