<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\SendWhatsAppMessage;
use App\Models\WhatsappCampaign;
use App\Models\WhatsappLog;
use App\Models\WhatsappTemplate;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppController extends Controller
{
    private function botUrl(): string
    {
        return rtrim(config('services.whatsapp_bot.url', 'http://localhost:5004'), '/');
    }

    private function botToken(): string
    {
        return config('services.whatsapp_bot.token', '');
    }

    private function botHttp(int $timeout = 5)
    {
        return Http::timeout($timeout)->withHeaders([
            'Authorization' => 'Bearer ' . $this->botToken(),
            'Accept' => 'application/json',
        ]);
    }

    private function resolveConnectedFlag(array $data): bool
    {
        if (array_key_exists('connected', $data)) {
            return (bool) $data['connected'];
        }

        return ($data['status'] ?? null) === 'connected';
    }

    public function status(): JsonResponse
    {
        try {
            $response = $this->botHttp()->get($this->botUrl() . '/api/whatsapp/status');

            if ($response->successful()) {
                $data = $response->json() ?? [];
                $data['connected'] = $this->resolveConnectedFlag($data);
                return response()->json($data);
            }
        } catch (\Throwable $e) {
            Log::warning('WhatsApp status failed: ' . $e->getMessage());
        }

        return response()->json([
            'connected' => false,
            'status'    => 'unreachable',
            'number'    => null,
        ]);
    }

    public function qr(): JsonResponse
    {
        try {
            $response = $this->botHttp()->get($this->botUrl() . '/api/whatsapp/qr');

            if ($response->successful()) {
                $data = $response->json() ?? [];
                $data['connected'] = $this->resolveConnectedFlag($data);
                return response()->json($data);
            }
        } catch (\Throwable $e) {
            Log::warning('WhatsApp QR failed: ' . $e->getMessage());
        }

        return response()->json([
            'success'   => false,
            'qr'        => null,
            'hasQR'     => false,
            'connected' => false,
        ]);
    }

    public function stats(): JsonResponse
    {
        try {
            $response = $this->botHttp()->get($this->botUrl() . '/api/whatsapp/stats');

            if ($response->successful()) {
                $data = $response->json() ?? [];
                $data['connected'] = $this->resolveConnectedFlag($data);
                return response()->json($data);
            }
        } catch (\Throwable $e) {
            Log::warning('WhatsApp stats failed: ' . $e->getMessage());
        }

        return response()->json([
            'success'   => false,
            'data'      => null,
            'connected' => false,
        ]);
    }

    public function start(): JsonResponse
    {
        try {
            $response = $this->botHttp(15)->post($this->botUrl() . '/api/whatsapp/start');
            $data = $response->json() ?? [];
            $data['connected'] = $this->resolveConnectedFlag($data);
            return response()->json($data, $response->status());
        } catch (\Throwable $e) {
            Log::error('WhatsApp start failed: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function stop(): JsonResponse
    {
        try {
            $response = $this->botHttp(15)->post($this->botUrl() . '/api/whatsapp/stop');
            $data = $response->json() ?? [];
            $data['connected'] = $this->resolveConnectedFlag($data);
            return response()->json($data, $response->status());
        } catch (\Throwable $e) {
            Log::error('WhatsApp stop failed: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function reconnect(): JsonResponse
    {
        try {
            $response = $this->botHttp(20)->post($this->botUrl() . '/api/whatsapp/reconnect');
            $data = $response->json() ?? [];
            $data['connected'] = $this->resolveConnectedFlag($data);
            return response()->json($data, $response->status());
        } catch (\Throwable $e) {
            Log::error('WhatsApp reconnect failed: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function logout(): JsonResponse
    {
        try {
            $response = $this->botHttp(15)->post($this->botUrl() . '/api/whatsapp/logout');
            $data = $response->json() ?? [];
            $data['connected'] = $this->resolveConnectedFlag($data);
            return response()->json($data, $response->status());
        } catch (\Throwable $e) {
            Log::error('WhatsApp logout failed: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function incomingMessages(Request $request): JsonResponse
    {
        try {
            $response = $this->botHttp()->get($this->botUrl() . '/api/whatsapp/incoming-messages', [
                'limit' => $request->integer('limit', 50),
            ]);

            if ($response->successful()) {
                $data = $response->json() ?? [];
                $data['connected'] = $this->resolveConnectedFlag($data);
                return response()->json($data);
            }
        } catch (\Throwable $e) {
            Log::warning('WhatsApp incoming messages failed: ' . $e->getMessage());
        }

        return response()->json([
            'success' => false,
            'data'    => ['messages' => [], 'unreadCount' => 0],
        ]);
    }

    public function markIncomingRead(string $messageId): JsonResponse
    {
        try {
            $response = $this->botHttp()->post($this->botUrl() . "/api/whatsapp/incoming-messages/{$messageId}/read");
            $data = $response->json() ?? [];
            $data['connected'] = $this->resolveConnectedFlag($data);
            return response()->json($data, $response->status());
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function clearIncomingMessages(): JsonResponse
    {
        try {
            $response = $this->botHttp()->delete($this->botUrl() . '/api/whatsapp/incoming-messages');
            $data = $response->json() ?? [];
            $data['connected'] = $this->resolveConnectedFlag($data);
            return response()->json($data, $response->status());
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function failedMessages(): JsonResponse
    {
        try {
            $response = $this->botHttp()->get($this->botUrl() . '/api/whatsapp/failed-messages');
            $data = $response->json() ?? ['data' => []];
            $data['connected'] = $this->resolveConnectedFlag($data);
            return response()->json($data, $response->status());
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'data' => []], 500);
        }
    }

    public function pendingMessages(): JsonResponse
    {
        try {
            $response = $this->botHttp()->get($this->botUrl() . '/api/whatsapp/pending-connection-messages');
            $data = $response->json() ?? ['data' => []];
            $data['connected'] = $this->resolveConnectedFlag($data);
            return response()->json($data, $response->status());
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'data' => []], 500);
        }
    }

    public function sendPending(): JsonResponse
    {
        try {
            $response = $this->botHttp(30)->post($this->botUrl() . '/api/whatsapp/send-pending');
            $data = $response->json() ?? [];
            $data['connected'] = $this->resolveConnectedFlag($data);
            return response()->json($data, $response->status());
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function logs(Request $request): JsonResponse
    {
        $logs = WhatsappLog::with('client:id,name')
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->when($request->template_type, fn ($q, $v) => $q->where('template_type', $v))
            ->when($request->date_from, fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($request->date_to, fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->latest()
            ->paginate($request->integer('per_page', 30));

        return response()->json($logs);
    }

    public function templates(): JsonResponse
    {
        return response()->json(
            WhatsappTemplate::orderBy('type')->get()
        );
    }

    public function updateTemplate(Request $request, WhatsappTemplate $template): JsonResponse
    {
        $data = $request->validate([
            'label'            => 'sometimes|string|max:100',
            'body'             => 'sometimes|string|max:4000',
            'enabled'          => 'sometimes|boolean',
            'send_days_before' => 'sometimes|nullable|integer|min:1|max:90',
        ]);

        $template->update($data);

        return response()->json([
            'ok'       => true,
            'template' => $template->fresh(),
        ]);
    }

    public function sendTest(Request $request): JsonResponse
    {
        $request->validate([
            'phone'   => 'required|string|min:9|max:20',
            'message' => 'nullable|string|max:5000',
        ]);

        $phone = WhatsAppService::normalizePhone($request->phone);
        $message = $request->input('message', 'رسالة اختبار من My Gym');

        if (! $phone) {
            return response()->json(['ok' => false, 'message' => 'رقم الهاتف غير صالح'], 422);
        }

        $log = WhatsappLog::create([
            'client_id'       => null,
            'template_type'   => 'custom',
            'message_content' => $message,
            'phone_number'    => $phone,
            'status'          => 'pending',
            'error_message'   => null,
            'sent_at'         => null,
        ]);

        SendWhatsAppMessage::dispatch($log);

        return response()->json([
            'ok'     => true,
            'log_id' => $log->id,
            'phone'  => $phone,
        ]);
    }

    public function campaigns(): JsonResponse
    {
        $campaigns = WhatsappCampaign::with('creator:id,name')
            ->latest()
            ->paginate(20);

        return response()->json($campaigns);
    }

    public function previewCampaign(Request $request): JsonResponse
    {
        $request->validate([
            'message'        => 'required|string|max:4000',
            'target_filters' => 'nullable|array',
        ]);

        $campaign = new WhatsappCampaign();
        $campaign->target_filters = $request->target_filters;
        $recipients = $campaign->resolveRecipients();

        return response()->json([
            'recipients_count' => $recipients->count(),
            'sample' => $recipients->take(5)->map(fn ($c) => [
                'name'  => $c->name,
                'phone' => $c->phone,
            ])->values(),
            'message_preview' => str_replace('{name}', $recipients->first()?->name ?? 'العميل', $request->message),
        ]);
    }

    public function storeCampaign(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'           => 'required|string|max:100',
            'message'        => 'required|string|max:4000',
            'target_filters' => 'nullable|array',
            'scheduled_at'   => 'nullable|date|after:now',
        ]);

        $campaign = new WhatsappCampaign($data);
        $campaign->created_by = auth()->id();
        $campaign->status = !empty($data['scheduled_at']) ? 'scheduled' : 'draft';
        $campaign->recipients_count = $campaign->resolveRecipients()->count();
        $campaign->save();

        return response()->json([
            'ok'       => true,
            'campaign' => $campaign,
        ], 201);
    }

    public function launchCampaign(WhatsappCampaign $campaign): JsonResponse
    {
        if (! in_array($campaign->status, ['draft', 'scheduled'], true)) {
            return response()->json(['message' => 'لا يمكن تشغيل الحملة في حالتها الحالية.'], 422);
        }

        $recipients = $campaign->resolveRecipients();

        $campaign->update([
            'status'           => 'running',
            'started_at'       => now(),
            'recipients_count' => $recipients->count(),
        ]);

        $queued = 0;

        foreach ($recipients as $client) {
            if (! $client->phone) {
                continue;
            }

            $phone = WhatsAppService::normalizePhone($client->phone);

            if (! $phone) {
                continue;
            }

            $log = WhatsappLog::create([
                'client_id'       => $client->id,
                'template_type'   => 'custom',
                'message_content' => str_replace('{name}', $client->name, $campaign->message),
                'phone_number'    => $phone,
                'status'          => 'pending',
                'error_message'   => null,
                'sent_at'         => null,
            ]);

            SendWhatsAppMessage::dispatch($log);
            $queued++;
        }

        return response()->json([
            'ok'     => true,
            'queued' => $queued,
        ]);
    }

    public function retryLog(WhatsappLog $log): JsonResponse
    {
        if (! in_array($log->status, ['failed', 'pending'], true)) {
            return response()->json([
                'ok'      => false,
                'message' => 'لا يمكن إعادة إرسال هذه الرسالة في حالتها الحالية.',
            ], 422);
        }

        if (! $log->phone_number) {
            return response()->json([
                'ok'      => false,
                'message' => 'رقم الهاتف غير موجود في هذا السجل.',
            ], 422);
        }

        $log->update([
            'status'        => 'pending',
            'error_message' => null,
            'sent_at'       => null,
        ]);

        SendWhatsAppMessage::dispatch($log);

        return response()->json([
            'ok'      => true,
            'message' => 'تمت إعادة جدولة الرسالة للإرسال.',
            'log_id'  => $log->id,
        ]);
    }

    public function callback(Request $request): JsonResponse
    {
        $data = $request->validate([
            'log_id'        => 'sometimes|integer',
            'status'        => 'required|in:sent,failed,connected,disconnected,received,processing,queued',
            'from'          => 'sometimes|string',
            'message'       => 'sometimes|string',
            'type'          => 'sometimes|string',
            'message_id'    => 'sometimes|string',
            'messageId'     => 'sometimes|string',
            'error_message' => 'sometimes|nullable|string',
            'client_id'     => 'sometimes|nullable|integer',
        ]);

        if ($data['status'] === 'received') {
            WhatsappLog::create([
                'client_id'       => null,
                'template_type'   => 'incoming',
                'message_content' => $data['message'] ?? '',
                'phone_number'    => $data['from'] ?? '',
                'status'          => 'sent',
                'sent_at'         => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Incoming message saved',
            ]);
        }

        if (in_array($data['status'], ['connected', 'disconnected'], true)) {
            return response()->json(['ok' => true]);
        }

        $log = null;

        if (!empty($data['log_id'])) {
            $log = WhatsappLog::find($data['log_id']);
        }

        if (! $log && ! empty($data['client_id'])) {
            $log = WhatsappLog::where('client_id', $data['client_id'])
                ->whereIn('status', ['pending', 'queued', 'processing', 'failed'])
                ->latest()
                ->first();
        }

        if (! $log) {
            Log::warning('WhatsApp callback log not found', $data);
            return response()->json(['ok' => false, 'message' => 'Log not found'], 404);
        }

        $incomingStatus = $data['status'];
        $errorMessage = $data['error_message'] ?? null;

        // لو status لسه pending من البوت بس فيه error_message، حولها failed
        if ($incomingStatus !== 'sent' && !empty($errorMessage)) {
            $incomingStatus = 'failed';
        }

        $updateData = [
            'status'        => $incomingStatus,
            'error_message' => $incomingStatus === 'sent' ? null : $errorMessage,
        ];

        if ($incomingStatus === 'sent') {
            $updateData['sent_at'] = now();
        }

        if ($incomingStatus === 'failed') {
            $updateData['sent_at'] = $log->sent_at;
        }

        $log->update($updateData);

        return response()->json(['ok' => true]);
    }

    public function log(Request $request): JsonResponse
    {
        $data = $request->validate([
            'client_id' => 'required|integer|exists:clients,id',
            'template'  => 'nullable|string|max:50',
            'message'   => 'required|string|max:5000',
        ]);

        WhatsappLog::create([
            'client_id'       => $data['client_id'],
            'template_type'   => $data['template'] ?? 'custom',
            'message_content' => $data['message'],
            'phone_number'    => null,
            'status'          => 'sent',
            'sent_at'         => now(),
        ]);

        return response()->json(['ok' => true]);
    }
}
