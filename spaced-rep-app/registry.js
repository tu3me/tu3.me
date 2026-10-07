/*
 * The list of game mechanics. This is the only place edited when one is added
 * or removed — the catalog builds its tiles from here and knows no game of its
 * own accord.
 *
 * The list is not the row, though. Two words here say where the catalog puts a
 * game, and neither is a state the game is in:
 *
 *   - `away` keeps it off the shelf. The row has four places and the fourth is
 *     not a game, so the third game was the last one that fitted; a new one
 *     needed a place, and what moved is reached from the dialog behind that
 *     fourth tile instead. Nothing about the game itself changed — it is
 *     finished, it is played, and an unfinished round of it resumes.
 *   - `soon` is the other way round: on the shelf before it exists. The tile
 *     has no page to go to, so pressing it opens that same dialog, which is
 *     where the app says what is coming. Nothing wears it today; it is kept
 *     because the next game will arrive the same way this one did.
 *
 * Paths are relative to the app root, so they work from any page. The .html
 * suffix is not written here: nav adds it where it is required.
 *
 * Icons are drawn rather than borrowed from the emoji table. An emoji is
 * rendered by the platform, so the same button is a different picture on
 * Windows, Android and iOS, and it arrives with colours of its own that ignore
 * whatever the button is painted in. These are strokes in currentColor: they
 * take the button's own ink, they are the same drawing everywhere, and they
 * line up with the pencil and shuffle icons already in the catalog, which are
 * cut to the same 24-unit grid and the same 2-unit stroke.
 *
 * `icon` is a function of its size because a drawing is cut to the size it is
 * shown at: an SVG scaled by CSS from one fixed size lands its strokes between
 * pixels. The two places that ask for one — the shelf and the dialog — happen
 * to want the same 32 today, which is not a promise either makes the other.
 */
function gameIcon(size, body) {
    return `<svg class="game-icon" width="${size}" height="${size}" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true"
        style="flex: none; vertical-align: -0.18em;">${body}</svg>`;
}

const GAMES = [
    {
        id: 'cards',
        title: 'Flashcards',
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
        icon: (size) => gameIcon(size, `
            <g transform="rotate(-8 12 12)">
                <path d="M6 9.4V6.6a2 2 0 0 1 2-2h9.4" transform="rotate(16 10.5 6.4)" />
                <rect x="3" y="8.8" width="17.4" height="11" rx="2.6" />
            </g>`),
        color: '#ef6f5a',
        page: 'cards'
    },
    {
        id: 'quiz',
        title: 'Quiz',
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
        icon: (size) => gameIcon(size, `
            <path d="M2.6 8.2 L5.2 10.8 L9.4 5" />
            <path d="M12.6 8h8.4" />
            <path d="M3.2 13.2 L8.8 18.8" />
            <path d="M8.8 13.2 L3.2 18.8" />
            <path d="M12.6 16h8.4" />`),
        color: '#d9a520',
        page: 'quiz'
    },
    {
        id: 'speller',
        title: 'Speller',
        // The places a word keeps for its letters, filling left to right: two
        // in and one still to come, which is what the screen behind this tile
        // shows while it is being played — a word is put back one piece at a
        // time, in order.
        //
        // Slots are filled rather than outlined, and the empty one is the same
        // block at four tenths. Outlined, a block this size is a hairline frame
        // round a hole — the lesson the snake's own blocks are drawn from — and
        // three of those in a row read as a smudge with gaps in it.
        //
        // Three of them, not four. The gaps are what make them read as separate
        // places rather than as one bar, and at three there is room for gaps
        // wide enough to be seen at the size a tile draws this.
        icon: (size) => gameIcon(size, `
            <g fill="currentColor" stroke="none">
                <rect x="1.4" y="8.1" width="5.6" height="7.8" rx="1.4" />
                <rect x="9.2" y="8.1" width="5.6" height="7.8" rx="1.4" />
                <rect x="17" y="8.1" width="5.6" height="7.8" rx="1.4" fill-opacity="0.4" />
            </g>`),
        // A violet of its own rather than the mint the shelf had free. The mint
        // is the snake's, and a colour that moves to another game is a colour
        // that says the wrong name for as long as anybody remembers the first.
        color: '#9b72d4',
        page: 'speller'
    },
    {
        id: 'snake',
        title: 'Snake',
        // Off the shelf since Speller took the place it had. It is the same
        // game, played from the dialog behind the fourth tile — see `away` in
        // the header, and moreSoon in catalog.js.
        away: true,
        // The 8-bit snake: square segments on a grid with a pixel of food ahead
        // of the head. It climbs — three along the bottom, up the middle, then
        // out to the head — turning twice, with a run of three between turns.
        // A body that turns at every segment is a staircase at 15.4px, and a
        // staircase reads as nothing at all.
        //
        // Blocks are filled rather than outlined: outlining each segment turns
        // the body into a row of tiny boxes, and the whole point of the shape is
        // that it is solid.
        icon: (size) => gameIcon(size, `
            <g fill="currentColor" stroke="none">
                <rect x="1.2" y="18.1" width="4.7" height="4.7" rx="1.2" />
                <rect x="6.9" y="18.1" width="4.7" height="4.7" rx="1.2" />
                <rect x="12.6" y="18.1" width="4.7" height="4.7" rx="1.2" />
                <rect x="12.6" y="12.4" width="4.7" height="4.7" rx="1.2" />
                <rect x="12.6" y="6.7" width="4.7" height="4.7" rx="1.2" />
                <rect x="18.3" y="6.7" width="4.7" height="4.7" rx="1.2" />
                <rect x="19.4" y="1.7" width="2.6" height="2.6" rx="0.8" />
            </g>`),
        color: '#56c4a6',
        page: 'snake'
    }
];
