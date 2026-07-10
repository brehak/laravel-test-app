<?php

namespace App\Http\Requests\Concerns;

trait HasVinylRules
{
    /**
     * The validation rules shared by both creating and updating a vinyl.
     *
     * Store and update validate the same user-editable fields identically, so
     * the rules live here once and are pulled into each request's rules().
     * The `owned` flag is store-only (see StoreVinylRequest) and is layered on
     * there rather than baked into this shared set.
     *
     * @return array<string, array<int, string>>
     */
    protected function vinylRules(): array
    {
        return [
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
        ];
    }
}
