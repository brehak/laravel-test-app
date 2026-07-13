import { router } from '@inertiajs/react';
import { Badge, Button, Card, Heading, Icon, Text } from '@particle-academy/react-fancy';
import { useState } from 'react';
import { conditionColor, type Vinyl } from './filters';

/** Neutral fallback disc color when a record has none stored. */
const DEFAULT_DISC_COLOR = '#1a1a1a';

/**
 * The physical record disc that peeks out from behind the cover on the right.
 * Sits behind the cover art (lower stacking) so only its right edge shows, and
 * slides further out on card hover — as if pulled from its sleeve.
 */
function VinylDisc({ color }: { color: string }) {
    return (
        // Outer wrapper owns ONLY the slide. On hover the disc pulls further out
        // of the sleeve with a weighty ease-out (easeOutQuint bezier) so it
        // "settles" instead of moving linearly. Transform-only + pointer-events
        // off keeps it cheap and out of the way of the card's own controls.
        <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-0 z-0 aspect-square w-[92%] -translate-y-1/2 translate-x-[12%] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-[42%]"
        >
            {/* Soft shadow pad sitting a hair below the disc. It deepens and drops
                as the record lifts out, reading as depth behind the sleeve. Kept
                on its own (non-rotating) layer so the lift stays directional. */}
            <div className="absolute inset-0 translate-y-1 rounded-full shadow-[0_10px_24px_rgba(0,0,0,0.55)] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-2.5 group-hover:shadow-[0_18px_44px_rgba(0,0,0,0.85)]" />

            {/* The disc face. It spins slowly like a record on a platter — the
                animation is always applied but paused, and only *runs* on hover,
                so it resumes from its last angle (no snap) and freezes when the
                card is left. Pure CSS rotate transform: smooth, no layout work. */}
            <div
                className="relative h-full w-full rounded-full ring-1 ring-black/40 [animation-play-state:paused] animate-[spin_9s_linear_infinite] group-hover:[animation-play-state:running]"
                style={{ backgroundColor: color }}
            >
                {/* Faint concentric grooves + a soft top-left sheen. The grooves
                    are radially symmetric, so they read as a spinning record
                    without shimmering as the disc rotates. */}
                <div
                    className="absolute inset-0 rounded-full"
                    style={{
                        backgroundImage:
                            'repeating-radial-gradient(circle at center, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1.5px, transparent 1.5px, transparent 7px), radial-gradient(circle at 32% 28%, rgba(255,255,255,0.28), transparent 55%)',
                    }}
                />
                {/* Center label — tinted toward a darker shade of the disc color. */}
                <div
                    className="absolute top-1/2 left-1/2 h-1/3 w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-black/30"
                    style={{ backgroundColor: color, filter: 'brightness(0.55)' }}
                >
                    {/* A couple of faint label rings for a bit more record detail. */}
                    <div className="absolute top-1/2 left-1/2 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-black/25" />
                    {/* Spindle hole. */}
                    <div className="absolute top-1/2 left-1/2 h-1/4 w-1/4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-950 ring-1 ring-white/10" />
                </div>
            </div>
        </div>
    );
}

type VinylCardProps = {
    vinyl: Vinyl;
    /**
     * Which shelf the card lives on. Only the actions differ between variants:
     * - `collection`: clickable card that opens the detail view, with hover
     *   edit / delete controls over the cover.
     * - `wishlist`: a "Mark as owned" button in the body that moves the record
     *   into the collection (wishlist → collection). There is deliberately no
     *   collection → wishlist action: if it's in the collection, you own it.
     * - `public`: fully read-only — no click target, no hover controls, no
     *   actions. Used on the public shareable collection page.
     * The disc animation and card styling are identical across all three.
     */
    variant: 'collection' | 'wishlist' | 'public';
    /** Open the detail view (collection only). */
    onOpen?: (vinyl: Vinyl) => void;
    /** Open the edit modal (collection only). */
    onEdit?: (vinyl: Vinyl) => void;
};

/**
 * A single record card, shared by the collection and wishlist pages so the two
 * never drift apart. The disc, cover, and body layout are identical; the
 * `variant` prop swaps only the per-shelf actions.
 */
export function VinylCard({ vinyl, variant, onOpen, onEdit }: VinylCardProps) {
    // Two-step delete: first click arms the inline "Are you sure?" confirm,
    // second click actually fires the request. (Collection only.)
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [moving, setMoving] = useState(false);

    const isCollection = variant === 'collection';

    // Move a wishlist record into the collection by flipping its owned flag
    // (wishlist → collection only — the collection has no move-to-wishlist
    // action). The list re-fetches, so the card drops away on success.
    const toggleOwned = (e?: React.MouseEvent) => {
        e?.stopPropagation();
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
            {...(isCollection
                ? {
                      role: 'button' as const,
                      tabIndex: 0,
                      'aria-label': `View ${vinyl.title} by ${vinyl.artist}`,
                      onClick: () => onOpen?.(vinyl),
                      onKeyDown: (e: React.KeyboardEvent) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onOpen?.(vinyl);
                          }
                      },
                  }
                : {})}
            className={
                'group relative z-0 overflow-visible border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900 transition-all duration-300 ease-out hover:z-20 hover:-translate-y-1.5 hover:border-amber-500/30 hover:shadow-2xl hover:shadow-black/50' +
                (isCollection
                    ? ' cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60'
                    : '')
            }
        >
            {/* Cover + disc live together; the disc peeks out behind the cover. */}
            <div className="relative">
                {/* The record disc, behind the cover (z-0), edge showing on the right. */}
                <VinylDisc color={vinyl.color || DEFAULT_DISC_COLOR} />

                {/* Cover art carries the visual weight; sits above the disc (z-10). */}
                <div className="relative z-10 aspect-square overflow-hidden rounded-t-lg bg-zinc-100 dark:bg-zinc-950">
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

                    {/* Edit / delete controls — surface on hover (and focus).
                        Collection only. */}
                    {isCollection && (
                        <div className="absolute left-2 top-2 flex items-center gap-1.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                            <button
                                type="button"
                                onClick={(e) => {
                                    // Keep the edit control from also opening the detail view.
                                    e.stopPropagation();
                                    onEdit?.(vinyl);
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
                    )}

                    {/* Warm gradient scrim so overlaid text stays legible */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
            </div>

            <Card.Body className="space-y-1 p-4">
                <div className="flex items-start justify-between gap-2">
                    <Heading as="h3" size="sm" weight="semibold" className="line-clamp-1 text-zinc-900 dark:text-zinc-100">
                        {vinyl.title}
                    </Heading>
                    {vinyl.year && (
                        <Text as="span" size="xs" className="mt-0.5 shrink-0 font-mono text-amber-600 dark:text-amber-500/80">
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

                {/* Wishlist action: move the record into the collection. Never
                    shown on the read-only public variant. */}
                {variant === 'wishlist' && (
                    <Button
                        color="amber"
                        size="sm"
                        icon={moving ? 'loader-2' : 'check'}
                        loading={moving}
                        onClick={toggleOwned}
                        className="mt-2 w-full"
                    >
                        Mark as owned
                    </Button>
                )}
            </Card.Body>
        </Card>
    );
}
