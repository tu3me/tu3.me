/*
 * Offline shell for the web build. Registered by web.js, which exists only on
 * the site — the extension ships a zero-byte web.js and never gets here.
 *
 * Cache Storage is an origin-wide namespace, the same as IndexedDB: a bare "v1"
 * would collide with any other app served from this domain.
 *
 * RELEASE STEP: bump the version in CACHE whenever any shell file changes.
 * Nothing is refetched until the name changes, which is exactly what makes the
 * app instant offline — and exactly what serves stale code if you forget.
 */
const CACHE = 'spaced-repetition-app-2d152e23';

// Every file the app needs to start with no network. A new game means one more
// pair of lines here, alongside its line in registry.js.
const SHELL = [
    './',
    'index.html',
    'manifest.json',
    'registry.js',
    'catalog.js',
    'web.js',
    'core/app.css',
    'core/prepaint.js',
    'core/base.js',
    'core/srs.js',
    'core/storage.js',
    'core/seed.js',
    'core/store.js',
    'core/game-page.js',
    'cards',
    'cards/cards.js',
    'quiz',
    'quiz/quiz.js',
    'snake',
    'snake/snake.js',
    'icons/icon-192.png',
    'icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then(cache => cache.addAll(SHELL.map(p => new URL(p, self.registration.scope).href)))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(names => Promise.all(
                names.filter(n => n.startsWith('spaced-repetition-app-') && n !== CACHE)
                    .map(n => caches.delete(n))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Only our own GETs. Anything else — a POST, another origin — goes straight
    // to the network and is never cached.
    if (request.method !== 'GET') return;
    if (new URL(request.url).origin !== self.location.origin) return;

    event.respondWith(
        caches.match(request).then(hit => hit || fetch(request).catch(() => {
            // Offline and not in the shell: a navigation still gets the catalog,
            // which is enough to reach every game from there.
            if (request.mode === 'navigate') {
                return caches.match(new URL('index.html', self.registration.scope).href);
            }
            return Response.error();
        }))
    );
});
