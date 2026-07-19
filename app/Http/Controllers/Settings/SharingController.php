<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SharingController extends Controller
{
    /**
     * Update the authenticated user's public profile settings.
     *
     * Currently just the public display name (`public_name`) — the opt-in name
     * shown on the shareable collection page. Scoped strictly to the current
     * user; there is no id in the request to target anyone else.
     *
     * A blank submission stores NULL rather than an empty string, so the public
     * page's `public_name ?: name` fallback kicks in and the account name shows.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'public_name' => ['nullable', 'string', 'max:255'],
        ]);

        $name = trim($validated['public_name'] ?? '');

        $request->user()->update([
            'public_name' => $name === '' ? null : $name,
        ]);

        return back()->with('success', 'Public profile updated.');
    }

    /**
     * Mint a fresh share slug for the current user, revoking the previous link.
     *
     * Flashes the new share URL (same shape as PublicCollectionController@enable)
     * so the settings page can reveal the updated copyable link.
     */
    public function regenerate(Request $request): RedirectResponse
    {
        $slug = $request->user()->regenerateShareSlug();

        return back()->with('shareUrl', route('collection.public', $slug));
    }

    /**
     * Turn sharing off: clear the slug so the public page 404s and the
     * collection is private again. Scoped to the current user only.
     */
    public function disable(Request $request): RedirectResponse
    {
        $request->user()->disableSharing();

        return back()->with('success', 'Sharing disabled.');
    }
}
