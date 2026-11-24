<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use App\Services\AuditLogService;

class MonitorWhatsAppService extends Command
{
    protected $signature = 'gymos:monitor-whatsapp';
    protected $description = 'Monitor WhatsApp Microservice Health';

    public function handle()
    {
        try {
            $response = Http::timeout(5)->get('http://localhost:3001/status');
            if ($response->failed()) {
                $this->reportFailure('الخدمة ردت بكود خطأ: ' . $response->status());
            }
        } catch (\Exception $e) {
            $this->reportFailure('الخدمة لا تستجيب: ' . $e->getMessage());
        }
    }

    private function reportFailure($reason)
    {
        AuditLogService::log('whatsapp.service_down', 'System', 0, [], ['reason' => $reason]);
        \Log::critical('WhatsApp Service is DOWN: ' . $reason);
    }
}
