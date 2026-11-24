<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
    $table->id();
    $table->string('qr_id', 10)->unique();
    $table->string('name');                   // ← سطر منفصل تماماً
    $table->string('phone', 20)->unique();
    $table->tinyInteger('age')->unsigned()->nullable();
    $table->string('address')->nullable();
    $table->enum('gender', ['male', 'female']);
    $table->string('photo_url')->nullable();
    $table->enum('status', ['active', 'frozen', 'expired'])->default('active')->index();
    $table->text('notes')->nullable();
    $table->timestamp('last_visit_at')->nullable();
    $table->softDeletes();
    $table->timestamps();
});
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
