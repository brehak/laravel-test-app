import { useForm } from '@inertiajs/react';
import { Button, Callout, Icon, Select, Text } from '@particle-academy/react-fancy';
import type { FormEvent } from 'react';
import { SettingsLayout } from '@/layouts/SettingsLayout';
import { SORT_OPTIONS, type SortKey, type ViewMode } from '@/Pages/Vinyls/filters';

type Preferences = { default_view: ViewMode; default_sort: SortKey };

/** The two default-view choices, with the icon/blurb shown on each tile. */
const VIEW_OPTIONS: { value: ViewMode; icon: string; label: string; blurb: string }[] = [
    { value: 'grid', icon: 'layout-grid', label: 'Grid', blurb: 'Cover-forward cards' },
    { value: 'list', icon: 'list', label: 'List', blurb: 'Compact rows' },
];

export default function Preferences({ preferences }: { preferences: Preferences }) {
    const { data, setData, patch, processing, errors, recentlySuccessful } = useForm<Preferences>({
        default_view: preferences.default_view,
        default_sort: preferences.default_sort,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        // PATCH /settings/preferences -> PreferencesController@update, which
        // validates and saves against the authenticated user only.
        patch('/settings/preferences', { preserveScroll: true });
    };

    return (
        <SettingsLayout title="App Preferences">
            <p className="-mt-1 mb-5 text-sm text-zinc-500 dark:text-zinc-400">
                Choose how your collection looks and sorts by default. These apply every time you open
                your shelf.
            </p>

            <form onSubmit={submit} className="flex flex-col gap-6">
                {/* Default view — segmented tile picker. */}
                <fieldset>
                    <legend className="mb-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        Default collection view
                    </legend>
                    <div className="grid grid-cols-2 gap-3">
                        {VIEW_OPTIONS.map((opt) => {
                            const active = data.default_view === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setData('default_view', opt.value)}
                                    aria-pressed={active}
                                    className={
                                        'flex items-center gap-3 rounded-lg border p-3 text-left transition ' +
                                        (active
                                            ? 'border-amber-500/60 bg-amber-500/10 ring-1 ring-amber-500/40'
                                            : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700')
                                    }
                                >
                                    <span
                                        className={
                                            'grid h-9 w-9 shrink-0 place-items-center rounded-md ' +
                                            (active
                                                ? 'bg-amber-500 text-zinc-950'
                                                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400')
                                        }
                                    >
                                        <Icon name={opt.icon} size="sm" />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                            {opt.label}
                                        </span>
                                        <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                                            {opt.blurb}
                                        </span>
                                    </span>
                                    {active && (
                                        <Icon name="check" size="sm" className="ml-auto shrink-0 text-amber-600 dark:text-amber-400" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    {errors.default_view && (
                        <Text as="p" size="xs" className="mt-1.5 text-rose-600 dark:text-rose-400">
                            {errors.default_view}
                        </Text>
                    )}
                </fieldset>

                {/* Default sort. */}
                <div className="max-w-xs">
                    <Text
                        as="label"
                        size="sm"
                        weight="medium"
                        className="mb-2 block text-zinc-800 dark:text-zinc-200"
                    >
                        Default sort
                    </Text>
                    <Select
                        value={data.default_sort}
                        list={SORT_OPTIONS}
                        onValueChange={(v) => setData('default_sort', v as SortKey)}
                        aria-label="Default sort"
                    />
                    {errors.default_sort && (
                        <Text as="p" size="xs" className="mt-1.5 text-rose-600 dark:text-rose-400">
                            {errors.default_sort}
                        </Text>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <Button type="submit" color="amber" icon="check" loading={processing}>
                        Save preferences
                    </Button>
                    {recentlySuccessful && (
                        <Callout color="emerald" className="!py-1 text-sm">
                            Saved.
                        </Callout>
                    )}
                </div>
            </form>
        </SettingsLayout>
    );
}
