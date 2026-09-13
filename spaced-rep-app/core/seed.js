/**
 * The sets a first-time player starts with. Used only when storage holds
 * nothing yet, so this file never touches saved data.
 *
 * Timestamps are relative to load time, which is why this is a function and
 * not a constant: the sample progress has to look alive whenever it is built.
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
                    { original: 'go away', translation: 'уходи', repetitions: [] },
                    { original: 'know', translation: 'знать', repetitions: [] },
                    { original: 'think', translation: 'думать', repetitions: [] },
                    { original: 'take', translation: 'брать', repetitions: [] },
                    { original: 'see', translation: 'видеть', repetitions: [] },
                    { original: 'come', translation: 'приходить', repetitions: [] },
                    { original: 'want', translation: 'хотеть', repetitions: [] }
                ]
            },
            {
                id: '2',
                title: 'TRAVEL ESSENTIALS',
                words: [
                    // FAIL OK OK MISSED MISSED LATE_OK EARLY_OK — stage 6
                    { original: 'airport', translation: 'аэропорт', repetitions: reps(160, [[0, 0], [4, 1], [6, 1], [110, 1], [30, 1]]) },
                    // OK OK OK EARLY_FAIL OK — stage 2
                    { original: 'ticket', translation: 'билет', repetitions: reps(31, [[0, 1], [6, 1], [12, 1], [5, 0], [5, 1]], 'quiz') },
                    // FAIL MISSED LATE_FAIL OK — stage 2
                    { original: 'hotel', translation: 'отель', repetitions: reps(16, [[0, 0], [10, 0], [4, 1]], 'snake') },
                    { original: 'luggage', translation: 'багаж', repetitions: [] },
                    { original: 'passport', translation: 'паспорт', repetitions: reps(1, [[0, 1]]) },
                    { original: 'customs', translation: 'таможня', repetitions: [] },
                    { original: 'flight', translation: 'рейс', repetitions: [] }
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
                    { original: '怎么学中文？', translation: 'Как выучить китайский?', repetitions: [] },
                    // Kana and kanji mixed
                    { original: '日本語はどう勉強しますか？', translation: 'Как выучить японский?', repetitions: [] },
                    // Hangul: precomposed syllables, one code point per block
                    { original: '한국어를 어떻게 배우나요?', translation: 'Как выучить корейский?', repetitions: [] },
                    // Devanagari: conjuncts and vowel signs belong to the
                    // consonant they hang off
                    { original: 'हिंदी कैसे सीखें?', translation: 'Как выучить хинди?', repetitions: [] },
                    // Danda ends a statement in Hindi where a full stop would
                    // end an English one — the only line here that is not a
                    // question, and the only place that mark appears
                    { original: 'मैं हिंदी सीखता हूँ।', translation: 'Я учу хинди.', repetitions: [] },
                    // Thai: vowels and tone marks sit above and below their
                    // consonant, and the language writes no question mark — the
                    // spaces do the work
                    { original: 'เรียนภาษาไทยอย่างไร', translation: 'Как выучить тайский?', repetitions: [] },
                    // Arabic, right to left, with its own mirrored question mark
                    { original: 'كيف أتعلم العربية؟', translation: 'Как выучить арабский?', repetitions: [] },
                    // Hebrew, right to left; the niqqud are separate code points
                    // that belong to the letter before them
                    { original: 'איך לומדים עִבְרִית?', translation: 'Как выучить иврит?', repetitions: [] },
                    // Greek asks with a semicolon
                    { original: 'Πώς να μάθω ελληνικά;', translation: 'Как выучить греческий?', repetitions: [] },
                    // Spanish opens the question as well as closing it
                    { original: '¿Cómo aprender español?', translation: 'Как выучить испанский?', repetitions: [] },
                    // French puts a narrow no-break space before its question
                    // mark — a letter that is blank but is not the space bar —
                    // and this ç is written decomposed, c followed by a
                    // combining cedilla, which the old split tore in two
                    { original: 'Comment apprendre le franc\u0327ais\u202f?', translation: 'Как выучить французский?', repetitions: [] }
                ]
            }
        ];
    };
}
seed();
