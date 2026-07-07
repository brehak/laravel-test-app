/**
 * SpinList service worker — composed from the fancy-pwa strategy toolkit
 * (Workbox-free). Bundled to `sw.js` by the `fancyPwa()` Vite plugin on
 * `npm run build`, which injects `self.__FANCY_PRECACHE` (hashed build assets)
 * and `self.__FANCY_VERSION` (cache-busting build hash). No-op in dev.
 */
import {
    precache,
    registerRoute,
    networkFirst,
    cacheFirst,
    staleWhileRevalidate,
    offlineFallback,
} from '@particle-academy/fancy-pwa/sw';

// App shell — the plugin-injected hashed assets are added automatically.
precache(['/vinyls', '/offline.html']);

// Inertia/API navigations to the collection: fresh-first, fall back to cache.
registerRoute(/\/vinyls/, networkFirst({ ttl: 60_000 }));

// Album art & static assets: serve from cache first (great for cover images).
registerRoute(/\.(png|jpg|jpeg|svg|woff2)$/, cacheFirst({ max: 60 }));

// Everything else that's a navigation: instant cache, refresh in background.
registerRoute((req) => req.mode === 'navigate', staleWhileRevalidate());

// When offline and nothing is cached, show the branded offline page.
offlineFallback('/offline.html');
