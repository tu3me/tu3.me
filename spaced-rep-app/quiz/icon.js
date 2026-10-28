/*
 * What the catalog shows of Quiz: its name and its tile -- see GAME_FACES in
 * core/icons.js. Loaded by the catalog alone; the game's page has no tile to
 * draw.
 */
(() => {
    const COLOR = '#d9a520';

    // One option marked right and one marked wrong — the two things this
    // game does to what you pick. A question mark in a circle came before
    // it and was read as the universal help button; three bullets with the
    // middle one filled came after and said "a list with one of them
    // chosen", leaving what the choice is for to the imagination.
    //
    // The marks are the ones the game itself writes on the options when the
    // answer lands, so the button and the screen behind it agree.
    //
    // Two rows and not the three the bullets had. A bullet is a circle and
    // a circle survives being small; a tick and a cross are several strokes
    // crossing inside the same few units, and at the 20 of the "Continue"
    // banner three of them stacked come out as three smudges. Two rows give
    // each mark the room of a row and a half, which is what makes them
    // readable at all — and two options are already a choice.
    const DRAWING = `
        <path d="M2.6 8.2 L5.2 10.8 L9.4 5" />
        <path d="M12.6 8h8.4" />
        <path d="M3.2 13.2 L8.8 18.8" />
        <path d="M8.8 13.2 L3.2 18.8" />
        <path d="M12.6 16h8.4" />`;

    GAME_FACES.quiz = {
        title: 'Quiz',

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
