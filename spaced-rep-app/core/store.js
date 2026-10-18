/**
 * The word sets: the single owner of the domain data.
 * Reads are synchronous and hand out live references — rendering, bubbles
 * and the snake game loop cannot await a promise on every access, and the
 * rule "the same word in two sets keeps independent histories" relies on
 * object identity inside `sets`. Writes go through storage.
 *
 * The in-memory copy is rebuilt on every page load. That is the point: it is
 * the working copy of one page, never the place anything is kept.
 */
function store() {
    let sets = seed.sets();

    /*
     * Writes onto the set which language each of its two sides is in:
     * `originalLang` and `translationLang`.
     *
     * On the set and not on each word, which is the whole of the model now. A
     * set is a pair of languages and a list of pairs of words, which is what
     * anybody writing one means by it; the alternative -- a language per word --
     * could hold a set in eight languages at once, and the price was that every
     * screen, every game and every form had to ask each word separately what it
     * was, for an answer that was the same on all of them.
     *
     * The answer is worked out from the whole column at once, because that is
     * where the evidence is. Most words are ordinary letters that any of a dozen
     * languages could have written; the column is named by the one word in it
     * that happens to carry a local letter, and reading all of them is the only
     * way to meet that letter at all.
     *
     * A column that really does hold several languages is now answered with the
     * commonest of them rather than word by word. It is a set somebody typed
     * wrong, and one language is a better answer to that than a set which is
     * quietly half one thing and half another.
     *
     * A word that already names its language is left alone. The detector is a
     * guess and the field may hold something better than a guess — what seed.js
     * wrote down, or what a person chose in the form — and a guess has no
     * business overwriting it on every edit. Only the words that have no answer
     * get one, and the column they are read against is the whole column, the
     * already-named words included: they are the evidence.
     */
    function label(set) {
        const words = set.words || [];

        [['originalLang', 'original'], ['translationLang', 'translation']].forEach(([field, side]) => {
            if (set[field]) return;

            const guess = speech.languageOfAll(words.map(w => w[side]));

            // Nothing recognised — digits, an empty column — leaves the field
            // absent rather than putting a null in the saved data.
            const found = guess.lang || commonest(guess.perText);
            if (found) set[field] = found;
        });

        return set;
    }

    async function load() {
        const savedSets = await storage.get('word_sets');
        if (savedSets && savedSets.length > 0) sets = savedSets;
    }

    function save() {
        return storage.set('word_sets', sets);
    }

    /*
     * The language most of a mixed column is in.
     *
     * Only reached when the detector refused to name the column outright, which
     * means it saw more than one language in it. Ties go to whichever was met
     * first, and that is as good an answer as any: the question has no right
     * answer by then, only a least surprising one.
     */
    function commonest(perText) {
        if (!perText) return null;

        const count = new Map();
        let best = null;

        perText.forEach(tag => {
            if (!tag) return;

            const n = (count.get(tag) || 0) + 1;
            count.set(tag, n);

            if (!best || n > count.get(best)) best = tag;
        });

        return best;
    }

    store.label = label;

    /*
     * The sets anybody is shown: every set but the archived ones.
     *
     * Deleting a set archives it rather than taking it out of the list -- see
     * archive below -- so the list holds sets that are gone as far as anybody
     * looking is concerned. This is the one place that says so. Every reader
     * of sets goes through here, the games' pools included, and an archived
     * set that slipped past one of them would be deleted words turning up in
     * a game.
     */
    const live = () => sets.filter(s => !s.archived);

    // Live references into `sets` — the games build their own session pools from these
    function wordsOf(setId) {
        const activeSets = setId !== 'all' ? live().filter(s => s.id === setId) : live();

        // The set's two languages travel with every word taken out of it. A
        // game is handed a flat list and has no set to look up, and this is the
        // one thing on a word that is not on the word.
        const items = [];
        activeSets.forEach(s => {
            s.words.forEach(w => {
                items.push({
                    setId: s.id,
                    setName: s.title,
                    originalLang: s.originalLang,
                    translationLang: s.translationLang,
                    word: w
                });
            });
        });
        return items;
    }

    /*
     * Fisher-Yates, on a copy of the list rather than in place.
     *
     * Every index gets an equal chance at every place, which the one-liner
     * people reach for — sort() with a random comparator — does not: a sort is
     * entitled to assume its comparator is consistent, and given one that is
     * not, what comes out depends on which sort the engine happens to use.
     */
    function shuffled(list) {
        const out = list.slice();

        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const keep = out[i];
            out[i] = out[j];
            out[j] = keep;
        }

        return out;
    }

    /*
     * The one word-selection rule, shared by every game: whatever is due, or —
     * when the player chose to play early and nothing is due — everything.
     *
     * Shuffled, and shuffled before the limit rather than after it. Two things
     * come of that, and both are wanted. A session asks its words in a different
     * order every time, so what is being learned is the word rather than the
     * place it sits in the row. And when more is due than fits in one session,
     * it is a different handful each time: taken in order, the first ten due
     * words were the whole of every session until they were answered, and the
     * eleventh waited however long that took.
     *
     * The catalog calls this to count what is due and never looks at the order;
     * a shuffle it throws away costs nothing on a list this size.
     */
    function duePool(setId, allowEarly, limit) {
        const items = wordsOf(setId);
        const due = items.filter(i => spacedRepetitions.isWordDue(i.word));
        const pool = shuffled((allowEarly && due.length === 0) ? items : due);
        return limit ? pool.slice(0, limit) : pool;
    }

    /*
     * A set joins the list, with the moment it did written on it.
     *
     * Written here because this is the one door a new set comes through -- a
     * form just saved, a shelf just built out of a language just named -- and a
     * second place to write it is a place to forget it the day a third kind of
     * set appears.
     *
     * What reads the date is the order of the catalog, where a set just made has
     * to stand above sets with months of answers in them. Nothing else on a set
     * says when it arrived: the order the store keeps them in says it only
     * against other sets nobody has played, which put a set typed a minute ago
     * underneath every set its reader had ever opened.
     *
     * Sets made before the field carry no date, and none can be invented for
     * them -- when they were made was never written down anywhere. Absent reads
     * as "not known", which leaves them ordered by their answers alone, exactly
     * as they are ordered now.
     *
     * `byHand` for a set a person wrote, which is a change they made and is
     * dated as one; a set the app built for a language is not -- see touch.
     */
    function addSet(set, byHand) {
        set.createdAt = Date.now();
        if (byHand) touch(set);
        sets.unshift(set);
    }

    /*
     * When a person last changed a set, written on it as `changedAt`: the date
     * synchronisation compares -- see sync.js and docs/BACKEND.md.
     *
     * Every change a person makes to a set comes through here: an answer, a
     * record, a set written by hand, an edit, an archive and a return from it.
     * One place, because a change that forgot to write the date is a change
     * that never leaves the device -- nothing else tells sync it happened.
     *
     * Only a person's changes. A set the app made by itself -- the starter set,
     * the ones built out of the table when a language is chosen -- carries no
     * date at all, and that is what lets it lose to any copy somebody has
     * played. Dated, the untouched copy a new language builds on this device
     * would be newer than the one with a month of answers that the same
     * language built on another, and would replace it.
     *
     * Absent reads as "never changed", which is also true of every set saved
     * before the field existed -- see docs/BACKEND.md on why that needs no
     * translation in migrate.js.
     */
    function touch(set) {
        if (set) set.changedAt = Date.now();
    }

    /*
     * Deleting a set, which keeps it.
     *
     * Marked and left in the list, on this device and on the server: a
     * deletion is then a change like any other, carried by sending the set
     * whole. Taken out instead, the set would come back from the next device
     * that still had it, and saying that it went would need a record of its
     * own.
     *
     * It also leaves the way back open -- restore, which is what choosing a
     * language again does for the sets built for it, history and all.
     */
    function archive(setId) {
        const set = sets.find(s => s.id === setId);
        if (!set) return;

        set.archived = true;
        touch(set);
    }

    function restore(setId) {
        const set = sets.find(s => s.id === setId);
        if (!set || !set.archived) return;

        delete set.archived;
        touch(set);
    }

    /*
     * A set as another device last saved it, put in place of the one here:
     * synchronisation replaces whole sets and never merges them -- see sync.js.
     *
     * In the same place in the list, because the order of the list is the last
     * tie-breaker of the catalog's order; a set nobody has seen here yet goes
     * to the end.
     */
    function put(set) {
        const at = sets.findIndex(s => s.id === set.id);

        if (at === -1) sets.push(set);
        else sets[at] = set;
    }

    /*
     * The pool item carries setId + original, so the live word object is resolved in its own
     * set only — the same word placed in two sets keeps independent histories.
     *
     * `result` is a number from 0 to 1 and only 1 is a success — srs.js reads
     * it as `result === 1` and nothing else. Cards and quiz have nothing to
     * say between the two and write one or the other; snake writes the share
     * of the word the player had before asking to be shown it, which is a
     * mistake like any other and is a different mistake from having none of
     * it. Nothing downstream ranks the fractions yet; they are recorded
     * because they are what happened.
     */
    /*
     * Which run of which game an answer belongs to, written onto the answer as
     * one string: "cards|1791234567890|10" -- the game, the moment that run was
     * dealt its words, and how many words it was dealt.
     *
     * The moment is both the time and the name: two runs cannot start in the
     * same millisecond, so the number tells them apart as well as any id would.
     *
     * One field and not three, which is what it says written out: `"game":` and
     * `"session":` and `"sessionSize":` on every record, against `"run":` once.
     * Nothing else saved here grows without end -- a set is typed once, a
     * setting is written once -- and these are the one thing kept for good, one
     * per word per run for as long as the app is used. Thirty-odd characters of
     * key names on each of them is the whole reason, and the parts are a game
     * id and two numbers, so a separator can be a character none of them holds.
     *
     * Order is fixed and the game comes first, because it is the one part
     * anything reads today -- see gameOf, which is a split and not a parse.
     *
     * On every repetition rather than in a log of its own. These records are the
     * only thing this app keeps for good; a log beside them would be a second
     * account of the same events, free to drift from the first and to be left
     * half-written when a popup closes. Here the fact arrives with the answer or
     * not at all.
     *
     * The other two parts answer the questions nothing can answer today: how
     * many runs there have been, which were played to the end -- count the
     * distinct words carrying one mark and hold that against the size written in
     * it -- and how long a run took, from the first of its answers to the last.
     * Nothing reads them yet. They are recorded because they are cheap to
     * record now and impossible to recover later.
     *
     * Distinct words, not records: it is one answer per word per run, but that
     * is three guards in three games rather than something the shape forbids.
     */
    const RUN_SEP = '|';

    const runMark = (game, session) =>
        (session ? [game, session.at, session.size] : [game]).join(RUN_SEP);

    /*
     * The game that wrote an answer, which is the only part of the mark that is
     * read anywhere.
     *
     * Here rather than at the one place that asks, because what it knows is the
     * shape of the mark, and the shape belongs to this file -- the day a fourth
     * part is appended, nothing outside has to hear about it.
     *
     * A record with no mark answers with nothing: 0.1.2 wrote no game at all,
     * and none could be invented for its answers afterwards -- see migrate.js.
     */
    const gameOf = (rep) => String((rep && rep.run) || '').split(RUN_SEP)[0];

    function recordRepetition(poolItem, result, game, session) {
        const entry = { timestamp: Date.now(), result: result, run: runMark(game, session) };

        const set = sets.find(s => s.id === poolItem.setId);
        const liveWord = set ? set.words.find(w => w.original === poolItem.word.original) : null;
        if (liveWord) {
            if (!liveWord.repetitions) liveWord.repetitions = [];
            liveWord.repetitions.push(entry);
            touch(set);
        }

        // Keep the session pool copy in sync (it is a separate object after a page reload)
        if (poolItem.word !== liveWord) {
            if (!poolItem.word.repetitions) poolItem.word.repetitions = [];
            poolItem.word.repetitions.push(entry);
        }
    }

    /*
     * A record a game has set in a set: the best value of something it measures,
     * and when that best was reached. True when it is a new best.
     *
     * On the set, under `achievements`, keyed by game and then by what was
     * measured: { snake: { length: { best: 34, at: 1791734000000 } } }. On the
     * set because records are a set's own -- the same game played on another
     * set is a different record -- and because a set's lifetime is the right
     * one for them: deleted with the set, untouched when its words are edited,
     * since the form changes a set in place.
     *
     * Measurements, never achievements. What is kept is the longest the snake
     * has been, not "reached thirty": the thresholds that turn a measure into
     * an achievement live in the code that draws them, and can move without a
     * word of the saved data changing. A stored "reached thirty" would make
     * every change of threshold a translation in migrate.js.
     *
     * The best and nothing else -- not every run's value, which would grow for
     * as long as the app is used. It travels with the set it is on: devices
     * replace whole sets and never merge them, so there is no rule here for
     * two copies of a record -- see docs/BACKEND.md, where the one that would
     * be needed is written down, and why "the larger best" is not it.
     *
     * Absent until the first record, which reads as "nothing set yet" and is
     * exactly that; no set written before this field existed has a record to
     * lose. The caller saves -- this is always called just before a save the
     * game makes anyway.
     */
    function noteBest(setId, game, key, value) {
        // No set by that id, no record -- which is also all a run over every
        // set at once gets: its id is 'all', and no set is called that.
        const set = sets.find(s => s.id === setId);
        if (!set) return false;

        if (!set.achievements) set.achievements = {};
        if (!set.achievements[game]) set.achievements[game] = {};

        const held = set.achievements[game][key];
        if (held && held.best >= value) return false;

        set.achievements[game][key] = { best: value, at: Date.now() };
        touch(set);
        return true;
    }

    // And the record read back, for a game that shows it while it is being
    // played: 0 where none is held, which is also what a run over every set
    // gets -- the same reason as above.
    function bestOf(setId, game, key) {
        const set = sets.find(s => s.id === setId);
        const held = set && set.achievements && set.achievements[game] && set.achievements[game][key];
        return held ? held.best : 0;
    }

    store.load = load;
    store.save = save;
    store.noteBest = noteBest;
    store.bestOf = bestOf;
    store.sets = live;
    // The archived ones too, for the one reader that has to see them: the
    // copy of the list another device keeps -- see sync.js.
    store.allSets = () => sets;
    store.wordsOf = wordsOf;
    store.duePool = duePool;
    store.addSet = addSet;
    store.touch = touch;
    store.archive = archive;
    store.restore = restore;
    store.put = put;
    // Everything at once, for a device taking on another one's sets whole.
    store.replaceAll = (list) => { sets = list.slice(); };
    store.gameOf = gameOf;
    store.recordRepetition = recordRepetition;
}
