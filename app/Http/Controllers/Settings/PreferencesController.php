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
     * sort the grid won't honour. `card_size` is likewise pinned to its allowed
     * set, and the two toggles are coerced to real booleans.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'default_view' => ['required', Rule::in(['grid', 'list'])],
            'default_sort' => ['required', Rule::in(VinylController::SORTS)],
            // The three newer preferences are optional on the wire so a partial
            // save (e.g. only the view/sort pair) merges cleanly instead of 422ing
            // on the keys it didn't send. The full settings form always posts all
            // five; anything omitted simply keeps its existing stored value.
            'card_size' => ['sometimes', Rule::in(['compact', 'normal', 'large'])],
            'disc_animation' => ['sometimes', 'boolean'],
            'confirm_delete' => ['sometimes', 'boolean'],
        ]);

        // Normalise the toggles to real booleans (validation accepts "1"/"0"
        // etc.) so they persist as clean JSON true/false, not stringy truthy —
        // but only for the keys actually present in this request.
        foreach (['disc_animation', 'confirm_delete'] as $toggle) {
            if ($request->has($toggle)) {
                $validated[$toggle] = $request->boolean($toggle);
            }
        }

        $user = $request->user();

        // Merge over whatever's already stored so we only touch the keys we
        // validated here and leave any other preferences intact.
        $user->update([
            'preferences' => [...($user->preferences ?? []), ...$validated],
        ]);

        return back()->with('success', 'Preferences saved.');
    }
}
