<?php

namespace App\Jobs;

use App\Models\WhatsappLog;
use App\Services\WhatsAppService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SendWhatsAppMessage
{
    public static function dispatch(WhatsappLog $log): void
    {
        $botUrl   = rtrim(config('services.whatsapp_bot.url', 'http://localhost:5004'), '/');
        $botToken = config('services.whatsapp_bot.token', '');

        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $botToken,
                    'Accept'        => 'application/json',
                ])
                ->post($botUrl . '/api/whatsapp/send', [
                    'phone'   => $log->phone_number,
                    'message' => $log->message_content,
                    'log_id'  => $log->id,
                ]);

            Log::info('SendWhatsAppMessage bot response', [
                'log_id'      => $log->id,
                'http_status' => $response->status(),
                'body'        => $response->json() ?? $response->body(),
            ]);

            if ($response->successful()) {
                $log->update([
                    'status'        => 'processing',
                    'error_message' => null,
                ]);

                return;
            }

            self::queueFallback(
                $log,
                'Bot error: ' . $response->body()
            );
        } catch (\Throwable $e) {
            Log::warning('WhatsApp bot unavailable, fallback to file', [
                'log_id' => $log->id,
                'error'  => $e->getMessage(),
            ]);

            self::queueFallback($log, $e->getMessage());
        }
    }

    private static function queueFallback(WhatsappLog $log, ?string $reason = null): void
    {
        try {
            WhatsAppService::send($log);

            $log->update([
                'status'        => 'queued',
                'error_message' => $reason,
            ]);
        } catch (\Throwable $fallbackException) {
            Log::error('WhatsApp fallback queue failed', [
                'log_id' => $log->id,
                'error'  => $fallbackException->getMessage(),
            ]);

            $log->update([
                'status'        => 'failed',
                'error_message' => $reason
                    ? ($reason . ' | Fallback failed: ' . $fallbackException->getMessage())
                    : $fallbackException->getMessage(),
            ]);
        }
    }
}
