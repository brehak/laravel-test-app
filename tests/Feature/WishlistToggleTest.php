<?php

use App\Models\User;
use App\Models\Vinyl;
use Inertia\Testing\AssertableInertia as Assert;

/*
|--------------------------------------------------------------------------
| Wishlist / owned toggle.
|--------------------------------------------------------------------------
|
| The `owned` flag partitions a user's records into their collection
| (owned = true, shown on the index) and their wishlist (owned = false).
| Toggling is a user-scoped write and must enforce ownership like update/delete.
|
*/

// 9. Index shows only owned records; wishlist shows only un-owned records.
it('separates owned records on the index from wishlist records', function () {
    $user = User::factory()->create();

    $owned = Vinyl::factory()->for($user)->create(['title' => 'Owned One']);
    $wishlist = Vinyl::factory()->for($user)->wishlist()->create(['title' => 'Wishlist One']);

    // Index -> owned only.
    $this->actingAs($user)
        ->get(route('vinyls.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Vinyls/Index')
            ->has('vinyls', 1)
            ->where('vinyls.0.id', $owned->id)
        );

    // Wishlist -> un-owned only.
    $this->actingAs($user)
        ->get(route('vinyls.wishlist'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Vinyls/Wishlist')
            ->has('vinyls', 1)
            ->where('vinyls.0.id', $wishlist->id)
        );
});

// 10a. A user can toggle their own record between owned and wishlist.
it('lets a user toggle their own record between owned and wishlist', function () {
    $user = User::factory()->create();
    $vinyl = Vinyl::factory()->for($user)->create(['owned' => true]);

    $this->actingAs($user)
        ->patch(route('vinyls.toggleOwned', $vinyl))
        ->assertRedirect();

    // Flipped to wishlist.
    expect($vinyl->fresh()->owned)->toBeFalse();

    // Flip it back.
    $this->actingAs($user)
        ->patch(route('vinyls.toggleOwned', $vinyl))
        ->assertRedirect();

    expect($vinyl->fresh()->owned)->toBeTrue();
});

// 10b. A user cannot toggle another user's record.
it('forbids toggling another users record', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $vinyl = Vinyl::factory()->for($other)->create(['owned' => true]);

    $this->actingAs($user)
        ->patch(route('vinyls.toggleOwned', $vinyl))
        ->assertForbidden();

    // Unchanged.
    expect($vinyl->fresh()->owned)->toBeTrue();
});
