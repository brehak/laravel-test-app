<?php

use App\Models\User;

test('site root shows guests the branded welcome page', function () {
    $this->get('/')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('Welcome'));
});

test('site root redirects an authenticated user to their collection', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get('/')->assertRedirect('/vinyls');
});

test('login and register screens render', function () {
    $this->get('/login')->assertOk();
    $this->get('/register')->assertOk();
});

test('users can register and land on their collection', function () {
    $response = $this->post('/register', [
        'name' => 'Ada Lovelace',
        'email' => 'ada@example.test',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertRedirect('/vinyls');
    $this->assertAuthenticated();
    $this->assertDatabaseHas('users', ['email' => 'ada@example.test']);
});

test('dashboard and settings require auth', function () {
    $this->get('/dashboard')->assertRedirect('/login');
    $this->get('/settings/profile')->assertRedirect('/login');
});

test('authenticated user can view settings', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get('/settings/profile')->assertOk();
    $this->actingAs($user)->get('/settings/password')->assertOk();
});