/*
 * The Snake tile's crest: what this set's records look like, drawn over the
 * tile the catalog puts the game on.
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
    const INSET = 5.2;
    const SEGMENT = 3.4;
    const HEAD = 4.8;

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
        track += `<circle cx="${round(centre + p.x)}" cy="${round(centre + p.y)}" r="0.8" />`;
    }

    // The tail at twelve o'clock, the body after it, the head last so that it is
    // drawn over whatever it has caught up with.
    let body = '';
    for (let slot = 0; slot < lit - 1; slot++) body += block(slot, SEGMENT);

    const head = block(lit - 1, HEAD);

    /*
     * And the record as a number, in the corner the icon leaves empty: its
     * snake climbs from the bottom left to the top right, and the top left is
     * the one quarter of the tile with nothing in it -- which is also where an
     * arcade screen keeps the score.
     *
     * The ring says how far the record has got; it cannot say what it is. A
     * reader who wants to beat thirty-four has to be told thirty-four, and a
     * quarter of a ring is anything from nine to eleven.
     *
     * Fitted between the ring and the icon's middle column, both read off the
     * geometry rather than written down: the icon's column stands at 12.6 of
     * its 24 units, and the ring's inner edge is the head's half-width in from
     * the track. Two digits at the size of the tile's label; three are made
     * smaller rather than allowed to reach the icon -- a record over a hundred
     * is rare, and it is the gold one, which says most of it already.
     *
     * White whatever the ring is drawn in. Gold on the tile's mint is a
     * colour, not a number anybody reads.
     *
     * A digit is taken as 0.7 of the font size across. Measured in the app's
     * own font it is 0.667 -- the figures are tabular, so every one of them is
     * that wide -- and the first guess of 0.62 let three of them run into the
     * icon by a pixel and a half. The rest is room for a platform whose bold
     * figures are a little wider than these.
     */
    const AIR = 1.2;
    const DIGIT = 0.7;
    const unit = icon / 24;
    const iconEdge = (size - icon) / 2;

    const left = INSET + HEAD / 2 + AIR;
    const right = iconEdge + 12.6 * unit - AIR;
    const digits = String(best).length;
    const fontSize = round(Math.min(12.3, (right - left) / (DIGIT * digits)));

    const score = `<text x="${round((left + right) / 2)}" y="${round(iconEdge + 8 * unit)}" text-anchor="middle" dominant-baseline="central"
        font-size="${fontSize}" font-weight="800" fill="currentColor" style="font-variant-numeric: tabular-nums;">${best}</text>`;

    return `<svg class="tile-crest" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true" style="display: block;">
        <g fill="currentColor" opacity="0.35">${track}</g>
        <g fill="${ink}">${body}</g>
        <g fill="${HEAD_INK}">${head}</g>
        ${score}
    </svg>`;
}
