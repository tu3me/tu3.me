/**
 * Every database older than the one this version writes, carried into its shape.
 *
 * This file is the exception CLAUDE.md promised. The rule there — no migrations,
 * a broken format means "Clear data" — held while nobody had anything to lose,
 * and said outright that it would flip on the day somebody did. A version went
 * out. What those readers typed and what they played has to arrive here whole.
 *
 * Two translations live here, both 0.2.3 → 0.2.4. One folds the three fields a
 * repetition carried about the run it belonged to — game, session, sessionSize
 * — into the one string store.js writes now. The other takes the two flags
 * 0.2.3 kept about what it had shown somebody — coloursRead, gripTried — and
 * reads them as what they have become: the read-marks of two of the onboarding
 * cards, which is what the hand that explained the colours and the corner that
 * blinked for attention turned into. See onboarding.js.
 *
 * Both of them from 0.2.3, because that is the published version and the one
 * every reader is on.
 * Anything older than it has nowhere to arrive from, and anything newer was
 * only ever written here, by versions nobody was given. Three other
 * translations stood in this file and went with the databases they were for:
 * 0.1.2 → 0.2.0, which moved a language from the word to the set, split a set
 * per language and dropped the demo; and two about a Word Craft round saved in a
 * shape the game no longer reads, from versions that never shipped — the
 * game does not exist in 0.2.3, so no reader has a round of any shape.
 *
 * Deleting them is the point rather than the risk. The file is written so that
 * each translation stands alone and can be taken out when the last database it
 * knew about is gone, which is what keeps it from growing into the thing it
 * exists to avoid: a permanent archive of every mistake the format ever made.
 *
 * Runs on every page, straight after storage.init() and before anything reads
 * what is saved. Depends on storage alone: a game page has no catalog, and the
 * reader may well open one of those first — a popup reopens where it was left.
 *
 * Meant to be deleted whole, one day, when no 0.2.3 database can still be out
 * there. Nothing outside refers to anything in here.
 */
function migrate() {
    /*
     * One answer, with what it used to say about its run said in one field.
     *
     * The three parts keep their order and their meaning; all that goes is three
     * key names on a record that is kept for good -- see store.js, where the
     * mark is written and where the reason to bother lives.
     *
     * Positional, so an empty part has to stay empty rather than close the gap:
     * an answer from before the games were named carries no game, and
     * "|1791...|10" says "run known, game not" where "1791...|10" would say the
     * game was called 1791...
     *
     * Trailing nothing is dropped, which is the common case rather than an edge
     * one: every answer from before sessions were recorded has a game and no run
     * at all, and "cards||" would be two separators standing for nothing. An
     * answer with all three parts empty gets no mark -- absent reads as "not
     * known", which is what it is.
     */
    function fold(rep) {
        const part = (value) => (value === undefined || value === null ? '' : String(value));

        const mark = [part(rep.game), part(rep.session), part(rep.sessionSize)]
            .join('|').replace(/\|+$/, '');

        const next = Object.assign({}, rep);

        delete next.game;
        delete next.session;
        delete next.sessionSize;

        if (mark) next.run = mark;

        return next;
    }

    /*
     * Every answer in the store, folded.
     *
     * The check is the data and not a version number, which would have had to be
     * written by the version being checked for and was not: a record still
     * carrying any of the three fields is a record from before. Self-clearing --
     * after a run there is not one left, so the next run stops before it writes.
     *
     * Sessions are left alone. A saved pool holds its own copies of the words,
     * and those copies go on carrying answers in the old shape until the round
     * is over -- which costs nothing, because nothing reads the mark off a pool
     * copy. The answers that are kept are the ones in word_sets, and a game
     * writes into both. Throwing away a round in progress to tidy a field nobody
     * will look at is a worse trade than leaving it.
     */
    async function foldRuns() {
        const sets = await storage.get('word_sets');

        if (!Array.isArray(sets) || sets.length === 0) return false;

        const old = (rep) => 'game' in rep || 'session' in rep || 'sessionSize' in rep;
        const answers = (word) => word.repetitions || [];
        const words = (set) => set.words || [];

        if (!sets.some(set => words(set).some(w => answers(w).some(old)))) return false;

        sets.forEach(set => words(set).forEach(word => {
            if (word.repetitions) word.repetitions = word.repetitions.map(fold);
        }));

        await storage.set('word_sets', sets);

        return true;
    }

    /*
     * What 0.2.3 had already explained to this reader, written where 0.2.4 looks
     * for it.
     *
     * Those two flags are not junk to be swept up: each is the record of a
     * lesson somebody has already been given, and the cards that give those two
     * lessons now would otherwise both arrive as unread -- the app explaining
     * the colours a second time to the one reader who asked for the explanation
     * and got it.
     *
     * The ids are the cards' own, and they are the one thing here that this file
     * cannot work out for itself: a card is identified by a string in
     * onboarding.js, and renaming one of those two means passing through here.
     * Which is the price of the arrangement and cheap at the price -- the
     * alternative is onboarding.js reading a 0.2.3 flag for ever.
     *
     * The check is the keys, and nothing 0.2.4 writes puts either of them back,
     * so the pass clears itself: after it there is no `coloursRead` to find.
     * Deleted rather than left where they are, because a key nobody reads is a
     * key somebody will read one day and believe.
     *
     * A reader who never read the explanation and never touched the corner has
     * neither flag, and arrives here as somebody who has been shown nothing --
     * which is what they are.
     */
    async function foldMarks() {
        const settings = await storage.get('settings');

        if (!settings) return false;
        if (!('coloursRead' in settings) && !('gripTried' in settings)) return false;

        const read = new Set(settings.onboardingRead || []);

        if (settings.coloursRead) read.add('colours');
        if (settings.gripTried) read.add('width');

        delete settings.coloursRead;
        delete settings.gripTried;

        settings.onboardingRead = Array.from(read);

        await storage.set('settings', settings);

        return true;
    }

    /*
     * The translations, in order, and the answer is whether anything was done at
     * all. Nobody reads it yet.
     *
     * Each is a function that answers that question and knows nothing about its
     * neighbours, so adding one is a line here and taking one out is a line
     * here. They touch different keys -- one `word_sets`, one `settings` -- and
     * neither reads what the other wrote, so the order between them is
     * arbitrary; it is kept as the order they were written in, because an
     * arbitrary order that is also stable is one less thing to think about when
     * a third arrives.
     */
    async function run() {
        const folded = await foldRuns();
        const marked = await foldMarks();

        return folded || marked;
    }

    migrate.run = run;
}
migrate();
