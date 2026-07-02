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

type Props = {
    totalRecords: number;
    uniqueArtists: number;
    topArtists: TopArtist[];
    byDecade: DecadeSlice[];
    byGenre: GenreSlice[];
};

// Warm amber→orange→stone palette to match the collection's dark aesthetic.
const WARM_PALETTE = ['#f59e0b', '#f97316', '#fbbf24', '#ea580c', '#d97706', '#fdba74', '#b45309', '#78716c'];

/** A big headline number with a label — the top-of-page summary cards. */
function StatCard({ icon, value, label }: { icon: string; value: number; label: string }) {
    return (
        <Card variant="elevated" padding="lg" className="border-zinc-800/60 bg-zinc-900">
            <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-400">
                    <Icon name={icon} size="lg" />
                </span>
                <div>
                    <span className="block text-3xl font-bold tabular-nums text-zinc-100">
                        {value.toLocaleString()}
                    </span>
                    <Text as="p" size="sm" color="muted">
                        {label}
                    </Text>
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
        <Card variant="elevated" padding="lg" className="border-zinc-800/60 bg-zinc-900">
            <div className="mb-4 flex items-center gap-2">
                <Icon name={icon} size="sm" className="text-amber-400" />
                <Heading as="h2" size="md" weight="semibold" className="text-zinc-100">
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
            <Icon name="disc-3" size="lg" className="mb-2 text-zinc-700" />
            <Text as="p" size="sm" color="muted">
                {label}
            </Text>
        </div>
    );
}

export default function Stats({ totalRecords, uniqueArtists, topArtists, byDecade, byGenre }: Props) {
    const hasRecords = totalRecords > 0;
    const maxArtist = topArtists[0]?.count ?? 1;

    // Shared theming so both charts read on the dark background.
    const axisLabel = { color: '#a1a1aa' };
    const splitLine = { lineStyle: { color: 'rgba(63,63,70,0.4)' } };

    return (
        <AppLayout title="Collection Stats">
            {/* Header + back link */}
            <div className="flex items-end justify-between gap-4">
                <div>
                    <Link
                        href="/vinyls"
                        className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition hover:text-amber-300"
                    >
                        <Icon name="arrow-left" size="sm" />
                        Back to collection
                    </Link>
                    <Heading as="h1" size="2xl" weight="bold" className="text-zinc-100">
                        Collection Stats
                    </Heading>
                    <Text as="p" size="sm" color="muted" className="mt-1">
                        A look at the shape of your shelf.
                    </Text>
                </div>
            </div>

            {!hasRecords ? (
                <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-20 text-center">
                    <span className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-amber-500/10 text-amber-500">
                        <Icon name="chart-pie" size="lg" />
                    </span>
                    <Heading as="h2" size="lg" weight="semibold" className="text-zinc-100">
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
                    {/* Summary cards */}
                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <StatCard icon="library" value={totalRecords} label={totalRecords === 1 ? 'Record' : 'Records'} />
                        <StatCard
                            icon="users"
                            value={uniqueArtists}
                            label={uniqueArtists === 1 ? 'Unique artist' : 'Unique artists'}
                        />
                    </div>

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

                    {/* Top artists — ranked list */}
                    <div className="mt-4">
                        <Panel title="Top Artists" icon="trending-up">
                            <ol className="space-y-2">
                                {topArtists.map((a, i) => (
                                    <li
                                        key={a.artist}
                                        className="flex items-center gap-3 rounded-lg border border-zinc-800/60 bg-zinc-950/40 px-3 py-2.5"
                                    >
                                        <span
                                            className={
                                                i < 3
                                                    ? 'grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-500/15 text-sm font-bold text-amber-300'
                                                    : 'grid h-7 w-7 shrink-0 place-items-center rounded-full bg-zinc-800 text-sm font-semibold text-zinc-400'
                                            }
                                        >
                                            {i + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <Text as="p" size="sm" weight="medium" className="truncate text-zinc-100">
                                                {a.artist}
                                            </Text>
                                            {/* Proportional bar relative to the most-collected artist */}
                                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                                                    style={{ width: `${Math.max(6, (a.count / maxArtist) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                        <Text as="span" size="sm" className="shrink-0 font-mono text-amber-500/80 tabular-nums">
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
