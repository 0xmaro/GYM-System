<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
public function up(): void
{
    DB::statement("ALTER TABLE attendance MODIFY COLUMN type ENUM('qr', 'manual', 'session') NOT NULL DEFAULT 'qr'");
}

public function down(): void
{
    DB::statement("ALTER TABLE attendance MODIFY COLUMN type ENUM('qr', 'manual') NOT NULL DEFAULT 'qr'");
}
};
