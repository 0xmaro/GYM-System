<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // MODIFY COLUMN is MySQL-only. SQLite (used by the test suite) stores enums
    // as plain strings with a CHECK constraint, so skip it there.
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql' && DB::getDriverName() !== 'mariadb') {
            return;
        }

        DB::statement("ALTER TABLE attendance MODIFY COLUMN type ENUM('qr', 'manual', 'session') NOT NULL DEFAULT 'qr'");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql' && DB::getDriverName() !== 'mariadb') {
            return;
        }

        DB::statement("ALTER TABLE attendance MODIFY COLUMN type ENUM('qr', 'manual') NOT NULL DEFAULT 'qr'");
    }
};
