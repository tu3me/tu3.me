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
            }
        ];
    };
}
seed();
