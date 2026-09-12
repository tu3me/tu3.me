/*
 * The list of game mechanics. This is the only place edited when one is added
 * or removed — the catalog builds its buttons and its "Continue" banner from
 * here, and knows nothing else about any game.
 *
 * Paths are relative to the app root, so they work from any page. The .html
 * suffix is not written here: nav adds it where it is required.
 *
 * `unlockAtStage` is the lowest stage every word in a set must have reached
 * before the game opens on it: cards from the start, quiz once nothing is left
 * on stage 0, snake once nothing is left on stage 1. It lives here because it
 * describes the game, and because adding a game should mean adding one entry,
 * not editing the catalog as well.
 *
 * Icons are drawn rather than borrowed from the emoji table. An emoji is
 * rendered by the platform, so the same button is a different picture on
 * Windows, Android and iOS, and it arrives with colours of its own that ignore
 * whatever the button is painted in. These are strokes in currentColor: they
 * take the button's own ink, they are the same drawing everywhere, and they
 * line up with the pencil and shuffle icons already in the catalog, which are
 * cut to the same 24-unit grid and the same 2-unit stroke.
 *
 * `icon` is a function of its size because it is asked for at two sizes — on a
 * game button and in the "Continue" banner — and an SVG scaled by CSS from one
 * fixed size lands its strokes between pixels.
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
        unlockAtStage: 0,      // open from the start
        title: 'Cards',
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
        unlockAtStage: 1,      // once no word is left on stage 0
        title: 'Quiz',
        // Three options with the middle one chosen. A question mark in a circle
        // is the universal help button and was read as one; this says what the
        // game actually does — it offers answers and you pick one.
        icon: (size) => gameIcon(size, `
            <circle cx="5" cy="5.5" r="2.2" />
            <path d="M10 5.5h9" />
            <circle cx="5" cy="12" r="2.2" fill="currentColor" stroke="none" />
            <path d="M10 12h9" />
            <circle cx="5" cy="18.5" r="2.2" />
            <path d="M10 18.5h9" />`),
        color: '#d9a520',
        page: 'quiz'
    },
    {
        id: 'snake',
        unlockAtStage: 2,      // once no word is left on stage 1
        title: 'Snake',
        // The 8-bit snake: square segments on a grid with a pixel of food ahead
        // of the head. It climbs — three along the bottom, up the middle, then
        // out to the head — turning twice, with a run of three between turns.
        // A body that turns at every segment is a staircase at 18px, and a
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
