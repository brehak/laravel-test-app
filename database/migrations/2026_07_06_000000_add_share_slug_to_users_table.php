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
            // Public identifier for a user's read-only shareable collection page.
            // Nullable so sharing is opt-in — a slug is only minted when the user
            // enables sharing. Unique so a slug maps to exactly one user, and
            // indexed since the public route looks users up by it on every hit.
            $table->string('share_slug')->nullable()->unique()->after('email');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('share_slug');
        });
    }
};
