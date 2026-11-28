/*
 * Everything that applies to the web build and to nothing else: the service
 * worker, the storage-persistence request and the PWA manifest link.
 *
 * In the extension package a zero-byte file sits at this path instead, so none
 * of it exists there — which is also where an analytics tag would go, and the
 * reason this file is swapped at deploy rather than shipped everywhere.
 */

// Paths are resolved against this file's own URL, because game pages sit a
// level deeper and the app may be served from a subdirectory.
const WEB_ROOT = document.currentScript.src;

/*
 * The offline copy, and keeping it from being the copy forever.
 *
 * Extension pages cannot register a worker, and there this file is empty.
 *
 * Registering is the easy half. The hard half is that the worker is
 * cache-first: the page being read right now was served out of the cache
 * before the browser had even looked at sw.js, so the newest a visit can be is
 * the version installed on the visit before it. Left alone, that means the app
 * shows yesterday's build, quietly, every time.
 *
 * Two things fix it, and both are needed.
 *
 * The check. A browser looks for a new worker when a page navigates, which
 * covers a tab but not an installed app that was never closed — brought back
 * from the switcher there is no navigation, so there is no check, and the thing
 * can sit on one build for as long as it is left running. Asking on every
 * return costs one conditional request for a file of two kilobytes.
 *
 * The reload. A new worker calls skipWaiting and claim, so it takes over at
 * once — but the page it takes over was already drawn from the old cache, and
 * worse, it is now a page whose next request will be answered from the new one.
 * Half of one build and half of another is the one state that produces bugs
 * nobody can reproduce. So the page is reloaded the moment the worker under it
 * changes, and comes back whole.
 *
 * Not on the first visit: there is no controller to change from, the claim
 * fires the same event, and the page is already the newest there is. And not
 * twice — the new worker is in place after the reload and the event does not
 * come again, but a flag costs nothing next to a page that reloads forever.
 *
 * A round in progress survives it: every game writes what it is doing to
 * storage as it goes, which is what makes the Continue banner work.
 */
if ('serviceWorker' in navigator) {
    const wasServed = !!navigator.serviceWorker.controller;

    let reloading = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!wasServed || reloading) return;

        reloading = true;
        location.reload();
    });

    navigator.serviceWorker.register(new URL('sw.js', WEB_ROOT)).then((worker) => {
        const look = () => {
            if (!document.hidden) worker.update().catch(() => { });
        };

        document.addEventListener('visibilitychange', look);
        look();
    }).catch(() => { });
}

// An installed PWA is normally granted this outright. A refusal in a plain tab
// only means the browser may evict storage under pressure.
if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => { });
}

// The manifest link is created here rather than written into the HTML: in the
// extension the path manifest.json points at the MV3 manifest, which the browser
// would then try to parse as a web app manifest.
const manifestLink = document.createElement('link');
manifestLink.rel = 'manifest';
manifestLink.href = new URL('manifest.json', WEB_ROOT).href;
document.head.appendChild(manifestLink);
