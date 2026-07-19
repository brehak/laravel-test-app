<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Vinyl;
use App\Services\MilestoneService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RalphJSmit\Laravel\SEO\Support\SEOData;

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
     *
     * This renders a rich public PROFILE: an owner hero, showcase-worthy
     * aggregate numbers, the earned milestones this collector has unlocked, a
     * few featured records, and the full read-only grid. Everything below is
     * derived from the same $owned collection so we hit the database once.
     */
    public function show(string $slug, MilestoneService $milestones): Response
    {
        // Unknown slug -> 404. Never reveals whether an account exists.
        $user = User::where('share_slug', $slug)->firstOrFail();

        // The owner's public-facing display name: their opt-in public_name if set,
        // otherwise their account name. Never the email or any other account field.
        $displayName = $user->public_name ?: $user->name;

        // Pull the OWNED records once as full models. We aggregate over these in
        // memory — but only ever emit the public-safe projection built by
        // {@see toPublicArray()}; the full models never leave this method.
        $owned = $user->vinyls()
            ->where('owned', true) // Owned records only — wishlist items stay private.
            ->latest()
            ->get();

        // Public-safe grid: the same explicit allow-list as before.
        $vinyls = $owned->map(fn (Vinyl $vinyl) => $this->toPublicArray($vinyl))->values();

        // --- Showcase highlights (aggregate NUMBERS only) --------------------
        // Mirrors the stats-page aggregation, but publishes only counts — never
        // the underlying rows or any private figure. Numbers about a collection
        // reveal nothing sensitive about the person.
        $highlights = [
            'totalRecords' => $owned->count(),
            'uniqueArtists' => $owned->pluck('artist')->unique()->count(),
            'genreCount' => $owned->flatMap(fn (Vinyl $v) => $v->genre ?? [])->unique()->count(),
            'decadeCount' => $owned
                ->map(fn (Vinyl $v) => preg_match('/\d{4}/', (string) $v->year, $m)
                    ? intdiv((int) $m[0], 10) * 10
                    : null)
                ->filter(fn ($decade) => $decade !== null)
                ->unique()
                ->count(),
        ];

        // --- Earned milestones ----------------------------------------------
        // Reuse the exact same achievement logic as the owner's private page,
        // but publish ONLY the earned ones (an unearned milestone would leak
        // "how close" progress the public doesn't need). The milestone rows carry
        // no per-record or account data — just labels, icons and thresholds.
        $earnedMilestones = collect($milestones->fromCollection($owned)['milestones'])
            ->where('earned', true)
            ->values();

        // --- Featured records ------------------------------------------------
        // The collector's highlights: highest-rated first, falling back to most
        // recent when nothing is rated. Rating is used ONLY to order them here —
        // the numeric rating itself is deliberately NOT exposed (see
        // toPublicArray). A handful, shown as larger cards up top.
        $featured = $owned
            ->sortByDesc(fn (Vinyl $v) => $v->rating ?? 0)
            ->take(4)
            ->map(fn (Vinyl $vinyl) => $this->toPublicArray($vinyl))
            ->values();

        // Page-specific SEO so shared links (iMessage/Twitter/Discord) get a rich
        // preview. Built from public-safe data ONLY — the owner's display name, the
        // record count, and the newest record's cover art. No email, slug, or any
        // private field ever reaches these tags. Passed to the root Blade view via
        // ->withViewData (NOT as an Inertia prop), so `seo($seo)` in app.blade.php
        // receives the real SEOData object rather than a JSON-serialized copy.
        $count = $owned->count();
        $seo = new SEOData(
            title: "{$displayName}'s Vinyl Collection",
            description: "{$displayName}'s record collection on SpinList — {$count} records",
            // Newest record's cover art; falls back to config('seo.image.fallback').
            image: $vinyls->first()['image'] ?? null,
        );

        return Inertia::render('Public/Collection', [
            // Only the display name — never the email or any other account field.
            'owner' => ['name' => $displayName],
            'highlights' => $highlights,
            'milestones' => $earnedMilestones,
            'featured' => $featured,
            'vinyls' => $vinyls,
        ])->withViewData('seo', $seo);
    }

    /**
     * The single source of truth for which record fields are public-safe.
     *
     * Explicit allow-list: anything not listed here — rating, notes, user_id,
     * timestamps, the owned flag — is dropped. `id` is included only as a stable
     * key for the grid; it exposes nothing private and is never used to act on a
     * record from this page. Used for both the featured cards and the full grid
     * so the two can never drift apart on what they leak.
     *
     * @return array{id:int,title:string,artist:string,image:?string,genre:?array,year:?string,condition:?string,color:?string}
     */
    private function toPublicArray(Vinyl $vinyl): array
    {
        return [
            'id' => $vinyl->id,
            'title' => $vinyl->title,
            'artist' => $vinyl->artist,
            'image' => $vinyl->image,
            'genre' => $vinyl->genre,
            'year' => $vinyl->year,
            'condition' => $vinyl->condition,
            'color' => $vinyl->color,
        ];
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
