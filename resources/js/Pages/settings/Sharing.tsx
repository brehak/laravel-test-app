import { router, useForm } from '@inertiajs/react';
import { Button, Callout, Icon, Input, Text } from '@particle-academy/react-fancy';
import { useEffect, useState, type FormEvent } from 'react';
import { SettingsLayout } from '@/layouts/SettingsLayout';

type Props = {
    /** The full public URL, or null when sharing has never been enabled. */
    shareUrl: string | null;
    /** The opt-in public display name (null when unset -> falls back to account name). */
    publicName: string | null;
    /** The account name, used as the public_name placeholder / fallback hint. */
    accountName: string;
};

export default function Sharing({ shareUrl, publicName, accountName }: Props) {
    return (
        <SettingsLayout title="Sharing">
            <p className="-mt-1 mb-6 text-sm text-zinc-500 dark:text-zinc-400">
                Publish a read-only view of your owned records. Your email, wishlist, ratings, and notes
                are never shared.
            </p>
            <div className="flex flex-col gap-10">
                <ShareLink shareUrl={shareUrl} />
                <PublicName publicName={publicName} accountName={accountName} />
            </div>
        </SettingsLayout>
    );
}

/** Enable/disable the public link, show the URL with copy, and regenerate it. */
function ShareLink({ shareUrl }: { shareUrl: string | null }) {
    const [busy, setBusy] = useState<null | 'enable' | 'regenerate' | 'disable'>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return;
        const id = window.setTimeout(() => setCopied(false), 1800);
        return () => window.clearTimeout(id);
    }, [copied]);

    // Every action refreshes only `shareUrl`, so the panel re-renders in the
    // right state without a full page reload.
    const run = (method: 'post' | 'delete', url: string, key: NonNullable<typeof busy>) => {
        setBusy(key);
        router[method](url, {}, { preserveScroll: true, only: ['shareUrl'], onFinish: () => setBusy(null) });
    };

    const copy = async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
        } catch {
            /* Clipboard may be blocked (insecure context); the link is still selectable. */
        }
    };

    return (
        <section>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Public link</h3>

            {shareUrl ? (
                <div className="mt-3 space-y-3">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <Icon name="globe" size="sm" />
                        <Text as="span" size="sm" weight="semibold" className="text-zinc-900 dark:text-zinc-100">
                            Your collection is shareable
                        </Text>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            readOnly
                            value={shareUrl}
                            onFocus={(e) => e.currentTarget.select()}
                            aria-label="Public collection link"
                            className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-700 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                        />
                        <Button color="amber" size="sm" icon={copied ? 'check' : 'copy'} onClick={copy} className="shrink-0">
                            {copied ? 'Copied' : 'Copy'}
                        </Button>
                    </div>

                    <a
                        href={shareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition hover:text-amber-600 dark:hover:text-amber-400"
                    >
                        <Icon name="external-link" size="xs" />
                        Open public page
                    </a>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            icon="refresh-cw"
                            loading={busy === 'regenerate'}
                            onClick={() => run('post', '/settings/sharing/regenerate', 'regenerate')}
                        >
                            Regenerate link
                        </Button>
                        <Button
                            variant="ghost"
                            color="rose"
                            size="sm"
                            icon="eye-off"
                            loading={busy === 'disable'}
                            onClick={() => run('delete', '/settings/sharing', 'disable')}
                        >
                            Disable sharing
                        </Button>
                    </div>
                    <Text as="p" size="xs" color="muted">
                        Regenerating replaces the link — the old URL stops working immediately.
                    </Text>
                </div>
            ) : (
                <div className="mt-3 space-y-3">
                    <Text as="p" size="sm" color="muted">
                        Generate a public link to a read-only view of your owned records. No sign-in
                        needed to view it.
                    </Text>
                    <Button
                        color="amber"
                        icon="link"
                        loading={busy === 'enable'}
                        onClick={() => run('post', '/vinyls/share', 'enable')}
                    >
                        Enable sharing
                    </Button>
                </div>
            )}
        </section>
    );
}

/**
 * Public display name (`public_name` on the User model). Saves via
 * PATCH /settings/sharing -> SharingController@update. Blank clears it, and the
 * public page falls back to the account name.
 */
function PublicName({ publicName, accountName }: { publicName: string | null; accountName: string }) {
    const { data, setData, patch, processing, errors, recentlySuccessful } = useForm({
        public_name: publicName ?? '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        patch('/settings/sharing', { preserveScroll: true });
    };

    return (
        <section>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Public display name</h3>
            <p className="mt-0.5 mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                The name shown at the top of your public collection page. Leave blank to use your account
                name (<span className="font-medium text-zinc-600 dark:text-zinc-300">{accountName}</span>).
            </p>
            <form onSubmit={submit} className="flex flex-col gap-4">
                <Input
                    label="Display name"
                    placeholder={accountName}
                    value={data.public_name}
                    onValueChange={(v) => setData('public_name', v)}
                    error={errors.public_name}
                    maxLength={255}
                />
                <div className="flex items-center gap-3">
                    <Button type="submit" color="amber" icon="check" loading={processing}>
                        Save
                    </Button>
                    {recentlySuccessful && (
                        <Callout color="emerald" className="!py-1 text-sm">
                            Saved.
                        </Callout>
                    )}
                </div>
            </form>
        </section>
    );
}
