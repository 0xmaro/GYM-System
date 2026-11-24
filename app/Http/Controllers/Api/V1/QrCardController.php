<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\QrCard;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class QrCardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = QrCard::with([
            'client:id,name,phone',
            'lastClient:id,name,phone',
            'replacedByCard:id,qr_id',
        ])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('search'), fn ($q) => $q->search($request->search))
            ->latest();

        return response()->json($query->paginate($request->input('per_page', 50)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'qr_id' => ['required', 'string', 'max:50', 'unique:qr_cards,qr_id'],
            'status' => ['nullable', Rule::in(['available', 'returned'])],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $card = QrCard::create([
            'qr_id' => $data['qr_id'],
            'status' => $data['status'] ?? 'available',
            'notes' => $data['notes'] ?? null,
        ]);

        AuditLogService::log('qr_card.create', 'QrCard', $card->id, [], $card->toArray());

        return response()->json([
            'message' => 'تم إضافة الكارت بنجاح.',
            'card' => $card,
        ], 201);
    }

    public function assign(Request $request): JsonResponse
    {
        $data = $request->validate([
            'qr_id' => ['required', 'string', 'exists:qr_cards,qr_id'],
            'client_id' => ['required', 'exists:clients,id'],
        ]);

        $card = QrCard::where('qr_id', $data['qr_id'])->firstOrFail();
        $client = Client::findOrFail($data['client_id']);

        if (! in_array($card->status, ['available', 'returned'])) {
            return response()->json(['message' => 'الكارت غير متاح للتعيين.'], 422);
        }

        DB::transaction(function () use ($card, $client) {
            $card->update([
                'client_id' => $client->id,
                'last_client_id' => $client->id,
                'status' => 'distributed',
                'issued_at' => now(),
                'returned_at' => null,
            ]);

            $client->update([
                'qr_id' => $card->qr_id,
            ]);
        });

        AuditLogService::log('qr_card.assign', 'QrCard', $card->id, [], $card->fresh()->toArray());

        return response()->json([
            'message' => 'تم ربط الكارت بالعميل بنجاح.',
            'card' => $card->fresh(['client:id,name,phone']),
        ]);
    }

    public function check(Request $request): JsonResponse
{
    $qrId = trim((string) $request->query('qr_id', ''));
    $ignoreClientId = $request->query('ignore_client_id');

    if ($qrId === '') {
        return response()->json([
            'message' => 'يجب إدخال رقم الكارت.',
            'available' => false,
        ], 422);
    }

    $card = QrCard::with('client:id,name,phone')
        ->where('qr_id', $qrId)
        ->first();

    if (! $card) {
        return response()->json([
            'message' => 'الكارت غير موجود في النظام — أضفه أولاً.',
            'available' => false,
        ], 404);
    }

    if ($card->status === 'distributed' && $card->client_id) {
        if ($ignoreClientId && (int) $card->client_id === (int) $ignoreClientId) {
            return response()->json([
                'message' => 'هذا هو الكارت الحالي للعميل.',
                'available' => true,
                'status' => $card->status,
                'same_client' => true,
            ]);
        }

        return response()->json([
            'message' => 'الكارت مرتبط بعضو آخر.',
            'available' => false,
            'client' => $card->client?->name,
            'client_id' => $card->client_id,
            'status' => $card->status,
        ], 409);
    }

    if (! $card->isUsable()) {
        return response()->json([
            'message' => 'الكارت غير متاح للتعيين حاليًا.',
            'available' => false,
            'status' => $card->status,
        ], 422);
    }

    return response()->json([
        'message' => 'الكارت متاح ✅',
        'available' => true,
        'status' => $card->status,
        'same_client' => false,
    ]);
}

    public function replace(Request $request, QrCard $qrCard): JsonResponse
    {
        $data = $request->validate([
            'new_qr_id' => ['required', 'string', 'exists:qr_cards,qr_id'],
            'replacement_reason' => ['required', 'string', 'max:255'],
            'old_card_status' => ['required', Rule::in(['lost', 'damaged', 'cancelled', 'returned'])],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $newCard = QrCard::where('qr_id', $data['new_qr_id'])->firstOrFail();

        if ($qrCard->status !== 'distributed' || ! $qrCard->client_id) {
            return response()->json(['message' => 'لا يمكن استبدال كارت غير مرتبط بعضو.'], 422);
        }

        if (! in_array($newCard->status, ['available', 'returned'])) {
            return response()->json(['message' => 'الكارت الجديد غير متاح.'], 422);
        }

        $old = $qrCard->toArray();

        DB::transaction(function () use ($qrCard, $newCard, $data) {
            $timestamps = [
                'lost' => ['lost_at' => now()],
                'damaged' => ['damaged_at' => now()],
                'cancelled' => ['cancelled_at' => now()],
                'returned' => ['returned_at' => now()],
            ];

            $qrCard->update(array_merge([
                'last_client_id' => $qrCard->client_id,
                'client_id' => null,
                'status' => $data['old_card_status'],
                'replaced_by' => $newCard->id,
                'replacement_reason' => $data['replacement_reason'],
                'notes' => $data['notes'] ?? null,
            ], $timestamps[$data['old_card_status']]));

            $newCard->update([
                'client_id' => $old['client_id'] ?? $qrCard->last_client_id,
                'last_client_id' => $old['client_id'] ?? $qrCard->last_client_id,
                'status' => 'distributed',
                'issued_at' => now(),
                'returned_at' => null,
                'lost_at' => null,
                'damaged_at' => null,
                'cancelled_at' => null,
            ]);

            $client = $qrCard->client()->withTrashed()->first() ?? Client::find($qrCard->last_client_id);
            if ($client) {
                $client->update(['qr_id' => $newCard->qr_id]);
            }
        });

        AuditLogService::log('qr_card.replace', 'QrCard', $qrCard->id, $old, [
            'new_qr_id' => $newCard->qr_id,
            'replacement_reason' => $data['replacement_reason'],
            'old_card_status' => $data['old_card_status'],
        ]);

        return response()->json([
            'message' => 'تم استبدال الكارت بنجاح.',
            'new_qr_id' => $newCard->qr_id,
        ]);
    }

    public function returnCard(Request $request, QrCard $qrCard): JsonResponse
    {
        $data = $request->validate([
            'return_status' => ['required', Rule::in(['returned', 'available', 'lost', 'damaged', 'cancelled'])],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($qrCard->status !== 'distributed') {
            return response()->json(['message' => 'هذا الكارت ليس مصروفًا حاليًا.'], 422);
        }

        DB::transaction(function () use ($qrCard, $data) {
            $client = $qrCard->client;

            $payload = [
                'last_client_id' => $qrCard->client_id,
                'client_id' => null,
                'status' => $data['return_status'],
                'returned_at' => in_array($data['return_status'], ['returned', 'available']) ? now() : null,
                'lost_at' => $data['return_status'] === 'lost' ? now() : null,
                'damaged_at' => $data['return_status'] === 'damaged' ? now() : null,
                'cancelled_at' => $data['return_status'] === 'cancelled' ? now() : null,
                'notes' => $data['notes'] ?? null,
            ];

            $qrCard->update($payload);

            if ($client && $client->qr_id === $qrCard->qr_id) {
                $client->update(['qr_id' => null]);
            }
        });

        return response()->json(['message' => 'تم تحديث حالة الكارت بنجاح.']);
    }

    public function restore(Request $request, QrCard $qrCard): JsonResponse
    {
        $request->validate([
            'status' => ['nullable', Rule::in(['available', 'returned'])],
        ]);

        if (! in_array($qrCard->status, ['lost', 'returned', 'damaged'])) {
            return response()->json(['message' => 'لا يمكن إعادة هذا الكارت للخدمة من حالته الحالية.'], 422);
        }

        $old = $qrCard->toArray();

        $qrCard->update([
            'client_id' => null,
            'status' => $request->input('status', 'available'),
            'returned_at' => now(),
            'lost_at' => null,
            'damaged_at' => null,
            'cancelled_at' => null,
        ]);

        AuditLogService::log('qr_card.restore', 'QrCard', $qrCard->id, $old, $qrCard->fresh()->toArray());

        return response()->json([
            'message' => 'تمت إعادة الكارت للخدمة بنجاح.',
            'card' => $qrCard->fresh(),
        ]);
    }
public function printBatch(Request $request)
{
    $ids = $request->input('client_ids', []);

    if (empty($ids) || !is_array($ids)) {
        return response()->json([
            'message' => 'لم يتم تحديد أي أعضاء للطباعة.',
        ], 422);
    }

    $clients = \App\Models\Client::query()
        ->whereIn('id', $ids)
        ->get([
            'id',
            'name',
            'phone',
            'qr_id',
            'gender',
        ]);

    if ($clients->isEmpty()) {
        return response()->json([
            'message' => 'لم يتم العثور على أي أعضاء مطابقين.',
        ], 404);
    }

    $gymName = \App\Models\Setting::getValue('gym_name', config('app.name', 'GymOS'));

    return response(
        view('print.qr-cards', [
            'clients'  => $clients,
            'gymName'  => $gymName,
        ])->render(),
        200,
        ['Content-Type' => 'text/html; charset=UTF-8']
    );
}
    public function destroy(QrCard $qrCard): JsonResponse
    {
        if ($qrCard->status === 'distributed') {
            return response()->json([
                'message' => 'لا يمكن حذف كارت مرتبط حاليًا بعضو. قم بفك الربط أولًا.',
            ], 422);
        }

        $snapshot = $qrCard->toArray();
        $qrCard->delete();

        AuditLogService::log('qr_card.delete', 'QrCard', $qrCard->id, $snapshot, []);

        return response()->json([
            'message' => 'تم حذف الكارت بنجاح.',
        ]);
    }
}
