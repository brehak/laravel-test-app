<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ProfileController extends Controller
{
    /**
     * Permanently delete the authenticated user's own account.
     *
     * This action ALWAYS operates on the currently authenticated user
     * ($request->user()) and never on an id taken from the request — a user can
     * only ever delete their own account, never anyone else's.
     *
     * The current password must be supplied and match; the `current_password`
     * rule validates it against the authenticated user's stored hash and throws
     * a validation error (leaving the account untouched) if it doesn't match.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        // Log out first so the session is torn down BEFORE the record is gone,
        // avoiding an authenticated session pointing at a deleted user.
        Auth::logout();

        // Deleting the user cascades to their vinyls: the vinyls.user_id foreign
        // key is declared cascadeOnDelete(), so the database removes them too.
        $user->delete();

        // Fully invalidate the session and rotate the CSRF token.
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login')
            ->with('success', 'Your account has been permanently deleted.');
    }
}
