<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Client;
use App\Models\ClientSubscription;
use App\Models\Attendance;
use App\Models\Transaction;
use App\Models\Debt;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        try {
            $user   = auth()->user();
            $gender = $user->gender_access ?? 'both';

            // ─── Clients ───────────────────────────────────────────
            $clientsQ = Client::when($gender !== 'both', fn($q) => $q->where('gender', $gender));

            $activeCount  = (clone $clientsQ)->where('status', 'active')->count();
            $frozenCount  = (clone $clientsQ)->where('status', 'frozen')->count();
            $expiredCount = (clone $clientsQ)->where('status', 'expired')->count();

            // ─── Today Attendance ──────────────────────────────────
            $todayAttendance = Attendance::whereDate('check_in_at', today())
                ->whereHas('client', fn($q) => $gender !== 'both' ? $q->where('gender', $gender) : $q)
                ->with([
                    'client:id,name,photo_url,qr_id',
                    'subscription.subscriptionType:id,name',
                ])
                ->latest('check_in_at')
                ->get();

            // ─── Revenue ──────────────────────────────────────────
            $todayRevenue  = (int) Transaction::where('type', 'income')->whereDate('created_at', today())->sum('amount');
            $todayExpenses = (int) Transaction::where('type', 'expense')->whereDate('created_at', today())->sum('amount');
            $monthRevenue  = (int) Transaction::where('type', 'income')
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->sum('amount');

            // ─── Subscriptions ────────────────────────────────────
            $todayNewSubs = ClientSubscription::whereDate('created_at', today())
                ->when($gender !== 'both', fn($q) => $q->whereHas('client', fn($c) => $c->where('gender', $gender)))
                ->count();

            $todayRenewals = ClientSubscription::whereDate('created_at', today())
                ->whereRaw('(SELECT COUNT(*) FROM client_subscriptions cs2 WHERE cs2.client_id = client_subscriptions.client_id AND cs2.id < client_subscriptions.id) > 0')
                ->when($gender !== 'both', fn($q) => $q->whereHas('client', fn($c) => $c->where('gender', $gender)))
                ->count();

            $expiringSoon = ClientSubscription::where('status', 'active')
                ->whereBetween('end_date', [today(), today()->addDays(7)])
                ->when($gender !== 'both', fn($q) => $q->whereHas('client', fn($c) => $c->where('gender', $gender)))
                ->count();

            // ─── Revenue Chart (7 days) ───────────────────────────
            $revenueChart = [];
            for ($i = 6; $i >= 0; $i--) {
                $day = today()->subDays($i);
                $revenueChart[] = [
                    'date'   => $day->toDateString(),
                    'day'    => $day->locale('ar')->translatedFormat('D'),
                    'amount' => (int) Transaction::where('type', 'income')->whereDate('created_at', $day)->sum('amount'),
                    'expense'=> (int) Transaction::where('type', 'expense')->whereDate('created_at', $day)->sum('amount'),
                ];
            }

            // ─── Recent Activities ────────────────────────────────
            $recentActivities = AuditLog::with('user:id,name')
                ->latest()
                ->limit(15)
                ->get()
                ->map(fn($log) => [
                    'id'           => $log->id,
                    'action'       => $log->action,
                    'action_label' => $this->translateAction($log->action),
                    'description'  => $this->buildDescription($log),
                    'entity_type'  => $log->entity_type,
                    'entity_id'    => $log->entity_id,
                    'user'         => $log->user?->name ?? 'النظام',
                    'user_initial' => mb_substr($log->user?->name ?? 'N', 0, 1),
                    'time_ago'     => $log->created_at->diffForHumans(),
                ]);

            // ─── Attendance List (مع sub_type + remaining) ────────
            $attendanceList = $todayAttendance->map(fn($a) => [
                'id'        => $a->id,
                'name'      => $a->client?->name ?? '—',
                'photo_url' => $a->client?->photo_url,
                'qr_id'     => $a->client?->qr_id,
                'time'      => Carbon::parse($a->check_in_at)->format('h:i A'),
                'type'      => $a->type,
                'sub_type'  => $a->subscription?->subscriptionType?->name ?? 'غير محدد',
                'remaining' => $a->sessions_after,
            ]);

            return response()->json([
                'status' => 'success',
                'data'   => [
                    // User
                    'user_name'           => $user->name,
                    'user_role'           => $user->role,
                    'gender_access_label' => match($gender) {
                        'male'   => 'فرع الرجال',
                        'female' => 'فرع السيدات',
                        default  => 'فرع الرجال والسيدات',
                    },

                    // Clients
                    'active_clients_count'  => $activeCount,
                    'frozen_clients_count'  => $frozenCount,
                    'expired_clients_count' => $expiredCount,
                    'total_clients_count'   => $activeCount + $frozenCount + $expiredCount,

                    // Today
                    'today_attendance'           => $todayAttendance->count(),
                    'today_attendance_list'       => $attendanceList,
                    'today_new_subscriptions'    => $todayNewSubs,
                    'today_renewals'             => $todayRenewals,

                    // Revenue — display strings + raw ints
                    'today_revenue'         => $todayRevenue,
                    'today_expenses'        => $todayExpenses,
                    'today_net'             => $todayRevenue - $todayExpenses,
                    'today_revenue_display' => number_format($todayRevenue) . ' ج.م',
                    'today_expenses_display'=> number_format($todayExpenses) . ' ج.م',
                    'today_net_display'     => number_format($todayRevenue - $todayExpenses) . ' ج.م',
                    'month_revenue'         => $monthRevenue,
                    'month_revenue_display' => number_format($monthRevenue) . ' ج.م',

                    // Alerts
                    'expiring_soon_count' => $expiringSoon,
                    'pending_debts_total' => (int) Debt::where('status', 'pending')
                        ->when($gender !== 'both', fn($q) => $q->whereHas('client', fn($c) => $c->where('gender', $gender)))
                        ->sum('amount'),

                    // Chart & Logs
                    'revenue_chart_data' => $revenueChart,
                    'recent_activities'  => $recentActivities,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
                'line'    => $e->getLine(),
                'file'    => basename($e->getFile()),
            ], 500);
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────

    private function translateAction(string $action): string
    {
        return match(true) {
            str_contains($action, 'attendance')       => '📍 حضور',
            str_contains($action, 'subscription')     => '📋 اشتراك',
            str_contains($action, 'client')           => '👤 عميل',
            str_contains($action, 'discount')         => '🏷️ خصم',
            str_contains($action, 'shift')            => '🔄 شيفت',
            str_contains($action, 'transaction')      => '💰 معاملة',
            str_contains($action, 'qr')               => '🔲 كارت QR',
            str_contains($action, 'class')            => '🏋️ حصة',
            default                                   => '⚙️ نظام',
        };
    }

    private function buildDescription(AuditLog $log): string
    {
        return match(true) {
            str_contains($log->action, 'attendance.qr')     => 'تسجيل حضور بالـ QR',
            str_contains($log->action, 'attendance.manual') => 'تسجيل حضور يدوي',
            str_contains($log->action, 'subscription')      => 'عملية اشتراك #' . $log->entity_id,
            str_contains($log->action, 'discount')          => 'طلب خصم #' . $log->entity_id,
            str_contains($log->action, 'client')            => 'تحديث بيانات عميل #' . $log->entity_id,
            str_contains($log->action, 'qr')                => 'عملية كارت QR #' . $log->entity_id,
            default                                         => $log->action . ' #' . $log->entity_id,
        };
    }
}
