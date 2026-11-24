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

class SendWelcomeMessage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 1;
    public int $timeout = 30;

    public function __construct(public ClientSubscription $subscription) {}

    public function handle(): void
    {
        $this->subscription->loadMissing(['client', 'subscriptionType']);

        $client = $this->subscription->client;
        $type   = $this->subscription->subscriptionType;

        if (!$client || !$client->phone) {
            return;
        }

        $gymName  = Setting::getValue('gym_name', 'My gym');
        $template = WhatsappTemplate::where('type', 'welcome')
            ->where('enabled', true)
            ->first();

        if (!$template) {
            return;
        }

        // منع التكرار في نفس اليوم لنفس العميل
        $alreadySent = WhatsappLog::where('client_id', $client->id)
            ->where('template_type', 'welcome')
            ->whereDate('created_at', today())
            ->exists();

        if ($alreadySent) {
            return;
        }

        $variables = [
            'name'              => $client->name,
            'gym_name'          => $gymName,
            'subscription_type' => $type?->name ?? 'اشتراك',
            'end_date'          => $this->subscription->end_date->toDateString(),
            'sessions_count'    => $type?->sessions_count ?? 'غير محدود',
        ];

        $phone = WhatsAppService::normalizePhone($client->phone);

        $log = WhatsappLog::create([
            'client_id'       => $client->id,
            'template_type'   => 'welcome',
            'message_content' => $template->render($variables),
            'phone_number'    => $phone,
            'status'          => 'pending',
        ]);

        SendWhatsAppMessage::dispatch($log);
    }
}
