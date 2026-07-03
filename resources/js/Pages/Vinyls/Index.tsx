import { Link, router } from '@inertiajs/react';
import { Badge, Button, Card, Heading, Icon, Select, Text } from '@particle-academy/react-fancy';
import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/layouts/AppLayout';
import { AddVinylModal } from './AddVinylModal';
import { EditVinylModal } from './EditVinylModal';
import { VinylDetailModal } from './VinylDetailModal';

type Vinyl = {
    id: number;
    title: string;
    artist: string;
    image: string | null;
    genre: string[] | null;
    year: string | null;
    condition: string | null;
    color: string | null;
    rating: number | null;
    notes: string | null;
};

/** Neutral fallback disc color when a record has none stored. */
const DEFAULT_DISC_COLOR = '#1a1a1a';

type Props = { vinyls: Vinyl[]; search: string };

/** Sort modes. "default" preserves the incoming (recently-added) order. */
type SortKey = 'default' | 'title' | 'artist' | 'year-new' | 'year-old' | 'rating';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: 'default', label: 'Recently added' },
    { value: 'title', label: 'Title (A–Z)' },
    { value: 'artist', label: 'Artist (A–Z)' },
    { value: 'year-new', label: 'Year (newest first)' },
    { value: 'year-old', label: 'Year (oldest first)' },
    { value: 'rating', label: 'Rating (highest first)' },
];

/** Sentinel used by the genre/condition Selects to represent "no filter". */
const ALL = 'all';

/** A labeled Select — the shared shape for the genre / condition / sort controls. */
function ToolbarSelect({
    label,
    value,
    list,
    onValueChange,
}: {
    label: string;
    value: string;
    list: { value: string; label: string }[];
    onValueChange: (value: string) => void;
}) {
    return (
        <div className="flex shrink-0 items-center gap-2">
            <Text as="label" size="xs" color="muted" className="shrink-0 uppercase tracking-wide">
                {label}
            </Text>
            <Select
                size="sm"
                value={value}
                list={list}
                onValueChange={onValueChange}
                aria-label={`${label} collection`}
                className="min-w-40"
            />
        </div>
    );
}

/**
 * Search + sort + genre/condition filter controls. Purely presentational — all
 * state lives in the parent. Everything sits in one row that wraps on narrow
 * screens; the search box grows to fill whatever space the selects leave.
 */
function FilterBar({
    searchValue,
    onSearchChange,
    sort,
    onSortChange,
    genres,
    activeGenre,
    onGenreChange,
    conditions,
    activeCondition,
    onConditionChange,
}: {
    searchValue: string;
    onSearchChange: (value: string) => void;
    sort: SortKey;
    onSortChange: (sort: SortKey) => void;
    genres: string[];
    activeGenre: string | null;
    onGenreChange: (genre: string | null) => void;
    conditions: string[];
    activeCondition: string | null;
    onConditionChange: (condition: string | null) => void;
}) {
    const genreList = [{ value: ALL, label: 'All genres' }, ...genres.map((g) => ({ value: g, label: g }))];
    const conditionList = [
        { value: ALL, label: 'All conditions' },
        ...conditions.map((c) => ({ value: c, label: c })),
    ];

    return (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
            {/* Search grows to fill the row; keeps a sensible min width before wrapping. */}
            <div className="relative min-w-[14rem] flex-1">
                <Icon
                    name="search"
                    size="sm"
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-500"
                />
                <input
                    type="search"
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search by title or artist…"
                    aria-label="Search collection"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 py-2 pr-9 pl-9 text-sm text-zinc-100 placeholder:text-zinc-500 transition focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                />
                {searchValue && (
                    <button
                        type="button"
                        onClick={() => onSearchChange('')}
                        aria-label="Clear search"
                        className="absolute top-1/2 right-2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
                    >
                        <Icon name="x" size="sm" />
                    </button>
                )}
            </div>

            {genres.length > 0 && (
                <ToolbarSelect
                    label="Genre"
                    value={activeGenre ?? ALL}
                    list={genreList}
                    onValueChange={(value) => onGenreChange(value === ALL ? null : value)}
                />
            )}

            {conditions.length > 0 && (
                <ToolbarSelect
                    label="Condition"
                    value={activeCondition ?? ALL}
                    list={conditionList}
                    onValueChange={(value) => onConditionChange(value === ALL ? null : value)}
                />
            )}

            <ToolbarSelect
                label="Sort"
                value={sort}
                list={SORT_OPTIONS}
                onValueChange={(value) => onSortChange(value as SortKey)}
            />
        </div>
    );
}

/**
 * Canonical grade order (best → worst) for sorting the condition filter. Free-text
 * conditions are matched case-insensitively; anything unrecognized sorts last.
 */
const CONDITION_RANK: Record<string, number> = {
    sealed: 0,
    mint: 1,
    'near mint': 2,
    nm: 2,
    'very good plus': 3,
    'vg+': 3,
    'very good': 4,
    vg: 4,
    'good plus': 5,
    'g+': 5,
    good: 6,
    fair: 7,
    poor: 8,
};

function conditionRank(condition: string): number {
    return CONDITION_RANK[condition.trim().toLowerCase()] ?? Number.POSITIVE_INFINITY;
}

/** Map a free-text condition grade to a warm-palette badge color. */
export function conditionColor(condition: string): 'emerald' | 'amber' | 'orange' | 'rose' | 'zinc' {
    const c = condition.toLowerCase();
    if (c.includes('mint') || c.includes('new') || c.includes('sealed')) return 'emerald';
    if (c.includes('very good') || c.startsWith('vg')) return 'amber';
    if (c.includes('good') || c.includes('fair')) return 'orange';
    if (c.includes('poor') || c.includes('bad')) return 'rose';
    return 'zinc';
}

/**
 * The physical record disc that peeks out from behind the cover on the right.
 * Sits behind the cover art (lower stacking) so only its right edge shows, and
 * slides further out on card hover — as if pulled from its sleeve.
 */
function VinylDisc({ color }: { color: string }) {
    return (
        <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-0 z-0 aspect-square w-[92%] -translate-y-1/2 translate-x-[13%] transition-transform duration-500 ease-out group-hover:translate-x-[24%]"
        >
            <div
                className="relative h-full w-full rounded-full shadow-xl shadow-black/60 ring-1 ring-black/40"
                style={{ backgroundColor: color }}
            >
                {/* Faint concentric grooves + a soft top-left sheen — groove spacing
                    widened to stay proportional now that the disc is full-size. */}
                <div
                    className="absolute inset-0 rounded-full"
                    style={{
                        backgroundImage:
                            'repeating-radial-gradient(circle at center, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1.5px, transparent 1.5px, transparent 7px), radial-gradient(circle at 32% 28%, rgba(255,255,255,0.28), transparent 55%)',
                    }}
                />
                {/* Darker center label. */}
                <div
                    className="absolute top-1/2 left-1/2 h-1/3 w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-black/30"
                    style={{ backgroundColor: color, filter: 'brightness(0.55)' }}
                >
                    {/* Spindle hole. */}
                    <div className="absolute top-1/2 left-1/2 h-1/4 w-1/4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-950 ring-1 ring-white/10" />
                </div>
            </div>
        </div>
    );
}

function VinylCard({
    vinyl,
    onEdit,
    onOpen,
}: {
    vinyl: Vinyl;
    onEdit: (vinyl: Vinyl) => void;
    onOpen: (vinyl: Vinyl) => void;
}) {
    // Two-step delete: first click arms the inline "Are you sure?" confirm,
    // second click actually fires the request.
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [moving, setMoving] = useState(false);

    // Move this record out of the collection and onto the wishlist by flipping
    // its owned flag. The list re-fetches, so the card drops away on success.
    const onMoveToWishlist = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMoving(true);
        router.patch(`/vinyls/${vinyl.id}/toggle-owned`, {}, {
            preserveScroll: true,
            onFinish: () => setMoving(false),
        });
    };

    const onDeleteClick = (e: React.MouseEvent) => {
        // Don't let a click on the delete control bubble up to the card (which
        // would open the detail view).
        e.stopPropagation();
        // First click arms the confirm; second click actually deletes.
        if (!confirming) {
            setConfirming(true);
            return;
        }
        setDeleting(true);
        router.delete(`/vinyls/${vinyl.id}`, {
            preserveScroll: true,
            onFinish: () => setDeleting(false),
        });
    };

    return (
        <Card
            variant="elevated"
            padding="none"
            role="button"
            tabIndex={0}
            aria-label={`View ${vinyl.title} by ${vinyl.artist}`}
            onClick={() => onOpen(vinyl)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpen(vinyl);
                }
            }}
            className="group relative z-0 cursor-pointer overflow-visible border-zinc-800/60 bg-zinc-900 transition-all duration-300 ease-out hover:z-20 hover:-translate-y-1.5 hover:border-amber-500/30 hover:shadow-2xl hover:shadow-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
        >
            {/* Cover + disc live together; the disc peeks out behind the cover. */}
            <div className="relative">
                {/* The record disc, behind the cover (z-0), edge showing on the right. */}
                <VinylDisc color={vinyl.color || DEFAULT_DISC_COLOR} />

                {/* Cover art carries the visual weight; sits above the disc (z-10). */}
                <div className="relative z-10 aspect-square overflow-hidden rounded-t-lg bg-zinc-950">
                {vinyl.image ? (
                    <img
                        src={vinyl.image}
                        alt={`${vinyl.title} by ${vinyl.artist}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.08]"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 via-zinc-900 to-black text-zinc-600">
                        <Icon name="disc-3" size="xl" className="opacity-60" />
                    </div>
                )}

                {/* Condition badge floats over the art */}
                {vinyl.condition && (
                    <div className="absolute right-2 top-2">
                        <Badge color={conditionColor(vinyl.condition)} variant="solid" size="sm">
                            {vinyl.condition}
                        </Badge>
                    </div>
                )}

                {/* Edit / delete controls — surface on hover (and focus) */}
                <div className="absolute left-2 top-2 flex items-center gap-1.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    <button
                        type="button"
                        onClick={(e) => {
                            // Keep the edit control from also opening the detail view.
                            e.stopPropagation();
                            onEdit(vinyl);
                        }}
                        aria-label={`Edit ${vinyl.title}`}
                        className="grid h-8 w-8 place-items-center rounded-md bg-black/60 text-zinc-200 backdrop-blur transition hover:bg-black/80 hover:text-amber-300"
                    >
                        <Icon name="pencil" size="sm" />
                    </button>
                    <button
                        type="button"
                        onClick={onMoveToWishlist}
                        disabled={moving}
                        aria-label={`Move ${vinyl.title} to wishlist`}
                        title="Move to wishlist"
                        className="grid h-8 w-8 place-items-center rounded-md bg-black/60 text-zinc-200 backdrop-blur transition hover:bg-black/80 hover:text-amber-300 disabled:opacity-60"
                    >
                        <Icon name={moving ? 'loader-2' : 'bookmark'} size="sm" className={moving ? 'animate-spin' : undefined} />
                    </button>
                    <button
                        type="button"
                        onClick={onDeleteClick}
                        onBlur={() => setConfirming(false)}
                        disabled={deleting}
                        aria-label={confirming ? `Confirm delete ${vinyl.title}` : `Delete ${vinyl.title}`}
                        className={
                            confirming
                                ? 'grid h-8 place-items-center rounded-md bg-rose-600 px-2 text-xs font-medium text-white transition hover:bg-rose-500 disabled:opacity-60'
                                : 'grid h-8 w-8 place-items-center rounded-md bg-black/60 text-zinc-200 backdrop-blur transition hover:bg-rose-600/90 hover:text-white'
                        }
                    >
                        {confirming ? (
                            deleting ? (
                                <Icon name="loader-2" size="sm" className="animate-spin" />
                            ) : (
                                'Sure?'
                            )
                        ) : (
                            <Icon name="trash-2" size="sm" />
                        )}
                    </button>
                </div>

                {/* Warm gradient scrim so overlaid text stays legible */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
            </div>

            <Card.Body className="space-y-1 p-4">
                <div className="flex items-start justify-between gap-2">
                    <Heading as="h3" size="sm" weight="semibold" className="line-clamp-1 text-zinc-100">
                        {vinyl.title}
                    </Heading>
                    {vinyl.year && (
                        <Text as="span" size="xs" className="mt-0.5 shrink-0 font-mono text-amber-500/80">
                            {vinyl.year}
                        </Text>
                    )}
                </div>

                <Text as="p" size="sm" color="muted" className="line-clamp-1">
                    {vinyl.artist}
                </Text>

                {vinyl.genre && vinyl.genre.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1.5">
                        {vinyl.genre.slice(0, 3).map((g) => (
                            <Badge key={g} color="stone" variant="soft" size="sm">
                                {g}
                            </Badge>
                        ))}
                    </div>
                )}
            </Card.Body>
        </Card>
    );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-20 text-center">
            <span className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-amber-500/10 text-amber-500">
                <Icon name="disc-3" size="lg" />
            </span>
            <Heading as="h2" size="lg" weight="semibold" className="text-zinc-100">
                No records yet
            </Heading>
            <Text as="p" color="muted" className="mt-1 max-w-xs">
                Add your first vinyl and start building your collection.
            </Text>
            <div className="mt-6">
                <Button color="amber" icon="plus" onClick={onAdd}>
                    Add Vinyl
                </Button>
            </div>
        </div>
    );
}

export default function Index({ vinyls, search }: Props) {
    const [addOpen, setAddOpen] = useState(false);
    const [editing, setEditing] = useState<Vinyl | null>(null);
    const [detailing, setDetailing] = useState<Vinyl | null>(null);
    const [sort, setSort] = useState<SortKey>('default');
    const [activeGenre, setActiveGenre] = useState<string | null>(null);
    const [activeCondition, setActiveCondition] = useState<string | null>(null);

    // Search is server-side: the local `query` drives the input while a debounced
    // effect pushes the term to the backend, which returns the narrowed `vinyls`.
    const [query, setQuery] = useState(search);
    const isSearching = query.trim().length > 0;

    useEffect(() => {
        const trimmed = query.trim();
        // Already in sync with the server (initial mount, or a just-completed
        // request) — nothing to fetch. Compare trimmed to match the backend.
        if (trimmed === search) return;

        const id = setTimeout(() => {
            router.get(
                '/vinyls',
                trimmed ? { search: trimmed } : {},
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ['vinyls', 'search'],
                },
            );
        }, 300);

        return () => clearTimeout(id);
    }, [query, search]);

    // "Records at all" vs. "records matching the current search" — an empty
    // `vinyls` while searching means no matches, not an empty collection.
    const hasRecords = vinyls.length > 0;
    const collectionIsEmpty = !hasRecords && !isSearching;

    // Every unique genre across the collection, alphabetized for the filter dropdown.
    const genres = useMemo(
        () => Array.from(new Set(vinyls.flatMap((vinyl) => vinyl.genre ?? []))).sort((a, b) => a.localeCompare(b)),
        [vinyls],
    );

    // Every unique condition present, ordered best grade → worst (unknowns last).
    const conditions = useMemo(
        () =>
            Array.from(new Set(vinyls.map((vinyl) => vinyl.condition).filter((c): c is string => !!c))).sort(
                (a, b) => conditionRank(a) - conditionRank(b) || a.localeCompare(b),
            ),
        [vinyls],
    );

    // Derive the visible list from the prop — genre + condition narrow the set, the
    // chosen sort orders whatever remains. Never mutates `vinyls`.
    const visible = useMemo(() => {
        let filtered = vinyls;
        if (activeGenre) filtered = filtered.filter((vinyl) => vinyl.genre?.includes(activeGenre));
        if (activeCondition) filtered = filtered.filter((vinyl) => vinyl.condition === activeCondition);

        if (sort === 'default') return filtered;

        const sorted = [...filtered];
        if (sort === 'title') {
            sorted.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sort === 'artist') {
            sorted.sort((a, b) => a.artist.localeCompare(b.artist));
        } else if (sort === 'year-new') {
            // Newest first; records without a year sink to the bottom.
            sorted.sort((a, b) => (Number(b.year) || -Infinity) - (Number(a.year) || -Infinity));
        } else if (sort === 'year-old') {
            // Oldest first; records without a year still sink to the bottom.
            sorted.sort((a, b) => (Number(a.year) || Infinity) - (Number(b.year) || Infinity));
        } else if (sort === 'rating') {
            // Highest rated first; unrated records sink to the bottom.
            sorted.sort((a, b) => (b.rating ?? -Infinity) - (a.rating ?? -Infinity));
        }
        return sorted;
    }, [vinyls, activeGenre, activeCondition, sort]);

    // Any control that narrows the set — used for the stats line and the reset action.
    const anyFilterActive = isSearching || activeGenre !== null || activeCondition !== null;

    const clearAll = () => {
        setActiveGenre(null);
        setActiveCondition(null);
        setQuery('');
    };

    // Stats reflect the active filters. While searching we report matches for the
    // term; a client-side filter reports "12 of 42"; otherwise the full summary.
    const genreLabel = genres.length > 0 ? `${genres.length} genre${genres.length === 1 ? '' : 's'}` : null;
    const clientFiltered = activeGenre !== null || activeCondition !== null;
    const statsText = collectionIsEmpty
        ? 'Your record shelf is waiting.'
        : isSearching
          ? `${visible.length} result${visible.length === 1 ? '' : 's'} for “${query.trim()}”`
          : clientFiltered
            ? `${visible.length} of ${vinyls.length} record${vinyls.length === 1 ? '' : 's'}`
            : [`${vinyls.length} record${vinyls.length === 1 ? '' : 's'}`, genreLabel].filter(Boolean).join(' · ');

    return (
        <AppLayout title="My Collection">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <Heading as="h1" size="2xl" weight="bold" className="text-zinc-100">
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
                    <Button color="amber" icon="plus" onClick={() => setAddOpen(true)}>
                        Add Vinyl
                    </Button>
                </div>
            </div>

            {/* Show the toolbar whenever there are records to work with, or an
                active search (so the box stays reachable when it returns nothing). */}
            {!collectionIsEmpty && (
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
            )}

            <div className="mt-6">
                {collectionIsEmpty ? (
                    <EmptyState onAdd={() => setAddOpen(true)} />
                ) : visible.length > 0 ? (
                    <div className="grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {visible.map((vinyl) => (
                            <VinylCard key={vinyl.id} vinyl={vinyl} onEdit={setEditing} onOpen={setDetailing} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-12 text-center">
                        <Text as="p" size="sm" color="muted">
                            No records match your filters.
                        </Text>
                        {anyFilterActive && (
                            <button
                                type="button"
                                onClick={clearAll}
                                className="mt-2 text-xs font-medium text-amber-400 transition hover:text-amber-300"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                )}
            </div>

            <AddVinylModal open={addOpen} onClose={() => setAddOpen(false)} existingVinyls={vinyls} />
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
