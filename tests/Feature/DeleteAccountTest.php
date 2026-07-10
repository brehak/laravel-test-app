<?php

use App\Models\User;
use App\Models\Vinyl;

/*
|--------------------------------------------------------------------------
| Account deletion — a user permanently deleting THEIR OWN account.
|--------------------------------------------------------------------------
|
| Covers the security-critical behaviour: the correct password is required,
| a wrong/missing password never deletes, and deleting a user cascades to
| their vinyls via the user_id foreign key (cascadeOnDelete).
|
*/

// (a) A user can delete their own account with the correct password.
it('lets a user delete their own account with the correct password', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->delete(route('profile.destroy'), ['password' => 'password'])
        ->assertRedirect(route('login'));

    // Record is gone and the session is no longer authenticated.
    $this->assertDatabaseMissing('users', ['id' => $user->id]);
    $this->assertGuest();
});

// (b1) Deletion fails with a WRONG password — account is untouched.
it('rejects deletion with a wrong password and keeps the account', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->from(route('settings.profile'))
        ->delete(route('profile.destroy'), ['password' => 'not-the-password'])
        ->assertRedirect(route('settings.profile'))
        ->assertSessionHasErrors('password');

    $this->assertDatabaseHas('users', ['id' => $user->id]);
    $this->assertAuthenticatedAs($user);
});

// (b2) Deletion fails with a MISSING password — account is untouched.
it('rejects deletion when no password is provided', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->from(route('settings.profile'))
        ->delete(route('profile.destroy'), [])
        ->assertRedirect(route('settings.profile'))
        ->assertSessionHasErrors('password');

    $this->assertDatabaseHas('users', ['id' => $user->id]);
    $this->assertAuthenticatedAs($user);
});

// (c) Deleting the account cascades: the user's vinyls are removed too.
it("removes the user's vinyls when the account is deleted", function () {
    $user = User::factory()->create();
    $vinyls = Vinyl::factory()->count(3)->for($user)->create();

    // A different user's vinyl must survive — deletion is scoped to the caller.
    $other = User::factory()->create();
    $otherVinyl = Vinyl::factory()->for($other)->create();

    $this->actingAs($user)
        ->delete(route('profile.destroy'), ['password' => 'password'])
        ->assertRedirect(route('login'));

    foreach ($vinyls as $vinyl) {
        $this->assertDatabaseMissing('vinyls', ['id' => $vinyl->id]);
    }

    // The other user and their vinyl are completely unaffected.
    $this->assertDatabaseHas('users', ['id' => $other->id]);
    $this->assertDatabaseHas('vinyls', ['id' => $otherVinyl->id]);
});

// Auth guard: an unauthenticated request cannot reach the endpoint at all.
it('requires authentication to delete an account', function () {
    $this->delete(route('profile.destroy'), ['password' => 'password'])
        ->assertRedirect(route('login'));
});
