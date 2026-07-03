import { Link, router } from '@inertiajs/react';
import { Badge, Button, Card, Heading, Icon, Text } from '@particle-academy/react-fancy';
import { useState } from 'react';
import { AppLayout } from '@/layouts/AppLayout';
import { AddVinylModal } from './AddVinylModal';
import { conditionColor, FilterBar, useServerSearch, useVinylFilters, type Vinyl } from './filters';

/** Neutral fallback disc color when a record has none stored. */
const DEFAULT_DISC_COLOR = '#1a1a1a';

type Props = { vinyls: Vinyl[]; search: string };

/**
 * The physical record disc that peeks out from behind the cover on the right —
 * mirrors the collection card so the wishlist feels like the same shelf.
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
                <div
                    className="absolute inset-0 rounded-full"
                    style={{
                        backgroundImage:
                            'repeating-radial-gradient(circle at center, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1.5px, transparent 1.5px, transparent 7px), radial-gradient(circle at 32% 28%, rgba(255,255,255,0.28), transparent 55%)',
                    }}
                />
                <div
                    className="absolute top-1/2 left-1/2 h-1/3 w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-black/30"
                    style={{ backgroundColor: color, filter: 'brightness(0.55)' }}
                >
                    <div className="absolute top-1/2 left-1/2 h-1/4 w-1/4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-950 ring-1 ring-white/10" />
                </div>
            </div>
        </div>
    );
}

function WishlistCard({ vinyl }: { vinyl: Vinyl }) {
    const [moving, setMoving] = useState(false);

    // Flip owned -> true, moving this record into the collection. The list
    // re-fetches on success, so the card drops off the wishlist.
    const markAsOwned = () => {
        setMoving(true);
        router.patch(`/vinyls/${vinyl.id}/toggle-owned`, {}, {
            preserveScroll: true,
            onFinish: () => setMoving(false),
        });
    };

    return (
        <Card
            variant="elevated"
            padding="none"
            className="group relative z-0 overflow-visible border-zinc-800/60 bg-zinc-900 transition-all duration-300 ease-out hover:z-20 hover:-translate-y-1.5 hover:border-amber-500/30 hover:shadow-2xl hover:shadow-black/50"
        >
            {/* Cover + disc live together; the disc peeks out behind the cover. */}
            <div className="relative">
                <VinylDisc color={vinyl.color || DEFAULT_DISC_COLOR} />

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

                    {vinyl.condition && (
                        <div className="absolute right-2 top-2">
                            <Badge color={conditionColor(vinyl.condition)} variant="solid" size="sm">
                                {vinyl.condition}
                            </Badge>
                        </div>
                    )}

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
            </div>

            <Card.Body className="space-y-2 p-4">
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
                    <div className="flex flex-wrap gap-1">
                        {vinyl.genre.slice(0, 3).map((g) => (
                            <Badge key={g} color="stone" variant="soft" size="sm">
                                {g}
                            </Badge>
                        ))}
                    </div>
                )}

                <Button
                    color="amber"
                    size="sm"
                    icon={moving ? 'loader-2' : 'check'}
                    loading={moving}
                    onClick={markAsOwned}
                    className="mt-1 w-full"
                >
                    Mark as owned
                </Button>
            </Card.Body>
        </Card>
    );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-20 text-center">
            <span className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-amber-500/10 text-amber-500">
                <Icon name="bookmark" size="lg" />
            </span>
            <Heading as="h2" size="lg" weight="semibold" className="text-zinc-100">
                Your wishlist is empty
            </Heading>
            <Text as="p" color="muted" className="mt-1 max-w-xs">
                Records you want but don't own yet will show up here.
            </Text>
            <div className="mt-6 flex items-center gap-2">
                <Button color="amber" icon="plus" onClick={onAdd}>
                    Add to Wishlist
                </Button>
                <Link href="/vinyls">
                    <Button variant="ghost" icon="arrow-left">
                        Back to collection
                    </Button>
                </Link>
            </div>
        </div>
    );
}

export default function Wishlist({ vinyls, search }: Props) {
    const [addOpen, setAddOpen] = useState(false);

    // Server-side search (debounced against /vinyls/wishlist) + client-side
    // sort/filter — the same wiring the collection uses, over wishlist items.
    const { query, setQuery, isSearching } = useServerSearch('/vinyls/wishlist', search);
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
        clearFilters,
    } = useVinylFilters(vinyls);

    // "Records at all" vs. "records matching the current search" — an empty
    // `vinyls` while searching means no matches, not an empty wishlist.
    const hasRecords = vinyls.length > 0;
    const wishlistIsEmpty = !hasRecords && !isSearching;

    // Any control that narrows the set — used for the stats line and the reset action.
    const anyFilterActive = isSearching || activeGenre !== null || activeCondition !== null;

    const clearAll = () => {
        clearFilters();
        setQuery('');
    };

    // Stats reflect the active filters, mirroring the collection page.
    const genreLabel = genres.length > 0 ? `${genres.length} genre${genres.length === 1 ? '' : 's'}` : null;
    const clientFiltered = activeGenre !== null || activeCondition !== null;
    const statsText = wishlistIsEmpty
        ? 'Records you want will collect here.'
        : isSearching
          ? `${visible.length} result${visible.length === 1 ? '' : 's'} for “${query.trim()}”`
          : clientFiltered
            ? `${visible.length} of ${vinyls.length} record${vinyls.length === 1 ? '' : 's'}`
            : [`${vinyls.length} record${vinyls.length === 1 ? '' : 's'} you're after`, genreLabel]
                  .filter(Boolean)
                  .join(' · ');

    return (
        <AppLayout title="Wishlist">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <Heading as="h1" size="2xl" weight="bold" className="text-zinc-100">
                        Wishlist
                    </Heading>
                    <Text as="p" size="sm" color="muted" className="mt-1">
                        {statsText}
                    </Text>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Link href="/vinyls">
                        <Button variant="ghost" icon="library">
                            Collection
                        </Button>
                    </Link>
                    <Button color="amber" icon="plus" onClick={() => setAddOpen(true)}>
                        Add to Wishlist
                    </Button>
                </div>
            </div>

            {/* Show the toolbar whenever there are records to work with, or an
                active search (so the box stays reachable when it returns nothing). */}
            {!wishlistIsEmpty && (
                <div className="mt-6">
                    <FilterBar
                        searchValue={query}
                        onSearchChange={setQuery}
                        searchLabel="Search wishlist"
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
                {wishlistIsEmpty ? (
                    <EmptyState onAdd={() => setAddOpen(true)} />
                ) : visible.length > 0 ? (
                    <div className="grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {visible.map((vinyl) => (
                            <WishlistCard key={vinyl.id} vinyl={vinyl} />
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

            {/* Same modal as the collection, but records created here are wishlist
                items (owned = false). Duplicate detection reuses the wishlist. */}
            <AddVinylModal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                existingVinyls={vinyls}
                owned={false}
            />
        </AppLayout>
    );
}
