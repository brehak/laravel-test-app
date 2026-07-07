<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    {{-- PWA head tags (manual injection for the blade host — the fancyPwa Vite
         plugin emits these files on build; FancyPwaProvider registers the SW). --}}
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#E4572E" />

    {{-- SEO / OpenGraph / Twitter tags. The package renders the <title> with the
         `inertia` attribute on Inertia routes, so Inertia's client-side head manager
         still owns the title on SPA navigation — no separate <title inertia> needed.
         Controllers may pass a page-specific SEOData object via ->withViewData('seo', …)
         (see PublicCollectionController@show); otherwise the config fallbacks apply. --}}
    {!! seo($seo ?? null) !!}

    {{-- Apply the saved/system theme before first paint to avoid a flash. --}}
    <script>
        (function () {
            try {
                var t = localStorage.getItem('fancy.theme');
                var dark = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (dark) document.documentElement.classList.add('dark');
            } catch (e) { /* noop */ }
        })();
    </script>

    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
    @inertiaHead
</head>
<body class="min-h-screen bg-white text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
    @inertia
</body>
</html>
