<?php

use App\Models\User;
use App\Models\Vinyl;

test('preference() falls back to app-wide defaults when unset', function () {
    $user = User::factory()->create(['preferences' => null]);

    expect($user->preference('default_view'))->toBe('grid')
        ->and($user->preference('default_sort'))->toBe('recent')
        ->and($user->preference('unknown_key', 'fallback'))->toBe('fallback');
});

test('a user can save their own preferences', function () {
    $user = User::factory()->create(['preferences' => null]);

    $this->actingAs($user)
        ->patch('/settings/preferences', ['default_view' => 'list', 'default_sort' => 'title'])
        ->assertRedirect();

    $user->refresh();
    expect($user->preference('default_view'))->toBe('list')
        ->and($user->preference('default_sort'))->toBe('title');
});

test('saving preferences merges into the existing blob without clobbering other keys', function () {
    $user = User::factory()->create(['preferences' => ['some_other' => 'kept']]);

    $this->actingAs($user)->patch('/settings/preferences', [
        'default_view' => 'list',
        'default_sort' => 'artist',
    ]);

    expect($user->refresh()->preferences)->toMatchArray([
        'some_other' => 'kept',
        'default_view' => 'list',
        'default_sort' => 'artist',
    ]);
});

test('preferences are validated', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch('/settings/preferences', ['default_view' => 'carousel', 'default_sort' => 'bogus'])
        ->assertSessionHasErrors(['default_view', 'default_sort']);
});

test('a guest cannot update preferences', function () {
    $this->patch('/settings/preferences', ['default_view' => 'list', 'default_sort' => 'title'])
        ->assertRedirect('/login');
});

test('the collection loads sorted by the user default_sort when no sort is requested', function () {
    $user = User::factory()->create(['preferences' => ['default_sort' => 'title']]);
    Vinyl::factory()->for($user)->create(['title' => 'Zebra', 'owned' => true]);
    Vinyl::factory()->for($user)->create(['title' => 'Apple', 'owned' => true]);

    $this->actingAs($user)
        ->get('/vinyls')
        ->assertInertia(fn ($page) => $page
            // The server echoes the effective sort (from the preference)…
            ->where('sort', 'title')
            // …and the records come back title-ascending, not most-recent-first.
            ->where('vinyls.data.0.title', 'Apple')
            ->where('vinyls.data.1.title', 'Zebra'));
});

test('an explicit sort param overrides the user default_sort', function () {
    $user = User::factory()->create(['preferences' => ['default_sort' => 'title']]);

    $this->actingAs($user)
        ->get('/vinyls?sort=recent')
        ->assertInertia(fn ($page) => $page->where('sort', 'recent'));
});
