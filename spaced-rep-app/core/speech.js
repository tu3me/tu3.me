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
     * instead, on the same terms: one hint and no argument. When the column
     * really does hold several languages, no one language can stand for it, and
     * each word is left with its own.
     */
    speech.languageOfAll = (texts) => {
        const lines = (texts || []).map(t => String(t || '')).filter(t => t.trim());
        const seen = lines.map(detect).filter(r => r.script);

        if (!seen.length) return { lang: null, perText: null };

        const scripts = new Set(seen.map(r => r.script));
        const named = new Set(seen.map(r => r.marked).filter(Boolean));
        const hinted = new Set(seen.map(r => r.hinted).filter(Boolean));

        if (scripts.size === 1) {
            // One language named outright answers for the column, whatever the
            // shared letters elsewhere in it were pointing at.
            if (named.size === 1) return { lang: [...named][0], perText: null };

            // Nobody named: a hint answers if the column has only one of them —
            // a column of French words carries no letter French alone writes,
            // and falling back to English would waste every ç in it.
            if (named.size === 0 && hinted.size <= 1) {
                return { lang: hinted.size ? [...hinted][0] : seen[0].script, perText: null };
            }
        }

        return { lang: null, perText: (texts || []).map(t => detect(t).lang) };
    };

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
     * the player last asked for.
     *
     * Nothing else is cached. Voices come and go as the system installs them,
     * and reading the list is cheap.
     */
    let held = null;
    let waiting = false;

    function voices() {
        return typeof speechSynthesis === 'undefined' ? [] : speechSynthesis.getVoices();
    }

    function whenVoicesArrive() {
        if (waiting) return;
        waiting = true;

        speechSynthesis.addEventListener('voiceschanged', () => {
            waiting = false;
            const word = held;
            held = null;
            if (word) speak(word.text, word.lang);
        }, { once: true });
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
     * Every further press takes another step down to a floor. Past the floor the
     * engines stop slowing the word and start dragging it into something that is
     * not the word any more; where exactly that is depends on the voice, so the
     * floor is set where the worst of them is still intelligible.
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
    const REPEAT_STEP = 0.12;
    const SLOWEST = 0.62;
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
            rate: Math.max(SLOWEST, 1 - REPEAT_STEP * repeats),
            pitch: 1 - PITCH_SPREAD / 2 + Math.random() * PITCH_SPREAD
        };
    }

    function speak(text, lang) {
        const tag = lang || detect(text).lang || FALLBACK;

        /*
         * A device with no Ukrainian voice reads Ukrainian with a Russian one.
         *
         * The neighbour is worth having: naming the language exactly is what
         * this file spent its table on, but a machine has the voices it has, and
         * knowing a word is Ukrainian must not be the reason it stops being read
         * at all. Before the tag was passed in, every Cyrillic word went to the
         * Russian voice and was heard; without this it would go silent.
         */
        // The tag may be a language the table never heard of — the picker offers
        // every language there is a code for, and the table knows sixty-odd.
        // Then the script of the text itself answers the same question: Italian
        // asked for and not installed is read by whatever reads Latin.
        const owner = scriptOwner(tag) || scriptOwner(detect(text).lang);
        const voice = voiceFor(tag) || (owner && owner !== tag ? voiceFor(owner) : null);
        if (!voice) return false;

        // Counted here rather than on the way in: a word the device has no
        // voice for was never said, and asking for it twice is not a repeat of
        // anything.
        const again = voicing(text);

        const line = new SpeechSynthesisUtterance(text);
        line.voice = voice;
        line.lang = voice.lang;
        line.rate = again.rate;
        line.pitch = again.pitch;

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
    speech.say = (text, lang) => {
        if (!text || !speech.available()) return false;

        if (voices().length === 0) {
            held = { text: text, lang: lang };
            whenVoicesArrive();
            return true;
        }

        return speak(text, lang);
    };

    speech.hush = () => {
        held = null;
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

    // Where Segmenter is missing, spaces are the next best guess — wrong for
    // exactly the scripts it was brought in for, and right for the rest.
    function partsOf(text) {
        const line = String(text || '');
        if (!line) return [];

        if (WORDS) return Array.from(WORDS.segment(line));

        return line.split(/(\s+)/).filter(Boolean)
            .map(part => ({ segment: part, isWordLike: !/^\s+$/.test(part) }));
    }

    const hasWords = (text) => partsOf(text).some(part => part.isWordLike);

    // Every word its own target; everything between them left as it was written
    speech.lineHtml = (text) => partsOf(text)
        .map(part => (part.isWordLike
            ? `<span class="say-word" style="border-radius: 4px; transition: background 0.2s, color 0.2s;">${part.segment}</span>`
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
     * Empty where there is nothing to say — an untranslated word would
     * otherwise offer a speaker that answers with silence.
     */
    speech.speakerHtml = (text, colour, css) => {
        if (!hasWords(text)) return '';

        return `<span class="say-all" title="Say it" aria-hidden="true" style="margin-top: 10px; padding: 0; color: ${colour}; cursor: pointer; display: inline-flex; font-size: 20px; transition: color 0.2s;${css || ''}"><svg viewBox="0 0 24 24" style="width: 1em; height: 1em; display: block;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.8 5.2a9 9 0 0 1 0 13.6" /></svg></span>`;
    };

    /*
     * What is lit right now — one line's worth for the whole page, because
     * saying a word drops whatever was being said before it. Two marks at once
     * would be claiming both are being spoken, and only the second one is.
     */
    let sayTimer = null;
    let lit = [];

    function unlight() {
        lit.forEach(el => {
            el.style.background = '';
            el.style.color = '';
        });
        lit = [];
    }

    // For a screen about to be rebuilt: the marked nodes are being thrown away,
    // so there is nothing to put back and nothing left to wait for.
    speech.forget = () => {
        clearTimeout(sayTimer);
        lit = [];
    };

    /*
     * Marks what is being said — for half a second, not for as long as the
     * voice takes. The utterance's own `end` arrives just the same when the
     * device said nothing at all, so it cannot time anything honestly; half a
     * second is long enough to see which word answered the tap.
     *
     * A fill with dark ink on it rather than coloured letters. The app's two
     * colours are mid-light, which is what makes them good fills and bad text:
     * the mint written as text is 5.1:1 on the dark card but 2.1:1 on the light
     * one, so recolouring the word would make it harder to read at the very
     * moment it is being read out. As a fill it is one value in both themes and
     * the ink on it is 6.9:1 either way. The caller passes the pair — quiz fills
     * an answered option the same way, for the same reason.
     *
     * No padding on the fill: a word that grew by a few pixels would push the
     * rest of the line sideways, and the line is the thing being pointed at.
     */
    function light(els, marks) {
        clearTimeout(sayTimer);
        unlight();

        lit = els.slice();
        lit.forEach(el => {
            el.style.background = marks.fill;
            el.style.color = marks.ink;
        });

        sayTimer = setTimeout(unlight, 500);
    }

    /*
     * Wires up a line that has been drawn: a tap inside `root` says whatever it
     * landed on — one word, or the whole line when it lands beside the words or
     * on the speaker below them.
     *
     * Marked only when there was something to hear: say() returns false where
     * the device has no voice for the script, and a word flashing in silence
     * would be claiming it spoke.
     */
    speech.listen = (root, text, lang, marks) => {
        if (!root || !hasWords(text)) return;

        const mark = (said, els) => { if (said) light(els, marks); };

        root.addEventListener('click', (e) => {
            const word = e.target.closest('.say-word');
            if (word) return mark(speech.say(word.textContent, lang), [word]);

            // The whole line lights word by word rather than as one block, so
            // that saying all of it looks like saying each of them.
            mark(speech.say(text, lang), Array.from(root.querySelectorAll('.say-word')));
        });
    };
}
speech();
