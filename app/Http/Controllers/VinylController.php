<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreVinylRequest;
use App\Http\Requests\UpdateVinylRequest;
use App\Models\User;
use App\Models\Vinyl;
use Illuminate\Contracts\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VinylController extends Controller
{
    /** How many records per page the collection and wishlist grids show. */
    private const PER_PAGE = 24;

    /**
     * The sort modes the client may request, mapped to their meaning. Anything
     * outside this whitelist falls back to `recent` in {@see applySort()}.
     */
    private const SORTS = ['recent', 'title', 'artist', 'year_desc', 'year_asc', 'rating_desc'];

    /**
     * Display the authenticated user's vinyl collection: paginated and filtered
     * entirely in the database by search, sort, genre and condition — every
     * clause scoped to the current user. The collection page shows owned
     * records only; wishlist items live on their own page.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        [$vinyls, $state] = $this->filteredCollection($request, $user, owned: true);

        return Inertia::render('Vinyls/Index', [
            'vinyls' => $vinyls,
            ...$state,
            // The public link for this collection, or null when sharing hasn't
            // been enabled yet. Drives the "Share" control's two states.
            'shareUrl' => $user->share_slug ? route('collection.public', $user->share_slug) : null,
        ]);
    }

    /**
     * Display the authenticated user's wishlist — records they want but don't
     * yet own. Identical filtering/pagination to index(), only flipped to the
     * un-owned side of the collection (owned = false).
     */
    public function wishlist(Request $request): Response
    {
        [$vinyls, $state] = $this->filteredCollection($request, $request->user(), owned: false);

        return Inertia::render('Vinyls/Wishlist', [
            'vinyls' => $vinyls,
            ...$state,
        ]);
    }

    /**
     * Build the paginated, server-filtered record list for one side of a user's
     * collection (owned = true for the shelf, false for the wishlist). Search,
     * sort, genre and condition all compose in a single database query, every
     * clause scoped to the given user, and the paginator carries the active
     * query string so its page links preserve the filters.
     *
     * Returns the paginator plus the state the UI needs to stay in sync: the
     * echoed filter values, and the distinct genre/condition option lists drawn
     * from the user's ENTIRE matching set — not just the current page, or the
     * dropdowns would only ever offer options visible on page one.
     *
     * @return array{0: \Illuminate\Contracts\Pagination\LengthAwarePaginator, 1: array<string, mixed>}
     */
    private function filteredCollection(Request $request, User $user, bool $owned): array
    {
        $search = trim((string) $request->query('search', ''));
        $sort = (string) $request->query('sort', 'recent');
        $genre = trim((string) $request->query('genre', ''));
        $condition = trim((string) $request->query('condition', ''));

        // Base query: this user's records on the requested side of the owned
        // flag. Every filter and option list below narrows within this
        // relationship only — we never query outside the user's records.
        $base = fn () => $user->vinyls()->where('owned', $owned);

        $query = $base()
            ->when($search !== '', function (Builder $q) use ($search) {
                // Case-insensitive partial match on title OR artist. LOWER()
                // on both sides keeps it portable across DB drivers.
                $term = '%'.mb_strtolower($search).'%';

                $q->where(function (Builder $inner) use ($term) {
                    $inner->whereRaw('LOWER(title) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(artist) LIKE ?', [$term]);
                });
            })
            // genre is a JSON array column; match records whose array contains
            // the requested genre.
            ->when($genre !== '', fn (Builder $q) => $q->whereJsonContains('genre', $genre))
            ->when($condition !== '', fn (Builder $q) => $q->where('condition', $condition));

        $this->applySort($query, $sort);

        $vinyls = $query->paginate(self::PER_PAGE)->withQueryString();

        // Distinct condition grades present anywhere in this user's set.
        $conditions = $base()
            ->whereNotNull('condition')
            ->where('condition', '!=', '')
            ->distinct()
            ->orderBy('condition')
            ->pluck('condition')
            ->values();

        // genre is JSON, so hydrate the cast arrays and flatten them in memory
        // before de-duplicating — one distinct list across the whole set.
        $genres = $base()
            ->whereNotNull('genre')
            ->get(['genre'])
            ->pluck('genre')
            ->flatten()
            ->filter()
            ->unique()
            ->sort()
            ->values();

        return [$vinyls, [
            // Echo the active filters back so the toolbar can stay in sync.
            'search' => $search,
            'sort' => in_array($sort, self::SORTS, true) ? $sort : 'recent',
            'genre' => $genre !== '' ? $genre : null,
            'condition' => $condition !== '' ? $condition : null,
            // Full option lists for the filter dropdowns.
            'genres' => $genres,
            'conditions' => $conditions,
        ]];
    }

    /**
     * Apply one of the whitelisted sort modes to the query. Unknown modes fall
     * back to `recent` (most-recently-added first). Records missing the sort
     * key (no year, no rating) sink to the bottom rather than floating up.
     */
    private function applySort(Builder $query, string $sort): void
    {
        match ($sort) {
            'title' => $query->orderByRaw('LOWER(title) asc'),
            'artist' => $query->orderByRaw('LOWER(artist) asc'),
            // year is free text; CAST parses the leading number and sinks
            // unparseable/blank years (which cast to 0) to the bottom.
            'year_desc' => $query->orderByRaw('CAST(year AS INTEGER) desc'),
            'year_asc' => $query
                ->orderByRaw('CAST(year AS INTEGER) = 0 asc')
                ->orderByRaw('CAST(year AS INTEGER) asc'),
            'rating_desc' => $query
                ->orderByRaw('rating is null asc')
                ->orderBy('rating', 'desc'),
            default => $query->latest(),
        };
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
    public function store(StoreVinylRequest $request): RedirectResponse
    {
        $validated = $request->validated();

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
    public function update(UpdateVinylRequest $request, Vinyl $vinyl): RedirectResponse
    {
        // Ownership is enforced in UpdateVinylRequest::authorize(), which 403s
        // before we get here if the record doesn't belong to the current user.
        $vinyl->update($request->validated());

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
