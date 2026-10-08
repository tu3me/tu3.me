/**
 * Every database older than the one this version writes, carried into its shape.
 *
 * This file is the exception CLAUDE.md promised. The rule there — no migrations,
 * a broken format means "Clear data" — held while nobody had anything to lose,
 * and said outright that it would flip on the day somebody did. 0.1.2 went out.
 * What those readers typed and what they played has to arrive here whole.
 *
 * Three translations live here, and run in this order.
 *
 * 0.1.2 → 0.2.0, which is what this file was written for. Three things changed
 * under those readers:
 *
 *   - a language belonged to each word (originalLang and translationLang on
 *     every one); now it belongs to the set, and the words carry none;
 *   - which language the reader has and which they are learning are answers
 *     kept in settings, and 0.1.2 never asked the question;
 *   - the set the app ships with is known by its id, '1', and a set with that id
 *     is treated as a stand-in that disappears as soon as there is anything else
 *     — which is exactly the id 0.1.2's starter set has.
 *
 * 0.2.3 → 0.2.4: the three fields a repetition carried about the run it
 * belonged to — game, session, sessionSize — are folded into the one string
 * store.js writes now. Second because the first rewrites every set whole, and
 * what it hands on is what this one has to read.
 *
 * 0.2.4 → 0.2.5: the speller's saved round, from the one version that wrote it
 * in a different shape. Nothing is carried — a half-built word is not something
 * anybody is keeping — so what there is to do is throw it away before the game
 * reads it and comes apart on it.
 *
 * Runs on every page, straight after storage.init() and before anything reads
 * what is saved. Depends on storage alone: a game page has no catalog, and the
 * reader may well open one of those first — a popup reopens where it was left.
 *
 * None of them is forever. The first is meant to be deleted whole, one day,
 * when no 0.1.2 database can still be out there, and the others the same — they
 * share a file and nothing else, so any of them can go without the rest
 * noticing. Nothing outside refers to anything in here.
 */
function migrate() {
    // The id 0.1.2's starter set had, which is the id 0.2.0 keeps for its own.
    const OLD_SEED_ID = '1';

    /*
     * The left-hand sides 0.1.2 shipped in that starter set.
     *
     * A set under that id holding exactly these is demo content of a version
     * that is gone, and nothing of the reader's is in it. Anything else under
     * that id has been typed into and is theirs, whatever it is called.
     *
     * The words and not the title, which would have been the shorter check and
     * the wrong one twice over: editing a set never had to change its name, and
     * the set this app ships with now carries the same name as the one 0.1.2
     * shipped. Only the ten words below tell the two apart.
     */
    const SHIPPED = [
        'guitarra española', '中国 丝绸', 'parfum français', '日本 庭園',
        'Schweizer Uhr', 'भारतीय चाय', 'ελληνική φιλοξενία', 'moda italiana',
        '한국 김치', 'นวด แผนไทย'
    ];

    // Every game that could have left a half-finished session behind.
    const GAMES = ['cards', 'quiz', 'snake'];

    /*
     * Language names for the titles of split sets.
     *
     * A second copy of what the catalog does, on purpose: the real one lives
     * inside catalog.js, and a core file that has to work on a game page cannot
     * reach it. Moving it out would rearrange a file the rest of the app is
     * happy with, for the sake of one that is here to be thrown away.
     */
    const NAMES = (() => {
        try {
            return new Intl.DisplayNames(['en'], { type: 'language' });
        } catch (e) {
            return null;
        }
    })();

    function languageName(tag) {
        try {
            const named = NAMES && NAMES.of(tag);
            if (named && named !== tag) return named;
        } catch (e) {
            // Intl throws on a tag it cannot parse rather than saying no
        }

        return tag;
    }

    function commonest(values) {
        const count = new Map();
        let best = null;

        values.filter(Boolean).forEach(value => {
            const seen = (count.get(value) || 0) + 1;
            count.set(value, seen);

            if (!best || seen > count.get(best)) best = value;
        });

        return best;
    }

    function shipped(set) {
        const words = set.words || [];

        return words.length === SHIPPED.length
            && words.every(w => SHIPPED.includes(w.original));
    }

    /*
     * A word with the two fields 0.2.0 does not have taken off it.
     *
     * Removed rather than left lying about. A word that still names a language
     * is a word something will one day read as evidence, and by then it would be
     * evidence about a model the app no longer has. Everything else on the word
     * is copied across untouched, repetitions first among them — a field nobody
     * here knows about is still somebody's.
     */
    function bare(word) {
        const next = Object.assign({}, word);

        delete next.originalLang;
        delete next.translationLang;

        if (!next.repetitions) next.repetitions = [];

        return next;
    }

    // One set in the new shape: the languages written on it, the words under it
    // bare. The right-hand language is the commonest of what its words claimed,
    // because a column is one language now even when it was typed as several.
    function dress(set, id, title, words, lang) {
        const made = Object.assign({}, set, { id: id, title: title, words: words.map(bare) });
        const translation = commonest(words.map(w => w.translationLang));

        if (lang) made.originalLang = lang;
        else delete made.originalLang;

        if (translation) made.translationLang = translation;
        else delete made.translationLang;

        return made;
    }

    /*
     * One 0.1.2 set becomes one set when its words agree on a language, and one
     * set per language when they do not.
     *
     * Split rather than settled by majority, because the words in the minority
     * would then be read aloud in a language that is not theirs — and reading
     * them aloud is most of what this app is for. A set in ten languages is a
     * thing 0.1.2 could hold and 0.2.0 cannot, and ten sets is the only way to
     * put all of it down without dropping a word.
     *
     * The pieces get new ids. Keeping the old one for the first of them would
     * hand a reader's own words the id of the stand-in, and would tie them to
     * sessions that are being cleared anyway.
     */
    function convert(set, nextId) {
        const words = set.words || [];

        /*
         * Already in the new shape, and left exactly as found.
         *
         * A database can hold these alongside the old ones: whoever updated,
         * played a little, and only then had this run — because the update
         * reached them on a game page, with nothing saved since — would
         * otherwise have the new set taken apart as if it were old.
         */
        if (set.originalLang || set.translationLang) return [set];

        const langs = [];
        words.forEach(w => {
            const lang = w.originalLang || null;
            if (!langs.includes(lang)) langs.push(lang);
        });

        if (langs.length <= 1) return [dress(set, set.id, set.title, words, langs[0])];

        return langs.map(lang => dress(
            set,
            nextId(),
            lang ? `${set.title} · ${languageName(lang)}` : set.title,
            words.filter(w => (w.originalLang || null) === lang),
            lang
        ));
    }

    function clearSessions() {
        return Promise.all(
            [storage.set('active_session', null)]
                .concat(GAMES.map(game => storage.set('session:' + game, null)))
        );
    }

    async function carry012() {
        const sets = await storage.get('word_sets');

        // Nothing saved, nothing to carry. A first run of 0.2.0 leaves here, and
        // so does a 0.1.2 reader who never played and never typed: their store
        // was never written to, and there is nothing of theirs to lose.
        if (!Array.isArray(sets) || sets.length === 0) return false;

        /*
         * Whether anything here is still in the old shape, which is the whole
         * version check: a set that names no language while its words do.
         *
         * Read off the data rather than off a version number, because a version
         * number would have had to be written by 0.1.2, and it was not. And off
         * the data rather than off the languages in settings, which was the
         * first idea and was wrong: 0.2.0 went out before this file existed, so
         * some readers crossed from 0.1.2 to 0.2.0 unconverted and answered its
         * first screen. Their settings say the question has been asked, their
         * sets are still 0.1.2's, and a check on settings would have written
         * them off for good.
         *
         * Self-clearing: after a run there is no such set left, so the next run
         * stops here.
         */
        const stale = (set) => !set.originalLang && !set.translationLang
            && (set.words || []).some(w => w.originalLang || w.translationLang);

        if (!sets.some(stale)) return false;

        const settings = (await storage.get('settings')) || {};

        const now = Date.now();
        let made = 0;
        const nextId = () => String(now + (made++));
        const next = [];

        sets.forEach(set => {
            /*
             * The one set in here that is not the reader's, dropped whole.
             *
             * Ten words in ten languages, which under this model is ten sets of
             * one word each -- a shelf of stubs where a demo used to be, handed
             * to somebody as the first thing an update did for them. Keeping the
             * languages they had answered in was the other idea, and it is the
             * same mess in miniature. The words were ours, 0.2.0 ships a demo of
             * its own, and whatever answering happened in it goes with it.
             *
             * Only the set as it was shipped. One that no longer matches it has
             * been typed into and is theirs, whatever it is still called, and is
             * carried like anything else.
             */
            if (String(set.id) === OLD_SEED_ID && shipped(set)) return;

            convert(set, nextId).forEach(piece => {
                // Their words under the id 0.2.0 keeps for its stand-in would
                // leave the list the moment they had anything else. Marked as
                // theirs, which is what that mark is for.
                if (String(piece.id) === OLD_SEED_ID) piece.adopted = true;

                next.push(piece);
            });
        });

        /*
         * The two answers the first screen asks for, read off what the reader
         * already has instead of being asked.
         *
         * Putting that screen in front of somebody with twenty sets would be the
         * update announcing it had forgotten who they were. The language they
         * read in is the commonest right-hand side of their sets; the ones they
         * are learning are every left-hand side that is not it.
         *
         * No sets are built from those answers here. The ready-made ones arrive
         * when somebody asks for a language in the settings, and an update is
         * not somebody asking.
         */
        /*
         * Nothing came through: a reader whose whole store was the set 0.1.2
         * shipped with.
         *
         * They are left exactly where a new reader starts -- the first screen,
         * with its question -- because that is a better welcome than an app with
         * no languages in it and one demo set, and because there is nothing of
         * theirs here to be careful with. The question goes unstamped for the
         * same reason: the next run finds an empty store and stops on its first
         * line, so there is nothing to protect against.
         *
         * Also where a reader who only ever played the set it shipped with ends
         * up, now that the set goes whole.
         */
        if (!next.length) {
            await storage.set('word_sets', []);
            await clearSessions();

            return true;
        }

        await storage.set('word_sets', next);

        /*
         * The languages are worked out only for a reader who has never been
         * asked. One who crossed through 0.2.0 has answered already, and their
         * answer beats anything read off their sets: somebody who said they are
         * learning German and has old Spanish sets lying about meant the German,
         * and overwriting it would be the update arguing with them.
         *
         * Their old sets are safe either way. The language rows only ever take
         * the ready-made sets off the screen, and nothing carried through here
         * is one of those.
         */
        if (settings.langsAsked === undefined) {
            const myLang = commonest(next.map(s => s.translationLang));
            const learnLangs = [];

            next.forEach(s => {
                if (!s.originalLang || s.originalLang === myLang) return;
                if (!learnLangs.includes(s.originalLang)) learnLangs.push(s.originalLang);
            });

            /*
             * And a note that these were guessed rather than named, which the
             * catalog takes down as soon as it has acted on it.
             *
             * What it does with it is build the ready-made sets for these
             * languages -- the three a reader gets for every language they name
             * on the first screen. Without it they would be the only people in
             * the app with a language in their settings and no shelf under it,
             * and the only way out would be to remove the language and add it
             * back, which nobody is going to guess.
             *
             * Built there and not here because makeSets lives in the catalog and
             * reads vocab.js, and vocab.js is on the catalog's page alone: 25 KB
             * of table that the game pages have no use for. The alternative was
             * a second copy of makeSets and of the id it builds, in a file meant
             * to be deleted one day -- two places to keep in step instead of a
             * flag.
             */
            const answered = Object.assign({}, settings, {
                langsAsked: true,
                learnLangs: learnLangs,
                langsGuessed: true
            });

            if (myLang) answered.myLang = myLang;

            await storage.set('settings', answered);
        }

        /*
         * The game that was open is closed.
         *
         * A session holds a pool built out of sets that may have just been split
         * in two, and what else is in it is each game's own business — 0.1.2's
         * idea of that handed to 0.2.0's code is a guess nobody has to make. One
         * unfinished round is the whole price, and every answer already given is
         * in the words, where it has always been.
         *
         * Open edit forms are left alone: the catalog already drops the ones
         * whose set it cannot find, and a draft on a set that survived is still
         * a draft worth having.
         */
        await clearSessions();

        return true;
    }

    /*
     * One answer, with what it used to say about its run said in one field.
     *
     * The three parts keep their order and their meaning; all that goes is three
     * key names on a record that is kept for good -- see store.js, where the
     * mark is written and where the reason to bother lives.
     *
     * Positional, so an empty part has to stay empty rather than close the gap:
     * a 0.1.2 answer carries no game, and "|1791...|10" says "run known, game
     * not" where "1791...|10" would say the game was called 1791...
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
     * The check is the data again, as above: a record still carrying any of the
     * three is a record from before. Self-clearing -- after a run there is not
     * one left, so the next run stops before it writes.
     *
     * Sessions are left alone, where the translation above clears them. A saved
     * pool holds its own copies of the words, and those copies go on carrying
     * answers in the old shape until the round is over -- which costs nothing,
     * because nothing reads the mark off a pool copy. The answers that are kept
     * are the ones in word_sets, and a game writes into both. Throwing away a
     * round in progress to tidy a field nobody will look at is a worse trade
     * than leaving it.
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
     * The speller's half-built word, from the version before the one that is
     * reading it.
     *
     * The game used to judge each piece as it was pressed, and kept the round as
     * the cut, the pieces in order and how many of them were down. It judges the
     * line of letters now, when the last box fills, and keeps what was laid out
     * in the order it was laid — a shape the old one has nothing to say about.
     *
     * Thrown away rather than translated. A round is one word half guessed at,
     * which is the one thing in this app nobody is keeping; what is kept for
     * good is in word_sets, and the answers already written there are not
     * touched by any of this. The word simply comes back round whole.
     *
     * The offer to continue goes with it, when it is this game's: left standing,
     * it would open the speller on a session that is no longer there. Another
     * game's unfinished round is none of this translation's business.
     *
     * Self-clearing like the others, and by the shape again: a round that says
     * where its Check cut the line — even before there has been one, when the
     * field is there and empty — is a round this version wrote.
     */
    async function dropSpellerRound() {
        const saved = await storage.get('session:speller');

        if (!saved || !saved.round || 'right' in saved.round) return false;

        await storage.set('session:speller', null);

        const active = await storage.get('active_session');

        if (active && active.game === 'speller') await storage.set('active_session', null);

        return true;
    }

    // All three, in the order the header gives, and the answer is whether
    // anything was done at all. Nobody reads it yet; they are kept apart so that
    // the day one of them is deleted, the others read the same.
    async function run() {
        const carried = await carry012();
        const folded = await foldRuns();
        const dropped = await dropSpellerRound();

        return carried || folded || dropped;
    }

    migrate.run = run;
}
migrate();
