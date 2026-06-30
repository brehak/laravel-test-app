<?php

use App\Models\User;

test('welcome page loads', function () {
    $this->get('/')->assertOk();
});

test('login and register screens render', function () {
    $this->get('/login')->assertOk();
    $this->get('/register')->assertOk();
});

test('users can register and land on the dashboard', function () {
    $response = $this->post('/register', [
        'name' => 'Ada Lovelace',
        'email' => 'ada@example.test',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertRedirect('/dashboard');
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