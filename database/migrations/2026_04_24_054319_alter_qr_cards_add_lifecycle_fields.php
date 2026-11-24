<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('qr_cards', function (Blueprint $table) {
            $table->foreignId('last_client_id')
                ->nullable()
                ->after('client_id')
                ->constrained('clients')
                ->nullOnDelete();

            $table->timestamp('returned_at')->nullable()->after('issued_at');
            $table->timestamp('lost_at')->nullable()->after('returned_at');
            $table->timestamp('damaged_at')->nullable()->after('lost_at');
            $table->text('notes')->nullable()->after('replacement_reason');
        });
    }

    public function down(): void
    {
        Schema::table('qr_cards', function (Blueprint $table) {
            $table->dropConstrainedForeignId('last_client_id');
            $table->dropColumn([
                'returned_at',
                'lost_at',
                'damaged_at',
                'notes',
            ]);
        });
    }
};
