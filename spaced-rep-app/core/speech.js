/**
 * Saying a word out loud, with what the browser already has.
 *
 * speechSynthesis is built into every browser this app runs in, so nothing is
 * downloaded and nothing is added to the bundle. What is not built in is the
 * voices: those belong to the operating system, and which ones exist varies by
 * device far more than anything else this app depends on.
 *
 * That matters because of how the API fails. Asked for a language the device
 * has no voice for, it does not refuse and does not raise an error — it reports
 * a normal start and a normal end, having said nothing. Measured: on a Windows
 * machine with English and Russian voices installed, "hello" took 2479ms and
 * "привет" 1974ms, while Japanese, Hindi and Arabic each "finished" in about
 * 300ms in silence. `speech.say` reports it honestly — false when the device
 * had no voice for the script — but nothing can be done about it here beyond
 * telling the truth.
 *
 * The language is written on the word: `originalLang` and `translationLang`,
 * put there by seed.js, by the person editing the set, or by store.label, which
 * asks speech.languageOfAll. The column is read whole — every original, or every
 * translation — because that is the only way a set of ordinary-looking words
 * gets its language from the one word in it that happens to carry a letter of
 * its own. say() takes the word's answer as its second argument; without one it
 * falls back to guessing from the text in hand, which is all a single word can
 * offer.
 *
 * The second half of the file is about showing a word rather than saying one:
 * a line drawn word by word, so a tap can land on one word of it, and a mark on
 * whatever is being said at that moment. Cards and quiz both draw lines that
 * way, which is why it is here and not in either of them.
 */
function speech() {
    /*
     * Which language a piece of text is written in.
     *
     * The writing system is the first half of the answer and for most of the
     * world it is the whole of it: Thai is written in Thai and in nothing else,
     * and nothing else is written in Thai. Those scripts are listed first, and
     * matching one is the end of the question.
     *
     * The other half is the scripts many languages share. There a language shows
     * itself by its own letters — the ones its neighbours do not write: ї and є
     * are Ukrainian, ß is German, ğ is Turkish, ұ is Kazakh. A word carrying one
     * of them names its language; a word carrying none is left with whichever
     * language owns most of that script.
     *
     * Only letters nobody else writes count as naming a language. Ukrainian і is
     * also Belarusian and Kazakh, and while it was in Ukrainian's list a
     * Belarusian word with і in it scored for both and the tie threw the whole
     * column back to Russian. The same went for Kazakh ә against Tatar and
     * Bashkir.
     *
     * A letter a few languages share is not nothing, though: ç is French,
     * Portuguese or Turkish, and it is certainly not English. Those letters sit
     * in a second list and only hint — they pick between their own candidates
     * when no letter has named a language outright, and they never overrule one
     * that has. Each list is ordered by how likely a piece of writing is to be
     * in that language rather than the next, so the first of them is the answer
     * when nothing else separates them.
     *
     * Own letters can end level too — one language's letter and another's in the
     * same word — and that is not a reason to give up on either: between them
     * they have ruled out the rest of the script, the default included. The
     * likeliest of the ones still standing answers, as a guess rather than as a
     * name.
     *
     * Kana before Han: Japanese uses both, and a sentence with kana in it is
     * Japanese, while one with Han alone is more likely Chinese.
     *
     * What this cannot do, and no amount of letters will fix:
     *
     *   - Dutch, Swahili and Indonesian have no letter their neighbours lack
     *     and none they share either, so they read as English. Italian, Finnish
     *     and Albanian are only half out: nothing is theirs alone, but à, ä and
     *     ç are on their shared lists, so a word carrying one is at least
     *     guessed at;
     *   - Norwegian is written with the Danish letters, Estonian's õ is
     *     Portuguese's as well, and Croatian has only letters it shares, so it
     *     is never named outright — only guessed at, behind Vietnamese and
     *     Czech;
     *   - Bulgarian has the Russian alphabet minus two letters, and absence is
     *     not something a single word can show;
     *   - Nepali is Hindi's alphabet, traditional Chinese is Chinese.
     *
     * In every one of those the fallback is a language that is at least written
     * the same way, which is the most a letter-counter can promise.
     */
    const SCRIPTS = [
        // A script, a language, and nothing to decide
        { test: /[\p{Script=Hiragana}\p{Script=Katakana}]/u, lang: 'ja' },
        { test: /\p{Script=Hangul}/u, lang: 'ko' },
        { test: /\p{Script=Thai}/u, lang: 'th' },
        { test: /\p{Script=Lao}/u, lang: 'lo' },
        { test: /\p{Script=Khmer}/u, lang: 'km' },
        { test: /\p{Script=Myanmar}/u, lang: 'my' },
        { test: /\p{Script=Georgian}/u, lang: 'ka' },
        { test: /\p{Script=Armenian}/u, lang: 'hy' },
        { test: /\p{Script=Hebrew}/u, lang: 'he' },
        { test: /\p{Script=Greek}/u, lang: 'el' },
        { test: /\p{Script=Ethiopic}/u, lang: 'am' },
        { test: /\p{Script=Sinhala}/u, lang: 'si' },
        { test: /\p{Script=Tamil}/u, lang: 'ta' },
        { test: /\p{Script=Telugu}/u, lang: 'te' },
        { test: /\p{Script=Kannada}/u, lang: 'kn' },
        { test: /\p{Script=Malayalam}/u, lang: 'ml' },
        { test: /\p{Script=Gujarati}/u, lang: 'gu' },
        { test: /\p{Script=Gurmukhi}/u, lang: 'pa' },
        { test: /\p{Script=Oriya}/u, lang: 'or' },
        { test: /\p{Script=Tibetan}/u, lang: 'bo' },
        { test: /\p{Script=Mongolian}/u, lang: 'mn' },
        { test: /\p{Script=Han}/u, lang: 'zh' },

        // Assamese is Bengali's alphabet with two letters of its own
        {
            test: /\p{Script=Bengali}/u, lang: 'bn', locals: [
                ['as', /[ৰৱ]/gu]
            ]
        },

        // Hindi owns Devanagari; Marathi writes one letter Hindi does not
        {
            test: /\p{Script=Devanagari}/u, lang: 'hi', locals: [
                ['mr', /[ळ]/gu]
            ]
        },

        {
            test: /\p{Script=Arabic}/u, lang: 'ar', locals: [
                ['fa', /[پچژگ]/gu],
                ['ur', /[ٹڈڑںے]/gu],
                ['ps', /[ښګڼړ]/gu]
            ]
        },

        {
            test: /\p{Script=Cyrillic}/u, lang: 'ru', shared: [
                [/[і]/giu, ['uk', 'be', 'kk']],
                [/[ә]/giu, ['kk', 'az', 'tt', 'ba']],
                [/[ң]/giu, ['kk', 'ky', 'tt', 'ba']],
                [/[өү]/giu, ['kk', 'ky', 'mn', 'tt']]
            ], locals: [
                ['uk', /[їєґ]/giu],
                ['be', /[ў]/giu],
                ['sr', /[ђћџљњ]/giu],
                ['mk', /[ѓќѕ]/giu],
                ['kk', /[ұқғһ]/giu],
                ['tg', /[ӣӯҷҳ]/giu],
                ['tt', /[җ]/giu],
                ['ba', /[ҙҫҡ]/giu]
            ]
        },

        // Latin last: a line in any other script may still carry a Latin word
        {
            /*
             * Each list is in the order a piece of writing is likely to be in
             * that language rather than the next one — speakers and how much
             * text there is of it, which is what makes a guess a good bet. The
             * first of them is the answer when nothing separates the candidates.
             */
            test: /\p{Script=Latin}/u, lang: 'en', shared: [
                [/[ç]/giu, ['fr', 'pt', 'tr', 'az', 'ca', 'sq']],
                [/[é]/giu, ['fr', 'es', 'pt', 'it', 'hu', 'ca']],
                [/[àèù]/giu, ['it', 'fr', 'pt', 'ca']],
                [/[óíáú]/giu, ['es', 'pt', 'hu', 'is']],
                [/[ü]/giu, ['de', 'tr', 'hu', 'az', 'et']],
                [/[ö]/giu, ['de', 'sv', 'tr', 'fi', 'hu', 'et']],
                [/[ä]/giu, ['de', 'sv', 'fi', 'et', 'sk']],
                [/[šž]/giu, ['cs', 'hr', 'sk', 'sl', 'lt', 'lv', 'et']],
                [/[ň]/giu, ['cs', 'sk']],

                // Croatian's one letter, and Vietnamese writes it in half its
                // words. It named Croatian outright until "đường" came back
                // English: đ scored for Croatian, ư for Vietnamese, and the tie
                // threw the word back to the script's default. Neither language
                // is the default, and only one of them is likely.
                [/[đ]/giu, ['vi', 'hr']]
            ], locals: [
                ['de', /[ß]/gu],
                ['pl', /[łąężź]/giu],
                ['cs', /[řěů]/giu],
                ['sk', /[ľĺŕ]/giu],
                ['hu', /[őű]/giu],
                ['ro', /[șț]/giu],
                ['tr', /[ğıİ]/gu],
                // The tone marks as well: Latin Extended Additional is written
                // by Vietnamese and by nothing else here, and ơ and ư alone left
                // "tiếng Việt" with no evidence at all.
                ['vi', /[ơưẠ-ỹ]/giu],
                ['pt', /[ã]/giu],
                ['es', /[ñ¿¡]/giu],
                ['fr', /[œêëâîôÿ]/giu],
                ['is', /[þð]/giu],
                ['lv', /[āēīķļņģ]/giu],
                ['lt', /[ėįų]/giu],
                ['et', /[õ]/giu],
                ['da', /[æø]/giu],
                ['sv', /[å]/giu],
                ['az', /[ə]/giu]
            ]
        }
    ];

    const FALLBACK = 'en';

    /*
     * Which of several languages to believe when the evidence cannot choose
     * between them.
     *
     * Ordered by how likely a piece of writing is to be in that language rather
     * than in the next — speakers and how much of the world's text is in it —
     * which is the same measure each shared list is ordered by, written out once
     * here for the ties, where there is no list to read it off.
     *
     * Only languages the table can reach are in here. Anything else ranks last,
     * which is the right answer for a language the letters never pointed at.
     */
    const LIKELY = new Map(('en zh es hi ar pt ru ja de fr ko it tr vi fa pl uk th ro el cs hu sv he '
        + 'da fi sk hr sr sl lt lv et ca sq az kk ky be mk tg tt ba mn ur ps bn mr ta te kn ml gu pa '
        + 'or as si my km lo ka hy am bo is').split(' ').map((tag, place) => [tag, place]));

    const rankOf = (tag) => (LIKELY.has(tag) ? LIKELY.get(tag) : LIKELY.size);

    const likeliest = (tags) => tags.reduce((a, b) => (rankOf(b) < rankOf(a) ? b : a));

    /*
     * The languages a shared letter points at, best first.
     *
     * A language is counted once per letter it explains, so a word carrying two
     * of them lands on whichever language accounts for both; the order inside a
     * list breaks what the counting cannot.
     */
    function hintFrom(script, line) {
        const votes = new Map();

        (script.shared || []).forEach(([marks, langs]) => {
            if (!line.match(marks)) return;
            langs.forEach((lang, place) => {
                const vote = votes.get(lang) || { hits: 0, place: 0 };
                vote.hits++;
                vote.place += place;
                votes.set(lang, vote);
            });
        });

        let best = null;
        votes.forEach((vote, lang) => {
            if (!best) { best = { lang, ...vote }; return; }
            if (vote.hits > best.hits) best = { lang, ...vote };
            else if (vote.hits === best.hits && vote.place < best.place) best = { lang, ...vote };
        });

        return best ? best.lang : null;
    }

    /*
     * The language of one string: its script, and inside the script whichever
     * language put the most of its own letters into it.
     *
     * Counting rather than first-match, because a line can carry letters from
     * more than one list — ñ and ã in the same breath — and the language that
     * explains more of them is the better answer. When they explain as much as
     * each other the letters cannot name one, but they have still ruled out
     * every language that writes none of them — the script's own language among
     * them — so the likeliest of the tied ones answers instead of the default.
     */
    function detect(text) {
        /*
         * Composed first: the same letter can be written as one code point or as
         * two, and the table below is written in the first form. Measured —
         * "fenêtre" with a single ê is French, and the same word with e followed
         * by a combining circumflex was English, because no marker matched two
         * code points where it was looking for one.
         *
         * The text the player typed or pasted is whatever their keyboard,
         * their phone or the page they copied from produced, and Vietnamese in
         * particular arrives decomposed often enough to matter.
         */
        const line = String(text || '').normalize('NFC');

        for (const script of SCRIPTS) {
            if (!script.test.test(line)) continue;

            let bestScore = 0;
            let top = [];

            for (const [tag, marks] of script.locals || []) {
                const found = line.match(marks);
                if (!found) continue;
                const score = new Set(found.map(c => c.toLowerCase())).size;
                if (score > bestScore) {
                    bestScore = score;
                    top = [tag];
                } else if (score === bestScore) {
                    top.push(tag);
                }
            }

            // One language and nothing against it is a name. Several is a guess
            // between them, which is what a shared letter gives too — and it
            // outranks one: these letters belong to their languages, and a word
            // carrying them has said more than a word merely allowed to.
            const named = top.length === 1 ? top[0] : null;
            const hinted = named ? null : (top.length ? likeliest(top) : hintFrom(script, line));

            return {
                lang: named || hinted || script.lang,
                marked: named,
                hinted: hinted,
                script: script.lang
            };
        }

        return { lang: null, marked: null, hinted: null, script: null };
    }

    /*
     * The language of a whole column of words — every original in a set, or
     * every translation.
     *
     * A set is normally one language on each side, so the column is read before
     * any single word is: one word may be ordinary letters and the next may
     * carry the ї that names the language, and the whole column is the best
     * chance of meeting that letter at all.
     *
     * The verdict is one language when the words that said anything all said
     * the same thing. Words with no letters of their own say nothing and vote
     * for nobody — they would otherwise drag every set back to the script's
     * default. A column nobody named outright is answered by its shared letters
     * instead, and when its words point different ways the column is asked as
     * a whole, the way a single word is: Kazakh written without its own letters
     * has і, which Ukrainian shares, in one word and ү in the next, and only
     * Kazakh explains both. Asked word by word it came back Russian — measured:
     * one word said Ukrainian, three Kazakh, and the six with neither letter
     * outvoted them both for the script's default.
     *
     * A column with no evidence at all is the script's default, unless the
     * person is known to read or learn another language written the same way
     * and not the default itself — see `preferred`. Spanish with no ñ or accent
     * in it was English, for somebody learning Spanish and not English.
     *
     * When the column really does hold several languages, no one language can
     * stand for it, and each word is left with its own.
     */
    speech.languageOfAll = (texts, preferred) => {
        const lines = (texts || []).map(t => String(t || '')).filter(t => t.trim());
        const seen = lines.map(detect).filter(r => r.script);

        if (!seen.length) return { lang: null, perText: null };

        const scripts = new Set(seen.map(r => r.script));
        const named = new Set(seen.map(r => r.marked).filter(Boolean));
        const hinted = new Set(seen.map(r => r.hinted).filter(Boolean));

        if (scripts.size === 1) {
            const owner = seen[0].script;

            // One language named outright answers for the column, whatever the
            // shared letters elsewhere in it were pointing at.
            if (named.size === 1) return { lang: [...named][0], perText: null };

            // Nobody named: a hint answers if the column has only one of them —
            // a column of French words carries no letter French alone writes,
            // and falling back to English would waste every ç in it.
            if (named.size === 0 && hinted.size === 1) return { lang: [...hinted][0], perText: null };

            if (named.size === 0 && hinted.size > 1) {
                const script = SCRIPTS.find(s => s.lang === owner);
                const whole = script && hintFrom(script, lines.join(' ').normalize('NFC'));
                if (whole) return { lang: whole, perText: null };
            }

            if (named.size === 0 && hinted.size === 0) return { lang: unmarked(owner, preferred), perText: null };
        }

        return { lang: null, perText: (texts || []).map(t => detect(t).lang) };
    };

    /*
     * What to call a column that carries nothing to tell its language by.
     *
     * The script's own language, as always -- unless the person reads or
     * learns that language already, in which case it is the safe answer, or
     * does not, and does read or learn another language written the same way.
     * The first of those in `preferred` (the languages being learned first,
     * then the one the person reads) is far likelier than a language they
     * never mentioned. Only a guess where there was none: a column whose
     * letters say anything is never overruled by it.
     */
    function unmarked(owner, preferred) {
        const mine = (preferred || []).filter(Boolean);
        if (!mine.length || mine.includes(owner)) return owner;

        return mine.find(tag => ownerOf(tag) === owner) || owner;
    }

    /*
     * Every language the detector can name outright — sixty-odd, and that is a fact
     * about the evidence rather than about the world: a language is in here only
     * if its script or one of its own letters gives it away. The shared letters
     * can land on a handful more, which are not listed: they are guesses between
     * candidates rather than languages the letters prove.
     *
     * Nothing calls this. It is kept as the honest count of what the table
     * knows, against the far longer list below.
     */
    speech.languages = () => {
        const tags = [];
        SCRIPTS.forEach(script => {
            if (!tags.includes(script.lang)) tags.push(script.lang);
            (script.locals || []).forEach(([tag]) => {
                if (!tags.includes(tag)) tags.push(tag);
            });
        });
        return tags;
    };

    /*
     * Every language there is a two-letter code for — ISO 639-1, the whole of
     * it — for the person who knows what their set is in.
     *
     * A far longer list than the one above, and it has to be: the detector can
     * only name a language whose letters give it away, while a person picking
     * from a list knows. Dutch, Swahili and Indonesian are not in the
     * detector's list and never will be, and none of that is a reason to stop
     * someone saying that is what their words are.
     *
     * Codes only. The names come from the browser, which already knows them in
     * whatever language it was asked in, and shipping our own table of two
     * hundred names would be shipping a translation job nobody asked for.
     */
    const ALL_CODES = ('aa ab ae af ak am an ar as av ay az ba be bg bi bm bn bo br bs ca ce ch co cr cs '
        + 'cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho '
        + 'hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw '
        + 'ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny '
        + 'oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st '
        + 'su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu').split(' ');

    speech.allLanguages = () => ALL_CODES.slice();

    /*
     * The writing system of a language the detector's table says nothing about —
     * named, as everywhere here, by the language that owns that writing.
     *
     * Only the exceptions are listed. Most of ISO 639-1 is written in Latin, so
     * Latin is what anything missing from both tables is taken to be; the ones
     * below are the languages where that guess would be wrong. Two of them own a
     * script nothing else here is written in, and point at themselves: there is
     * no neighbour to borrow a voice from.
     */
    const WRITTEN_IN = {
        ab: 'ru', av: 'ru', bg: 'ru', ce: 'ru', cu: 'ru', cv: 'ru', kv: 'ru', os: 'ru',
        ks: 'ar', ku: 'ar', sd: 'ar', ug: 'ar',
        ne: 'hi', pi: 'hi', sa: 'hi',
        ti: 'am', yi: 'he', dz: 'bo',
        dv: 'dv', iu: 'iu'
    };

    function ownerOf(code) {
        return scriptOwner(code) || WRITTEN_IN[code] || 'en';
    }

    /*
     * Which voice would read a word in this language on this device: its own,
     * the one that owns its writing system, or none at all.
     *
     * The three answers are three different things to tell a person choosing a
     * language. Its own voice is the good case. The owner's voice is the usual
     * one — Italian read by an English voice, Ukrainian by a Russian one: the
     * right letters with the wrong accent, which is worth far more than silence.
     * And none is the honest third: Greek owns its alphabet, so a device with no
     * Greek voice has nothing to say it with.
     */
    speech.readableBy = (code) => {
        const spoken = speech.spokenLanguages();
        if (spoken.has(code)) return code;

        const owner = ownerOf(code);
        return owner !== code && spoken.has(owner) ? owner : null;
    };

    /*
     * Which of them this device can actually say, as plain codes.
     *
     * The voices belong to the browser and not to the machine, so this is an
     * answer about here and now: the same person on the same computer gets a
     * different list in Edge than in Chrome, and a different one again on their
     * phone. Nothing may be stored from it — a word's language is the same word
     * everywhere, while its voice is a local accident.
     */
    speech.spokenLanguages = () => {
        const codes = new Set();
        voices().forEach(voice => {
            const code = String(voice.lang || '').split(/[-_]/)[0].toLowerCase();
            if (code) codes.add(code);
        });
        return codes;
    };

    // The language of a single string, for a word that has to answer for itself
    speech.languageOf = (text) => detect(text).lang;

    /*
     * The voice list arrives asynchronously, and on a page that has just loaded
     * it is empty for the first moments. A word asked for inside that window
     * used to be dropped without a sound — measured: on a machine with English
     * voices installed, a word asked for right after load found none.
     *
     * So a word asked for too early is held, and said when the list lands. One
     * word, not a queue: if two arrive before the voices do, the second is what
     * the player last asked for -- and the first is over, its waiter told so,
     * the same as a word cut off in the air (see settle).
     *
     * Held for a while and not for ever. A browser with no voices at all has a
     * list that is empty and stays empty, and says nothing about it: no
     * `voiceschanged`, ever. A word held for that was held for good, and so was
     * whoever was waiting on it -- measured in the snake, which lit every
     * letter it ate and never put the light out, and stopped at the end of the
     * round waiting for the last letter to finish being said. A list that is
     * coming at all comes fast -- measured: 14ms after it was first asked for,
     * in Chromium 152 -- so a list still empty at VOICES_WAIT is taken to be no
     * list: the held word goes as one with no voice, and so does everything
     * asked for after it, until a list does turn up.
     *
     * The wait starts with the page rather than with the first word, because a
     * word is not the only thing waiting on the answer: every speaker on the
     * screen was drawn on the strength of not knowing (see readable), and on a
     * device with no voices they stayed for good -- a promise of a sound with
     * nothing behind it. The screens are told when the answer comes, either
     * way (see onVoices).
     *
     * And the answer is remembered from one page to the next. Every game is a
     * page of its own and starts this file afresh, so on a device with no
     * voices each game drew its speakers, waited out VOICES_WAIT and took them
     * down again -- a second and a half of a promise on every game opened.
     * Remembered, the first page on the device is the only one that waits;
     * the rest start knowing, and a list that does turn up clears it on
     * whichever page it turns up. In localStorage rather than the database,
     * because it is wanted synchronously, before the first drawing -- the same
     * as the theme in prepaint.js; "Clear data" takes it with the rest, and the
     * device is asked again.
     *
     * Nothing else is cached. Voices come and go as the system installs them,
     * and reading the list is cheap.
     */
    const VOICES_WAIT = 1500;
    const VOICELESS_KEY = 'voiceless';

    function remembered() {
        try { return localStorage.getItem(VOICELESS_KEY) === '1'; } catch (e) { return false; }
    }

    function remember(none) {
        try {
            if (none) localStorage.setItem(VOICELESS_KEY, '1');
            else localStorage.removeItem(VOICELESS_KEY);
        } catch (e) {
            // Storage switched off: every page asks for itself, as before.
        }
    }

    let held = null;
    let waiting = false;
    let voiceless = remembered();
    let giveUp = 0;

    // The screens that drew before the answer was known -- see onVoices.
    let told = [];

    function voices() {
        return typeof speechSynthesis === 'undefined' ? [] : speechSynthesis.getVoices();
    }

    function known() {
        const all = told;
        told = [];
        all.forEach(redraw => redraw());
    }

    // A held word that will not be said after all. Its waiter is told either
    // way; counted as a missing voice only when that is why -- a word overtaken
    // by the next one, or hushed, is not a word the device could not say.
    function letGo(noVoice) {
        const word = held;
        held = null;

        if (!word) return;
        stopWaves();
        if (noVoice) track.tally('no_voice', [word.lang || detect(word.text).lang || '']);
        if (word.done) word.done();
    }

    // Nothing to wait out where the answer came from an earlier page: a list
    // that turns up is heard all the same, by the listener below.
    function whenVoicesArrive() {
        if (waiting || voiceless) return;
        waiting = true;

        giveUp = setTimeout(() => {
            voiceless = true;
            remember(true);
            letGo(true);
            known();
        }, VOICES_WAIT);
    }

    /*
     * For the life of the page rather than once: a list that turns up after
     * the giving up puts the device back among the ones that speak. A list
     * that changed to nothing is no answer at all.
     */
    if (typeof speechSynthesis !== 'undefined') {
        speechSynthesis.addEventListener('voiceschanged', () => {
            if (!voices().length) return;

            clearTimeout(giveUp);
            waiting = false;
            voiceless = false;
            remember(false);
            const word = held;
            held = null;

            // The waiter comes along with it: the caller has already lit a
            // word, or done whatever it does, on the strength of a word that
            // had not been said yet, and dropping it here would leave that
            // standing.
            //
            // Including when the word turns out to be unsayable. say() answered
            // "yes" while the voice list was still empty, and the list that
            // finally arrived may have nothing for this language — the caller
            // was told it would be said, so it has to be told that it was not.
            if (word && !speak(word.text, word.lang, word.done, word.asked, word.since)) {
                stopWaves();
                if (word.done) word.done();
            }

            known();
        });

        // A list here from the first call needs no event to say so, and
        // whatever an earlier page remembered is then out of date.
        if (voices().length) {
            voiceless = false;
            remember(false);
        } else {
            whenVoicesArrive();
        }
    }

    // An exact match first, then any voice of the same language: a device with
    // only en-GB should still read English rather than nothing.
    function voiceFor(tag) {
        const want = tag.toLowerCase();
        const base = want.split('-')[0];
        const list = voices();

        return list.find(v => v.lang.toLowerCase().replace('_', '-') === want)
            || list.find(v => v.lang.toLowerCase().replace('_', '-').split('-')[0] === base)
            || null;
    }

    /*
     * The language that owns the script a tag is written in: uk to ru, fa to ar,
     * anything Latin to en.
     */
    function scriptOwner(tag) {
        for (const script of SCRIPTS) {
            if (script.lang === tag) return script.lang;
            if ((script.locals || []).some(([local]) => local === tag)) return script.lang;
        }
        return null;
    }

    /*
     * Asked for the same thing twice: the second time is slower, and does not
     * sound quite like the first.
     *
     * A word is asked for again because it did not land, and saying it again the
     * same way says it to the ear that just missed it. Slower gives the
     * syllables room. The pitch moves as well, a little and at random, because
     * two identical readings back to back are heard as an echo of the first
     * rather than as a second go at it — a voice that shifts is a voice saying
     * it again.
     *
     * No ladder: the first repeat goes straight to the slowest speech there is.
     * Somebody asking twice is not asking for slightly slower, they are asking
     * for as slow as it goes, and steps on the way there spend the presses that
     * matter on speeds barely different from the one that already failed.
     *
     * The floor is 0.6 because past it the engines stop slowing the word and
     * start dragging it into something that is not the word any more. Where
     * exactly that happens depends on the voice, so it is set where the worst of
     * them is still intelligible.
     *
     * From the third time on the speed moves about inside the slow band instead
     * of landing on the same number again. There is nothing below the floor to
     * offer, and a word repeated at an identical speed is heard as the same
     * recording playing over — the same reason the pitch wanders. Varying it
     * keeps each go sounding like another attempt at saying the thing.
     *
     * Anything else said in between clears the count: what is remembered is the
     * last thing said, not a history of what has been said.
     *
     * Compared with case and surrounding space taken off, because that is what
     * "the same word" means to the person listening — the snake says a letter in
     * the case the board shows it in and the word it belongs to in lower case,
     * and those are not two different words to an ear.
     *
     * None of this is stored anywhere. It lives as long as the page does, and a
     * reload starts again at full speed, which is where someone who has just
     * arrived should be started.
     */
    const SLOWEST = 0.6;
    const SLOW_TOP = 0.8;
    const PITCH_SPREAD = 0.3;

    let lastSaid = null;
    let repeats = 0;

    function voicing(text) {
        const key = String(text).normalize('NFC').trim().toLowerCase();

        repeats = key === lastSaid ? repeats + 1 : 0;
        lastSaid = key;

        // The first time is the plain voice: no reason to colour a word that
        // nobody has had trouble with yet.
        if (!repeats) return { rate: 1, pitch: 1 };

        return {
            rate: repeats === 1 ? SLOWEST : SLOWEST + Math.random() * (SLOW_TOP - SLOWEST),
            pitch: 1 - PITCH_SPREAD / 2 + Math.random() * PITCH_SPREAD
        };
    }

    /*
     * Who is waiting for the sound to stop, and the ways it can stop.
     *
     * One waiter, not a queue: saying anything drops whatever was being said,
     * so there is only ever one utterance in the air and only one thing that
     * can be waiting on it.
     *
     * It is settled from three directions. The utterance's own `end` is the
     * ordinary one. Being cut off by the next word is the common one, and it is
     * settled here on the way in rather than left to the event the interruption
     * fires — that event belongs to the old utterance and arrives whenever the
     * engine gets round to it, which is after the new mark is already up.
     *
     * The third is a timer nobody wants to use. Chrome stops reading past about
     * fifteen seconds and does not always say so, and an `end` that never comes
     * would leave a word marked for the rest of the session, and whatever the
     * caller is doing meanwhile going on just as long.
     *
     * It has to be far too long rather than about right. Set close to what the
     * text should take, it races the `end` it is standing in for and wins often
     * enough to matter: measured, a single letter took 1842ms to say on one
     * machine while the wait allowed 1530, so the mark came off three hundred
     * milliseconds before the voice stopped, every time. A backstop that fires
     * during ordinary use is not a backstop, it is a second, worse clock.
     *
     * Each direction says which it was, for the analytics -- see noteOutcome.
     *
     * And each but the next word stops the waves of a speaker still waiting
     * for its voice. The next word leaves them to awaitVoice, which keeps them
     * going if it comes from the same speaker, pressed again while it waited.
     */
    let pending = null;

    function settle(outcome) {
        if (!pending) return;

        clearTimeout(pending.guard);
        if (outcome !== 'cut') stopWaves();

        const was = pending;
        pending = null;

        noteOutcome(was, outcome);
        if (was.done) was.done();
    }

    function guardMs(text, rate) {
        return Math.min(20000, (3000 + String(text).length * 400) / rate);
    }

    /*
     * The voice that would read this, or none.
     *
     * A device with no Ukrainian voice reads Ukrainian with a Russian one. The
     * neighbour is worth having: naming the language exactly is what this file
     * spent its table on, but a machine has the voices it has, and knowing a
     * word is Ukrainian must not be the reason it stops being read at all.
     * Before the tag was passed in, every Cyrillic word went to the Russian
     * voice and was heard; without this it would go silent.
     *
     * The tag may be a language the table never heard of — the picker offers
     * every language there is a code for, and the table knows sixty-odd. Then
     * the script of the text itself answers the same question: Italian asked
     * for and not installed is read by whatever reads Latin.
     *
     * Its own function because the answer is wanted twice: once by say(), on
     * its way to speaking, and once by whatever is deciding whether to offer a
     * speaker at all.
     */
    function voiceOf(text, lang) {
        const tag = lang || detect(text).lang || FALLBACK;
        const owner = scriptOwner(tag) || scriptOwner(detect(text).lang);

        return voiceFor(tag) || (owner && owner !== tag ? voiceFor(owner) : null);
    }

    /*
     * Whether anything on this device would read this out.
     *
     * Not knowing counts as yes. The voice list arrives after the page does and
     * is empty for the first moments; a speaker missing from the first card of
     * a session because the list had not landed yet is worse than one that
     * promises a little too much, and say() is optimistic in exactly the same
     * way — it holds the word and tries again when the voices turn up.
     *
     * Knowing there are none counts as no: the list still empty VOICES_WAIT
     * after the page asked for it, or an earlier page having found so. The
     * speakers drawn before then are taken back through onVoices.
     */
    /*
     * Calls back once, when it becomes known whether this device has voices:
     * the list arriving, or the wait for it running out.
     *
     * For a screen that had to draw before it could know: the answer it drew is
     * the optimistic one, and this is the moment it can be checked. Nothing is
     * registered when the list is already here — the screen has already drawn
     * the right thing and has nothing to redo. Registered when there are known
     * to be none, though: a list can still arrive -- above all where "none"
     * was remembered from an earlier page -- and the speakers come back then.
     * Each redraw once, however often a screen asks: the screens ask on every
     * drawing, which addEventListener used to fold into one by itself.
     */
    speech.onVoices = (whenKnown) => {
        if (!speech.available() || voices().length) return;
        if (!told.includes(whenKnown)) told.push(whenKnown);
        whenVoicesArrive();
    };

    speech.readable = (text, lang) => {
        if (!speech.available() || !hasWords(text)) return false;
        if (voices().length === 0) return !voiceless;

        return !!voiceOf(text, lang);
    };

    /*
     * Which voice it was, for the analytics: whether it lives on this machine
     * or answers from a server, and its name — `online Google 日本語`.
     *
     * Added after two people learning Japanese had their voice fail with the
     * voice right there in the list (23 October 2026): one failure with
     * `synthesis-failed`, the rest never saying they had finished. A cloud
     * voice that the network or the service left without an answer would do
     * both, and so might the cancel() just before speak(); the events could
     * not tell which, because they did not say which voice it was.
     *
     * The text a tallied event ends with, after the count — see track.tally —
     * so the parts before it keep their meaning. The separator is taken out of
     * the name all the same, so that the line still splits into the same parts.
     */
    function voiceNote(voice) {
        const where = voice.localService ? 'local' : 'online';
        const name = String(voice.name || '').replace(/\|/g, '/').slice(0, 60);

        return name ? where + ' ' + name : where;
    }

    /*
     * How each thing said came out, and how long the voice took to begin:
     * `speech`, one line per kind, counted -- see track.tally and
     * ANALYTICS.md.
     *
     * Asked the day after the Japanese voices failed (24 October 2026): how
     * long does somebody who pressed a speaker wait for the sound, and is it
     * heard out? Nothing could say. A voice that worked wrote nothing, and the
     * one that was cut off went out with `interrupted` and `canceled`, which
     * are thrown away below.
     *
     * The wait runs from the asking to the voice's `start`, the network and a
     * cloud voice's answer included, which is what the person sits through.
     * It is written as the band it fell in rather than in milliseconds: a sum
     * would be a different text every time and could not be counted, and a
     * band says "how many waited over a second" outright. `silent` where the
     * voice never began. The first band ends at half a second rather than
     * nearer: a voice installed on Windows took 255 to 270ms to begin in
     * every measurement, and a line drawn at 300 would have split one voice
     * between two bands by chance.
     *
     * Once for each utterance, when its end is known. Leaving the page is
     * known before the end of the sound, which may yet come -- see leaving --
     * so the first word is the one that counts.
     */
    const WAITS = [500, 1000, 3000];

    function waitOf(watcher) {
        if (watcher.began == null) return 'silent';

        const band = WAITS.find(top => watcher.began - watcher.since < top);
        return band ? String(band) : WAITS[WAITS.length - 1] + '+';
    }

    function noteOutcome(watcher, outcome) {
        if (watcher.noted) return;
        watcher.noted = true;

        track.tally('speech', [watcher.lang, watcher.asked ? 'speaker' : 'other', outcome, waitOf(watcher)], watcher.voice);
    }

    /*
     * The screen left while a voice is in the air: said as `left` there and
     * then, because the visit ends with the screen (track.js) and whatever is
     * told after it lands in the next visit, or in none. Not settled: a tab in
     * the background goes on talking and may yet finish, and whoever waits on
     * the voice is told when it does, as before.
     *
     * On the window and in the capture phase, so that it runs before the
     * analytics' own listener on the document ends the visit, whichever of the
     * two was added first. pagehide for a page replaced by the next one of the
     * app, which takes the visit along.
     */
    function leaving() {
        if (pending) noteOutcome(pending, 'left');
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('visibilitychange', () => { if (document.hidden) leaving(); }, true);
        window.addEventListener('pagehide', leaving, true);
    }

    /*
     * A pressed speaker whose voice has not begun yet: the two waves of the
     * glyph fade and come back, one after the other, until the sound starts.
     *
     * A cloud voice can take a second or more to answer -- the network, then
     * the service -- and a speaker that sits still under the finger for that
     * long reads as a press that missed. It gets pressed again, and the second
     * press starts the wait over. The waves say that the press landed and the
     * sound is on its way.
     *
     * Not for the first WAVES_AFTER ms. A voice installed on the device begins
     * in about a quarter of a second, and waves flickering on every press would
     * be answering a wait nobody had noticed.
     *
     * Opacity alone, on the waves alone: the colour is the games' own -- the
     * speaker in Wordcraft is painted while it talks -- and so is the size,
     * which the bars fit to the letters. Where motion is turned down, the waves
     * dim once and stay dim until the voice begins.
     *
     * `asked` is the speaker itself or just `true`; only an element has waves
     * to move.
     */
    const WAVES_AFTER = 300;
    const WAVES_CYCLE = 900;
    const WAVES_STAGGER = 250;

    let hanging = null;

    function awaitVoice(asked) {
        if (hanging && hanging.speaker === asked) return;
        stopWaves();

        if (typeof Element === 'undefined' || !(asked instanceof Element) || !asked.animate) return;

        const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
        const waves = Array.from(asked.querySelectorAll('.say-wave'));

        hanging = {
            speaker: asked,
            moves: (waves.length ? waves : [asked]).map((wave, i) => (still
                ? wave.animate([{ opacity: 1 }, { opacity: 0.35 }], { duration: 1, delay: WAVES_AFTER, fill: 'forwards' })
                : wave.animate([{ opacity: 1 }, { opacity: 0.15 }, { opacity: 1 }], {
                    duration: WAVES_CYCLE,
                    delay: WAVES_AFTER + i * WAVES_STAGGER,
                    iterations: Infinity,
                    easing: 'ease-in-out'
                })))
        };
    }

    function stopWaves() {
        if (!hanging) return;

        hanging.moves.forEach(move => move.cancel());
        hanging = null;
    }

    // `since` for a word that waited for the voice list: the wait is the
    // person's from the moment they asked, the list's arrival included.
    function speak(text, lang, whenDone, asked, since) {
        const voice = voiceOf(text, lang);

        // Counted rather than written each time: a missing voice is missing
        // on every tap of the session -- see track.tally.
        if (!voice) {
            track.tally('no_voice', [lang || detect(text).lang || '']);
            return false;
        }

        // Counted here rather than on the way in: a word the device has no
        // voice for was never said, and asking for it twice is not a repeat of
        // anything.
        const again = voicing(text);

        const line = new SpeechSynthesisUtterance(text);
        line.voice = voice;
        line.lang = voice.lang;
        line.rate = again.rate;
        line.pitch = again.pitch;

        // Whatever was being said is over as of this line, whoever was waiting
        // on it included.
        settle('cut');
        awaitVoice(asked);

        const watcher = {
            done: whenDone || null,
            guard: 0,
            since: since == null ? performance.now() : since,
            began: null,
            asked: !!asked,
            lang: line.lang,
            voice: voiceNote(voice),
            noted: false
        };

        // Both, because a voice can fail as well as finish, and either way the
        // sound has stopped. Each checks that it is still the one in the air:
        // the utterance this one replaces fires the same events a moment later,
        // and they are about a word nobody is listening to any more.
        line.onend = () => { if (pending === watcher) settle('done'); };

        // For the wait, and so that the backstop can say which of its two
        // cases it was
        line.onstart = () => {
            if (watcher.began == null) watcher.began = performance.now();
            if (pending === watcher) stopWaves();
        };

        // For the analytics, every failure but the two this file causes
        // itself: `interrupted` and `canceled` are what the next word does to
        // the last one, which is how speaking is meant to work here. On the
        // one still in the air they are not this file's doing -- it cuts only
        // the one before -- and the voice was `stopped` by something else.
        line.onerror = (e) => {
            const code = (e && e.error) || 'unknown';
            const cutOff = code === 'interrupted' || code === 'canceled';
            if (!cutOff) track.tally('speech_error', [code, line.lang], watcher.voice);

            if (pending === watcher) settle(cutOff ? 'stopped' : 'error');
        };

        // And the backstop firing, which is a voice that never said it had
        // finished -- or never started. Which of the two goes on the end:
        // a voice that never began is one that was not reached, or not let
        // speak; one that began and went quiet is another trouble.
        watcher.guard = setTimeout(() => {
            if (pending !== watcher) return;

            track.tally('speech_timeout', [line.lang], watcher.voice + (watcher.began != null ? ' started' : ' silent'));
            settle('timeout');
        }, guardMs(text, again.rate));

        pending = watcher;

        speechSynthesis.cancel();
        speechSynthesis.speak(line);

        return true;
    }

    speech.available = () => typeof speechSynthesis !== 'undefined';

    /*
     * Says it, dropping whatever was being said.
     *
     * Dropping rather than queueing because the caller is a game: the snake
     * reaches a letter every 220ms and a letter takes longer than that to say,
     * so a queue would fall behind the board and narrate a position the player
     * left seconds ago. Cutting the previous letter short keeps the sound on the
     * move that caused it.
     */
    /*
     * The sound, on by default.
     *
     * It was off, and the argument for off was where this app gets used: a
     * phone taken out in a queue, a popup opened beside somebody working. What
     * that argument left out is that a word has a sound as much as it has a
     * spelling, and half of what this app teaches was in the half nobody was
     * hearing -- because a switch you have no reason to suspect is off is a
     * switch nobody turns on.
     *
     * The old worry is answered by what speaks and when. Nothing here says
     * anything of its own accord: the first sound of a session follows a tap on
     * a word or a game being played, so it arrives after something the player
     * did rather than before. And the switch is in the header, one tap from
     * wherever they are.
     *
     * Kept here rather than asked of the caller, because every way a word can
     * be said goes through say(), and one gate is one place to be wrong. What
     * the caller does say is whether the sound is a speaker's -- see say().
     */
    let muted = false;

    speech.muted = () => muted;

    speech.mute = (on) => { muted = !!on; };

    /*
     * Muted, nothing is said and say() answers false — the same answer it gives
     * when the device has no voice, and for the same reason: the caller is being
     * told that no sound happened, whatever the cause.
     *
     * Except for the speaker. `asked` is a press on one of the speakers drawn
     * by speakerHtml -- the speaker itself, which then shows the wait for its
     * voice (see awaitVoice), or `true` -- and that is said whatever the switch
     * says: a speaker has
     * no purpose but the sound, and one that answered its own press with
     * nothing read as broken rather than as switched off. Everything else
     * stays under the switch -- what the app says by itself, the snake reading
     * out what it eats, and taps on words and letters as well. Decided 21
     * October 2026, the speaker alone.
     *
     * And nothing is drawn about it here. The switch used to pulse when a tap
     * landed here while it was off, which made sense while off was the default
     * and the player might not know it. Now the quiet is something they asked
     * for and the switch is already showing its off face. Except that it gets
     * forgotten, and a tap on a bubble in the catalog pulses the switch again
     * -- see pulseMute in catalog.js; the games do not.
     *
     * The analytics hear it, though, counted like a missing voice -- what the
     * switch kept quiet, which since `asked` is never a speaker.
     */
    speech.say = (text, lang, whenDone, asked) => {
        if (!text || !speech.available()) return false;

        if (muted && !asked) {
            track.tally('say_muted', [lang || detect(text).lang || '']);
            return false;
        }

        if (voices().length === 0) {
            // Known to have none: the answer a language with no voice gets.
            if (voiceless) {
                track.tally('no_voice', [lang || detect(text).lang || '']);
                return false;
            }

            letGo(false);
            held = { text: text, lang: lang, done: whenDone, asked: asked, since: performance.now() };
            awaitVoice(asked);
            whenVoicesArrive();
            return true;
        }

        return speak(text, lang, whenDone, asked);
    };

    speech.hush = () => {
        letGo(false);
        settle('hushed');
        if (speech.available()) speechSynthesis.cancel();
    };

    /*
     * A line of text the player can tap to hear — the whole of it, or one word
     * of it.
     *
     * Here rather than in a game because cards and quiz both show a word and
     * both let it be tapped, and what they share is not the markup but the
     * decisions underneath: where a word ends, what is marked while it is being
     * said, and for how long. Two copies of those would drift, and the copy
     * that drifted would be the one nobody was looking at.
     */

    /*
     * Where one word ends and the next begins.
     *
     * Not text.split(' '): a good part of the world writes without spaces —
     * Japanese, Chinese and Thai run a line together — and there a tap would
     * have nothing smaller than the whole line to land on. Intl.Segmenter knows
     * where the breaks fall in all of them at once, which is the same reason
     * snake.js leans on it for letters.
     *
     * isWordLike separates the words from what sits between them: spaces,
     * commas and question marks stay in the line as plain text, so the only
     * thing that can be tapped is a thing that can be said.
     */
    const WORDS = typeof Intl !== 'undefined' && Intl.Segmenter
        ? new Intl.Segmenter(undefined, { granularity: 'word' })
        : null;

    /*
     * Which of the two is asked, and why there are two.
     *
     * Spaces and punctuation is the plain answer and the one this starts on. It
     * is right wherever writing has spaces in it, and where writing has none it
     * is honestly wrong: a Japanese line comes back as a single word, which is
     * all a rule about spaces can say about a line without any.
     *
     * Intl.Segmenter is the other. Where the browser carries the dictionary for
     * the scripts that run on — Japanese, Chinese, Thai — it finds the breaks
     * inside them, which nothing else here can do.
     *
     * The dictionary is a few hundred kilobytes and some builds leave it out,
     * phone browsers especially. The API is there either way and answers either
     * way: without it the segmenter falls back to rules, and the rules put a
     * break between every pair of Han characters, so 日本語 comes back as three
     * words. Nothing in the API says which kind of browser this is. That is why
     * the dictionary's answer is offered rather than assumed: where it works it
     * is the best there is, and where it does not it is wrong in a way that
     * looks like working.
     */
    let byLanguage = false;

    speech.splitsByLanguage = () => byLanguage;

    speech.splitByLanguage = (on) => { byLanguage = !!on; };

    /*
     * A word as a language with spaces writes one: a run of letters, and of
     * everything a letter is written with.
     *
     * What counts as a letter is Unicode's answer rather than a list of our own,
     * and it has to be — the list would be every alphabet there is. Three sorts
     * of thing belong inside a word besides the obvious:
     *
     *   - the marks that hang off a letter and are not letters themselves: the
     *     vowel signs of हिंदी, the tone marks of เรียน. Left out of the
     *     class they read as punctuation, and a Hindi word came apart at every
     *     vowel in it;
     *   - the joiners written inside a word that show nothing at all — Persian
     *     می‌خواهم carries one between its halves;
     *   - the apostrophe of l'Aplicació and the hyphen of well-known, which are
     *     punctuation everywhere else and part of the word here.
     *
     * Everything else is what sits between words, and stays as it was written: a
     * space, a comma, and equally the Japanese 。, the Chinese ，, the Hindi ।
     * and the Greek question mark that is a semicolon. None of those had to be
     * named either — they are simply not letters.
     */
    const SPACED = /[\p{L}\p{M}\p{N}\u200c\u200d]+(?:['\u2019-][\p{L}\p{M}\p{N}\u200c\u200d]+)*|(?:(?!['\u2019-])[^\p{L}\p{M}\p{N}\u200c\u200d])+|['\u2019-]+/gu;

    const LETTER = /[\p{L}\p{M}\p{N}\u200c\u200d]/u;

    function partsOf(text) {
        const line = String(text || '');
        if (!line) return [];

        if (byLanguage && WORDS) return Array.from(WORDS.segment(line));

        return (line.match(SPACED) || [])
            .map(part => ({ segment: part, isWordLike: LETTER.test(part) }));
    }

    const hasWords = (text) => partsOf(text).some(part => part.isWordLike);

    /*
     * The line broken into words, in the order it was written: what is a word
     * and what is the space or the comma between two of them.
     *
     * Handed over rather than drawn, because what a screen does with a word is
     * the screen's business — one wraps each in a span to be tapped, another
     * only needs to know how many there are.
     */
    speech.words = (text) => partsOf(text)
        .map(part => ({ text: part.segment, isWord: !!part.isWordLike }));

    /*
     * The letters of a word, as a reader counts them.
     *
     * Not code units: й can be written as two of them and न्न as three, and
     * splitting there would hand back half a letter. Segmenter's graphemes are
     * the same thing snake.js lays out one per cell, for the same reason —
     * whatever a person would point at and call one letter.
     *
     * Where Segmenter is missing, code points: still whole for most of the
     * world, and wrong only where the combining marks are.
     */
    const GRAPHEMES = typeof Intl !== 'undefined' && Intl.Segmenter
        ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
        : null;

    speech.letters = (text) => {
        const line = String(text || '');
        if (!line) return [];

        return GRAPHEMES
            ? Array.from(GRAPHEMES.segment(line)).map(part => part.segment)
            : Array.from(line);
    };

    // Every word its own target; everything between them left as it was written
    speech.lineHtml = (text) => partsOf(text)
        .map(part => (part.isWordLike
            ? `<span class="say-word" data-press style="border-radius: 4px; transition: background 0.2s, color 0.2s;">${part.segment}</span>`
            : part.segment))
        .join('');

    /*
     * The speaker beside the line, and the only visible sign that any of this
     * can be heard at all: a word that reads aloud when tapped looks exactly
     * like a word that does nothing, so something has to say so. It reads the
     * whole line, which is what a tap beside the words does too.
     *
     * A span and not a button, though a button is what it behaves like. Quiz
     * stands one of these inside an option, and an option is a button: the HTML
     * parser does not nest buttons — a second <button> closes the first one
     * where it stands — so the markup would come apart rather than render
     * wrong. One shape for all three places is worth more than the tab stop a
     * real button would add to a popup driven by arrow keys.
     *
     * The colour is the caller's, and so is `css`, appended last so it wins:
     * every screen has its own palette and its own idea of where this sits —
     * under a word on a card, beside one in an option. The glyph is 1em, so
     * font-size is the one thing that resizes it.
     *
     * Empty where there is nothing to say, and where there is nothing to say
     * it with: an untranslated word, or a language this device has no voice
     * for. The speaker is a promise that this can be heard, and on a machine
     * without the voice pressing it did exactly what pressing the word did,
     * which was nothing — an offer that answers with silence is worse than no
     * offer, because the silence reads as the app being broken.
     */
    speech.speakerHtml = (text, lang, colour, css) => {
        if (!speech.readable(text, lang)) return '';

        return `<span class="say-all" data-press title="Say it" aria-hidden="true" style="margin-top: 10px; padding: 0; color: ${colour}; cursor: pointer; display: inline-flex; font-size: 20px; transition: color 0.2s;${css || ''}"><svg viewBox="0 0 24 24" style="width: 1em; height: 1em; display: block;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path class="say-wave" d="M15.5 8.5a5 5 0 0 1 0 7" /><path class="say-wave" d="M18.8 5.2a9 9 0 0 1 0 13.6" /></svg></span>`;
    };

}
speech();
