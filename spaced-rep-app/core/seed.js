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
                 * Spanish read by an English speaker, and the plainest ten
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
                 * Five of the ten are phrases rather than words: a set that is
                 * all single nouns teaches somebody to name things they cannot
                 * ask for, and the first screen should not promise that. Two
                 * of them were the bare nouns they are built on until
                 * 29 October 2026, "agua" and "pan": the owner wanted more in
                 * the first set for a game to be made of.
                 *
                 * Ten, because a session of snake is ten words at the most and
                 * deals a heart after every one but the last, and nine hearts
                 * are what fill its goblet -- see GOBLET_SHARE in snake.js.
                 * With eight the goblet could not be won on the first set
                 * there is; the last two were added for that on 29 October
                 * 2026, at the owner's word. A set already made keeps the
                 * eight it was made with: this is only ever read for a first
                 * run.
                 *
                 * In this order so that the ten bubbles lie in three rows on
                 * the card (the owner's call, 29 October 2026; in the order
                 * they were written they took four). Measured in the layout's
                 * pixels, a row of the card is 307 wide and the bubbles 47 to
                 * 126; the rows come to 252, 249 and 272. Each row also ends
                 * where the next bubble cannot fit by twenty pixels and more,
                 * because the bubbles are as wide as the font the device
                 * draws them in, and a narrower one moving a bubble up a row
                 * should not be what decides the count. The bubbles wrap in
                 * the order of the words, so what is moved here is the row.
                 *
                 * Nothing has been played. Every word starts on stage 0, which
                 * is where a word with no history belongs — the sets that used
                 * to be here carried invented repetitions to show the timeline
                 * off, and a demonstration of somebody else's progress is not
                 * what a first screen should be.
                 */
                /*
                 * A stand-in, and the id is what says so -- catalog.js knows it
                 * by this number and nothing else.
                 *
                 * It is there so that the app is never an empty screen: somebody
                 * who skipped the question, or whose languages the table has
                 * nothing for, still has something to press. The moment there is
                 * anything else to show, this stops being shown -- it is the
                 * answer to "nothing here yet", and that question is no longer
                 * being asked.
                 *
                 * There was a field here saying the same thing, and it was worse
                 * at it: a field is absent in every database written before it
                 * existed, and an absent mark made this set permanent.
                 */
                id: '1',
                title: 'Your first card set',

                originalLang: 'es',
                translationLang: 'en',
                words: [
                    { original: 'hola', translation: 'hello', repetitions: [] },
                    { original: 'pan con queso', translation: 'bread with cheese', repetitions: [] },
                    { original: 'mañana', translation: 'morning', repetitions: [] },
                    { original: 'cuánto cuesta', translation: 'how much', repetitions: [] },
                    { original: 'agua fría', translation: 'cold water', repetitions: [] },
                    { original: 'calle', translation: 'street', repetitions: [] },
                    { original: 'gracias', translation: 'thank you', repetitions: [] },
                    { original: 'por favor', translation: 'please', repetitions: [] },
                    { original: 'casa', translation: 'house', repetitions: [] },
                    { original: 'llave', translation: 'key', repetitions: [] }
                ]
            }
        ];
    };
}
seed();
