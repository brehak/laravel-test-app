import { Link } from '@inertiajs/react';
import { Button, Heading, Text } from '@particle-academy/react-fancy';
import { useState } from 'react';
import { AppLayout } from '@/layouts/AppLayout';
import { AddVinylModal } from './AddVinylModal';
import {
    FilterBar,
    NoResults,
    RecordIllustration,
    useServerSearch,
    useVinylFilters,
    VinylGridSkeleton,
    type Vinyl,
} from './filters';
import { VinylCard } from './VinylCard';

type Props = { vinyls: Vinyl[]; search: string };

function EmptyState({ onAdd }: { onAdd: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-100/70 px-6 py-20 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
            <RecordIllustration badge="bookmark" />
            <Heading as="h2" size="lg" weight="semibold" className="text-zinc-900 dark:text-zinc-100">
                Your wishlist is empty
            </Heading>
            <Text as="p" color="muted" className="mt-1.5 max-w-sm">
                Keep track of the records you're hunting for. Add ones you want and we'll hold them here
                until they land on your shelf.
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
    const { query, setQuery, isSearching, loading } = useServerSearch('/vinyls/wishlist', search);
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
                    <Heading as="h1" size="2xl" weight="bold" className="text-zinc-900 dark:text-zinc-100">
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
                {loading ? (
                    <VinylGridSkeleton />
                ) : wishlistIsEmpty ? (
                    <EmptyState onAdd={() => setAddOpen(true)} />
                ) : visible.length > 0 ? (
                    <div className="grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {visible.map((vinyl) => (
                            <VinylCard key={vinyl.id} vinyl={vinyl} variant="wishlist" />
                        ))}
                    </div>
                ) : (
                    <NoResults isSearching={isSearching} query={query} onClear={clearAll} />
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
