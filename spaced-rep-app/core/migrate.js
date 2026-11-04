/**
 * Every database older than the one this version writes, carried into its shape.
 *
 * This file is the exception CLAUDE.md promised. The rule there — no migrations,
 * a broken format means "Clear data" — held while nobody had anything to lose,
 * and said outright that it would flip on the day somebody did. A version went
 * out. What those readers typed and what they played has to arrive here whole.
 *
 * Three translations live here, and all three start from 0.2.8 as the store has
 * it. That is the build of 24 October 2026, the version almost every reader is
 * on, and it is older than its number makes it look: this code has gone on being
 * called 0.2.8 since, and the two changes below came after the upload. What tells
 * them apart is FORMAT in sync.js, which is 1 in the store.
 *
 * One, on 27 October 2026, is a game's records on a set, from the best kept per
 * measure to a log -- see foldRecords. A set in the old shape can also arrive
 * from the server, written by a device not yet updated, so this one works a set
 * at a time and sync.js calls it on what it is handed. The day that was written
 * about in docs/BACKEND.md ("Формат") is this one.
 *
 * The others, on 28 October 2026, are a game's new name: cards became flashcards,
 * in the marks on its answers and in the games pinned to a set (see renameGames),
 * which goes the same way, a set at a time, and in a round left open (see
 * renameRounds).
 *
 * Anything older has no translation, the owner's call, 4 November 2026: almost
 * nobody is below 0.2.8, and whoever is simply starts without one. Two stood here
 * until then, both 0.2.3 -> 0.2.4. Going without them costs that reader little:
 * their answers keep game, session and sessionSize, which nothing reads, instead
 * of a `run` mark, and coloursRead and gripTried stay unread in the settings, so
 * the onboarding shows those two cards again. Nothing breaks on either, which is
 * why no database is wiped for being old.
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
 * Meant to be deleted whole, one day, when no database in FORMAT 1 can still be
 * out there. Nothing outside refers to anything in here but sync.js, to
 * migrate.set.
 */
function migrate() {
    /*
     * A set's records, from the best kept per measure to the log the games
     * write since 27 October 2026 -- see store.achieve.
     *
     *     { snake: { length: { best: 34, at } } }  ->  { snake: [ { maxLength: 34, at } ] }
     *
     * One measure ever had that shape, the snake's length, and in the log it is
     * called maxLength, the owner's name for it. Any other measure, which there
     * never was, keeps its own name rather than being dropped.
     *
     * The check is the data and not a version number, which would have had to be
     * written by the version being checked for and was not: a game whose records
     * are an object and not a list is from before, and nothing writes that shape
     * any more, so a set passes through here once. A record with nothing in it is
     * left out --
     * absent reads as "none yet", which is what it is.
     *
     * One set at a time, because sets arrive one at a time as well as all at
     * once: the database at startup, and a set from the server written by a
     * device that has not been updated -- see sync.js, where FORMAT went to 2
     * with this. Answers whether it changed anything.
     */
    const RENAMED = { length: 'maxLength' };

    function foldRecords(set) {
        const held = set && set.achievements;
        if (!held || typeof held !== 'object') return false;

        let changed = false;

        Object.keys(held).forEach(game => {
            const records = held[game];
            if (Array.isArray(records)) return;

            held[game] = Object.keys(records || {})
                .filter(measure => records[measure] && records[measure].best)
                .map(measure => ({ [RENAMED[measure] || measure]: records[measure].best, at: records[measure].at }))
                .sort((a, b) => (a.at || 0) - (b.at || 0));

            changed = true;
        });

        return changed;
    }

    async function foldAllRecords() {
        const sets = await storage.get('word_sets');

        if (!Array.isArray(sets) || sets.length === 0) return false;

        // Every set, and not as soon as one has changed
        const changed = sets.map(foldRecords).some(Boolean);
        if (!changed) return false;

        await storage.set('word_sets', sets);

        return true;
    }

    /*
     * A game renamed after it was published: cards became flashcards on
     * 28 October 2026, the owner's call -- "cards" is what the words of a set
     * are called now, and a game by the same name was one word for two things.
     *
     * A set holds the id in two places: the mark on every answer the game wrote
     * ("cards|1791...|10" -- see runMark in store.js), and the games pinned to
     * the set's row (`pinned`). Both are translated. Nothing reads the marks of
     * the old name today but analytics on the server; the pins were what would
     * hurt -- a row pinned to "cards" would lose the game, because the catalog
     * no longer knows one by that name. Since 29 October 2026 nothing reads the
     * pins either: every game is on every row (see ROW_GAMES in catalog.js),
     * and the field is left on the sets that have it.
     *
     * The check is the data, as above: an answer marked with the old name, or
     * a pin of it. Nothing writes the old name any more, so a set passes
     * through here once. One set at a time, for the same reason foldRecords is:
     * a set from a device not yet updated arrives from the server with the old
     * name in it -- see FORMAT in sync.js, which went to 3 with this.
     */
    const GAMES_RENAMED = { cards: 'flashcards' };

    function renameGames(set) {
        if (!set) return false;

        let changed = false;

        (set.words || []).forEach(word => (word.repetitions || []).forEach(rep => {
            const parts = String(rep.run || '').split('|');
            if (!GAMES_RENAMED[parts[0]]) return;

            parts[0] = GAMES_RENAMED[parts[0]];
            rep.run = parts.join('|');
            changed = true;
        }));

        if (Array.isArray(set.pinned) && set.pinned.some(id => GAMES_RENAMED[id])) {
            set.pinned = set.pinned.map(id => GAMES_RENAMED[id] || id);
            changed = true;
        }

        return changed;
    }

    async function renameAllGames() {
        const sets = await storage.get('word_sets');

        if (!Array.isArray(sets) || sets.length === 0) return false;

        // Every set, and not as soon as one has changed
        const changed = sets.map(renameGames).some(Boolean);
        if (!changed) return false;

        await storage.set('word_sets', sets);

        return true;
    }

    /*
     * And the round of it left open, which is this device's alone and never
     * travels: the game the catalog offers to continue, and the game's own
     * saved state under its id. Moved rather than dropped -- a round of
     * flashcards left half-way is as much the reader's as their answers are.
     */
    async function renameRounds() {
        let changed = false;

        const active = await storage.get('active_session');

        if (active && GAMES_RENAMED[active.game]) {
            active.game = GAMES_RENAMED[active.game];
            await storage.set('active_session', active);
            changed = true;
        }

        for (const old of Object.keys(GAMES_RENAMED)) {
            const saved = await storage.get('session:' + old);
            if (!saved) continue;

            await storage.set('session:' + GAMES_RENAMED[old], saved);
            await storage.remove('session:' + old);
            changed = true;
        }

        return changed;
    }

    /*
     * The translations, in order, and the answer is whether anything was done at
     * all. Nobody reads it yet.
     *
     * Each is a function that answers that question and knows nothing about its
     * neighbours, so adding one is a line here and taking one out is a line
     * here. They touch different keys or different parts of one -- the records
     * and the marks of `word_sets`, the round left open -- and kept in the order
     * they were written in, because an arbitrary order that is also stable is one
     * less thing to think about when another arrives.
     */
    async function run() {
        const recorded = await foldAllRecords();
        const renamed = await renameAllGames();
        const moved = await renameRounds();

        return recorded || renamed || moved;
    }

    migrate.run = run;

    // One set, for what arrives from the server -- see foldRecords and
    // renameGames. Every translation of a set, whichever format it left in.
    migrate.set = (set) => {
        const folded = foldRecords(set);
        const renamed = renameGames(set);

        return folded || renamed;
    };
}
migrate();
