const CACHE_NAME = 'openwrt-alpha-v1';
const ASSETS_TO_CACHE = [
    './css/cascade.css',
    './js/menu-bootstrap.js',
    './alpha-os.png',
    './brand.png',
    './manifest.json'
];

// Install Event: Cache Static Assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Activate Event: Cleanup Old Caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
});

// Fetch Event: Network First, Fallback to Cache (Safe strategy for dynamic admin panels)
// Or Cache First for specific static assets?
// For an admin panel, we generally want fresh content for HTML/API, but static assets can be cached.
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Check if request is for one of our static assets
    const isStatic = ASSETS_TO_CACHE.some(asset => url.pathname.endsWith(asset.replace('.', '')));

    if (isStatic) {
        // Cache First for known static assets
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request);
            })
        );
    } else {
        // Network Only (or Network First) for everything else (HTML, API)
        // failing back to match if network fails (offline support for visited pages?)
        // For now, let's just do simple fetch to avoid breaking LuCI logic
        event.respondWith(fetch(event.request));
    }
});
