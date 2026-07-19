import { useMemo } from 'react';
import { Link } from '@inertiajs/react';
import { Card, Heading, Icon, Text } from '@particle-academy/react-fancy';
import { AppLayout } from '@/layouts/AppLayout';

/**
 * One computed achievement. Mirrors the array shape built server-side in
 * App\Services\MilestoneService — `progress` is already clamped to `target`, so
 * the bar never needs to guard against overshoot.
 */
type Milestone = {
    id: string;
    category: string;
    icon: string;
    label: string;
    description: string;
    progress: number;
    target: number;
    earned: boolean;
};

type Props = {
    totalRecords: number;
    earnedCount: number;
    totalCount: number;
    milestones: Milestone[];
};

/**
 * A single earned achievement: warm amber fill, a soft glow and a check badge
 * so unlocked milestones read as a reward the moment the eye lands on them.
 */
function EarnedCard({ milestone }: { milestone: Milestone }) {
    return (
        <Card
            variant="elevated"
            padding="lg"
            className="relative overflow-hidden border-amber-500/40 bg-gradient-to-br from-amber-500/15 to-orange-500/5 dark:border-amber-500/30"
        >
            {/* Warm glow pooling out of the top-right corner. */}
            <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-500/20 blur-2xl" />

            <div className="relative flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-zinc-950 shadow-lg shadow-amber-900/30 ring-1 ring-amber-300/50">
                    <Icon name={milestone.icon} size="lg" />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <Heading as="h3" size="sm" weight="bold" className="truncate text-zinc-900 dark:text-zinc-50">
                            {milestone.label}
                        </Heading>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                            <Icon name="check" size="xs" />
                            Earned
                        </span>
                    </div>
                    <Text as="p" size="sm" className="mt-0.5 text-zinc-600 dark:text-zinc-300">
                        {milestone.description}
                    </Text>
                </div>
            </div>
        </Card>
    );
}

/**
 * A locked achievement: muted chrome, but with a live progress bar and a
 * "42/50" readout so the emphasis is on how close it is rather than on the lock.
 */
function LockedCard({ milestone }: { milestone: Milestone }) {
    const pct = milestone.target > 0 ? (milestone.progress / milestone.target) * 100 : 0;

    return (
        <Card
            variant="elevated"
            padding="lg"
            className="border-zinc-200 bg-white dark:border-zinc-800/60 dark:bg-zinc-900"
        >
            <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                    <Icon name={milestone.icon} size="lg" />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <Heading as="h3" size="sm" weight="semibold" className="truncate text-zinc-700 dark:text-zinc-200">
                            {milestone.label}
                        </Heading>
                        <Icon name="lock" size="xs" className="shrink-0 text-zinc-400 dark:text-zinc-600" />
                    </div>
                    <Text as="p" size="sm" color="muted" className="mt-0.5">
                        {milestone.description}
                    </Text>

                    {/* Progress toward the threshold. */}
                    <div className="mt-3 flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-[width] duration-500"
                                style={{ width: `${Math.max(3, pct)}%` }}
                            />
                        </div>
                        <Text
                            as="span"
                            size="sm"
                            className="shrink-0 font-mono tabular-nums text-zinc-500 dark:text-zinc-400"
                        >
                            {milestone.progress.toLocaleString()}/{milestone.target.toLocaleString()}
                        </Text>
                    </div>
                </div>
            </div>
        </Card>
    );
}

export default function Milestones({ totalRecords, earnedCount, totalCount, milestones }: Props) {
    const hasRecords = totalRecords > 0;

    // Group milestones by category, preserving the server-defined order of both
    // the categories and the milestones within them (first-seen wins).
    const groups = useMemo(() => {
        const map = new Map<string, Milestone[]>();
        for (const m of milestones) {
            const bucket = map.get(m.category) ?? [];
            bucket.push(m);
            map.set(m.category, bucket);
        }
        return Array.from(map, ([category, items]) => ({ category, items }));
    }, [milestones]);

    const overallPct = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;

    return (
        <AppLayout title="Collection Milestones">
            {/* Header + back link */}
            <div>
                <Link
                    href="/vinyls"
                    className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-amber-300 dark:text-zinc-400"
                >
                    <Icon name="arrow-left" size="sm" />
                    Back to collection
                </Link>
                <Heading as="h1" size="2xl" weight="bold" className="text-zinc-900 dark:text-zinc-100">
                    Collection Milestones
                </Heading>
                <Text as="p" size="sm" color="muted" className="mt-1">
                    Achievements earned as your shelf grows.
                </Text>
            </div>

            {!hasRecords ? (
                <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-100/70 px-6 py-20 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
                    <span className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-500">
                        <Icon name="trophy" size="lg" />
                    </span>
                    <Heading as="h2" size="lg" weight="semibold" className="text-zinc-900 dark:text-zinc-100">
                        No milestones yet
                    </Heading>
                    <Text as="p" color="muted" className="mt-1 max-w-xs">
                        Start adding records and you'll unlock your first achievement in no time.
                    </Text>
                    <Link
                        href="/vinyls"
                        className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
                    >
                        Go to collection
                    </Link>
                </div>
            ) : (
                <>
                    {/* Summary hero: how many of the set are unlocked. */}
                    <Card
                        variant="elevated"
                        padding="lg"
                        className="relative mt-6 overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent"
                    >
                        <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-amber-500/15 blur-3xl" />
                        <div className="relative flex items-center gap-5">
                            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-zinc-950 shadow-lg shadow-amber-900/30 ring-1 ring-amber-300/50">
                                <Icon name="trophy" size="lg" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                                        {earnedCount}
                                    </span>
                                    <span className="text-lg font-medium text-zinc-500 dark:text-zinc-400">
                                        / {totalCount} unlocked
                                    </span>
                                </div>
                                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-700"
                                        style={{ width: `${Math.max(3, overallPct)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Milestone groups by category. */}
                    {groups.map(({ category, items }) => {
                        const earnedInGroup = items.filter((m) => m.earned).length;
                        return (
                            <section key={category} className="mt-8">
                                <div className="mb-3 flex items-center justify-between gap-4">
                                    <Heading as="h2" size="md" weight="semibold" className="text-zinc-900 dark:text-zinc-100">
                                        {category}
                                    </Heading>
                                    <Text as="span" size="sm" className="shrink-0 font-mono tabular-nums text-amber-600 dark:text-amber-500/80">
                                        {earnedInGroup}/{items.length}
                                    </Text>
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {items.map((m) =>
                                        m.earned ? <EarnedCard key={m.id} milestone={m} /> : <LockedCard key={m.id} milestone={m} />,
                                    )}
                                </div>
                            </section>
                        );
                    })}
                </>
            )}
        </AppLayout>
    );
}
