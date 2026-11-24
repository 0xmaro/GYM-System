<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_id')->constrained('users');
            $table->timestamp('start_time');
            $table->timestamp('end_time')->nullable();
            $table->unsignedInteger('opening_cash')->default(0);  // قروش
            $table->unsignedInteger('expected_cash')->default(0); // قروش
            $table->unsignedInteger('actual_cash')->nullable();   // قروش
            $table->integer('cash_difference')->nullable();        // قروش (ممكن سالب)
            $table->text('difference_note')->nullable();
            $table->unsignedSmallInteger('total_subscriptions')->default(0);
            $table->unsignedSmallInteger('total_sessions_registered')->default(0);
            $table->enum('status', ['open', 'closed'])->default('open');
            $table->foreignId('handover_to')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('status');
            $table->index('staff_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_shifts');
    }
};
