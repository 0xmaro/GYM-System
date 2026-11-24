<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('classes', function (Blueprint $table) {
            $table->unsignedSmallInteger('duration_minutes')->default(60)->after('schedule');
            $table->unsignedSmallInteger('capacity')->default(20)->after('duration_minutes');
        });
    }

    public function down(): void
    {
        Schema::table('classes', function (Blueprint $table) {
            $table->dropColumn(['duration_minutes', 'capacity']);
        });
    }
};
