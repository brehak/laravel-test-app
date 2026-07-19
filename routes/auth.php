<?php

use App\Http\Controllers\Settings\DataController;
use App\Http\Controllers\Settings\PreferencesController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SharingController;
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

    // Settings is one tabbed area (see resources/js/layouts/SettingsLayout.tsx).
    // Each tab is its own deep-linkable route so the sub-nav is real navigation,
    // not client-only state. Bare /settings lands on the first tab.
    Route::redirect('settings', '/settings/account');

    // Account: name/email (Fortify), change password (Fortify), and the
    // password-confirmed account deletion (danger zone) — all on one page.
    Route::get('settings/account', fn () => Inertia::render('settings/Account'))->name('settings.account');
    Route::delete('settings/account', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // App preferences: the page seeds the form with the user's current values
    // (resolved through the model so unset preferences show the app-wide
    // defaults); the PATCH persists them.
    Route::get('settings/preferences', fn (Request $request) => Inertia::render('settings/Preferences', [
        'preferences' => [
            'default_view' => $request->user()->preference('default_view'),
            'default_sort' => $request->user()->preference('default_sort'),
            'card_size' => $request->user()->preference('card_size'),
            'disc_animation' => $request->user()->preference('disc_animation'),
            'confirm_delete' => $request->user()->preference('confirm_delete'),
        ],
    ]))->name('settings.preferences');
    Route::patch('settings/preferences', [PreferencesController::class, 'update'])->name('settings.preferences.update');

    // Sharing: the public collection link (enable lives at collection.share,
    // reused by the header quick-share popover) plus regenerate/disable and the
    // public display name. shareUrl mirrors VinylController's derivation.
    Route::get('settings/sharing', fn (Request $request) => Inertia::render('settings/Sharing', [
        'shareUrl' => $request->user()->share_slug
            ? route('collection.public', $request->user()->share_slug)
            : null,
        'publicName' => $request->user()->public_name,
        'accountName' => $request->user()->name,
    ]))->name('settings.sharing');
    Route::patch('settings/sharing', [SharingController::class, 'update'])->name('settings.sharing.update');
    Route::post('settings/sharing/regenerate', [SharingController::class, 'regenerate'])->name('settings.sharing.regenerate');
    Route::delete('settings/sharing', [SharingController::class, 'disable'])->name('settings.sharing.disable');

    // Data: export the whole collection as CSV or JSON.
    Route::get('settings/data', fn () => Inertia::render('settings/Data'))->name('settings.data');
    Route::get('settings/data/export', [DataController::class, 'export'])->name('settings.data.export');
});
