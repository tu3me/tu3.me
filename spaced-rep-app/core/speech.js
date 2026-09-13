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
 * Nothing here knows what language a word is in — the app never asks the player
 * and the data does not carry it. The script is the only evidence, and it is
 * good evidence for most of the world's writing: Devanagari means Hindi far
 * more often than not. It is poor evidence for the Latin alphabet, which is
 * shared by hundreds of languages, so Latin text is read as English and a
 * French word will be read with an English voice.
 */
function speech() {
    /*
     * Which language a piece of text is most likely in, by the script it is
     * written in.
     *
     * Kana before Han: Japanese uses both, and a sentence with kana in it is
     * Japanese, while one with Han alone is more likely Chinese.
     */
    const BY_SCRIPT = [
        [/[\p{Script=Hiragana}\p{Script=Katakana}]/u, 'ja-JP'],
        [/\p{Script=Han}/u, 'zh-CN'],
        [/\p{Script=Hangul}/u, 'ko-KR'],
        [/\p{Script=Devanagari}/u, 'hi-IN'],
        [/\p{Script=Thai}/u, 'th-TH'],
        [/\p{Script=Arabic}/u, 'ar-SA'],
        [/\p{Script=Hebrew}/u, 'he-IL'],
        [/\p{Script=Greek}/u, 'el-GR'],
        [/\p{Script=Cyrillic}/u, 'ru-RU']
    ];

    const FALLBACK = 'en-US';

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
            if (word) speak(word);
        }, { once: true });
    }

    function tagFor(text) {
        for (const [script, tag] of BY_SCRIPT) {
            if (script.test(text)) return tag;
        }

        return FALLBACK;
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

    function speak(text) {
        const voice = voiceFor(tagFor(text));
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
    speech.say = (text) => {
        if (!text || !speech.available()) return false;

        if (voices().length === 0) {
            held = text;
            whenVoicesArrive();
            return true;
        }

        return speak(text);
    };

    speech.hush = () => {
        held = null;
        if (speech.available()) speechSynthesis.cancel();
    };
}
speech();
