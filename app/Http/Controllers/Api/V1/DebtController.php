<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\SendWhatsAppMessage;
use App\Models\Debt;
use App\Models\Setting;
use App\Models\WhatsappLog;
use App\Models\WhatsappTemplate;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DebtController extends Controller
{
    // ────────────────────────────────────────────────
    // قائمة الديون
    // ────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $debts = Debt::with('client:id,name,phone')
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->search, fn ($q, $s) =>
                $q->whereHas('client', fn ($c) => $c->where('name', 'like', "%{$s}%"))
            )
            ->orderByRaw("FIELD(status, 'overdue', 'pending', 'paid')")
            ->orderBy('due_date', 'asc')
            ->paginate($request->integer('per_page', 15));

        return response()->json($debts);
    }

    // ────────────────────────────────────────────────
    // إحصائيات الديون
    // ────────────────────────────────────────────────
    public function stats(): JsonResponse
    {
        $now = now()->toDateString();

        $stats = [
            'total'          => Debt::count(),
            'pending'        => Debt::where('status', 'pending')
                ->whereDate('due_date', '>=', $now)
                ->count(),
            'overdue'        => Debt::where('status', 'pending')
                ->whereDate('due_date', '<', $now)
                ->count(),
            'paid'           => Debt::where('status', 'paid')->count(),
            'total_amount'   => Debt::where('status', 'pending')->sum('amount'),
            'pending_amount' => Debt::where('status', 'pending')
                ->whereDate('due_date', '>=', $now)
                ->sum('amount'),
        ];

        return response()->json($stats);
    }

    // ────────────────────────────────────────────────
    // إضافة دين
    // ────────────────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'client_id' => ['required', 'exists:clients,id'],
            'amount'    => ['required', 'integer', 'min:1'],
            'reason'    => ['required', 'string', 'max:500'],
            'due_date'  => ['required', 'date', 'after_or_equal:today'],
        ]);

        $debt = Debt::create($data + [
            'status'     => 'pending',
            'created_by' => Auth::id(),
        ]);

        $debt->load('client:id,name,phone');

        // ✅ إرسال تذكير واتساب فوري عند إضافة الدين
        $this->dispatchDebtNotification($debt);

        return response()->json([
            'message' => 'تم إضافة الدين بنجاح',
            'data'    => $debt->fresh('client:id,name,phone'),
        ], 201);
    }

    // ────────────────────────────────────────────────
    // تسجيل السداد
    // ────────────────────────────────────────────────
    public function markPaid(Debt $debt): JsonResponse
    {
        if ($debt->status === 'paid') {
            return response()->json(['message' => 'الدين مسدّد مسبقاً'], 422);
        }

        $debt->update([
            'status'  => 'paid',
            'paid_at' => now(),
        ]);

        return response()->json([
            'message' => 'تم تسجيل السداد ✅',
            'data'    => $debt->fresh(),
        ]);
    }

    // ────────────────────────────────────────────────
    // إرسال تذكير واتساب يدوي
    // ────────────────────────────────────────────────
    public function notify(Debt $debt): JsonResponse
    {
        if ($debt->status === 'paid') {
            return response()->json(['message' => 'الدين مسدّد — لا حاجة للتذكير'], 422);
        }

        $debt->loadMissing('client:id,name,phone');

        $sent = $this->dispatchDebtNotification($debt, force: true);

        if (! $sent) {
            return response()->json([
                'message' => 'تعذر جدولة التذكير — تأكد من رقم الهاتف أو تفعيل قالب الدين.',
            ], 422);
        }

        return response()->json(['message' => 'تم إرسال التذكير ✅']);
    }

    // ────────────────────────────────────────────────
    // Helper — إرسال تذكير الدين
    // ────────────────────────────────────────────────
    private function dispatchDebtNotification(Debt $debt, bool $force = false): bool
    {
        $debt->loadMissing('client:id,name,phone');

        $client = $debt->client;
        if (! $client?->phone) {
            return false;
        }

        $template = WhatsappTemplate::where('type', 'debt_reminder')
            ->where('enabled', true)
            ->first();

        if (! $template) {
            return false;
        }

        // منع إرسال أكتر من مرة خلال 24 ساعة إلا لو force = true
        if (
            ! $force &&
            $debt->notified_at &&
            $debt->notified_at->diffInHours(now()) < 24
        ) {
            return false;
        }

        $phone = WhatsAppService::normalizePhone($client->phone);
        if (! $phone) {
            return false;
        }

        $gymName = Setting::getValue('gym_name', config('app.name', 'GymOS'));

        /**
         * اختر واحدة من السطرين حسب طريقة التخزين عندك:
         * - لو amount مخزنة بالجنيه مباشرة → استخدم الأول
         * - لو amount مخزنة بالقروش/السنتات → استخدم الثاني
         */

        // ✅ لو amount مخزنة بالجنيه مباشرة:
        $amountDisplay = number_format((float) $debt->amount, 2) . ' ج.م';

        // ✅ لو amount مخزنة بالقروش/السنتات استخدم هذا بدل السطر السابق:
        // $amountDisplay = number_format(((float) $debt->amount) / 100, 2) . ' ج.م';

        $variables = [
            'name'           => $client->name,
            'gym_name'       => $gymName,
            'amount_display' => $amountDisplay,
            'reason'         => $debt->reason,
            'due_date'       => $debt->due_date->toDateString(),
        ];

        $log = WhatsappLog::create([
            'client_id'       => $client->id,
            'template_type'   => 'debt_reminder',
            'message_content' => $template->render($variables),
            'phone_number'    => $phone,
            'status'          => 'pending',
        ]);

        SendWhatsAppMessage::dispatch($log);

        $debt->update([
            'notified_at' => now(),
        ]);

        return true;
    }
}
