<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ClientSubscription;
use App\Models\DiscountRequest;
use App\Models\SubscriptionType;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DiscountRequestController extends Controller
{
    // POST /api/v1/discount-requests
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'client_id'            => 'required|exists:clients,id',
            'subscription_type_id' => 'required|exists:subscription_types,id',
            'requested_amount'     => 'required|integer|min:0',
            'reason'               => 'required|string|max:500',
        ]);

        $type = SubscriptionType::findOrFail($request->subscription_type_id);

        $discountRequest = DiscountRequest::create([
            'client_id'            => $request->client_id,
            'subscription_type_id' => $request->subscription_type_id,
            'requested_by'         => auth()->id(),
            'original_amount'      => $type->price_monthly,
            'requested_amount'     => $request->requested_amount,
            'reason'               => $request->reason,
            'status'               => 'pending',
        ]);

        // إرسال Reverb event للأدمن
        broadcast(new \App\Events\DiscountRequestCreated($discountRequest))->toOthers();

        AuditLogService::log('discount_request.create', 'DiscountRequest', $discountRequest->id, [], $discountRequest->toArray());

        return response()->json([
            'message' => 'تم إرسال طلب الخصم بانتظار موافقة الأدمن.',
            'data'    => $discountRequest,
        ], 201);
    }

    // POST /api/v1/discount-requests/{id}/approve
    public function approve(Request $request, DiscountRequest $discountRequest): JsonResponse
    {
        if ($discountRequest->status !== 'pending') {
            return response()->json(['message' => 'الطلب تمت مراجعته مسبقاً.'], 422);
        }

        $old = $discountRequest->toArray();

        $discountRequest->update([
            'status'      => 'approved',
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
            'review_note' => $request->review_note,
        ]);

        AuditLogService::log('discount_request.approve', 'DiscountRequest', $discountRequest->id, $old, $discountRequest->fresh()->toArray());

        return response()->json(['message' => 'تمت الموافقة على الخصم.', 'data' => $discountRequest->fresh()]);
    }

    // POST /api/v1/discount-requests/{id}/reject
    public function reject(Request $request, DiscountRequest $discountRequest): JsonResponse
    {
        if ($discountRequest->status !== 'pending') {
            return response()->json(['message' => 'الطلب تمت مراجعته مسبقاً.'], 422);
        }

        $old = $discountRequest->toArray();

        $discountRequest->update([
            'status'      => 'rejected',
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
            'review_note' => $request->review_note,
        ]);

        AuditLogService::log('discount_request.reject', 'DiscountRequest', $discountRequest->id, $old, $discountRequest->fresh()->toArray());

        return response()->json(['message' => 'تم رفض طلب الخصم.']);
    }

    // GET /api/v1/discount-requests
    public function index(Request $request): JsonResponse
    {
        $requests = DiscountRequest::with(['client', 'subscriptionType', 'requestedBy', 'reviewedBy'])
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->latest()
            ->paginate(20);

        return response()->json(['data' => $requests]);
    }
}
