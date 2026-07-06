import { Link } from '@inertiajs/react';
import { Card, Heading, Icon, Text } from '@particle-academy/react-fancy';
import {
    BarChart,
    CanvasRenderer,
    EChart,
    GridComponent,
    LegendComponent,
    PieChart,
    registerCharts,
    registerComponents,
    TitleComponent,
    TooltipComponent,
} from '@particle-academy/fancy-echarts';
import { use } from 'echarts/core';
import { AppLayout } from '@/layouts/AppLayout';

// The app boots with `appRoot: false`, so ECharts isn't auto-registered.
// Register only the pieces this page draws with (tree-shake friendly).
registerCharts(BarChart, PieChart);
registerComponents(GridComponent, TooltipComponent, TitleComponent, LegendComponent);
use([CanvasRenderer]);

type TopArtist = { artist: string; count: number };
type DecadeSlice = { decade: string; count: number };
type GenreSlice = { genre: string; count: number };
type ConditionSlice = { condition: string; count: number };
type RatingSlice = { rating: number; count: number };
type ColorSlice = { color: string; count: number };

type Props = {
    totalRecords: number;
    wishlistCount: number;
    uniqueArtists: number;
    averageRating: number | null;
    ratedCount: number;
    unratedCount: number;
    mostCommonGenre: string | null;
    topDecade: string | null;
    topArtists: TopArtist[];
    byDecade: DecadeSlice[];
    byGenre: GenreSlice[];
    byCondition: ConditionSlice[];
    byRating: RatingSlice[];
    byColor: ColorSlice[];
};

// Warm amber→orange→stone palette to match the collection's dark aesthetic.
const WARM_PALETTE = ['#f59e0b', '#f97316', '#fbbf24', '#ea580c', '#d97706', '#fdba74', '#b45309', '#78716c'];

/**
 * A big headline number (or short string) with a label. Numbers are formatted
 * with thousands separators; string values (a genre, a decade) render a touch
 * smaller so long names don't blow out the card.
 */
function StatCard({
    icon,
    value,
    label,
    hint,
}: {
    icon: string;
    value: string | number;
    label: string;
    hint?: string;
}) {
    const isNumber = typeof value === 'number';
    const display = isNumber ? value.toLocaleString() : value;

    return (
        <Card variant="elevated" padding="lg" className="border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900">
            <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Icon name={icon} size="lg" />
                </span>
                <div className="min-w-0">
                    <span
                        title={String(display)}
                        className={`block truncate font-bold tabular-nums text-zinc-900 dark:text-zinc-100 ${
                            isNumber ? 'text-3xl' : 'text-xl'
                        }`}
                    >
                        {display}
                    </span>
                    <Text as="p" size="sm" color="muted">
                        {label}
                    </Text>
                    {hint && (
                        <Text as="p" size="xs" className="mt-0.5 text-zinc-500">
                            {hint}
                        </Text>
                    )}
                </div>
            </div>
        </Card>
    );
}

/** Shared section wrapper so every panel gets the same framed, titled look. */
function Panel({
    title,
    icon,
    children,
}: {
    title: string;
    icon: string;
    children: React.ReactNode;
}) {
    return (
        <Card variant="elevated" padding="lg" className="border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900">
            <div className="mb-4 flex items-center gap-2">
                <Icon name={icon} size="sm" className="text-amber-600 dark:text-amber-400" />
                <Heading as="h2" size="md" weight="semibold" className="text-zinc-900 dark:text-zinc-100">
                    {title}
                </Heading>
            </div>
            {children}
        </Card>
    );
}

function EmptyPanel({ label }: { label: string }) {
    return (
        <div className="flex h-64 flex-col items-center justify-center text-center">
            <Icon name="disc-3" size="lg" className="mb-2 text-zinc-300 dark:text-zinc-700" />
            <Text as="p" size="sm" color="muted">
                {label}
            </Text>
        </div>
    );
}

/**
 * Disc-colour breakdown: one proportional, stacked bar tinted with each
 * pressing's actual colour, plus a legend of swatches with their counts.
 * A quick read on how colourful the collection is.
 */
function DiscColorBar({ byColor }: { byColor: ColorSlice[] }) {
    const total = byColor.reduce((sum, c) => sum + c.count, 0);
    if (total === 0) {
        return <EmptyPanel label="No disc colours recorded yet." />;
    }

    return (
        <div>
            <div className="flex h-10 w-full overflow-hidden rounded-full ring-1 ring-inset ring-zinc-200 dark:ring-zinc-800">
                {byColor.map((c) => (
                    <div
                        key={c.color}
                        className="h-full border-r border-zinc-950/40 last:border-r-0"
                        style={{ width: `${(c.count / total) * 100}%`, backgroundColor: c.color }}
                        title={`${c.color} — ${c.count}`}
                    />
                ))}
            </div>
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                {byColor.map((c) => (
                    <li key={c.color} className="flex items-center gap-2">
                        <span
                            className="h-4 w-4 shrink-0 rounded-sm ring-1 ring-inset ring-white/15"
                            style={{ backgroundColor: c.color }}
                        />
                        <Text as="span" size="sm" className="font-mono uppercase text-zinc-500 dark:text-zinc-400">
                            {c.color}
                        </Text>
                        <Text as="span" size="sm" className="font-mono tabular-nums text-amber-600 dark:text-amber-500/80">
                            {c.count}
                        </Text>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function Stats({
    totalRecords,
    wishlistCount,
    uniqueArtists,
    averageRating,
    ratedCount,
    unratedCount,
    mostCommonGenre,
    topDecade,
    topArtists,
    byDecade,
    byGenre,
    byCondition,
    byRating,
    byColor,
}: Props) {
    const hasRecords = totalRecords > 0;
    const maxArtist = topArtists[0]?.count ?? 1;

    // Shared theming so every chart reads on the dark background.
    const axisLabel = { color: '#a1a1aa' };
    const splitLine = { lineStyle: { color: 'rgba(63,63,70,0.4)' } };

    return (
        <AppLayout title="Collection Stats">
            {/* Header + back link */}
            <div className="flex items-end justify-between gap-4">
                <div>
                    <Link
                        href="/vinyls"
                        className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400 transition hover:text-amber-300"
                    >
                        <Icon name="arrow-left" size="sm" />
                        Back to collection
                    </Link>
                    <Heading as="h1" size="2xl" weight="bold" className="text-zinc-900 dark:text-zinc-100">
                        Collection Stats
                    </Heading>
                    <Text as="p" size="sm" color="muted" className="mt-1">
                        A look at the shape of your shelf.
                    </Text>
                </div>
            </div>

            {!hasRecords ? (
                <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900/40 px-6 py-20 text-center">
                    <span className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-500">
                        <Icon name="chart-pie" size="lg" />
                    </span>
                    <Heading as="h2" size="lg" weight="semibold" className="text-zinc-900 dark:text-zinc-100">
                        Nothing to chart yet
                    </Heading>
                    <Text as="p" color="muted" className="mt-1 max-w-xs">
                        Add some records and your stats will appear here.
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
                    {/* Headline stat cards */}
                    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                        <StatCard
                            icon="library"
                            value={totalRecords}
                            label={totalRecords === 1 ? 'Record' : 'Records'}
                            hint={`${uniqueArtists} ${uniqueArtists === 1 ? 'artist' : 'artists'}`}
                        />
                        <StatCard
                            icon="star"
                            value={averageRating != null ? averageRating.toFixed(1) : '—'}
                            label="Avg rating"
                            hint={
                                ratedCount > 0
                                    ? `${ratedCount} rated · ${unratedCount} unrated`
                                    : 'Nothing rated yet'
                            }
                        />
                        <StatCard
                            icon="music"
                            value={mostCommonGenre ?? '—'}
                            label="Top genre"
                        />
                        <StatCard
                            icon="calendar"
                            value={topDecade ?? '—'}
                            label="Top decade"
                        />
                        <StatCard
                            icon="heart"
                            value={wishlistCount}
                            label="On wishlist"
                        />
                    </div>

                    {/* Genre + decade */}
                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {/* Genre distribution — donut */}
                        <Panel title="Genre Distribution" icon="chart-pie">
                            {byGenre.length > 0 ? (
                                <EChart.Pie
                                    data={byGenre.map((g) => ({ name: g.genre, value: g.count }))}
                                    tooltip
                                    legend={{
                                        type: 'scroll',
                                        orient: 'horizontal',
                                        bottom: 0,
                                        textStyle: { color: '#a1a1aa' },
                                    }}
                                    seriesOptions={{
                                        radius: ['45%', '70%'],
                                        center: ['50%', '45%'],
                                        itemStyle: { borderColor: '#18181b', borderWidth: 2 },
                                        label: { color: '#d4d4d8' },
                                    }}
                                    option={{ color: WARM_PALETTE }}
                                    style={{ height: 320 }}
                                />
                            ) : (
                                <EmptyPanel label="No genres tagged yet." />
                            )}
                        </Panel>

                        {/* Decade breakdown — bar */}
                        <Panel title="Records by Decade" icon="chart-column">
                            {byDecade.length > 0 ? (
                                <EChart.Bar
                                    data={{
                                        categories: byDecade.map((d) => d.decade),
                                        series: [{ name: 'Records', data: byDecade.map((d) => d.count) }],
                                    }}
                                    tooltip
                                    xAxis={{ type: 'category', axisLabel, axisLine: { lineStyle: { color: '#3f3f46' } } }}
                                    yAxis={{ type: 'value', minInterval: 1, axisLabel, splitLine }}
                                    grid={{ left: 8, right: 16, top: 16, bottom: 8, containLabel: true }}
                                    seriesOptions={{
                                        barMaxWidth: 44,
                                        itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] },
                                    }}
                                    style={{ height: 320 }}
                                />
                            ) : (
                                <EmptyPanel label="No dated records yet." />
                            )}
                        </Panel>
                    </div>

                    {/* Condition + rating */}
                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {/* Condition breakdown — bar */}
                        <Panel title="Condition Breakdown" icon="badge-check">
                            {byCondition.length > 0 ? (
                                <EChart.Bar
                                    data={{
                                        categories: byCondition.map((c) => c.condition),
                                        series: [{ name: 'Records', data: byCondition.map((c) => c.count) }],
                                    }}
                                    tooltip
                                    xAxis={{
                                        type: 'category',
                                        axisLabel: { ...axisLabel, interval: 0, rotate: 30 },
                                        axisLine: { lineStyle: { color: '#3f3f46' } },
                                    }}
                                    yAxis={{ type: 'value', minInterval: 1, axisLabel, splitLine }}
                                    grid={{ left: 8, right: 16, top: 16, bottom: 8, containLabel: true }}
                                    seriesOptions={{
                                        barMaxWidth: 40,
                                        itemStyle: { color: '#f97316', borderRadius: [4, 4, 0, 0] },
                                    }}
                                    style={{ height: 320 }}
                                />
                            ) : (
                                <EmptyPanel label="No condition grades recorded yet." />
                            )}
                        </Panel>

                        {/* Rating distribution — bar */}
                        <Panel title="Rating Distribution" icon="star">
                            {ratedCount > 0 ? (
                                <EChart.Bar
                                    data={{
                                        categories: byRating.map((r) => `${r.rating}★`),
                                        series: [{ name: 'Records', data: byRating.map((r) => r.count) }],
                                    }}
                                    tooltip
                                    xAxis={{ type: 'category', axisLabel, axisLine: { lineStyle: { color: '#3f3f46' } } }}
                                    yAxis={{ type: 'value', minInterval: 1, axisLabel, splitLine }}
                                    grid={{ left: 8, right: 16, top: 16, bottom: 8, containLabel: true }}
                                    seriesOptions={{
                                        barMaxWidth: 44,
                                        itemStyle: { color: '#fbbf24', borderRadius: [4, 4, 0, 0] },
                                    }}
                                    style={{ height: 320 }}
                                />
                            ) : (
                                <EmptyPanel label="Nothing rated yet." />
                            )}
                        </Panel>
                    </div>

                    {/* Disc colour breakdown */}
                    <div className="mt-4">
                        <Panel title="Disc Colours" icon="palette">
                            <DiscColorBar byColor={byColor} />
                        </Panel>
                    </div>

                    {/* Top artists — ranked list */}
                    <div className="mt-4">
                        <Panel title="Top Artists" icon="trending-up">
                            <ol className="space-y-2">
                                {topArtists.map((a, i) => (
                                    <li
                                        key={a.artist}
                                        className="flex items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800/60 bg-zinc-100/70 dark:bg-zinc-950/40 px-3 py-2.5"
                                    >
                                        <span
                                            className={
                                                i < 3
                                                    ? 'grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-500/15 text-sm font-bold text-amber-300'
                                                    : 'grid h-7 w-7 shrink-0 place-items-center rounded-full bg-zinc-200 dark:bg-zinc-800 text-sm font-semibold text-zinc-500 dark:text-zinc-400'
                                            }
                                        >
                                            {i + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <Text as="p" size="sm" weight="medium" className="truncate text-zinc-900 dark:text-zinc-100">
                                                {a.artist}
                                            </Text>
                                            {/* Proportional bar relative to the most-collected artist */}
                                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                                                    style={{ width: `${Math.max(6, (a.count / maxArtist) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                        <Text as="span" size="sm" className="shrink-0 font-mono text-amber-600 dark:text-amber-500/80 tabular-nums">
                                            {a.count}
                                        </Text>
                                    </li>
                                ))}
                            </ol>
                        </Panel>
                    </div>
                </>
            )}
        </AppLayout>
    );
}
