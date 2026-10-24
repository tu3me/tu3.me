/*
 * The analytics: what happened on this device, gathered in IndexedDB and sent
 * to the app's own server, never read back. docs/ANALYTICS.md has every event
 * and how to read it; docs/BACKEND.md has the visit, the format and the way
 * they travel.
 *
 * The unit is a visit: one unbroken stretch on screen. It starts when a page
 * of the app is opened, or comes back to the screen; it ends when the screen is
 * left -- the popup closed, the tab or the window switched away from, the
 * installed app sent to the background. Moving from one page of the app to the
 * next is not leaving: the popup goes from the catalog to a game and back
 * inside one visit. A visit is named by the device and the moment it began --
 * nothing else is needed to tell two apart.
 *
 * It is sent the moment it ends, while the page can still send it, and kept in
 * a queue until that is known to have worked: whatever did not go -- no
 * network, an answer that came back to a popup already gone -- goes with the
 * next start of any page, or as the network comes back to a page that is
 * open. A visit, once ended, never changes, so sending one
 * twice is harmless: the server keeps the first copy and passes over the rest.
 *
 * An event is two things: when, in milliseconds from the start of the visit,
 * and a string -- a name and its parts joined by `|`, the way the `run` mark on
 * a repetition is written. The server keeps the strings as they come and
 * nothing parses them until somebody asks a question, which is what lets an
 * event be added, or a part appended to one, without touching the server. The
 * one rule that keeps old visits readable: what a part means never changes.
 * New parts go on the end; a different meaning is a different name.
 *
 * What is written is the moment that meant something, not raw input: where a
 * scroll came to rest rather than every step of it, the width a drag ended
 * on rather than the drag. And never what anybody typed, nor the text of what
 * they pressed -- the bubbles on this screen are a person's own words.
 */
function track(name, ...args) {
    track.record(name, args);
}

function analytics() {
    const SEP = '|';
    const VISIT_KEY = 'visit:';
    const INDEX_KEY = 'visit_index';

    // This tab's visit, a second time, in sessionStorage -- see carriedOver.
    const MIRROR_KEY = 'visit-data';

    /*
     * A visit that never said it ended is sent once it has been quiet this
     * long, and not before: until then it may be the visit of another tab of
     * the app, still on screen, and a visit sent early is a visit whose later
     * events the server will never take.
     *
     * Such visits are the ones whose page died without leaving the screen --
     * a crash, a process the system killed -- and, in a browser without the
     * Navigation API, every visit that ended with its tab closed.
     */
    const STALE = 30 * 60 * 1000;

    // Visits kept while there is no way to send them. Past this the oldest go:
    // months offline must not grow the database without end.
    const MAX_QUEUED = 200;

    // Sent at most this many to a request, so a queue that waited a month goes
    // up as several moderate bodies rather than one enormous one.
    const PER_REQUEST = 50;

    let visit = null;
    let here = null;

    // Whatever is recorded while there is no visit -- an error while the page
    // is still booting, something said by a page left running in the
    // background -- waits here with its own moment and joins the next visit.
    // Capped, because on a device that never starts a visit (no storage)
    // nothing would ever take it.
    let early = [];

    // A part of an event cannot contain the separator: it would become two
    // parts. Only the free text a name ends with is allowed to.
    const part = (value) => {
        if (value == null) return '';
        if (Array.isArray(value)) return value.map(part).join(',');
        return String(value).replace(/\|/g, '/');
    };

    const line = (name, parts) => [name].concat(parts.map(part)).join(SEP);

    /*
     * Written twice: to IndexedDB, which is the queue and outlives the tab,
     * and to sessionStorage, which is synchronous.
     *
     * The second write is for the moment between two pages. A press that
     * moves the popup to another page is recorded, and the page is gone before
     * the write to IndexedDB lands -- measured, both in the scenario run, where
     * one press of Back in four never reached the database, and with a probe
     * extension, where a write started on the way out of a page was lost every
     * time. sessionStorage is written before the press is over, and the next
     * page in the same tab reads it -- see carriedOver.
     */
    function persist() {
        if (!visit) return;

        storage.set(VISIT_KEY + visit.start, visit);

        try {
            sessionStorage.setItem(MIRROR_KEY, JSON.stringify(visit));
        } catch (e) { }
    }

    function record(text, at) {
        const when = at || Date.now();

        if (!visit) {
            if (early.length < 100) early.push([when, text]);
            return;
        }

        visit.events.push([Math.max(0, when - visit.start), text]);
        persist();
    }

    track.record = (name, parts) => record(line(name, parts));

    /*
     * An event that may come in a flood: the same error from the same place
     * on every tick of a game, the same missing voice on every tap. The first
     * is written; the ones after only raise the count in it, which sits right
     * after the parts that say what happened -- the text, if any, comes last.
     * The count is of all of them, the first included.
     *
     * Counted inside one visit. A visit is only sent once it is over, so
     * until then its events can be changed where they lie.
     */
    function tally(name, parts, text) {
        const head = line(name, parts) + SEP;
        const tail = text == null ? '' : SEP + String(text).slice(0, 300);

        if (visit) {
            const hit = visit.events.find(e => e[1].startsWith(head) && e[1].endsWith(tail)
                && /^\d+$/.test(e[1].slice(head.length, e[1].length - tail.length)));

            if (hit) {
                const count = Number(hit[1].slice(head.length, hit[1].length - tail.length));
                hit[1] = head + (count + 1) + tail;
                persist();
                return;
            }
        }

        record(head + '1' + tail);
    }

    track.tally = tally;

    /*
     * What the visit began with. An object rather than parts, because this is
     * the half most likely to grow -- a field added here is simply missing from
     * older visits, where a new part in the middle of a line would have made
     * them unreadable.
     *
     * `nav` is the languages the browser says its person reads, as bare codes:
     * the one way to see somebody whose language is not on the first screen --
     * they skip it, and what is stored is whatever the screen was standing on.
     *
     * `ua` is the browser and the system, see uaOf. `tz` is the time zone by
     * its name -- Asia/Almaty, Europe/Berlin -- which is the country too, near
     * enough, without an IP address being looked at by anybody; `utc` is its
     * offset in minutes at the start of the visit, which is what "the next
     * day" means for the person rather than for the server.
     */
    async function stateOf(settings) {
        const s = settings || (await storage.get('settings')) || {};
        const active = await storage.get('active_session');

        let width = null;
        try {
            width = Number(localStorage.getItem('app-width')) || null;
        } catch (e) { }

        const nav = [];
        (navigator.languages || [navigator.language]).forEach(tag => {
            const code = String(tag || '').split('-')[0].toLowerCase();
            if (code && !nav.includes(code) && nav.length < 3) nav.push(code);
        });

        let tz = null;
        try {
            tz = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
        } catch (e) { }

        return {
            myLang: s.myLang || null,
            learn: s.learnLangs || [],
            theme: s.isDark === false ? 'light' : 'dark',
            width: width,
            muted: !!s.muted,
            resume: (active && active.game) || null,
            nav: nav,
            ua: uaOf(),
            tz: tz,
            utc: -new Date().getTimezoneOffset()
        };
    }

    /*
     * The browser, its major version, the system and whether it is a phone --
     * what decides which of the app's paths a person is on: the popup, a tab, an
     * installed app on a phone; a browser with the Navigation API or without
     * (see listen). And `bot`, for the visitors that are not people: anything
     * that runs the site's script -- a search engine's renderer, a page checker
     * -- is a new device and a new profile, and has to be told apart before
     * anything about "new users" can be counted.
     *
     * The brand list is believed first where there is one (Chromium browsers
     * say outright whether they are Chrome, Edge, Opera or Yandex); the
     * user-agent string, in the order that keeps one browser from being read as
     * another -- Edge and Opera call themselves Chrome as well -- answers for
     * the rest.
     */
    const BRANDS = { 'Google Chrome': 'Chrome', 'Microsoft Edge': 'Edge', 'Opera': 'Opera', 'YaBrowser': 'Yandex',
        'Yandex': 'Yandex', 'Brave': 'Brave', 'Vivaldi': 'Vivaldi' };

    const UA_BROWSERS = [
        ['Edge', /Edg(?:e|A|iOS)?\/(\d+)/], ['Opera', /OPR\/(\d+)/], ['Yandex', /YaBrowser\/(\d+)/],
        ['Samsung', /SamsungBrowser\/(\d+)/], ['Firefox', /(?:Firefox|FxiOS)\/(\d+)/],
        ['Chrome', /(?:Chrome|CriOS)\/(\d+)/], ['Safari', /Version\/(\d+).*Safari/]
    ];

    function uaOf() {
        const ua = String(navigator.userAgent || '');
        const data = navigator.userAgentData || null;
        const brands = (data && data.brands) || [];
        const out = { browser: '', version: 0, os: '', mobile: false };

        const named = brands.find(b => BRANDS[b.brand]);
        if (named) {
            out.browser = BRANDS[named.brand];
            out.version = Number(named.version) || 0;
        } else {
            const hit = UA_BROWSERS.find(([, pattern]) => pattern.test(ua));
            if (hit) {
                out.browser = hit[0];
                out.version = Number(ua.match(hit[1])[1]) || 0;
            }
        }

        const os = data && data.platform;
        if (os) out.os = os === 'Chrome OS' ? 'ChromeOS' : os;
        else if (/Windows/.test(ua)) out.os = 'Windows';
        else if (/Android/.test(ua)) out.os = 'Android';
        else if (/iPhone|iPad|iPod/.test(ua)) out.os = 'iOS';
        // An iPad asks for the desktop site by default and says Macintosh; the
        // touch screen is what gives it away.
        else if (/Macintosh/.test(ua)) out.os = navigator.maxTouchPoints > 1 ? 'iOS' : 'macOS';
        else if (/CrOS/.test(ua)) out.os = 'ChromeOS';
        else if (/Linux/.test(ua)) out.os = 'Linux';

        out.mobile = data && typeof data.mobile === 'boolean'
            ? data.mobile
            : /Mobi|Android|iPhone|iPad|iPod/.test(ua) || (out.os === 'iOS');

        if (/bot|crawl|spider|slurp|Headless|Lighthouse|PageSpeed|Prerender/i.test(ua)) out.bot = true;

        return out;
    }

    /*
     * Where the person came from, on the site: the address of the page that
     * sent them, as a host name and nothing more, and the utm_ marks of a link
     * in an advert. Asked only at the start of a visit that began with the page
     * loading -- a return to the screen came from nowhere -- and never in the
     * extension, whose popup is opened by its button and nothing else. Null when
     * there is nothing to say, which is most visits.
     */
    function refOf() {
        if (typeof document === 'undefined' || remote.platform() === 'e') return null;

        const out = {};

        try {
            const from = document.referrer ? new URL(document.referrer).hostname : '';
            if (from && from !== location.hostname) out.from = from;
        } catch (e) { }

        const marks = new URLSearchParams(location.search);
        ['source', 'medium', 'campaign', 'content', 'term'].forEach(key => {
            const value = marks.get('utm_' + key);
            if (value) out[key] = value.slice(0, 64);
        });

        return Object.keys(out).length ? out : null;
    }

    /*
     * The queue's index, changed one change at a time. Two changes interleaved
     * -- a visit added as one comes back from the server -- would each read the
     * same list and write back their own, and the visit whose start was lost
     * from the index would never be sent at all.
     */
    let indexing = Promise.resolve();

    function changeIndex(change) {
        const next = indexing.then(async () => {
            const index = (await storage.get(INDEX_KEY)) || [];
            await storage.set(INDEX_KEY, await change(index));
        });

        indexing = next.catch(() => { });
        return next;
    }

    function remember(start) {
        return changeIndex(async (index) => {
            index.push(start);
            while (index.length > MAX_QUEUED) await storage.remove(VISIT_KEY + index.shift());
            return index;
        });
    }

    async function forget(starts) {
        for (const start of starts) await storage.remove(VISIT_KEY + start);
        return changeIndex(index => index.filter(start => !starts.includes(start)));
    }

    /*
     * How this page came to be on screen, which is the last part of `open` and
     * `page`: navigate, reload, back_forward -- the browser's own answer --
     * and two of the app's, show for a return to the screen and bfcache for a
     * page the browser kept whole and brought back.
     */
    function arrival() {
        try {
            const entry = performance.getEntriesByType('navigation')[0];
            if (entry && entry.type) return entry.type;
        } catch (e) { }
        return '';
    }

    /*
     * The visit this tab is in, if it is still going: the page before this one
     * left it open, and this page carries on with it.
     *
     * The copy in sessionStorage is preferred over the one in IndexedDB. It is
     * written in the same breath as each event, and the IndexedDB write the
     * last page started on its way out may never have landed -- see persist.
     */
    async function carriedOver() {
        let known = null;
        let copy = null;

        try {
            known = Number(sessionStorage.getItem('visit')) || null;
            const mirrored = JSON.parse(sessionStorage.getItem(MIRROR_KEY) || 'null');
            if (mirrored && mirrored.start === known) copy = mirrored;
        } catch (e) { }

        if (!known) return null;

        const found = copy || (await storage.get(VISIT_KEY + known)) || null;
        return found && !found.ended ? found : null;
    }

    /*
     * `seq` is the visit's number on this device, one more than the last.
     *
     * The one way to see a visit that never arrived. A lost visit leaves the
     * server nothing to see -- not even a gap in its ids, which only requests
     * that did arrive can make -- and a gap in one device's numbers is exactly
     * that visit. Kept beside the device's id in `sync`, and carried through
     * "Clear data" with it (see wipeEverything in catalog.js), because the
     * device goes on and so must its count.
     */
    async function begin(at, settings, how) {
        const meta = remote.meta();
        const seq = (meta.visits || 0) + 1;
        await remote.update({ visits: seq });

        const state = await stateOf(settings);
        state.seq = seq;

        if (how !== 'show' && how !== 'bfcache') {
            const ref = refOf();
            if (ref) state.ref = ref;
        }

        visit = {
            device: meta.device,
            user: meta.user,
            v: remote.version(),
            p: remote.platform(),
            start: at,
            state: state,
            events: []
        };

        try {
            sessionStorage.setItem('visit', String(at));
        } catch (e) { }

        record(line('open', [here, how]), at);
        await remember(at);
    }

    function joinEarly() {
        early.forEach(([when, text]) => record(text, when));
        early = [];
    }

    /*
     * The screen has been left, and the visit with it: written down as over,
     * and sent at once, while the page can still send.
     *
     * Sent the way a page on its way out can: see remote.post. In the popup the
     * answer comes back to nobody -- the page is gone by then -- so nothing here
     * learns the visit arrived, and it stays in the queue to go again with the
     * next start. Measured with a probe extension: every way of closing the
     * popup let the request out, and the write to IndexedDB started with it
     * landed as well.
     */
    function end() {
        if (!visit) return;

        const done = visit;
        visit = null;

        done.ended = Date.now();
        storage.set(VISIT_KEY + done.start, done);

        try {
            sessionStorage.removeItem('visit');
            sessionStorage.removeItem(MIRROR_KEY);
        } catch (e) { }

        if (!remote.enabled()) return;

        remote.post('events.php', { visits: [done] }, null, { leaving: true })
            .then(answer => { if (!answer.error) forget([done.start]); });
    }

    // When a visit last had anything happen in it.
    const lastMoment = (v) => v.start + (v.events || []).reduce((latest, e) => Math.max(latest, e[0] || 0), 0);

    /*
     * Track a page of the app: the first page of a new visit, or one more page
     * of a visit already going.
     *
     * The moment a new visit starts is the moment the page began to load, so
     * nothing recorded while it booted lands before the start.
     */
    track.start = async (page, settings) => {
        here = page;

        if (!remote.enabled()) {
            early = [];
            return;
        }

        const meta = remote.meta();
        const loaded = Math.round(performance.timeOrigin || Date.now());

        // A visit under a profile this device has since left is over.
        const carried = await carriedOver();
        visit = carried && carried.user === meta.user ? carried : null;

        if (visit) record(line('page', [here, arrival()]), loaded);
        else await begin(loaded, settings, arrival());

        joinEarly();
        listen();
        voices();
        deliver(false);
    };

    /*
     * Back on screen. A return after leaving starts a new visit; a page the
     * browser kept whole and brought back (Back into the catalog) carries on
     * with whatever visit the tab is in by now -- which the page itself cannot
     * know, because everything in it, the visit and the profile included, is as
     * it was when it was frozen.
     */
    let resuming = null;

    function comeBack(how) {
        if (resuming) return resuming;

        resuming = (async () => {
            await remote.init();
            if (!remote.enabled()) return;

            const meta = remote.meta();
            const carried = await carriedOver();

            if (carried && carried.user === meta.user) {
                visit = carried;
                record(line('page', [here, how]));
            } else {
                visit = null;
                await begin(Date.now(), null, how);
            }

            joinEarly();
            deliver(false);
        })().finally(() => { resuming = null; });

        return resuming;
    }

    /*
     * The visits that are over, sent and then forgotten.
     *
     * Over means ended, or quiet for long enough -- see STALE. A visit that is
     * going on elsewhere is not touched: sent now, it would reach the server
     * without the events it has yet to have, and the server keeps the first
     * copy it gets.
     *
     * `withCurrent` for the moments the current visit has to end now: before
     * this device moves to another profile and before it is wiped.
     *
     * One delivery at a time, each after the last. The two callers that matter
     * most -- a page starting and a profile being left -- arrive together, and
     * the second must not find the first in progress and give up.
     */
    let delivery = Promise.resolve();

    function deliver(withCurrent) {
        const next = delivery.then(() => deliverNow(withCurrent));
        delivery = next.catch(() => false);
        return next;
    }

    async function deliverNow(withCurrent) {
        if (!remote.enabled()) return false;

        const index = (await storage.get(INDEX_KEY)) || [];
        const now = Date.now();

        const mine = (start) => visit && start === visit.start;
        const starts = index.filter(start => withCurrent || !mine(start));
        const found = await Promise.all(starts.map(start => storage.get(VISIT_KEY + start)));

        // An entry with nothing behind it has nothing to send.
        const lost = starts.filter((start, i) => !found[i]);
        if (lost.length) await forget(lost);

        const due = found.filter(v => v && (v.ended || mine(v.start) || now - lastMoment(v) > STALE));

        for (let i = 0; i < due.length; i += PER_REQUEST) {
            const batch = due.slice(i, i + PER_REQUEST);

            const answer = await remote.post('events.php', { visits: batch });
            if (answer.error) return false;

            await forget(batch.map(v => v.start));
        }

        return true;
    }

    // The visit ends here and is sent with whatever else is waiting. What is
    // recorded after this waits for the next page -- which is a reload, for
    // both of the callers.
    track.close = async () => {
        if (!visit) return;

        visit.ended = Date.now();
        persist();

        await deliver(true);

        visit = null;
        try {
            sessionStorage.removeItem('visit');
            sessionStorage.removeItem(MIRROR_KEY);
        } catch (e) { }
    };

    /*
     * A visit of one event, from code with no screen of its own -- the
     * extension's background worker, which hears about an install or an update
     * whether or not the popup is ever opened. Numbered like any visit, so it
     * leaves no gap, written into the queue first and sent at once: if the
     * send fails, the next page of the app sends it with the rest.
     */
    track.report = async (name, ...parts) => {
        if (!remote.enabled()) return;

        const meta = remote.meta();
        const seq = (meta.visits || 0) + 1;
        await remote.update({ visits: seq });

        const at = Date.now();
        const state = await stateOf(null);
        state.seq = seq;

        const done = {
            device: meta.device,
            user: meta.user,
            v: remote.version(),
            p: remote.platform(),
            start: at,
            state: state,
            events: [[0, line(name, parts)]],
            ended: at
        };

        await storage.set(VISIT_KEY + at, done);
        await remember(at);

        const answer = await remote.post('events.php', { visits: [done] });
        if (!answer.error) await forget([at]);
    };

    /*
     * The voices this device has, written only when they differ from the last
     * time it was asked. Speech is the one part of the app that depends on the
     * device (ARCHITECTURE.md §10), and this is how much it does: which
     * languages have a voice, how many of them, how many run on the device
     * rather than over the network.
     */
    async function noteVoices(found) {
        const meta = (await storage.get('track_meta')) || {};
        if (meta.voices === found) return;

        meta.voices = found;
        await storage.set('track_meta', meta);

        record('voices' + SEP + found);
    }

    function voices() {
        if (typeof speechSynthesis === 'undefined') {
            noteVoices('none');
            return;
        }

        const look = () => {
            const list = speechSynthesis.getVoices();
            if (!list.length) return false;

            const per = {};
            list.forEach(v => {
                const tag = String(v.lang).replace('_', '-');
                per[tag] = (per[tag] || 0) + 1;
            });

            const tags = Object.keys(per).sort().map(tag => tag + ':' + per[tag]).join(',');
            const local = list.filter(v => v.localService).length;

            noteVoices([tags, local, list.length].join(SEP));
            return true;
        };

        if (!look()) speechSynthesis.addEventListener('voiceschanged', look, { once: true });
    }

    /*
     * The listeners that record by themselves. Once per page.
     *
     * Clicks are caught on the way down rather than on the way up, so the
     * event is written before the button's own handler runs: a press that
     * navigates is written down before the navigation begins.
     *
     * What a press is called is the first class of the thing pressed, plus the
     * game and the set it belongs to where there are any. Classes here are
     * written to be read -- set-play-btn, dict-settings-btn -- and nothing is
     * shortened: the bytes saved would be eaten by gzip anyway, and a table of
     * codes would need keeping in step.
     *
     * Two attributes in the markup finish the job the tag names cannot:
     *
     *   - data-press marks what is pressed without being a button: a word
     *     bubble, a card, a word or a letter that says itself, a box of a word
     *     being spelled, the snake's board, a game that is not out yet. Without
     *     it a tap on any of those was not a press at all. Given a value, the
     *     value goes on the end of the event: what one class cannot tell apart
     *     -- which of the form's folds was opened, an arrow back or forward, a
     *     box tapped to hear it or to give the word away -- the value does.
     *   - data-untracked is for presses that are raw input, the snake's d-pad:
     *     hundreds a run, which the rule above keeps out.
     *
     * And where nothing says it, the place does: a press inside another
     * pressable thing carries that thing's class on the end. The speaker that
     * reads a word is one class wherever it is drawn, and a speaker on a quiz
     * option is not the speaker on the question, nor a letter on the back of a
     * card the one on its front.
     *
     * Checked over every pressable thing on every screen of the app, so that
     * no two different presses come out under one name.
     */
    const PRESSABLE = 'button, a, select, input, textarea, label, summary, [data-game], [role="button"], [data-press]';

    let listening = false;

    // pagehide has fired: this document is on its way out. toApp says whether
    // the browser named the way out as another page of the app.
    let leavingPage = false;
    let toApp = false;

    function listen() {
        if (listening) return;
        listening = true;

        document.addEventListener('click', (e) => {
            const el = e.target instanceof Element && e.target.closest(PRESSABLE);
            if (!el || el.closest('[data-untracked]')) return;

            // A double or a triple click in a field selects its text, and it is
            // one press of the field, not three -- measured: a code retyped
            // after selecting the old one came out as three presses.
            if (e.detail > 1 && el.matches('input, textarea')) return;

            const owner = (selector, key) => {
                const found = el.closest(selector);
                return (found && found.dataset[key]) || '';
            };

            const named = (node) => node.classList[0] || node.tagName.toLowerCase();
            const outer = el.parentElement && el.parentElement.closest(PRESSABLE);

            const parts = [named(el), owner('[data-game]', 'game'), owner('[data-set-id]', 'setId')];
            const detail = el.dataset.press || (outer ? named(outer) : '');
            if (detail) parts.push(detail);

            track('click', ...parts);
        }, true);

        // Where the page came to rest, a second after it stopped moving. Only
        // the page's own scroller: the document on the web, the body in the
        // popup -- see .in-popup in app.css.
        let resting = 0;
        window.addEventListener('scroll', (e) => {
            const scroller = e.target === document ? document.scrollingElement : e.target;
            if (scroller !== document.scrollingElement && scroller !== document.body) return;

            clearTimeout(resting);
            resting = setTimeout(() => track('scroll', Math.round(scroller.scrollTop)), 1000);
        }, true);

        /*
         * Leaving the screen and moving to the next page look the same from
         * here: both hide the document. What tells them apart is pagehide,
         * which comes first when the page is being replaced and not at all when
         * the popup is closed or the tab switched away from (measured, Chrome
         * 156), and the Navigation API, which names where a page is going when
         * the page itself sent it there -- a link, a script -- and says nothing
         * when the tab is being closed.
         *
         * Without the API a page cannot tell its tab closing from moving on,
         * and leaves the visit to the queue rather than ending one the next
         * page may be about to continue.
         */
        if (window.navigation) {
            navigation.addEventListener('navigate', (e) => {
                if (e.destination.sameDocument) return;
                try {
                    toApp = new URL(e.destination.url).origin === location.origin;
                } catch (err) {
                    toApp = false;
                }
            });
        }

        window.addEventListener('pagehide', () => { leavingPage = true; });

        // The site installed as an app, from the page it was installed from:
        // the moment itself, which the first visit with p = 'p' only hints at.
        window.addEventListener('appinstalled', () => track('pwa_install'));

        // The network back while a page is open: what waited for it goes now,
        // not with the next page -- the site or the installed app can stay
        // open for hours after a ride with no network.
        window.addEventListener('online', () => deliver(false));

        window.addEventListener('pageshow', (e) => {
            if (!e.persisted) return;

            leavingPage = false;
            toApp = false;
            comeBack('bfcache');
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (!visit) return;
                if (leavingPage && (toApp || !window.navigation)) return;

                track('hide');
                end();
                return;
            }

            if (!visit) comeBack('show');
        });
    }

    /*
     * Errors, from the moment this file runs rather than from the moment the
     * visit is known -- a page that breaks while booting is the page most
     * worth hearing about. Somebody who installed the app from a store does
     * not write a bug report; they remove it.
     */
    //
    // Not in the extension's background worker, which loads this file for
    // track.report alone and has no window to listen on.
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (e) => {
        const file = String(e.filename || '').split('/').pop() || '?';
        tally('error', [file + ':' + (e.lineno || 0)], e.message || 'error');
    });

    window.addEventListener('unhandledrejection', (e) => {
        const reason = e.reason;
        tally('error', ['promise'], (reason && (reason.message || String(reason))) || 'rejection');
    });
}
analytics();
