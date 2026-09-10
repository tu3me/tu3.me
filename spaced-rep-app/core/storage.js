/**
 * Persistence: a plain async key-value store on top of IndexedDB.
 * Knows nothing about words, sets or progress — only keys and values.
 * IndexedDB is deliberate: the same code runs in an extension popup,
 * on a desktop page and in a mobile browser with no changes.
 *
 * Opening a database can hang forever: while another tab holds a connection
 * that blocks an upgrade, or a delete is still pending, the request stays
 * open and neither onsuccess nor onerror ever fires. Awaiting that during
 * boot leaves the user staring at a blank screen, so every path here settles.
 * When the database cannot be opened the app runs from its defaults without
 * saving, which is worse than saving but far better than not running.
 */
function storage() {
    const DB_NAME = 'SpacedRepetitionApp';
    const STORE_NAME = 'key_value_store';

    // How long to wait for a connection before giving up on this attempt
    const OPEN_TIMEOUT = 3000;
    // ...and how long before trying again, so a transient block recovers
    const RETRY_DELAY = 10000;

    let db = null;
    let opening = null;
    let retryAfter = 0;
    let warned = false;

    // Resolves with the database, or with null if it could not be opened
    function open() {
        return new Promise((resolve) => {
            let settled = false;
            const settle = (value) => {
                if (settled) return;
                settled = true;
                resolve(value);
            };

            let request;
            try {
                request = indexedDB.open(DB_NAME, 1);
            } catch (e) {
                // Some browsers throw outright when storage is switched off
                return settle(null);
            }

            const timer = setTimeout(() => settle(null), OPEN_TIMEOUT);

            request.onupgradeneeded = (event) => {
                const opened = event.target.result;
                if (!opened.objectStoreNames.contains(STORE_NAME)) {
                    opened.createObjectStore(STORE_NAME);
                }
            };

            request.onsuccess = (event) => {
                clearTimeout(timer);
                const opened = event.target.result;

                // Another tab wants to upgrade or delete the database: step
                // aside instead of being the connection that blocks it
                opened.onversionchange = () => {
                    opened.close();
                    if (db === opened) db = null;
                };

                if (settled) {
                    opened.close(); // this attempt already timed out
                    return;
                }
                settle(opened);
            };

            request.onerror = () => {
                clearTimeout(timer);
                settle(null);
            };

            // Fires while another connection blocks this one. Keep waiting —
            // the other tab may well close before OPEN_TIMEOUT runs out.
            request.onblocked = () => { };
        });
    }

    async function init() {
        if (db) return;
        if (opening) {
            await opening;
            return;
        }
        if (Date.now() < retryAfter) return;

        opening = open();
        const opened = await opening;
        opening = null;

        if (opened) {
            db = opened;
            return;
        }

        retryAfter = Date.now() + RETRY_DELAY;
        if (!warned) {
            warned = true;
            console.warn('storage: IndexedDB unavailable — running without saving');
        }
    }

    // null when there is no usable connection: callers degrade, never throw
    async function objectStore(mode) {
        if (!db) await init();
        if (!db) return null;
        try {
            return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
        } catch (e) {
            // The connection was closed underneath us by onversionchange
            db = null;
            return null;
        }
    }

    async function set(key, value) {
        const os = await objectStore('readwrite');
        if (!os) return false;
        return new Promise((resolve) => {
            const request = os.put(value, key);
            request.onsuccess = () => resolve(true);
            request.onerror = () => resolve(false);
        });
    }

    async function get(key) {
        const os = await objectStore('readonly');
        if (!os) return undefined;
        return new Promise((resolve) => {
            const request = os.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(undefined);
        });
    }

    storage.init = init;
    storage.get = get;
    storage.set = set;
    // Hook for telling the player their progress is not being saved
    storage.isAvailable = () => db !== null;
}
