<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['income', 'expense']);
            $table->string('category'); // subscription/private_session/salary/rent/maintenance/other
            $table->unsignedInteger('amount'); // قروش
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->foreignId('subscription_id')->nullable()->constrained('client_subscriptions')->nullOnDelete();
            $table->enum('payment_method', ['cash', 'card'])->default('cash');
            $table->foreignId('cashier_id')->constrained('users');
            $table->foreignId('shift_id')->nullable()->constrained('staff_shifts')->nullOnDelete();
            $table->string('receipt_url')->nullable();
            $table->text('notes')->nullable();
            // ⚠️ created_at فقط — لا updated_at — لا deleted_at
            $table->timestamp('created_at')->useCurrent();

            $table->index('cashier_id');
            $table->index('shift_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
