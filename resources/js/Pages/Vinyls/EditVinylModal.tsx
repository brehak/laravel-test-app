import { router } from '@inertiajs/react';
import { Badge, Button, ColorPicker, Field, Icon, Input, Modal, Select, Text, Textarea } from '@particle-academy/react-fancy';
import { useEffect, useState } from 'react';

/** Grades offered for a record's condition, best -> worst. */
const CONDITIONS = ['Mint', 'Near Mint', 'VG+', 'VG', 'Good', 'Fair', 'Poor'];

/** Neutral default disc color — classic black — used when none is set. */
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

/** The persisted vinyl shape this modal edits. */
export type EditableVinyl = {
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

type VinylForm = {
    title: string;
    artist: string;
    image: string;
    genre: string[];
    year: string;
    condition: string;
    color: string;
    rating: number | null;
    notes: string;
};

/** Normalize a nullable persisted vinyl into the modal's editable form shape. */
function toForm(vinyl: EditableVinyl): VinylForm {
    return {
        title: vinyl.title ?? '',
        artist: vinyl.artist ?? '',
        image: vinyl.image ?? '',
        genre: vinyl.genre ?? [],
        year: vinyl.year ?? '',
        condition: vinyl.condition ?? '',
        // Pre-fill from the existing record; fall back to the neutral default.
        color: vinyl.color ?? DEFAULT_COLOR,
        rating: vinyl.rating ?? null,
        notes: vinyl.notes ?? '',
    };
}

type Props = {
    open: boolean;
    vinyl: EditableVinyl | null;
    onClose: () => void;
};

export function EditVinylModal({ open, vinyl, onClose }: Props) {
    const [form, setForm] = useState<VinylForm>(() =>
        vinyl
            ? toForm(vinyl)
            : { title: '', artist: '', image: '', genre: [], year: '', condition: '', color: DEFAULT_COLOR, rating: null, notes: '' },
    );
    const [genreDraft, setGenreDraft] = useState('');
    const [saving, setSaving] = useState(false);

    // Re-seed the form whenever a different vinyl is opened for editing.
    useEffect(() => {
        if (vinyl) {
            setForm(toForm(vinyl));
            setGenreDraft('');
            setSaving(false);
        }
    }, [vinyl]);

    const setField = <K extends keyof VinylForm>(key: K, value: VinylForm[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }));

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
        if (!vinyl || !canSave || saving) return;
        setSaving(true);
        router.put(
            `/vinyls/${vinyl.id}`,
            {
                title: form.title,
                artist: form.artist,
                image: form.image || null,
                genre: form.genre,
                year: form.year || null,
                condition: form.condition || null,
                color: form.color || DEFAULT_COLOR,
                rating: form.rating,
                notes: form.notes.trim() || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => onClose(),
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <Modal open={open} onClose={onClose} size="full" className="max-w-3xl">
            <div className="flex flex-col">
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-6 py-4">
                    <Text as="span" size="lg" weight="semibold" className="text-zinc-100">
                        Edit Vinyl
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

                {/* Content */}
                <div className="space-y-3.5 px-6 py-4">
                    {/* Cover preview + title/artist. The cover image URL is no
                        longer hand-editable — the existing value is preserved in
                        form state and still sent on save, just not shown here. */}
                    <div className="flex gap-4">
                        {form.image ? (
                            <img
                                src={form.image}
                                alt=""
                                className="h-20 w-20 shrink-0 rounded-lg object-cover"
                            />
                        ) : (
                            <span className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-zinc-800 text-zinc-600">
                                <Icon name="disc-3" size="lg" />
                            </span>
                        )}
                        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
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
                        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 focus-within:border-amber-500/60">
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
                    <div className="grid grid-cols-2 gap-3">
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

                    {/* --- Disc color / Rating, paired to save height ---- */}
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Disc color" description="The physical record's color.">
                            <ColorPicker
                                value={form.color}
                                onChange={(v) => setField('color', v)}
                                presets={COLOR_PRESETS}
                            />
                        </Field>

                        <Field label="Rating" description="Your rating, 1–5 stars.">
                            <div className="flex h-9 items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() =>
                                            // Click the current rating again to clear it.
                                            setField('rating', form.rating === star ? null : star)
                                        }
                                        aria-label={`${star} star${star === 1 ? '' : 's'}`}
                                        aria-pressed={form.rating != null && star <= form.rating}
                                        className="grid place-items-center rounded p-0.5 text-zinc-600 transition hover:text-amber-400"
                                    >
                                        <Icon
                                            name="star"
                                            size="md"
                                            className={
                                                form.rating != null && star <= form.rating
                                                    ? 'fill-amber-400 text-amber-400'
                                                    : ''
                                            }
                                        />
                                    </button>
                                ))}
                                {form.rating != null && (
                                    <button
                                        type="button"
                                        onClick={() => setField('rating', null)}
                                        className="ml-1.5 text-xs text-zinc-500 transition hover:text-zinc-300"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </Field>
                    </div>

                    {/* --- Personal notes -------------------------------- */}
                    <Textarea
                        label="Notes"
                        description="Freeform personal notes about this record."
                        placeholder="Anything you want to remember about this pressing..."
                        value={form.notes}
                        onValueChange={(v) => setField('notes', v)}
                        autoResize
                        minRows={2}
                        maxRows={4}
                        maxLength={2000}
                    />
                </div>

                {/* Footer */}
                <div className="flex shrink-0 justify-end gap-2 border-t border-zinc-800 px-6 py-4">
                    <Button variant="ghost" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button color="amber" icon="check" onClick={save} loading={saving} disabled={!canSave}>
                        Save Changes
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
