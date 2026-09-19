/*
 * Offline shell for the web build. Registered by web.js, which exists only on
 * the site — the extension ships a zero-byte web.js and never gets here.
 *
 * Cache Storage is an origin-wide namespace, the same as IndexedDB: a bare "v1"
 * would collide with any other app served from this domain.
 *
 * The "v1" below is only what the file says when read on its own: build.sh
 * replaces it with a hash of everything in the bundle, so every real change
 * ships under a new name. Nothing is refetched until the name changes, which is
 * what makes the app instant offline — and what would serve stale code if the
 * name were left to a person to remember.
 */
const CACHE = 'spaced-repetition-app-0ffe6c0a';

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
    'core/tokens.js',
    'core/base.js',
    'core/srs.js',
    'core/storage.js',
    'core/seed.js',
    'core/store.js',
    'core/speech.js',
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

/*
 * Filling the cache, and doing it from the network rather than from whatever
 * the browser happens to be holding.
 *
 * cache.addAll would be the one-liner for this, and it was — but the fetches it
 * makes are ordinary ones, so they are served out of the HTTP cache like any
 * others. GitHub Pages hands every file out with max-age=600, which means a
 * phone that opened the app within ten minutes of a deploy could install a
 * worker under the new name and fill it with the old bytes. Nothing ever
 * refetches a shell file afterwards — that is the whole point of the name — so
 * that copy would be served until the deploy after next.
 *
 * `cache: 'reload'` is the request that will not be answered from a cache: it
 * goes to the network, and it drops what it gets back into the HTTP cache on
 * the way through.
 *
 * One failure still fails the whole install, which is what addAll did and what
 * is wanted: a shell missing one file is a shell that breaks offline in a way
 * nobody would notice until they were offline. A worker that refuses to install
 * leaves the last one running, which is a working app.
 */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then(cache => Promise.all(SHELL.map(p => {
                const url = new URL(p, self.registration.scope).href;

                return fetch(new Request(url, { cache: 'reload' })).then(answer => {
                    if (!answer.ok) throw new Error(`${answer.status} ${url}`);

                    return cache.put(url, answer);
                });
            })))
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
