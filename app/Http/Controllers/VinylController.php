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
     * Display the authenticated user's vinyl collection.
     */
    public function index(): Response
    {
        return Inertia::render('Vinyls/Index', [
            'vinyls' => auth()->user()->vinyls()->latest()->get(),
        ]);
    }

    /**
     * Display aggregate statistics for the authenticated user's collection.
     */
    public function stats(): Response
    {
        // Scope to the current user, same as every other action here.
        $vinyls = auth()->user()->vinyls()->get();

        // Top artists: how many records per artist, most-collected first.
        $topArtists = $vinyls
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
        $byDecade = $vinyls
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
        $byGenre = $vinyls
            ->flatMap(fn ($vinyl) => $vinyl->genre ?? [])
            ->countBy()
            ->sortDesc()
            ->map(fn ($count, $genre) => ['genre' => $genre, 'count' => $count])
            ->values();

        return Inertia::render('Vinyls/Stats', [
            'totalRecords' => $vinyls->count(),
            'uniqueArtists' => $vinyls->pluck('artist')->unique()->count(),
            'topArtists' => $topArtists,
            'byDecade' => $byDecade,
            'byGenre' => $byGenre,
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
        ]);

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
}
