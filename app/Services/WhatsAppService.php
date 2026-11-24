<?php

namespace App\Services;

use App\Models\WhatsappLog;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    public static function normalizePhone(?string $raw): string
    {
        $phone = preg_replace('/\D+/', '', $raw ?? '');

        if (! $phone) {
            return '';
        }

        if (str_starts_with($phone, '0')) {
            $phone = '2' . $phone;
        }

        if (! str_starts_with($phone, '20')) {
            $phone = '20' . $phone;
        }

        return $phone;
    }

    public static function send(WhatsappLog $log): void
    {
        $logsDir = self::botLogsPath();
        $pendingFile = $logsDir . DIRECTORY_SEPARATOR . 'pending_connection.json';

        self::ensureDirectoryExists($logsDir);
        self::ensurePendingFileExists($pendingFile);

        $pending = self::readPendingMessages($pendingFile);

        $pending[] = [
            'id'             => self::generateQueueId(),
            'to'             => $log->phone_number,
            'message'        => $log->message_content,
            'log_id'         => $log->id,
            'reason'         => 'queued_from_laravel',
            'status'         => 'waiting_for_connection',
            'createdAt'      => now()->toISOString(),
            'waitingSince'   => now()->toISOString(),
            'maxWaitingDate' => now()->addDays(30)->toISOString(),
        ];

        self::writePendingMessages($pendingFile, $pending);

        Log::info('WhatsAppService queued message to pending_connection.json', [
            'log_id'       => $log->id,
            'phone_number' => $log->phone_number,
            'pending_file' => $pendingFile,
        ]);
    }

    private static function botLogsPath(): string
    {
        return base_path('../whatsapp-bot/logs');
    }

    private static function ensureDirectoryExists(string $directory): void
    {
        if (is_dir($directory)) {
            return;
        }

        if (! mkdir($directory, 0775, true) && ! is_dir($directory)) {
            throw new \RuntimeException("Failed to create WhatsApp logs directory: {$directory}");
        }
    }

    private static function ensurePendingFileExists(string $filePath): void
    {
        if (file_exists($filePath)) {
            return;
        }

        $written = file_put_contents(
            $filePath,
            json_encode([], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
        );

        if ($written === false) {
            throw new \RuntimeException("Failed to create pending connection file: {$filePath}");
        }
    }

    private static function readPendingMessages(string $filePath): array
    {
        $content = file_get_contents($filePath);

        if ($content === false || trim($content) === '') {
            return [];
        }

        $decoded = json_decode($content, true);

        return is_array($decoded) ? $decoded : [];
    }

    private static function writePendingMessages(string $filePath, array $messages): void
    {
        $written = file_put_contents(
            $filePath,
            json_encode($messages, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
        );

        if ($written === false) {
            throw new \RuntimeException("Failed to write pending messages file: {$filePath}");
        }
    }

    private static function generateQueueId(): string
    {
        return uniqid('wa_', true) . '_' . bin2hex(random_bytes(4));
    }
}
