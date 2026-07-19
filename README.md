# SpinList

**A web app for cataloging and managing your personal vinyl record collection.**

## Overview

SpinList is a self-hosted collection manager for people who own records and want
a fast, good-looking way to keep track of them. Add albums by searching the
iTunes catalog (cover art, artist and release info fill themselves in), rate and
annotate what you own, keep a wishlist of what you're hunting for, and explore
your shelf through a stats dashboard, search, sorting and filtering. Every
collection is private by default, with an optional read-only link you can share
with anyone.

It's built as a single-user-per-account app: each user's records, wishlist,
preferences and share link are scoped entirely to their own account.

## Features

- **Authentication** — registration, login, and password reset powered by
  [Laravel Fortify](https://laravel.com/docs/fortify).
- **Collection grid** — album cards with cover art and animated spinning-disc
  artwork; switch between grid and list views.
- **iTunes-powered add flow** — search for an artist, pick an album from their
  discography, and the cover art, title, artist and release year autofill from
  the [iTunes Search API](https://performance-partners.apple.com/search-api)
  (no API key required).
- **Track listings with previews** — the detail view resolves the album's
  tracklist from iTunes and plays ~30-second audio previews inline.
- **Edit & delete** — update any field or remove a record; optional
  delete-confirmation you can turn off in preferences.
- **Ratings & personal notes** — a 1–5 star rating and free-text notes per
  record (kept private, never shown on shared pages).
- **Condition & disc color** — track each pressing's condition grade
  (Mint → Poor) and physical disc color.
- **Search, sort & filter** — server-side search across title and artist,
  sorting (recently added, title, artist, year, rating), and filtering by genre
  and condition.
- **Wishlist** — a separate list of records you want but don't own yet, with
  one-click **move to collection** (and back).
- **Stats dashboard** — charts (via `fancy-echarts`) for top artists, records by
  decade, genre distribution, rating breakdown, condition and disc-color
  breakdowns, plus headline totals.
- **Detail view** — a full-record modal with high-resolution artwork, metadata,
  rating, notes and the interactive tracklist.
- **Surprise Me** — pick a random record from your entire collection (chosen
  server-side, so it isn't limited to the current page) and open it.
- **Pagination** — the collection and wishlist grids paginate, preserving active
  filters across pages.
- **Dark / light theming** — a theme toggle that persists your choice.
- **Settings & app preferences** — profile and password management, plus app
  preferences for default view (grid/list), default sort, card size, disc
  animation, and delete confirmation.
- **Public shareable collection** — enable a stable, unguessable share link
  (`/share/{slug}`) that renders a read-only, SEO-friendly view of your owned
  records. Private fields (ratings, notes, email) are never exposed.
- **SEO meta tags** — OpenGraph/Twitter tags via `laravel-seo`, including
  rich-preview tags on shared collection links.
- **PWA support** — installable and offline-capable via `fancy-pwa`
  (service worker + web manifest).
- **Backend test suite** — feature tests (Pest) covering the collection,
  wishlist, preferences, public sharing and account deletion.

## Tech stack

| Layer      | Technology |
|------------|------------|
| Backend    | [Laravel](https://laravel.com) 13, PHP 8.3+ |
| Auth       | [Laravel Fortify](https://laravel.com/docs/fortify) 1.x |
| Frontend   | [Inertia](https://inertiajs.com) 3, React 19, TypeScript 6 |
| Styling    | Tailwind CSS 4 |
| Build      | Vite 8 |
| Database   | SQLite |
| Testing    | Pest 4 |

**Notable packages**

- `@particle-academy/react-fancy` — Fancy UI component suite
- `@particle-academy/fancy-inertia`, `@particle-academy/fancy-query`,
  `@particle-academy/fancy-screens` — Fancy Core client
- `@particle-academy/fancy-echarts` — charting for the stats dashboard
- `@particle-academy/fancy-pwa` — service worker + web manifest tooling
- `ralphjsmit/laravel-seo` — SEO / OpenGraph / Twitter meta tags
- `particle-academy/fancy-x-files` — `robots.txt` / crawler config

## Getting started

### Prerequisites

- PHP 8.3+
- [Composer](https://getcomposer.org)
- Node.js & npm

### Setup

```bash
# 1. Clone the repository
git clone <your-repo-url> spinlist
cd spinlist

# 2. Install PHP and JavaScript dependencies
composer install
npm install

# 3. Create your environment file and app key
cp .env.example .env
php artisan key:generate

# 4. Create the SQLite database and run migrations
touch database/database.sqlite
php artisan migrate

# 5. Build front-end assets
npm run build
```

> A `composer setup` script bundles steps 2–5 into a single command if you
> prefer.

### Running the app

```bash
composer run dev
```

This starts the PHP server, queue listener, log tailer (`pail`) and the Vite dev
server together. Open <http://localhost:8000>.

## Testing

Run the full test suite with:

```bash
php artisan test
```

Or via the Composer script (which clears config first):

```bash
composer test
```

## Project structure

```
app/
├── Http/Controllers/
│   ├── VinylController.php            # collection, wishlist, stats, surprise, CRUD
│   ├── PublicCollectionController.php  # read-only shared collection + share slug
│   └── Settings/                       # profile, password, preferences
├── Http/Requests/                      # vinyl validation (Form Requests)
├── Models/
│   ├── Vinyl.php                       # a record
│   └── User.php                        # accounts, preferences, share slug
└── Actions/Fortify/                    # Fortify auth actions

resources/js/
├── Pages/
│   ├── Vinyls/                         # collection, wishlist, stats, cards,
│   │                                   #   add/edit/detail modals, filters
│   ├── Public/Collection.tsx           # public shared collection view
│   ├── settings/                       # profile, password, preferences
│   └── auth/                           # login, register, password reset
├── layouts/                            # App, Auth and Settings layouts
├── services/itunes.ts                  # iTunes Search API integration
└── sw.ts                               # PWA service worker

routes/
├── web.php                             # collection, sharing, stats routes
└── auth.php                            # authenticated settings + account routes

database/migrations/                    # users, vinyls, preferences, share slug
tests/Feature/                          # collection, wishlist, sharing, prefs, account
```

## License

MIT.
