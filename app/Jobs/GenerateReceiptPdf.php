<?php

namespace App\Jobs;

use App\Models\Transaction;
use App\Models\Setting;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class GenerateReceiptPdf implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public Transaction $transaction) {}

    public function handle(): void
    {
        $client = $this->transaction->client;
        $subscription = $this->transaction->subscription;

        if (!$client || !$subscription) return;

        $gymName = Setting::getValue('gym_name', 'My gym');
        $amountDisplay = number_format($this->transaction->amount / 100, 2);
        $discountDisplay = number_format($subscription->discount_amount / 100, 2);

        $data = [
            'gym_name' => $gymName,
            'receipt_number' => 'REC-' . str_pad($this->transaction->id, 6, '0', STR_PAD_LEFT),
            'client_name' => $client->name,
            'qr_id' => $client->qr_id,
            'subscription_type' => $subscription->subscriptionType->name,
            'amount' => $amountDisplay,
            'discount' => $discountDisplay,
            'payment_method' => $this->transaction->payment_method === 'cash' ? 'كاش' : 'بطاقة ائتمان',
            'cashier_name' => $this->transaction->cashier->name,
            'date' => $this->transaction->created_at->format('Y-m-d H:i:s'),
            'hash' => hash('sha256', $this->transaction->id . $this->transaction->amount . $client->id)
        ];

        $pdf = Pdf::loadView('receipts.invoice', $data);

        $year = now()->year;
        $month = str_pad(now()->month, 2, '0', STR_PAD_LEFT);
        $filePath = "receipts/{$year}/{$month}/receipt-{$this->transaction->id}.pdf";

        Storage::disk('private')->put($filePath, $pdf->output());

        $this->transaction->update(['receipt_url' => $filePath]);

        // إطلاق رسالة الواتساب المرفق بها الإيصال
        SendReceiptMessage::dispatch($this->transaction, $data);
    }
}
