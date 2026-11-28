/*
 * What the catalog shows of Word search 2: its name and its tile -- see
 * GAME_FACES in core/icons.js. Loaded by the catalog alone; the game's page
 * has no tile to draw.
 *
 * Word search's file, copied on 12 November 2026 when the game was, with its
 * own colour and drawing. The tile carries the stars the game has won on the
 * set (see endRun in search2.js and store.achieve), drawn as Word search
 * draws its and written out here again rather than shared: the owner's rule,
 * each game's achievements are its own and may go their own ways.
 *
 *   - The first star won puts up a row of three over the drawing: one in
 *     gold, two empty outlines. Each star after it fills the next.
 *   - The fourth starts a second row the same way, under the first, and the
 *     seventh a third: three rows of three, nine stars, cover the tile.
 *   - All nine: a rim round the tile, which comes with nothing less, and a
 *     light that runs across the gold every few seconds.
 */
(() => {
    // Raspberry, the one the row had not got: coral, gold, violet, blue and
    // green are the other five. Word search's green would make the two one
    // game twice.
    const COLOR = '#cf4f86';

    /*
     * The puzzle itself: a honeycomb of seven cells, the middle one and the
     * six round it, with a word found across four of them, bending on its
     * way up -- the way this game's words lie since the afternoon of
     * 12 November 2026; its morning they ran straight, and so did this word,
     * three cells up to the right. In white on the game's own colour, like
     * every drawing here: the cells of the word whole, the rest at half --
     * found and not found. Flat on top, as the game's are.
     */
    const HEX = 3.3;
    const STEP_X = 6.45;
    const STEP_Y = 7.45;

    const hexAt = (x, y) => 'M' + Array.from({ length: 6 }, (_, i) => {
        const angle = i * Math.PI / 3;
        return `${+(x + HEX * Math.cos(angle)).toFixed(2)} ${+(y + HEX * Math.sin(angle)).toFixed(2)}`;
    }).join('L') + 'Z';

    const FOUND = [[12, 12 + STEP_Y], [12 - STEP_X, 12 + STEP_Y / 2], [12, 12], [12 + STEP_X, 12 - STEP_Y / 2]];
    const REST = [[12, 12 - STEP_Y], [12 - STEP_X, 12 - STEP_Y / 2], [12 + STEP_X, 12 + STEP_Y / 2]];

    const DRAWING = `
        <g fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round">
            <path d="${FOUND.map(([x, y]) => hexAt(x, y)).join('')}" />
            <path d="${REST.map(([x, y]) => hexAt(x, y)).join('')}" opacity="0.45" />
        </g>`;

    /*
     * The stars, on a grid where the tile is 100 across: three to a row,
     * STAR_STEP apart from the middle of the tile, so that they stand close
     * together with the tile's edge well clear round them. In a light gold
     * with the page's navy for an edge when won, and an empty one a dark
     * silhouette and nothing more -- Quiz's stars as the owner settled them
     * on 3 November 2026, the same on every game that wins a star.
     *
     * Their corners turned, as the game's own star has them (see STAR_PATH
     * in search.js): each of the ten cut back along both its edges and turned
     * with a curve, the points by more than the hollows.
     */
    const STARS = 9;
    const ROW = 3;
    const STAR_STEP = 25;
    const POINT_REACH = 11.6;
    const HOLLOW_REACH = 5;
    const TIP_ROUND = 3.7;
    const HOLLOW_ROUND = 1.7;

    function starAt(cx, cy) {
        const corners = Array.from({ length: 10 }, (_, i) => {
            const angle = -Math.PI / 2 + i * Math.PI / 5;
            const r = i % 2 ? HOLLOW_REACH : POINT_REACH;
            return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
        });

        const toward = (from, to, by) => {
            const dx = to[0] - from[0];
            const dy = to[1] - from[1];
            const length = Math.hypot(dx, dy);
            return [from[0] + dx / length * by, from[1] + dy / length * by];
        };

        const xy = (p) => p.map(c => +c.toFixed(2)).join(' ');
        const turns = corners.map((corner, i) => {
            const by = i % 2 ? HOLLOW_ROUND : TIP_ROUND;
            return { from: toward(corner, corners[(i + 9) % 10], by), corner, to: toward(corner, corners[(i + 1) % 10], by) };
        });

        return 'M' + xy(turns[0].from)
            + turns.map((t, i) => (i ? 'L' + xy(t.from) : '') + 'Q' + xy(t.corner) + ' ' + xy(t.to)).join('')
            + 'Z';
    }

    const SPOTS = Array.from({ length: STARS }, (_, i) => starAt(50 + STAR_STEP * (i % ROW - 1), 51 + STAR_STEP * (Math.floor(i / ROW) - 1)));

    const GOLD_STOPS = [[0, '#fff6c8'], [0.5, '#ffd84a'], [1, '#f2a516']];
    const GOLD_EDGE = '#16323f';
    const EMPTY_FILL = '#14202b';

    /*
     * The rim, with all nine: a ring round the tile in the amber of the
     * snake's (see RIM_GAP in snake/icon.js), RIM_GAP off its edge and
     * RIM_WIDTH wide, on the same grid. It keeps to the four or five pixels
     * round the tile a face may draw in -- see the row in catalog.js.
     */
    const AMBER = '#dc920e';
    const RIM_GAP = 6;
    const RIM_WIDTH = 5;

    // The room round the tile the drawing may use, in pixels: the rim's
    const MARGIN = 6;

    // The light across the finished tile: a run of this long, every this long
    const SHEEN_RUN = 1100;
    const SHEEN_EVERY = 3600;

    // Ids for the gradients and the mask, one set per drawing: there are as
    // many of these tiles on the page as sets.
    let faces = 0;

    const starsOf = (log) => (Array.isArray(log) ? log : []).filter(entry => 'star' in entry).length;

    /*
     * The game's own drawing, giving way to the stars as they come -- the
     * owner's call, 3 November 2026: with each row of stars it goes further
     * down and smaller, under the rows, and with the third it is gone, the
     * tile all stars. By rows, as `scale` of the drawing and how far `down`
     * its middle goes, in shares of the tile; worked out against the rows'
     * feet, so that its ink keeps clear of them.
     */
    const MAKE_ROOM = [
        { scale: 1, down: 0 },
        { scale: 0.78, down: 0.13 },
        { scale: 0.4, down: 0.3 },
        { scale: 0.4, down: 0.3, gone: true }
    ];

    const placed = (tile, room) => ({
        transform: `translateY(${+(room.down * tile.size).toFixed(2)}px) scale(${room.scale})`,
        opacity: room.gone ? 0 : 1
    });

    // The tile and its drawing, the drawing where `room` puts it
    function plain(tile, room) {
        const at = placed(tile, room || MAKE_ROOM[0]);

        return `<span style="display: grid; place-items: center; width: ${tile.size}px; height: ${tile.size}px; background: ${COLOR}; color: #ffffff; border-radius: ${tile.radius}px;">
            <svg data-part="drawing" width="${tile.icon}" height="${tile.icon}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display: block; transform: ${at.transform}; opacity: ${at.opacity};">${DRAWING}</svg>
        </span>`;
    }

    /*
     * The tile with `count` stars won. `start` draws it as it stands before
     * it grows -- the stars and the rim there but not yet seen -- for show to
     * bring in.
     */
    function face(tile, count, start) {
        if (!count) return plain(tile);

        const rows = Math.min(STARS / ROW, Math.ceil(count / ROW));
        const shown = rows * ROW;
        const done = count >= STARS;

        const n = ++faces;
        const id = (name) => `search2-tile-${name}-${n}`;

        const unit = tile.size / 100;
        const room = MARGIN / unit;
        const hidden = 'opacity: 0; transform: scale(0);';

        const stars = SPOTS.slice(0, shown).map((star, i) => {
            const won = i < count;
            return `<g data-part="star" style="transform-box: fill-box; transform-origin: center; ${start ? hidden : ''}">
                <path d="${star}" fill="${won ? `url(#${id('gold')})` : EMPTY_FILL}" ${won ? `stroke="${GOLD_EDGE}" stroke-width="2.2" stroke-linejoin="round"` : ''} />
            </g>`;
        }).join('');

        const corner = tile.radius / unit + RIM_GAP;
        const ring = `x="${-RIM_GAP}" y="${-RIM_GAP}" width="${100 + 2 * RIM_GAP}" height="${100 + 2 * RIM_GAP}" rx="${corner}"`;

        const rim = done
            ? `<rect data-part="rim" ${ring} fill="none" stroke="${AMBER}" stroke-width="${RIM_WIDTH}" style="${start ? 'opacity: 0;' : ''}" />`
            : '';

        /*
         * And all nine shimmer: a band of light runs across the gold and the
         * rim every few seconds, as the snake's finished emblem does -- a
         * gradient drawn through a mask of the two and moved by SMIL, so that
         * the light goes with the markup whenever the catalog draws it again.
         * Not with motion turned down.
         */
        const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
        const shimmers = done && !start && !calm;

        const sheen = shimmers
            ? `<linearGradient id="${id('sheen')}" gradientUnits="userSpaceOnUse" x1="-30" y1="-15" x2="15" y2="30">
                <stop offset="0.3" stop-color="#ffffff" stop-opacity="0" />
                <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.9" />
                <stop offset="0.7" stop-color="#ffffff" stop-opacity="0" />
                <animateTransform attributeName="gradientTransform" type="translate" values="-40 -40; 150 150; 150 150" keyTimes="0; ${SHEEN_RUN / SHEEN_EVERY}; 1" dur="${SHEEN_EVERY}ms" repeatCount="indefinite" />
            </linearGradient>
            <mask id="${id('lit')}" maskUnits="userSpaceOnUse" x="${-room}" y="${-room}" width="${100 + 2 * room}" height="${100 + 2 * room}">
                <rect ${ring} fill="none" stroke="#ffffff" stroke-width="${RIM_WIDTH}" />
                ${SPOTS.map(star => `<path d="${star}" fill="#ffffff" stroke="#ffffff" stroke-width="2.2" stroke-linejoin="round" />`).join('')}
            </mask>`
            : '';

        const shine = shimmers
            ? `<rect x="${-room}" y="${-room}" width="${100 + 2 * room}" height="${100 + 2 * room}" fill="url(#${id('sheen')})" mask="url(#${id('lit')})" />`
            : '';

        return `<span style="position: relative; display: block; width: ${tile.size}px; height: ${tile.size}px;">
            ${plain(tile, start ? MAKE_ROOM[0] : MAKE_ROOM[rows])}
            <svg width="${tile.size + 2 * MARGIN}" height="${tile.size + 2 * MARGIN}" viewBox="${-room} ${-room} ${100 + 2 * room} ${100 + 2 * room}" aria-hidden="true"
                style="position: absolute; left: ${-MARGIN}px; top: ${-MARGIN}px; overflow: visible; pointer-events: none;">
                <defs>
                    <linearGradient id="${id('gold')}" x1="0" y1="0" x2="0" y2="1">
                        ${GOLD_STOPS.map(([at, colour]) => `<stop offset="${at}" stop-color="${colour}" />`).join('')}
                    </linearGradient>
                    ${sheen}
                </defs>
                ${rim}${stars}${shine}
            </svg>
        </span>`;
    }

    /*
     * The tile growing from the plain one to what it is, when the catalog
     * asks for it (see growTiles there): the stars come in one after
     * another, a row at a time, the gold ones with the empty ones, and the
     * drawing makes room as each row begins (see MAKE_ROOM); then the rim,
     * if all nine are won. Then the face is drawn again as it stands, the
     * light running across it.
     */
    const STAR_IN = 300;
    const STAR_GAP = 90;
    const RIM_IN = 320;

    function show(el, tile, log, how) {
        const actual = !how || how.actual !== false;
        const count = actual ? starsOf(log) : 0;
        const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (!count || !how || !how.animate || calm) {
            el.innerHTML = face(tile, count, false);
            return Promise.resolve();
        }

        el.innerHTML = face(tile, count, true);

        const stars = [...el.querySelectorAll('[data-part="star"]')];
        const runs = stars.map((star, i) => star.animate([
            { opacity: 0, transform: 'scale(0)', easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' },
            { opacity: 1, transform: 'scale(1.25)', offset: 0.6 },
            { opacity: 1, transform: 'scale(1)' }
        ], { duration: STAR_IN, delay: i * STAR_GAP, fill: 'forwards' }));

        // The drawing, a step for each row as its first star comes
        const drawing = el.querySelector('[data-part="drawing"]');
        const rows = stars.length / ROW;
        const total = stars.length * STAR_GAP + STAR_IN;

        /*
         * Each step over before the next row begins: a step as long as a
         * star's coming in ran into the next row's, which comes sooner, and
         * offsets that go back are an animation the browser refuses -- it
         * threw, the tile was left half grown with the drawing whole under
         * two rows of stars, and never settled (found 3 November 2026).
         */
        const STEP = Math.min(STAR_IN, ROW * STAR_GAP);

        if (drawing) {
            const frames = [Object.assign({ offset: 0 }, placed(tile, MAKE_ROOM[0]))];

            for (let r = 1; r <= rows; r++) {
                const at = (r - 1) * ROW * STAR_GAP;
                frames.push(Object.assign({ offset: at / total, easing: 'ease-in-out' }, placed(tile, MAKE_ROOM[r - 1])));
                frames.push(Object.assign({ offset: (at + STEP) / total }, placed(tile, MAKE_ROOM[r])));
            }
            frames.push(Object.assign({ offset: 1 }, placed(tile, MAKE_ROOM[rows])));

            runs.push(drawing.animate(frames, { duration: total, fill: 'forwards' }));
        }

        const rim = el.querySelector('[data-part="rim"]');
        if (rim) runs.push(rim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: RIM_IN, delay: total, fill: 'forwards' }));

        return Promise.all(runs.map(run => run.finished.catch(() => null))).then(() => {
            if (el.isConnected) el.innerHTML = face(tile, count, false);
        });
    }

    GAME_FACES.search2 = {
        title: 'Word search 2',
        show: show
    };
})();
