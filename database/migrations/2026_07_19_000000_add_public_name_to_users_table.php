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
        Schema::table('users', function (Blueprint $table) {
            // Optional public-facing display name shown on the shareable profile
            // page (GET /share/{slug}) INSTEAD of the account name. Nullable and
            // opt-in — when it's null the profile falls back to `name`, so the
            // feature works with no migration data. Kept separate from `name` so
            // a collector can present a handle publicly without changing the name
            // used across their private account.
            $table->string('public_name')->nullable()->after('name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('public_name');
        });
    }
};
