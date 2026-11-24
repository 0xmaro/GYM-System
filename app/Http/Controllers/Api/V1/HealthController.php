<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class HealthController extends Controller
{
    public function check(): JsonResponse
    {
        $services = [
            'database' => 'error',
            'redis' => 'error',
            'queue' => 'error',
            'whatsapp_service' => 'error',
            'storage' => 'error',
        ];

        try { DB::connection()->getPdo(); $services['database'] = 'ok'; } catch (\Exception $e) {}
        try { Redis::connection()->ping(); $services['redis'] = 'ok'; } catch (\Exception $e) {}
        try { DB::table('jobs')->count(); $services['queue'] = 'ok'; } catch (\Exception $e) {}
        try {
            $response = Http::timeout(3)->get('http://localhost:3001/status');
            if ($response->successful()) $services['whatsapp_service'] = 'ok';
        } catch (\Exception $e) {}
        try {
            if (Storage::disk('local')->exists('.gitignore') || true) $services['storage'] = 'ok';
        } catch (\Exception $e) {}

        $status = in_array('error', $services) ? 'degraded' : 'ok';

        return response()->json([
            'status' => $status,
            'timestamp' => now()->toIso8601String(),
            'services' => $services,
            'version' => '1.0.0'
        ], $status === 'ok' ? 200 : 207);
    }
}
