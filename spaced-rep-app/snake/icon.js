/*
 * What the catalog shows of Snake: its name and its tile, and the tile is an
 * emblem of what was achieved in the set -- see GAME_FACES in core/icons.js.
 *
 * Drawn from the owner's drafts, icon drafts/snake-icons/final.html, and
 * numbered as they are there:
 *
 *   61  the snake on a blue tile: nothing achieved yet.
 *   62  a record for length -- a ribbon across the tile, and on it, like a
 *       buckle on a belt, the record's medal. The tile stays the square it
 *       is (the owner's call, 2 November 2026); in the drafts and until then
 *       it became a shield.
 *   63  the crown, the star or the goblet the first time it is won: a dark
 *       silhouette with a gold edge, in its place round the tile.
 *   64, 65  the second and the third time: gold to 30 and to 60 per cent.
 *       The fourth fills it -- four wins to a whole one, the owner's count.
 *   66  a record, and the star and the goblet whole: sparks -- and, here
 *       and not in the drafts, a light that runs across the gold. The crown
 *       is a prize over and above, and is not asked for -- see GOALS.
 *
 * And from 62 on, a rim round the tile that runs as far round it as the
 * set has come to 66, and closes there (snake-wavy-rim/95 in the drafts) --
 * see RIM_GAP.
 *
 * Each prize counts its own wins and is drawn by its own count, so a crown won
 * once stands as a silhouette beside a star won four times -- and a prize
 * never won is not drawn at all, not even as the tile grows. The counts are
 * the entries in the set's log
 * (store.achieve writes one per win), and the record is the largest
 * `maxLength` in it; nothing here is saved, so moving a threshold changes
 * every tile and touches no data.
 *
 * Every length below is in the drafts' units, in which the tile is the square
 * from 30 to 370. The catalog's tile is that square, and the rest -- the
 * crown above it, the star and the goblet at its sides, the ribbon's tails --
 * stands out round it the way it stands out in the drafts: see VIEW.
 *
 * Out, but not into the neighbours' room and not onto the name under the
 * tile -- the owner's call, 28 October 2026, after the drafts were first put
 * on a row. Two tiles of a row stand 85 units apart at any width of the popup
 * (12.5 of 50 pixels at the narrowest), so each side's share is 42: the star
 * was moved 17 to the right, and the goblet lost its handles, which reached
 * to 438. Everything stays within 36 of the tile's sides now. And the name
 * starts 34 under the tile, at 404, where the drafts' ribbon hung to 444: the
 * ribbon was raised 18, its tails cut shorter and level, and the shield's point
 * and the rim round it lifted, so that nothing goes below 400. The shield has
 * gone since, and the rim keeps to 400 by its gap -- see RIM_GAP.
 *
 * Until 28 October 2026 the face was a ring of a second snake round the tile,
 * as long as the record, closing into an ouroboros at fifty (snake/crest.js).
 * It said one thing, and there are four now.
 */
(() => {
    const BLUE = '#4a90d9';
    const NAVY = '#16323f';    // a silhouette's body
    const EDGE = '#c98414';    // the gold edge on everything gold
    /*
     * The amber of the rim round the tile (see RIM_GAP), of the crown's
     * jewels and of the sparks, the same on both themes: the tile is one
     * picture whatever the theme -- the owner's call, 30 October 2026. It is
     * bright and holds on the white card as well as on the navy one: 2.6
     * against the white and 4.2 against the dark card.
     *
     * The same day the rim was the prizes' gold on the dark theme and this
     * amber on the light one, and until then #b8780f on both, the drafts'
     * colour, a brown rather than a gold beside the prizes. The jewels and
     * the sparks were a light gold on the dark theme and a deep amber on
     * the light one, as in drafts 66 and 72.
     */
    const AMBER = '#dc920e';

    // The gold the drafts fill with, and the gold of the medal at the end of
    // a game is a sibling of it rather than the same -- see goldStops in
    // snake.js, which is drawn for a larger badge.
    const GOLD_STOPS = [[0, '#ffe680'], [0.55, '#f6c232'], [1, '#d9921a']];

    // The square the tile is, and the box everything is drawn in round it:
    // from the sparks over the crown to the tails of the ribbon, and from the
    // star's points to the goblet's rim. Larger than what is drawn in it, and
    // nothing in it takes a press -- see pointer-events in face.
    const TILE_AT = 30;
    const TILE_SIDE = 340;
    const VIEW = { x: -50, y: -50, width: 500, height: 510 };

    // The tile: a square with its corners rounded, the same whatever has
    // been won -- see the header
    const TILE_ROUND = 113;
    const TILE_FACE = `x="${TILE_AT}" y="${TILE_AT}" width="${TILE_SIDE}" height="${TILE_SIDE}" rx="${TILE_ROUND}"`;
    const SQUARE = `<rect ${TILE_FACE} fill="${BLUE}" />`;

    /*
     * The rim: how far the set has come to the finished emblem, from its
     * first record -- the owner's call, 30 October 2026, from the drafts'
     * icon drafts/snake-wavy-rim, variant 95. A thin line round the tile,
     * the track, and over it a wavy band, drawn clockwise from the middle of
     * the top as far as the set has come (see progressOf) and closed all the
     * way round when it has come all the way. Both under the tile, which
     * hides the inside of the band: what shows is a lace edge, off the tile
     * where the wave goes out and tucked under it where it comes in.
     *
     * The drafts' numbers: the band 20 wide, its wave about 40 long and 6.8
     * in and out of the track, the track 3 wide, both in AMBER.
     *
     * The track runs RIM_GAP off the tile all the way round, its foot as
     * much as its top: the band reaches 16.8 out of its track -- half its
     * width and the wave -- nothing may go under 400 (the name starts at
     * 404, see the header), and the tile's foot is at 370, so 13 is as far
     * as it can stand, its band down to 399.8. Until 2 November 2026 it ran
     * round the shield the tile then became, 14 off it, and closed on the
     * shield's point, where the room under it was too little to keep it off
     * -- the owner asked for the tile square again and the rim not to cling
     * to it at the foot.
     *
     * Until 30 October 2026 the rim came only with the emblem finished: a line
     * seven wide round the shield, and for a day a ring twice that.
     */
    const RIM_GAP = 13;
    const RIM_BAND = 20;
    const RIM_WAVE = 40;
    const RIM_SWELL = 6.8;
    const RIM_TRACK = 3;

    // The track's own lines and corners: its edges, and the middles of the
    // tile's corners, which its corners are drawn round
    const RIM_IN = TILE_AT - RIM_GAP;
    const RIM_OUT = TILE_AT + TILE_SIDE + RIM_GAP;
    const RIM_CORNER = TILE_ROUND + RIM_GAP;
    const NEAR = TILE_AT + TILE_ROUND;
    const FAR = TILE_AT + TILE_SIDE - TILE_ROUND;

    // The track, clockwise from the middle of the top, as pieces: a point on
    // each at t from 0 to 1
    const RIM_PIECES = (() => {
        const line = (a, b) => (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        const arc = (cx, cy, r, from, to) => (t) => {
            const angle = (from + (to - from) * t) * Math.PI / 180;
            return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
        };

        return [
            line([200, RIM_IN], [FAR, RIM_IN]), arc(FAR, NEAR, RIM_CORNER, -90, 0),
            line([RIM_OUT, NEAR], [RIM_OUT, FAR]), arc(FAR, FAR, RIM_CORNER, 0, 90),
            line([FAR, RIM_OUT], [NEAR, RIM_OUT]), arc(NEAR, FAR, RIM_CORNER, 90, 180),
            line([RIM_IN, FAR], [RIM_IN, NEAR]), arc(NEAR, NEAR, RIM_CORNER, 180, 270),
            line([NEAR, RIM_IN], [200, RIM_IN])
        ];
    })();

    const RIM_TRACK_PATH = `M200 ${RIM_IN} H${FAR} A${RIM_CORNER} ${RIM_CORNER} 0 0 1 ${RIM_OUT} ${NEAR} V${FAR} A${RIM_CORNER} ${RIM_CORNER} 0 0 1 ${FAR} ${RIM_OUT}`
        + ` H${NEAR} A${RIM_CORNER} ${RIM_CORNER} 0 0 1 ${RIM_IN} ${FAR} V${NEAR} A${RIM_CORNER} ${RIM_CORNER} 0 0 1 ${NEAR} ${RIM_IN} Z`;

    /*
     * The band: the track walked by length and pushed in and out along its
     * normal by a sine whose period divides the length, so the wave closes
     * on itself with no seam; then drawn in cubic curves, one to a quarter
     * of a wave, their ends and slopes taken from the wave itself. Worked
     * out here, once, the way the drafts' gen.js does it, so that the wave
     * stays three numbers to change rather than a path to draw again.
     */
    const RIM_BAND_PATH = (() => {
        const points = [];
        let length = 0;

        RIM_PIECES.forEach(piece => {
            for (let i = 0; i <= 200; i++) {
                const p = piece(i / 200);
                const last = points[points.length - 1];
                if (last) length += Math.hypot(p[0] - last.p[0], p[1] - last.p[1]);
                points.push({ p, s: length });
            }
        });

        const along = (s) => {
            const at = ((s % length) + length) % length;
            let low = 0;
            let high = points.length - 1;

            while (high - low > 1) {
                const mid = (low + high) >> 1;
                if (points[mid].s <= at) low = mid;
                else high = mid;
            }

            const u = (at - points[low].s) / ((points[high].s - points[low].s) || 1);
            return [0, 1].map(i => points[low].p[i] + (points[high].p[i] - points[low].p[i]) * u);
        };

        const waves = Math.round(length / RIM_WAVE);

        const pushed = (s) => {
            const p = along(s);
            const a = along(s - 0.5);
            const b = along(s + 0.5);
            const n = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
            const by = RIM_SWELL * Math.sin(2 * Math.PI * waves * s / length);

            return [p[0] - (b[1] - a[1]) / n * by, p[1] + (b[0] - a[0]) / n * by];
        };

        const count = 4 * waves;
        const step = length / count;
        const node = (k) => {
            const s = k * step;
            const a = pushed(s - 0.5);
            const b = pushed(s + 0.5);
            return { p: pushed(s), t: [(b[0] - a[0]) * step / 3, (b[1] - a[1]) * step / 3] };
        };

        const xy = (x, y) => `${+x.toFixed(1)} ${+y.toFixed(1)}`;

        let from = node(0);
        let d = `M${xy(...from.p)}`;

        for (let k = 1; k <= count; k++) {
            const to = node(k % count);
            d += `C${xy(from.p[0] + from.t[0], from.p[1] + from.t[1])} ${xy(to.p[0] - to.t[0], to.p[1] - to.t[1])} ${xy(...to.p)}`;
            from = to;
        }

        return d + 'Z';
    })();

    // The snake, white with its eyes cut out of it in the tile's own blue, and
    // a white glint in each, up and to the right -- the owner's drafts, where
    // they came in on 28 October 2026.
    const SNAKE = `<g transform="matrix(1.4 0 0 1.4 -89 -345.2)">
        <path d="M137.17 489.59C137.38 485.68 141.01 482.26 141.03 477.67C141.07 468.74 134.95 461.53 134.12 452.67C133.2 442.86 137.51 432.75 145.17 426.69C191.95 389.66 199.67 487.31 229.74 459.67C239.63 450.58 235.34 437.01 226.5 429.21C188.26 395.49 160.35 412.87 160.35 344.33C160.35 330.58 155.94 307.77 172.83 302.05C188.09 296.88 248.13 296 251.88 316C254.49 329.92 256.11 354.71 243.5 363.67C235.06 369.66 199.52 360.17 201.5 375.81C203.07 388.18 308.14 423.8 249.5 479.53C242.36 486.31 232.01 489.56 222.33 490.13C177.72 492.78 179.06 435.44 157.93 442C143.08 446.61 161.76 495.45 137.17 489.59Z" fill="#ffffff" stroke="#ffffff" stroke-width=".5" stroke-linejoin="round" />
        <g fill="${BLUE}"><circle cx="192.4" cy="331.7" r="17.5" /><circle cx="228.8" cy="332.4" r="9.1" /></g>
        <g fill="#ffffff"><circle cx="197.9" cy="330.2" r="6.5" /><circle cx="231.2" cy="331.8" r="3.2" /></g>
    </g>`;

    // The ribbon's tails, behind it, and their folds. The drafts' tails hung
    // 60 under the ribbon's ends and spread as they went; these end level
    // with the folds, 10 under the ends -- see the header. Shorter, and up
    // with the ends, since the ribbon went narrow -- see BANNER.
    const TAILS = `<g fill="#d9921a" stroke="#8a560a" stroke-width="3" stroke-linejoin="round">
            <polygon points="75.4,314 14.7,326 31,344 14.7,362 78.6,362" />
            <polygon points="324.6,314 385.3,326 369,344 385.3,362 321.4,362" />
        </g>
        <g fill="#7a4a07">
            <polygon points="60.6,340 81.9,350 81.9,362 60.6,352" />
            <polygon points="339.4,340 318.1,350 318.1,362 339.4,352" />
        </g>`;

    /*
     * The ribbon itself: a band 50 across, curved as the drafts' was, and
     * running through the middle of the medal like a belt through its
     * buckle -- the owner's call, 2 November 2026. It was twice as wide
     * until then, from the medal's top to below its middle.
     */
    const BANNER = 'M60.6 302 Q200 238 339.4 302 L339.4 352 Q200 288 60.6 352 Z';

    /*
     * The record's medal on the ribbon: the medal the game has in its header,
     * a square of the gold with its corners rounded (the same corners for its
     * size), and the record on it with MAX under it, as it says it there --
     * the owner's call, 2 November 2026. Until then the record was written
     * along the ribbon, and for part of that day the ribbon was the foot of
     * the shield with MAX under the record, which did not sit well.
     *
     * Its middle on the ribbon's (see BANNER), and its foot 10 short of the
     * tile's, so that the rim under the tile is left clear of it. While the
     * tile was a shield it went down to the point and covered the rim there
     * for an hour of 2 November 2026, and then stood 18 short of the point.
     */
    const MEDAL = { x: 135, y: 230, size: 130, round: 36.7 };
    const MEDAL_FACE = `x="${MEDAL.x}" y="${MEDAL.y}" width="${MEDAL.size}" height="${MEDAL.size}" rx="${MEDAL.round}"`;

    /*
     * The three prizes, each in its place round the tile: the crown on top,
     * the star leaning out on the left, the goblet on the right.
     *
     * `frame` puts the prize in its place, and everything else is drawn in
     * the prize's own units inside it. `silhouette` is what a first win
     * draws; `mask` is the shape the gold rises inside; `box` is what the gold
     * fills, from the bottom of the shape with its edge to the top, so that a
     * share of it is a share of the prize as seen; `over` puts the edge back
     * over the gold where the gold covers it; `whole` is the prize won four
     * times, gold through, with a thinner edge and -- on the crown -- jewels.
     */
    const CROWN = `<path d="M-62 0 L-72 -58 L-34 -30 L0 -76 L34 -30 L72 -58 L62 0 Z" /><rect x="-64" y="0" width="128" height="16" rx="6" />`;
    /*
     * A star's ten corners, points and hollows in turn from a point, drawn
     * with the corners turned: each cut back along both its edges and
     * turned with a curve, the points by a third of the star's reach and the
     * hollows by less -- the round corners every star in the app has, the
     * owner's call, 3 November 2026; the game's own is drawn the same way
     * (see STAR_PATH in snake.js). The drafts' stars, here as everywhere
     * else, had sharp ones until then.
     */
    function rounded(points) {
        const corners = points.split(' ').map(pair => pair.split(',').map(Number));
        const cx = corners.reduce((sum, c) => sum + c[0], 0) / corners.length;
        const cy = corners.reduce((sum, c) => sum + c[1], 0) / corners.length;
        const reach = Math.hypot(corners[0][0] - cx, corners[0][1] - cy);

        const toward = (from, to, by) => {
            const dx = to[0] - from[0];
            const dy = to[1] - from[1];
            const length = Math.hypot(dx, dy);
            return [from[0] + dx / length * by, from[1] + dy / length * by];
        };

        const n = corners.length;
        const xy = (p) => p.map(c => +c.toFixed(2)).join(' ');
        const turns = corners.map((corner, i) => {
            const by = reach * (i % 2 ? 0.15 : 0.33);
            return { from: toward(corner, corners[(i + n - 1) % n], by), corner, to: toward(corner, corners[(i + 1) % n], by) };
        });

        return 'M' + xy(turns[0].from)
            + turns.map((t, i) => (i ? 'L' + xy(t.from) : '') + 'Q' + xy(t.corner) + ' ' + xy(t.to)).join('')
            + 'Z';
    }

    const STAR = rounded('44,126 62.1,165.1 104.9,170.2 73.2,199.5 81.6,241.8 44,220.7 6.4,241.8 14.8,199.5 -16.9,170.2 25.9,165.1');
    const CUP = `<path d="M-27 -32 H27 V-2 C27 20 11 30 0 30 C-11 30 -27 20 -27 -2 Z" /><rect x="-6" y="30" width="12" height="18" /><rect x="-24" y="46" width="48" height="12" rx="5" />`;
    const GOBLET_AT = 'translate(350 170) scale(1.4)';

    const PRIZES = [
        {
            name: 'crown',
            frame: 'translate(200 52)',
            silhouette: `<g fill="${NAVY}" stroke="${EDGE}" stroke-width="12" stroke-linejoin="round">${CROWN}</g><g fill="${NAVY}">${CROWN}</g>`,
            mask: `<g fill="#ffffff">${CROWN}</g>`,
            box: { x: -100, y: -82, width: 200, height: 102 },
            over: '',
            whole: (gold) => `<g stroke="${EDGE}" stroke-width="3.5" stroke-linejoin="round">
                <path d="M-62 0 L-72 -58 L-34 -30 L0 -76 L34 -30 L72 -58 L62 0 Z" fill="${gold}" />
                <rect x="-64" y="0" width="128" height="16" rx="6" fill="#e3a21c" />
                <g fill="${AMBER}" stroke="none"><circle cx="-72" cy="-62" r="7" /><circle cx="0" cy="-82" r="7" /><circle cx="72" cy="-62" r="7" /></g>
            </g>`
        },
        {
            name: 'star',
            frame: 'translate(17 0) rotate(-16 44 190)',
            silhouette: `<path d="${STAR}" fill="${NAVY}" stroke="${EDGE}" stroke-width="6" stroke-linejoin="round" />`,
            mask: `<path d="${STAR}" fill="#ffffff" stroke="#ffffff" stroke-width="5.8" stroke-linejoin="round" />`,
            box: { x: -40, y: 123, width: 170, height: 122.8 },
            over: `<path d="${STAR}" fill="none" stroke="${EDGE}" stroke-width="6" stroke-linejoin="round" />`,
            whole: (gold) => `<path d="${STAR}" fill="${gold}" stroke="${EDGE}" stroke-width="5.8" stroke-linejoin="round" />`
        },
        {
            name: 'goblet',
            frame: 'rotate(14 350 170)',
            silhouette: `<g transform="${GOBLET_AT}">
                <g fill="${NAVY}" stroke="${EDGE}" stroke-width="12" stroke-linejoin="round">${CUP}</g>
                <g fill="${NAVY}">${CUP}</g>
            </g>`,
            mask: `<g transform="${GOBLET_AT}"><g fill="#ffffff">${CUP}</g></g>`,
            box: { x: 266, y: 122.2, width: 170, height: 133 },
            over: '',
            whole: (gold) => `<g transform="${GOBLET_AT}" stroke="${EDGE}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">
                <path d="M-27 -32 H27 V-2 C27 20 11 30 0 30 C-11 30 -27 20 -27 -2 Z" fill="${gold}" />
                <g fill="${gold}"><rect x="-6" y="30" width="12" height="18" /><rect x="-24" y="46" width="48" height="12" rx="5" /></g>
            </g>`
        }
    ];

    /*
     * How much gold a count of wins comes to: the silhouette for the first,
     * then 30, 60 and 100 per cent -- the owner's stages, one per win. Four
     * and over is whole.
     */
    const STEPS = [0, 0.3, 0.6, 1];
    const levelOf = (wins) => (wins ? STEPS[Math.min(wins, STEPS.length) - 1] : null);

    // The sparks round the finished emblem: two stars, a glint and five dots.
    // The ones by the star moved with it, the glint in from the side, and the
    // two dots that were under the shield up out of the name's way.
    const SPARKS = (gold) => [
        `<path d="${rounded('13,121 16.9,129.6 26.3,130.7 19.4,137.1 21.2,146.3 13,141.7 4.8,146.3 6.6,137.1 -0.3,130.7 9.1,129.6')}" fill="${gold}" stroke="${AMBER}" stroke-width="1.3" stroke-linejoin="round" />`,
        `<path d="${rounded('378,-16 384.2,-2.5 398.9,-0.8 388,9.3 390.9,23.8 378,16.6 365.1,23.8 368,9.3 357.1,-0.8 371.8,-2.5')}" fill="${gold}" stroke="${AMBER}" stroke-width="2" stroke-linejoin="round" />`,
        `<path d="M394 69 Q396.2 77.8 405 80 Q396.2 82.2 394 91 Q391.8 82.2 383 80 Q391.8 77.8 394 69 Z" fill="${AMBER}" />`,
        `<circle cx="392" cy="140" r="4" fill="${AMBER}" />`,
        `<circle cx="25" cy="208" r="4.5" fill="${AMBER}" />`,
        `<circle cx="104" cy="392" r="5" fill="${AMBER}" />`,
        `<circle cx="296" cy="390" r="5" fill="${AMBER}" />`,
        `<circle cx="312" cy="-4" r="4" fill="${AMBER}" />`
    ];

    // What a set's log comes to: the record, and each prize's level, or
    // nothing for a prize never won.
    function reckon(log) {
        const entries = Array.isArray(log) ? log : [];
        const record = entries.reduce((most, entry) => Math.max(most, entry.maxLength || 0), 0);

        const levels = {};
        PRIZES.forEach(prize => {
            levels[prize.name] = levelOf(entries.filter(entry => prize.name in entry).length);
        });

        return { record, levels };
    }

    /*
     * The prizes the finished emblem is made of, with the record: the star
     * and the goblet. Not the crown -- the owner's call, 2 November 2026: it
     * is won only on a board a long enough word can fill, and a set of short
     * words would never have finished. It is drawn as ever, a prize over and
     * above, and takes nothing from the rim or the finish when it is not.
     */
    const GOALS = PRIZES.filter(prize => prize.name !== 'crown');

    /*
     * How far the set has come to the finished emblem, from 0 to 1, for the
     * rim to be drawn to -- the owner's count, 30 October 2026, the crown
     * left out of it on 2 November (see GOALS): a share for a record, which
     * there is or is not, and a share for each of the GOALS, a step of it at
     * every stage the prize has come to (STEPS): the silhouette is the first
     * of four, then 30, 60 and 100 per cent gold. A third each, now; a
     * quarter each while the crown counted.
     *
     * For an hour the prize counted by its gold alone, and a silhouette for
     * nothing; the owner put that right the same day -- a prize won is
     * progress whether or not any of it is gold yet.
     */
    function progressOf(record, levels) {
        const stage = (level) => (level === null ? 0 : (STEPS.indexOf(level) + 1) / STEPS.length);
        const part = 1 / (GOALS.length + 1);

        return (record > 0 ? part : 0) + GOALS.reduce((sum, prize) => sum + part * stage(levels[prize.name]), 0);
    }

    // The light across a finished emblem: a run of this long, every this long
    const SHEEN_RUN = 1100;
    const SHEEN_EVERY = 3600;

    // Ids for the gradient and the masks, one set per
    // drawing: there are as many snake tiles on the page as sets, and a
    // second gradient by the same id is a gradient nobody draws with.
    let faces = 0;

    /*
     * The tile's face. `start` draws it as it stands before it grows -- the
     * plain tile, everything else there but not yet seen -- for grow to bring
     * in.
     */
    function face(tile, log, start) {
        const { record, levels } = reckon(log);
        const won = PRIZES.filter(prize => levels[prize.name] !== null);
        // Anything won at all, which is what the rim comes with
        const decorated = record > 0 || won.length > 0;
        // Finished: the record, and the GOALS whole -- the crown or not
        const done = record > 0 && GOALS.every(prize => levels[prize.name] === 1);

        const n = ++faces;
        const id = (name) => `snake-${name}-${n}`;
        const gold = `url(#${id('gold')})`;

        // A style for a part that grows: where it starts, where it ends.
        const ORIGIN = 'transform-box: fill-box; transform-origin: center;';
        const pose = (from, to) => (start ? from : to);

        const k = tile.size / TILE_SIDE;
        // The tile's centre, which the whole of it pulses about -- see grow.
        const centre = `${(TILE_AT + TILE_SIDE / 2 - VIEW.x) / VIEW.width * 100}% ${(TILE_AT + TILE_SIDE / 2 - VIEW.y) / VIEW.height * 100}%`;
        const box = `position: absolute; left: ${(VIEW.x - TILE_AT) * k}px; top: ${(VIEW.y - TILE_AT) * k}px; overflow: visible; pointer-events: none; transform-origin: ${centre};`;

        const masks = won.map(prize => `<mask id="${id(prize.name)}" maskUnits="userSpaceOnUse" x="-500" y="-500" width="1000" height="1000">${prize.mask}</mask>`).join('');

        const prizes = won.map(prize => {
            const level = levels[prize.name];
            const whole = level === 1;
            const b = prize.box;

            const silhouette = start || !whole
                ? `<g data-part="silhouette">
                    ${prize.silhouette}
                    <g mask="url(#${id(prize.name)})">
                        <rect data-part="gold" x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="${gold}"
                            style="transform-box: fill-box; transform-origin: center bottom; transform: scaleY(${pose(0, level)});" />
                    </g>
                    ${prize.over}
                </g>`
                : '';

            const finished = whole
                ? `<g data-part="whole" style="opacity: ${pose(0, 1)};">${prize.whole(gold)}</g>`
                : '';

            return `<g data-prize="${prize.name}" data-level="${level}" style="${ORIGIN} ${pose('opacity: 0; transform: scale(0);', '')}">
                <g transform="${prize.frame}">${silhouette}${finished}</g>
            </g>`;
        }).join('');

        // Three figures a size down, to stay inside the medal
        const figure = String(record).length > 2 ? 50 : 64;
        const middle = MEDAL.x + MEDAL.size / 2;

        const ribbon = record
            ? `<g data-part="ribbon" style="${ORIGIN} ${pose('opacity: 0; transform: scale(0.3);', '')}">
                ${TAILS}
                <path d="${BANNER}" fill="${gold}" stroke="#9c650c" stroke-width="5" stroke-linejoin="round" />
                <rect ${MEDAL_FACE} fill="${gold}" stroke="#9c650c" stroke-width="5" />
                <text data-part="record" data-value="${record}" x="${middle}" y="${MEDAL.y + 50}" font-weight="900" font-size="${figure}" fill="#14202b" text-anchor="middle" dominant-baseline="central">${record}</text>
                <text x="${middle}" y="${MEDAL.y + 101}" font-weight="900" font-size="28" letter-spacing="2" fill="#14202b" text-anchor="middle" dominant-baseline="central">MAX</text>
            </g>`
            : '';

        /*
         * The rim, with anything won: the track all round, and the band over
         * it as far as the set has come -- see RIM_GAP and progressOf. A dash in
         * percent of the band's length (pathLength), with a gap after it
         * longer than the rest of the way, so that nothing comes round again
         * past the start; none at all once the way is whole. Drawn from
         * nothing as the tile grows (see grow), and out of sight until then:
         * a dash of nothing still has its round ends, a dot at the top.
         */
        const share = progressOf(record, levels);
        const dash = (part) => `${100 * part} 200`;

        const band = share > 0
            ? `<path data-part="rim" data-share="${share}" d="${RIM_BAND_PATH}" pathLength="100" fill="none" stroke="${AMBER}" stroke-width="${RIM_BAND}" stroke-linecap="round" stroke-linejoin="round"
                style="${pose(`opacity: 0; stroke-dasharray: ${dash(0)};`, share < 1 ? `stroke-dasharray: ${dash(share)};` : '')}" />`
            : '';

        const rim = decorated
            ? `<path data-part="track" d="${RIM_TRACK_PATH}" fill="none" stroke="${AMBER}" stroke-width="${RIM_TRACK}" style="${pose('opacity: 0;', '')}" />${band}`
            : '';

        const sparks = done
            ? SPARKS(gold).map(spark => `<g data-part="spark" style="${ORIGIN} ${pose('opacity: 0; transform: scale(0);', '')}">${spark}</g>`).join('')
            : '';

        /*
         * And a finished emblem shimmers: a band of light runs across its gold
         * -- the prizes, the ribbon, the rim -- every few seconds, for as long
         * as it is on the screen. The owner's call, 28 October 2026: all four
         * whole is the most there is, and it should look it.
         *
         * The rim goes under the tile (see RIM_GAP), so its mask has the
         * tile taken out of it: the light would otherwise run across the
         * blue where the band is hidden.
         *
         * A gradient drawn through a mask of the gold, and moved by SMIL rather
         * than by script: the face is markup the catalog draws again whenever
         * it likes, and the light goes with it without anybody keeping it
         * going. Not with motion turned down.
         */
        const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
        const shimmers = done && !start && !calm;

        const sheen = shimmers
            ? `<linearGradient id="${id('sheen')}" gradientUnits="userSpaceOnUse" x1="-80" y1="-40" x2="40" y2="80">
                <stop offset="0.3" stop-color="#ffffff" stop-opacity="0" />
                <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.9" />
                <stop offset="0.7" stop-color="#ffffff" stop-opacity="0" />
                <animateTransform attributeName="gradientTransform" type="translate" values="-120 -120; 560 560; 560 560" keyTimes="0; ${SHEEN_RUN / SHEEN_EVERY}; 1" dur="${SHEEN_EVERY}ms" repeatCount="indefinite" />
            </linearGradient>
            <mask id="${id('lit')}" maskUnits="userSpaceOnUse" x="${VIEW.x}" y="${VIEW.y}" width="${VIEW.width}" height="${VIEW.height}">
                <path d="${RIM_BAND_PATH}" fill="none" stroke="#ffffff" stroke-width="${RIM_BAND}" stroke-linejoin="round" />
                <rect ${TILE_FACE} fill="#000000" />
                ${won.map(prize => `<g transform="${prize.frame}">${prize.whole('#ffffff')}</g>`).join('')}
                ${record ? `<path d="${BANNER}" fill="#ffffff" /><rect ${MEDAL_FACE} fill="#ffffff" />` : ''}
            </mask>`
            : '';

        const shine = shimmers
            ? `<rect x="${VIEW.x}" y="${VIEW.y}" width="${VIEW.width}" height="${VIEW.height}" fill="url(#${id('sheen')})" mask="url(#${id('lit')})" />`
            : '';

        const square = `<g data-part="square">${SQUARE}</g>`;

        return `<svg class="snake-tile" width="${VIEW.width * k}" height="${VIEW.height * k}"
            viewBox="${VIEW.x} ${VIEW.y} ${VIEW.width} ${VIEW.height}" aria-hidden="true" style="${box}">
            <defs>
                <linearGradient id="${id('gold')}" x1="0" y1="0" x2="0" y2="1">
                    ${GOLD_STOPS.map(([at, colour]) => `<stop offset="${at}" stop-color="${colour}" />`).join('')}
                </linearGradient>
                ${masks}
                ${sheen}
            </defs>
            ${rim}${square}${SNAKE}${ribbon}${prizes}${sparks}${shine}
        </svg>`;
    }

    // Whether a set's log has anything this tile shows: a tile with nothing
    // on it is the plain one, and has nothing to grow.
    function anything(log) {
        const { record, levels } = reckon(log);
        return record > 0 || PRIZES.some(prize => levels[prize.name] !== null);
    }

    /*
     * The tile growing from the plain one to what it is -- the owner's order,
     * 28 October 2026, with the rim put first on 30 October:
     *
     *   1. The rim's track comes up round the tile, and the band runs round
     *      it as far as the set has come. Until 2 November 2026 a shield
     *      took the square's place first, and the track came with it.
     *   2. The ribbon comes in with the record counting up on it.
     *   3. The crown, the star and the goblet that have been won come in one
     *      after another as silhouettes. The ones never won do not come at all.
     *   4. The gold rises in them, a stage at a time; the whole ones turn gold
     *      through; and last, all three whole, the sparks.
     *
     * The band goes at one pace whatever its length, the drafts' 2.2 seconds
     * for the whole way round (RIM_ROUND), so the further the set has come
     * the longer the tile takes to say so. A record and nothing else is over
     * in a little over a second, a finished emblem takes six or so. A
     * tile with nothing on it does not grow at all: it is the plain one, and
     * stays so.
     *
     * For a day the ones never won came in too, as silhouettes among the
     * others, and went again -- to show there was more to win; first before
     * the ribbon with a pause to look at them, then after it with none. The
     * owner took them out on 28 October 2026: the tile is what was won.
     *
     * And the whole tile beats once as each thing won comes in -- the record,
     * each prize. The prizes come in far enough apart for one beat to be over
     * before the next. The rim is no thing won, and does not beat: until 30
     * October 2026 it came in last, with the emblem finished, and did.
     *
     * While there was a shield, it came in over the square while the square
     * was still all there, and the square went after it: the two faded at
     * once to begin with, and half-way through each was half there -- the
     * tile flickered dark at the start of every growth (the owner, 28
     * October 2026).
     *
     * Each part is one animation over the whole of its course, from the
     * start of the growth to its own last change, with its stages at offsets
     * in it. Several animations on one part, each held at its first frame
     * until its turn, override one another: the last one made wins from the
     * very start, and the gold stood at 60 per cent before the 30 had begun.
     *
     * When it is over the face is drawn again as it stands, without a single
     * animation left on it -- the last frame of the growth and the face are
     * the same picture.
     */
    const TRACK_IN = 260;
    const RIBBON_AT = 130;
    const RIBBON_IN = 420;
    const PRIZE_IN = 340;
    const PRIZE_GAP = 300;
    const BEAT = 280;
    const BEAT_SCALE = 1.08;
    const COUNT = 520;
    const STAGE = 240;
    const STAGE_REST = 90;
    const TURN = 260;
    const SWELL = 380;
    const RIM_ROUND = 2200;
    const RIM_EASE = 'cubic-bezier(0.45, 0.05, 0.35, 1)';
    const SPARK_IN = 300;
    const SPARK_GAP = 50;

    function course(node, points) {
        if (!node) return null;

        const end = points[points.length - 1][0] || 1;
        const frames = points.map(([at, frame]) => Object.assign({ offset: at / end }, frame));

        return node.animate(frames, { duration: end, fill: 'forwards' });
    }

    // The record on the ribbon, counting up to itself as the ribbon comes in
    function countUp(node, at) {
        if (!node) return;

        const to = Number(node.dataset.value) || 0;
        const begin = performance.now() + at;

        const tick = (now) => {
            if (!node.isConnected) return;

            const t = Math.min(1, Math.max(0, (now - begin) / COUNT));
            node.textContent = String(Math.max(1, Math.round(to * (1 - Math.pow(1 - t, 3)))));

            if (t < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
    }

    // Plays a face drawn in its start (see face) through to the end; `settle`
    // draws the end for good.
    function grow(svg, settle) {
        const part = (name, within) => (within || svg).querySelector(`[data-part="${name}"]`);
        const runs = [];
        const run = (node, points) => runs.push(course(node, points));

        const ease = 'cubic-bezier(0.2, 0.7, 0.3, 1)';
        const pop = (at) => [
            [at, { opacity: 0, transform: 'scale(0)', easing: ease }],
            [at + PRIZE_IN * 0.6, { opacity: 1, transform: 'scale(1.15)' }],
            [at + PRIZE_IN, { opacity: 1, transform: 'scale(1)' }]
        ];

        // The moments the whole tile beats, as the peaks of the things won
        const beats = [];

        // 1. The track round the tile, and the band run round to how far the
        // set has come
        run(part('track'), [[0, { opacity: 0 }], [TRACK_IN, { opacity: 1 }]]);

        let at = TRACK_IN;

        const rim = part('rim');
        if (rim) {
            const share = Number(rim.dataset.share);
            const round = RIM_ROUND * share;

            run(rim, [
                [0, { opacity: 0, strokeDasharray: '0 200' }],
                [at, { opacity: 0, strokeDasharray: '0 200' }],
                [at, { opacity: 1, strokeDasharray: '0 200', easing: RIM_EASE }],
                [at + round, { opacity: 1, strokeDasharray: `${100 * share} 200` }]
            ]);
            at += round;
        }

        // 2. The ribbon with the record -- under way with the track when
        // there is no band to wait for
        const ribbon = part('ribbon');
        if (ribbon) {
            const from = rim ? at : RIBBON_AT;

            run(ribbon, [
                [0, { opacity: 0, transform: 'scale(0.3)' }],
                [from, { opacity: 0, transform: 'scale(0.3)', easing: ease }],
                [from + RIBBON_IN * 0.65, { opacity: 1, transform: 'scale(1.08)' }],
                [from + RIBBON_IN, { opacity: 1, transform: 'scale(1)' }]
            ]);
            countUp(part('record'), from);
            beats.push(from + RIBBON_IN * 0.65);
            at = from + RIBBON_IN;
        }

        // 3. The prizes won, as silhouettes, one after another
        const prizes = [...svg.querySelectorAll('[data-prize]')];
        const arrived = prizes.map((prize, i) => at + i * PRIZE_GAP);

        if (prizes.length) at = arrived[arrived.length - 1] + PRIZE_IN;

        // 4. The gold, a stage at a time, in every prize that has that far to go
        const rises = new Map(prizes.map(prize => [prize, [[0, { transform: 'scaleY(0)' }]]]));

        let below = 0;
        for (const stage of STEPS.slice(1)) {
            const rising = prizes.filter(prize => Number(prize.dataset.level) >= stage);
            if (!rising.length) break;

            rising.forEach(prize => {
                const points = rises.get(prize);
                points.push([at, { transform: `scaleY(${below})`, easing: 'ease-in-out' }]);
                points.push([at + STAGE, { transform: `scaleY(${stage})` }]);
            });

            below = stage;
            at += STAGE + STAGE_REST;
        }

        prizes.forEach(prize => {
            const points = rises.get(prize);
            if (points.length > 1) run(part('gold', prize), points);
        });

        // The whole ones turning to gold through, each with a swell
        const whole = prizes.filter(prize => prize.dataset.level === '1');
        const turned = at;
        if (whole.length) at += SWELL;

        prizes.forEach((prize, i) => {
            const points = [[0, { opacity: 0, transform: 'scale(0)' }], ...pop(arrived[i])];

            beats.push(arrived[i] + PRIZE_IN * 0.6);

            if (whole.includes(prize)) {
                points.push([turned, { opacity: 1, transform: 'scale(1)' }]);
                points.push([turned + SWELL * 0.4, { opacity: 1, transform: 'scale(1.18)' }]);
                points.push([turned + SWELL, { opacity: 1, transform: 'scale(1)' }]);

                run(part('whole', prize), [[0, { opacity: 0 }], [turned, { opacity: 0 }], [turned + TURN, { opacity: 1 }]]);
                run(part('silhouette', prize), [[0, { opacity: 1 }], [turned, { opacity: 1 }], [turned + TURN, { opacity: 0 }]]);
            }

            run(prize, points);
        });

        // All three whole: the sparks one after another
        svg.querySelectorAll('[data-part="spark"]').forEach((spark, i) => {
            const from = at + i * SPARK_GAP;
            run(spark, [
                [0, { opacity: 0, transform: 'scale(0)' }],
                [from, { opacity: 0, transform: 'scale(0)', easing: ease }],
                [from + SPARK_IN * 0.6, { opacity: 1, transform: 'scale(1.4)' }],
                [from + SPARK_IN, { opacity: 1, transform: 'scale(1)' }]
            ]);
        });

        // And the beats, one course for the whole tile, none begun before the
        // one ahead of it is over
        if (beats.length) {
            const points = [[0, { transform: 'scale(1)' }]];
            let free = 0;

            beats.sort((a, b) => a - b).forEach(peak => {
                const from = Math.max(peak - BEAT * 0.4, free);

                points.push([from, { transform: 'scale(1)', easing: 'ease-out' }]);
                points.push([from + BEAT * 0.4, { transform: `scale(${BEAT_SCALE})`, easing: 'ease-in-out' }]);
                points.push([from + BEAT, { transform: 'scale(1)' }]);
                free = from + BEAT;
            });

            run(svg, points);
        }

        return Promise.all(runs.filter(Boolean).map(anim => anim.finished.catch(() => null))).then(settle);
    }

    /*
     * What the catalog asks for -- see `show` in core/icons.js: the plain tile,
     * or the tile as the set's log has it, at once or grown into from the
     * plain one. Which of the two is which, and everything between them, is
     * this file's: the catalog knows only when to ask.
     */
    function show(el, tile, log, how) {
        const actual = !how || how.actual !== false;

        if (!actual || !anything(log)) {
            el.innerHTML = face(tile, [], false);
            return Promise.resolve();
        }

        if (!how || !how.animate) {
            el.innerHTML = face(tile, log, false);
            return Promise.resolve();
        }

        el.innerHTML = face(tile, log, true);

        return grow(el.querySelector('svg'), () => {
            if (el.isConnected) el.innerHTML = face(tile, log, false);
        });
    }

    GAME_FACES.snake = {
        title: 'Snake',
        show: show
    };
})();
