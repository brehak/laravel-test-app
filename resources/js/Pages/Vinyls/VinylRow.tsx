import { router } from '@inertiajs/react';
import { Badge, Icon, Text } from '@particle-academy/react-fancy';
import { useState } from 'react';
import { conditionColor, type Vinyl } from './filters';

/** Neutral fallback disc color when a record has none stored. */
const DEFAULT_DISC_COLOR = '#1a1a1a';

/**
 * A single record rendered as a compact horizontal row — the list-view
 * counterpart to {@link VinylCard}. Same collection capabilities (open the
 * detail view, edit, delete) but laid out as a dense row: small cover thumb,
 * then title / artist / year / condition / genre reading left-to-right, with the
 * edit + delete controls pinned to the trailing edge.
 */
export function VinylRow({
    vinyl,
    onOpen,
    onEdit,
}: {
    vinyl: Vinyl;
    onOpen?: (vinyl: Vinyl) => void;
    onEdit?: (vinyl: Vinyl) => void;
}) {
    // Two-step delete, mirroring the card: first click arms the confirm, second
    // click fires the request. The list re-fetches, so the row drops on success.
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const onDeleteClick = (e: React.MouseEvent) => {
        // Don't let the delete control bubble to the row (which opens the detail).
        e.stopPropagation();
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
        <div
            role="button"
            tabIndex={0}
            aria-label={`View ${vinyl.title} by ${vinyl.artist}`}
            onClick={() => onOpen?.(vinyl)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpen?.(vinyl);
                }
            }}
            className="group flex cursor-pointer items-center gap-4 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 transition-colors hover:border-amber-500/30 hover:bg-amber-500/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 dark:border-zinc-800/60 dark:bg-zinc-900 dark:hover:border-amber-500/30"
        >
            {/* Cover thumbnail. */}
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-950">
                {vinyl.image ? (
                    <img
                        src={vinyl.image}
                        alt={`${vinyl.title} by ${vinyl.artist}`}
                        loading="lazy"
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div
                        className="flex h-full w-full items-center justify-center text-zinc-600"
                        style={{ backgroundColor: vinyl.color || DEFAULT_DISC_COLOR }}
                    >
                        <Icon name="disc-3" size="sm" className="opacity-70" />
                    </div>
                )}
            </div>

            {/* Title + artist stack; takes the flexible space. */}
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <Text as="span" size="sm" weight="semibold" className="truncate text-zinc-900 dark:text-zinc-100">
                        {vinyl.title}
                    </Text>
                    {vinyl.year && (
                        <Text as="span" size="xs" className="shrink-0 font-mono text-amber-600 dark:text-amber-500/80">
                            {vinyl.year}
                        </Text>
                    )}
                </div>
                <Text as="p" size="xs" color="muted" className="truncate">
                    {vinyl.artist}
                </Text>
            </div>

            {/* Genre chips — hidden on narrow screens to keep the row tidy. */}
            {vinyl.genre && vinyl.genre.length > 0 && (
                <div className="hidden shrink-0 items-center gap-1 lg:flex">
                    {vinyl.genre.slice(0, 2).map((g) => (
                        <Badge key={g} color="stone" variant="soft" size="sm">
                            {g}
                        </Badge>
                    ))}
                </div>
            )}

            {/* Condition badge. */}
            {vinyl.condition && (
                <div className="hidden shrink-0 sm:block">
                    <Badge color={conditionColor(vinyl.condition)} variant="soft" size="sm">
                        {vinyl.condition}
                    </Badge>
                </div>
            )}

            {/* Trailing actions — always reachable (unlike the card's hover-only
                controls, rows are dense enough that persistent buttons read cleanly). */}
            <div className="flex shrink-0 items-center gap-1">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.(vinyl);
                    }}
                    aria-label={`Edit ${vinyl.title}`}
                    className="grid h-8 w-8 place-items-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-amber-600 dark:hover:bg-zinc-800 dark:hover:text-amber-400"
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
                            : 'grid h-8 w-8 place-items-center rounded-md text-zinc-400 transition hover:bg-rose-600/10 hover:text-rose-600 dark:hover:text-rose-400'
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
        </div>
    );
}
