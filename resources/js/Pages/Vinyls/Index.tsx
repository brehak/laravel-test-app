import { Link, router } from '@inertiajs/react';
import { Badge, Button, Card, Heading, Icon, Select, Text } from '@particle-academy/react-fancy';
import { useMemo, useState } from 'react';
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
};

/** Neutral fallback disc color when a record has none stored. */
const DEFAULT_DISC_COLOR = '#1a1a1a';

type Props = { vinyls: Vinyl[] };

/** Sort modes. "default" preserves the incoming (recently-added) order. */
type SortKey = 'default' | 'title' | 'artist' | 'year';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: 'default', label: 'Recently added' },
    { value: 'title', label: 'Title (A–Z)' },
    { value: 'artist', label: 'Artist (A–Z)' },
    { value: 'year', label: 'Year (newest)' },
];

/** Sort + genre filter controls. Purely presentational — all state lives in the parent. */
function FilterBar({
    sort,
    onSortChange,
    genres,
    activeGenre,
    onGenreChange,
}: {
    sort: SortKey;
    onSortChange: (sort: SortKey) => void;
    genres: string[];
    activeGenre: string | null;
    onGenreChange: (genre: string | null) => void;
}) {
    const chip = (label: string, selected: boolean, onClick: () => void) => (
        <button
            key={label}
            type="button"
            onClick={onClick}
            aria-pressed={selected}
            className={
                selected
                    ? 'rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300 transition'
                    : 'rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200'
            }
        >
            {label}
        </button>
    );

    return (
        <div className="flex flex-col gap-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            {genres.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                    {chip('All', activeGenre === null, () => onGenreChange(null))}
                    {genres.map((genre) => chip(genre, activeGenre === genre, () => onGenreChange(genre)))}
                </div>
            )}

            <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
                <Text as="label" size="xs" color="muted" className="shrink-0 uppercase tracking-wide">
                    Sort
                </Text>
                <Select
                    size="sm"
                    value={sort}
                    list={SORT_OPTIONS}
                    onValueChange={(value) => onSortChange(value as SortKey)}
                    aria-label="Sort collection"
                    className="min-w-40"
                />
            </div>
        </div>
    );
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

export default function Index({ vinyls }: Props) {
    const hasRecords = vinyls.length > 0;
    const [addOpen, setAddOpen] = useState(false);
    const [editing, setEditing] = useState<Vinyl | null>(null);
    const [detailing, setDetailing] = useState<Vinyl | null>(null);
    const [sort, setSort] = useState<SortKey>('default');
    const [activeGenre, setActiveGenre] = useState<string | null>(null);

    // Every unique genre across the collection, alphabetized for the filter chips.
    const genres = useMemo(
        () => Array.from(new Set(vinyls.flatMap((vinyl) => vinyl.genre ?? []))).sort((a, b) => a.localeCompare(b)),
        [vinyls],
    );

    // Derive the visible list from the prop — filter then sort, never mutating `vinyls`.
    const visible = useMemo(() => {
        const filtered = activeGenre
            ? vinyls.filter((vinyl) => vinyl.genre?.includes(activeGenre))
            : vinyls;

        if (sort === 'default') return filtered;

        const sorted = [...filtered];
        if (sort === 'title') {
            sorted.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sort === 'artist') {
            sorted.sort((a, b) => a.artist.localeCompare(b.artist));
        } else if (sort === 'year') {
            // Newest first; records without a year sink to the bottom.
            sorted.sort((a, b) => (Number(b.year) || -Infinity) - (Number(a.year) || -Infinity));
        }
        return sorted;
    }, [vinyls, activeGenre, sort]);

    // Stats reflect the active filter: "12 of 42 records" when narrowed, otherwise
    // the full "42 records · 8 genres" summary.
    const genreLabel = genres.length > 0 ? `${genres.length} genre${genres.length === 1 ? '' : 's'}` : null;
    const statsText = !hasRecords
        ? 'Your record shelf is waiting.'
        : activeGenre
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

            {hasRecords && (
                <div className="mt-6">
                    <FilterBar
                        sort={sort}
                        onSortChange={setSort}
                        genres={genres}
                        activeGenre={activeGenre}
                        onGenreChange={setActiveGenre}
                    />
                </div>
            )}

            <div className="mt-6">
                {!hasRecords ? (
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
                            No records match{activeGenre ? ` "${activeGenre}"` : ''}.
                        </Text>
                        <button
                            type="button"
                            onClick={() => setActiveGenre(null)}
                            className="mt-2 text-xs font-medium text-amber-400 transition hover:text-amber-300"
                        >
                            Clear filter
                        </button>
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
