<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\GymClass;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClassController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $query = GymClass::with('captain:id,name');

        if ($user->role === 'captain') {
            $query->where('captain_id', $user->id);
        }

        $classes = $query->get()->map(function ($c) {
            return [
                'id' => $c->id,
                'name' => $c->name,
                'type' => $c->type,
                'captain_id' => $c->captain_id,
                'captain_name' => $c->captain?->name ?? 'غير محدد',
                'schedule' => $c->schedule,
                'duration_minutes' => $c->duration_minutes ?? 60,
                'capacity' => $c->capacity ?? 20,
                'is_active' => (bool) $c->is_active,
                'total_attendances' => DB::table('attendance')
                    ->where('class_type', $c->name)
                    ->whereNull('deleted_at')
                    ->count(),
            ];
        });

        return response()->json($classes);
    }
public function today(Request $request): JsonResponse
{
    $date = $request->filled('date')
        ? \Carbon\Carbon::parse($request->date)
        : today();

    $dayName = strtolower($date->englishDayOfWeek);

    $classes = GymClass::with('captain:id,name')
        ->where('is_active', true)
        ->whereJsonContains('schedule->days', $dayName)
        ->get()
        ->map(fn($c) => [
            'id' => $c->id,
            'name' => $c->name,
            'type' => $c->type,
            'captain_name' => $c->captain?->name ?? 'غير محدد',
            'schedule' => $c->schedule,
            'time' => data_get($c->schedule, 'time'),
            'duration_minutes' => $c->duration_minutes ?? 60,
            'capacity' => $c->capacity ?? 20,
            'attendees_today' => DB::table('attendance')
                ->where('class_type', $c->name)
                ->whereDate('check_in_at', $date->toDateString())
                ->whereNull('deleted_at')
                ->count(),
        ]);

    return response()->json([
        'date' => $date->toDateString(),
        'day' => $date->locale('ar')->translatedFormat('l'),
        'count' => $classes->count(),
        'classes' => $classes,
    ]);
}
    public function attendees(Request $request, $id): JsonResponse
    {
        $gymClass = GymClass::findOrFail($id);

        $rows = DB::table('attendance')
            ->leftJoin('clients', 'attendance.client_id', '=', 'clients.id')
            ->where('attendance.class_type', $gymClass->name)
            ->whereDate('attendance.check_in_at', today())
            ->whereNull('attendance.deleted_at')
            ->orderByDesc('attendance.check_in_at')
            ->select([
                'attendance.id',
                'attendance.type',
                'attendance.check_in_at',
                'clients.name as client_name',
                'clients.phone as client_phone',
            ])
            ->get()
            ->map(fn($row) => [
                'id' => $row->id,
                'client_name' => $row->client_name ?? 'غير معروف',
                'client_phone' => $row->client_phone,
                'type' => $row->type,
                'check_in_time' => $row->check_in_at
                    ? \Carbon\Carbon::parse($row->check_in_at)->format('h:i A')
                    : null,
            ]);

        return response()->json([
            'class' => [
                'id' => $gymClass->id,
                'name' => $gymClass->name,
            ],
            'count' => $rows->count(),
            'data' => $rows,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:255',
            'captain_id' => 'required|exists:users,id',
            'schedule' => 'required|array',
            'schedule.days' => 'required|array|min:1',
            'schedule.days.*' => 'required|string',
            'schedule.time' => 'required|string',
            'duration_minutes' => 'nullable|integer|min:15|max:300',
            'capacity' => 'nullable|integer|min:1|max:500',
            'is_active' => 'nullable|boolean',
        ]);

        $gymClass = GymClass::create([
            'name' => $validated['name'],
            'type' => $validated['type'],
            'captain_id' => $validated['captain_id'],
            'schedule' => $validated['schedule'],
            'duration_minutes' => $validated['duration_minutes'] ?? 60,
            'capacity' => $validated['capacity'] ?? 20,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        AuditLogService::log('class.created', 'GymClass', $gymClass->id, [], $gymClass->toArray());

        return response()->json([
            'message' => 'تم إنشاء الحصة بنجاح',
            'data' => $gymClass
        ], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $gymClass = GymClass::findOrFail($id);
        $oldData = $gymClass->toArray();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'type' => 'sometimes|string|max:255',
            'captain_id' => 'sometimes|exists:users,id',
            'schedule' => 'sometimes|array',
            'schedule.days' => 'sometimes|array|min:1',
            'schedule.days.*' => 'required|string',
            'schedule.time' => 'sometimes|string',
            'duration_minutes' => 'sometimes|integer|min:15|max:300',
            'capacity' => 'sometimes|integer|min:1|max:500',
            'is_active' => 'sometimes|boolean',
        ]);

        $gymClass->update($validated);

        AuditLogService::log('class.updated', 'GymClass', $gymClass->id, $oldData, $gymClass->fresh()->toArray());

        return response()->json([
            'message' => 'تم التحديث بنجاح',
            'data' => $gymClass->fresh()
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $gymClass = GymClass::findOrFail($id);
        $oldData = $gymClass->toArray();

        $gymClass->delete();

        AuditLogService::log('class.deleted', 'GymClass', $id, $oldData, []);

        return response()->json(['message' => 'تم الحذف بنجاح']);
    }
}
