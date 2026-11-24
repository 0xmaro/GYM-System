<?php

namespace App\Observers;

use App\Models\Transaction;
use App\Services\AuditLogService;
use App\Jobs\GenerateReceiptPdf;

class TransactionObserver
{
    public function created(Transaction $transaction): void
    {
        AuditLogService::log('transaction.created', 'Transaction', $transaction->id, [], $transaction->toArray());

        // توليد إيصال PDF إذا كان إيراداً من اشتراك
        if ($transaction->type === 'income' && $transaction->category === 'subscription') {
            GenerateReceiptPdf::dispatch($transaction);
        }
    }
}
