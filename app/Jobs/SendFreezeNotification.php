<?php

namespace App\Jobs;

use App\Models\ClientSubscription;
use App\Models\WhatsappLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;

class SendFreezeNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 1;
    public int $timeout = 30;

    public function __construct(public ClientSubscription $subscription) {}

    public function handle(): void
    {
        $client   = $this->subscription->client;
        $gymName  = Setting::getValue('gym_name', 'My gym');

        $template = WhatsappTemplate::where('type', 'freeze_notification')
            ->where('enabled', true)
            ->first();

        if (!$template) return;

        $variables = [
            'name'         => $client->name,
            'gym_name'     => $gymName,
            'frozen_until' => $this->subscription->frozen_until?->toDateString() ?? '-',
            'new_end_date' => $this->subscription->end_date->toDateString(),
        ];

        $log = WhatsappLog::create([
            'client_id'       => $client->id,
            'template_type'   => 'freeze_notification',
            'message_content' => $template->render($variables),
            'phone_number'    => $client->phone,
            'status'          => 'pending',
        ]);

        SendWhatsAppMessage::dispatch($log);
    }
}
