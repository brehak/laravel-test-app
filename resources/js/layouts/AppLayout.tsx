import { Head, Link, router, usePage } from '@inertiajs/react';
import { Button, cn, Icon } from '@particle-academy/react-fancy';
import { useEffect, useState, type ReactNode } from 'react';

type Auth = { user: { name: string; email: string } | null };

// Primary app surfaces. `exact` marks links whose path is a prefix of the
// others (Collection at /vinyls) so it doesn't stay highlighted on the
// Wishlist/Stats sub-pages.
const NAV = [
    { label: 'Collection', href: '/vinyls', exact: true },
    { label: 'Wishlist', href: '/vinyls/wishlist', exact: false },
    { label: 'Stats', href: '/vinyls/stats', exact: false },
];

/**
 * Sun/moon control that flips the app between light and dark. The `dark` class
 * on <html> is the single source of truth — the Blade template sets it pre-paint
 * from localStorage['fancy.theme'] to avoid a flash, and this button toggles
 * that same class + key so the choice survives reloads and stays in sync.
 */
function ThemeToggle() {
    // Start unset and read the real theme after mount: the server render has no
    // access to the class the Blade script added, so deferring to an effect keeps
    // hydration stable and then corrects the icon on the client.
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'));
    }, []);

    const toggle = () => {
        const root = document.documentElement;
        const next = !root.classList.contains('dark');
        root.classList.toggle('dark', next);
        try {
            localStorage.setItem('fancy.theme', next ? 'dark' : 'light');
        } catch {
            /* localStorage may be unavailable (private mode) — the toggle still works for the session. */
        }
        setIsDark(next);
    };

    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-amber-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-amber-400"
        >
            <Icon name={isDark ? 'sun' : 'moon'} size="sm" />
        </button>
    );
}

/** Authenticated app shell: top nav + sign-out + content area. */
export function AppLayout({ title, children }: { title?: string; children: ReactNode }) {
    const { props, url } = usePage<{ auth: Auth }>();
    const user = props.auth?.user;

    return (
        <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
            {title && <Head title={title} />}
            <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-6">
                        <Link href="/vinyls" className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                            <span className="grid h-7 w-7 place-items-center rounded-md bg-violet-600 text-sm font-bold text-white">S</span>
                            SpinList
                        </Link>
                        <nav className="flex items-center gap-1">
                            {NAV.map((item) => {
                                // `url` carries the query string (e.g. /vinyls?search=x); compare
                                // against the path only so search/sort state doesn't drop highlighting.
                                const path = url.split('?')[0];
                                const active = item.exact ? path === item.href : path.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                                            active
                                                ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                                                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200',
                                        )}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                    <div className="flex items-center gap-3">
                        {user && <span className="hidden text-sm text-zinc-500 sm:inline">{user.name}</span>}
                        <ThemeToggle />
                        <Button variant="ghost" size="sm" onClick={() => router.post('/logout')}>
                            Sign out
                        </Button>
                    </div>
                </div>
            </header>
            <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
        </div>
    );
}
