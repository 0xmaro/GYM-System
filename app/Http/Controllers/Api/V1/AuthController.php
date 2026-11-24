<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

class AuthController extends Controller
{
    /**
     * جلب قائمة الموظفين (لشاشة Staff.jsx)
     */
    public function index(): JsonResponse
    {
        $users = User::latest()->get();
        return response()->json($users);
    }

    /**
     * تسجيل الدخول
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'phone'    => 'required|string',
            'password' => 'required|string',
        ]);

        // ─── Brute Force Protection ───────────────────────────
        $key = 'login:' . $request->ip();

        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'message' => "محاولات كثيرة. انتظر {$seconds} ثانية."
            ], 429);
        }

        $user = User::where('phone', $request->phone)
                    ->where('is_active', true)
                    ->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            RateLimiter::hit($key, 900); // 15 دقيقة
            return response()->json(['message' => 'بيانات غير صحيحة.'], 401);
        }

        RateLimiter::clear($key);

        $token = $user->createToken('gymos-token')->plainTextToken;

        $user->update(['last_login_at' => now()]);

        AuditLogService::log('auth.login', 'User', $user->id, [], [
            'ip' => $request->ip(),
        ]);

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'            => $user->id,
                'name'          => $user->name,
                'phone'         => $user->phone,
                'role'          => $user->role,
                'gender_access' => $user->gender_access,
            ],
        ]);
    }

    /**
     * إضافة موظف جديد (من شاشة Staff.jsx)
     */
/**
     * إضافة موظف جديد
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $data = $request->validate([
                'name'     => 'required|string|max:255',
                'phone'    => 'required|string|unique:users,phone', // بقا إلزامي وفريد
                'email'    => 'required|email|unique:users,email',
                'password' => 'required|min:6',
                'role'     => 'required|in:admin,reception,captain',
            ]);

            $user = User::create([
                'name'          => $data['name'],
                'phone'         => $data['phone'], // هنا بناخد الرقم الحقيقي من الفورم
                'email'         => $data['email'],
                'password'      => Hash::make($data['password']),
                'role'          => $data['role'],
                'is_active'     => true,
                'gender_access' => 'both',
            ]);

            return response()->json(['message' => 'تم إضافة الموظف بنجاح', 'data' => $user], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        }
    }

    /**
     * تحديث بيانات موظف
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $user = User::findOrFail($id);

            $data = $request->validate([
                'name'     => 'required|string|max:255',
                'phone'    => 'required|string|unique:users,phone,' . $id, // التحقق من الرقم مع استثناء الموظف الحالي
                'email'    => 'required|email|unique:users,email,' . $id,
                'role'     => 'required|in:admin,reception,captain',
                'password' => 'nullable|min:6',
            ]);

            $updateData = [
                'name'  => $data['name'],
                'phone' => $data['phone'], // تحديث الرقم الحقيقي
                'email' => $data['email'],
                'role'  => $data['role'],
            ];

            if (!empty($data['password'])) {
                $updateData['password'] = Hash::make($data['password']);
            }

            $user->update($updateData);

            return response()->json(['message' => 'تم تحديث البيانات بنجاح', 'data' => $user]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        }
    }

    /**
     * حذف موظف
     */
    public function destroy($id): JsonResponse
    {
        $user = User::findOrFail($id);

        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'لا يمكنك حذف حسابك الحالي!'], 422);
        }

        $user->delete();

        AuditLogService::log('user.deleted', 'User', $id, $user->toArray(), []);

        return response()->json(['message' => 'تم حذف الموظف بنجاح']);
    }

    /**
     * جلب بيانات الموظف الحالي
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'data' => [
                'id'            => $user->id,
                'name'          => $user->name,
                'phone'         => $user->phone,
                'email'         => $user->email,
                'role'          => $user->role,
                'gender_access' => $user->gender_access,
                'permissions'   => $user->permissions,
                'is_active'     => $user->is_active,
                'last_login_at' => $user->last_login_at?->toDateTimeString(),
            ],
        ]);
    }

    /**
     * تسجيل الخروج
     */
    public function logout(Request $request): JsonResponse
    {
        AuditLogService::log('auth.logout', 'User', $request->user()->id, [], []);
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'تم تسجيل الخروج.']);
    }
}
