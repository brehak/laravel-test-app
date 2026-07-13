import { router } from '@inertiajs/react';
import { Button, Heading, Icon, Select, Skeleton, Text } from '@particle-academy/react-fancy';
import { useEffect, useMemo, useState } from 'react';

/**
 * Shared vinyl record shape used by the collection and wishlist pages. Both
 * receive the same columns from the backend; only the `owned` flag (kept on the
 * server) separates the two lists.
 */
export type Vinyl = {
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

/**
 * Laravel's length-aware paginator, as serialized into the page props. The grid
 * reads `data`; the stats line reads `total`; the pagination controls read the
 * page counters and `links` (which already carry the active query string via
 * `withQueryString()`, so following them preserves search/sort/filters).
 */
export type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
    links: { url: string | null; label: string; active: boolean }[];
};

/** Sort modes — values match the backend's whitelist. "recent" is the default. */
export type SortKey = 'recent' | 'title' | 'artist' | 'year_desc' | 'year_asc' | 'rating_desc';

/** Collection layout — grid of cards or a compact list of rows. */
export type ViewMode = 'grid' | 'list';

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: 'recent', label: 'Recently added' },
    { value: 'title', label: 'Title (A–Z)' },
    { value: 'artist', label: 'Artist (A–Z)' },
    { value: 'year_desc', label: 'Year (newest first)' },
    { value: 'year_asc', label: 'Year (oldest first)' },
    { value: 'rating_desc', label: 'Rating (highest first)' },
];

/** The props the server sends back describing the active filter/sort state. */
export type FilterState = {
    search: string;
    sort: SortKey;
    genre: string | null;
    condition: string | null;
    genres: string[];
    conditions: string[];
};

/** Sentinel used by the genre/condition Selects to represent "no filter". */
const ALL = 'all';

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

export function conditionRank(condition: string): number {
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
 * A stylized vinyl record used as the hero illustration for empty states — a
 * grooved black disc with an amber center label and warm glow, echoing the disc
 * that peeks out from the cards. An optional action badge (a `+` or bookmark)
 * clips onto the lower-right so each page's empty state reads at a glance.
 */
export function RecordIllustration({ badge }: { badge?: string }) {
    return (
        <div className="relative mb-6 h-28 w-28">
            {/* Warm glow pooling behind the disc. */}
            <div aria-hidden className="absolute -inset-5 rounded-full bg-amber-500/10 blur-2xl" />

            {/* The record itself. */}
            <div className="relative h-full w-full rounded-full bg-zinc-950 shadow-2xl shadow-black/60 ring-1 ring-zinc-700/60">
                {/* Concentric grooves. */}
                <div
                    aria-hidden
                    className="absolute inset-0 rounded-full"
                    style={{
                        backgroundImage:
                            'repeating-radial-gradient(circle at center, rgba(255,255,255,0.045) 0px, rgba(255,255,255,0.045) 1px, transparent 1px, transparent 6px)',
                    }}
                />
                {/* Soft amber sheen off the top-left. */}
                <div
                    aria-hidden
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundImage: 'radial-gradient(circle at 32% 28%, rgba(245,158,11,0.28), transparent 55%)' }}
                />
                {/* Amber center label + spindle hole. */}
                <div className="absolute top-1/2 left-1/2 grid h-2/5 w-2/5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-amber-500/90 ring-1 ring-amber-300/40">
                    <div className="h-2 w-2 rounded-full bg-zinc-950 ring-1 ring-white/20" />
                </div>
            </div>

            {/* Action badge clipped to the disc, ringed to punch out from the glow. */}
            {badge && (
                <span className="absolute -right-1 -bottom-1 grid h-9 w-9 place-items-center rounded-full bg-amber-500 text-zinc-950 shadow-lg shadow-black/40 ring-4 ring-zinc-900">
                    <Icon name={badge} size="sm" />
                </span>
            )}
        </div>
    );
}

/**
 * A single placeholder card matching the real card's footprint — square cover
 * plus two text lines and a couple of badge chips — so results fade in place
 * instead of popping in. Shown in a grid while a search request is in flight.
 */
function VinylCardSkeleton() {
    return (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800/60 dark:bg-zinc-900">
            <Skeleton shape="rect" className="aspect-square w-full rounded-none bg-zinc-200 dark:bg-zinc-800/80" />
            <div className="space-y-2.5 p-4">
                <Skeleton shape="text" className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800/80" />
                <Skeleton shape="text" className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800/80" />
                <div className="flex gap-1.5 pt-1">
                    <Skeleton shape="rect" className="h-5 w-12 rounded-full bg-zinc-200 dark:bg-zinc-800/60" />
                    <Skeleton shape="rect" className="h-5 w-14 rounded-full bg-zinc-200 dark:bg-zinc-800/60" />
                </div>
            </div>
        </div>
    );
}

/** A grid of placeholder cards, laid out exactly like the real record grid. */
export function VinylGridSkeleton({ count = 10 }: { count?: number }) {
    return (
        <div
            aria-hidden
            className="grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        >
            {Array.from({ length: count }).map((_, i) => (
                <VinylCardSkeleton key={i} />
            ))}
        </div>
    );
}

/** A single placeholder row matching the list view's footprint. */
function VinylRowSkeleton() {
    return (
        <div className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800/60 dark:bg-zinc-900">
            <Skeleton shape="rect" className="h-12 w-12 shrink-0 rounded-md bg-zinc-200 dark:bg-zinc-800/80" />
            <div className="flex-1 space-y-2">
                <Skeleton shape="text" className="h-3.5 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800/80" />
                <Skeleton shape="text" className="h-3 w-1/4 rounded bg-zinc-200 dark:bg-zinc-800/80" />
            </div>
            <Skeleton shape="rect" className="h-5 w-14 rounded-full bg-zinc-200 dark:bg-zinc-800/60" />
        </div>
    );
}

/** A stack of placeholder rows, laid out exactly like the real list view. */
export function VinylListSkeleton({ count = 10 }: { count?: number }) {
    return (
        <div aria-hidden className="flex flex-col gap-2">
            {Array.from({ length: count }).map((_, i) => (
                <VinylRowSkeleton key={i} />
            ))}
        </div>
    );
}

/**
 * A two-button grid/list segmented control for the toolbar. Purely
 * presentational — the parent owns the active {@link ViewMode}. The active
 * segment gets the warm amber treatment used elsewhere in the toolbar.
 */
export function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (view: ViewMode) => void }) {
    const options: { value: ViewMode; icon: string; label: string }[] = [
        { value: 'grid', icon: 'layout-grid', label: 'Grid view' },
        { value: 'list', icon: 'list', label: 'List view' },
    ];

    return (
        <div
            role="group"
            aria-label="Collection view"
            className="flex shrink-0 items-center gap-0.5 rounded-lg border border-zinc-300 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900/60"
        >
            {options.map((opt) => {
                const active = view === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        aria-label={opt.label}
                        aria-pressed={active}
                        title={opt.label}
                        className={
                            active
                                ? 'grid h-8 w-8 place-items-center rounded-md bg-amber-500 text-zinc-950'
                                : 'grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
                        }
                    >
                        <Icon name={opt.icon} size="sm" />
                    </button>
                );
            })}
        </div>
    );
}

/**
 * Shown when a search or filter narrows the list to nothing while the shelf
 * itself still has records — distinct from the truly-empty state. Copy adapts to
 * whether a search term is active, and the reset clears both search and filters.
 */
export function NoResults({ isSearching, query, onClear }: { isSearching: boolean; query: string; onClear: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-100/60 px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
            <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800/70">
                <Icon name={isSearching ? 'search-x' : 'filter-x'} size="md" />
            </span>
            <Heading as="h3" size="md" weight="semibold" className="text-zinc-800 dark:text-zinc-200">
                No matches found
            </Heading>
            <Text as="p" size="sm" color="muted" className="mt-1.5 max-w-xs">
                {isSearching
                    ? `Nothing on your shelf matches “${query.trim()}”. Try another term or clear your search.`
                    : 'No records match the selected filters. Try loosening them to see more.'}
            </Text>
            <Button variant="ghost" color="amber" size="sm" icon="x" onClick={onClear} className="mt-4">
                {isSearching ? 'Clear search & filters' : 'Clear filters'}
            </Button>
        </div>
    );
}

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
                aria-label={label}
                className="min-w-40"
            />
        </div>
    );
}

/**
 * Search + sort + genre/condition filter controls. Purely presentational — all
 * state lives in the parent. Everything sits in one row that wraps on narrow
 * screens; the search box grows to fill whatever space the selects leave. Used
 * by both the collection and the wishlist so the two shelves feel identical.
 */
export function FilterBar({
    searchValue,
    onSearchChange,
    searchPlaceholder = 'Search by title or artist…',
    searchLabel = 'Search',
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
    searchPlaceholder?: string;
    searchLabel?: string;
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
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-100/70 p-4 dark:border-zinc-800/60 dark:bg-zinc-900/40">
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
                    placeholder={searchPlaceholder}
                    aria-label={searchLabel}
                    className="w-full rounded-lg border border-zinc-300 bg-white py-2 pr-9 pl-9 text-sm text-zinc-900 placeholder:text-zinc-400 transition focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/40 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
                {searchValue && (
                    <button
                        type="button"
                        onClick={() => onSearchChange('')}
                        aria-label="Clear search"
                        className="absolute top-1/2 right-2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
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
 * Client-side genre/condition/sort state plus the derived views over a flat list
 * of records. Never mutates the incoming array. Used by the public share page,
 * which serves its whole (unpaginated) collection and filters in the browser —
 * the owner's own collection/wishlist filter on the server via {@see useVinylQuery}.
 */
export function useVinylFilters(vinyls: Vinyl[]) {
    const [sort, setSort] = useState<SortKey>('recent');
    const [activeGenre, setActiveGenre] = useState<string | null>(null);
    const [activeCondition, setActiveCondition] = useState<string | null>(null);

    // Every unique genre across the list, alphabetized for the filter dropdown.
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

    // Derive the visible list — genre + condition narrow the set, the chosen sort
    // orders whatever remains. Never mutates `vinyls`.
    const visible = useMemo(() => {
        let filtered = vinyls;
        if (activeGenre) filtered = filtered.filter((vinyl) => vinyl.genre?.includes(activeGenre));
        if (activeCondition) filtered = filtered.filter((vinyl) => vinyl.condition === activeCondition);

        if (sort === 'recent') return filtered;

        const sorted = [...filtered];
        if (sort === 'title') {
            sorted.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sort === 'artist') {
            sorted.sort((a, b) => a.artist.localeCompare(b.artist));
        } else if (sort === 'year_desc') {
            // Newest first; records without a year sink to the bottom.
            sorted.sort((a, b) => (Number(b.year) || -Infinity) - (Number(a.year) || -Infinity));
        } else if (sort === 'year_asc') {
            // Oldest first; records without a year still sink to the bottom.
            sorted.sort((a, b) => (Number(a.year) || Infinity) - (Number(b.year) || Infinity));
        } else if (sort === 'rating_desc') {
            // Highest rated first; unrated records sink to the bottom.
            sorted.sort((a, b) => (b.rating ?? -Infinity) - (a.rating ?? -Infinity));
        }
        return sorted;
    }, [vinyls, activeGenre, activeCondition, sort]);

    return { sort, setSort, activeGenre, setActiveGenre, activeCondition, setActiveCondition, genres, conditions, visible };
}

/** The subset of page props a filter reload needs the server to send back. */
const PARTIAL_PROPS = ['vinyls', 'search', 'sort', 'genre', 'condition', 'genres', 'conditions'];

/**
 * Drives all of the toolbar controls against a server-filtered, server-paginated
 * endpoint. Search, sort, genre and condition each push their params to `url`
 * via Inertia and the page reloads with freshly filtered, paginated results;
 * the search term is debounced (~300ms) while the selects fire immediately. Any
 * control change resets to page one (the request omits `page`), and every visit
 * preserves component state and scroll so the grid swaps in place. Shared by the
 * collection and wishlist pages, which differ only in their endpoint.
 */
export function useVinylQuery(url: string, state: FilterState) {
    const [query, setQuery] = useState(state.search);
    const [sort, setSort] = useState<SortKey>(state.sort);
    const [activeGenre, setActiveGenre] = useState<string | null>(state.genre);
    const [activeCondition, setActiveCondition] = useState<string | null>(state.condition);
    // True while a filter request is in flight — drives the loading skeletons so
    // the grid doesn't sit on stale results (preserveState keeps the old list
    // mounted until the response lands).
    const [loading, setLoading] = useState(false);

    // Fire a filtered reload. Overrides let a control apply its brand-new value
    // in the same tick its state setter runs (state hasn't re-rendered yet).
    const reload = (overrides: Partial<Pick<FilterState, 'search' | 'sort' | 'genre' | 'condition'>> = {}) => {
        const next = { search: query.trim(), sort, genre: activeGenre, condition: activeCondition, ...overrides };
        const params: Record<string, string> = {};
        if (next.search) params.search = next.search;
        // Always send the sort once the user has touched a control. The server
        // falls back to the user's default_sort preference only when NO sort
        // param is present (the clean initial load), so an explicit choice —
        // including 'recent' — must be sent to override a non-recent default.
        params.sort = next.sort;
        if (next.genre) params.genre = next.genre;
        if (next.condition) params.condition = next.condition;

        router.get(url, params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: PARTIAL_PROPS,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    };

    // Debounce only the free-text search; skip while already in sync with the
    // server (initial mount or a just-completed request). Trimmed compare to
    // match the backend's echoed term.
    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed === state.search) return;
        const id = setTimeout(() => reload({ search: trimmed }), 300);
        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    // The selects reload immediately — no debounce.
    const onSortChange = (value: SortKey) => {
        setSort(value);
        reload({ sort: value });
    };
    const onGenreChange = (value: string | null) => {
        setActiveGenre(value);
        reload({ genre: value });
    };
    const onConditionChange = (value: string | null) => {
        setActiveCondition(value);
        reload({ condition: value });
    };

    const isSearching = query.trim().length > 0;
    const isFiltered = isSearching || activeGenre !== null || activeCondition !== null;

    /** Reset every control and reload the unfiltered first page. */
    const clearAll = () => {
        setQuery('');
        setSort('recent');
        setActiveGenre(null);
        setActiveCondition(null);
        reload({ search: '', sort: 'recent', genre: null, condition: null });
    };

    return {
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
    };
}

/**
 * Pagination controls for a paginated vinyl list. Renders nothing for a single
 * page. Follows Laravel's `links` array — which already carries the active query
 * string, so paging keeps the current search/sort/filters — navigating via
 * Inertia with state/scroll preserved. Styled to match the warm dark shelf.
 */
export function Pagination({ paginator }: { paginator: Paginated<unknown> }) {
    const { current_page, last_page, prev_page_url, next_page_url, links } = paginator;

    if (last_page <= 1) return null;

    const go = (target: string | null) => {
        if (!target) return;
        router.get(target, {}, { preserveState: true, preserveScroll: true, only: PARTIAL_PROPS });
    };

    // The middle of Laravel's links array is the numbered window (with "..."
    // gaps); the first/last entries are Previous/Next, which we render as arrows.
    const numbered = links.filter((l) => /^\d+$/.test(l.label) || l.label === '...');

    const arrow = (label: string, icon: string, target: string | null) => (
        <Button variant="ghost" size="sm" icon={icon} disabled={!target} onClick={() => go(target)}>
            {label}
        </Button>
    );

    return (
        <nav
            aria-label="Pagination"
            className="mt-8 flex flex-wrap items-center justify-center gap-1.5"
        >
            {arrow('Previous', 'chevron-left', prev_page_url)}

            <div className="flex items-center gap-1">
                {numbered.map((link, i) =>
                    link.url === null ? (
                        <span key={`gap-${i}`} className="px-2 text-sm text-zinc-500">
                            …
                        </span>
                    ) : (
                        <button
                            key={link.label}
                            type="button"
                            onClick={() => go(link.url)}
                            aria-current={link.active ? 'page' : undefined}
                            className={
                                link.active
                                    ? 'grid h-8 min-w-8 place-items-center rounded-lg bg-amber-500 px-2 text-sm font-semibold text-zinc-950'
                                    : 'grid h-8 min-w-8 place-items-center rounded-lg px-2 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                            }
                        >
                            {link.label}
                        </button>
                    ),
                )}
            </div>

            {arrow('Next', 'chevron-right', next_page_url)}

            <Text as="span" size="xs" color="muted" className="ml-2 w-full text-center sm:ml-3 sm:w-auto">
                Page {current_page} of {last_page}
            </Text>
        </nav>
    );
}
