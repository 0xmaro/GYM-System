<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SessionType;
use Illuminate\Http\Request;

class SessionTypeController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => SessionType::orderBy('name')->get()
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'default_price' => 'required|integer|min:0',
            'is_active' => 'boolean',
            'notes' => 'nullable|string|max:2000',
        ]);

        $type = SessionType::create([
            ...$data,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return response()->json(['data' => $type], 201);
    }

    public function update(Request $request, SessionType $sessionType)
    {
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'default_price' => 'sometimes|required|integer|min:0',
            'is_active' => 'sometimes|boolean',
            'notes' => 'nullable|string|max:2000',
        ]);

        $sessionType->update($data);

        return response()->json(['data' => $sessionType->fresh()]);
    }

    public function destroy(SessionType $sessionType)
    {
        if ($sessionType->clientSessions()->exists()) {
            return response()->json([
                'message' => 'لا يمكن حذف نوع حصة مستخدم بالفعل.'
            ], 422);
        }

        $sessionType->delete();

        return response()->json(['message' => 'تم الحذف بنجاح']);
    }
}
