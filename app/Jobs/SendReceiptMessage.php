<?php

namespace App\Jobs;

use App\Models\Transaction;
use App\Models\WhatsappLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;

class SendReceiptMessage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public Transaction $transaction, public array $receiptData) {}

    public function handle(): void
    {
        $client = $this->transaction->client;

        $variables = [
            'name' => $this->receiptData['client_name'],
            'subscription_type' => $this->receiptData['subscription_type'],
            'amount_display' => $this->receiptData['amount'] . ' ج.م',
            'date' => $this->receiptData['date'],
            'receipt_number' => $this->receiptData['receipt_number'],
        ];

        $log = WhatsappLog::create([
            'client_id' => $client->id,
            'template_type' => 'receipt',
            'message_content' => json_encode($variables, JSON_UNESCAPED_UNICODE),
            'phone_number' => $client->phone,
            'status' => 'pending',
        ]);

        try {
            $secret = env('WHATSAPP_SERVICE_SECRET', 'My gym-secret-key');
            $response = Http::withToken($secret)->timeout(5)->post('http://localhost:3001/send', [
                'phone' => $client->phone,
                'template' => 'receipt',
                'variables' => $variables,
                'client_id' => $client->id,
            ]);

            if ($response->failed()) throw new \Exception('HTTP Error');
        } catch (\Exception $e) {
            $log->update(['status' => 'failed', 'error_message' => $e->getMessage()]);
        }
    }
}
