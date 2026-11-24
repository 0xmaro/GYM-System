<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscription_types', function (Blueprint $table) {
            $table->unsignedBigInteger('session_price')->nullable()->after('price_6months');
            $table->unsignedInteger('max_freeze_days')->default(14)->after('duration_days');
        });
    }

    public function down(): void
    {
        Schema::table('subscription_types', function (Blueprint $table) {
            $table->dropColumn(['session_price', 'max_freeze_days']);
        });
    }
};
