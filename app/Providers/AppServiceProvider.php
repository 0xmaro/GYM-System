<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

// Models
use App\Models\Client;
use App\Models\ClientSubscription;
use App\Models\Attendance;
use App\Models\Transaction;
use App\Models\StaffShift;

// Observers
use App\Observers\ClientObserver;
use App\Observers\ClientSubscriptionObserver;
use App\Observers\AttendanceObserver;
use App\Observers\TransactionObserver;
use App\Observers\StaffShiftObserver;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // 4A-1: تسجيل المراقبين (Observers)
        Client::observe(ClientObserver::class);
        ClientSubscription::observe(ClientSubscriptionObserver::class);
        Attendance::observe(AttendanceObserver::class);
        Transaction::observe(TransactionObserver::class);
        StaffShift::observe(StaffShiftObserver::class);

        // 3A-1: Rate Limiting Configuration
        RateLimiter::for('qr-scan', function (Request $request) {
            return Limit::perMinute(30)->by($request->ip());
        });

        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });
    }
}
