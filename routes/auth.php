<?php

use App\Http\Controllers\Settings\PreferencesController;
use App\Http\Controllers\Settings\ProfileController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Authenticated routes
|--------------------------------------------------------------------------
|
| Login / register / password-reset routes are provided by Laravel Fortify
| (see app/Providers/FortifyServiceProvider.php + config/fortify.php). The
| routes below are the app's own authenticated surfaces.
|
*/

Route::middleware('auth')->group(function () {
    Route::get('dashboard', fn () => Inertia::render('Dashboard'))->name('dashboard');

    Route::redirect('settings', '/settings/profile');
    Route::get('settings/profile', fn () => Inertia::render('settings/Profile'))->name('settings.profile');
    Route::get('settings/password', fn () => Inertia::render('settings/Password'))->name('settings.password');

    // App preferences: default collection view + default sort. The page seeds
    // the form with the user's current values (resolved through the model so
    // unset preferences show the app-wide defaults); the PATCH persists them.
    Route::get('settings/preferences', fn (Request $request) => Inertia::render('settings/Preferences', [
        'preferences' => [
            'default_view' => $request->user()->preference('default_view'),
            'default_sort' => $request->user()->preference('default_sort'),
        ],
    ]))->name('settings.preferences');
    Route::patch('settings/preferences', [PreferencesController::class, 'update'])->name('settings.preferences.update');

    // Permanently delete the current user's own account (password-confirmed).
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});
