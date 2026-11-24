<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone', 20)->unique();
            $table->string('email')->unique()->nullable();
            $table->string('password');
            $table->enum('role', ['admin', 'captain', 'reception'])->default('reception');
            $table->enum('gender_access', ['male', 'female', 'both'])->default('both');
            $table->json('permissions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->string('device_fingerprint')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->rememberToken();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
