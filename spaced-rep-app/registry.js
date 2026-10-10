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
 *   - `soon` says the game is not written yet. There is no page to go to, so
 *     wherever it is drawn there is nothing to open: on the shelf a press on it
 *     opens the dialog, which is where the app says what is coming, and in the
 *     dialog it is not a press at all -- an outlined tile and a line of what the
 *     game will be for. It is the one word here that is temporary by nature: it
 *     comes off in the commit that adds the game's page. `speller` wore it until
 *     exactly that commit.
 *
 * `pitch` is the line that dialog prints beside the name. The shelf shows no
 * such line and has nowhere to put one -- under a tile there is room for a name
 * and nothing else -- so a game needs a pitch exactly when it can turn up in
 * the dialog. It lives here rather than in the catalog for the reason the rest
 * of this list does: the catalog knows no game of its own accord, and a
 * sentence about one kept over there would be a sentence about a game in a file
 * that has never heard of it.
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
 * One of them paints some of its strokes itself, and the rule above is what
 * makes that possible: the root sets currentColor and a child that names a
 * colour overrides it, so a drawing can take the button's ink for most of
 * itself and still have a part that is a particular colour because the thing it
 * draws is. See `search`, where the colours are the found words.
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

        // What it is good for, in the words somebody would use to recommend it
        // rather than to describe it: the mechanics are obvious from the name,
        // and the reason to open a snake game inside a vocabulary app is not.
        pitch: 'Turn boring screen time into quick vocab review',
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
    },
    {
        id: 'search',
        title: 'Word search',

        /*
         * Not written yet, and under the games that are: see `soon` and `away`
         * in the header. Both words, because the two halves of where it stands
         * are separate questions -- `away` says it is not on the shelf, `soon`
         * says there is nothing behind it yet.
         *
         * It is here rather than in the dialog's own code for the same reason
         * every other game is: the catalog knows no game by name, and a game
         * nobody has written is still a row of this list -- the row is what the
         * commit that writes it will edit.
         */
        away: true,
        soon: true,

        pitch: 'Mental repetition while searching for hidden words wires them straight into your memory',

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
         * colour, and a dot with no run through it takes the button's own ink at
         * less than half: found and not found, said by colour and by weight at
         * once. Which is also what keeps the drawing right in both themes -- the
         * colours are the words, and the paper is whatever the tile stands on.
         *
         * The tile under it stays an outline: see the dialog in catalog.js. A
         * game that is not written has no colour of its own, and these are not
         * it -- they are two struck-through words in a picture of a puzzle.
         */
        icon: (size) => gameIcon(size, `
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
            </g>`)
    }
];
