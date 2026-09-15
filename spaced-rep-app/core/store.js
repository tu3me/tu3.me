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
     * Writes onto every word which language each of its two sides is in:
     * `originalLang` and `translationLang`. A word is what gets read aloud, so a
     * word is what carries the answer — whoever has the word has the language,
     * without a set to look up.
     *
     * The answer is worked out from the whole column at once, because that is
     * where the evidence is. Most words are ordinary letters that any of a dozen
     * languages could have written; the column is named by the one word in it
     * that happens to carry a local letter, and reading all of them is the only
     * way to meet that letter at all. What the column decides is then written to
     * every word in it, the plain ones included.
     *
     * Only when the column really does hold several languages does each word
     * answer for itself — and then the same field holds a different answer per
     * word, which is exactly what it is for.
     *
     * A word that already names its language is left alone. The detector is a
     * guess and the field may hold something better than a guess — what seed.js
     * wrote down, or what a person will one day set by hand — and a guess has no
     * business overwriting it on every edit. Only the words that have no answer
     * get one, and the column they are read against is the whole column, the
     * already-named words included: they are the evidence.
     */
    function label(set) {
        const words = set.words || [];

        [['originalLang', 'original'], ['translationLang', 'translation']].forEach(([field, side]) => {
            if (words.every(w => w[field])) return;

            const guess = speech.languageOfAll(words.map(w => w[side]));
            words.forEach((w, i) => {
                if (w[field]) return;

                // Nothing recognised — digits, an empty translation — leaves the
                // field absent rather than putting a null in the saved data.
                const found = guess.perText ? guess.perText[i] : guess.lang;
                if (found) w[field] = found;
            });
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

    store.label = label;

    // Live references into `sets` — the games build their own session pools from these
    function wordsOf(setId) {
        const activeSets = setId !== 'all' ? sets.filter(s => s.id === setId) : sets;

        const items = [];
        activeSets.forEach(s => {
            s.words.forEach(w => {
                items.push({ setId: s.id, setName: s.title, word: w });
            });
        });
        return items;
    }

    // The one word-selection rule, shared by every game: whatever is due, or —
    // when the player chose to play early and nothing is due — everything.
    function duePool(setId, allowEarly, limit) {
        const items = wordsOf(setId);
        const due = items.filter(i => spacedRepetitions.isWordDue(i.word));
        const pool = (allowEarly && due.length === 0) ? items : due;
        return limit ? pool.slice(0, limit) : pool;
    }

    // The pool item carries setId + original, so the live word object is resolved in its own
    // set only — the same word placed in two sets keeps independent histories.
    function recordRepetition(poolItem, result, game) {
        const entry = { timestamp: Date.now(), result: result, game: game };

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
    store.addSet = (set) => sets.unshift(set);
    store.removeAt = (index) => sets.splice(index, 1);
    store.recordRepetition = recordRepetition;
}
