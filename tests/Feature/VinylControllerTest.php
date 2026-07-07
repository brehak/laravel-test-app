<?php

use App\Models\User;
use App\Models\Vinyl;
use Inertia\Testing\AssertableInertia as Assert;

/*
|--------------------------------------------------------------------------
| VinylController — the authenticated, user-scoped collection.
|--------------------------------------------------------------------------
|
| These tests focus on the security-critical behaviour: every action must be
| scoped to the current user, ownership is enforced on writes, auth is
| required, and input is validated.
|
*/

// 1. Index shows the user's own vinyls and never another user's.
it('shows the authenticated user their own vinyls and not other users', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    $mine = Vinyl::factory()->for($user)->create(['title' => 'My Record']);
    $theirs = Vinyl::factory()->for($other)->create(['title' => 'Their Record']);

    $this->actingAs($user)
        ->get(route('vinyls.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Vinyls/Index')
            ->has('vinyls', 1)
            ->where('vinyls.0.id', $mine->id)
            ->where('vinyls.0.title', 'My Record')
        );
});

// 2. Creating a vinyl assigns it to the current user automatically.
it('creates a vinyl and assigns it to the current user', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('vinyls.store'), [
            'title' => 'Kind of Blue',
            'artist' => 'Miles Davis',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('vinyls', [
        'title' => 'Kind of Blue',
        'artist' => 'Miles Davis',
        'user_id' => $user->id,
        // Defaults into the owned collection when not specified.
        'owned' => true,
    ]);
});

// user_id from the request body must be ignored — ownership comes from auth.
it('ignores a user_id supplied in the request when creating', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    $this->actingAs($user)
        ->post(route('vinyls.store'), [
            'title' => 'Blue Train',
            'artist' => 'John Coltrane',
            'user_id' => $other->id,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('vinyls', [
        'title' => 'Blue Train',
        'user_id' => $user->id,
    ]);
    $this->assertDatabaseMissing('vinyls', [
        'title' => 'Blue Train',
        'user_id' => $other->id,
    ]);
});

// 3. A user can update their own vinyl.
it('lets a user update their own vinyl', function () {
    $user = User::factory()->create();
    $vinyl = Vinyl::factory()->for($user)->create(['title' => 'Old Title']);

    $this->actingAs($user)
        ->put(route('vinyls.update', $vinyl), [
            'title' => 'New Title',
            'artist' => 'New Artist',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('vinyls', [
        'id' => $vinyl->id,
        'title' => 'New Title',
        'artist' => 'New Artist',
    ]);
});

// 4. A user CANNOT update another user's vinyl.
it('forbids updating another users vinyl', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $vinyl = Vinyl::factory()->for($other)->create(['title' => 'Their Title']);

    $this->actingAs($user)
        ->put(route('vinyls.update', $vinyl), [
            'title' => 'Hacked Title',
            'artist' => 'Hacker',
        ])
        ->assertForbidden();

    // The record is untouched.
    $this->assertDatabaseHas('vinyls', [
        'id' => $vinyl->id,
        'title' => 'Their Title',
    ]);
});

// 5. A user can delete their own vinyl.
it('lets a user delete their own vinyl', function () {
    $user = User::factory()->create();
    $vinyl = Vinyl::factory()->for($user)->create();

    $this->actingAs($user)
        ->delete(route('vinyls.destroy', $vinyl))
        ->assertRedirect();

    $this->assertDatabaseMissing('vinyls', ['id' => $vinyl->id]);
});

// 6. A user CANNOT delete another user's vinyl.
it('forbids deleting another users vinyl', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $vinyl = Vinyl::factory()->for($other)->create();

    $this->actingAs($user)
        ->delete(route('vinyls.destroy', $vinyl))
        ->assertForbidden();

    // Still there.
    $this->assertDatabaseHas('vinyls', ['id' => $vinyl->id]);
});

// 7. A guest is redirected to login by the auth middleware.
it('redirects a guest to login from the vinyls index', function () {
    $this->get(route('vinyls.index'))
        ->assertRedirect(route('login'));
});

// 8. Validation: title and artist are required.
it('requires a title and artist when creating a vinyl', function () {
    $user = User::factory()->create();

    // Missing title.
    $this->actingAs($user)
        ->post(route('vinyls.store'), ['artist' => 'Some Artist'])
        ->assertSessionHasErrors('title');

    // Missing artist.
    $this->actingAs($user)
        ->post(route('vinyls.store'), ['title' => 'Some Title'])
        ->assertSessionHasErrors('artist');

    // Nothing was written.
    $this->assertDatabaseCount('vinyls', 0);
});
