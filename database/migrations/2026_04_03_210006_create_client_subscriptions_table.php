<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('subscription_type_id')->constrained('subscription_types');
            $table->date('start_date');
            $table->date('end_date');
            $table->date('original_end_date'); // لا يتغير — مرجع للتجميد
            $table->unsignedInteger('sessions_remaining')->nullable(); // null = unlimited
            $table->unsignedInteger('amount_paid');         // قروش
            $table->unsignedInteger('discount_amount')->default(0); // قروش
            $table->string('discount_reason')->nullable();
            $table->foreignId('discount_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['active', 'frozen', 'expired'])->default('active');
            $table->timestamp('frozen_at')->nullable();
            $table->date('frozen_until')->nullable();
            $table->unsignedSmallInteger('freeze_days_count')->default(0);
            $table->string('freeze_reason')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->softDeletes();
            $table->timestamps();

            $table->index('status');
            $table->index('end_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_subscriptions');
    }
};
