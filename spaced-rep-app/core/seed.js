/**
 * The set a first-time player starts with. Used only when storage holds
 * nothing yet, so this file never touches saved data.
 *
 * A function rather than a constant because what it returns goes straight to
 * the store, which writes into it — repetitions as they are played. One shared
 * array would hand the second caller the first caller's edits.
 *
 * Both languages are written on the set rather than left to be guessed. What is
 * in here is known, and a starting set has no business depending on a detector
 * being right about it.
 */
function seed() {
    seed.sets = () => {
        return [
            {
                /*
                 * Spanish read by an English speaker, and the plainest eight
                 * words that pair can have.
                 *
                 * It used to be one set in eight languages — a line of Greek, a
                 * line of Korean, a line of Hindi — chosen so that every line
                 * meant something to a reader who knew none of them. That was a
                 * demonstration of what the app could hold, and it stopped being
                 * possible when a set became a thing with one language on each
                 * side. It is no loss: a shelf of ready-made sets now says the
                 * same thing better, in whichever pair the reader actually
                 * wants.
                 *
                 * Spanish because it is the language most often started, and
                 * because the accents and the ñ make it visibly another language
                 * at a glance, which a first screen has to do in no time at all.
                 *
                 * Two of the eight are phrases rather than words: a set that is
                 * all single nouns teaches somebody to name things they cannot
                 * ask for, and the first screen should not promise that.
                 *
                 * Nothing has been played. Every word starts on stage 0, which
                 * is where a word with no history belongs — the sets that used
                 * to be here carried invented repetitions to show the timeline
                 * off, and a demonstration of somebody else's progress is not
                 * what a first screen should be.
                 */
                id: '1',
                title: 'Just a test card set',
                originalLang: 'es',
                translationLang: 'en',
                words: [
                    { original: 'hola', translation: 'hello', repetitions: [] },
                    { original: 'gracias', translation: 'thank you', repetitions: [] },
                    { original: 'agua', translation: 'water', repetitions: [] },
                    { original: 'pan', translation: 'bread', repetitions: [] },
                    { original: 'calle', translation: 'street', repetitions: [] },
                    { original: 'llave', translation: 'key', repetitions: [] },
                    { original: 'mañana', translation: 'morning', repetitions: [] },
                    { original: 'cuánto cuesta', translation: 'how much', repetitions: [] }
                ]
            }
        ];
    };
}
seed();
