<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanupExpiredSessions extends Command
{
    protected $signature = 'gymos:cleanup';
    protected $description = 'تنظيف النظام من التوكنز المنتهية والملفات المؤقتة';

    public function handle()
    {
        $this->info('🧹 جاري تنظيف النظام...');

        $deletedTokens = DB::table('personal_access_tokens')
            ->where('expires_at', '<', now())
            ->delete();
        $this->line("✅ تم مسح {$deletedTokens} جلسة دخول منتهية.");

        $deletedJobs = DB::table('failed_jobs')
            ->where('failed_at', '<', now()->subDays(30))
            ->delete();
        $this->line("✅ تم مسح {$deletedJobs} عملية فاشلة قديمة.");

        $this->info('✨ النظام الآن نظيف وخفيف.');
    }
}
