<?php

use App\Models\User;

/*
|--------------------------------------------------------------------------
| Sharing settings — public display name + share-link lifecycle.
|--------------------------------------------------------------------------
*/

test('a user can set their public display name', function () {
    $user = User::factory()->create(['public_name' => null]);

    $this->actingAs($user)
        ->patch('/settings/sharing', ['public_name' => 'DJ Wax'])
        ->assertRedirect();

    expect($user->refresh()->public_name)->toBe('DJ Wax');
});

test('a blank public name is stored as null so the account name is used', function () {
    $user = User::factory()->create(['public_name' => 'Old Name']);

    $this->actingAs($user)->patch('/settings/sharing', ['public_name' => '   ']);

    expect($user->refresh()->public_name)->toBeNull();
});

test('the public name is length-validated', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch('/settings/sharing', ['public_name' => str_repeat('a', 256)])
        ->assertSessionHasErrors('public_name');
});

test('regenerating the share link replaces the old slug', function () {
    $user = User::factory()->create();
    $original = $user->shareSlug();

    $this->actingAs($user)->post('/settings/sharing/regenerate')->assertRedirect();

    expect($user->refresh()->share_slug)->not->toBe($original)->not->toBeNull();
});

test('disabling sharing clears the slug', function () {
    $user = User::factory()->create();
    $user->shareSlug();

    $this->actingAs($user)->delete('/settings/sharing')->assertRedirect();

    expect($user->refresh()->share_slug)->toBeNull();
});

test('a guest cannot change sharing settings', function () {
    $this->patch('/settings/sharing', ['public_name' => 'x'])->assertRedirect('/login');
});
