<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Controllers\VinylController;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PreferencesController extends Controller
{
    /**
     * Persist the authenticated user's app preferences.
     *
     * Scoped strictly to $request->user(): a user can only ever change their own
     * preferences — there is no id in the request to target anyone else. Only the
     * known, validated keys are written, and they're merged into the existing
     * blob so unrelated preferences are never clobbered.
     *
     * `default_sort` is validated against {@see VinylController::SORTS}, the same
     * whitelist the collection query enforces, so a saved default can never be a
     * sort the grid won't honour.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'default_view' => ['required', Rule::in(['grid', 'list'])],
            'default_sort' => ['required', Rule::in(VinylController::SORTS)],
        ]);

        $user = $request->user();

        // Merge over whatever's already stored so we only touch the keys we
        // validated here and leave any other preferences intact.
        $user->update([
            'preferences' => [...($user->preferences ?? []), ...$validated],
        ]);

        return back()->with('success', 'Preferences saved.');
    }
}
