<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionType;
use Illuminate\Http\Request;

class SubscriptionTypeController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => SubscriptionType::orderBy('price_monthly')->get()
        ]);
    }

    public function show($id)
    {
        return response()->json([
            'data' => SubscriptionType::findOrFail($id)
        ]);
    }

    public function store(Request $request)
    {
        $v = $request->validate([
            'name'            => 'required|string|max:255',
            'price_monthly'   => 'required|integer|min:0',
            'price_3months'   => 'nullable|integer|min:0',
            'price_6months'   => 'nullable|integer|min:0',
            'session_price'   => 'nullable|integer|min:0',
            'duration_days'   => 'required|integer|min:1',
            'sessions_count'  => 'nullable|integer|min:1',
            'max_freeze_days' => 'nullable|integer|min:0',
            'is_active'       => 'boolean',
        ]);

        $type = SubscriptionType::create([
            'name'            => $v['name'],
            'price_monthly'   => $v['price_monthly'],
            'price_3months'   => $v['price_3months'] ?? (int) round($v['price_monthly'] * 3 * 0.9),
            'price_6months'   => $v['price_6months'] ?? (int) round($v['price_monthly'] * 6 * 0.8),
            'session_price'   => $v['session_price'] ?? null,
            'duration_days'   => $v['duration_days'],
            'sessions_count'  => $v['sessions_count'] ?? null,
            'max_freeze_days' => $v['max_freeze_days'] ?? 14,
            'is_active'       => $v['is_active'] ?? true,
        ]);

        return response()->json(['data' => $type], 201);
    }

    public function update(Request $request, $id)
    {
        $type = SubscriptionType::findOrFail($id);

        if ($request->isMethod('patch')) {
            $v = $request->validate([
                'is_active' => 'required|boolean',
            ]);

            $type->update($v);

            return response()->json(['data' => $type->fresh()]);
        }

        $v = $request->validate([
            'name'            => 'required|string|max:255',
            'price_monthly'   => 'required|integer|min:0',
            'price_3months'   => 'nullable|integer|min:0',
            'price_6months'   => 'nullable|integer|min:0',
            'session_price'   => 'nullable|integer|min:0',
            'duration_days'   => 'required|integer|min:1',
            'sessions_count'  => 'nullable|integer|min:1',
            'max_freeze_days' => 'nullable|integer|min:0',
            'is_active'       => 'boolean',
        ]);

        $type->update([
            'name'            => $v['name'],
            'price_monthly'   => $v['price_monthly'],
            'price_3months'   => $v['price_3months'] ?? (int) round($v['price_monthly'] * 3 * 0.9),
            'price_6months'   => $v['price_6months'] ?? (int) round($v['price_monthly'] * 6 * 0.8),
            'session_price'   => $v['session_price'] ?? null,
            'duration_days'   => $v['duration_days'],
            'sessions_count'  => $v['sessions_count'] ?? null,
            'max_freeze_days' => $v['max_freeze_days'] ?? 14,
            'is_active'       => $v['is_active'] ?? $type->is_active,
        ]);

        return response()->json(['data' => $type->fresh()]);
    }

    public function destroy($id)
    {
        $type = SubscriptionType::findOrFail($id);

        if ($type->subscriptions()->exists()) {
            return response()->json([
                'message' => 'لا يمكن حذف باقة مرتبطة بمشتركين حاليين'
            ], 422);
        }

        $type->delete();

        return response()->json(['message' => 'تم الحذف بنجاح']);
    }
}
