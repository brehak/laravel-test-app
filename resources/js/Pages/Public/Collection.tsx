import { Head, Link } from '@inertiajs/react';
import { Button, Heading, Icon, Text } from '@particle-academy/react-fancy';
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

type Props = {
    owner: { name: string };
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

export default function Collection({ owner, vinyls }: Props) {
    // The read-only card wants the full Vinyl shape; the private columns it never
    // reads (rating, notes) are filled with null so nothing sensitive is invented.
    const records: Vinyl[] = useMemo(
        () => vinyls.map((v) => ({ ...v, rating: null, notes: null })),
        [vinyls],
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
                {/* Hero: whose shelf this is, and how many records are on it. */}
                <div className="flex flex-col gap-3 border-b border-zinc-200 pb-8 dark:border-zinc-800/70">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500/90">
                        <Icon name="disc-3" size="sm" />
                        <Text as="span" size="xs" weight="semibold" className="uppercase tracking-widest text-amber-600 dark:text-amber-500/90">
                            Shared collection
                        </Text>
                    </div>
                    <Heading as="h1" size="2xl" weight="bold" className="text-zinc-900 dark:text-zinc-100">
                        {owner.name}'s Collection
                    </Heading>
                    <Text as="p" size="sm" color="muted">
                        {hasRecords
                            ? `${count} record${count === 1 ? '' : 's'} on the shelf`
                            : 'This shelf is empty for now.'}
                    </Text>
                </div>

                {hasRecords ? (
                    <>
                        <div className="mt-6">
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
                        </div>

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
                    </>
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
