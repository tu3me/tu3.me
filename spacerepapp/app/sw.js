/*
 * Offline shell for the site. Registered by web.js, which returns at once in
 * the extension, so the extension never gets here.
 *
 * Cache Storage is an origin-wide namespace, the same as IndexedDB: a bare "v1"
 * would collide with any other app served from this domain, and so would a
 * second copy of this one -- tu3.me has held two at once. Hence the scope in
 * the name, and the cleanup below touching only names under its own scope:
 * it used to delete every "spaced-repetition-app-*" but its own, and two copies
 * on one origin would have wiped each other's offline copy on every visit.
 *
 * The name changes with every change of the code, which is what makes a new
 * release reach people: nothing is refetched until it does. It comes from
 * core/stamp.js (written by stamp.py after every change of app/), loaded here
 * rather than written in by a build step, so app/ served as it is works. The
 * browser checks imported scripts for changes as well as this file, so a new
 * stamp is a new worker. Before 28 November 2026 build.sh wrote a hash of the
 * bundle in here instead.
 */
importScripts('core/stamp.js');

const PREFIX = 'spaced-repetition-app-' + self.registration.scope + ' ';
const CACHE = PREFIX + CODE_STAMP.version + ' ' + CODE_STAMP.changed;

// Every file the app needs to start with no network. A new game means its
// lines here -- the page, the game and its icon.js -- alongside its line in
// registry.js.
const SHELL = [
    './',
    'index.html',
    'site.webmanifest',
    'registry.js',
    'i18n.js',
    'onboarding.js',
    'catalog.js',
    'web.js',
    'core/app.css',
    'core/prepaint.js',
    'core/tokens.js',
    'core/base.js',
    'core/track.js',
    'core/srs.js',
    'core/storage.js',
    'core/migrate.js',
    'core/vocab.js',
    'core/store.js',
    'core/remote.js',
    'core/stamp.js',
    'core/sync.js',
    'core/speech.js',
    'core/sfx.js',
    'core/game-page.js',
    'core/icons.js',
    'flashcards',
    'flashcards/flashcards.js',
    'flashcards/icon.js',
    'quiz',
    'quiz/quiz.js',
    'quiz/icon.js',
    'wordcraft',
    'wordcraft/wordcraft.js',
    'wordcraft/icon.js',
    'snake',
    'snake/snake.js',
    'snake/icon.js',
    'search',
    'search/search.js',
    'search/icon.js',
    'search2',
    'search2/search2.js',
    'search2/icon.js',
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
                names.filter(n => n.startsWith(PREFIX) && n !== CACHE)
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

    /*
     * Ignoring the query, because every way into a game carries one.
     *
     * The shell is cached under the addresses in SHELL, which are bare paths,
     * and nav.game leaves for `snake?set=3&early=1`. A match is by whole URL
     * unless told otherwise, so that request missed the cache, went to the
     * network, found none and fell through to the fallback below: offline,
     * every game button opened the catalog again. The catalog itself always
     * worked, which is what made it look like the app worked.
     *
     * Safe across the shell: it is static files, and none of them is a
     * different file for a different query. The app puts nothing in a query
     * but where a session is going.
     */
    event.respondWith(
        caches.match(request, { ignoreSearch: true }).then(hit => hit || fetch(request).catch(() => {
            // Offline and not in the shell: a navigation still gets the catalog,
            // which is enough to reach every game from there.
            if (request.mode === 'navigate') {
                return caches.match(new URL('index.html', self.registration.scope).href);
            }
            return Response.error();
        }))
    );
});
