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

    // Live references into `sets` — the games build their own session pools from these
    function wordsOf(setId) {
        const activeSets = setId !== 'all' ? sets.filter(s => s.id === setId) : sets;

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
     */
    function addSet(set) {
        set.createdAt = Date.now();
        sets.unshift(set);
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
        }

        // Keep the session pool copy in sync (it is a separate object after a page reload)
        if (poolItem.word !== liveWord) {
            if (!poolItem.word.repetitions) poolItem.word.repetitions = [];
            poolItem.word.repetitions.push(entry);
        }
    }

    store.load = load;
    store.save = save;
    store.sets = () => sets;
    store.wordsOf = wordsOf;
    store.duePool = duePool;
    store.addSet = addSet;
    store.gameOf = gameOf;
    store.removeAt = (index) => sets.splice(index, 1);
    store.recordRepetition = recordRepetition;
}
