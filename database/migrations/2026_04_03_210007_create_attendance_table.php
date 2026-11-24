<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients');
            $table->foreignId('subscription_id')->constrained('client_subscriptions');
            $table->timestamp('check_in_at');
            $table->enum('type', ['qr', 'manual'])->default('qr');
            $table->string('class_type')->nullable();
            $table->unsignedInteger('sessions_before')->nullable();
            $table->unsignedInteger('sessions_after')->nullable();
            $table->foreignId('registered_by')->constrained('users');
            $table->text('notes')->nullable();
            $table->softDeletes();
            $table->timestamps();

            // Composite index — الأكثر استخداماً في الفلترة
            $table->index(['client_id', 'check_in_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance');
    }
};
