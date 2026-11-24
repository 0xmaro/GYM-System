<?php

namespace App\Jobs;

use App\Models\ClientSubscription;
use App\Models\Setting;
use App\Models\WhatsappLog;
use App\Models\WhatsappTemplate;
use App\Jobs\SendWhatsAppMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendSessionsAlert implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 1;
    public int $timeout = 30;

    public function __construct(public ClientSubscription $subscription)
    {
        $this->onQueue('whatsapp');
    }

    public function handle(): void
    {
        $subscription = $this->subscription->fresh(['client', 'subscriptionType']);

        if (! $subscription || $subscription->status !== 'active') {
            return;
        }

        $client  = $subscription->client;
        $type    = $subscription->subscriptionType;
        $gymName = Setting::getValue('gym_name', 'My gym');

        if (! $client || ! $client->phone) {
            return;
        }

        $template = WhatsappTemplate::where('type', 'sessions_empty')
            ->where('enabled', true)
            ->first();

        if (! $template) {
            return;
        }

        $variables = [
            'name'              => $client->name,
            'gym_name'          => $gymName,
            'subscription_type' => $type?->name ?? 'اشتراك',
        ];

        $log = WhatsappLog::create([
            'client_id'       => $client->id,
            'template_type'   => 'sessions_empty',
            'message_content' => $template->render($variables),
            'phone_number'    => $client->phone,
            'status'          => 'pending',
        ]);

        SendWhatsAppMessage::dispatch($log);
    }
}
