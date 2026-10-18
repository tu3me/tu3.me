/*
 * The analytics: what happened on this device, gathered in IndexedDB and sent
 * to the app's own server, never read back. docs/BACKEND.md has the whole of
 * the design and the reasons for each part of it.
 *
 * The unit is a visit. In the popup that is from the moment it opens to the
 * moment it closes, across every page in between; in the PWA it starts with a
 * launch, and a return after more than half an hour in the background starts
 * the next one. A visit is named by the device and the moment it began --
 * nothing else is needed to tell two apart.
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

    // How long the PWA may stay in the background and still come back to the
    // same visit. A tab can sit there for days with the same sessionStorage,
    // and without an edge one visit would cover a week.
    const PWA_GAP = 30 * 60 * 1000;

    // Visits kept while there is no way to send them. Past this the oldest go:
    // months offline must not grow the database without end.
    const MAX_QUEUED = 200;

    // Sent at most this many to a request, so a queue that waited a month goes
    // up as several moderate bodies rather than one enormous one.
    const PER_REQUEST = 50;

    let visit = null;
    let here = null;

    // Whatever is recorded before the visit is known -- an error while the
    // page is still booting -- waits here with its own moment and joins the
    // visit once there is one. Capped, because on a device that never starts
    // a visit (no storage) nothing would ever take it.
    let early = [];

    // A part of an event cannot contain the separator: it would become two
    // parts. Only the free text a name ends with is allowed to.
    const part = (value) => {
        if (value == null) return '';
        if (Array.isArray(value)) return value.map(part).join(',');
        return String(value).replace(/\|/g, '/');
    };

    const line = (name, parts) => [name].concat(parts.map(part)).join(SEP);

    function persist() {
        if (visit) storage.set(VISIT_KEY + visit.start, visit);
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
     *
     * Counted inside one visit. The visit is only sent once it is over, so
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
     */
    async function stateOf(settings) {
        const s = settings || (await storage.get('settings')) || {};
        const active = await storage.get('active_session');

        let width = null;
        try {
            width = Number(localStorage.getItem('app-width')) || null;
        } catch (e) { }

        return {
            myLang: s.myLang || null,
            learn: s.learnLangs || [],
            theme: s.isDark === false ? 'light' : 'dark',
            width: width,
            muted: !!s.muted,
            resume: (active && active.game) || null
        };
    }

    async function remember(start) {
        const index = (await storage.get(INDEX_KEY)) || [];
        index.push(start);

        while (index.length > MAX_QUEUED) await storage.remove(VISIT_KEY + index.shift());

        await storage.set(INDEX_KEY, index);
    }

    async function begin(at, settings) {
        const meta = remote.meta();

        visit = {
            device: meta.device,
            user: meta.user,
            v: remote.version(),
            p: remote.platform(),
            start: at,
            state: await stateOf(settings),
            events: []
        };

        try {
            sessionStorage.setItem('visit', String(at));
        } catch (e) { }

        record(line('open', [here]), at);
        await remember(at);
    }

    function joinEarly() {
        early.forEach(([when, text]) => record(text, when));
        early = [];
    }

    /*
     * Where this page stands in a visit: the first page of a new one, or one
     * more page of a visit already going.
     *
     * The popup's sessionStorage is what tells: it is empty each time the popup
     * opens and outlives every page inside it. The moment a new visit starts is
     * the moment the page began to load, so nothing recorded while it booted
     * lands before the start.
     */
    track.start = async (page, settings) => {
        here = page;

        if (!remote.enabled()) {
            early = [];
            return;
        }

        let known = null;
        try {
            known = Number(sessionStorage.getItem('visit')) || null;
        } catch (e) { }

        const meta = remote.meta();
        const loaded = Math.round(performance.timeOrigin || Date.now());

        if (known) visit = (await storage.get(VISIT_KEY + known)) || null;

        // A visit under a profile this device has since left is over.
        if (visit && visit.user !== meta.user) visit = null;

        if (visit) record(line('page', [here]), loaded);
        else await begin(loaded, settings);

        joinEarly();
        listen();
        voices();
        deliver(false);
    };

    /*
     * The visits that are over, sent and then forgotten.
     *
     * A visit that is over never changes again, so sending one twice -- an
     * answer lost on the way back after the server had kept it -- is harmless:
     * the server knows it by device and start, and passes over one it has.
     * No id of the batch is needed for that.
     *
     * `withCurrent` for the moments the current visit has to end now: before
     * this device moves to another profile and before it is wiped.
     */
    let delivering = false;

    async function deliver(withCurrent) {
        if (delivering || !remote.enabled()) return false;
        delivering = true;

        try {
            const index = (await storage.get(INDEX_KEY)) || [];
            const due = index.filter(start => withCurrent || !visit || start !== visit.start);

            for (let i = 0; i < due.length; i += PER_REQUEST) {
                const batch = due.slice(i, i + PER_REQUEST);
                const visits = (await Promise.all(batch.map(start => storage.get(VISIT_KEY + start)))).filter(Boolean);

                if (visits.length) {
                    const answer = await remote.post('events.php', { visits: visits });
                    if (answer.error) return false;
                }

                for (const start of batch) await storage.remove(VISIT_KEY + start);

                const left = (await storage.get(INDEX_KEY)) || [];
                await storage.set(INDEX_KEY, left.filter(start => !batch.includes(start)));
            }

            return true;
        } finally {
            delivering = false;
        }
    }

    // The visit ends here and is sent with whatever else is waiting. What is
    // recorded after this waits for the next page -- which is a reload, for
    // both of the callers.
    track.close = async () => {
        if (!visit) return;

        await deliver(true);

        visit = null;
        try {
            sessionStorage.removeItem('visit');
        } catch (e) { }
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
     * navigates starts its save afterwards, and a write already queued in the
     * database finishes before that save does -- one started after it might
     * not finish before the page is gone.
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
     *     being spelled, the snake's board. Without it a tap on any of those
     *     was not a press at all. Given a value, the value goes on the end of
     *     the event: what one class cannot tell apart -- which of the form's
     *     folds was opened, an arrow back or forward, a box tapped to hear it or
     *     to give the word away -- the value does.
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

    function listen() {
        if (listening) return;
        listening = true;

        document.addEventListener('click', (e) => {
            const el = e.target instanceof Element && e.target.closest(PRESSABLE);
            if (!el || el.closest('[data-untracked]')) return;

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

        let hiddenAt = 0;
        document.addEventListener('visibilitychange', async () => {
            if (document.hidden) {
                hiddenAt = Date.now();
                track('hide');
                return;
            }

            if (visit && remote.platform() !== 'e' && hiddenAt && Date.now() - hiddenAt > PWA_GAP) {
                await begin(Date.now(), null);
                deliver(false);
                return;
            }

            track('show');
        });
    }

    /*
     * Errors, from the moment this file runs rather than from the moment the
     * visit is known -- a page that breaks while booting is the page most
     * worth hearing about. Somebody who installed the app from a store does
     * not write a bug report; they remove it.
     */
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
