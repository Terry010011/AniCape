const CACHE_NAME = 'anicape-v1.3';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './manifest.json',
    './config.json',
    './assets/favicon.svg',
    './assets/logo.svg',
    './assets/logo_light.svg',
    './assets/logo_dark.svg',
    './assets/tutorial.svg',
    './assets/og-image.png',
    './assets/steve.png',
    './assets/128x64.png',
    './assets/256x128.png',
    './assets/512x256.png',
    './assets/1024x512.png',
    './assets/2048x1024.png',
    './assets/64x32.png',
    './assets/logo.png',

    // Vendor Libraries
    './libs/pako.min.js',
    './libs/UPNG.min.js',
    './libs/gif.js',
    './libs/gif.worker.js',
    './libs/omggif.js',
    './libs/jszip.min.js',
    './libs/driver.css',
    './libs/driver.js.iife.js',
    './libs/skinview3d.bundle.js',
    './libs/squoosh_oxipng.js',
    './libs/squoosh_oxipng_bg.wasm',

    // Source - Partials
    './src/partials/loader.js',
    './src/partials/modal-about.html',
    './src/partials/modal-export.html',
    './src/partials/modal-faq.html',

    // Source - Constants & Core Framework
    './src/constants.js',
    './src/core/EventBus.js',
    './src/core/StateManager.js',
    './src/core/state.js',
    './src/core/i18n.js',
    './src/core/utils.js',
    './src/core/locales/en.json',
    './src/core/locales/zh.json',

    // Source - Shared Utilities
    './src/layers/LayerTransform.js',

    // Source - Logic
    './src/logic/renderer.js',
    './src/logic/animation.js',
    './src/logic/history.js',
    './src/logic/layers.js',
    './src/logic/project.js',
    './src/logic/tutorial.js',
    './src/logic/export.js',
    './src/logic/ui.js',

    // Source - UI Components
    './src/ui/colors.js',
    './src/ui/layers.js',
    './src/ui/properties.js',

    // Source - Events
    './src/events/drag.js',
    './src/events/touch.js',
    './src/events/keyboard.js',
    './src/events/wheel.js',
    './src/events/drop.js',
    './src/events/controls.js',
    './src/events/bootstrap.js',

    // Source - Export & Workers
    './src/export/compositor.js',
    './src/export/optimizer.js',
    './src/export/preview3d.js',
    './src/workers/oxipng.worker.js',
    './src/workers/upng.worker.js',

    // Parsers
    './src/parsers/GifParser.js',
    './src/parsers/SimpleGifHandler.js'
];

// Install Event - Pre-cache everything
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Pre-caching all assets');
            return cache.addAll(ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Stale-While-Revalidate Strategy
// Ensures fast loading from cache while updating the cache in background
self.addEventListener('fetch', event => {
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(response => {
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // Silent catch, fallback is already provided by cache.match
                });
                return response || fetchPromise;
            });
        })
    );
});
