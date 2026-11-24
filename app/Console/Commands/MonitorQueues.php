<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Services\AuditLogService;

class MonitorQueues extends Command
{
    protected $signature = 'gymos:monitor-queues';
    protected $description = 'Monitor Queue Workers and Failed Jobs';

    public function handle()
    {
        $failedCount = DB::table('failed_jobs')->count();

        if ($failedCount > 10) {
            AuditLogService::log('queue.failed_jobs_warning', 'System', 0, [], ['count' => $failedCount]);
            \Log::warning("تراكم في المهام الفاشلة: $failedCount مهمة.");
        }

        $this->info('تم فحص الطوابير بنجاح.');
    }
}
