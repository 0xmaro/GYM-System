<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qr_cards', function (Blueprint $table) {
            $table->id();
            $table->string('qr_id', 20)->unique();
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->enum('status', ['available', 'distributed', 'lost', 'cancelled', 'damaged'])
                  ->default('available');
            $table->timestamp('issued_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->foreignId('replaced_by')->nullable()->constrained('qr_cards')->nullOnDelete();
            $table->string('replacement_reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qr_cards');
    }
};
