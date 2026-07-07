import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fancyPwa } from '@particle-academy/fancy-pwa/vite';

/**
 * fancyPwa() emits sw.js + manifest.webmanifest into Vite's outDir, which on
 * Laravel is public/build (served at /build/*). But a service worker can only
 * control pages at or below its own URL's path, so /build/sw.js could never
 * control /vinyls. Hoist both files to the web root (public/) after the client
 * build so /sw.js gets scope '/' and /manifest.webmanifest resolves. The SW's
 * injected precache paths are already root-absolute (/build/assets/...), so the
 * move is safe. Runs on build only; no-op in dev.
 */
function hoistPwaToWebRoot() {
    const root = fileURLToPath(new URL('./public', import.meta.url));
    const move = (name) => {
        const from = `${root}/build/${name}`;
        if (existsSync(from)) copyFileSync(from, `${root}/${name}`);
    };
    return {
        name: 'spinlist-hoist-pwa-to-web-root',
        apply: 'build',
        closeBundle() {
            move('sw.js');
            move('manifest.webmanifest');
        },
    };
}

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        react(),
        tailwindcss(),
        // No-op in dev (never fights HMR); on `vite build` it emits
        // manifest.webmanifest + bundles resources/js/sw.ts -> public build sw.js.
        fancyPwa({
            sw: 'resources/js/sw.ts',
            manifest: {
                name: 'SpinList',
                short_name: 'SpinList',
                start_url: '/vinyls',
                scope: '/',
                display: 'standalone',
                theme_color: '#E4572E',
                background_color: '#0a0a0a',
                icons: [
                    { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
                ],
            },
        }),
        hoistPwaToWebRoot(),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./resources/js', import.meta.url)),
        },
        dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    },
    server: {
        port: 5175,
        strictPort: true,
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
