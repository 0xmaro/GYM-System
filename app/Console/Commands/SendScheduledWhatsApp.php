<?php

namespace App\Console\Commands;

use App\Jobs\SendExpiryReminder;
use App\Models\ClientSubscription;
use App\Models\Setting;
use App\Models\WhatsappLog;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SendScheduledWhatsApp extends Command
{
    protected $signature   = 'whatsapp:send-scheduled';
    protected $description = 'Send scheduled WhatsApp reminders for expiring subscriptions';

    public function handle(): void
    {
        $this->info('🚀 بدء إرسال تذكيرات انتهاء الاشتراكات...');

        $this->sendExpiryReminders();

        $this->info('✅ WhatsApp scheduled messages dispatched.');
    }

    private function sendExpiryReminders(): void
    {
        $daysList = $this->getExpiryReminderDays();

        if (empty($daysList)) {
            $this->warn('⚠️ لا يوجد إعداد لأيام تذكير الانتهاء (expiry_reminder_days). سيتم استخدام القيمة الافتراضية [3].');
            $daysList = [3];
        }

        $totalQueued = 0;

        foreach ($daysList as $days) {
            $targetDate = Carbon::today()->addDays($days)->toDateString();

            $this->info("📆 البحث عن اشتراكات تنتهي بعد {$days} يوم (تاريخ الانتهاء: {$targetDate})...");

            $subscriptions = ClientSubscription::query()
                ->with(['client', 'subscriptionType'])
                ->where('status', 'active')
                ->whereDate('end_date', $targetDate)
                ->whereHas('client', function ($q) {
                    $q->whereNotNull('phone')
                      ->where('phone', '!=', '');
                })
                ->get();

            $this->info("🔎 تم العثور على {$subscriptions->count()} اشتراك/اشتراكات تنتهي بعد {$days} يوم.");

            foreach ($subscriptions as $subscription) {
                $client = $subscription->client;

                if (! $client) {
                    $this->warn("⚠️ اشتراك #{$subscription->id} ليس له عميل مرتبط.");
                    continue;
                }

                // التحقق من عدم إرسال تذكير لهذا العميل اليوم بالفعل
                $alreadySent = WhatsappLog::query()
                    ->where('client_id', $client->id)
                    ->where('template_type', 'expiry_reminder')
                    ->whereDate('created_at', today())
                    ->exists();

                if ($alreadySent) {
                    $this->line("⏭ تم تخطي العميل #{$client->id} ({$client->name}) – تم إرسال تذكير اليوم بالفعل.");
                    continue;
                }

                SendExpiryReminder::dispatch($subscription);
                $totalQueued++;

                $this->line("✅ تم جدولة تذكير انتهاء اشتراك للعميل #{$client->id} ({$client->name}) – اشتراك #{$subscription->id}، ينتهي في {$subscription->end_date->toDateString()}");
            }

            $this->info("📨 تم فحص اشتراكات اليوم المستهدف ({$days} يوم): {$subscriptions->count()}، المجدول منها: {$totalQueued} حتى الآن.");
        }

        $this->info("🎯 إجمالي التذكيرات التي تم جدولتها اليوم: {$totalQueued}");
    }

    /**
     * قراءة قائمة الأيام من إعداد expiry_reminder_days كـ JSON
     * مثال القيمة: [3,7,1]
     */
    private function getExpiryReminderDays(): array
    {
        $raw = Setting::where('key', 'expiry_reminder_days')->value('value');

        if (! $raw) {
            return [3];
        }

        $decoded = json_decode($raw, true);

        if (! is_array($decoded)) {
            return [3];
        }

        $days = collect($decoded)
            ->map(fn ($day) => (int) $day)
            ->filter(fn ($day) => $day >= 0)
            ->unique()
            ->sort()
            ->values()
            ->all();

        return empty($days) ? [3] : $days;
    }
}
