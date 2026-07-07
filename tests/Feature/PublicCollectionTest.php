<?php

use App\Models\User;
use App\Models\Vinyl;
use Inertia\Testing\AssertableInertia as Assert;

/*
|--------------------------------------------------------------------------
| Public shareable collection page (GET /share/{slug}).
|--------------------------------------------------------------------------
|
| This route lives OUTSIDE the auth group — anyone with the slug can view it.
| That makes it the security-sensitive surface of the app, so these tests pin
| down exactly what it does and does not expose.
|
*/

// 11. The public page is reachable without authentication.
it('serves the public collection page without authentication', function () {
    $user = User::factory()->create(['name' => 'Ada Lovelace']);
    $slug = $user->shareSlug();

    Vinyl::factory()->for($user)->create(['title' => 'Public Record']);

    // No actingAs — this is a guest request.
    $this->get(route('collection.public', $slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Public/Collection')
            ->where('owner.name', 'Ada Lovelace')
            ->has('vinyls', 1)
        );
});

// 12. An unknown slug returns 404 (and never reveals account existence).
it('returns 404 for an unknown slug', function () {
    $this->get(route('collection.public', 'does-not-exist'))
        ->assertNotFound();
});

// 13. The page exposes only public-safe data: no owner email, no other users.
it('does not leak the owner email or other users records', function () {
    $owner = User::factory()->create(['email' => 'owner-secret@example.com']);
    $slug = $owner->shareSlug();

    $ownRecord = Vinyl::factory()->for($owner)->create([
        'title' => 'Owner Record',
        'notes' => 'private-note-should-not-leak',
        'rating' => 5,
    ]);

    // A different user's record must never appear on this page.
    $other = User::factory()->create();
    Vinyl::factory()->for($other)->create(['title' => 'Other User Record']);

    $response = $this->get(route('collection.public', $slug))->assertOk();

    // The owner's email must not appear anywhere in the rendered response.
    $response->assertDontSee('owner-secret@example.com', false);
    // Private per-record fields are never serialized.
    $response->assertDontSee('private-note-should-not-leak', false);
    // Another user's record is absent.
    $response->assertDontSee('Other User Record', false);

    $response->assertInertia(fn (Assert $page) => $page
        // Only the owner's own record is present.
        ->has('vinyls', 1)
        ->where('vinyls.0.title', 'Owner Record')
        // owner prop carries the display name only — no email key at all.
        ->where('owner', ['name' => $owner->name])
        // The allow-listed public fields are present...
        ->has('vinyls.0.artist')
        ->has('vinyls.0.year')
        // ...while private fields are stripped from the payload.
        ->missing('vinyls.0.notes')
        ->missing('vinyls.0.rating')
        ->missing('vinyls.0.user_id')
    );
});

// 14. The page shows only the owner's owned records, not their wishlist.
it('shows only the owners owned records, not their wishlist', function () {
    $owner = User::factory()->create();
    $slug = $owner->shareSlug();

    $owned = Vinyl::factory()->for($owner)->create(['title' => 'On The Shelf']);
    Vinyl::factory()->for($owner)->wishlist()->create(['title' => 'Someday Wishlist']);

    $response = $this->get(route('collection.public', $slug))->assertOk();

    $response->assertDontSee('Someday Wishlist', false);

    $response->assertInertia(fn (Assert $page) => $page
        ->has('vinyls', 1)
        ->where('vinyls.0.id', $owned->id)
        ->where('vinyls.0.title', 'On The Shelf')
    );
});
