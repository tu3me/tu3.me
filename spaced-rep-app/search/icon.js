/*
 * What the catalog shows of Word search, which is not written yet: its name,
 * its tile, and the two words that say where it stands -- see GAME_FACES in
 * core/icons.js. The folder holds nothing else until the game is written; the
 * file is here because the id is how the catalog finds a game's face, a game
 * nobody has written included.
 */
(() => {
    /*
     * The puzzle itself: a grid of letters with the found words struck
     * through in colour.
     *
     * A magnifier over two lines of type stood here first, which is a
     * picture of searching rather than of this game -- every app has that
     * lens somewhere, and it says "find" without saying what is being found
     * or how. What anybody who has played one of these recognises instantly
     * is the grid with the coloured runs on it, so that is what is drawn.
     *
     * Three by three, because the whole of it has to live in nineteen
     * units. A letter cannot be written at that size -- the real grid's
     * letters are the one thing certain to come out as smudges -- so each
     * place is a dot, which is a letter's footprint and reads as one in a
     * grid of its fellows. Dots and not rings: a ring at this size is a
     * hairline round a hole, nine of them are nine smudges, and the picture
     * is nine places and three runs, which a dot says with one shape.
     *
     * The runs are the only colour, and they are a full one. Three of them,
     * not the half-dozen a real grid carries: at this size the picture is
     * read by its shape, and two rows with a diagonal across them say
     * "found words" as plainly as six would, while leaving two dots bare to
     * say there is a grid under it. Three is also what makes it a picture
     * rather than a pattern -- with two the drawing sat in one corner and
     * the other was empty.
     *
     * The diagonal goes on last, over both rows, the way the later pen does
     * on paper.
     *
     * A dot on a run is white, like every other drawing this app puts on a
     * colour, and a dot with no run through it takes the tile's own ink at
     * less than half: found and not found, said by colour and by weight at
     * once. Which is also what keeps the drawing right in both themes -- the
     * colours are the words, and the paper is whatever the tile stands on.
     */
    const DRAWING = `
        <g stroke-width="6.4" stroke-linecap="round">
            <path d="M5 5h14" stroke="#1e9bff" />
            <path d="M5 19h14" stroke="#35d16b" />
            <path d="M5 19 19 5" stroke="#c62ff7" />
        </g>
        <g stroke="none">
            <g fill="#ffffff">
                <circle cx="5" cy="5" r="2.2" />
                <circle cx="12" cy="5" r="2.2" />
                <circle cx="19" cy="5" r="2.2" />
                <circle cx="12" cy="12" r="2.2" />
                <circle cx="5" cy="19" r="2.2" />
                <circle cx="12" cy="19" r="2.2" />
                <circle cx="19" cy="19" r="2.2" />
            </g>
            <g fill="currentColor" opacity="0.4">
                <circle cx="5" cy="12" r="2.2" />
                <circle cx="19" cy="12" r="2.2" />
            </g>
        </g>`;

    GAME_FACES.search = {
        title: 'Word search',

        /*
         * Not written yet, and under the games that are: see `soon` and `away`
         * in core/icons.js. Both words, because the two halves of where it
         * stands are separate questions -- `away` says it is not on the shelf,
         * `soon` says there is nothing behind it yet.
         */
        away: true,
        soon: true,

        /*
         * An outline in whatever ink it is drawn in, and no colour. A game that
         * is not written has no colour of its own; the ink is the dialog's
         * muted one, which the catalog sets on the element (see `coming` in
         * catalog.js). The colours in the drawing are not the game's either --
         * they are two struck-through words in a picture of a puzzle.
         */
        show: (el, tile) => {
            el.innerHTML = `<span style="display: grid; place-items: center; box-sizing: border-box; width: ${tile.size}px; height: ${tile.size}px; border: 2px solid currentColor; border-radius: ${tile.radius}px;">
                <svg width="${tile.icon}" height="${tile.icon}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display: block;">${DRAWING}</svg>
            </span>`;

            return Promise.resolve();
        }
    };
})();
