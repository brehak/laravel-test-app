import { createInertiaApp } from '@inertiajs/react';
import { setupFancyApp } from '@particle-academy/fancy-inertia';
import { Toast } from '@particle-academy/react-fancy';
import { FancyPwaProvider, InstallBanner, OfflineBanner, UpdateToast } from '@particle-academy/fancy-pwa';
import { registerAll, registerBuiltinThemes } from '@particle-academy/fancy-echarts';
import type { ReactNode } from 'react';
import '@particle-academy/react-fancy/styles.css';

// ECharts registration is module-scoped per bundle entry. We boot with
// `appRoot: false` (see below), so FancyAppRoot's auto-registration never runs —
// switching to <FancyAppRoot withECharts> would also replace our custom PWA +
// Toast provider tree, so we register here instead. This is the client entry
// (ssr.tsx is the server one), so it runs client-side only, and every <EChart>
// on any page has its chart types + "dark-preset"/"vintage"/"pastel" themes
// ready before it renders. Both calls no-op after the first invocation.
registerAll();
registerBuiltinThemes();

const appName = import.meta.env.VITE_APP_NAME ?? 'Fancy';

/**
 * App-wide providers mounted above the Inertia outlet — they survive page
 * swaps (toasts, etc. don't reset on navigation). Add `FancyDataRoot` from
 * `@particle-academy/fancy-query` here once you wire Laravel Echo for
 * realtime server-state invalidation.
 *
 * FancyPwaProvider registers /sw.js on the client (SSR-safe no-op on the
 * server). The PWA chrome sits inside Toast.Provider so UpdateToast can fire
 * its react-fancy toast; `color="amber"` keeps the banners on the dark warm
 * palette. Keep this tree identical to ssr.tsx so markup hydrates cleanly.
 */
const providers = (outlet: ReactNode): ReactNode => (
    <FancyPwaProvider options={{ swUrl: '/sw.js' }}>
        <Toast.Provider position="bottom-right">
            <OfflineBanner color="amber" />
            <InstallBanner color="amber" title="Install SpinList" installLabel="Add to home screen" />
            <UpdateToast />
            {outlet}
        </Toast.Provider>
    </FancyPwaProvider>
);

createInertiaApp({
    title: (title) => (title ? `${title} — ${appName}` : appName),
    resolve: (name) => {
        const pages = import.meta.glob('./Pages/**/*.tsx');
        const page = pages[`./Pages/${name}.tsx`];
        if (!page) {
            return Promise.reject(new Error(`Inertia page not found: ${name}`));
        }
        return page().then((module: { default: unknown }) => module.default);
    },
    // setupFancyApp builds the page-transition + provider tree and auto-detects
    // hydrateRoot vs createRoot. `appRoot: false` keeps the root lean (just our
    // providers); set it to `{}` to mount the full FancyAppRoot (Toast +
    // ScreenSystem + ECharts registration) instead.
    setup: ({ App, props, el }) => setupFancyApp({ el, App, props, providers, appRoot: false }),
});
