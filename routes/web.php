<?php

use App\Http\Controllers\VinylController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('Welcome'))->name('home');

Route::middleware('auth')->group(function () {
    Route::get('vinyls', [VinylController::class, 'index'])->name('vinyls.index');
    // Must be registered before vinyls/{vinyl} so "stats" isn't captured as an id.
    Route::get('vinyls/stats', [VinylController::class, 'stats'])->name('vinyls.stats');
    Route::post('vinyls', [VinylController::class, 'store'])->name('vinyls.store');
    Route::match(['put', 'patch'], 'vinyls/{vinyl}', [VinylController::class, 'update'])->name('vinyls.update');
    Route::delete('vinyls/{vinyl}', [VinylController::class, 'destroy'])->name('vinyls.destroy');
});

require __DIR__.'/auth.php';
