import { router } from '@inertiajs/react';
import { Badge, Button, Heading, Icon, Modal, Text } from '@particle-academy/react-fancy';
import { useEffect, useState } from 'react';
import { conditionColor } from './Index';

/** The vinyl shape shown in the detail view. */
export type DetailVinyl = {
    id: number;
    title: string;
    artist: string;
    image: string | null;
    genre: string[] | null;
    year: string | null;
    condition: string | null;
};

type Props = {
    open: boolean;
    vinyl: DetailVinyl | null;
    onClose: () => void;
    /** Reuse the Index edit flow — closes detail and opens the edit modal. */
    onEdit: (vinyl: DetailVinyl) => void;
};

/** A labelled metadata row; renders nothing when the value is empty. */
function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
    if (!children) return null;
    return (
        <div className="flex items-baseline gap-3">
            <Text as="span" size="xs" color="muted" className="w-16 shrink-0 uppercase tracking-wide">
                {label}
            </Text>
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}

/**
 * Read-only detail view for a single record. Cover art sits beside the metadata
 * on wider screens and stacks above it on narrow ones — kept compact so the
 * content fits the non-scrolling Modal body.
 */
export function VinylDetailModal({ open, vinyl, onClose, onEdit }: Props) {
    // Two-step delete mirroring the card: first click arms, second click fires.
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Reset the confirm state whenever a different record is opened / closed.
    useEffect(() => {
        setConfirming(false);
        setDeleting(false);
    }, [vinyl]);

    if (!vinyl) return null;

    const onDeleteClick = () => {
        if (!confirming) {
            setConfirming(true);
            return;
        }
        setDeleting(true);
        router.delete(`/vinyls/${vinyl.id}`, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => setDeleting(false),
        });
    };

    return (
        <Modal open={open} onClose={onClose} size="full" className="max-w-2xl">
            <div className="flex flex-col">
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-6 py-4">
                    <Text as="span" size="lg" weight="semibold" className="text-zinc-100">
                        Record Details
                    </Text>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="grid h-8 w-8 place-items-center rounded-md text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
                    >
                        <Icon name="x" size="sm" />
                    </button>
                </div>

                {/* Content — cover beside metadata (stacks on narrow screens) */}
                <div className="flex flex-col gap-6 px-6 py-6 sm:flex-row">
                    {/* Large-but-bounded cover art */}
                    <div className="mx-auto w-full max-w-[16rem] shrink-0 sm:mx-0 sm:w-56">
                        <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-950 shadow-xl shadow-black/40 ring-1 ring-zinc-800">
                            {vinyl.image ? (
                                <img
                                    src={vinyl.image}
                                    alt={`${vinyl.title} by ${vinyl.artist}`}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 via-zinc-900 to-black text-zinc-600">
                                    <Icon name="disc-3" size="xl" className="opacity-60" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1 space-y-4">
                        <div>
                            <Heading as="h2" size="xl" weight="bold" className="text-zinc-100">
                                {vinyl.title}
                            </Heading>
                            <Text as="p" size="md" color="muted" className="mt-1">
                                {vinyl.artist}
                            </Text>
                        </div>

                        <div className="space-y-2.5">
                            <MetaRow label="Year">
                                {vinyl.year && (
                                    <Text as="span" size="sm" className="font-mono text-amber-500/90">
                                        {vinyl.year}
                                    </Text>
                                )}
                            </MetaRow>

                            <MetaRow label="Condition">
                                {vinyl.condition && (
                                    <Badge color={conditionColor(vinyl.condition)} variant="solid" size="sm">
                                        {vinyl.condition}
                                    </Badge>
                                )}
                            </MetaRow>

                            <MetaRow label="Genres">
                                {vinyl.genre && vinyl.genre.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {vinyl.genre.map((g) => (
                                            <Badge key={g} color="stone" variant="soft" size="sm">
                                                {g}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </MetaRow>
                        </div>
                    </div>
                </div>

                {/* Footer — reuses the Index edit/delete flows */}
                <div className="flex shrink-0 items-center justify-between gap-2 border-t border-zinc-800 px-6 py-4">
                    <Button
                        variant="ghost"
                        color="rose"
                        icon={deleting ? 'loader-2' : 'trash-2'}
                        loading={deleting}
                        onClick={onDeleteClick}
                        onBlur={() => setConfirming(false)}
                    >
                        {confirming ? 'Confirm delete' : 'Delete'}
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose}>
                            Close
                        </Button>
                        <Button color="amber" icon="pencil" onClick={() => onEdit(vinyl)}>
                            Edit
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
