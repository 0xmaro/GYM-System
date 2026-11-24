<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Transaction;
use App\Models\ClientSubscription;
use App\Models\Debt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * إحصائيات عامة للوحة التحكم والتقارير
     */
    public function stats()
    {
        $last30Days = now()->subDays(30);

        return response()->json([
            'financials' => [
                'total_income'   => (int) Transaction::where('type', 'income')->sum('amount'),
                'total_expenses' => (int) Transaction::where('type', 'expense')->sum('amount'),
                'month_income'   => (int) Transaction::where('type', 'income')->where('created_at', '>=', $last30Days)->sum('amount'),
                'pending_debts'  => (int) Debt::where('status', 'pending')->sum('amount'),
            ],
            'attendance' => [
                'today_count' => Attendance::whereDate('check_in_at', today())->count(),
                // توزيع الحضور على أيام الأسبوع
                'weekly_dist' => Attendance::select(DB::raw('DAYNAME(check_in_at) as day'), DB::raw('count(*) as count'))
                                    ->where('created_at', '>=', now()->subDays(7))
                                    ->groupBy('day')
                                    ->get(),
            ],
            'subscriptions' => [
                'active' => ClientSubscription::where('status', 'active')->count(),
                'expired_soon' => ClientSubscription::where('status', 'active')
                                    ->where('end_date', '<=', now()->addDays(7))
                                    ->count(),
            ]
        ]);
    }

    /**
     * تقرير الحضور المفصل
     */
    public function attendance(Request $request)
    {
        $query = Attendance::with('client:id,name');

        if ($request->date_from) $query->whereDate('check_in_at', '>=', $request->date_from);
        if ($request->date_to) $query->whereDate('check_in_at', '<=', $request->date_to);

        return response()->json([
            'total' => $query->count(),
            'data' => $query->latest('check_in_at')->paginate(20)
        ]);
    }

    /**
     * تقرير المالية المفصل
     */
    public function financial(Request $request)
    {
        $query = Transaction::query();

        if ($request->date_from) $query->whereDate('created_at', '>=', $request->date_from);
        if ($request->date_to) $query->whereDate('created_at', '<=', $request->date_to);

        $income = (clone $query)->where('type', 'income')->sum('amount');
        $expense = (clone $query)->where('type', 'expense')->sum('amount');

        return response()->json([
            'income' => (int) $income,
            'expense' => (int) $expense,
            'net_profit' => $income - $expense,
            'transactions' => $query->with('cashier:id,name', 'client:id,name')->latest()->paginate(20)
        ]);
    }
}
