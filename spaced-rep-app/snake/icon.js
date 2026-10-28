/*
 * What the catalog shows of Snake: its name and its tile, and the tile is an
 * emblem of what was achieved in the set -- see GAME_FACES in core/icons.js.
 *
 * Drawn from the owner's drafts, icon drafts/snake-icons/final.html, and
 * numbered as they are there:
 *
 *   61  the snake on a blue tile: nothing achieved yet.
 *   62  a record for length -- the tile becomes a shield, with a ribbon across
 *       it and the record on the ribbon.
 *   63  the crown, the star or the goblet the first time it is won: a dark
 *       silhouette with a gold edge, in its place round the shield.
 *   64, 65  the second and the third time: gold to 30 and to 60 per cent.
 *       The fourth fills it -- four wins to a whole one, the owner's count.
 *   66  all three whole: a gold rim round the shield, and sparks.
 *
 * Each prize counts its own wins and is drawn by its own count, so a crown won
 * once stands as a silhouette beside a star won four times -- and a prize
 * never won is not drawn at all, but for a moment as the tile grows (see
 * grow). The counts are the entries in the set's log
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
 * and the rim round it lifted, so that nothing goes below 400.
 *
 * Until 28 October 2026 the face was a ring of a second snake round the tile,
 * as long as the record, closing into an ouroboros at fifty (snake/crest.js).
 * It said one thing, and there are four now.
 */
(() => {
    const BLUE = '#4a90d9';
    const NAVY = '#16323f';    // a silhouette's body
    const EDGE = '#c98414';    // the gold edge on everything gold
    const RIM = '#b8780f';     // the rim round the shield, all three whole

    // The gold the drafts fill with, and the gold of the medal at the end of
    // a game is a sibling of it rather than the same -- see goldStops in
    // snake.js, which is drawn for a larger badge.
    const GOLD_STOPS = [[0, '#ffe680'], [0.55, '#f6c232'], [1, '#d9921a']];

    // The crown's jewels and the sparks: light on the dark theme, and a dark
    // amber on the light one, where the light gold is lost on the ground
    // (drafts 66 and 72).
    const SPARK = (dark) => dark ? '#ffd34d' : '#a86d0c';
    const SPARK_EDGE = (dark) => dark ? EDGE : '#a86d0c';

    // The square the tile is, and the box everything is drawn in round it:
    // from the sparks over the crown to the tails of the ribbon, and from the
    // star's points to the goblet's rim. Larger than what is drawn in it, and
    // nothing in it takes a press -- see pointer-events in face.
    const TILE_AT = 30;
    const TILE_SIDE = 340;
    const VIEW = { x: -50, y: -50, width: 500, height: 510 };

    const SQUARE = `<rect x="30" y="30" width="340" height="340" rx="113" fill="${BLUE}" />`;
    const SHIELD = `<path d="M143 30 H257 A113 113 0 0 1 370 143 V226 Q370 316 200 386 Q30 316 30 226 V143 A113 113 0 0 1 143 30 Z" fill="${BLUE}" />`;
    const RIM_PATH = 'M143 16 H257 A127 127 0 0 1 384 143 V226 Q384 324 200 396 Q16 324 16 226 V143 A127 127 0 0 1 143 16 Z';

    // The snake, white with its eyes cut out of it in the tile's own blue.
    const SNAKE = `<g transform="matrix(1.4 0 0 1.4 -89 -345.2)">
        <path d="M137.17 489.59C137.38 485.68 141.01 482.26 141.03 477.67C141.07 468.74 134.95 461.53 134.12 452.67C133.2 442.86 137.51 432.75 145.17 426.69C191.95 389.66 199.67 487.31 229.74 459.67C239.63 450.58 235.34 437.01 226.5 429.21C188.26 395.49 160.35 412.87 160.35 344.33C160.35 330.58 155.94 307.77 172.83 302.05C188.09 296.88 248.13 296 251.88 316C254.49 329.92 256.11 354.71 243.5 363.67C235.06 369.66 199.52 360.17 201.5 375.81C203.07 388.18 308.14 423.8 249.5 479.53C242.36 486.31 232.01 489.56 222.33 490.13C177.72 492.78 179.06 435.44 157.93 442C143.08 446.61 161.76 495.45 137.17 489.59Z" fill="#ffffff" stroke="#ffffff" stroke-width=".5" stroke-linejoin="round" />
        <g fill="${BLUE}"><circle cx="192.4" cy="331.7" r="17.5" /><circle cx="228.8" cy="332.4" r="9.1" /></g>
    </g>`;

    // The ribbon's tails, behind it, and their folds. The drafts' tails hung
    // 60 under the ribbon's ends and spread as they went; these end level
    // with the folds, 10 under the ends -- see the header.
    const TAILS = `<g fill="#d9921a" stroke="#8a560a" stroke-width="3" stroke-linejoin="round">
            <polygon points="75.4,334 14.7,348 31,369 14.7,390 78.6,390" />
            <polygon points="324.6,334 385.3,348 369,369 385.3,390 321.4,390" />
        </g>
        <g fill="#7a4a07">
            <polygon points="60.6,370 81.9,380 81.9,392 60.6,382" />
            <polygon points="339.4,370 318.1,380 318.1,392 339.4,382" />
        </g>`;

    // The ribbon itself and the curve its record is written along, 18 higher
    // than in the drafts.
    const BANNER = 'M60.6 282 Q200 218 339.4 282 L339.4 382 Q200 318 60.6 382 Z';
    const BANNER_LINE = 'M72.1 362 Q200 298 327.9 362';

    /*
     * The three prizes, each in its place round the shield: the crown on top,
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
    const STAR = '44,126 62.1,165.1 104.9,170.2 73.2,199.5 81.6,241.8 44,220.7 6.4,241.8 14.8,199.5 -16.9,170.2 25.9,165.1';
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
            whole: (gold, dark) => `<g stroke="${EDGE}" stroke-width="3.5" stroke-linejoin="round">
                <path d="M-62 0 L-72 -58 L-34 -30 L0 -76 L34 -30 L72 -58 L62 0 Z" fill="${gold}" />
                <rect x="-64" y="0" width="128" height="16" rx="6" fill="#e3a21c" />
                <g fill="${SPARK(dark)}" stroke="none"><circle cx="-72" cy="-62" r="7" /><circle cx="0" cy="-82" r="7" /><circle cx="72" cy="-62" r="7" /></g>
            </g>`
        },
        {
            name: 'star',
            frame: 'translate(17 0) rotate(-16 44 190)',
            silhouette: `<polygon points="${STAR}" fill="${NAVY}" stroke="${EDGE}" stroke-width="6" stroke-linejoin="round" />`,
            mask: `<polygon points="${STAR}" fill="#ffffff" stroke="#ffffff" stroke-width="5.8" stroke-linejoin="round" />`,
            box: { x: -40, y: 123, width: 170, height: 122.8 },
            over: `<polygon points="${STAR}" fill="none" stroke="${EDGE}" stroke-width="6" stroke-linejoin="round" />`,
            whole: (gold) => `<polygon points="${STAR}" fill="${gold}" stroke="${EDGE}" stroke-width="5.8" stroke-linejoin="round" />`
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
    const SPARKS = (gold, dark) => [
        `<polygon points="13,121 16.9,129.6 26.3,130.7 19.4,137.1 21.2,146.3 13,141.7 4.8,146.3 6.6,137.1 -0.3,130.7 9.1,129.6" fill="${gold}" stroke="${SPARK_EDGE(dark)}" stroke-width="1.3" stroke-linejoin="round" />`,
        `<polygon points="378,-16 384.2,-2.5 398.9,-0.8 388,9.3 390.9,23.8 378,16.6 365.1,23.8 368,9.3 357.1,-0.8 371.8,-2.5" fill="${gold}" stroke="${SPARK_EDGE(dark)}" stroke-width="2" stroke-linejoin="round" />`,
        `<path d="M394 69 Q396.2 77.8 405 80 Q396.2 82.2 394 91 Q391.8 82.2 383 80 Q391.8 77.8 394 69 Z" fill="${SPARK(dark)}" />`,
        `<circle cx="392" cy="140" r="4" fill="${SPARK(dark)}" />`,
        `<circle cx="25" cy="208" r="4.5" fill="${SPARK(dark)}" />`,
        `<circle cx="104" cy="392" r="5" fill="${SPARK(dark)}" />`,
        `<circle cx="296" cy="390" r="5" fill="${SPARK(dark)}" />`,
        `<circle cx="312" cy="-4" r="4" fill="${SPARK(dark)}" />`
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

    // Ids for the gradient, the masks and the ribbon's curve, one set per
    // drawing: there are as many snake tiles on the page as sets, and a
    // second gradient by the same id is a gradient nobody draws with.
    let faces = 0;

    /*
     * The tile's face. `start` draws it as it stands before it grows -- the
     * plain tile, everything else there but not yet seen, and all three prizes
     * among it, the ones never won included -- for grow to bring in.
     */
    function face(tile, log, start) {
        const { record, levels } = reckon(log);
        const won = PRIZES.filter(prize => levels[prize.name] !== null);
        const shield = record > 0 || won.length > 0;
        const done = won.length === PRIZES.length && won.every(prize => levels[prize.name] === 1);

        // Every prize while it grows, once any is won, for the ones never won
        // to be shown and taken away again -- see grow.
        const drawn = start && won.length ? PRIZES : won;

        const n = ++faces;
        const id = (name) => `snake-${name}-${n}`;
        const gold = `url(#${id('gold')})`;

        // A style for a part that grows: where it starts, where it ends.
        const ORIGIN = 'transform-box: fill-box; transform-origin: center;';
        const pose = (from, to) => (start ? from : to);

        const k = tile.size / TILE_SIDE;
        const box = `position: absolute; left: ${(VIEW.x - TILE_AT) * k}px; top: ${(VIEW.y - TILE_AT) * k}px; overflow: visible; pointer-events: none;`;

        const masks = drawn.map(prize => `<mask id="${id(prize.name)}" maskUnits="userSpaceOnUse" x="-500" y="-500" width="1000" height="1000">${prize.mask}</mask>`).join('');

        const prizes = drawn.map(prize => {
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
                ? `<g data-part="whole" style="opacity: ${pose(0, 1)};">${prize.whole(gold, tile.dark)}</g>`
                : '';

            // A prize never won has no level, and goes again once it has been seen
            return `<g data-prize="${prize.name}" data-level="${level === null ? '' : level}" style="${ORIGIN} ${pose('opacity: 0; transform: scale(0);', '')}">
                <g transform="${prize.frame}">${silhouette}${finished}</g>
            </g>`;
        }).join('');

        const ribbon = record
            ? `<g data-part="ribbon" style="${ORIGIN} ${pose('opacity: 0; transform: scale(0.3);', '')}">
                ${TAILS}
                <path d="${BANNER}" fill="${gold}" stroke="#9c650c" stroke-width="5" stroke-linejoin="round" />
                <path id="${id('curve')}" d="${BANNER_LINE}" fill="none" />
                <text font-weight="900" font-size="88" fill="#14202b" text-anchor="middle"><textPath data-part="record" data-value="${record}" href="#${id('curve')}" startOffset="50%">${record}</textPath></text>
            </g>`
            : '';

        const rim = done ? `<path data-part="rim" d="${RIM_PATH}" fill="none" stroke="${RIM}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" style="${ORIGIN} ${pose('opacity: 0;', '')}" />` : '';

        const sparks = done
            ? SPARKS(gold, tile.dark).map(spark => `<g data-part="spark" style="${ORIGIN} ${pose('opacity: 0; transform: scale(0);', '')}">${spark}</g>`).join('')
            : '';

        // The square stays in the start of a tile that will be a shield, for
        // the shield to take its place.
        const square = !shield || start ? `<g data-part="square">${SQUARE}</g>` : '';
        const shieldPart = shield ? `<g data-part="shield" style="${pose('opacity: 0;', '')}">${SHIELD}</g>` : '';

        return `<svg class="snake-tile" width="${VIEW.width * k}" height="${VIEW.height * k}"
            viewBox="${VIEW.x} ${VIEW.y} ${VIEW.width} ${VIEW.height}" aria-hidden="true" style="${box}">
            <defs>
                <linearGradient id="${id('gold')}" x1="0" y1="0" x2="0" y2="1">
                    ${GOLD_STOPS.map(([at, colour]) => `<stop offset="${at}" stop-color="${colour}" />`).join('')}
                </linearGradient>
                ${masks}
            </defs>
            ${rim}${square}${shieldPart}${SNAKE}${ribbon}${prizes}${sparks}
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
     * 28 October 2026:
     *
     *   1. The shield takes the square's place, and the ribbon comes in with
     *      the record counting up on it.
     *   2. If any of the crown, the star and the goblet has been won, all
     *      three come in one after another as silhouettes -- the ones never
     *      won as well, because what shows somebody there is more to win is
     *      the outline of it -- and the ones never won go again at once. With
     *      none won there are no silhouettes at all: a record alone is not a
     *      reason to show what else there is.
     *   3. The gold rises in the ones won, a stage at a time; the whole ones
     *      turn gold through; and last, all three whole, the rim and the
     *      sparks.
     *
     * A record and nothing else is over in half a second, a finished emblem
     * takes three or so. A tile with nothing on it does not grow at all: it is
     * the plain one, and stays so.
     *
     * The silhouettes came before the ribbon for a day, with a pause to look
     * at them before the ones never won went; the owner put the record first
     * and took the pause out.
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
    const SHIELD_IN = 260;
    const RIBBON_AT = 130;
    const RIBBON_IN = 420;
    const PRIZE_IN = 340;
    const PRIZE_GAP = 150;
    const LEAVE = 320;
    const COUNT = 520;
    const STAGE = 240;
    const STAGE_REST = 90;
    const TURN = 260;
    const SWELL = 380;
    const RIM_IN = 360;
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

        // 1. The shield taking the square's place, and the ribbon with the record
        run(part('square'), [[0, { opacity: 1 }], [SHIELD_IN, { opacity: 0 }]]);
        run(part('shield'), [[0, { opacity: 0 }], [SHIELD_IN, { opacity: 1 }]]);

        let at = SHIELD_IN;

        const ribbon = part('ribbon');
        if (ribbon) {
            run(ribbon, [
                [0, { opacity: 0, transform: 'scale(0.3)' }],
                [RIBBON_AT, { opacity: 0, transform: 'scale(0.3)', easing: ease }],
                [RIBBON_AT + RIBBON_IN * 0.65, { opacity: 1, transform: 'scale(1.08)' }],
                [RIBBON_AT + RIBBON_IN, { opacity: 1, transform: 'scale(1)' }]
            ]);
            countUp(part('record'), RIBBON_AT);
            at = RIBBON_AT + RIBBON_IN;
        }

        // 2. Every prize there is, if any is won, and the ones never won go
        const prizes = [...svg.querySelectorAll('[data-prize]')];
        const arrived = prizes.map((prize, i) => at + i * PRIZE_GAP);
        const won = prizes.filter(prize => prize.dataset.level !== '');
        const unwon = prizes.filter(prize => prize.dataset.level === '');

        if (prizes.length) at = arrived[arrived.length - 1] + PRIZE_IN;

        const left = at;
        if (unwon.length) at += LEAVE;

        // 3. The gold, a stage at a time, in every prize that has that far to go
        const rises = new Map(won.map(prize => [prize, [[0, { transform: 'scaleY(0)' }]]]));

        let below = 0;
        for (const stage of STEPS.slice(1)) {
            const rising = won.filter(prize => Number(prize.dataset.level) >= stage);
            if (!rising.length) break;

            rising.forEach(prize => {
                const points = rises.get(prize);
                points.push([at, { transform: `scaleY(${below})`, easing: 'ease-in-out' }]);
                points.push([at + STAGE, { transform: `scaleY(${stage})` }]);
            });

            below = stage;
            at += STAGE + STAGE_REST;
        }

        won.forEach(prize => {
            const points = rises.get(prize);
            if (points.length > 1) run(part('gold', prize), points);
        });

        // The whole ones turning to gold through, each with a swell
        const whole = won.filter(prize => prize.dataset.level === '1');
        const turned = at;
        if (whole.length) at += SWELL;

        prizes.forEach((prize, i) => {
            const points = [[0, { opacity: 0, transform: 'scale(0)' }], ...pop(arrived[i])];

            if (unwon.includes(prize)) {
                points.push([left, { opacity: 1, transform: 'scale(1)' }]);
                points.push([left + LEAVE * 0.35, { opacity: 1, transform: 'scale(1.1)' }]);
                points.push([left + LEAVE, { opacity: 0, transform: 'scale(0)' }]);
            }

            if (whole.includes(prize)) {
                points.push([turned, { opacity: 1, transform: 'scale(1)' }]);
                points.push([turned + SWELL * 0.4, { opacity: 1, transform: 'scale(1.18)' }]);
                points.push([turned + SWELL, { opacity: 1, transform: 'scale(1)' }]);

                run(part('whole', prize), [[0, { opacity: 0 }], [turned, { opacity: 0 }], [turned + TURN, { opacity: 1 }]]);
                run(part('silhouette', prize), [[0, { opacity: 1 }], [turned, { opacity: 1 }], [turned + TURN, { opacity: 0 }]]);
            }

            run(prize, points);
        });

        // All three whole: the rim, and the sparks one after another
        run(part('rim'), [[0, { opacity: 0 }], [at, { opacity: 0 }], [at + RIM_IN, { opacity: 1 }]]);

        svg.querySelectorAll('[data-part="spark"]').forEach((spark, i) => {
            const from = at + i * SPARK_GAP;
            run(spark, [
                [0, { opacity: 0, transform: 'scale(0)' }],
                [from, { opacity: 0, transform: 'scale(0)', easing: ease }],
                [from + SPARK_IN * 0.6, { opacity: 1, transform: 'scale(1.4)' }],
                [from + SPARK_IN, { opacity: 1, transform: 'scale(1)' }]
            ]);
        });

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

        // Off the row of a set until it is pinned there or played there, since
        // Wordcraft took the place it had -- see `away` in core/icons.js, and
        // allGames in catalog.js.
        away: true,

        // A "New" plate beside its name in the dialog until it is played,
        // asked for on 26 October 2026 when the dialog came to hold every
        // game: the one most people have not opened yet.
        fresh: true,

        show: show
    };
})();
