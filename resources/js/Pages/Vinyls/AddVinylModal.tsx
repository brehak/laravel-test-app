import { router } from '@inertiajs/react';
import { Badge, Button, ColorPicker, Field, Icon, Input, Modal, Select, Text } from '@particle-academy/react-fancy';
import { useEffect, useMemo, useState } from 'react';
import {
    fetchAlbumsByArtist,
    getHighResArtwork,
    searchArtists,
    type ItunesAlbum,
    type ItunesArtist,
} from '@/services/itunes';

/** Grades offered for a record's condition, best -> worst. */
const CONDITIONS = ['Mint', 'Near Mint', 'VG+', 'VG', 'Good', 'Fair', 'Poor'];

/** Neutral default disc color — classic black — used when none is chosen. */
const DEFAULT_COLOR = '#1a1a1a';

/** A few common pressing colors offered as quick swatches in the picker. */
const COLOR_PRESETS = [
    '#1a1a1a', // classic black
    '#E4572E', // orange crush
    '#D62246', // red
    '#2E86AB', // blue
    '#3A7D44', // green
    '#F2C14E', // yellow
    '#7B4B94', // purple
    '#F5F0E6', // cream / white
];

type VinylForm = {
    title: string;
    artist: string;
    image: string;
    genre: string[];
    year: string;
    condition: string;
    color: string;
};

const EMPTY_FORM: VinylForm = {
    title: '',
    artist: '',
    image: '',
    genre: [],
    year: '',
    condition: '',
    color: DEFAULT_COLOR,
};

/** Pull a 4-digit year out of an ISO release date, if present. */
function yearOf(releaseDate: string): string {
    const match = releaseDate.match(/^(\d{4})/);
    return match ? match[1] : '';
}

/** Minimal shape needed to spot a likely duplicate in the existing collection. */
export type ExistingVinyl = {
    title: string;
    artist: string;
};

type Props = {
    open: boolean;
    onClose: () => void;
    /** The user's current collection, used for gentle duplicate detection. */
    existingVinyls?: ExistingVinyl[];
    /**
     * Whether records created here land in the owned collection. Defaults to
     * true so the collection's Add flow is unchanged; the wishlist passes
     * `false` so new records go to the wishlist instead.
     */
    owned?: boolean;
};

export function AddVinylModal({ open, onClose, existingVinyls = [], owned = true }: Props) {
    // --- iTunes search state -------------------------------------------
    const [term, setTerm] = useState('');
    const [artists, setArtists] = useState<ItunesArtist[]>([]);
    const [searchingArtists, setSearchingArtists] = useState(false);

    const [selectedArtist, setSelectedArtist] = useState<ItunesArtist | null>(null);
    const [albums, setAlbums] = useState<ItunesAlbum[]>([]);
    const [loadingAlbums, setLoadingAlbums] = useState(false);
    const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);

    // --- Form state ----------------------------------------------------
    const [form, setForm] = useState<VinylForm>(EMPTY_FORM);
    const [genreDraft, setGenreDraft] = useState('');
    const [saving, setSaving] = useState(false);

    const setField = <K extends keyof VinylForm>(key: K, value: VinylForm[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    // Debounced artist search. A per-run active flag drops stale responses
    // so a slow earlier request can't clobber a newer one.
    useEffect(() => {
        const query = term.trim();
        if (!query) {
            setArtists([]);
            setSearchingArtists(false);
            return;
        }

        setSearchingArtists(true);
        let active = true;
        const timer = setTimeout(async () => {
            const results = await searchArtists(query);
            if (active) {
                setArtists(results);
                setSearchingArtists(false);
            }
        }, 400);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [term]);

    const reset = () => {
        setTerm('');
        setArtists([]);
        setSearchingArtists(false);
        setSelectedArtist(null);
        setAlbums([]);
        setLoadingAlbums(false);
        setSelectedAlbumId(null);
        setForm(EMPTY_FORM);
        setGenreDraft('');
        setSaving(false);
    };

    const close = () => {
        reset();
        onClose();
    };

    const pickArtist = async (artist: ItunesArtist) => {
        setSelectedArtist(artist);
        setArtists([]);
        setField('artist', artist.artistName);
        setLoadingAlbums(true);
        const results = await fetchAlbumsByArtist(artist.artistId);
        setAlbums(results);
        setLoadingAlbums(false);
    };

    const changeArtist = () => {
        setSelectedArtist(null);
        setAlbums([]);
        setSelectedAlbumId(null);
    };

    // Clears the current album pick so the full list reappears for reselection.
    const changeAlbum = () => setSelectedAlbumId(null);

    const pickAlbum = (album: ItunesAlbum) => {
        setSelectedAlbumId(album.collectionId);
        setForm((prev) => ({
            ...prev,
            title: album.collectionName,
            artist: album.artistName || prev.artist,
            image: getHighResArtwork(album.artworkUrl100, 600),
            year: yearOf(album.releaseDate) || prev.year,
        }));
    };

    const addGenre = () => {
        const value = genreDraft.trim();
        if (!value) return;
        setForm((prev) =>
            prev.genre.includes(value) ? prev : { ...prev, genre: [...prev.genre, value] },
        );
        setGenreDraft('');
    };

    const removeGenre = (value: string) =>
        setField('genre', form.genre.filter((g) => g !== value));

    const selectedAlbum = albums.find((a) => a.collectionId === selectedAlbumId) ?? null;

    const canSave = form.title.trim().length > 0 && form.artist.trim().length > 0;

    // Gentle duplicate detection: once both title + artist are filled (via iTunes
    // autofill or manual entry), look for an existing record with the same
    // title AND artist, compared case-insensitively and trimmed. This only
    // warns — it never blocks saving, since collectors may own multiple pressings.
    const duplicate = useMemo(() => {
        const title = form.title.trim().toLowerCase();
        const artist = form.artist.trim().toLowerCase();
        if (!title || !artist) return null;
        return (
            existingVinyls.find(
                (v) =>
                    v.title.trim().toLowerCase() === title &&
                    v.artist.trim().toLowerCase() === artist,
            ) ?? null
        );
    }, [form.title, form.artist, existingVinyls]);

    const save = () => {
        if (!canSave || saving) return;
        setSaving(true);
        router.post(
            '/vinyls',
            {
                title: form.title,
                artist: form.artist,
                image: form.image || null,
                genre: form.genre,
                year: form.year || null,
                condition: form.condition || null,
                color: form.color || DEFAULT_COLOR,
                // Routes the record to the collection (true) or wishlist (false).
                owned,
            },
            {
                preserveScroll: true,
                onSuccess: () => close(),
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <Modal open={open} onClose={close} size="full" className="max-w-3xl">
            <div className="flex flex-col">
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-6 py-4">
                    <Text as="span" size="lg" weight="semibold" className="text-zinc-100">
                        Add Vinyl
                    </Text>
                    <button
                        type="button"
                        onClick={close}
                        aria-label="Close"
                        className="grid h-8 w-8 place-items-center rounded-md text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
                    >
                        <Icon name="x" size="sm" />
                    </button>
                </div>

                {/* Content - everything visible, no scrolling needed */}
                <div className="space-y-5 px-6 py-5">
                    {/* --- Artist search ---------------------------------- */}
                    {!selectedArtist ? (
                        <div>
                            <Input
                                label="Search artist"
                                type="search"
                                placeholder="Start typing an artist name..."
                                value={term}
                                onValueChange={setTerm}
                                leading={<Icon name="search" size="sm" />}
                                trailing={
                                    searchingArtists ? (
                                        <Icon name="loader-2" size="sm" className="animate-spin text-amber-500" />
                                    ) : undefined
                                }
                            />

                            {term.trim() && (
                                <div className="mt-2 h-72 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900/60">
                                    {searchingArtists && artists.length === 0 ? (
                                        <div className="flex items-center gap-2 px-3 py-3 text-zinc-400">
                                            <Icon name="loader-2" size="sm" className="animate-spin" />
                                            <Text as="span" size="sm">Searching...</Text>
                                        </div>
                                    ) : artists.length === 0 ? (
                                        <div className="px-3 py-3">
                                            <Text as="span" size="sm" color="muted">No artists found.</Text>
                                        </div>
                                    ) : (
                                        artists.map((artist) => (
                                            <button
                                                key={artist.artistId}
                                                type="button"
                                                onClick={() => pickArtist(artist)}
                                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-200 transition hover:bg-amber-500/10 hover:text-amber-300"
                                            >
                                                <Icon name="user" size="sm" className="text-zinc-500" />
                                                {artist.artistName}
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <Text as="span" size="sm" color="muted">
                                    Albums by <span className="text-zinc-200">{selectedArtist.artistName}</span>
                                </Text>
                                {selectedAlbum ? (
                                    <Button variant="ghost" size="xs" icon="chevron-left" onClick={changeAlbum}>
                                        Change album
                                    </Button>
                                ) : (
                                    <Button variant="ghost" size="xs" icon="chevron-left" onClick={changeArtist}>
                                        Change artist
                                    </Button>
                                )}
                            </div>

                            {selectedAlbum ? (
                                /* Compact summary once an album is chosen — frees space for the form. */
                                <div className="flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                                    {selectedAlbum.artworkUrl100 ? (
                                        <img
                                            src={selectedAlbum.artworkUrl100}
                                            alt=""
                                            className="h-10 w-10 shrink-0 rounded object-cover"
                                        />
                                    ) : (
                                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-zinc-800 text-zinc-600">
                                            <Icon name="disc-3" size="sm" />
                                        </span>
                                    )}
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm text-amber-200">
                                            {selectedAlbum.collectionName}
                                        </span>
                                        {yearOf(selectedAlbum.releaseDate) && (
                                            <span className="block font-mono text-xs text-zinc-500">
                                                {yearOf(selectedAlbum.releaseDate)}
                                            </span>
                                        )}
                                    </span>
                                    <Icon name="check" size="sm" className="shrink-0 text-amber-300" />
                                </div>
                            ) : (
                                <div className="h-72 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900/60">
                                    {loadingAlbums ? (
                                        <div className="flex items-center gap-2 px-3 py-3 text-zinc-400">
                                            <Icon name="loader-2" size="sm" className="animate-spin" />
                                            <Text as="span" size="sm">Loading albums...</Text>
                                        </div>
                                    ) : albums.length === 0 ? (
                                        <div className="px-3 py-3">
                                            <Text as="span" size="sm" color="muted">No albums found for this artist.</Text>
                                        </div>
                                    ) : (
                                        albums.map((album) => {
                                            const active = album.collectionId === selectedAlbumId;
                                            return (
                                                <button
                                                    key={album.collectionId}
                                                    type="button"
                                                    onClick={() => pickAlbum(album)}
                                                    className={`flex w-full items-center gap-3 px-3 py-2 text-left transition ${
                                                        active
                                                            ? 'bg-amber-500/15 text-amber-200'
                                                            : 'text-zinc-200 hover:bg-zinc-800/70'
                                                    }`}
                                                >
                                                    {album.artworkUrl100 ? (
                                                        <img
                                                            src={album.artworkUrl100}
                                                            alt=""
                                                            className="h-10 w-10 shrink-0 rounded object-cover"
                                                        />
                                                    ) : (
                                                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-zinc-800 text-zinc-600">
                                                            <Icon name="disc-3" size="sm" />
                                                        </span>
                                                    )}
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-sm">{album.collectionName}</span>
                                                        {yearOf(album.releaseDate) && (
                                                            <span className="block font-mono text-xs text-zinc-500">
                                                                {yearOf(album.releaseDate)}
                                                            </span>
                                                        )}
                                                    </span>
                                                    {active && <Icon name="check" size="sm" className="shrink-0" />}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- Title / Artist -------------------------------- */}
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Title"
                            required
                            placeholder="Album title"
                            value={form.title}
                            onValueChange={(v) => setField('title', v)}
                        />
                        <Input
                            label="Artist"
                            required
                            placeholder="Artist name"
                            value={form.artist}
                            onValueChange={(v) => setField('artist', v)}
                        />
                    </div>

                    {/* Genre tag input */}
                    <Field label="Genres" description="Type a genre and press Enter.">
                        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-2 focus-within:border-amber-500/60">
                            {form.genre.map((g) => (
                                <Badge key={g} color="stone" variant="soft" size="md" className="gap-1">
                                    {g}
                                    <button
                                        type="button"
                                        onClick={() => removeGenre(g)}
                                        aria-label={`Remove ${g}`}
                                        className="-mr-0.5 grid place-items-center rounded-full text-zinc-400 transition hover:text-rose-400"
                                    >
                                        <Icon name="x" size="xs" />
                                    </button>
                                </Badge>
                            ))}
                            <input
                                value={genreDraft}
                                onChange={(e) => setGenreDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addGenre();
                                    } else if (e.key === 'Backspace' && !genreDraft && form.genre.length > 0) {
                                        removeGenre(form.genre[form.genre.length - 1]);
                                    }
                                }}
                                placeholder={form.genre.length ? 'Add another...' : 'e.g. Jazz, Soul, Funk'}
                                className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                            />
                        </div>
                    </Field>

                    {/* --- Year / Condition ------------------------------ */}
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Year"
                            type="text"
                            inputMode="numeric"
                            placeholder="e.g. 1977"
                            value={form.year}
                            onValueChange={(v) => setField('year', v)}
                        />
                        <Select
                            label="Condition"
                            placeholder="Select condition"
                            list={CONDITIONS}
                            value={form.condition}
                            onValueChange={(v) => setField('condition', v)}
                        />
                    </div>

                    {/* --- Disc color ------------------------------------ */}
                    <Field label="Disc color" description="The color of the physical record.">
                        <ColorPicker
                            value={form.color}
                            onChange={(v) => setField('color', v)}
                            presets={COLOR_PRESETS}
                        />
                    </Field>
                </div>

                {/* Footer */}
                <div className="flex shrink-0 flex-col gap-3 border-t border-zinc-800 px-6 py-4">
                    {/* Gentle duplicate warning — never blocks saving. */}
                    {duplicate && (
                        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-amber-200">
                            <Icon name="info" size="sm" className="mt-0.5 shrink-0 text-amber-400" />
                            <Text as="p" size="sm" className="text-amber-200">
                                You may already own this:{' '}
                                <span className="font-medium text-amber-100">{duplicate.title}</span>
                                {' '}by{' '}
                                <span className="font-medium text-amber-100">{duplicate.artist}</span>. You can still
                                save it if you own multiple pressings.
                            </Text>
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={close} disabled={saving}>
                            Cancel
                        </Button>
                        <Button color="amber" icon="plus" onClick={save} loading={saving} disabled={!canSave}>
                            Save Vinyl
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}