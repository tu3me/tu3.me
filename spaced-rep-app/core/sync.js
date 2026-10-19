/*
 * The sets and the pair of languages, kept the same on every device of a
 * profile. The design, and the alternatives it was chosen over, are in
 * docs/BACKEND.md; what is here is the client's half of it.
 *
 * One operation for every occasion. The device sends the id and the date of
 * every set it holds, the archived ones included, and whole every set it has
 * changed since its last successful send; the server keeps whatever it was
 * sent that is newer than its own copy, answers with whatever it holds that is
 * newer than the device's, and names what it still lacks. That last list is
 * sent in a second request -- the only time there is one.
 *
 * Whole sets replace whole sets, and the later date wins. Nothing is merged:
 * two devices playing the same set between two syncs lose the earlier send,
 * and how often that happens is what the `sync_loss` event measures -- it is
 * what decides whether merging is ever worth writing.
 */
function sync() {
    /*
     * The shape of a set this code writes. Sent with every request and kept
     * by the server on every set, so that the day it changes, a device can
     * tell a set it cannot read from one it can. One that is newer than this
     * is left alone -- an older device must not take a set apart it does not
     * understand -- and when this number goes up, migrate.js gains a way to
     * read the old shape, the same as it does for a database.
     */
    const FORMAT = 1;

    const dateOf = (set) => (set && set.changedAt) || 0;

    /*
     * The answers in `set` that `instead` does not have, which is what
     * replacing one with the other loses. Told apart by when they were given.
     *
     * Only over the words both copies hold. A word renamed or taken out on the
     * other device takes its answers with it on purpose -- the form keeps
     * answers by the word -- and counting those would report as lost what
     * somebody deleted.
     */
    function lostAnswers(set, instead) {
        const kept = new Map();
        ((instead && instead.words) || []).forEach(w => {
            kept.set(w.original, new Set((w.repetitions || []).map(r => r.timestamp)));
        });

        let lost = 0;
        (set.words || []).forEach(w => {
            const theirs = kept.get(w.original);
            if (!theirs) return;
            (w.repetitions || []).forEach(r => { if (!theirs.has(r.timestamp)) lost++; });
        });

        return lost;
    }

    async function langsOf() {
        const settings = (await storage.get('settings')) || {};

        // Nothing to say before the first screen has been answered: the empty
        // pair would be kept by the server as an answer.
        if (!settings.langsAsked) return null;

        return {
            myLang: settings.myLang || null,
            learnLangs: settings.learnLangs || [],
            changedAt: settings.langsChangedAt || 0
        };
    }

    /*
     * What came back, put in place. Returns the ids of the sets replaced and
     * whether the languages were.
     *
     * Each set is checked against the copy here at the moment it is put in,
     * not at the moment the request left. Two syncs can be in flight at once
     * -- a save and a press in the same second each start one -- and the
     * answer to the earlier may arrive after a change made in between. Checked
     * now, it loses to that change, as it should.
     *
     * A set replaced by a copy that lacks answers this one has is a loss, and
     * the answers are counted for the analytics, with whether they had been
     * sent. Both ways round are losses, and only one of them used to be
     * counted:
     *
     *   - not sent: this device played while another, playing later, got its
     *     copy to the server first. The answers here never left;
     *   - sent: this device played and sent, and another device that had not
     *     seen those answers played afterwards and sent its copy, later and so
     *     the winner. The answers here reached the server and were overwritten
     *     there, and this is the only device that can tell -- the other one
     *     won, and never saw them.
     *
     * Measured in the scenario run: 23 answers lost on one profile, 13 of them
     * counted when only the first way was -- the other ten were found only by
     * matching each run_start against the answers left on the server.
     */
    async function apply(answer, sentBefore) {
        const replaced = [];

        (answer.sets || []).forEach(entry => {
            if (!entry || !entry.data || (entry.format || 1) > FORMAT) return;

            const here = store.allSets().find(s => s.id === entry.id);
            if (here && dateOf(entry.data) <= dateOf(here)) return;

            const lost = here ? lostAnswers(here, entry.data) : 0;
            if (lost) track('sync_loss', entry.id, lost, dateOf(here) > sentBefore ? 0 : 1);

            store.put(entry.data);
            replaced.push(entry.id);
        });

        let langs = false;
        const theirs = answer.langs;

        if (theirs && theirs.myLang) {
            const settings = (await storage.get('settings')) || {};

            if ((theirs.changedAt || 0) > (settings.langsChangedAt || 0)) {
                await takeLangs(theirs);
                langs = true;
            }
        }

        if (replaced.length) await store.save();

        return { replaced: replaced, langs: langs };
    }

    // One read of the settings record and one write, the way saveSetting does
    // it -- three saveSetting calls in a row would be three of each.
    async function takeLangs(theirs) {
        const settings = (await storage.get('settings')) || {};

        settings.myLang = theirs.myLang;
        settings.learnLangs = theirs.learnLangs || [];
        settings.langsChangedAt = theirs.changedAt || 0;
        settings.langsAsked = true;

        return storage.set('settings', settings);
    }

    // Ids compared as text on both sides: a set's id is a string of digits
    // more often than not (Date.now() for a set written by hand), and a server
    // that once handed them back as numbers matched none of them -- see `need`
    // in server/api/sync.php.
    function listOf(sentBefore, needed) {
        const wanted = needed ? needed.map(String) : null;

        return store.allSets().map(set => {
            const row = { id: set.id, changedAt: dateOf(set) };

            if (wanted ? wanted.includes(String(set.id)) : dateOf(set) > sentBefore) row.data = set;

            return row;
        });
    }

    /*
     * A request that did not go through: counted for the analytics, and the
     * start of the run of failures remembered on the device -- across visits,
     * because a device offline for a day fails on every page of every visit
     * in it. The settings say so when it has lasted, see syncRows in
     * catalog.js; the first success after it reports how long it was.
     */
    async function failed(error) {
        track.tally('sync_fail', [error]);

        const meta = remote.meta();
        await remote.update({
            failedAt: meta.failedAt || Date.now(),
            failures: (meta.failures || 0) + 1
        });
    }

    /*
     * One sync. Answers what changed here because of it, or null when nothing
     * could be asked -- no storage, no network, a server that said no.
     *
     * `lastSent` is the moment the last request that succeeded was put
     * together: a set changed after it has not been sent. The moment of
     * assembly and not of the answer, because a change made while the request
     * was on its way would otherwise be older than the mark and never go. And
     * only ever moved forward, so that two answers arriving out of order
     * cannot move it back.
     */
    async function run() {
        if (!remote.enabled()) return null;

        const meta = remote.meta();
        const sentBefore = meta.lastSent || 0;
        const assembled = Date.now();

        const body = {
            format: FORMAT,
            device: meta.device,
            new: !!meta.fresh,
            langs: await langsOf(),
            sets: listOf(sentBefore, null)
        };

        let answer = await remote.post('sync.php', body);

        if (answer.error) {
            await failed(answer.error);
            return null;
        }

        /*
         * The id was made on this device and somebody else's device made the
         * same one first. Sixty bits make that next to impossible, and the
         * answer is cheap: another id, sent on the next sync. Nothing here has
         * been shared with the other profile -- the server refused before it
         * read a single set.
         */
        if (answer.taken) {
            track('sync_taken');
            await remote.update({ user: remote.newId(), fresh: true });
            return null;
        }

        // The first success after a run of failures says how long they lasted:
        // sync_fail is counted, and its moment is that of the first one, so it
        // cannot say when they stopped.
        if (meta.failedAt) track('sync_back', meta.failures || 0, Date.now() - meta.failedAt);

        await remote.update({
            fresh: false,
            lastSent: Math.max(meta.lastSent || 0, assembled),
            syncedAt: Date.now(),
            failedAt: 0,
            failures: 0
        });

        const first = await apply(answer, sentBefore);
        const replaced = first.replaced;
        let langs = first.langs;

        // What the server still lacks: sets this device holds that it has
        // never seen, or holds an older copy of. The common case is a set
        // nobody here has changed since the app built it -- it carries no
        // date, so it was never sent.
        if (answer.need && answer.need.length) {
            answer = await remote.post('sync.php', {
                format: FORMAT,
                device: meta.device,
                new: false,
                langs: await langsOf(),
                sets: listOf(sentBefore, answer.need)
            });

            if (answer.error) {
                await failed(answer.error);
            } else {
                const second = await apply(answer, sentBefore);
                replaced.push(...second.replaced);
                langs = langs || second.langs;
            }
        }

        return { replaced: replaced, langs: langs };
    }

    /*
     * This device becomes a copy of another device's profile.
     *
     * Its own sets are not carried over, and that is decided rather than
     * missed: two devices that were never connected are two profiles, and the
     * code typed in is the code of the one worth keeping. Which is also why
     * nothing here compares dates -- everything the profile has is taken as it
     * is.
     *
     * The server is asked first, and nothing is erased until it has answered
     * that the profile exists: a mistyped code must not cost a single word.
     *
     * The rounds left open go too -- `active_session` and every game's saved
     * round -- because they are rounds over sets and words that may not be
     * there after this. The settings stay: the theme, the intervals, the width
     * and the help cards are this device's, not the profile's.
     *
     * Answers 'invalid', 'same', 'offline', 'missing' or 'ok'. After 'ok' the
     * caller reloads: half of what is on screen was read at boot.
     *
     * Every answer but 'ok' is written down too. The person is told on screen,
     * and the analytics used to see only presses of Connect with nothing after
     * them -- measured: three attempts, two codes nobody had and one too short,
     * and nothing to say which.
     *
     * The profile being left is not lost with the device's copy of it: it is
     * synced first, and its code goes on the device's list of codes it has
     * used, which the settings offer to come back to. Synced first because the
     * list is a promise -- a profile picked from it that lacks the answers
     * given here just before the move would have broken it -- and so a sync
     * that fails stops the move: the move needs the server anyway.
     */
    const PAST_KEPT = 10;

    async function join(code, gameIds) {
        const refuse = (why, detail) => {
            track('join_fail', why, detail || '');
            return why;
        };

        const user = remote.normalize(code);
        if (!remote.valid(user)) return refuse('invalid');

        const meta = remote.meta();
        if (user === meta.user) return refuse('same');

        // The reason is counted by run() itself, as sync_fail.
        if (!await run()) return refuse('offline', 'leaving');

        const past = meta.past || [];
        const returning = past.some(entry => entry.user === user);

        const answer = await remote.post('sync.php', {
            format: FORMAT,
            device: meta.device,
            join: true,
            langs: null,
            sets: []
        }, user);

        if (answer.error) return refuse('offline', answer.error);
        if (answer.missing) return refuse('missing');

        const sets = (answer.sets || []).filter(e => e && e.data && (e.format || 1) <= FORMAT).map(e => e.data);

        // What the move brought and what it cost: the sets and answers that
        // came, and the answers this device had of its own, which go. The
        // screen warned about the second; this is how often it is paid.
        const answers = (list) => list.reduce((n, set) => n + (set.words || [])
            .reduce((m, w) => m + (w.repetitions || []).length, 0), 0);

        // Whatever was gathered under the profile being left goes under it,
        // the move itself included; the visit after the reload is the new
        // profile's.
        track('join', sets.length, answers(sets), answers(store.allSets()), returning ? 1 : 0);
        await track.close();

        // Newest first, each code once, and never the one in use: the code
        // just taken leaves the list, the one just left goes to its top.
        const left = { user: meta.user, sets: store.sets().length, left: Date.now() };
        const kept = [left].concat(past.filter(entry => entry.user !== user && entry.user !== meta.user))
            .slice(0, PAST_KEPT);

        store.replaceAll(sets);
        await store.save();

        if (answer.langs && answer.langs.myLang) await takeLangs(answer.langs);

        await storage.set('active_session', null);
        for (const id of gameIds) await storage.set('session:' + id, null);

        // Every set here is now the server's copy and none of them is unsent.
        // Dated by other devices' clocks, some may read as later than this
        // one's -- the mark is put past all of them.
        const latest = sets.reduce((most, set) => Math.max(most, dateOf(set)), Date.now());

        await remote.update({ user: user, fresh: false, lastSent: latest, syncedAt: Date.now(), past: kept });

        return 'ok';
    }

    sync.run = run;
    sync.join = join;
    sync.FORMAT = FORMAT;
}
sync();
