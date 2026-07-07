<?php

use App\Http\Controllers\PublicCollectionController;
use App\Http\Controllers\VinylController;
use Illuminate\Support\Facades\Route;

// Site root always lands you somewhere useful: your collection when signed in,
// the login page otherwise — no need to type /vinyls by hand.
Route::get('/', function () {
    return auth()->check()
        ? redirect()->route('vinyls.index')
        : redirect()->route('login');
})->name('home');

// PUBLIC, read-only shareable collection page. Deliberately OUTSIDE the auth
// group — anyone with the slug can view it, no login required. The controller
// scopes everything to the one user the slug resolves to and exposes only safe,
// public fields.
Route::get('share/{slug}', [PublicCollectionController::class, 'show'])->name('collection.public');

Route::middleware('auth')->group(function () {
    Route::get('vinyls', [VinylController::class, 'index'])->name('vinyls.index');
    // Enable sharing for the current user (mints their slug) and return the URL.
    Route::post('vinyls/share', [PublicCollectionController::class, 'enable'])->name('collection.share');
    // Must be registered before vinyls/{vinyl} so "stats"/"wishlist" aren't captured as an id.
    Route::get('vinyls/stats', [VinylController::class, 'stats'])->name('vinyls.stats');
    Route::get('vinyls/wishlist', [VinylController::class, 'wishlist'])->name('vinyls.wishlist');
    Route::post('vinyls', [VinylController::class, 'store'])->name('vinyls.store');
    Route::match(['put', 'patch'], 'vinyls/{vinyl}', [VinylController::class, 'update'])->name('vinyls.update');
    Route::patch('vinyls/{vinyl}/toggle-owned', [VinylController::class, 'toggleOwned'])->name('vinyls.toggleOwned');
    Route::delete('vinyls/{vinyl}', [VinylController::class, 'destroy'])->name('vinyls.destroy');
});

require __DIR__.'/auth.php';
