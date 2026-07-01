import { Badge, Button, Card, Heading, Icon, Text } from '@particle-academy/react-fancy';
import { useState } from 'react';
import { AppLayout } from '@/layouts/AppLayout';
import { AddVinylModal } from './AddVinylModal';

type Vinyl = {
    id: number;
    title: string;
    artist: string;
    image: string | null;
    genre: string[] | null;
    year: string | null;
    condition: string | null;
};

type Props = { vinyls: Vinyl[] };

/** Map a free-text condition grade to a warm-palette badge color. */
function conditionColor(condition: string): 'emerald' | 'amber' | 'orange' | 'rose' | 'zinc' {
    const c = condition.toLowerCase();
    if (c.includes('mint') || c.includes('new') || c.includes('sealed')) return 'emerald';
    if (c.includes('very good') || c.startsWith('vg')) return 'amber';
    if (c.includes('good') || c.includes('fair')) return 'orange';
    if (c.includes('poor') || c.includes('bad')) return 'rose';
    return 'zinc';
}

function VinylCard({ vinyl }: { vinyl: Vinyl }) {
    return (
        <Card
            variant="elevated"
            padding="none"
            className="group overflow-hidden border-zinc-800/60 bg-zinc-900 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40"
        >
            {/* Cover art carries the visual weight */}
            <div className="relative aspect-square overflow-hidden bg-zinc-950">
                {vinyl.image ? (
                    <img
                        src={vinyl.image}
                        alt={`${vinyl.title} by ${vinyl.artist}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
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

                {/* Warm gradient scrim so overlaid text stays legible */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
            </div>

            <Card.Body className="space-y-1 p-4">
                <div className="flex items-start justify-between gap-2">
                    <Heading as="h3" size="sm" weight="semibold" className="line-clamp-1 text-zinc-100">
                        {vinyl.title}
                    </Heading>
                    {vinyl.year && (
                        <Text as="span" size="xs" className="mt-0.5 shrink-0 font-mono text-amber-500/80">
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
            </Card.Body>
        </Card>
    );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-20 text-center">
            <span className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-amber-500/10 text-amber-500">
                <Icon name="disc-3" size="lg" />
            </span>
            <Heading as="h2" size="lg" weight="semibold" className="text-zinc-100">
                No records yet
            </Heading>
            <Text as="p" color="muted" className="mt-1 max-w-xs">
                Add your first vinyl and start building your collection.
            </Text>
            <div className="mt-6">
                <Button color="amber" icon="plus" onClick={onAdd}>
                    Add Vinyl
                </Button>
            </div>
        </div>
    );
}

export default function Index({ vinyls }: Props) {
    const hasRecords = vinyls.length > 0;
    const [addOpen, setAddOpen] = useState(false);

    return (
        <AppLayout title="My Collection">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <Heading as="h1" size="2xl" weight="bold" className="text-zinc-100">
                        My Collection
                    </Heading>
                    <Text as="p" size="sm" color="muted" className="mt-1">
                        {hasRecords
                            ? `${vinyls.length} record${vinyls.length === 1 ? '' : 's'} on the shelf`
                            : 'Your record shelf is waiting.'}
                    </Text>
                </div>
                <Button color="amber" icon="plus" onClick={() => setAddOpen(true)}>
                    Add Vinyl
                </Button>
            </div>

            <div className="mt-8">
                {hasRecords ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {vinyls.map((vinyl) => (
                            <VinylCard key={vinyl.id} vinyl={vinyl} />
                        ))}
                    </div>
                ) : (
                    <EmptyState onAdd={() => setAddOpen(true)} />
                )}
            </div>

            <AddVinylModal open={addOpen} onClose={() => setAddOpen(false)} />
        </AppLayout>
    );
}
