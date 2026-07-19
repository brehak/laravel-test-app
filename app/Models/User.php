<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

// `share_slug` is deliberately NOT fillable — it can never be mass-assigned from
// a request; it's minted server-side by shareSlug(). It's hidden so it never
// leaks through default model serialization.
#[Fillable(['name', 'public_name', 'email', 'password', 'preferences'])]
#[Hidden(['password', 'remember_token', 'share_slug'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * App-wide preference defaults, returned by {@see preference()} when a user
     * hasn't set their own value. This is the single source of truth for how a
     * fresh account behaves — add a new preference here and it has a sane
     * default everywhere, no schema change needed.
     *
     * @var array<string, mixed>
     */
    public const PREFERENCE_DEFAULTS = [
        'default_view' => 'grid',
        'default_sort' => 'recent',
        // How large the collection grid renders its cards, and thus how many fit
        // per row: 'compact' (small/dense), 'normal' (current), 'large' (roomy).
        'card_size' => 'normal',
        // Whether the spinning/sliding vinyl disc plays behind each card. Off is
        // for people who find the motion distracting.
        'disc_animation' => true,
        // Whether deleting a record asks for confirmation first. Off deletes on
        // the first click.
        'confirm_delete' => true,
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            // Stored as a JSON blob; hydrated to an associative array so
            // preferences read/write like plain PHP.
            'preferences' => 'array',
        ];
    }

    /**
     * Read a single app preference for this user, falling back to the app-wide
     * default (see {@see PREFERENCE_DEFAULTS}) and then to the caller's $default
     * when the key isn't a known preference. Dot-notation is supported for any
     * future nested preferences.
     */
    public function preference(string $key, mixed $default = null): mixed
    {
        return data_get($this->preferences, $key, self::PREFERENCE_DEFAULTS[$key] ?? $default);
    }

    /**
     * The vinyl records in this user's collection.
     *
     * @return HasMany<Vinyl, $this>
     */
    public function vinyls(): HasMany
    {
        return $this->hasMany(Vinyl::class);
    }

    /**
     * Return this user's public share slug, minting one on first use.
     *
     * The slug is the opaque public identifier for their read-only shareable
     * collection page (GET /share/{slug}). It's generated lazily — a user has no
     * slug until they enable sharing — and persisted so the same link is stable
     * across sessions. Calling this is idempotent: once a slug exists it's simply
     * returned.
     */
    public function shareSlug(): string
    {
        if (! $this->share_slug) {
            // forceFill because share_slug is guarded (not fillable) by design.
            $this->forceFill(['share_slug' => static::generateUniqueShareSlug()])->save();
        }

        return $this->share_slug;
    }

    /**
     * Generate a random slug that isn't already taken by another user. The token
     * is unguessable (so a collection can't be enumerated) and lower-cased for
     * clean, case-insensitive URLs.
     */
    protected static function generateUniqueShareSlug(): string
    {
        do {
            $slug = Str::lower(Str::random(12));
        } while (static::where('share_slug', $slug)->exists());

        return $slug;
    }
}
