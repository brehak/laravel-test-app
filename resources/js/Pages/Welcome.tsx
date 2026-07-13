import { Head, Link } from '@inertiajs/react';
import { Icon } from '@particle-academy/react-fancy';

/**
 * A slowly spinning vinyl record — the hero centerpiece. Pure CSS, mirroring
 * the disc that peeks out from behind the collection cards, so the landing
 * feels of a piece with the app. The amber center label carries the brand
 * accent. Decorative only, hence aria-hidden.
 */
function SpinningRecord() {
    return (
        <div className="relative h-56 w-56 sm:h-64 sm:w-64" aria-hidden>
            {/* Warm amber halo bleeding out behind the disc. */}
            <div className="absolute -inset-10 rounded-full bg-amber-500/20 blur-3xl" />

            {/* The disc itself, turning slowly like a record on a platter. */}
            <div className="relative h-full w-full animate-[spin_16s_linear_infinite] rounded-full bg-zinc-900 shadow-2xl shadow-black/70 ring-1 ring-white/10">
                {/* Concentric grooves + a soft top-left sheen. Radially symmetric
                    so they read as a spinning record without shimmering. */}
                <div
                    className="absolute inset-0 rounded-full"
                    style={{
                        backgroundImage:
                            'repeating-radial-gradient(circle at center, rgba(0,0,0,0.55) 0px, rgba(0,0,0,0.55) 1px, transparent 1px, transparent 6px), radial-gradient(circle at 32% 28%, rgba(255,255,255,0.14), transparent 55%)',
                    }}
                />

                {/* Amber center label with a couple of faint rings and the spindle hole. */}
                <div className="absolute left-1/2 top-1/2 h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500 ring-1 ring-black/30">
                    <div className="absolute left-1/2 top-1/2 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-black/20" />
                    <div className="absolute left-1/2 top-1/2 h-[18%] w-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-950 ring-1 ring-white/10" />
                </div>
            </div>
        </div>
    );
}

/**
 * The logged-out landing page. Deliberately minimal: brand, a one-line pitch,
 * and the two auth entry points — nothing else for now. Forced dark + amber to
 * match the warm record-shop aesthetic of the authenticated app regardless of
 * the visitor's stored theme (they haven't chosen one yet).
 */
export default function Welcome() {
    return (
        <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
            <Head title="SpinList — Catalog your vinyl collection" />

            {/* Ambient warm glows — a record shop at night. */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />
                <div className="absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-orange-600/10 blur-3xl" />
                <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-amber-400/[0.06] blur-3xl" />
            </div>

            {/* Brand bar */}
            <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center px-6 py-6">
                <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20">
                        <Icon name="disc-3" size="sm" />
                    </span>
                    <span className="text-lg font-bold tracking-tight text-zinc-100">SpinList</span>
                </div>
            </header>

            {/* Hero */}
            <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-9 px-6 py-12 text-center">
                <SpinningRecord />

                <div className="space-y-4">
                    <h1 className="text-balance text-4xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
                        Your record collection,{' '}
                        <span className="text-amber-400">beautifully cataloged.</span>
                    </h1>
                    <p className="mx-auto max-w-md text-balance text-lg text-zinc-400">
                        SpinList is your personal vinyl shelf — track what you own, build a wishlist, and
                        rediscover the records gathering dust.
                    </p>
                </div>

                {/* Auth entry points — the whole point of this page. */}
                <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
                    <Link
                        href="/register"
                        className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-7 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/25 transition hover:bg-amber-400 hover:shadow-amber-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:w-auto"
                    >
                        Sign up
                        <Icon name="arrow-right" size="sm" className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <Link
                        href="/login"
                        className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/60 px-7 py-3 text-sm font-semibold text-zinc-200 backdrop-blur transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/50 sm:w-auto"
                    >
                        Log in
                    </Link>
                </div>
            </main>

            <footer className="relative z-10 mx-auto w-full max-w-6xl px-6 py-6 text-center text-xs text-zinc-600">
                Spin it. Track it. SpinList.
            </footer>
        </div>
    );
}
