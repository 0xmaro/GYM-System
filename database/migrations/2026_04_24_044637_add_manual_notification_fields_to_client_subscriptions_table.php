<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddManualNotificationFieldsToClientSubscriptionsTable extends Migration
{
    public function up(): void
    {
        Schema::table('client_subscriptions', function (Blueprint $table) {
            $table->timestamp('manual_notified_at')->nullable()->after('last_notified_at');
            $table->unsignedBigInteger('manual_notified_by')->nullable()->after('manual_notified_at');
        });
    }

    public function down(): void
    {
        Schema::table('client_subscriptions', function (Blueprint $table) {
            $table->dropColumn(['manual_notified_at', 'manual_notified_by']);
        });
    }
}
