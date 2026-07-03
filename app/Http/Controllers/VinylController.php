<?php

namespace App\Http\Controllers;

use App\Models\Vinyl;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VinylController extends Controller
{
    /**
     * Display the authenticated user's vinyl collection, optionally
     * filtered by a free-text search over title and artist.
     */
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));

        // Always scope to the current user's records; the search only ever
        // narrows within that relationship, never queries outside it. The
        // collection page shows owned records only — wishlist items live on
        // their own page.
        $vinyls = auth()->user()->vinyls()
            ->where('owned', true)
            ->when($search !== '', function ($query) use ($search) {
                // Case-insensitive partial match on title OR artist. LOWER()
                // on both sides keeps it portable across DB drivers.
                $term = '%'.mb_strtolower($search).'%';

                $query->where(function ($q) use ($term) {
                    $q->whereRaw('LOWER(title) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(artist) LIKE ?', [$term]);
                });
            })
            ->latest()
            ->get();

        return Inertia::render('Vinyls/Index', [
            'vinyls' => $vinyls,
            // Echo the current term back so the input can stay in sync.
            'search' => $search,
        ]);
    }

    /**
     * Display the authenticated user's wishlist — records they want but don't
     * yet own. Scoped to the current user, optionally filtered by a free-text
     * search over title and artist, exactly like index().
     */
    public function wishlist(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));

        // Always scope to the current user's records; the search only ever
        // narrows within that relationship. Mirrors index() but for wishlist
        // items (owned = false) instead of owned records.
        $vinyls = auth()->user()->vinyls()
            ->where('owned', false)
            ->when($search !== '', function ($query) use ($search) {
                // Case-insensitive partial match on title OR artist. LOWER()
                // on both sides keeps it portable across DB drivers.
                $term = '%'.mb_strtolower($search).'%';

                $query->where(function ($q) use ($term) {
                    $q->whereRaw('LOWER(title) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(artist) LIKE ?', [$term]);
                });
            })
            ->latest()
            ->get();

        return Inertia::render('Vinyls/Wishlist', [
            'vinyls' => $vinyls,
            // Echo the current term back so the input can stay in sync.
            'search' => $search,
        ]);
    }

    /**
     * Display aggregate statistics for the authenticated user's collection.
     */
    public function stats(): Response
    {
        // Everything on this page is scoped to the current user. Pull the whole
        // collection once, then split owned vs wishlist in memory rather than
        // issuing a separate query per aggregate. Every breakdown below is
        // computed over $owned only — we never look outside the user's records.
        $all = auth()->user()->vinyls()->get();

        $owned = $all->where('owned', true);

        // --- Collection totals -------------------------------------------
        $ownedCount = $owned->count();
        $wishlistCount = $all->where('owned', false)->count();

        // Condition grades from best to worst, so the condition chart reads in
        // a sensible order regardless of how the rows happen to be stored.
        $conditionOrder = ['Mint', 'Near Mint', 'VG+', 'VG', 'Good', 'Fair', 'Poor'];

        // Top artists: how many records per artist, most-collected first.
        $topArtists = $owned
            ->groupBy('artist')
            ->map(fn ($records, $artist) => [
                'artist' => $artist,
                'count' => $records->count(),
            ])
            ->sortByDesc('count')
            ->values()
            ->take(10);

        // Decade breakdown derived from the free-text `year` field. Anything
        // that doesn't parse to a 4-digit year is bucketed as "Unknown".
        $byDecade = $owned
            ->groupBy(function ($vinyl) {
                if (! preg_match('/\d{4}/', (string) $vinyl->year, $m)) {
                    return 'Unknown';
                }

                return (intdiv((int) $m[0], 10) * 10).'s';
            })
            ->map->count()
            // Sort chronologically; "Unknown" sinks to the end.
            ->sortKeysUsing(fn ($a, $b) => ($a === 'Unknown' ? PHP_INT_MAX : (int) $a)
                <=> ($b === 'Unknown' ? PHP_INT_MAX : (int) $b))
            ->map(fn ($count, $decade) => ['decade' => $decade, 'count' => $count])
            ->values();

        // Genre distribution: flatten every record's genre array and tally.
        $byGenre = $owned
            ->flatMap(fn ($vinyl) => $vinyl->genre ?? [])
            ->countBy()
            ->sortDesc()
            ->map(fn ($count, $genre) => ['genre' => $genre, 'count' => $count])
            ->values();

        // --- Ratings ------------------------------------------------------
        // Average is taken across rated records only; unrated ones would drag
        // it toward zero and misrepresent the collection.
        $rated = $owned->filter(fn ($vinyl) => $vinyl->rating !== null);
        $ratedCount = $rated->count();
        $averageRating = $ratedCount > 0 ? round($rated->avg('rating'), 1) : null;

        // Distribution across the five star levels. Every level is present even
        // at zero so the chart always renders a full 1–5 axis.
        $ratingCounts = $rated->countBy('rating');
        $byRating = collect(range(1, 5))
            ->map(fn ($star) => ['rating' => $star, 'count' => (int) $ratingCounts->get($star, 0)])
            ->values();

        // --- Condition breakdown -----------------------------------------
        // Count per grade, ordered best -> worst. Any unrecognised grade is
        // appended rather than silently dropped.
        $conditionCounts = $owned
            ->filter(fn ($vinyl) => filled($vinyl->condition))
            ->countBy('condition');
        $byCondition = collect($conditionOrder)
            ->filter(fn ($grade) => $conditionCounts->has($grade))
            ->map(fn ($grade) => ['condition' => $grade, 'count' => $conditionCounts->get($grade)])
            ->concat(
                $conditionCounts
                    ->reject(fn ($count, $grade) => in_array($grade, $conditionOrder, true))
                    ->map(fn ($count, $grade) => ['condition' => $grade, 'count' => $count])
                    ->values()
            )
            ->values();

        // --- Disc colour breakdown ---------------------------------------
        // Tally the physical pressing colour (a hex string) so the page can
        // show how colourful the shelf is. Blank colours are skipped.
        $byColor = $owned
            ->filter(fn ($vinyl) => filled($vinyl->color))
            ->countBy('color')
            ->sortDesc()
            ->map(fn ($count, $color) => ['color' => $color, 'count' => $count])
            ->values();

        // --- Headline single-tops ----------------------------------------
        $mostCommonGenre = data_get($byGenre->first(), 'genre');
        // Most-collected *real* decade for the headline card ("Unknown" is not
        // a decade, so it's excluded from the top pick).
        $topDecade = data_get(
            $byDecade->reject(fn ($d) => $d['decade'] === 'Unknown')->sortByDesc('count')->first(),
            'decade'
        );

        return Inertia::render('Vinyls/Stats', [
            'totalRecords' => $ownedCount,
            'wishlistCount' => $wishlistCount,
            'uniqueArtists' => $owned->pluck('artist')->unique()->count(),
            'averageRating' => $averageRating,
            'ratedCount' => $ratedCount,
            'unratedCount' => $ownedCount - $ratedCount,
            'mostCommonGenre' => $mostCommonGenre,
            'topDecade' => $topDecade,
            'topArtists' => $topArtists,
            'byDecade' => $byDecade,
            'byGenre' => $byGenre,
            'byCondition' => $byCondition,
            'byRating' => $byRating,
            'byColor' => $byColor,
        ]);
    }

    /**
     * Store a new vinyl in the authenticated user's collection.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'artist' => ['required', 'string', 'max:255'],
            'image' => ['nullable', 'string', 'url', 'max:2048'],
            'genre' => ['nullable', 'array'],
            'genre.*' => ['string', 'max:255'],
            'year' => ['nullable', 'string', 'max:255'],
            'condition' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:32'],
            'rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'notes' => ['nullable', 'string', 'max:2000'],
            // Optional so records can be added straight to the wishlist; when
            // omitted the record lands in the owned collection.
            'owned' => ['boolean'],
        ]);

        // Default to owned when the client doesn't specify.
        $validated['owned'] = $validated['owned'] ?? true;

        // Create through the relationship so user_id is set from the
        // authenticated user — it can never be supplied by the request.
        $request->user()->vinyls()->create($validated);

        return back();
    }

    /**
     * Update a vinyl that belongs to the authenticated user.
     */
    public function update(Request $request, Vinyl $vinyl): RedirectResponse
    {
        // Reject records that don't belong to the current user.
        abort_if($vinyl->user_id !== auth()->id(), 403);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'artist' => ['required', 'string', 'max:255'],
            'image' => ['nullable', 'string', 'url', 'max:2048'],
            'genre' => ['nullable', 'array'],
            'genre.*' => ['string', 'max:255'],
            'year' => ['nullable', 'string', 'max:255'],
            'condition' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:32'],
            'rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $vinyl->update($validated);

        return back();
    }

    /**
     * Remove a vinyl that belongs to the authenticated user.
     */
    public function destroy(Vinyl $vinyl): RedirectResponse
    {
        // Ensure the record belongs to the current user before deleting.
        abort_if($vinyl->user_id !== auth()->id(), 403);

        $vinyl->delete();

        return back();
    }

    /**
     * Move a record between the collection and the wishlist by flipping its
     * owned flag. Scoped to the current user, same guard as update/destroy.
     */
    public function toggleOwned(Vinyl $vinyl): RedirectResponse
    {
        // Ensure the record belongs to the current user before flipping.
        abort_if($vinyl->user_id !== auth()->id(), 403);

        $vinyl->update(['owned' => ! $vinyl->owned]);

        return back();
    }
}
