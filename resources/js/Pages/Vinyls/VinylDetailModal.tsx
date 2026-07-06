import { router } from '@inertiajs/react';
import { Badge, Button, Heading, Icon, Modal, Skeleton, Text } from '@particle-academy/react-fancy';
import { useEffect, useRef, useState } from 'react';
import { fetchAlbumTracks, findAlbumByTitleArtist, type ItunesTrack } from '../../services/itunes';
import { conditionColor } from './Index';

/** Neutral fallback disc color when a record has none stored. */
const DEFAULT_DISC_COLOR = '#1a1a1a';

/** Format an iTunes trackTimeMillis value as m:ss (e.g. 214000 -> "3:34"). */
function formatDuration(ms: number): string {
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** The vinyl shape shown in the detail view. */
export type DetailVinyl = {
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
 * A small disc swatch standing in for the physical record — mirrors the disc
 * that peeks out from the collection cards, shrunk to metadata-row size.
 */
function DiscSwatch({ color }: { color: string }) {
    return (
        <span className="inline-flex items-center gap-2">
            <span
                className="relative grid h-6 w-6 place-items-center rounded-full shadow-sm shadow-black/40 ring-1 ring-black/40"
                style={{ backgroundColor: color }}
            >
                {/* Darker center label + spindle hole. */}
                <span
                    className="grid h-2.5 w-2.5 place-items-center rounded-full ring-1 ring-black/30"
                    style={{ backgroundColor: color, filter: 'brightness(0.55)' }}
                >
                    <span className="h-[3px] w-[3px] rounded-full bg-zinc-950 ring-1 ring-white/10" />
                </span>
            </span>
            <Text as="span" size="xs" color="muted" className="font-mono uppercase tracking-wide">
                {color}
            </Text>
        </span>
    );
}

/** Five stars with the first `value` filled — read-only rating display. */
function StarRating({ value }: { value: number }) {
    return (
        <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((star) => (
                <Icon
                    key={star}
                    name="star"
                    size="sm"
                    className={star <= value ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}
                />
            ))}
        </span>
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

    // Tracklist state — resolved lazily from iTunes when the detail opens.
    const [tracks, setTracks] = useState<ItunesTrack[]>([]);
    const [tracksLoading, setTracksLoading] = useState(false);
    const [tracksUnavailable, setTracksUnavailable] = useState(false);
    // trackId of the preview currently playing, or null when nothing is playing.
    const [playingId, setPlayingId] = useState<number | null>(null);

    // One shared <audio> element drives every preview; playing a new track
    // reuses it, which implicitly stops whatever was playing before.
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Reset the confirm state whenever a different record is opened / closed.
    useEffect(() => {
        setConfirming(false);
        setDeleting(false);
    }, [vinyl]);

    // Resolve the album's iTunes tracklist whenever the detail opens for a
    // record. Vinyls don't store a collectionId, so we first search iTunes by
    // title + artist to find one, then fetch that album's songs. The cleanup
    // stops any playing preview when the modal closes or the record changes.
    useEffect(() => {
        if (!open || !vinyl) return;

        let cancelled = false;
        setTracks([]);
        setTracksUnavailable(false);
        setTracksLoading(true);
        setPlayingId(null);

        (async () => {
            const album = await findAlbumByTitleArtist(vinyl.title, vinyl.artist);
            if (cancelled) return;

            if (!album) {
                setTracksUnavailable(true);
                setTracksLoading(false);
                return;
            }

            const found = await fetchAlbumTracks(album.collectionId);
            if (cancelled) return;

            setTracks(found);
            setTracksUnavailable(found.length === 0);
            setTracksLoading(false);
        })();

        return () => {
            cancelled = true;
            audioRef.current?.pause();
            setPlayingId(null);
        };
    }, [open, vinyl]);

    /** Toggle playback for a track through the shared audio element. */
    const togglePlay = (track: ItunesTrack) => {
        const audio = audioRef.current;
        if (!audio || !track.previewUrl) return;

        if (playingId === track.trackId) {
            audio.pause();
            setPlayingId(null);
            return;
        }

        audio.src = track.previewUrl;
        audio.play()
            .then(() => setPlayingId(track.trackId))
            .catch(() => setPlayingId(null));
    };

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
                <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
                    <Text as="span" size="lg" weight="semibold" className="text-zinc-900 dark:text-zinc-100">
                        Record Details
                    </Text>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 dark:text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200"
                    >
                        <Icon name="x" size="sm" />
                    </button>
                </div>

                {/* Content — cover beside metadata (stacks on narrow screens) */}
                <div className="px-6 py-6">
                    <div className="flex flex-col gap-6 sm:flex-row">
                    {/* Large-but-bounded cover art */}
                    <div className="mx-auto w-full max-w-[16rem] shrink-0 sm:mx-0 sm:w-56">
                        <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-950 shadow-xl shadow-black/40 ring-1 ring-zinc-200 dark:ring-zinc-800">
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
                            <Heading as="h2" size="xl" weight="bold" className="text-zinc-900 dark:text-zinc-100">
                                {vinyl.title}
                            </Heading>
                            <Text as="p" size="md" color="muted" className="mt-1">
                                {vinyl.artist}
                            </Text>
                        </div>

                        <div className="space-y-2.5">
                            <MetaRow label="Year">
                                {vinyl.year && (
                                    <Text as="span" size="sm" className="font-mono text-amber-600 dark:text-amber-500/90">
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

                            <MetaRow label="Disc">
                                <DiscSwatch color={vinyl.color || DEFAULT_DISC_COLOR} />
                            </MetaRow>

                            <MetaRow label="Rating">
                                {vinyl.rating != null && <StarRating value={vinyl.rating} />}
                            </MetaRow>
                        </div>
                    </div>
                    </div>

                    {/* Personal notes — only shown when the record has any. */}
                    {vinyl.notes && (
                        <div className="mt-6 border-t border-zinc-200/70 dark:border-zinc-800/70 pt-4">
                            <Text as="span" size="xs" color="muted" className="uppercase tracking-wide">
                                Notes
                            </Text>
                            <Text as="p" size="sm" className="mt-1 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                                {vinyl.notes}
                            </Text>
                        </div>
                    )}

                    {/* Tracklist — previews resolved from iTunes on open. The list
                        scrolls internally so it never grows the non-scrolling Modal. */}
                    <div className="mt-6 border-t border-zinc-200/70 dark:border-zinc-800/70 pt-4">
                        <Text as="span" size="xs" color="muted" className="uppercase tracking-wide">
                            Tracklist
                        </Text>

                        {tracksLoading ? (
                            // Skeleton rows matching the tracklist layout (number ·
                            // title · duration · play control) so the list settles
                            // in place instead of flashing a spinner then popping.
                            <ol className="mt-2 space-y-0.5" aria-hidden>
                                {['w-2/3', 'w-1/2', 'w-3/4', 'w-2/5', 'w-3/5', 'w-1/2'].map((w, i) => (
                                    <li key={i} className="flex items-center gap-3 px-2 py-1.5">
                                        <Skeleton className="h-3 w-4 rounded bg-zinc-200 dark:bg-zinc-800/80" />
                                        <div className="min-w-0 flex-1">
                                            <Skeleton className={`h-3.5 rounded bg-zinc-200 dark:bg-zinc-800/80 ${w}`} />
                                        </div>
                                        <Skeleton className="h-3 w-8 rounded bg-zinc-200 dark:bg-zinc-800/80" />
                                        <Skeleton shape="circle" className="h-7 w-7 bg-zinc-200 dark:bg-zinc-800/80" />
                                    </li>
                                ))}
                            </ol>
                        ) : tracksUnavailable ? (
                            <Text as="p" size="sm" className="mt-1 text-zinc-600">
                                Track preview unavailable.
                            </Text>
                        ) : (
                            <ol className="mt-2 max-h-48 space-y-0.5 overflow-y-auto pr-1">
                                {tracks.map((track) => {
                                    const isPlaying = playingId === track.trackId;
                                    const hasPreview = Boolean(track.previewUrl);
                                    return (
                                        <li
                                            key={track.trackId}
                                            className={`flex items-center gap-3 rounded-md px-2 py-1.5 transition ${
                                                isPlaying ? 'bg-amber-500/10' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                                            }`}
                                        >
                                            <Text
                                                as="span"
                                                size="xs"
                                                className={`w-5 shrink-0 text-right font-mono ${
                                                    isPlaying ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-600'
                                                }`}
                                            >
                                                {track.trackNumber || '–'}
                                            </Text>
                                            <Text
                                                as="span"
                                                size="sm"
                                                className={`min-w-0 flex-1 truncate ${
                                                    isPlaying ? 'text-amber-700 dark:text-amber-200' : 'text-zinc-800 dark:text-zinc-200'
                                                }`}
                                            >
                                                {track.trackName}
                                            </Text>
                                            <Text as="span" size="xs" className="shrink-0 font-mono text-zinc-500">
                                                {formatDuration(track.trackTimeMillis)}
                                            </Text>
                                            <button
                                                type="button"
                                                onClick={() => togglePlay(track)}
                                                disabled={!hasPreview}
                                                aria-label={
                                                    !hasPreview
                                                        ? `No preview for ${track.trackName}`
                                                        : isPlaying
                                                          ? `Pause ${track.trackName}`
                                                          : `Play ${track.trackName}`
                                                }
                                                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition ${
                                                    isPlaying
                                                        ? 'bg-amber-500 text-zinc-950'
                                                        : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-200'
                                                } disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent`}
                                            >
                                                <Icon name={isPlaying ? 'pause' : 'play'} size="sm" />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </div>
                </div>

                {/* Shared audio element — a single source for every track preview. */}
                <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />

                {/* Footer — reuses the Index edit/delete flows */}
                <div className="flex shrink-0 items-center justify-between gap-2 border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
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
