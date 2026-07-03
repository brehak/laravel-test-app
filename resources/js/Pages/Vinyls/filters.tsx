import { router } from '@inertiajs/react';
import { Icon, Select, Text } from '@particle-academy/react-fancy';
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

/** Sort modes. "default" preserves the incoming (recently-added) order. */
export type SortKey = 'default' | 'title' | 'artist' | 'year-new' | 'year-old' | 'rating';

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: 'default', label: 'Recently added' },
    { value: 'title', label: 'Title (A–Z)' },
    { value: 'artist', label: 'Artist (A–Z)' },
    { value: 'year-new', label: 'Year (newest first)' },
    { value: 'year-old', label: 'Year (oldest first)' },
    { value: 'rating', label: 'Rating (highest first)' },
];

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
                    placeholder={searchPlaceholder}
                    aria-label={searchLabel}
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
 * Client-side genre/condition/sort state plus the derived views over a list of
 * records. Never mutates the incoming array. Search is handled separately (it's
 * server-side and page-specific), so this hook only owns the local narrowing.
 */
export function useVinylFilters(vinyls: Vinyl[]) {
    const [sort, setSort] = useState<SortKey>('default');
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

    /** Reset only the client-side controls (genre + condition). */
    const clearFilters = () => {
        setActiveGenre(null);
        setActiveCondition(null);
    };

    return {
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
    };
}

/**
 * Debounced server-side search bound to a specific Inertia endpoint. Drives the
 * search input while pushing the trimmed term to `url`, which returns the
 * narrowed `vinyls`/`search` props. Shared by the collection and wishlist.
 */
export function useServerSearch(url: string, search: string) {
    const [query, setQuery] = useState(search);
    const isSearching = query.trim().length > 0;

    useEffect(() => {
        const trimmed = query.trim();
        // Already in sync with the server (initial mount, or a just-completed
        // request) — nothing to fetch. Compare trimmed to match the backend.
        if (trimmed === search) return;

        const id = setTimeout(() => {
            router.get(
                url,
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
    }, [query, search, url]);

    return { query, setQuery, isSearching };
}
