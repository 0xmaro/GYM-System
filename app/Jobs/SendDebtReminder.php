<?php

namespace App\Jobs;

use App\Models\Debt;
use App\Models\WhatsappLog;
use App\Models\WhatsappTemplate;
use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendDebtReminder implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 30;

    public function __construct(public Debt $debt) {}

    public function handle(): void
    {
        $this->debt->loadMissing('client');

        $client = $this->debt->client;
        if (!$client?->phone) {
            return;
        }

        // منع رسالة مكررة في نفس اليوم لهذا الدين
        $alreadySent = WhatsappLog::where('client_id', $client->id)
            ->where('template_type', 'debt_reminder')
            ->whereDate('created_at', today())
            ->exists();

        if ($alreadySent) {
            return;
        }

        $template = WhatsappTemplate::where('type', 'debt_reminder')
            ->where('enabled', true)
            ->first();

        if (!$template) {
            return;
        }

        $amountDisplay = number_format($this->debt->amount / 100, 2) . ' ج.م';

        $variables = [
            'name'           => $client->name,
            'amount_display' => $amountDisplay,
            'reason'         => $this->debt->reason,
            'due_date'       => $this->debt->due_date->toDateString(),
        ];

        $phone   = WhatsAppService::normalizePhone($client->phone);
        $message = $template->render($variables);

        $log = WhatsappLog::create([
            'client_id'       => $client->id,
            'template_type'   => 'debt_reminder',
            'message_content' => $message,
            'phone_number'    => $phone,
            'status'          => 'pending',
        ]);

        // تُحدَّث notified_at لو نجحت في نقطة أخرى (callback أو job آخر لو حابب)
        SendWhatsAppMessage::dispatch($log);

        // اختيارياً: تقدر هنا تفترض إنه تم الإرسال وتضبط:
        // $this->debt->update(['notified_at' => now()]);
    }
}
