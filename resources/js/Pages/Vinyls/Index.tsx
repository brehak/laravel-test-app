import { Link, router } from '@inertiajs/react';
import { Button, Heading, Icon, Text } from '@particle-academy/react-fancy';
import { useEffect, useRef, useState } from 'react';
import { AppLayout } from '@/layouts/AppLayout';
import { AddVinylModal } from './AddVinylModal';
import { EditVinylModal } from './EditVinylModal';
import {
    FilterBar,
    type FilterState,
    NoResults,
    type Paginated,
    Pagination,
    RecordIllustration,
    useVinylQuery,
    VinylGridSkeleton,
    VinylListSkeleton,
    type ViewMode,
    ViewToggle,
    type Vinyl,
} from './filters';
import { ShareCollection } from './ShareCollection';
import { VinylCard } from './VinylCard';
import { VinylRow } from './VinylRow';
import { VinylDetailModal } from './VinylDetailModal';

// Re-exported for modules that still import it from here (e.g. the detail view);
// the implementation now lives alongside the shared filter controls.
export { conditionColor } from './filters';

type Props = FilterState & { vinyls: Paginated<Vinyl>; shareUrl: string | null; defaultView: ViewMode };

function EmptyState({ onAdd }: { onAdd: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900/40 px-6 py-20 text-center">
            <RecordIllustration badge="plus" />
            <Heading as="h2" size="lg" weight="semibold" className="text-zinc-900 dark:text-zinc-100">
                Your collection is empty
            </Heading>
            <Text as="p" color="muted" className="mt-1.5 max-w-sm">
                Add your first record to start building the shelf. Search the catalog and we'll pull in the
                cover art, tracklist, and more.
            </Text>
            <div className="mt-6">
                <Button color="amber" icon="plus" onClick={onAdd}>
                    Add Vinyl
                </Button>
            </div>
        </div>
    );
}

export default function Index({ vinyls, genres, conditions, shareUrl, defaultView, ...filters }: Props) {
    const [addOpen, setAddOpen] = useState(false);
    const [editing, setEditing] = useState<Vinyl | null>(null);
    const [detailing, setDetailing] = useState<Vinyl | null>(null);
    // Layout starts from the user's saved default_view preference; the toolbar
    // toggle then flips it for the session (not persisted — that's a preference
    // change, made on the settings page).
    const [view, setView] = useState<ViewMode>(defaultView);

    // All of search + sort + genre + condition now filter on the server, which
    // returns this page of results. The hook drives the toolbar and reloads.
    const {
        query,
        setQuery,
        sort,
        onSortChange,
        activeGenre,
        onGenreChange,
        activeCondition,
        onConditionChange,
        loading,
        isSearching,
        isFiltered,
        clearAll,
    } = useVinylQuery('/vinyls', { ...filters, genres, conditions });

    // The collection is truly empty only when there are no records at all AND no
    // filter is narrowing them — a filtered-to-zero page is "no results", not empty.
    const collectionIsEmpty = vinyls.total === 0 && !isFiltered;
    const hasRecords = !collectionIsEmpty;

    // "Surprise Me" — pick a random record and open its detail view, with a
    // brief cover-shuffle flourish first. The actual pick is made server-side
    // (VinylController@surprise) across the WHOLE owned collection, since
    // pagination means this page only holds ~24 records. The covers flashed
    // during the flourish are just eye-candy drawn from whatever's on screen.
    const surprisePool = vinyls.data;
    const [surprising, setSurprising] = useState(false);
    const [spinCover, setSpinCover] = useState<Vinyl | null>(null);
    // Track every timer so we can tear them down if the component unmounts mid-spin.
    const spinTimers = useRef<number[]>([]);

    const surpriseMe = () => {
        if (surprising) return;
        setSurprising(true);

        // Rapidly flash random covers ("spinning") while we wait for the server
        // to pick the real winner. Keeps flashing until the pick lands.
        const flashCover = () =>
            setSpinCover(surprisePool.length ? surprisePool[Math.floor(Math.random() * surprisePool.length)] : null);
        flashCover();
        const interval = window.setInterval(flashCover, 120);
        spinTimers.current.push(interval);

        // Ask the server for one random record from the entire owned collection.
        // The pick comes back on the shared `surprise` prop (flashed, one-shot).
        router.get('/vinyls/surprise', {}, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: (page) => {
                const pick = (page.props as { surprise?: Vinyl | null }).surprise ?? null;
                // Let the shuffle play a short beat, then reveal the pick.
                const finish = window.setTimeout(() => {
                    window.clearInterval(interval);
                    setSurprising(false);
                    setSpinCover(null);
                    if (pick) setDetailing(pick);
                }, 600);
                spinTimers.current.push(finish);
            },
            onError: () => {
                window.clearInterval(interval);
                setSurprising(false);
                setSpinCover(null);
            },
        });
    };

    useEffect(
        () => () => {
            spinTimers.current.forEach((t) => {
                window.clearInterval(t);
                window.clearTimeout(t);
            });
        },
        [],
    );

    // Stats reflect the full filtered count (vinyls.total), not just this page.
    // Any active filter reframes the count as "results"; otherwise it's the
    // collection summary.
    const total = vinyls.total;
    const genreLabel = genres.length > 0 ? `${genres.length} genre${genres.length === 1 ? '' : 's'}` : null;
    const statsText = collectionIsEmpty
        ? 'Your record shelf is waiting.'
        : isFiltered
          ? `${total} result${total === 1 ? '' : 's'}`
          : [`${total} record${total === 1 ? '' : 's'}`, genreLabel].filter(Boolean).join(' · ');

    return (
        <AppLayout title="My Collection">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <Heading as="h1" size="2xl" weight="bold" className="text-zinc-900 dark:text-zinc-100">
                        My Collection
                    </Heading>
                    <Text as="p" size="sm" color="muted" className="mt-1">
                        {statsText}
                    </Text>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Link href="/vinyls/wishlist">
                        <Button variant="ghost" icon="bookmark">
                            Wishlist
                        </Button>
                    </Link>
                    {hasRecords && (
                        <Link href="/vinyls/stats">
                            <Button variant="ghost" icon="chart-pie">
                                Stats
                            </Button>
                        </Link>
                    )}
                    {hasRecords && (
                        <Button
                            variant="ghost"
                            icon="dices"
                            onClick={surpriseMe}
                            disabled={surprising}
                        >
                            Surprise Me
                        </Button>
                    )}
                    {hasRecords && <ShareCollection shareUrl={shareUrl} />}
                    <Button color="amber" icon="plus" onClick={() => setAddOpen(true)}>
                        Add Vinyl
                    </Button>
                </div>
            </div>

            {/* Show the toolbar whenever there are records to work with, or an
                active search (so the box stays reachable when it returns nothing). */}
            {!collectionIsEmpty && (
                <div className="mt-6 flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                        <FilterBar
                            searchValue={query}
                            onSearchChange={setQuery}
                            sort={sort}
                            onSortChange={onSortChange}
                            genres={genres}
                            activeGenre={activeGenre}
                            onGenreChange={onGenreChange}
                            conditions={conditions}
                            activeCondition={activeCondition}
                            onConditionChange={onConditionChange}
                        />
                    </div>
                    <ViewToggle view={view} onChange={setView} />
                </div>
            )}

            <div className="mt-6">
                {loading ? (
                    view === 'list' ? (
                        <VinylListSkeleton />
                    ) : (
                        <VinylGridSkeleton />
                    )
                ) : collectionIsEmpty ? (
                    <EmptyState onAdd={() => setAddOpen(true)} />
                ) : vinyls.data.length > 0 ? (
                    <>
                        {view === 'list' ? (
                            <div className="flex flex-col gap-2">
                                {vinyls.data.map((vinyl) => (
                                    <VinylRow key={vinyl.id} vinyl={vinyl} onEdit={setEditing} onOpen={setDetailing} />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                {vinyls.data.map((vinyl) => (
                                    <VinylCard key={vinyl.id} vinyl={vinyl} variant="collection" onEdit={setEditing} onOpen={setDetailing} />
                                ))}
                            </div>
                        )}
                        <Pagination paginator={vinyls} />
                    </>
                ) : (
                    <NoResults isSearching={isSearching} query={query} onClear={clearAll} />
                )}
            </div>

            {/* "Surprise Me" flourish — a quick cover shuffle before the detail
                view lands. Sits above the grid but below the modal that follows. */}
            {surprising && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/80 backdrop-blur-sm">
                    <div className="relative h-56 w-56">
                        {/* Sweeping amber glow behind the cover, evoking a spinning disc. */}
                        <div className="absolute -inset-5 animate-spin rounded-full bg-[conic-gradient(from_0deg,transparent,rgba(245,158,11,0.55),transparent_60%)] blur-md [animation-duration:1.1s]" />
                        <div className="relative h-full w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-950 shadow-2xl shadow-black/70 ring-2 ring-amber-500/50">
                            {spinCover?.image ? (
                                <img
                                    key={spinCover.id}
                                    src={spinCover.image}
                                    alt=""
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 via-zinc-900 to-black text-zinc-600">
                                    <Icon name="disc-3" size="xl" className="opacity-60" />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-amber-300">
                        <Icon name="dices" size="sm" className="animate-bounce" />
                        <Text as="span" size="sm" weight="medium" className="text-amber-300">
                            Picking something for you…
                        </Text>
                    </div>
                </div>
            )}

            <AddVinylModal open={addOpen} onClose={() => setAddOpen(false)} existingVinyls={vinyls.data} />
            <EditVinylModal
                open={editing !== null}
                vinyl={editing}
                onClose={() => setEditing(null)}
            />
            <VinylDetailModal
                open={detailing !== null}
                vinyl={detailing}
                onClose={() => setDetailing(null)}
                onEdit={(vinyl) => {
                    // Reuse the existing edit flow: swap the detail view for the edit modal.
                    setDetailing(null);
                    setEditing(vinyl);
                }}
            />
        </AppLayout>
    );
}
