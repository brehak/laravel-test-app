import { router } from '@inertiajs/react';
import { Badge, Button, Field, Icon, Input, Modal, Select, Text } from '@particle-academy/react-fancy';
import { useEffect, useRef, useState } from 'react';
import {
    fetchAlbumsByArtist,
    getHighResArtwork,
    searchArtists,
    type ItunesAlbum,
    type ItunesArtist,
} from '@/services/itunes';

/** Grades offered for a record's condition, best → worst. */
const CONDITIONS = ['Mint', 'Near Mint', 'VG+', 'VG', 'Good', 'Fair', 'Poor'];

type VinylForm = {
    title: string;
    artist: string;
    image: string;
    genre: string[];
    year: string;
    condition: string;
};

const EMPTY_FORM: VinylForm = {
    title: '',
    artist: '',
    image: '',
    genre: [],
    year: '',
    condition: '',
};

/** Pull a 4-digit year out of an ISO release date, if present. */
function yearOf(releaseDate: string): string {
    const match = releaseDate.match(/^(\d{4})/);
    return match ? match[1] : '';
}

type Props = {
    open: boolean;
    onClose: () => void;
};

export function AddVinylModal({ open, onClose }: Props) {
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

    // Debounced artist search. A per-run `active` flag drops stale responses
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

    const canSave = form.title.trim().length > 0 && form.artist.trim().length > 0;

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
            },
            {
                preserveScroll: true,
                onSuccess: () => close(),
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <Modal open={open} onClose={close} size="lg">
            <Modal.Header>Add Vinyl</Modal.Header>

            <Modal.Body className="space-y-5">
                {/* --- Artist search ---------------------------------- */}
                {!selectedArtist ? (
                    <div>
                        <Input
                            label="Search artist"
                            type="search"
                            placeholder="Start typing an artist name…"
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
                            <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900/60">
                                {searchingArtists && artists.length === 0 ? (
                                    <div className="flex items-center gap-2 px-3 py-3 text-zinc-400">
                                        <Icon name="loader-2" size="sm" className="animate-spin" />
                                        <Text as="span" size="sm">Searching…</Text>
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
                            <Button variant="ghost" size="xs" icon="chevron-left" onClick={changeArtist}>
                                Change artist
                            </Button>
                        </div>

                        <div className="max-h-56 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900/60">
                            {loadingAlbums ? (
                                <div className="flex items-center gap-2 px-3 py-3 text-zinc-400">
                                    <Icon name="loader-2" size="sm" className="animate-spin" />
                                    <Text as="span" size="sm">Loading albums…</Text>
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
                    </div>
                )}

                {/* --- Details ---------------------------------------- */}
                <div className="flex gap-4">
                    {/* Cover preview */}
                    <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                        {form.image ? (
                            <img src={form.image} alt="Selected cover" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-zinc-700">
                                <Icon name="disc-3" size="lg" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 space-y-3">
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
                            placeholder={form.genre.length ? 'Add another…' : 'e.g. Jazz, Soul, Funk'}
                            className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                        />
                    </div>
                </Field>

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
            </Modal.Body>

            <Modal.Footer>
                <Button variant="ghost" onClick={close} disabled={saving}>
                    Cancel
                </Button>
                <Button color="amber" icon="plus" onClick={save} loading={saving} disabled={!canSave}>
                    Save Vinyl
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
