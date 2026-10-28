/*
 * What the catalog shows of Wordcraft: its name and its tile -- see
 * GAME_FACES in core/icons.js. Loaded by the catalog alone; the game's page
 * has no tile to draw.
 */
(() => {
    // A violet of its own rather than the mint the shelf had free. The mint
    // was the snake's, and a colour that moves to another game is a colour
    // that says the wrong name for as long as anybody remembers the first.
    const COLOR = '#9b72d4';

    // The places a word keeps for its letters, filling left to right: two
    // in and one still to come, which is what the screen behind this tile
    // shows while it is being played — a word is put back one piece at a
    // time, in order.
    //
    // Slots are filled rather than outlined, and the empty one is the same
    // block at four tenths. Outlined, a block this size is a hairline frame
    // round a hole — the lesson the snake's own blocks were drawn from — and
    // three of those in a row read as a smudge with gaps in it.
    //
    // Three of them, not four. The gaps are what make them read as separate
    // places rather than as one bar, and at three there is room for gaps
    // wide enough to be seen at the size a tile draws this.
    const DRAWING = `
        <g fill="currentColor" stroke="none">
            <rect x="1.4" y="8.1" width="5.6" height="7.8" rx="1.4" />
            <rect x="9.2" y="8.1" width="5.6" height="7.8" rx="1.4" />
            <rect x="17" y="8.1" width="5.6" height="7.8" rx="1.4" fill-opacity="0.4" />
        </g>`;

    GAME_FACES.wordcraft = {
        title: 'Wordcraft',

        // The colour, rounded as the catalog says, with the drawing in white
        // in the middle; the same whatever the set has won, since this game
        // keeps no achievements.
        show: (el, tile) => {
            el.innerHTML = `<span style="display: grid; place-items: center; width: ${tile.size}px; height: ${tile.size}px; background: ${COLOR}; color: #ffffff; border-radius: ${tile.radius}px;">
                <svg width="${tile.icon}" height="${tile.icon}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display: block;">${DRAWING}</svg>
            </span>`;

            return Promise.resolve();
        }
    };
})();
