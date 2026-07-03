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
        Schema::table('vinyls', function (Blueprint $table) {
            // Existing records are part of the collection, so they default to owned.
            // owned = false marks a record as a wishlist item.
            $table->boolean('owned')->default(true)->after('notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vinyls', function (Blueprint $table) {
            $table->dropColumn('owned');
        });
    }
};
