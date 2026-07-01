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
