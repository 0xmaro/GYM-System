<?php
// database/migrations/xxxx_create_whatsapp_templates_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('whatsapp_templates', function (Blueprint $table) {
            $table->id();
            $table->string('type')->unique(); // welcome, expiry_reminder, etc.
            $table->string('label');           // الاسم المعروض
            $table->text('body');              // نص الرسالة مع variables {{name}}
            $table->boolean('enabled')->default(true);
            $table->integer('send_days_before')->nullable(); // للتذكيرات
            $table->timestamps();
        });
    }

    public function down(): void { Schema::dropIfExists('whatsapp_templates'); }
};
