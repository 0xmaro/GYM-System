<?php

namespace App\Observers;

use App\Models\ClientSubscription;
use App\Services\AuditLogService;
use App\Jobs\SendWelcomeMessage;
use App\Jobs\SendFreezeNotification;
use App\Jobs\SendSessionsAlert;

class ClientSubscriptionObserver
{
    public function created(ClientSubscription $subscription): void
    {
        AuditLogService::log('subscription.created', 'ClientSubscription', $subscription->id, [], $subscription->toArray());

        // ✅ رسالة ترحيب عند إنشاء اشتراك جديد أو تجديد
        SendWelcomeMessage::dispatch($subscription);
    }

    public function updated(ClientSubscription $subscription): void
    {
        if ($subscription->wasChanged('status')) {

            // ✅ تجميد الاشتراك
            if ($subscription->status === 'frozen') {
                AuditLogService::log('subscription.frozen', 'ClientSubscription', $subscription->id, $subscription->getOriginal(), $subscription->getChanges());
                SendFreezeNotification::dispatch($subscription);
            }

            // ✅ رفع التجميد
            elseif ($subscription->status === 'active' && $subscription->getOriginal('status') === 'frozen') {
                AuditLogService::log('subscription.unfrozen', 'ClientSubscription', $subscription->id, $subscription->getOriginal(), $subscription->getChanges());
            }
        }

        // ✅ تمديد تاريخ الانتهاء
        if ($subscription->wasChanged('end_date')) {
            AuditLogService::log('subscription.date_extended', 'ClientSubscription', $subscription->id, $subscription->getOriginal(), $subscription->getChanges());
        }

        // ✅ آخر حصة في الباقة
        if ($subscription->wasChanged('sessions_remaining')
            && $subscription->sessions_remaining === 0
            && $subscription->subscriptionType?->sessions_count > 0) {
            SendSessionsAlert::dispatch($subscription);
        }
    }
}
