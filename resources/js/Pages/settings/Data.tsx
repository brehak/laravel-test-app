import { Icon, Text } from '@particle-academy/react-fancy';
import { SettingsLayout } from '@/layouts/SettingsLayout';

/** The two export formats offered. Each is a plain file download (see below). */
const FORMATS: { format: 'csv' | 'json'; label: string; blurb: string; icon: string }[] = [
    { format: 'csv', label: 'CSV', blurb: 'Spreadsheet-friendly. Opens in Excel, Numbers, Sheets.', icon: 'table' },
    { format: 'json', label: 'JSON', blurb: 'Structured, for backups or importing elsewhere.', icon: 'braces' },
];

export default function Data() {
    return (
        <SettingsLayout title="Data">
            <p className="-mt-1 mb-6 text-sm text-zinc-500 dark:text-zinc-400">
                Download your entire collection — owned records and wishlist — including titles, artists,
                years, genres, condition, ratings, and notes.
            </p>

            <div className="flex flex-col gap-3">
                {FORMATS.map((f) => (
                    // A real download, not an Inertia visit — a plain anchor hitting
                    // GET /settings/data/export so the browser saves the streamed file.
                    <a
                        key={f.format}
                        href={`/settings/data/export?format=${f.format}`}
                        className="group flex items-center gap-4 rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-amber-500/50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-amber-500/50"
                    >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-zinc-100 text-zinc-500 transition group-hover:bg-amber-500 group-hover:text-zinc-950 dark:bg-zinc-800 dark:text-zinc-400">
                            <Icon name={f.icon} size="sm" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                Export as {f.label}
                            </span>
                            <Text as="span" size="xs" color="muted" className="block">
                                {f.blurb}
                            </Text>
                        </span>
                        <Icon name="download" size="sm" className="shrink-0 text-zinc-400 group-hover:text-amber-600 dark:group-hover:text-amber-400" />
                    </a>
                ))}
            </div>
        </SettingsLayout>
    );
}
