<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
// في الـ migration الجديد
public function up(): void
{
    Schema::table('subscription_types', function (Blueprint $table) {
        // ✅ أضف فقط اللي لسه مش موجود
        if (!Schema::hasColumn('subscription_types', 'label')) {
            $table->string('label', 100)->nullable()->after('name');
        }
        if (!Schema::hasColumn('subscription_types', 'price')) {
            $table->unsignedInteger('price')->default(0)->after('label');
        }
        if (!Schema::hasColumn('subscription_types', 'duration_type')) {
            $table->enum('duration_type', ['offer','monthly','quarterly','semiannual','yearly'])
                  ->default('monthly')->after('duration_days');
        }

        $table->unsignedInteger('price_monthly')->nullable()->default(null)->change();
        $table->unsignedInteger('price_3months')->nullable()->default(null)->change();
        $table->unsignedInteger('price_6months')->nullable()->default(null)->change();
    });
}

public function down(): void
{
    Schema::table('subscription_types', function (Blueprint $table) {
        $table->dropColumn(['label', 'price', 'duration_type']);
        $table->unsignedInteger('price_monthly')->nullable(false)->change();
        $table->unsignedInteger('price_3months')->nullable(false)->change();
        $table->unsignedInteger('price_6months')->nullable(false)->change();
    });
}
};
