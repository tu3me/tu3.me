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
 * The language is guessed from the writing itself, and a set carries the guess
 * once it has been made: speech.languageOfAll reads a whole column of words at
 * once — every original, or every translation — which is the only way a set of
 * ordinary-looking words gets its language from the one word in it that happens
 * to carry a local letter. catalog.js stores the answer on the set, and say()
 * takes it as its second argument. Without one it falls back to guessing from
 * the text in hand, which is all a single word can offer.
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
     * Only letters nobody else writes count. Ukrainian і is also Belarusian and
     * Kazakh, and while it was in Ukrainian's list a Belarusian word with і in it
     * scored for both and the tie threw the whole column back to Russian. The
     * same went for Kazakh ә against Tatar and Bashkir. A letter shared with a
     * neighbour is evidence for nobody.
     *
     * Kana before Han: Japanese uses both, and a sentence with kana in it is
     * Japanese, while one with Han alone is more likely Chinese.
     *
     * What this cannot do, and no amount of letters will fix:
     *
     *   - Italian, Dutch, Finnish and Albanian have no letter their neighbours
     *     lack, so they read as English;
     *   - Norwegian is written with the Danish letters, and Estonian's õ is
     *     Portuguese's as well;
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
            test: /\p{Script=Cyrillic}/u, lang: 'ru', locals: [
                ['uk', /[їєґ]/giu],
                ['be', /[ў]/giu],
                ['sr', /[ђћџљњ]/giu],
                ['mk', /[ѓќѕ]/giu],
                ['kk', /[ұқғһ]/giu],
                ['ky', /[ң]/giu],
                ['tg', /[ӣӯҷҳ]/giu],
                ['tt', /[җ]/giu],
                ['ba', /[ҙҫҡ]/giu]
            ]
        },

        // Latin last: a line in any other script may still carry a Latin word
        {
            test: /\p{Script=Latin}/u, lang: 'en', locals: [
                ['de', /[ß]/gu],
                ['pl', /[łąężź]/giu],
                ['cs', /[řěů]/giu],
                ['sk', /[ľĺŕ]/giu],
                ['hu', /[őű]/giu],
                ['ro', /[șț]/giu],
                ['tr', /[ğıİ]/gu],
                ['vi', /[ơư]/giu],
                ['pt', /[ã]/giu],
                ['es', /[ñ¿¡]/giu],
                ['fr', /[œêëâîôÿ]/giu],
                ['is', /[þð]/giu],
                ['lv', /[āēīķļņģ]/giu],
                ['lt', /[ėįų]/giu],
                ['et', /[õ]/giu],
                ['da', /[æø]/giu],
                ['sv', /[å]/giu],
                ['hr', /[đ]/giu],
                ['az', /[ə]/giu]
            ]
        }
    ];

    const FALLBACK = 'en';

    /*
     * The language of one string: its script, and inside the script whichever
     * language put the most of its own letters into it.
     *
     * Counting rather than first-match, because the marks overlap: Vietnamese
     * writes đ and so does Croatian, but a Vietnamese word almost always brings
     * ơ or ư along with it, and two marks beat one. A tie says the letters do
     * not know, and the script's own language answers instead.
     */
    function detect(text) {
        const line = String(text || '');

        for (const script of SCRIPTS) {
            if (!script.test.test(line)) continue;

            let best = null;
            let bestScore = 0;
            let tied = false;

            for (const [tag, marks] of script.locals || []) {
                const found = line.match(marks);
                if (!found) continue;
                const score = new Set(found.map(c => c.toLowerCase())).size;
                if (score > bestScore) {
                    best = tag;
                    bestScore = score;
                    tied = false;
                } else if (score === bestScore) {
                    tied = true;
                }
            }

            return {
                lang: (best && !tied) ? best : script.lang,
                marked: (best && !tied) ? best : null,
                script: script.lang
            };
        }

        return { lang: null, marked: null, script: null };
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
     * default. When the column really does hold several languages, no one
     * language can stand for it, and each word is left with its own.
     */
    speech.languageOfAll = (texts) => {
        const lines = (texts || []).map(t => String(t || '')).filter(t => t.trim());
        const seen = lines.map(detect).filter(r => r.script);

        if (!seen.length) return { lang: null, perText: null };

        const scripts = new Set(seen.map(r => r.script));
        const named = new Set(seen.map(r => r.marked).filter(Boolean));

        // One script and at most one language claiming it: the set has an answer
        if (scripts.size === 1 && named.size <= 1) {
            return { lang: named.size ? [...named][0] : seen[0].script, perText: null };
        }

        return { lang: null, perText: (texts || []).map(t => detect(t).lang) };
    };

    /*
     * Every language the detector can arrive at by itself. Sixty-odd, and that
     * is a fact about the evidence rather than about the world: a language is in
     * here only if its script or one of its own letters gives it away.
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
     * from a list knows. Italian, Dutch, Swahili and Finnish are not in the
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
        // every language there is a code for, and the table knows sixty. Then
        // the script of the text itself answers the same question: Italian
        // asked for and not installed is read by whatever reads Latin.
        const owner = scriptOwner(tag) || scriptOwner(detect(text).lang);
        const voice = voiceFor(tag) || (owner && owner !== tag ? voiceFor(owner) : null);
        if (!voice) return false;

        const line = new SpeechSynthesisUtterance(text);
        line.voice = voice;
        line.lang = voice.lang;

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
}
speech();
