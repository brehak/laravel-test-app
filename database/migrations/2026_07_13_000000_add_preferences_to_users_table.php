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
            // A flexible JSON blob for all per-user app preferences (default
            // collection view, default sort, and whatever we add later). Kept as
            // one column on purpose so new settings never need their own
            // migration — the shape is owned by the app, not the schema. Nullable
            // so existing users fall back to the app-wide defaults until they
            // save anything.
            $table->json('preferences')->nullable()->after('email');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('preferences');
        });
    }
};
