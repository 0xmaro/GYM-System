<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\StaffShift;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ShiftController extends Controller
{
    public function open(Request $request)
    {
        $request->validate(['opening_cash' => 'required|integer|min:0']);

        if (StaffShift::where('staff_id', Auth::id())->where('status', 'open')->exists()) {
            return response()->json(['message' => 'لديك شيفت مفتوح بالفعل'], 422);
        }

        $shift = StaffShift::create([
            'staff_id' => Auth::id(),
            'start_time' => now(),
            'opening_cash' => $request->opening_cash,
            'expected_cash' => $request->opening_cash,
            'status' => 'open'
        ]);

        return response()->json(['message' => 'تم فتح الشيفت', 'shift_id' => $shift->id]);
    }

    public function current()
    {
        $shift = StaffShift::where('staff_id', Auth::id())->where('status', 'open')->first();
        if (!$shift) return response()->json(['message' => 'لا يوجد شيفت مفتوح'], 404);

        $cashIncome = Transaction::where('shift_id', $shift->id)->where('type', 'income')->where('payment_method', 'cash')->sum('amount');
        $cashExpense = Transaction::where('shift_id', $shift->id)->where('type', 'expense')->where('payment_method', 'cash')->sum('amount');

        $shift->update(['expected_cash' => $shift->opening_cash + $cashIncome - $cashExpense]);

        return response()->json($shift);
    }

    public function close(Request $request, StaffShift $shift)
    {
        if ($shift->staff_id !== Auth::id() || $shift->status !== 'open') {
            return response()->json(['message' => 'غير مصرح أو الشيفت مغلق'], 403);
        }

        $request->validate([
            'actual_cash' => 'required|integer|min:0',
            'difference_note' => 'required_if:actual_cash,!==,' . $shift->expected_cash
        ]);

        $shift->update([
            'actual_cash' => $request->actual_cash,
            'cash_difference' => $request->actual_cash - $shift->expected_cash,
            'difference_note' => $request->difference_note,
            'status' => 'closed',
            'end_time' => now()
        ]);

        return response()->json(['message' => 'تم إغلاق الشيفت بنجاح']);
    }

public function report(StaffShift $shift)
{
    if ($shift->staff_id !== Auth::id() && auth()->user()->role !== 'admin') {
        return response()->json(['message' => 'غير مصرح'], 403);
    }

    $transactions = Transaction::where('shift_id', $shift->id)->get();

    return response()->json([
        'shift' => $shift->load('staff:id,name', 'handoverTo:id,name'),
        'summary' => [
            'total_income'  => $transactions->where('type', 'income')->sum('amount'),
            'total_expense' => $transactions->where('type', 'expense')->sum('amount'),
            'cash_income'   => $transactions->where('type', 'income')->where('payment_method', 'cash')->sum('amount'),
            'card_income'   => $transactions->where('type', 'income')->where('payment_method', 'card')->sum('amount'),
            'sessions_registered' => $shift->total_sessions_registered,
            'subscriptions_sold'  => $shift->total_subscriptions,
            'cash_difference'     => $shift->cash_difference,
        ],
        'transactions' => $transactions->load('client:id,name', 'cashier:id,name'),
    ]);
}

    public function handover(Request $request, StaffShift $shift)
    {
        $request->validate([
            'handover_to' => 'required|exists:users,id',
            'actual_cash' => 'required|integer|min:0',
        ]);

        DB::transaction(function () use ($request, $shift) {
            $shift->update([
                'actual_cash' => $request->actual_cash,
                'cash_difference' => $request->actual_cash - $shift->expected_cash,
                'status' => 'closed',
                'end_time' => now(),
                'handover_to' => $request->handover_to
            ]);

            StaffShift::create([
                'staff_id' => $request->handover_to,
                'start_time' => now(),
                'opening_cash' => $request->actual_cash,
                'expected_cash' => $request->actual_cash,
                'status' => 'open'
            ]);
        });

        return response()->json(['message' => 'تم تسليم الشيفت بنجاح']);
    }
}
