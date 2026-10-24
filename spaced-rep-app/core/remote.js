/*
 * The app's own server: where it is, who is asking, and how a request gets
 * there. Shared by the two things that talk to it -- sync.js, which keeps the
 * sets the same on every device of a profile, and track.js, which sends the
 * analytics. The whole design, with what was turned down and why, is in
 * docs/BACKEND.md.
 *
 * Nothing here waits for the network on anybody's behalf. The app runs out of
 * IndexedDB as it always has; a request that fails is answered with an error
 * the caller is free to ignore, and the next one tries again.
 */
function remote() {
    /*
     * Which server, decided when the page runs rather than when it is built:
     * the store build and the live site talk to the live one, everything else
     * -- the unpacked extension, localhost, a folder opened from disk, the
     * temporary site at tu3.me -- to the test one beside it, which has a
     * database of its own. Development then never lands in the analytics, and
     * a profile made while testing is never one anybody plays on.
     *
     * The store build is told apart by its id, which is the id in the address
     * of its page in the store -- see rateUs in catalog.js. An unpacked copy of
     * the same folder gets a different one.
     *
     * `api-base` in localStorage overrides both, for working against the
     * stand-in devserver.py runs (`api/`, resolved against the page). A knob
     * for development and nothing else: nothing in the app writes it.
     */
    const STORE_ID = 'lpklkkakejhmfbckgonadkbcdpdfohfj';
    const LIVE_ORIGIN = 'https://spacerepeat.app';
    const LIVE = 'https://spacerepeat.app/api/';
    const TEST = 'https://spacerepeat.app/test/api/';

    const inExtension = location.protocol === 'chrome-extension:';

    function base() {
        try {
            const forced = localStorage.getItem('api-base');
            if (forced) return new URL(forced, location.href).href;
        } catch (e) { }

        if (inExtension) return chrome.runtime.id === STORE_ID ? LIVE : TEST;
        return location.origin === LIVE_ORIGIN ? LIVE : TEST;
    }

    /*
     * Which of the three deliveries this is: the extension, the site in a tab,
     * or the site installed as an app. One letter, because it is written on
     * every visit of the analytics.
     */
    function platform() {
        if (inExtension) return 'e';
        if (window.matchMedia && matchMedia('(display-mode: standalone)').matches) return 'p';
        return 'w';
    }

    /*
     * The version, which only the extension can read off its manifest: the
     * site ships the PWA manifest in that place, which has no version in it.
     * build.sh writes the extension's number in over the placeholder below, so
     * the site says the same thing the extension it was built with does.
     */
    const BUILD_VERSION = '0.2.8';

    // Unbuilt -- served straight out of app/ while developing -- the
    // placeholder is still there, and says so as "dev". Asked as a prefix
    // rather than spelled out, or build.sh would replace the question too.
    function version() {
        if (inExtension && chrome.runtime.getManifest) return chrome.runtime.getManifest().version;
        return BUILD_VERSION.startsWith('__') ? 'dev' : BUILD_VERSION;
    }

    /*
     * The two ids: one for the device, one for the profile its sets belong to.
     *
     * Twelve characters of Crockford's base32, which is sixty bits: the
     * profile's is typed by hand on a second device, and that is what it is
     * short for. Sixty bits is plenty against guessing -- what is guessed is
     * a list of words -- and the server limits how fast anybody can try.
     *
     * Made here rather than by the server, because they are needed before the
     * first request can be made: the first run may well be offline, and the
     * analytics of it are being written from the first second. The one thing
     * the server could promise -- that nobody else has the id -- is checked on
     * the first sync of a new profile instead, see sync.js.
     *
     * Each of 256 byte values masked to five bits is uniform, since 256 is a
     * multiple of 32: no character comes up more often than another.
     */
    const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

    function newId() {
        return Array.from(crypto.getRandomValues(new Uint8Array(12)), b => ALPHABET[b & 31]).join('');
    }

    /*
     * A code as somebody typed or pasted it, as the id it stands for.
     *
     * It arrives however it arrives: from a messenger with a line break in it,
     * in lower case, grouped or not, with O typed for 0 and I or L for 1. The
     * alphabet was chosen so that those last three can be read back without
     * guessing, and this is where that is done.
     */
    function normalize(text) {
        return String(text || '').toUpperCase()
            .replace(/[\s-]/g, '')
            .replace(/O/g, '0')
            .replace(/[IL]/g, '1');
    }

    const valid = (id) => /^[0-9A-HJKMNP-TV-Z]{12}$/.test(id);

    // Shown in three groups of four, which is how it is read out and typed.
    const grouped = (id) => (id.match(/.{1,4}/g) || []).join('-');

    /*
     * What this device keeps about its server, under one key: both ids, and
     * the two moments sync works from. Not in word_sets, which holds the sets
     * and nothing else (see ARCHITECTURE.md §5), and not in settings, which
     * are this device's own answers to its own screens.
     *
     * `fresh` marks a profile the server has not confirmed yet. Its first sync
     * says so, and a server that already knows the id from another device
     * answers that it is taken -- see sync.js.
     *
     * `past` is the profiles this device has left for another by its code,
     * newest first, as `{ user, sets, left }`: the settings offer them to come
     * back to, so that taking on another device's code never costs the one
     * that was here -- see sync.join. Gone with "Clear data", which erases the
     * way back to them along with everything else.
     *
     * Two more belong to the device rather than to sync, and live here because
     * this is the record that outlives "Clear data": `visits`, how many visits
     * the device has begun (see `seq` in track.js), and `failedAt`/`failures`,
     * the run of failed requests the settings warn about (see sync.js).
     */
    let meta = null;

    async function init() {
        meta = (await storage.get('sync')) || {};

        let changed = false;
        if (!meta.device) {
            meta.device = newId();
            changed = true;
        }
        if (!meta.user) {
            meta.user = newId();
            meta.fresh = true;
            changed = true;
        }

        if (changed) await storage.set('sync', meta);
    }

    async function update(patch) {
        Object.assign(meta, patch);
        return storage.set('sync', meta);
    }

    /*
     * Whether to talk to the server at all.
     *
     * Not without storage: the ids live in it, and a device that cannot keep
     * them would be a new device and a new profile on every page, each of them
     * a stranger to the analytics and a profile nobody can ever reach again.
     */
    const enabled = () => !!meta && storage.isAvailable() && typeof fetch === 'function';

    /*
     * One request, answered with its JSON or with `{ error }`.
     *
     * The body is gzipped where the browser can do it, and the server reads
     * the bytes rather than the header to tell. Sets carry their whole history,
     * and the analytics repeat the same few names in every visit: both shrink
     * to a fraction.
     *
     * The profile's id goes in a header of its own. In the address it would
     * sit in every access log on the way; `Authorization` is the header made
     * for it, and the one a shared host's PHP is most often not handed.
     *
     * Its own `key` for the one request that asks about a profile this device
     * does not belong to yet -- see sync.join.
     *
     * `leaving` for a request made as the page leaves the screen -- the visit
     * that has just ended, see track.js. Sent at once and uncompressed:
     * compressing is asynchronous, and a page on its way out should have its
     * request on the wire before it does anything else. A visit is a few
     * kilobytes either way -- 3.4 KB the largest in the scenario run, 1 KB
     * gzipped. And with keepalive, which lets the request outlive the page,
     * up to the browser's limit for such requests: 64 KB in flight, past which
     * Chrome refuses the request outright (measured: 50 KB went, 70 KB was
     * refused). A body that large goes without it; a plain request still left
     * a closing popup in every case measured.
     */
    const TIMEOUT = 15000;
    const KEEPALIVE_LIMIT = 60000;

    async function post(path, body, key, options) {
        const leaving = !!(options && options.leaving);
        const json = JSON.stringify(body);
        const headers = { 'Content-Type': 'application/json', 'X-Sync-Key': key || meta.user };

        let payload = json;
        if (!leaving && typeof CompressionStream === 'function') {
            try {
                payload = await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))).blob();
                headers['Content-Encoding'] = 'gzip';
            } catch (e) {
                payload = json;
            }
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT);

        try {
            const answer = await fetch(new URL(path, base()).href, {
                method: 'POST',
                headers: headers,
                body: payload,
                cache: 'no-store',
                credentials: 'omit',
                keepalive: leaving && new Blob([json]).size < KEEPALIVE_LIMIT,
                signal: controller.signal
            });

            if (!answer.ok) return { error: 'http ' + answer.status };
            return await answer.json();
        } catch (e) {
            return { error: e && e.name === 'AbortError' ? 'timeout' : 'network' };
        } finally {
            clearTimeout(timer);
        }
    }

    // Whether this copy talks to the live server: the store build and the live
    // site. The background worker says so in the address of the farewell page,
    // which has to know which database a departure belongs in.
    remote.live = () => base() === LIVE;

    remote.init = init;
    remote.enabled = enabled;
    remote.meta = () => meta;
    remote.update = update;
    remote.post = post;
    remote.newId = newId;
    remote.normalize = normalize;
    remote.valid = valid;
    remote.grouped = grouped;
    remote.platform = platform;
    remote.version = version;
}
remote();
