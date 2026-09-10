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

    // Legacy data used a "trainings" field with the same element shape
    function migrateWord(word) {
        if (!word) return word;
        if (word.trainings && !word.repetitions) word.repetitions = word.trainings;
        delete word.trainings;
        if (!Array.isArray(word.repetitions)) word.repetitions = [];
        return word;
    }

    // word_sets carries domain data only. Screen state that used to ride along on
    // the set objects lives in active_session (the progress baseline) or in a local
    // variable of the catalog (the edit mode).
    function stripUiFields(set) {
        delete set.startProgress;
        delete set.isEditing;
        delete set.isNew;
        return set;
    }

    async function load() {
        const savedSets = await storage.get('word_sets');
        if (savedSets && Array.isArray(savedSets) && savedSets.length > 0) {
            savedSets.forEach(s => {
                stripUiFields(s);
                (s.words || []).forEach(migrateWord);
            });
            sets = savedSets;
        }
    }

    function save() {
        return storage.set('word_sets', sets);
    }

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

    // Progress of every set right now, keyed by set id. Taken when a session
    // starts and kept in active_session, so the catalog can animate the bar
    // from where the player left off to where they got to.
    function progressSnapshot() {
        const snapshot = {};
        sets.forEach(s => snapshot[s.id] = spacedRepetitions.calculateSetProgress(s.words));
        return snapshot;
    }

    store.load = load;
    store.save = save;
    store.sets = () => sets;
    store.wordsOf = wordsOf;
    store.duePool = duePool;
    store.addSet = (set) => sets.unshift(set);
    store.removeAt = (index) => sets.splice(index, 1);
    store.recordRepetition = recordRepetition;
    store.progressSnapshot = progressSnapshot;
    store.migrateWord = migrateWord;
}
