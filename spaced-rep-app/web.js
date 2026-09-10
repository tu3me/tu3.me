/*
 * Everything that applies to the web build and to nothing else: the service
 * worker, the storage-persistence request and the PWA manifest link.
 *
 * In the extension package a zero-byte file sits at this path instead, so none
 * of it exists there — which is also where a analytics tag would go, and the
 * reason this file is swapped at deploy rather than shipped everywhere.
 */

// Paths are resolved against this file's own URL, because game pages sit a
// level deeper and the app may be served from a subdirectory.
const WEB_ROOT = document.currentScript.src;

// Extension pages cannot register a service worker, and there this file is empty.
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(new URL('sw.js', WEB_ROOT)).catch(() => { });
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
