/*
 * The Snake tile's crest: what this set's records look like, drawn as the face
 * of the tile the catalog puts the game on -- the icon included, see the end.
 *
 * A second snake, round the edge of the tile, as long as the longest the snake
 * has been in this set. It starts at twelve o'clock and grows clockwise, and at
 * the top of the scale it reaches its own tail: the ouroboros, the snake biting
 * its tail, which is about the oldest emblem there is with a snake in it -- and
 * an emblem is what this is meant to become.
 *
 * Here and not in the catalog, because the catalog knows no game by name -- see
 * registry.js, which hands this to it as `crest` beside the icon. Only the
 * catalog page loads it for now; the game page will want it the day the game
 * has something to show when a record falls.
 *
 * Drawn from the measurement and never from a stored achievement: `records` is
 * the game's own corner of `set.achievements`, and what is kept there is the
 * longest the snake has been -- see store.noteBest. Every number below that
 * turns that length into a picture lives in this file, so moving one of them
 * changes every tile at once and touches no saved data.
 */
function snakeCrest(tile, records) {
    const { size, radius, icon } = tile;

    // `length` is the name of the measurement, not an array's length: records
    // is the object { length: { best, at } }.
    const longest = records && records.length;
    if (!longest || !longest.best) return '';

    /*
     * How much of the ring a record fills, as stops along the way rather than
     * one straight line.
     *
     * A quarter of the ring at 10, half at 20, three quarters at 35, the whole
     * of it at 50 -- straight between the stops. The early quarters come
     * cheaply on purpose: the first time anybody sees this is right after a
     * first game, and a ring that has visibly started is the whole of the
     * explanation. The last quarter costs as much as the first two together,
     * because closing the ring is the thing worth reaching for.
     *
     * Fifty because a run is ten words: a whole run spelled out without a
     * crash comes to about that, so the closed ring means a set played
     * through in one go.
     */
    const STOPS = [[0, 0], [10, 0.25], [20, 0.5], [35, 0.75], [50, 1]];

    // And past the closed ring, one more step: the ring turns gold at twice the
    // length that closed it.
    const GOLD_AT = 100;
    const GOLD = '#ffe066';

    const share = (best) => {
        for (let i = 1; i < STOPS.length; i++) {
            const [toLength, toShare] = STOPS[i];
            if (best > toLength) continue;

            const [fromLength, fromShare] = STOPS[i - 1];
            return fromShare + (toShare - fromShare) * (best - fromLength) / (toLength - fromLength);
        }

        return 1;
    };

    /*
     * The ring itself: a track inset from the tile's edge and rounded about the
     * same centres the tile's own corners are, so it runs parallel to the edge
     * all the way round instead of cutting the corners.
     *
     * Five pixels in, which leaves the 32-pixel icon in the middle four pixels
     * of air on every side. Closer to the edge the corners' segments start to
     * be clipped by the tile's own rounding; further in, the ring and the icon
     * touch.
     */
    /*
     * Every length placed by hand here was placed on a tile of 57.6 and is
     * scaled to the tile it is handed: the tile came down to fifty on
     * 26 October 2026, so that five fit in a row (see TILE in catalog.js), and
     * a record laid out for the larger one ran its drawing into the ring. The
     * ring's own course is worked out from the tile and needs no scaling.
     */
    const k = size / 57.6;

    const INSET = 5.2 * k;
    const SEGMENT = 3.4 * k;
    const HEAD = 4.8 * k;

    /*
     * The head in the colour the board draws it in, which is what makes the
     * ring a snake and not a dotted frame: everything else on the tile is the
     * icon's white, and a white head a pixel larger than the links behind it
     * was a head to whoever already knew it was there. The accent, the same in
     * both themes on purpose -- see tokens.js -- read from the light set only
     * because one of the two has to be named.
     */
    const HEAD_INK = tokens.of(false).accent;

    const half = size / 2 - INSET;             // centre to the track's straight runs
    const bend = Math.max(0, radius - INSET);  // the track's corner radius
    const run = half - bend;                   // half of one straight run
    const arc = Math.PI * bend / 2;
    const perimeter = 8 * run + 4 * arc;

    // As many links as fit at the pitch of the icon's own segments, scaled
    // down -- a pixel of air between two of them.
    const SLOTS = Math.round(perimeter / (SEGMENT + 1.2));

    /*
     * A point on the track, distance d from twelve o'clock, and the direction
     * the track runs there -- clockwise, which on a screen is the sweep a clock
     * hand makes. Measured from the tile's centre.
     *
     * Nine pieces: half the top run, then a corner and a run four times over,
     * and the other half of the top run to come back to the start.
     */
    const along = (d) => {
        const pieces = [
            { len: run, at: (t) => [t, -half], deg: 0 },
            { len: arc, corner: [run, -run], from: -90 },
            { len: 2 * run, at: (t) => [half, -run + t], deg: 90 },
            { len: arc, corner: [run, run], from: 0 },
            { len: 2 * run, at: (t) => [run - t, half], deg: 180 },
            { len: arc, corner: [-run, run], from: 90 },
            { len: 2 * run, at: (t) => [-half, run - t], deg: 270 },
            { len: arc, corner: [-run, -run], from: 180 },
            { len: run, at: (t) => [-run + t, -half], deg: 0 }
        ];

        for (const piece of pieces) {
            if (d <= piece.len || piece === pieces[pieces.length - 1]) {
                if (piece.at) {
                    const [x, y] = piece.at(d);
                    return { x, y, deg: piece.deg };
                }

                const deg = piece.from + (bend ? d / bend : 0) * 180 / Math.PI;
                const rad = deg * Math.PI / 180;

                return {
                    x: piece.corner[0] + bend * Math.cos(rad),
                    y: piece.corner[1] + bend * Math.sin(rad),
                    deg: deg + 90
                };
            }

            d -= piece.len;
        }
    };

    const best = longest.best;
    const lit = Math.min(SLOTS, Math.max(1, Math.round(share(best) * SLOTS)));
    const ink = best >= GOLD_AT ? GOLD : 'currentColor';

    const round = (v) => Number(v.toFixed(2));
    const centre = size / 2;

    const block = (slot, side) => {
        const p = along(slot * perimeter / SLOTS);

        return `<rect x="${round(-side / 2)}" y="${round(-side / 2)}" width="${side}" height="${side}" rx="${round(side / 4)}"
            transform="translate(${round(centre + p.x)} ${round(centre + p.y)}) rotate(${round(p.deg)})" />`;
    };

    /*
     * The way still to go, as a dotted line along the ring: the goal is the
     * shape, and a ring nobody can see the rest of is an arc going nowhere in
     * particular. Faint, so that the snake on it is the thing that is read.
     */
    let track = '';
    for (let slot = lit; slot < SLOTS; slot++) {
        const p = along(slot * perimeter / SLOTS);
        track += `<circle cx="${round(centre + p.x)}" cy="${round(centre + p.y)}" r="${round(0.8 * k)}" />`;
    }

    // The tail at twelve o'clock, the body after it, the head last so that it is
    // drawn over whatever it has caught up with.
    let body = '';
    for (let slot = 0; slot < lit - 1; slot++) body += block(slot, SEGMENT);

    const head = block(lit - 1, HEAD);

    /*
     * And the record in words, at the top of the tile and in the middle of it:
     * "MAX" and the number under it, which is the way the game's own header
     * says it -- see view.draw in snake.js. The two should read as one figure
     * seen in two places, so the player who taps this tile to beat it finds it
     * again over the board.
     *
     * The ring says how far the record has got; it cannot say what it is. A
     * reader who wants to beat thirty-four has to be told thirty-four, and a
     * quarter of a ring is anything from nine to eleven.
     *
     * The number at the size of the tile's label and the word at half of it:
     * the word is there to say what the number is, once, and after that it is
     * the number that is looked at. White whatever the ring is drawn in --
     * gold on the tile's mint is a colour, not a number anybody reads.
     *
     * In the middle rather than in a corner, which is where it stood first:
     * the top left quarter the icon leaves empty, fitted between the ring and
     * the icon's middle column. That gave three digits under eight pixels, and
     * put a figure the size of a fingernail off to one side of a tile that is
     * otherwise drawn about its centre.
     */
    const LABEL = round(6.2 * k);
    const FIGURE = round(12.3 * k);

    const label = `<text x="${round(centre)}" y="${round(12.4 * k)}" text-anchor="middle" dominant-baseline="central"
        font-size="${LABEL}" font-weight="800" letter-spacing="${round(0.4 * k)}" fill="currentColor">MAX</text>`;
    const score = `<text x="${round(centre)}" y="${round(19.8 * k)}" text-anchor="middle" dominant-baseline="central"
        font-size="${FIGURE}" font-weight="800" fill="currentColor" style="font-variant-numeric: tabular-nums;">${best}</text>`;

    /*
     * The game's own drawing, smaller and lower, in what is left under the
     * record.
     *
     * The crest is the whole of the tile's face and not a layer under the
     * icon: a record needs the middle of the top, and the icon at its full
     * size has its column and its food standing there. It is the catalog's
     * icon all the same -- handed in, not drawn again here -- so the snake on
     * a tile with a record is the snake on every other tile, cut to the room
     * it has.
     *
     * Twenty-two across on a tile of 57.6, which takes it from under the
     * number to the ring's inner edge with a pixel and a half to spare at each
     * end. A round left open no longer touches any of it: since 26 October
     * 2026 the name under the tile says so, and the tile stays as it is --
     * see CONTINUE in catalog.js.
     */
    const ICON = Math.round(22 * k);
    const drawing = `<g transform="translate(${round(centre - ICON / 2)} ${round(26.4 * k)})">${icon(ICON)}</g>`;

    return `<svg class="tile-crest" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true" style="display: block;">
        <g fill="currentColor" opacity="0.35">${track}</g>
        <g fill="${ink}">${body}</g>
        <g fill="${HEAD_INK}">${head}</g>
        ${label}
        ${score}
        ${drawing}
    </svg>`;
}
