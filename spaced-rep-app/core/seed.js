/**
 * The set a first-time player starts with. Used only when storage holds
 * nothing yet, so this file never touches saved data.
 *
 * A function rather than a constant because what it returns goes straight to
 * the store, which writes into it — languages onto words that name none, and
 * repetitions as they are played. One shared array would hand the second
 * caller the first caller's edits.
 *
 * Both languages are written on every word rather than worked out by
 * speech.languageOfAll: what is in here is known, and a starting set has no
 * business depending on a detector being right about ten languages at
 * once. store.label only fills in words that name no language, so what is
 * written here is what stays.
 */
function seed() {
    seed.sets = () => {
        return [
            {
                /*
                 * One set, ten languages, and every line a phrase whose
                 * meaning the reader already knows before they have read a
                 * word of it.
                 *
                 * A country and the thing it is known for: Turkish coffee, a
                 * Swiss watch, a Japanese garden. Somebody opening this app
                 * for the first time has to be able to tell what the left-hand
                 * side says without being taught it, and these phrases are the
                 * nearest thing to vocabulary a stranger can be assumed to
                 * have — common property in every language at once.
                 *
                 * All of them are compliments, and that is not decoration. It
                 * is the first screen of the app and a word stays on it for
                 * months; what it says is worth choosing.
                 *
                 * The scripts are mixed on purpose — Latin, Greek,
                 * Devanagari, Han, Kana, Hangul, Thai. Snake
                 * lays a word out one letter to a cell and cards splits a line
                 * into words, and both have to agree with the reader about
                 * what a letter is; a starting set that exercises that on the
                 * first run is worth more than one that does not.
                 *
                 * The three lines written in scripts that use no spaces have
                 * had them put in: 日本 庭園, 中国 丝绸, นวด แผนไทย. That is not
                 * how any of the three is written, and it is deliberate — it
                 * is the same advice the Split words hint in the settings
                 * gives, taken here. A learner needs to see where one word
                 * ends, tapping a line should say one word rather than all of
                 * it, and only some browsers carry the dictionaries that could
                 * work that out; a space works everywhere and needs nothing.
                 *
                 * The capitals are uneven on purpose, and it is the
                 * languages that are uneven rather than the typing. German
                 * capitalises an adjective made from a country's name —
                 * Schweizer Uhr — and Spanish, French, Italian and Greek do
                 * not: guitarra española, parfum français, moda italiana,
                 * ελληνική φιλοξενία. The rest of the scripts here have no
                 * letters to capitalise. None of these is the first word of a
                 * sentence, so nothing gets a capital for standing first.
                 * Squaring them up would put a spelling mistake on four
                 * cards.
                 *
                 * The English side is level because English is: the nationality
                 * takes the capital, the thing it names does not.
                 *
                 * Every English side is different, and that is a rule rather
                 * than a coincidence: the quiz builds its wrong answers out of
                 * the other words in the same set, and two words translated
                 * the same would put one line in front of the player twice
                 * with one of the two counted wrong.
                 *
                 * The first five are the five languages most people are
                 * learning — Spanish, Chinese, French, Japanese, German — and
                 * they are first so that whoever opens this sees their own
                 * among the first things on the card. The order matters only
                 * here: every game deals the words shuffled.
                 *
                 * Nothing has been played. Every word starts on stage 0, which
                 * is where a word with no history belongs — the sets that used
                 * to be here carried invented repetitions to show the timeline
                 * off, and a demonstration of somebody else's progress is not
                 * what a first screen should be.
                 */
                id: '1',
                title: 'Around the world',
                words: [
                    { original: 'guitarra española', originalLang: 'es', translation: 'Spanish guitar', translationLang: 'en', repetitions: [] },
                    { original: '中国 丝绸', originalLang: 'zh', translation: 'Chinese silk', translationLang: 'en', repetitions: [] },
                    { original: 'parfum français', originalLang: 'fr', translation: 'French perfume', translationLang: 'en', repetitions: [] },
                    { original: '日本 庭園', originalLang: 'ja', translation: 'Japanese garden', translationLang: 'en', repetitions: [] },
                    { original: 'Schweizer Uhr', originalLang: 'de', translation: 'Swiss watch', translationLang: 'en', repetitions: [] },
                    { original: 'भारतीय चाय', originalLang: 'hi', translation: 'Indian tea', translationLang: 'en', repetitions: [] },
                    { original: 'ελληνική φιλοξενία', originalLang: 'el', translation: 'Greek hospitality', translationLang: 'en', repetitions: [] },
                    { original: 'moda italiana', originalLang: 'it', translation: 'Italian fashion', translationLang: 'en', repetitions: [] },
                    { original: '한국 김치', originalLang: 'ko', translation: 'Korean kimchi', translationLang: 'en', repetitions: [] },
                    { original: 'นวด แผนไทย', originalLang: 'th', translation: 'Thai massage', translationLang: 'en', repetitions: [] }
                ]
            }
        ];
    };
}
seed();
