<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ClientSession;
use App\Models\Client;
use App\Models\SessionType;
use Illuminate\Http\Request;

class ClientSessionController extends Controller
{
    public function index(Request $request)
    {
        $query = ClientSession::with([
            'client:id,name,phone,qr_id',
            'sessionType:id,name',
            'subscriptionType:id,name',
            'creator:id,name',
        ])->latest();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('client', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('qr_id', 'like', "%{$search}%");
            });
        }

        if ($request->filled('session_type_id')) {
            $query->where('session_type_id', $request->session_type_id);
        }

        return response()->json([
            'data' => $query->paginate(min((int) $request->get('per_page', 20), 100)),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'session_type_id' => 'required|exists:session_types,id',
            'subscription_type_id' => 'nullable|exists:subscription_types,id',
            'sessions_count' => 'required|integer|min:1|max:1000',
            'unit_price' => 'required|integer|min:0',
            'discount_amount' => 'nullable|integer|min:0',
            'paid_amount' => 'nullable|integer|min:0',
            'notes' => 'nullable|string|max:2000',
        ]);

        $discount = $data['discount_amount'] ?? 0;
        $gross = $data['unit_price'] * $data['sessions_count'];
        $total = max(0, $gross - $discount);
        $paid = min($data['paid_amount'] ?? $total, $total);
        $remaining = max(0, $total - $paid);

        $session = ClientSession::create([
            'client_id' => $data['client_id'],
            'session_type_id' => $data['session_type_id'],
            'subscription_type_id' => $data['subscription_type_id'] ?? null,
            'sessions_count' => $data['sessions_count'],
            'unit_price' => $data['unit_price'],
            'discount_amount' => $discount,
            'total_amount' => $total,
            'paid_amount' => $paid,
            'remaining_amount' => $remaining,
            'status' => $remaining === 0 ? 'paid' : ($paid > 0 ? 'partial' : 'pending'),
            'notes' => $data['notes'] ?? null,
            'created_by' => auth()->id(),
        ]);

        return response()->json([
            'data' => $session->load([
                'client:id,name,phone,qr_id',
                'sessionType:id,name',
                'subscriptionType:id,name',
                'creator:id,name',
            ])
        ], 201);
    }

    public function show(ClientSession $clientSession)
    {
        return response()->json([
            'data' => $clientSession->load([
                'client:id,name,phone,qr_id',
                'sessionType:id,name',
                'subscriptionType:id,name',
                'creator:id,name',
            ])
        ]);
    }
}
