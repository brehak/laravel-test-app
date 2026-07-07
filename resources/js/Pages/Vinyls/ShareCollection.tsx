import { router } from '@inertiajs/react';
import { Button, Icon, Text } from '@particle-academy/react-fancy';
import { useEffect, useRef, useState } from 'react';

/**
 * "Share" control for the authenticated collection page. Two states, driven by
 * the `shareUrl` prop from the server:
 *
 *  - Not yet enabled (`shareUrl === null`): a button that POSTs to /vinyls/share
 *    to mint the user's slug. The page reloads with `shareUrl` set.
 *  - Enabled: reveals the public link in a small popover with a copy button and
 *    an "open" shortcut.
 *
 * The link is read-only for anyone who visits it — this control only surfaces
 * the URL; it never exposes collection data itself.
 */
export function ShareCollection({ shareUrl }: { shareUrl: string | null }) {
    const [open, setOpen] = useState(false);
    const [enabling, setEnabling] = useState(false);
    const [copied, setCopied] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    // Close the popover on an outside click or Escape, like a native menu.
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    // Reset the "Copied!" affordance shortly after it fires.
    useEffect(() => {
        if (!copied) return;
        const id = window.setTimeout(() => setCopied(false), 1800);
        return () => window.clearTimeout(id);
    }, [copied]);

    const enableSharing = () => {
        setEnabling(true);
        // Server mints the slug and reloads Index with `shareUrl` populated; we
        // only need the fresh prop, so limit the partial reload to it.
        router.post(
            '/vinyls/share',
            {},
            {
                preserveScroll: true,
                only: ['shareUrl'],
                onFinish: () => setEnabling(false),
            },
        );
    };

    const copy = async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
        } catch {
            /* Clipboard may be blocked (insecure context / permissions); the link
               is still visible and selectable in the field, so copying by hand works. */
        }
    };

    return (
        <div ref={rootRef} className="relative">
            <Button variant="ghost" icon="share-2" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
                Share
            </Button>

            {open && (
                <div className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-zinc-200 bg-white p-4 shadow-2xl shadow-black/20 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/60">
                    {shareUrl ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                <Icon name="globe" size="sm" />
                                <Text as="span" size="sm" weight="semibold" className="text-zinc-900 dark:text-zinc-100">
                                    Your collection is shareable
                                </Text>
                            </div>
                            <Text as="p" size="xs" color="muted">
                                Anyone with this link can view your owned records — read-only. No sign-in needed.
                            </Text>

                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={shareUrl}
                                    onFocus={(e) => e.currentTarget.select()}
                                    aria-label="Public collection link"
                                    className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-700 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                                />
                                <Button
                                    color="amber"
                                    size="sm"
                                    icon={copied ? 'check' : 'copy'}
                                    onClick={copy}
                                    className="shrink-0"
                                >
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
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Icon name="share-2" size="sm" className="text-zinc-500" />
                                <Text as="span" size="sm" weight="semibold" className="text-zinc-900 dark:text-zinc-100">
                                    Share your collection
                                </Text>
                            </div>
                            <Text as="p" size="xs" color="muted">
                                Generate a public link to a read-only view of your owned records. Your email, wishlist,
                                ratings, and notes are never shared.
                            </Text>
                            <Button
                                color="amber"
                                size="sm"
                                icon={enabling ? 'loader-2' : 'link'}
                                loading={enabling}
                                onClick={enableSharing}
                                className="w-full"
                            >
                                Enable sharing
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
