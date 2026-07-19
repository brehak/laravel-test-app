<?php

use App\Models\User;
use App\Models\Vinyl;

/*
|--------------------------------------------------------------------------
| Collection export — CSV / JSON download of the user's own records.
|--------------------------------------------------------------------------
*/

test('a user can export their collection as CSV', function () {
    $user = User::factory()->create();
    Vinyl::factory()->for($user)->create(['title' => 'Kind of Blue', 'artist' => 'Miles Davis']);

    $response = $this->actingAs($user)->get('/settings/data/export?format=csv');

    $response->assertOk();
    expect($response->headers->get('content-disposition'))->toContain('spinlist-collection.csv');

    $body = $response->streamedContent();
    expect($body)->toContain('title,artist,year')->toContain('Kind of Blue')->toContain('Miles Davis');
});

test('a user can export their collection as JSON', function () {
    $user = User::factory()->create();
    Vinyl::factory()->for($user)->create(['title' => 'Blue Train']);

    $this->actingAs($user)
        ->get('/settings/data/export?format=json')
        ->assertOk()
        ->assertJsonFragment(['title' => 'Blue Train']);
});

test('an unknown export format 404s', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get('/settings/data/export?format=xml')->assertNotFound();
});

test('the export is scoped to the current user', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    Vinyl::factory()->for($other)->create(['title' => 'Someone Elses Record']);

    $response = $this->actingAs($user)->get('/settings/data/export?format=csv');

    expect($response->streamedContent())->not->toContain('Someone Elses Record');
});

test('a guest cannot export', function () {
    $this->get('/settings/data/export?format=csv')->assertRedirect('/login');
});
