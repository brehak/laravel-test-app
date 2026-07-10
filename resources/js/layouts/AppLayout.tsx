import { Head, Link, router, usePage } from '@inertiajs/react';
import { Avatar, cn, Dropdown, Icon } from '@particle-academy/react-fancy';
import { useEffect, useState, type ReactNode } from 'react';

type User = { name: string; email: string };
type Auth = { user: User | null };

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

/** First letters of the first and last word of a name — the avatar fallback. */
function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
}

// Shared look for the interactive rows inside the user menu. Mirrors the kit's
// own DropdownItem styling (rounded-lg row, warm hover) so the <Link> entries
// and the button entries read as one consistent menu.
const menuRow =
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors';
const menuRowDefault =
    'text-zinc-700 hover:bg-amber-500/10 hover:text-amber-700 dark:text-zinc-300 dark:hover:bg-amber-500/10 dark:hover:text-amber-400';

/**
 * Top-right user menu: avatar + name that opens a dropdown to the settings
 * pages and sign-out. The two settings entries are real Inertia <Link>s (so
 * they navigate client-side, are keyboard-focusable via the kit's
 * role="menuitem" arrow-key handling, and support open-in-new-tab); sign-out is
 * a button because it POSTs to /logout.
 */
function UserMenu({ user }: { user: User }) {
    return (
        <Dropdown placement="bottom-end" offset={10}>
            <Dropdown.Trigger>
                <button
                    type="button"
                    aria-label="Open user menu"
                    className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                    <Avatar fallback={initials(user.name)} size="sm" glow="achievement" />
                    <span className="hidden max-w-[10rem] truncate sm:inline">{user.name}</span>
                    <Icon name="chevron-down" size="xs" className="text-zinc-400" />
                </button>
            </Dropdown.Trigger>
            <Dropdown.Items className="min-w-[13rem]">
                <div className="border-b border-zinc-100 px-3 pb-2.5 pt-1.5 dark:border-zinc-800">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{user.name}</p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
                </div>
                <div className="pt-1">
                    <Link href="/settings/profile" role="menuitem" className={cn(menuRow, menuRowDefault)}>
                        <Icon name="user" size="sm" className="text-zinc-400" />
                        Profile settings
                    </Link>
                    <Link href="/settings/password" role="menuitem" className={cn(menuRow, menuRowDefault)}>
                        <Icon name="lock" size="sm" className="text-zinc-400" />
                        Change password
                    </Link>
                </div>
                <Dropdown.Separator />
                <Dropdown.Item danger onClick={() => router.post('/logout')}>
                    <Icon name="log-out" size="sm" className="mr-2.5" />
                    Sign out
                </Dropdown.Item>
            </Dropdown.Items>
        </Dropdown>
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
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        {user && <UserMenu user={user} />}
                    </div>
                </div>
            </header>
            <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
        </div>
    );
}
