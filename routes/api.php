<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\ManualSubscriptionNotificationController;
use App\Http\Controllers\Api\V1\AttendanceController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\ClassController;
use App\Http\Controllers\Api\V1\ClientController;
use App\Http\Controllers\Api\V1\ClientProfileController;
use App\Http\Controllers\Api\V1\ClientSessionController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\DebtController;
use App\Http\Controllers\Api\V1\DiscountRequestController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\QrCardController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\SessionTypeController;
use App\Http\Controllers\Api\V1\SettingController;
use App\Http\Controllers\Api\V1\ShiftController;
use App\Http\Controllers\Api\V1\SubscriptionController;
use App\Http\Controllers\Api\V1\SubscriptionTypeController;
use App\Http\Controllers\Api\V1\TransactionController;
use App\Http\Controllers\Api\V1\WhatsAppController;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {
    Route::get('/health', [HealthController::class, 'check']);
    Route::post('/whatsapp/callback', [WhatsAppController::class, 'callback']);
});

/*
|--------------------------------------------------------------------------
| Auth Routes
|--------------------------------------------------------------------------
*/

Route::prefix('v1/auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

/*
|--------------------------------------------------------------------------
| Protected API v1
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    /*
    |--------------------------------------------------------------------------
    | Dashboard
    |--------------------------------------------------------------------------
    */
    Route::get('/dashboard', [DashboardController::class, 'index']);

    /*
    |--------------------------------------------------------------------------
    | Users
    |--------------------------------------------------------------------------
    */
    Route::apiResource('users', AuthController::class)->middleware('role:admin');

    /*
    |--------------------------------------------------------------------------
    | Clients
    |--------------------------------------------------------------------------
    */
    Route::apiResource('clients', ClientController::class);
    Route::post('/clients/{client}/freeze', [ClientController::class, 'freeze']);
    Route::post('/clients/{client}/unfreeze', [ClientController::class, 'unfreeze']);
    Route::get('/clients/{client}/profile', [ClientProfileController::class, 'show']);
    Route::get('/clients/{client}/subscriptions/{subscription}/contract', [ClientProfileController::class, 'subscriptionContract']);
Route::post('/subscriptions/{subscription}/manual-reminder', [AttendanceController::class, 'manualReminder']);
    /*
    |--------------------------------------------------------------------------
    | QR Cards
    |--------------------------------------------------------------------------
    */
Route::prefix('qr-cards')->group(function () {
    Route::get('/check', [QrCardController::class, 'check']);
    Route::get('/print-batch', [QrCardController::class, 'printBatch']);

    Route::get('/', [QrCardController::class, 'index']);
    Route::post('/', [QrCardController::class, 'store']);
    Route::post('/assign', [QrCardController::class, 'assign']);

    Route::post('/{qrCard}/replace', [QrCardController::class, 'replace']);
    Route::post('/{qrCard}/return', [QrCardController::class, 'returnCard']);
    Route::post('/{qrCard}/restore', [QrCardController::class, 'restore']);
    Route::delete('/{qrCard}', [QrCardController::class, 'destroy']);
});

    /*
    |--------------------------------------------------------------------------
    | Subscriptions
    |--------------------------------------------------------------------------
    */
    Route::post('/subscriptions', [SubscriptionController::class, 'store']);
    Route::post('/subscriptions/{subscription}/renew', [SubscriptionController::class, 'renew']);
    Route::apiResource('subscription-types', SubscriptionTypeController::class);
Route::put('/subscriptions/{subscription}', [SubscriptionController::class, 'update']);
    /*
    |--------------------------------------------------------------------------
    | Discount Requests
    |--------------------------------------------------------------------------
    */
    Route::prefix('discount-requests')->group(function () {
        Route::get('/', [DiscountRequestController::class, 'index']);
        Route::post('/', [DiscountRequestController::class, 'store']);
        Route::post('/{discountRequest}/approve', [DiscountRequestController::class, 'approve'])
            ->middleware('role:admin');
        Route::post('/{discountRequest}/reject', [DiscountRequestController::class, 'reject'])
            ->middleware('role:admin');
    });

    /*
    |--------------------------------------------------------------------------
    | Audit Logs
    |--------------------------------------------------------------------------
    */
    Route::middleware('role:admin')->prefix('audit-logs')->group(function () {
        Route::get('/', [AuditLogController::class, 'index']);
        Route::get('/stats', [AuditLogController::class, 'stats']);
        Route::get('/export', [AuditLogController::class, 'export']);
        Route::get('/{auditLog}', [AuditLogController::class, 'show']);
    });

    /*
    |--------------------------------------------------------------------------
    | Attendance
    |--------------------------------------------------------------------------
    */
Route::prefix('attendance')->group(function () {
    Route::post('/qr-scan', [AttendanceController::class, 'qrScan']);
    Route::post('/manual', [AttendanceController::class, 'manual']);
    Route::post('/session-check-in', [AttendanceController::class, 'sessionCheckIn']);
    Route::post('/session-package-check-in', [AttendanceController::class, 'sessionPackageCheckIn']);
    Route::get('/today', [AttendanceController::class, 'today']);
});

    /*
    |--------------------------------------------------------------------------
    | Session Types / Client Sessions
    |--------------------------------------------------------------------------
    */
    Route::apiResource('session-types', SessionTypeController::class)->except(['show']);
    Route::apiResource('client-sessions', ClientSessionController::class)->only(['index', 'store', 'show']);

    /*
    |--------------------------------------------------------------------------
    | Transactions
    |--------------------------------------------------------------------------
    */
    Route::prefix('transactions')->group(function () {
        Route::get('/', [TransactionController::class, 'index']);
        Route::post('/income', [TransactionController::class, 'income']);
        Route::get('/summary', [TransactionController::class, 'summary']);
        Route::post('/expense', [TransactionController::class, 'expense'])
            ->middleware('role:admin');
    });

    /*
    |--------------------------------------------------------------------------
    | Shifts
    |--------------------------------------------------------------------------
    */
    Route::prefix('shifts')->group(function () {
        Route::post('/open', [ShiftController::class, 'open']);
        Route::get('/current', [ShiftController::class, 'current']);
        Route::post('/{shift}/close', [ShiftController::class, 'close']);
        Route::post('/{shift}/handover', [ShiftController::class, 'handover']);
        Route::get('/{shift}/report', [ShiftController::class, 'report']);
    });

    /*
    |--------------------------------------------------------------------------
    | Debts
    |--------------------------------------------------------------------------
    */
    Route::prefix('debts')->group(function () {
        Route::get('/stats', [DebtController::class, 'stats']);
        Route::get('/', [DebtController::class, 'index']);
        Route::post('/', [DebtController::class, 'store'])->middleware('role:admin');
        Route::post('/{debt}/mark-paid', [DebtController::class, 'markPaid']);
        Route::post('/{debt}/notify', [DebtController::class, 'notify']);
    });

    /*
    |--------------------------------------------------------------------------
    | Reports
    |--------------------------------------------------------------------------
    */
    Route::middleware('role:admin')->prefix('reports')->group(function () {
        Route::get('/stats', [ReportController::class, 'stats']);
        Route::get('/attendance', [ReportController::class, 'attendance']);
        Route::get('/financial', [ReportController::class, 'financial']);
    });

    /*
    |--------------------------------------------------------------------------
    | Notifications
    |--------------------------------------------------------------------------
    */
    Route::prefix('notifications')->group(function () {
        Route::get('/pending', [NotificationController::class, 'pendingAll']);
        Route::post('/send-reminder/{id}', [NotificationController::class, 'sendReminder']);
        Route::post('/send-bulk', [NotificationController::class, 'sendBulk']);
    });

    /*
    |--------------------------------------------------------------------------
    | Settings
    |--------------------------------------------------------------------------
    */
    Route::get('/settings', [SettingController::class, 'index']);
    Route::put('/settings', [SettingController::class, 'update'])->middleware('role:admin');

    /*
    |--------------------------------------------------------------------------
    | Classes
    |--------------------------------------------------------------------------
    */
    Route::get('/classes/today', [ClassController::class, 'today']);
    Route::get('/classes/{id}/attendees', [ClassController::class, 'attendees']);
    Route::apiResource('classes', ClassController::class);

    /*
    |--------------------------------------------------------------------------
    | Manual Subscription Notifications
    |--------------------------------------------------------------------------
    */
    Route::prefix('manual-subscription-notifications')->group(function () {
        Route::get('/', [ManualSubscriptionNotificationController::class, 'index']);
        Route::post('/{subscription}/mark-as-sent', [ManualSubscriptionNotificationController::class, 'markAsSent']);
    });

    /*
    |--------------------------------------------------------------------------
    | WhatsApp
    |--------------------------------------------------------------------------
    */
    Route::middleware('role:admin')->prefix('whatsapp')->group(function () {
        Route::get('/status', [WhatsAppController::class, 'status']);
        Route::get('/qr', [WhatsAppController::class, 'qr']);
        Route::get('/stats', [WhatsAppController::class, 'stats']);

        Route::post('/start', [WhatsAppController::class, 'start']);
        Route::post('/stop', [WhatsAppController::class, 'stop']);
        Route::post('/reconnect', [WhatsAppController::class, 'reconnect']);
        Route::post('/logout', [WhatsAppController::class, 'logout']);
        Route::post('/send-test', [WhatsAppController::class, 'sendTest']);

        Route::get('/incoming-messages', [WhatsAppController::class, 'incomingMessages']);
        Route::post('/incoming-messages/{messageId}/read', [WhatsAppController::class, 'markIncomingRead']);
        Route::delete('/incoming-messages', [WhatsAppController::class, 'clearIncomingMessages']);

        Route::get('/failed-messages', [WhatsAppController::class, 'failedMessages']);
        Route::get('/pending-messages', [WhatsAppController::class, 'pendingMessages']);
        Route::post('/send-pending', [WhatsAppController::class, 'sendPending']);

        Route::get('/logs', [WhatsAppController::class, 'logs']);
        Route::post('/logs/{log}/retry', [WhatsAppController::class, 'retryLog']);

        Route::get('/templates', [WhatsAppController::class, 'templates']);
        Route::put('/templates/{template}', [WhatsAppController::class, 'updateTemplate']);

        Route::get('/campaigns', [WhatsAppController::class, 'campaigns']);
        Route::post('/campaigns/preview', [WhatsAppController::class, 'previewCampaign']);
        Route::post('/campaigns', [WhatsAppController::class, 'storeCampaign']);
        Route::post('/campaigns/{campaign}/launch', [WhatsAppController::class, 'launchCampaign']);
    });
});
