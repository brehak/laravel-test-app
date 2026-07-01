import { router } from '@inertiajs/react';
import { Badge, Button, Field, Icon, Input, Modal, Select, Text } from '@particle-academy/react-fancy';
import { useEffect, useState } from 'react';

/** Grades offered for a record's condition, best -> worst. */
const CONDITIONS = ['Mint', 'Near Mint', 'VG+', 'VG', 'Good', 'Fair', 'Poor'];

/** The persisted vinyl shape this modal edits. */
export type EditableVinyl = {
    id: number;
    title: string;
    artist: string;
    image: string | null;
    genre: string[] | null;
    year: string | null;
    condition: string | null;
};

type VinylForm = {
    title: string;
    artist: string;
    image: string;
    genre: string[];
    year: string;
    condition: string;
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
    };
}

type Props = {
    open: boolean;
    vinyl: EditableVinyl | null;
    onClose: () => void;
};

export function EditVinylModal({ open, vinyl, onClose }: Props) {
    const [form, setForm] = useState<VinylForm>(() =>
        vinyl ? toForm(vinyl) : { title: '', artist: '', image: '', genre: [], year: '', condition: '' },
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
                <div className="space-y-5 px-6 py-5">
                    {/* Cover preview + title/artist */}
                    <div className="flex gap-4">
                        {form.image ? (
                            <img
                                src={form.image}
                                alt=""
                                className="h-24 w-24 shrink-0 rounded-lg object-cover"
                            />
                        ) : (
                            <span className="grid h-24 w-24 shrink-0 place-items-center rounded-lg bg-zinc-800 text-zinc-600">
                                <Icon name="disc-3" size="lg" />
                            </span>
                        )}
                        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
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

                    {/* Cover image URL */}
                    <Input
                        label="Cover image URL"
                        placeholder="https://..."
                        value={form.image}
                        onValueChange={(v) => setField('image', v)}
                    />

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
