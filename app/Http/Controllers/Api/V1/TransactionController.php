<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\StaffShift;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $query = Transaction::with(['client:id,name', 'cashier:id,name']);

        if ($request->type) $query->where('type', $request->type);
        if ($request->category) $query->where('category', $request->category);
        if ($request->date_from) $query->whereDate('created_at', '>=', $request->date_from);
        if ($request->date_to) $query->whereDate('created_at', '<=', $request->date_to);
        if ($request->shift_id) $query->where('shift_id', $request->shift_id);

        return response()->json($query->latest()->paginate(20));
    }

    public function income(Request $request)
    {
        $request->validate([
            'category' => 'required|string',
            'amount' => 'required|integer|min:0', // بالقروش
            'payment_method' => 'required|in:cash,card',
        ]);

        $shift = $this->getCurrentShift();
        if (!$shift) return response()->json(['message' => 'يجب فتح شيفت أولاً'], 422);

        $transaction = Transaction::create([
            'type' => 'income',
            'category' => $request->category,
            'amount' => $request->amount,
            'client_id' => $request->client_id,
            'subscription_id' => $request->subscription_id,
            'payment_method' => $request->payment_method,
            'cashier_id' => Auth::id(),
            'shift_id' => $shift->id,
            'notes' => $request->notes,
        ]);

        return response()->json(['message' => 'تم تسجيل الإيراد بنجاح', 'data' => $transaction]);
    }

    public function expense(Request $request)
    {
        $request->validate([
            'category' => 'required|string',
            'amount' => 'required|integer|min:0',
            'payment_method' => 'required|in:cash,card',
        ]);

        $shift = $this->getCurrentShift();
        if (!$shift) return response()->json(['message' => 'يجب فتح شيفت أولاً'], 422);

        $transaction = Transaction::create([
            'type' => 'expense',
            'category' => $request->category,
            'amount' => $request->amount,
            'payment_method' => $request->payment_method,
            'cashier_id' => Auth::id(),
            'shift_id' => $shift->id,
            'notes' => $request->notes,
        ]);

        return response()->json(['message' => 'تم تسجيل المصروف بنجاح', 'data' => $transaction]);
    }

    public function summary()
    {
        $todayIncome = Transaction::where('type', 'income')->whereDate('created_at', today())->sum('amount');
        $todayExpense = Transaction::where('type', 'expense')->whereDate('created_at', today())->sum('amount');

        $monthIncome = Transaction::where('type', 'income')->whereMonth('created_at', today()->month)->sum('amount');
        $monthExpense = Transaction::where('type', 'expense')->whereMonth('created_at', today()->month)->sum('amount');

        return response()->json([
            'today_income' => $todayIncome,
            'today_expense' => $todayExpense,
            'today_net' => $todayIncome - $todayExpense,
            'month_income' => $monthIncome,
            'month_expense' => $monthExpense,
            'month_net' => $monthIncome - $monthExpense,
        ]);
    }

    private function getCurrentShift()
    {
        return StaffShift::where('staff_id', Auth::id())->where('status', 'open')->first();
    }
}
