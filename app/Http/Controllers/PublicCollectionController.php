<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Vinyl;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PublicCollectionController extends Controller
{
    /**
     * Show a single user's public, read-only collection, identified by their
     * opaque share slug. This route is intentionally NOT behind auth — anyone
     * with the link can view it — so it is the security-sensitive surface of
     * this feature. Two rules hold it safe:
     *
     *  1. Everything is scoped to the one user resolved from the slug. We only
     *     ever read through $user->vinyls(), so another user's records can't be
     *     reached, and a bad/unknown slug 404s (firstOrFail) rather than leaking.
     *  2. Only owned records, and only a hand-picked set of non-sensitive fields,
     *     are serialized. We build the payload explicitly (never `->get()` of the
     *     whole model) so private columns — rating, notes — and account data —
     *     email, the slug itself, timestamps — can never ride along.
     */
    public function show(string $slug): Response
    {
        // Unknown slug -> 404. Never reveals whether an account exists.
        $user = User::where('share_slug', $slug)->firstOrFail();

        $vinyls = $user->vinyls()
            ->where('owned', true) // Owned records only — wishlist items stay private.
            ->latest()
            ->get()
            // Explicit allow-list of safe, public fields. Anything not listed
            // here (email, rating, notes, user_id, timestamps) is dropped. `id`
            // is included only as a stable key for the grid; it exposes nothing
            // private and is never used to act on the record from this page.
            ->map(fn (Vinyl $vinyl) => [
                'id' => $vinyl->id,
                'title' => $vinyl->title,
                'artist' => $vinyl->artist,
                'image' => $vinyl->image,
                'genre' => $vinyl->genre,
                'year' => $vinyl->year,
                'condition' => $vinyl->condition,
                'color' => $vinyl->color,
            ]);

        return Inertia::render('Public/Collection', [
            // Only the display name — never the email or any other account field.
            'owner' => ['name' => $user->name],
            'vinyls' => $vinyls,
        ]);
    }

    /**
     * Enable sharing for the authenticated user and hand back their public URL.
     *
     * Mints the slug on first call (idempotent thereafter) and flashes the full
     * share URL so the collection page can reveal the copyable link. Scoped to
     * the current user — a request can only ever enable its own sharing.
     */
    public function enable(Request $request): RedirectResponse
    {
        $slug = $request->user()->shareSlug();

        return back()->with('shareUrl', route('collection.public', $slug));
    }
}
