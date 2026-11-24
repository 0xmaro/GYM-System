<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'user_id'     => 'nullable|exists:users,id',
            'action'      => 'nullable|string',
            'entity_type' => 'nullable|string',
            'date_from'   => 'nullable|date',
            'date_to'     => 'nullable|date',
            'search'      => 'nullable|string|max:100',
            'per_page'    => 'nullable|integer|min:10|max:200',
        ]);

        $query = AuditLog::with('user:id,name,role')
            ->when($request->user_id,     fn($q) => $q->where('user_id', $request->user_id))
            ->when($request->action,      fn($q) => $q->where('action', 'like', "%{$request->action}%"))
            ->when($request->entity_type, fn($q) => $q->where('entity_type', $request->entity_type))
            ->when($request->date_from,   fn($q) => $q->whereDate('created_at', '>=', $request->date_from))
            ->when($request->date_to,     fn($q) => $q->whereDate('created_at', '<=', $request->date_to))
            ->when($request->ip_address,  fn($q) => $q->where('ip_address', $request->ip_address))
            ->when($request->search, fn($q) => $q->where(function ($sub) use ($request) {
                $sub->where('action', 'like', "%{$request->search}%")
                    ->orWhere('entity_type', 'like', "%{$request->search}%")
                    ->orWhere('ip_address', 'like', "%{$request->search}%");
            }));

        $logs = $query->latest()->paginate($request->per_page ?? 50);

        // إضافة الـ labels والـ diff للـ frontend
        $logs->getCollection()->transform(function ($log) {
            $log->action_label   = $this->translateAction($log->action);
            $log->action_color   = $this->actionColor($log->action);
            $log->entity_label   = $this->translateEntity($log->entity_type);
            $log->changes_diff   = $this->buildDiff($log->old_values, $log->new_values);
            $log->time_formatted = $log->created_at->format('Y/m/d — h:i A');
            $log->time_ago       = $log->created_at->diffForHumans();
            return $log;
        });

        return response()->json([
            'data'  => $logs->items(),
            'meta'  => [
                'current_page' => $logs->currentPage(),
                'last_page'    => $logs->lastPage(),
                'total'        => $logs->total(),
                'per_page'     => $logs->perPage(),
            ],
        ]);
    }

    public function show(AuditLog $auditLog): JsonResponse
    {
        $auditLog->load('user:id,name,role,phone');
        $auditLog->action_label = $this->translateAction($auditLog->action);
        $auditLog->entity_label = $this->translateEntity($auditLog->entity_type);
        $auditLog->changes_diff = $this->buildDiff($auditLog->old_values, $auditLog->new_values);

        return response()->json(['data' => $auditLog]);
    }

    public function stats(): JsonResponse
    {
        $today = today();

        return response()->json([
            'total_today'      => AuditLog::whereDate('created_at', $today)->count(),
            'total_week'       => AuditLog::where('created_at', '>=', now()->subDays(7))->count(),
            'total_all'        => AuditLog::count(),
            'by_action_today'  => AuditLog::whereDate('created_at', $today)
                ->selectRaw('action, count(*) as count')
                ->groupBy('action')
                ->orderByDesc('count')
                ->limit(10)
                ->get(),
            'by_user_today'    => AuditLog::whereDate('created_at', $today)
                ->with('user:id,name')
                ->selectRaw('user_id, count(*) as count')
                ->groupBy('user_id')
                ->orderByDesc('count')
                ->limit(5)
                ->get(),
            'unique_ips_today' => AuditLog::whereDate('created_at', $today)
                ->distinct('ip_address')
                ->count('ip_address'),
        ]);
    }

    public function export(Request $request)
    {
        abort_unless(auth()->user()->role === 'admin', 403, 'غير مصرح بالتصدير.');

        $request->validate([
            'date_from' => 'required|date',
            'date_to'   => 'required|date|after_or_equal:date_from',
        ]);

        $logs = AuditLog::with('user:id,name,role')
            ->whereDate('created_at', '>=', $request->date_from)
            ->whereDate('created_at', '<=', $request->date_to)
            ->when($request->user_id,     fn($q) => $q->where('user_id', $request->user_id))
            ->when($request->entity_type, fn($q) => $q->where('entity_type', $request->entity_type))
            ->latest()
            ->get();

        $csv  = "\xEF\xBB\xBF"; // BOM for Arabic Excel
        $csv .= "ID,المستخدم,الدور,الإجراء,نوع السجل,رقم السجل,IP,الجهاز,التاريخ والوقت\n";

        foreach ($logs as $log) {
            $csv .= implode(',', [
                $log->id,
                '"' . ($log->user?->name ?? 'النظام') . '"',
                '"' . ($log->user?->role ?? '') . '"',
                '"' . $log->action . '"',
                '"' . $log->entity_type . '"',
                $log->entity_id,
                '"' . ($log->ip_address ?? '') . '"',
                '"' . str_replace('"', "'", $log->device_info ?? '') . '"',
                '"' . $log->created_at->format('Y-m-d H:i:s') . '"',
            ]) . "\n";
        }

        return response($csv, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="audit-log-' . $request->date_from . '-to-' . $request->date_to . '.csv"',
        ]);
    }

    // ─── Helpers ────────────────────────────────────────────────

    private function translateAction(string $action): string
    {
        return match(true) {
            str_contains($action, 'attendance.qr')       => 'حضور QR',
            str_contains($action, 'attendance.manual')   => 'حضور يدوي',
            str_contains($action, 'subscription.create') => 'اشتراك جديد',
            str_contains($action, 'subscription.renew')  => 'تجديد اشتراك',
            str_contains($action, 'subscription.freeze') => 'تجميد اشتراك',
            str_contains($action, 'client.create')       => 'إضافة عميل',
            str_contains($action, 'client.update')       => 'تعديل عميل',
            str_contains($action, 'client.delete')       => 'حذف عميل',
            str_contains($action, 'discount_request')    => 'طلب خصم',
            str_contains($action, 'shift')               => 'شيفت',
            str_contains($action, 'transaction')         => 'معاملة مالية',
            str_contains($action, 'qr_card')             => 'كارت QR',
            str_contains($action, 'class')               => 'حصة تدريبية',
            str_contains($action, 'debt')                => 'ديون',
            str_contains($action, 'setting')             => 'إعدادات',
            default                                      => $action,
        };
    }

    private function actionColor(string $action): string
    {
        return match(true) {
            str_contains($action, 'delete')   => 'danger',
            str_contains($action, 'create')   => 'success',
            str_contains($action, 'update')   => 'warning',
            str_contains($action, 'login')    => 'primary',
            str_contains($action, 'freeze')   => 'warning',
            str_contains($action, 'approve')  => 'success',
            str_contains($action, 'reject')   => 'danger',
            default                           => 'muted',
        };
    }

    private function translateEntity(string $entity): string
    {
        return match($entity) {
            'Client'           => 'عميل',
            'ClientSubscription' => 'اشتراك',
            'Attendance'       => 'حضور',
            'Transaction'      => 'معاملة مالية',
            'DiscountRequest'  => 'طلب خصم',
            'StaffShift'       => 'شيفت',
            'QrCard'           => 'كارت QR',
            'GymClass'         => 'حصة',
            'Debt'             => 'دين',
            'Setting'          => 'إعداد',
            default            => $entity,
        };
    }
private function buildDiff(mixed $old, mixed $new): array
{
    if (!$old && !$new) return [];

    // الـ Model بيرجع array تلقائياً بسبب $casts — نتعامل مع الاتنين
    $oldArr = is_array($old) ? $old : (json_decode($old, true) ?? []);
    $newArr = is_array($new) ? $new : (json_decode($new, true) ?? []);

    $diff = [];
    $skip = ['updated_at', 'created_at', 'remember_token', 'password'];
    $allKeys = array_unique(array_merge(array_keys($oldArr), array_keys($newArr)));

    foreach ($allKeys as $key) {
        if (in_array($key, $skip)) continue;
        $before = $oldArr[$key] ?? null;
        $after  = $newArr[$key] ?? null;
        if ($before !== $after) {
            $diff[] = [
                'field'  => $key,
                'before' => is_array($before) ? json_encode($before, JSON_UNESCAPED_UNICODE) : $before,
                'after'  => is_array($after)  ? json_encode($after,  JSON_UNESCAPED_UNICODE) : $after,
            ];
        }
    }

    return $diff;
}
}
