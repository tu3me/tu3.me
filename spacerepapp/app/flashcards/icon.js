/*
 * What the catalog shows of Flashcards: its name and its tile -- see
 * GAME_FACES in core/icons.js. Loaded by the catalog alone; the game's page
 * has no tile to draw.
 */
(() => {
    // Coral, and the logo in the catalog's header is the same coral -- see
    // `logo` in catalog.js, which writes it out rather than reading it here.
    const COLOR = '#ef6f5a';

    // One card in front, a second showing behind it — its top-left corner
    // sticking out, leaning the opposite way from the front card.
    //
    // Opposite is what makes it read. The back card is rotated clockwise
    // inside a pair that is rotated anticlockwise as a whole, so the two
    // edges cross at a visible angle; set at the same lean they run parallel
    // and merge into one thick card.
    //
    // Only the sliver that would actually be visible is drawn. Two full
    // outlines cannot stack in a line icon: the back one shows straight
    // through the front and the pair reads as a single crumpled shape.
    const DRAWING = `
        <g transform="rotate(-8 12 12)">
            <path d="M6 9.4V6.6a2 2 0 0 1 2-2h9.4" transform="rotate(16 10.5 6.4)" />
            <rect x="3" y="8.8" width="17.4" height="11" rx="2.6" />
        </g>`;

    GAME_FACES.flashcards = {
        title: 'Flashcards',

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
