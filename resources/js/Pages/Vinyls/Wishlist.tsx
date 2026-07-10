import { Link } from '@inertiajs/react';
import { Button, Heading, Text } from '@particle-academy/react-fancy';
import { useState } from 'react';
import { AppLayout } from '@/layouts/AppLayout';
import { AddVinylModal } from './AddVinylModal';
import {
    FilterBar,
    type FilterState,
    NoResults,
    type Paginated,
    Pagination,
    RecordIllustration,
    useVinylQuery,
    VinylGridSkeleton,
    type Vinyl,
} from './filters';
import { VinylCard } from './VinylCard';

type Props = FilterState & { vinyls: Paginated<Vinyl> };

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

export default function Wishlist({ vinyls, genres, conditions, ...filters }: Props) {
    const [addOpen, setAddOpen] = useState(false);

    // Server-side search + sort + genre + condition, paginated — the same wiring
    // the collection uses, pointed at the wishlist endpoint.
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
    } = useVinylQuery('/vinyls/wishlist', { ...filters, genres, conditions });

    // Truly empty only when there are no wishlist records at all AND no filter is
    // narrowing them — a filtered-to-zero page is "no results", not empty.
    const wishlistIsEmpty = vinyls.total === 0 && !isFiltered;

    // Stats reflect the full filtered count, mirroring the collection page.
    const total = vinyls.total;
    const genreLabel = genres.length > 0 ? `${genres.length} genre${genres.length === 1 ? '' : 's'}` : null;
    const statsText = wishlistIsEmpty
        ? 'Records you want will collect here.'
        : isFiltered
          ? `${total} result${total === 1 ? '' : 's'}`
          : [`${total} record${total === 1 ? '' : 's'} you're after`, genreLabel].filter(Boolean).join(' · ');

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
                        onSortChange={onSortChange}
                        genres={genres}
                        activeGenre={activeGenre}
                        onGenreChange={onGenreChange}
                        conditions={conditions}
                        activeCondition={activeCondition}
                        onConditionChange={onConditionChange}
                    />
                </div>
            )}

            <div className="mt-6">
                {loading ? (
                    <VinylGridSkeleton />
                ) : wishlistIsEmpty ? (
                    <EmptyState onAdd={() => setAddOpen(true)} />
                ) : vinyls.data.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {vinyls.data.map((vinyl) => (
                                <VinylCard key={vinyl.id} vinyl={vinyl} variant="wishlist" />
                            ))}
                        </div>
                        <Pagination paginator={vinyls} />
                    </>
                ) : (
                    <NoResults isSearching={isSearching} query={query} onClear={clearAll} />
                )}
            </div>

            {/* Same modal as the collection, but records created here are wishlist
                items (owned = false). Duplicate detection reuses the wishlist. */}
            <AddVinylModal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                existingVinyls={vinyls.data}
                owned={false}
            />
        </AppLayout>
    );
}
