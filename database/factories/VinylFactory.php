<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Vinyl;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Vinyl>
 */
class VinylFactory extends Factory
{
    protected $model = Vinyl::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            // Belongs to a fresh user unless the caller supplies one (e.g. via
            // ->for($user) or ->create(['user_id' => ...])).
            'user_id' => User::factory(),
            'title' => fake()->sentence(3),
            'artist' => fake()->name(),
            'image' => fake()->imageUrl(),
            'genre' => fake()->randomElements(['Rock', 'Jazz', 'Pop', 'Soul', 'Funk'], 2),
            'year' => (string) fake()->year(),
            'condition' => fake()->randomElement(['Mint', 'Near Mint', 'VG+', 'VG', 'Good']),
            'color' => fake()->hexColor(),
            'rating' => fake()->numberBetween(1, 5),
            'notes' => fake()->sentence(),
            'owned' => true,
        ];
    }

    /**
     * A wishlist item — wanted but not yet owned.
     */
    public function wishlist(): static
    {
        return $this->state(fn (array $attributes) => [
            'owned' => false,
        ]);
    }
}
