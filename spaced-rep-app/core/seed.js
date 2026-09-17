/**
 * The sets a first-time player starts with. Used only when storage holds
 * nothing yet, so this file never touches saved data.
 *
 * Timestamps are relative to load time, which is why this is a function and
 * not a constant: the sample progress has to look alive whenever it is built.
 *
 * Both languages are written on every word rather than worked out by
 * speech.languageOfAll: what is in these sets is known, and a starting set has
 * no business depending on a detector being right about it. store.label only
 * fills in words that name no language, so what is written here is what stays —
 * including the ten different ones among the eleven originals of WRITING
 * SYSTEMS.
 */
function seed() {
    const MIN = 60 * 1000;

    // Builds a repetitions array from [minutesAgoOffset, result] pairs (offsets are cumulative)
    function demoRepetitions(now, startMinutesAgo, steps, game = 'cards') {
        let ts = now - startMinutesAgo * MIN;
        return steps.map(([offsetMin, result], i) => {
            if (i > 0) ts += offsetMin * MIN;
            return { timestamp: ts, result, game };
        });
    }

    // Data model: only { timestamp, result, game } is stored per repetition;
    // stage / nextRepetition / progress marks are always derived by getWordProgress()
    seed.sets = () => {
        const now = Date.now();
        const reps = (...args) => demoRepetitions(now, ...args);

        return [
            {
                id: '1',
                title: '7 words',
                words: [
                    { original: 'go away', originalLang: 'en', translation: 'уходи', translationLang: 'ru', repetitions: [] },
                    { original: 'know', originalLang: 'en', translation: 'знать', translationLang: 'ru', repetitions: [] },
                    { original: 'think', originalLang: 'en', translation: 'думать', translationLang: 'ru', repetitions: [] },
                    { original: 'take', originalLang: 'en', translation: 'брать', translationLang: 'ru', repetitions: [] },
                    { original: 'see', originalLang: 'en', translation: 'видеть', translationLang: 'ru', repetitions: [] },
                    { original: 'come', originalLang: 'en', translation: 'приходить', translationLang: 'ru', repetitions: [] },
                    { original: 'want', originalLang: 'en', translation: 'хотеть', translationLang: 'ru', repetitions: [] }
                ]
            },
            {
                id: '2',
                title: 'TRAVEL ESSENTIALS',
                words: [
                    // FAIL OK OK MISSED MISSED LATE_OK EARLY_OK — stage 6
                    { original: 'airport', originalLang: 'en', translation: 'аэропорт', translationLang: 'ru', repetitions: reps(160, [[0, 0], [4, 1], [6, 1], [110, 1], [30, 1]]) },
                    // OK OK OK EARLY_FAIL OK — stage 2
                    { original: 'ticket', originalLang: 'en', translation: 'билет', translationLang: 'ru', repetitions: reps(31, [[0, 1], [6, 1], [12, 1], [5, 0], [5, 1]], 'quiz') },
                    // FAIL MISSED LATE_FAIL OK — stage 2
                    { original: 'hotel', originalLang: 'en', translation: 'отель', translationLang: 'ru', repetitions: reps(16, [[0, 0], [10, 0], [4, 1]], 'snake') },
                    { original: 'luggage', originalLang: 'en', translation: 'багаж', translationLang: 'ru', repetitions: [] },
                    { original: 'passport', originalLang: 'en', translation: 'паспорт', translationLang: 'ru', repetitions: reps(1, [[0, 1]]) },
                    { original: 'customs', originalLang: 'en', translation: 'таможня', translationLang: 'ru', repetitions: [] },
                    { original: 'flight', originalLang: 'en', translation: 'рейс', translationLang: 'ru', repetitions: [] }
                ]
            },
            {
                /*
                 * Not a lesson — a test bench for snake, which lays a word out
                 * one letter per cell and so has to agree with the reader on
                 * what a letter is.
                 *
                 * One question asked in ten languages, so the Russian side names
                 * the language the other side is written in and nothing has to
                 * be guessed from a script you may not read.
                 *
                 * Between them they cover what breaks a naive split by UTF-16
                 * code units, and each line says which case it carries. They are
                 * deliberately mixed into one set: a bench that can be played
                 * through in a minute is worth more than ten nobody opens.
                 */
                id: '3',
                title: 'WRITING SYSTEMS',
                words: [
                    // Han, and a full-width question mark that takes a cell of
                    // its own like any other letter
                    { original: '怎么学中文？', originalLang: 'zh', translation: 'Как выучить китайский?', translationLang: 'ru', repetitions: [] },
                    // Kana and kanji mixed
                    { original: '日本語はどう勉強しますか？', originalLang: 'ja', translation: 'Как выучить японский?', translationLang: 'ru', repetitions: [] },
                    // Hangul: precomposed syllables, one code point per block
                    { original: '한국어를 어떻게 배우나요?', originalLang: 'ko', translation: 'Как выучить корейский?', translationLang: 'ru', repetitions: [] },
                    // Devanagari: conjuncts and vowel signs belong to the
                    // consonant they hang off
                    { original: 'हिंदी कैसे सीखें?', originalLang: 'hi', translation: 'Как выучить хинди?', translationLang: 'ru', repetitions: [] },
                    // Danda ends a statement in Hindi where a full stop would
                    // end an English one — the only line here that is not a
                    // question, and the only place that mark appears
                    { original: 'मैं हिंदी सीखता हूँ।', originalLang: 'hi', translation: 'Я учу хинди.', translationLang: 'ru', repetitions: [] },
                    // Thai: vowels and tone marks sit above and below their
                    // consonant, and the language writes no question mark — the
                    // spaces do the work
                    { original: 'เรียนภาษาไทยอย่างไร', originalLang: 'th', translation: 'Как выучить тайский?', translationLang: 'ru', repetitions: [] },
                    // Arabic, right to left, with its own mirrored question mark
                    { original: 'كيف أتعلم العربية؟', originalLang: 'ar', translation: 'Как выучить арабский?', translationLang: 'ru', repetitions: [] },
                    // Hebrew, right to left; the niqqud are separate code points
                    // that belong to the letter before them
                    { original: 'איך לומדים עִבְרִית?', originalLang: 'he', translation: 'Как выучить иврит?', translationLang: 'ru', repetitions: [] },
                    // Greek asks with a semicolon
                    { original: 'Πώς να μάθω ελληνικά;', originalLang: 'el', translation: 'Как выучить греческий?', translationLang: 'ru', repetitions: [] },
                    // Spanish opens the question as well as closing it
                    { original: '¿Cómo aprender español?', originalLang: 'es', translation: 'Как выучить испанский?', translationLang: 'ru', repetitions: [] },
                    // French puts a narrow no-break space before its question
                    // mark — a letter that is blank but is not the space bar —
                    // and this ç is written decomposed, c followed by a
                    // combining cedilla, which the old split tore in two
                    { original: 'Comment apprendre le franc\u0327ais\u202f?', originalLang: 'fr', translation: 'Как выучить французский?', translationLang: 'ru', repetitions: [] }
                ]
            },
            {
                /*
                 * One greeting from each of a dozen languages, all of them
                 * answering into English — the first set here that is a lesson
                 * rather than a demonstration of progress or a test bench.
                 *
                 * Greetings because they are the one piece of vocabulary every
                 * language has and nobody needs a course to have a use for, and
                 * because a screenful of them says what this app is for faster
                 * than any set of nouns could.
                 *
                 * Every English side is different, and that is a rule rather
                 * than a coincidence: the quiz builds its wrong answers out of
                 * the other words in the same set, and two words translated
                 * "hello" would put the same line in front of the player twice
                 * with one of the two counted wrong. Greetings that mean
                 * genuinely different things — a time of day, a blessing, a
                 * question after your health — keep that from happening without
                 * bending a translation to avoid it.
                 */
                id: '4',
                title: 'GREETINGS',
                words: [
                    { original: '你好', originalLang: 'zh', translation: 'hello', translationLang: 'en', repetitions: [] },
                    { original: 'Καλημέρα', originalLang: 'el', translation: 'good morning', translationLang: 'en', repetitions: [] },
                    { original: 'こんばんは', originalLang: 'ja', translation: 'good evening', translationLang: 'en', repetitions: [] },
                    { original: 'Buenas noches', originalLang: 'es', translation: 'good night', translationLang: 'en', repetitions: [] },
                    { original: 'Guten Tag', originalLang: 'de', translation: 'good day', translationLang: 'en', repetitions: [] },
                    { original: 'Bienvenue', originalLang: 'fr', translation: 'welcome', translationLang: 'en', repetitions: [] },
                    // Said to anyone, at any hour, and answered with itself
                    { original: 'السلام عليكم', originalLang: 'ar', translation: 'peace be upon you', translationLang: 'en', repetitions: [] },
                    { original: 'שלום', originalLang: 'he', translation: 'peace', translationLang: 'en', repetitions: [] },
                    { original: 'नमस्ते', originalLang: 'hi', translation: 'greetings', translationLang: 'en', repetitions: [] },
                    // Literally "what news?", and used as the question it looks
                    // like: you are expected to answer it
                    { original: 'Habari gani', originalLang: 'sw', translation: 'how are you?', translationLang: 'en', repetitions: [] },
                    { original: '처음 뵙겠습니다', originalLang: 'ko', translation: 'nice to meet you', translationLang: 'en', repetitions: [] },
                    { original: 'Привет', originalLang: 'ru', translation: 'hi', translationLang: 'en', repetitions: [] }
                ]
            }
        ];
    };
}
seed();
