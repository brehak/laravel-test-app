import { router } from '@inertiajs/react';
import { Badge, Button, Card, Heading, Icon, Select, Text } from '@particle-academy/react-fancy';
import { useMemo, useState } from 'react';
import { AppLayout } from '@/layouts/AppLayout';
import { AddVinylModal } from './AddVinylModal';
import { EditVinylModal } from './EditVinylModal';

type Vinyl = {
    id: number;
    title: string;
    artist: string;
    image: string | null;
    genre: string[] | null;
    year: string | null;
    condition: string | null;
};

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
function conditionColor(condition: string): 'emerald' | 'amber' | 'orange' | 'rose' | 'zinc' {
    const c = condition.toLowerCase();
    if (c.includes('mint') || c.includes('new') || c.includes('sealed')) return 'emerald';
    if (c.includes('very good') || c.startsWith('vg')) return 'amber';
    if (c.includes('good') || c.includes('fair')) return 'orange';
    if (c.includes('poor') || c.includes('bad')) return 'rose';
    return 'zinc';
}

function VinylCard({
    vinyl,
    onEdit,
}: {
    vinyl: Vinyl;
    onEdit: (vinyl: Vinyl) => void;
}) {
    // Two-step delete: first click arms the inline "Are you sure?" confirm,
    // second click actually fires the request.
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const onDeleteClick = () => {
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
            className="group overflow-hidden border-zinc-800/60 bg-zinc-900 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-amber-500/30 hover:shadow-2xl hover:shadow-black/50"
        >
            {/* Cover art carries the visual weight */}
            <div className="relative aspect-square overflow-hidden bg-zinc-950">
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
                        onClick={() => onEdit(vinyl)}
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
                <Button color="amber" icon="plus" onClick={() => setAddOpen(true)}>
                    Add Vinyl
                </Button>
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
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {visible.map((vinyl) => (
                            <VinylCard key={vinyl.id} vinyl={vinyl} onEdit={setEditing} />
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

            <AddVinylModal open={addOpen} onClose={() => setAddOpen(false)} />
            <EditVinylModal
                open={editing !== null}
                vinyl={editing}
                onClose={() => setEditing(null)}
            />
        </AppLayout>
    );
}
