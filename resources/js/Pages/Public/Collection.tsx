import { Head, Link } from '@inertiajs/react';
import { Button, Card, Heading, Icon, Text } from '@particle-academy/react-fancy';
import { useEffect, useMemo, useState } from 'react';
import { FilterBar, RecordIllustration, useVinylFilters, type Vinyl } from '@/Pages/Vinyls/filters';
import { VinylCard } from '@/Pages/Vinyls/VinylCard';

/**
 * The exact set of fields the public endpoint sends per record — a safe subset
 * of the full model. No rating, notes, email, or ownership plumbing ever reaches
 * this page; see PublicCollectionController@show.
 */
type PublicVinyl = {
    id: number;
    title: string;
    artist: string;
    image: string | null;
    genre: string[] | null;
    year: string | null;
    condition: string | null;
    color: string | null;
};

/** Aggregate, showcase-worthy numbers — counts only, nothing per-record. */
type Highlights = {
    totalRecords: number;
    uniqueArtists: number;
    genreCount: number;
    decadeCount: number;
};

/**
 * An earned achievement, as computed by App\Services\MilestoneService. The
 * public page only ever receives the EARNED ones, so there's no progress bar
 * here — just the badge itself.
 */
type Milestone = {
    id: string;
    category: string;
    icon: string;
    label: string;
    description: string;
};

type Props = {
    owner: { name: string };
    highlights: Highlights;
    milestones: Milestone[];
    featured: PublicVinyl[];
    vinyls: PublicVinyl[];
};

/**
 * Minimal sun/moon toggle for the public page. The public shell has no
 * AppLayout, so it carries its own copy of the same `.dark`-class + localStorage
 * logic the app uses, keeping the warm/dark aesthetic controllable for visitors.
 */
function ThemeToggle() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'));
    }, []);

    const toggle = () => {
        const root = document.documentElement;
        const next = !root.classList.contains('dark');
        root.classList.toggle('dark', next);
        try {
            localStorage.setItem('fancy.theme', next ? 'dark' : 'light');
        } catch {
            /* localStorage may be unavailable — the toggle still works for the session. */
        }
        setIsDark(next);
    };

    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-amber-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-amber-400"
        >
            <Icon name={isDark ? 'sun' : 'moon'} size="sm" />
        </button>
    );
}

/** First letters of the first and last word of a name — the hero monogram. */
function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
}

/** One showcase number in the hero — big amber figure over a muted label. */
function HighlightStat({ value, label }: { value: number; label: string }) {
    return (
        <div className="flex flex-col">
            <span className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50 sm:text-3xl">
                {value.toLocaleString()}
            </span>
            <Text as="span" size="xs" color="muted" className="uppercase tracking-wide">
                {label}
            </Text>
        </div>
    );
}

/**
 * A single earned milestone badge. Celebratory by design — warm amber gradient
 * fill, a soft glow and a check — since every badge shown here is unlocked.
 */
function MilestoneBadge({ milestone }: { milestone: Milestone }) {
    return (
        <div
            title={milestone.description}
            className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 to-orange-500/5 px-3.5 py-3 dark:border-amber-500/30"
        >
            <div aria-hidden className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-amber-500/20 blur-2xl" />
            <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-zinc-950 shadow-md shadow-amber-900/30 ring-1 ring-amber-300/50">
                <Icon name={milestone.icon} size="md" />
            </span>
            <div className="relative min-w-0">
                <div className="flex items-center gap-1.5">
                    <Text as="span" size="sm" weight="bold" className="truncate text-zinc-900 dark:text-zinc-50">
                        {milestone.label}
                    </Text>
                    <Icon name="check" size="xs" className="shrink-0 text-amber-600 dark:text-amber-400" />
                </div>
                <Text as="p" size="xs" color="muted" className="truncate">
                    {milestone.description}
                </Text>
            </div>
        </div>
    );
}

export default function Collection({ owner, highlights, milestones, featured, vinyls }: Props) {
    // The read-only card wants the full Vinyl shape; the private columns it never
    // reads (rating, notes) are filled with null so nothing sensitive is invented.
    const records: Vinyl[] = useMemo(
        () => vinyls.map((v) => ({ ...v, rating: null, notes: null })),
        [vinyls],
    );
    const featuredRecords: Vinyl[] = useMemo(
        () => featured.map((v) => ({ ...v, rating: null, notes: null })),
        [featured],
    );

    // Reuse the same client-side genre/condition/sort controls as the owner's
    // own collection page, plus a local title/artist search on top.
    const [query, setQuery] = useState('');
    const {
        sort,
        setSort,
        activeGenre,
        setActiveGenre,
        activeCondition,
        setActiveCondition,
        genres,
        conditions,
        visible,
    } = useVinylFilters(records);

    const q = query.trim().toLowerCase();
    const shown = useMemo(
        () =>
            q
                ? visible.filter(
                      (v) => v.title.toLowerCase().includes(q) || v.artist.toLowerCase().includes(q),
                  )
                : visible,
        [visible, q],
    );

    const count = records.length;
    const hasRecords = count > 0;

    return (
        <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
            <Head title={`${owner.name}'s Collection · SpinList`} />

            {/* Public header — the SpinList mark and a theme toggle only. No nav,
                no account controls: nothing here is auth-only. */}
            <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                        <span className="grid h-7 w-7 place-items-center rounded-md bg-violet-600 text-sm font-bold text-white">
                            S
                        </span>
                        SpinList
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <Link href="/login">
                            <Button variant="ghost" size="sm">
                                Sign in
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
                {/* ── Hero ──────────────────────────────────────────────────────
                    Whose shelf this is, with a monogram, a warm glow, and the
                    showcase numbers. Built to feel like a profile, not a table. */}
                <section className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white px-6 py-8 dark:border-zinc-800/70 dark:bg-zinc-900/60 sm:px-8">
                    {/* Warm ambient glow behind the hero. */}
                    <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
                    <div aria-hidden className="pointer-events-none absolute -left-10 top-10 h-40 w-40 rounded-full bg-orange-500/5 blur-3xl" />

                    <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
                        {/* Vinyl-disc monogram. */}
                        <div className="relative h-20 w-20 shrink-0">
                            <div aria-hidden className="absolute -inset-3 rounded-full bg-amber-500/10 blur-xl" />
                            <div className="relative grid h-full w-full place-items-center rounded-full bg-zinc-950 shadow-2xl shadow-black/60 ring-1 ring-zinc-700/60">
                                <div
                                    aria-hidden
                                    className="absolute inset-0 rounded-full"
                                    style={{
                                        backgroundImage:
                                            'repeating-radial-gradient(circle at center, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 6px)',
                                    }}
                                />
                                <span className="relative grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-bold text-zinc-950 ring-1 ring-amber-300/40">
                                    {initials(owner.name)}
                                </span>
                            </div>
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500/90">
                                <Icon name="disc-3" size="sm" />
                                <Text as="span" size="xs" weight="semibold" className="uppercase tracking-widest text-amber-600 dark:text-amber-500/90">
                                    Vinyl collection
                                </Text>
                            </div>
                            <Heading as="h1" size="2xl" weight="bold" className="mt-1 truncate text-zinc-900 dark:text-zinc-100">
                                {owner.name}
                            </Heading>
                            <Text as="p" size="sm" color="muted" className="mt-1">
                                {hasRecords
                                    ? `${count} record${count === 1 ? '' : 's'} on the shelf`
                                    : 'This shelf is empty for now.'}
                            </Text>
                        </div>
                    </div>

                    {/* Showcase numbers. */}
                    {hasRecords && (
                        <div className="relative mt-8 grid grid-cols-2 gap-6 border-t border-zinc-200 pt-6 dark:border-zinc-800/70 sm:grid-cols-4">
                            <HighlightStat value={highlights.totalRecords} label="Records" />
                            <HighlightStat value={highlights.uniqueArtists} label="Artists" />
                            <HighlightStat value={highlights.genreCount} label="Genres" />
                            <HighlightStat value={highlights.decadeCount} label="Decades" />
                        </div>
                    )}
                </section>

                {/* ── Earned milestones ────────────────────────────────────────
                    The collector's accomplishments. Only earned badges reach the
                    public page, so the whole strip reads as celebratory. */}
                {milestones.length > 0 && (
                    <section className="mt-8">
                        <div className="mb-3 flex items-center gap-2">
                            <Icon name="trophy" size="sm" className="text-amber-600 dark:text-amber-400" />
                            <Heading as="h2" size="md" weight="semibold" className="text-zinc-900 dark:text-zinc-100">
                                Achievements
                            </Heading>
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 tabular-nums dark:text-amber-300">
                                {milestones.length}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {milestones.map((m) => (
                                <MilestoneBadge key={m.id} milestone={m} />
                            ))}
                        </div>
                    </section>
                )}

                {/* ── Featured records ─────────────────────────────────────────
                    A handful of highlights (highest-rated first) as read-only
                    cards, shown a touch larger than the grid below. */}
                {featuredRecords.length > 0 && (
                    <section className="mt-10">
                        <div className="mb-4 flex items-center gap-2">
                            <Icon name="sparkles" size="sm" className="text-amber-600 dark:text-amber-400" />
                            <Heading as="h2" size="md" weight="semibold" className="text-zinc-900 dark:text-zinc-100">
                                Featured records
                            </Heading>
                        </div>
                        <div className="grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
                            {featuredRecords.map((vinyl) => (
                                <VinylCard key={vinyl.id} vinyl={vinyl} variant="public" />
                            ))}
                        </div>
                    </section>
                )}

                {/* ── Full collection grid ─────────────────────────────────────
                    The existing read-only, filterable shelf. */}
                {hasRecords ? (
                    <section className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800/70">
                        <Heading as="h2" size="md" weight="semibold" className="mb-4 text-zinc-900 dark:text-zinc-100">
                            The full shelf
                        </Heading>
                        <FilterBar
                            searchValue={query}
                            onSearchChange={setQuery}
                            sort={sort}
                            onSortChange={setSort}
                            genres={genres}
                            activeGenre={activeGenre}
                            onGenreChange={setActiveGenre}
                            conditions={conditions}
                            activeCondition={activeCondition}
                            onConditionChange={setActiveCondition}
                        />

                        <div className="mt-6">
                            {shown.length > 0 ? (
                                <div className="grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                    {shown.map((vinyl) => (
                                        <VinylCard key={vinyl.id} vinyl={vinyl} variant="public" />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-100/60 px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
                                    <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800/70">
                                        <Icon name="search-x" size="md" />
                                    </span>
                                    <Heading as="h3" size="md" weight="semibold" className="text-zinc-800 dark:text-zinc-200">
                                        No matches found
                                    </Heading>
                                    <Text as="p" size="sm" color="muted" className="mt-1.5 max-w-xs">
                                        Nothing on this shelf matches the current search or filters.
                                    </Text>
                                </div>
                            )}
                        </div>
                    </section>
                ) : (
                    <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-100/70 px-6 py-20 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
                        <RecordIllustration badge="disc-3" />
                        <Heading as="h2" size="lg" weight="semibold" className="text-zinc-900 dark:text-zinc-100">
                            Nothing here yet
                        </Heading>
                        <Text as="p" color="muted" className="mt-1.5 max-w-sm">
                            {owner.name} hasn't added any records to their public shelf.
                        </Text>
                    </div>
                )}
            </main>

            {/* Public footer: gentle CTA to start your own collection. */}
            <footer className="border-t border-zinc-200 dark:border-zinc-800/70">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-center sm:flex-row sm:text-left">
                    <Text as="p" size="sm" color="muted">
                        Powered by <span className="font-semibold text-zinc-700 dark:text-zinc-300">SpinList</span> — build and share your own vinyl shelf.
                    </Text>
                    <Link href="/login">
                        <Button color="amber" size="sm" icon="disc-3">
                            Start your collection
                        </Button>
                    </Link>
                </div>
            </footer>
        </div>
    );
}
