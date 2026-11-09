/**
 * "Word search": the words of a run hidden in a grid of letters, each phrase
 * a snake of cells, found by tracing it, and every one found asked about --
 * which of these is its translation.
 *
 * Brought over from searchlines, the owner's own game of April 2026, on
 * 8 November 2026. The question after a find is searchlines'; the words, the
 * ladder, the saving, the voice and the star are the app's, and nothing of
 * the old file's own spaced repetition came along. The same evening the words
 * stopped running in straight lines, searchlines' way, and began to bend:
 * a long word made everything small. See docs/ARCHITECTURE.md, "Word search",
 * for every decision below and why.
 */
function search(container) {
    /*
     * How many words and phrases a run takes at most: as many as fit the
     * screen, and never more than this. Ten, as in the other games -- and ten
     * dots are what the header holds in the popup.
     */
    const MOST_PHRASES = 10;

    /*
     * The two limits of the screen, in layout pixels: the side of a cell of
     * the grid and the type size of the words above it. A run takes words for
     * as long as both still fit at these, and then both grow by the same
     * factor until the screen is full -- the owner's calls, 8 November 2026.
     * One pair for every device, to be calibrated by playing.
     *
     * And the most either may grow to, so that three words on a phone do not
     * come out as a poster.
     */
    const MIN_CELL = 30;
    const MAX_CELL = 46;
    const MIN_FONT = 11;
    const MAX_FONT = 16.5;

    // Between the words and the grid, and under the grid to the window's edge
    const GRID_GAP = 8.5;
    const FOOT = 10.2;

    /*
     * Chrome stops a popup at 600 screen pixels, and a popup is as tall as its
     * contents -- so the window's own height is the height the page already
     * has, and cannot be what it is allowed. The same reasoning as Snake's
     * board, see the column it is drawn in.
     */
    const POPUP_MOST = 600;

    // How many answers the question after a find offers: one more than the
    // phrase's stage -- searchlines' stage wrong ones and the right one --
    // two at the least and six at the most (the owner's call, 9 November
    // 2026). Until then the quiz's, stage + 2: three on the first day after
    // the word was met
    const LEAST_OPTIONS = 2;
    const MOST_OPTIONS = 6;

    // After a right answer, and after the last word of the run
    const NEXT_AFTER = 700;

    /*
     * What a word shows of itself above the grid, by its stage, on the app's
     * fifteen steps -- searchlines' four masks laid on the meaning of the
     * ladder (the owner's call, 8 November 2026):
     *
     *   0-1   the word itself: the day of meeting, find what you see;
     *   2-5   the translation only: the same evening, recall the word;
     *   6-7   neither: find any word of the set you remember;
     *   8+    the translation, and the words in a set order once every word
     *         of the run is up there -- see ORDERED_FROM.
     *
     * The translation hidden is what the question after the find asks for,
     * so it shows only when the word is done.
     */
    const ORDERED_FROM = 8;

    function maskFor(stage) {
        if (stage <= 1) return { original: false, translation: true };
        if (stage <= 5) return { original: true, translation: false };
        if (stage <= 7) return { original: true, translation: true };
        return { original: true, translation: false };
    }

    /*
     * How a phrase steps from a letter to the next, by its stage -- the
     * difficulty every game here takes from the stage: to the cell beside,
     * above or below, any of the four, until DIAGONAL_FROM, and across a
     * corner too from there, the words of a month and more (the owner's
     * call, 8 November 2026).
     *
     * Two rungs where the straight lines had three, with "forward" mirrored
     * for a script written from the right: a snake goes every way along a
     * row or a column anyway, so there is no forward left to keep.
     */
    const DIAGONAL_FROM = 10;

    const ORTHOGONAL = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    const EVERY_WAY = ORTHOGONAL.concat([[1, 1], [1, -1], [-1, 1], [-1, -1]]);

    const stepsFor = (phrase) => (phrase.stage >= DIAGONAL_FROM ? EVERY_WAY : ORTHOGONAL);

    /*
     * The colour of each word's line, by its place in the run: ten that are
     * not each other, drawn under the letters at half strength. Not the stage
     * ramp, which already means something on this screen -- the colour a word
     * done takes on.
     */
    const LINE_COLOURS = ['#1e9bff', '#35d16b', '#c62ff7', '#ff9f1c', '#ff4f8b', '#16c7c7', '#8f7bff', '#d8b800', '#ff6b4a', '#4cc0ff'];
    const LINE_OPACITY = 0.5;

    let state = getEmptyState();
    let palette = {};

    /*
     * `paths` are the words found, each the cells it was traced through.
     * Until the words began to bend (8 November 2026) a find was a line from
     * one cell to another and was saved as `lines`; the new name is what
     * keeps a run saved then from being read as paths -- it opens with its
     * finds unmarked on the grid, and no translation was written for it
     * (the owner's call: no migration for a game a day old).
     */
    function getEmptyState() {
        return {
            selectedSetId: null, allowEarly: false,
            sessionPool: null, sessionAt: null, sessionResults: [],
            phrases: [], grid: null, found: [], paths: [], peeked: [], shown: [],
            struck: [], missed: [], asking: null, ordered: false
        };
    }

    /* ---------------------------------------------------------------- star */

    /*
     * The star of the run -- the owner's design, 8 November 2026. For the
     * game's first day it was Quiz's: a star beside a row of dots in the
     * header, filled by a run of right answers. Now nothing is over the grid
     * while the run goes, and at its end a star comes up in the middle of the
     * grid and is filled by the phrases done right, as the snake's goblet is
     * by its red hearts: a copy of each flies out of the board into it, a
     * share of it each. Only a run with every phrase right fills it; then it
     * shines, goes into the set's achievements and stays.
     *
     * The wrong ones come after, the owner's order: all the right ones first,
     * filling it gold from the foot, then a pause, then the wrong ones, each
     * filling its share in red over the gold. Then the red runs down the
     * whole star, over the gold, from the top to the foot, and the star
     * dissolves: a part of it red is all of it spoilt (the owner's calls).
     * Until the same evening it turned red all at once when the right ones
     * were in, and the wrong ones never flew.
     *
     * Right is what writes 1 (see score): the first answer right, nothing
     * peeked at. A phrase found again after a wrong answer is done, but it
     * does not fly.
     *
     * Written out here rather than shared with the snake or Quiz -- the
     * owner's rule: each game's achievements are its own, and may go their
     * own ways.
     */
    const STAR_GOLD = '#f5bf3a';
    const STAR_SHARE = 0.46;      // of the grid's width
    const STAR_IN = 520;          // up out of nothing
    const POUR_WAIT = 150;
    const POUR_GAP = 160;
    const POUR_SPAN = 1600;       // however many there are, poured in this
    const POUR_FLIGHT = 500;
    const FILLED_REST = 250;
    const SHINE_EVERY = 2600;
    const WRONG_PAUSE = 450;      // between the right ones and the wrong
    const SPOIL = 650;            // the red running down
    const DISSOLVE = 900;

    const STAR_TIP_ROUND = 3.3;
    const STAR_HOLLOW_ROUND = 1.5;
    const STAR_CORNERS = [[12, 2], [15.09, 8.26], [22, 9.27], [17, 14.14], [18.18, 21.02], [12, 17.77], [5.82, 21.02], [7, 14.14], [2, 9.27], [8.91, 8.26]];

    const { STAR_PATH, STAR_BOX } = (() => {
        const toward = (from, to, by) => {
            const dx = to[0] - from[0];
            const dy = to[1] - from[1];
            const length = Math.hypot(dx, dy);
            return [from[0] + dx / length * by, from[1] + dy / length * by];
        };

        const n = STAR_CORNERS.length;
        const turns = STAR_CORNERS.map((corner, i) => ({
            from: toward(corner, STAR_CORNERS[(i + n - 1) % n], i % 2 ? STAR_HOLLOW_ROUND : STAR_TIP_ROUND),
            corner,
            to: toward(corner, STAR_CORNERS[(i + 1) % n], i % 2 ? STAR_HOLLOW_ROUND : STAR_TIP_ROUND)
        }));

        const xy = (p) => p.map(c => +c.toFixed(2)).join(' ');
        const path = 'M' + xy(turns[0].from)
            + turns.map((t, i) => (i ? 'L' + xy(t.from) : '') + 'Q' + xy(t.corner) + ' ' + xy(t.to)).join('')
            + 'Z';

        const seen = [];
        turns.forEach(({ from, corner, to }) => {
            for (let k = 0; k <= 20; k++) {
                const t = k / 20;
                const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
                seen.push([a * from[0] + b * corner[0] + c * to[0], a * from[1] + b * corner[1] + c * to[1]]);
            }
        });

        const round = (v) => +v.toFixed(2);
        const x = round(Math.min(...seen.map(p => p[0])));
        const y = round(Math.min(...seen.map(p => p[1])));

        return {
            STAR_PATH: path,
            STAR_BOX: { x, y, width: round(Math.max(...seen.map(p => p[0])) - x), height: round(Math.max(...seen.map(p => p[1])) - y) }
        };
    })();

    /*
     * How high the fill stands, in shares of the star's box, for `share` of
     * its area. The star is wide through the middle and a point at the top:
     * by height alone the last quarter was the tip, and two wrong phrases of
     * eight showed as a red point hardly to be seen (8 November 2026). Worked
     * out once from the star's corners, a slice at a time from the foot.
     */
    const STAR_SLICES = 200;

    const STAR_AREA = (() => {
        const top = STAR_BOX.y;
        const foot = STAR_BOX.y + STAR_BOX.height;
        const n = STAR_CORNERS.length;
        const widths = [];

        for (let k = 0; k < STAR_SLICES; k++) {
            const y = foot - (k + 0.5) * (foot - top) / STAR_SLICES;
            const xs = [];

            for (let i = 0; i < n; i++) {
                const [x1, y1] = STAR_CORNERS[i];
                const [x2, y2] = STAR_CORNERS[(i + 1) % n];
                if ((y1 <= y) !== (y2 <= y)) xs.push(x1 + (y - y1) / (y2 - y1) * (x2 - x1));
            }

            xs.sort((a, b) => a - b);
            let width = 0;
            for (let i = 0; i + 1 < xs.length; i += 2) width += xs[i + 1] - xs[i];
            widths.push(width);
        }

        const whole = widths.reduce((a, b) => a + b, 0);
        let below = 0;
        return widths.map(w => (below += w) / whole);
    })();

    function levelOf(share) {
        if (share <= 0) return 0;
        if (share >= 1) return 1;
        return (STAR_AREA.findIndex(a => a >= share) + 1) / STAR_SLICES;
    }

    /*
     * The star: its body in the card's colour, so that the letters under it
     * do not show through; the gold, a rectangle clipped to the star and
     * scaled up from its foot; the red, another such under the gold, scaled
     * to the gold and the wrong ones together, so that it shows over the
     * gold's top; the red again over the gold, scaled down from the top, for
     * its running down the whole star; and the edge over all of it.
     */
    function endStarHtml() {
        return `<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true" style="display: block; overflow: visible;">
            <defs>
                <linearGradient id="search-end-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a0" /><stop offset="0.6" stop-color="${STAR_GOLD}" /><stop offset="1" stop-color="#e3a51c" /></linearGradient>
                <linearGradient id="search-end-red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a80" /><stop offset="0.6" stop-color="#e53935" /><stop offset="1" stop-color="#b71c1c" /></linearGradient>
                <linearGradient id="search-end-glint" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity="0" /><stop offset="0.5" stop-color="#ffffff" stop-opacity="0.85" /><stop offset="1" stop-color="#ffffff" stop-opacity="0" /></linearGradient>
                <clipPath id="search-end-shape"><path d="${STAR_PATH}" /></clipPath>
            </defs>
            <path d="${STAR_PATH}" fill="${palette.surface}" />
            <g clip-path="url(#search-end-shape)">
                ${['wrong', 'fill'].map(cls => `<rect class="search-end-${cls}" x="${STAR_BOX.x}" y="${STAR_BOX.y}" width="${STAR_BOX.width}" height="${STAR_BOX.height}" fill="url(#search-end-${cls === 'fill' ? 'gold' : 'red'})" style="transform-box: fill-box; transform-origin: 50% 100%; transform: scaleY(0); transition: transform 0.3s ease-out;" />`).join('')}
                <rect class="search-end-spoil" x="${STAR_BOX.x}" y="${STAR_BOX.y}" width="${STAR_BOX.width}" height="${STAR_BOX.height}" fill="url(#search-end-red)" style="transform-box: fill-box; transform-origin: 50% 0%; transform: scaleY(0);" />
                <rect class="search-end-glint" x="-4" y="0" width="5" height="24" fill="url(#search-end-glint)" style="transform-box: fill-box; transform-origin: center; transform: skewX(-20deg); opacity: 0;" />
            </g>
            <path d="${STAR_PATH}" fill="none" stroke="${palette.starEdge}" stroke-width="0.9" stroke-linejoin="round" />
        </svg>`;
    }

    const pause = (ms) => new Promise(done => setTimeout(done, ms));

    // Whether the ending's star was full, for the screen drawn again under it
    let overFull = false;

    /*
     * The run's end: the run is closed at once (page.endSession) and a press
     * anywhere goes back to the sets (showOver) -- the star is something to
     * watch, not to wait for.
     */
    async function endRun() {
        const right = state.sessionResults.map((r, i) => (r === 'correct' ? i : -1)).filter(i => i >= 0);
        const wrong = state.sessionResults.map((r, i) => (r === 'correct' ? -1 : i)).filter(i => i >= 0);
        const total = state.sessionResults.length;
        const full = !wrong.length;

        over = true;
        overFull = full;

        if (full) store.achieve(state.selectedSetId, 'search', 'star', total);
        page.endSession();
        showOver();

        const grid = appRect(svg);
        const size = grid.width * STAR_SHARE;
        const middle = [grid.left + grid.width / 2, grid.top + grid.height / 2];

        const star = $(container, `<div class="search-end-star" aria-hidden="true" style="position: fixed; left: ${middle[0] - size / 2}px; top: ${middle[1] - size / 2}px; width: ${size}px; height: ${size}px; z-index: 10; pointer-events: none;">${endStarHtml()}</div>`);
        const gold = star.querySelector('.search-end-fill');
        const red = star.querySelector('.search-end-wrong');

        if (still()) {
            if (full) gold.style.transform = 'scaleY(1)';
            else star.remove();
            return;
        }

        // A start for each one that lands -- by transform, which every
        // browser animates (an old phone's did not know the scale property)
        const bump = () => star.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'ease-out' });

        // Bubbles one after another into the star, `landed` told how many are in
        const pour = (list, landed) => {
            const gap = Math.min(POUR_GAP, POUR_SPAN / Math.max(1, list.length - 1));
            let poured = 0;
            return Promise.all(list.map((i, k) => pause(k * gap).then(() => pourInto(i, middle)).then(() => landed(++poured))));
        };

        await star.animate([
            { transform: 'scale(0.2)', opacity: 0, easing: 'ease-out' },
            { transform: 'scale(1.12)', opacity: 1, offset: 0.6, easing: 'ease-in-out' },
            { transform: 'scale(1)', opacity: 1 }
        ], { duration: STAR_IN }).finished.catch(() => null);

        await pause(POUR_WAIT);

        await pour(right, (n) => {
            gold.style.transform = `scaleY(${levelOf(n / total)})`;
            bump();
            bubblePop(n * 2, 0);
        });

        if (full) {
            await pause(FILLED_REST);
            chime(14);

            star.animate([
                { filter: 'drop-shadow(0 0 0px rgba(255, 214, 92, 0))', transform: 'scale(1)' },
                { filter: 'drop-shadow(0 0 18px rgba(255, 214, 92, 0.9))', transform: 'scale(1.06)', offset: 0.5 },
                { filter: 'drop-shadow(0 0 0px rgba(255, 214, 92, 0))', transform: 'scale(1)' }
            ], { duration: SHINE_EVERY, iterations: Infinity, easing: 'ease-in-out' });

            star.querySelector('.search-end-glint').animate([
                { transform: 'translateX(0px) skewX(-20deg)', opacity: 1 },
                { transform: 'translateX(30px) skewX(-20deg)', opacity: 1, offset: 0.55 },
                { transform: 'translateX(30px) skewX(-20deg)', opacity: 0 }
            ], { duration: SHINE_EVERY, iterations: Infinity, easing: 'ease-in-out' });
            return;
        }

        // The wrong ones, in red over the gold, each a step lower
        await pause(WRONG_PAUSE);

        await pour(wrong, (n) => {
            red.style.transform = `scaleY(${levelOf((right.length + n) / total)})`;
            bump();
            bubblePop(-3 * n, 0);
        });

        // The red runs down the whole of it, over the gold, with a falling
        // tone; and the star, spoilt, dissolves
        await pause(FILLED_REST);
        lose();

        await star.querySelector('.search-end-spoil').animate([
            { transform: 'scaleY(0)' },
            { transform: 'scaleY(1)' }
        ], { duration: SPOIL, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => null);

        await pause(FILLED_REST);
        pop(0, 0.12, 0.6);

        gone(star, star.animate([
            { transform: 'scale(1)', opacity: 1, filter: 'blur(0px)' },
            { transform: 'scale(1.2)', opacity: 0, filter: 'blur(8px)' }
        ], { duration: DISSOLVE, easing: 'ease-in', fill: 'forwards' }));
    }

    /*
     * A phrase done right, poured into the star: a copy of its bubble flies
     * out of the board in an arc, shrinking, and is gone into the star -- the
     * board keeps the phrase where it stands, to be looked at.
     */
    function pourInto(i, to) {
        const bubble = board.querySelector(`.search-bubble[data-phrase="${i}"]`);
        if (!bubble) return Promise.resolve();

        const box = appRect(bubble);
        const copy = bubble.cloneNode(true);
        copy.className = 'search-pour';
        ['data-press', 'data-phrase', 'title'].forEach(name => copy.removeAttribute(name));
        Object.assign(copy.style, {
            position: 'fixed', left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px`,
            margin: '0', zIndex: '11', pointerEvents: 'none', fontSize: board.style.fontSize
        });
        container.appendChild(copy);

        const dx = to[0] - (box.left + box.width / 2);
        const dy = to[1] - (box.top + box.height / 2);

        return copy.animate([
            { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
            { transform: `translate(${dx / 2}px, ${dy / 2 - 30}px) scale(0.75)`, opacity: 1, offset: 0.45 },
            { transform: `translate(${dx}px, ${dy}px) scale(0.2)`, opacity: 0.5 }
        ], { duration: POUR_FLIGHT, easing: 'ease-in-out' }).finished.catch(() => null).then(() => copy.remove());
    }

    /* --------------------------------------------------------------- words */

    function escapeText(text) {
        return String(text)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /*
     * What goes into the grid of a word: its letters as a reader counts them
     * (speech.letters -- a cell is a grapheme, so न्न and 각 are one cell
     * each), and only letters and digits. The apostrophe of "don't" and the
     * hyphen of "lie-in" stay on the word above the grid and out of it:
     * searchlines laid them as words of their own, and a "!" was a cell to be
     * found.
     *
     * Kept as written, and shown in capitals unless the player switched them
     * off in the settings (the owner's call, 9 November 2026; until then
     * they were capitals, and stored so) -- see look. Upper case only where
     * that leaves one letter, as Snake has it: 'ß' becomes 'SS', and a cell
     * holds one. In the set's language, so that Turkish i comes out dotted.
     */
    const LETTER = /[\p{L}\p{N}]/u;

    function shownAs(letter, lang) {
        let upper = letter;

        try {
            upper = letter.toLocaleUpperCase(lang || undefined);
        } catch (e) {
            upper = letter.toUpperCase();
        }

        return speech.letters(upper).length === 1 ? upper : letter;
    }

    const lettersOf = (text) => speech.letters(text).filter(g => LETTER.test(g));

    /*
     * A letter of the grid as it is shown, and as a pick is compared to the
     * words by: what is seen is what is matched, so that two cells that look
     * the same spell the same. A run dealt before the setting came keeps
     * the capitals it stored, whatever the setting says.
     */
    const caps = () => page.setting('searchCaps', true);

    const runLang = () => (state.sessionPool && state.sessionPool[0] && state.sessionPool[0].originalLang) || undefined;

    const look = (letter) => (caps() ? shownAs(letter, runLang()) : letter);

    /*
     * How much of the grid's font a letter is drawn at to stay inside its
     * mark: 1 for nearly every letter there is, less for one that would
     * spill out -- the owner's call, 9 November 2026, after Tamil syllables
     * ran into the cells beside them. A syllable of Tamil, Malayalam,
     * Kannada or Telugu is a consonant with its vowel signs either side --
     * போ, ಹೋ, ത്തേ -- two to three Latin letters wide; measured over the
     * forty-nine languages of the starter sets, those four and Marathi drew
     * wider than a cell, and Bengali, Gujarati and Hindi came near its edge.
     *
     * Measured by ink, and by a canvas, which measures without drawing: the
     * font of the grid at ten times its size, so the figures are in tenths
     * of the grid's units. Round the middle of the cell, where the letter
     * is centred (dominant-baseline central), so a letter shrunk stays where
     * the others stand. Once a letter, for the page.
     */
    const letterFits = new Map();
    let measure = null;

    function letterFit(letter) {
        if (letterFits.has(letter)) return letterFits.get(letter);

        if (!measure) {
            measure = document.createElement('canvas').getContext('2d');
            measure.font = `700 54px ${getComputedStyle(document.body).fontFamily}`;
            measure.textAlign = 'center';
            measure.textBaseline = 'middle';
        }

        const m = measure.measureText(letter);
        // The mark less 0.3 of a unit either side, in tenths: the mark is
        // what the letter has to fit in, outliers and marks and all (see
        // MARK_SIDE, declared further down and read only once the grid is
        // drawn)
        const half = (MARK_SIDE - 0.6) * 10 / 2;
        const across = Math.max(m.actualBoundingBoxLeft, m.actualBoundingBoxRight);
        const down = Math.max(m.actualBoundingBoxAscent, m.actualBoundingBoxDescent);
        const fit = Math.min(1, across ? half / across : 1, down ? half / down : 1);

        letterFits.set(letter, fit);
        return fit;
    }

    // The font-size of a letter that has to come down, for its <text>
    const letterSize = (letter) => {
        const fit = letterFit(letter);
        return fit < 1 ? ` font-size="${+(5.4 * fit).toFixed(2)}"` : '';
    };

    /*
     * A word or a phrase of the set as this game needs it: the parts its line
     * is written in, the words of it to be found -- one after another along
     * its snake, each traced on its own and in order, as searchlines found
     * them -- and what it shows of itself.
     *
     * Words as speech.words cuts them, which is at spaces: a Chinese phrase
     * with no spaces in it is one word to find.
     */
    function phraseOf(item) {
        const stage = spacedRepetitions.getWordStats(item.word).stage || 0;
        const lang = item.originalLang;
        const parts = [];
        const tokens = [];

        speech.words(item.word.original || '').forEach(part => {
            const letters = part.isWord ? lettersOf(part.text) : [];

            if (letters.length) {
                parts.push({ text: part.text, token: tokens.length });
                tokens.push(letters);
            } else {
                parts.push({ text: part.text, token: null });
            }
        });

        const mask = maskFor(stage);

        return {
            parts, tokens, stage,
            hideOriginal: mask.original,
            hideTranslation: mask.translation && !!item.word.translation
        };
    }

    // Every letter of a phrase: the length of its snake
    const lengthOf = (phrase) => phrase.tokens.reduce((sum, t) => sum + t.length, 0);

    /* ---------------------------------------------------------------- grid */

    /*
     * The grid: GRID_SIDE cells a side, whatever the run -- the owner's call,
     * 8 November 2026, when the words began to bend. A straight word needed
     * a side as long as itself: fifteen letters on a popup 335 across made
     * cells too small to read, and the words above the grid, growing by the
     * same factor (see fit), stayed small with them. A snake folds into any
     * square, and eight cells across that popup are 42 pixels each.
     *
     * Bigger only for a first phrase that does not go into it alone -- see
     * deal.
     */
    const GRID_SIDE = 8;

    /*
     * A phrase lies as one snake, the owner's design: its words one after
     * another, each beginning in a cell next to the last letter of the one
     * before, so that the next word of a phrase is found where the last one
     * ended. Each word is still traced on its own.
     *
     * The snake goes on straight STRAIGHT_ON of the times it can, and turns
     * otherwise: one turning at every letter cannot be followed by eye, and
     * a straight one could not fold. Walked depth first, backing out of dead
     * ends, for at most SNAKE_STEPS steps before the try is given up -- a
     * snake that will not go into what is left only gets slower to fail.
     *
     * No two phrases share a cell, and no two steps across corners cross in
     * one square of four. A letter shared on a bend is not seen as shared --
     * the straight lines crossed only so that a tight grid could be made at
     * all -- and two lines crossing make an X neither can be followed through.
     */
    const STRAIGHT_ON = 2 / 3;
    const SNAKE_STEPS = 600;

    function shuffled(list) {
        const out = list.slice();
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
    }

    // A grid with nothing in it yet: which cells are taken, which squares of
    // four a step across a corner has crossed, and each phrase's snake
    function emptyLay(side) {
        return { rows: side, cols: side, taken: new Array(side * side).fill(false), slants: new Set(), snakes: [] };
    }

    function copyLay(lay) {
        return { ...lay, taken: lay.taken.slice(), slants: new Set(lay.slants), snakes: lay.snakes.slice() };
    }

    const freeIn = (lay) => lay.taken.reduce((n, t) => n + (t ? 0 : 1), 0);

    // A snake `length` cells long in what `lay` has left, or null
    function snakeIn(lay, length, steps) {
        const { rows, cols, taken, slants } = lay;
        const path = [];
        const mine = new Set();
        const crossed = [];
        let left = SNAKE_STEPS;

        function walk(at, way) {
            if (left-- <= 0) return false;

            path.push(at);
            mine.add(at);
            if (path.length === length) return true;

            const r = Math.floor(at / cols);
            const c = at % cols;

            let ways = shuffled(steps.map((_, k) => k).filter(k => k !== way));
            if (way >= 0) ways = Math.random() < STRAIGHT_ON ? [way].concat(ways) : ways.concat([way]);

            for (const k of ways) {
                const [dr, dc] = steps[k];
                const nr = r + dr;
                const nc = c + dc;
                if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;

                const next = nr * cols + nc;
                if (taken[next] || mine.has(next)) continue;

                const square = dr && dc ? Math.min(r, nr) * cols + Math.min(c, nc) : -1;
                if (square >= 0 && (slants.has(square) || crossed.includes(square))) continue;

                if (square >= 0) crossed.push(square);
                if (walk(next, k)) return true;
                if (square >= 0) crossed.pop();

                if (left <= 0) break;
            }

            path.pop();
            mine.delete(at);
            return false;
        }

        const starts = shuffled(taken.map((t, k) => (t ? -1 : k)).filter(k => k >= 0));

        for (const start of starts) {
            if (walk(start, -1)) return { path, crossed };
            if (left <= 0) break;
        }

        return null;
    }

    // Phrase `i` laid into `lay`, which it changes; false when it does not go
    function layIn(lay, phrase, i) {
        const snake = snakeIn(lay, lengthOf(phrase), stepsFor(phrase));
        if (!snake) return false;

        snake.path.forEach(k => { lay.taken[k] = true; });
        snake.crossed.forEach(square => lay.slants.add(square));
        lay.snakes[i] = snake.path;
        return true;
    }

    /*
     * The phrases laid afresh into a grid `side` cells a side, or null when
     * TRIES tries did not manage it. Longest first, the way these puzzles
     * are made: the long one has the fewest places it can go, and the short
     * ones fill what it leaves.
     */
    const TRIES = 12;

    function layOut(phrases, side) {
        const order = phrases.map((_, i) => i).sort((a, b) => lengthOf(phrases[b]) - lengthOf(phrases[a]));

        for (let k = 0; k < TRIES; k++) {
            const lay = emptyLay(side);
            if (order.every(i => layIn(lay, phrases[i], i))) return lay;
        }

        return null;
    }

    /*
     * Phrase `i` added to a grid the others already lie in: into the room
     * they left, a few tries, and only then all of them laid again -- their
     * snakes, random as they are, may have left that room in pieces too
     * small for it.
     */
    const ADD_TRIES = 4;

    function layMore(lay, phrases, i) {
        for (let k = 0; k < ADD_TRIES; k++) {
            const more = copyLay(lay);
            if (layIn(more, phrases[i], i)) return more;
        }

        return layOut(phrases, lay.rows);
    }

    // The letters on the cells the snakes took, null on the rest
    function lettersIn(lay, phrases) {
        const cells = new Array(lay.rows * lay.cols).fill(null);

        lay.snakes.forEach((path, i) => {
            const letters = [].concat(...phrases[i].tokens);
            path.forEach((k, n) => { cells[k] = letters[n]; });
        });

        return cells;
    }

    /*
     * The cells no word took, filled with letters of the set's own words: a
     * grid of Cyrillic with Latin filler would give the words away by their
     * alphabet. Drawn as often as they occur in the set, as searchlines drew
     * them from its dictionary.
     */
    function fill(cells) {
        let pool = [];
        store.wordsOf(state.selectedSetId).forEach(item => {
            pool = pool.concat(lettersOf(item.word.original || ''));
        });
        if (!pool.length) pool = cells.filter(c => c !== null);
        if (!pool.length) pool = ['·'];

        return cells.map(c => (c === null ? pool[Math.floor(Math.random() * pool.length)] : c));
    }

    /* ---------------------------------------------------------------- deal */

    /*
     * The room the page has, in layout pixels: the window up to what a popup
     * may reach, out of the app's zoom, less where the words begin and the
     * margin under the grid.
     */
    function roomBelow(el) {
        const tall = Math.max(window.innerHeight, POPUP_MOST) / appScale();
        return tall - appRect(el).top - FOOT;
    }

    const widthOf = (el) => el.clientWidth;

    // How tall the words above the grid come out at `font`: drawn as they
    // stand at the deal, which is as tall as they ever are -- what a run does
    // to them changes colours and blurs, not lengths
    function boardHeight(board, phrases, items, font) {
        board.style.fontSize = `${font}px`;
        board.innerHTML = phrases.map((p, i) => bubbleHtml(p, i, items[i], true)).join('');
        return board.offsetHeight;
    }

    /*
     * The run: phrases due, laid into the grid for as long as the grid and
     * the screen hold them -- the owner's design, 8 November 2026.
     *
     * The longest due phrase first. Taken where it fell in the shuffle, a
     * long phrase would come up when the grid was already full and be passed
     * over every time. The rest in duePool's shuffle, up to MOST_PHRASES.
     *
     * A phrase is kept when its snake goes into the grid and the words above
     * it still fit at MIN_FONT with the grid at MIN_CELL. One that does not is
     * passed over, not the end of the run: the next may be short. After
     * MOST_PASSED passed over in a row the grid counts as full -- each costs
     * about as much as laying the run again, and a set can have hundreds due.
     * Passed over phrases stay due, for this game's next run and every other
     * game's.
     *
     * The first is kept whatever it takes: the catalog has already said there
     * is something to repeat, and a run of nothing would be a page that lied.
     * A phrase too long for the grid gets a grid of its own size, a cell more
     * a side at a time.
     */
    const MOST_PASSED = 20;

    function deal(board) {
        const due = store.duePool(state.selectedSetId, state.allowEarly)
            .map(item => ({ item, phrase: phraseOf(item) }))
            .filter(x => x.phrase.tokens.length);

        if (due.length > 1) {
            let at = 0;
            due.forEach((x, i) => { if (lengthOf(x.phrase) > lengthOf(due[at].phrase)) at = i; });
            due.unshift(due.splice(at, 1)[0]);
        }

        let chosen = [];
        let lay = null;
        let passed = 0;

        for (const next of due) {
            if (chosen.length >= MOST_PHRASES || passed >= MOST_PASSED) break;

            const trial = chosen.concat([next]);
            const phrases = trial.map(x => x.phrase);
            let laid = null;

            if (!lay) {
                for (let side = GRID_SIDE; !laid && side <= GRID_SIDE * 4; side++) laid = layOut(phrases, side);
            } else if (lengthOf(next.phrase) <= freeIn(lay)) {
                laid = layMore(lay, phrases, chosen.length);

                if (laid) {
                    const room = roomBelow(board) - boardHeight(board, phrases, trial.map(x => x.item), MIN_FONT) - GRID_GAP;
                    if (room < laid.rows * MIN_CELL) laid = null;
                }
            }

            if (!laid) {
                passed++;
                continue;
            }

            chosen = trial;
            lay = laid;
            passed = 0;
        }

        state.sessionPool = chosen.map(x => x.item);
        state.phrases = chosen.map(x => x.phrase);
        state.grid = lay ? { rows: lay.rows, cols: lay.cols, cells: fill(lettersIn(lay, state.phrases)) } : null;
        state.sessionResults = chosen.map(() => null);
        state.found = chosen.map(() => 0);
        state.peeked = chosen.map(() => null);
        state.shown = chosen.map(x => x.phrase.tokens.map(() => false));
        state.struck = chosen.map(() => false);
        state.missed = chosen.map(() => false);
        state.paths = [];
        state.asking = null;
        state.ordered = chosen.length > 0 && chosen.every(x => x.phrase.stage >= ORDERED_FROM);

        // When this run was dealt, which every answer in it is stamped with --
        // see store.recordRepetition
        state.sessionAt = Date.now();
    }

    /*
     * The sizes the screen gives the run: both limits multiplied by one
     * factor, as large as the room allows, each stopped at its own most. The
     * share of the screen each part ends up with is whatever comes out -- the
     * owner's call, 8 November 2026.
     *
     * Found by trying, because the words above the grid do not grow evenly
     * with their type: they wrap, and a line more is a step. A dozen tries
     * at the start of a run and when the width changes, not on every frame.
     */
    let fitted = null;

    function fit(board) {
        const { rows, cols } = state.grid;
        const width = widthOf(board);
        const room = roomBelow(board);

        const sizes = (k) => ({ font: Math.min(MIN_FONT * k, MAX_FONT), cell: Math.min(MIN_CELL * k, MAX_CELL) });
        const fits = (k) => {
            const { font, cell } = sizes(k);
            return cell * cols <= width && boardHeight(board, state.phrases, state.sessionPool, font) + GRID_GAP + cell * rows <= room;
        };

        const top = Math.max(MAX_CELL / MIN_CELL, MAX_FONT / MIN_FONT);
        let k = top;

        if (!fits(top)) {
            let lo = 0.3;
            let hi = top;
            for (let i = 0; i < 12; i++) {
                const mid = (lo + hi) / 2;
                if (fits(mid)) lo = mid; else hi = mid;
            }
            k = lo;
        }

        fitted = { ...sizes(k), width };
    }

    /* -------------------------------------------------------------- screen */

    let header = null;
    let board = null;
    let gridHost = null;

    // The word being worked on: the one asked about, the one the order is at,
    // or one with a word of it found
    function current() {
        if (state.asking) return state.asking.phrase;

        const open = state.phrases.map((_, i) => i).filter(i => !state.struck[i]);
        if (state.ordered) return open.length ? open[0] : -1;

        const started = open.find(i => state.found[i] > 0);
        return started === undefined ? -1 : started;
    }

    /*
     * A word above the grid: the word's own line, and its translation under
     * it, each hidden as its stage says (see maskFor) by a blur -- searchlines'
     * way, which keeps the length of what is hidden, and that is a clue the
     * puzzle is meant to give.
     *
     * A hidden word is pressed to see it: the peek, which costs the answer
     * (see score). A word found shows itself, in the colour of what went
     * right. A word done takes the colour of the stage it has come to, and
     * says itself when pressed. A phrase answered wrong is red until it is
     * done, as searchlines painted its -- found words white on it then, the
     * mint of a find being lost on red.
     *
     * And a phrase that was not right -- answered wrong, or peeked at, what
     * keeps it out of the star (see endRun) -- keeps its word in red once it
     * is done, to the end of the run, and a red edge round it (the owner's
     * calls, 8 November 2026): the mistakes are there to be seen on the grid
     * the run leaves. A deep red, MISS_INK: the err of the theme is a coral,
     * and on the pale fills of the stages it could hardly be read. The edge
     * two pixels, the second drawn inside as a shadow: a wider border would
     * make the bubble wider than it was measured at the deal.
     *
     * `measure` is the word drawn to be measured, as it stands at the deal.
     */
    const MISS_INK = '#c62828';

    function bubbleHtml(phrase, i, item, measure) {
        const live = !measure;
        const struck = live && state.struck[i];
        const found = live ? state.found[i] : 0;
        const missed = live && state.missed[i];
        const asked = live && state.ordered && current() === i && !struck;

        const blur = 'filter: blur(0.32em);';
        const red = missed && !struck;

        const line = phrase.parts.map(part => {
            if (part.token === null) return escapeText(part.text);

            const t = part.token;
            const isFound = !struck && t < found;
            const peeked = live && state.shown[i][t];
            const hidden = phrase.hideOriginal && !struck && !isFound && !peeked;
            const ink = isFound ? (red ? '#ffffff' : palette.ok) : (peeked && !struck && !red ? palette.err : 'inherit');

            return hidden
                ? `<span class="search-peek" data-press data-phrase="${i}" data-token="${t}" title="Peek at the word -- it then counts as not known" style="display: inline-block; ${blur} cursor: pointer;">${escapeText(part.text)}</span>`
                : `<span style="color: ${ink};">${escapeText(part.text)}</span>`;
        }).join('');

        const translation = item.word.translation;
        const hideTranslation = phrase.hideTranslation && !struck;

        let bg = red ? palette.err : palette.surface;
        let ink = red ? palette.onResult : palette.ink;
        let edge = red ? palette.err : palette.border;

        if (struck) {
            const stage = spacedRepetitions.getWordStats(item.word).stage || 0;
            const tone = tokens.stages()[Math.min(stage, tokens.stages().length - 1)];
            bg = tone.fill;
            ink = tone.ink;
            edge = tone.fill;
        }

        const ring = asked ? `outline: 2px solid ${palette.cursor};` : '';
        const press = struck ? ' data-press title="Say it"' : '';
        const wrong = struck && state.sessionResults[i] === 'wrong';
        const wordInk = wrong ? `color: ${MISS_INK};` : '';

        if (wrong) edge = MISS_INK;
        const missEdge = wrong ? `box-shadow: inset 0 0 0 1px ${MISS_INK};` : '';

        return `<div class="search-bubble"${press} data-phrase="${i}" style="padding: 0.3em 0.6em; border-radius: 0.9em; background: ${bg}; color: ${ink}; border: 1px solid ${edge}; ${missEdge} ${ring} text-align: center; line-height: 1.15; max-width: 100%; box-sizing: border-box; cursor: ${struck ? 'pointer' : 'default'}; user-select: none; -webkit-user-select: none;">
            <div style="font-weight: 700; word-break: break-word; ${wordInk}">${line}</div>
            ${translation ? `<div style="font-size: 0.82em; opacity: ${struck ? 0.85 : 0.75}; word-break: break-word; ${hideTranslation ? blur : ''}">${escapeText(translation)}</div>` : ''}
        </div>`;
    }

    function drawBoard() {
        board.style.fontSize = `${fitted.font}px`;
        board.innerHTML = state.phrases.map((p, i) => bubbleHtml(p, i, state.sessionPool[i])).join('');
    }

    /*
     * The grid: letters on cells ten units square, the words found under
     * them. Raw input, the whole of it, so the analytics leave it alone
     * (data-untracked, as Snake's d-pad).
     */
    let svg = null;

    /*
     * A cell picked or found: a square with its corners rounded, under the
     * letter, one to a cell, and a link MARK_LINK wide from each to the next
     * -- the owner's calls, 8 November 2026. Square, because a letter's
     * accent, its tail and a mark above or below it did not go into the round
     * line through the cells there was before, which was narrower than the
     * cell: Á, Ñ, ق and ि stood half out of it. The links came the same
     * evening, after a few hours of squares alone: without them a word bent
     * round a corner did not say which way it went on.
     *
     * The links run from middle to middle under the squares; only what lies
     * between two squares is seen.
     */
    const MARK_SIDE = 8.6;
    const MARK_ROUND = 2.4;
    const MARK_LINK = 3.4;

    const marksHtml = (cells) => {
        const link = cells.length > 1
            ? `<polyline points="${cells.map(([r, c]) => `${c * 10 + 5},${r * 10 + 5}`).join(' ')}" fill="none" stroke-width="${MARK_LINK}" stroke-linejoin="round" />`
            : '';

        return link + cells.map(([r, c]) => `<rect x="${c * 10 + (10 - MARK_SIDE) / 2}" y="${r * 10 + (10 - MARK_SIDE) / 2}" width="${MARK_SIDE}" height="${MARK_SIDE}" rx="${MARK_ROUND}" stroke="none" />`).join('');
    };

    // At half strength as a group, not each shape: the squares and the
    // links over them would be darker where they overlap. `phrase`, the
    // phrase a found word's marks are of, and `hidden` while it is asked
    // about -- see hideMarks
    function marksGroup(cells, colour, cls, phrase, hidden) {
        const of = phrase === undefined ? '' : ` data-phrase="${phrase}"`;
        const gone = hidden ? ' style="opacity: 0;"' : '';
        return `<g class="${cls}"${of} fill="${colour}" stroke="${colour}" opacity="${LINE_OPACITY}"${gone}>${marksHtml(cells)}</g>`;
    }

    /*
     * A found phrase's marks on the grid: gone while it is asked about --
     * its cells have flown up into the question (see comeIn) -- and back
     * only for a right answer, as the question goes; a wrong one takes the
     * finds off the grid, and the marks with them (the owner's call,
     * 9 November 2026). Until then they were back under the veil as soon as
     * the squares had gone.
     *
     * Kept by the run, not only by the page: drawn again while the question
     * is up -- the popup opened again, the theme changed -- they are drawn
     * gone (see drawGrid).
     */
    const MARKS_BACK = 400;

    const phraseMarks = (i) => svg.querySelectorAll(`.search-line[data-phrase="${i}"]`);

    function hideMarks(i) {
        phraseMarks(i).forEach(g => { g.style.opacity = '0'; });
    }

    function showMarks(i) {
        phraseMarks(i).forEach(g => {
            g.style.opacity = '';
            if (!still()) g.animate([{ opacity: 0 }, { opacity: LINE_OPACITY }], { duration: MARKS_BACK, easing: 'ease-out' });
        });
    }

    function drawGrid() {
        const { rows, cols, cells } = state.grid;
        const cell = fitted.cell;

        gridHost.innerHTML = `<svg class="search-grid" data-untracked viewBox="0 0 ${cols * 10} ${rows * 10}" width="${+(cols * cell).toFixed(2)}" height="${+(rows * cell).toFixed(2)}" style="display: block; box-sizing: border-box; margin: 0 auto; touch-action: none; user-select: none; -webkit-user-select: none; background: ${palette.surface}; border: 1px solid ${palette.border}; border-radius: ${+(cell * 0.3).toFixed(2)}px; cursor: pointer; overflow: hidden;">
            <g class="search-lines" style="pointer-events: none;">
                ${state.paths.map(p => marksGroup(p.cells, LINE_COLOURS[p.phrase % LINE_COLOURS.length], 'search-line', p.phrase, !!state.asking && state.asking.phrase === p.phrase)).join('')}
                ${pick ? marksGroup(pick.cells, palette.drawing, 'search-drawn') : ''}
            </g>
            <g class="search-letters" font-size="5.4" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="${palette.ink}" style="pointer-events: none;">
                ${cells.map((ch, k) => `<text x="${(k % cols) * 10 + 5}" y="${Math.floor(k / cols) * 10 + 5.3}"${letterSize(look(ch))}>${escapeText(look(ch))}</text>`).join('')}
            </g>
        </svg>`;

        svg = gridHost.querySelector('svg');
        if (pick) pick.el = svg.querySelector('.search-drawn');
        bindGrid();
    }

    /* ------------------------------------------------------------- picking */

    /*
     * Nothing on the grid but the grid itself takes a press -- the letters
     * and the marks are pointer-events: none -- so the press is always the
     * svg's, wherever it lands. A mark under the finger was the target of a
     * press on a picked cell, and setPick replaces the pick's marks at once:
     * an old phone's browser lost the touch with the node it began on and
     * cancelled it, and a second swipe from inside a pick never moved, the
     * pick snapping back (found by the owner, 9 November 2026).
     */

    /*
     * The cells picked and not yet a word: by a swipe, by taps one cell at a
     * time, or both. Taps are the owner's call, 8 November 2026: the finger
     * that swipes covers the letters it is going over. So the pick stays
     * when the finger is lifted, a swipe's as much as a tap's, and the next
     * tap or swipe carries on from it:
     *
     *   - a tap on a cell next to the last one picked adds it;
     *   - a tap on a cell already picked lets it go, and the ones after it;
     *   - a tap anywhere else starts a new pick there;
     *   - a swipe from the last cell picked, or from one next to it, carries
     *     the pick on; from a cell picked earlier, it goes on from there; from
     *     anywhere else it starts a new pick.
     *
     * Next to: along a row or a column, and across a corner while a word of
     * the run may step that way (see DIAGONAL_FROM).
     */
    let pick = null;
    let drag = null;

    // The cell under the pointer, in cells and fractions of one
    function pointAt(e) {
        const p = svg.createSVGPoint();
        p.x = e.clientX;
        p.y = e.clientY;
        const at = p.matrixTransform(svg.getScreenCTM().inverse());
        return [at.y / 10 - 0.5, at.x / 10 - 0.5];
    }

    const inside = (r, c) => r >= 0 && c >= 0 && r < state.grid.rows && c < state.grid.cols;
    const same = (a, b) => a[0] === b[0] && a[1] === b[1];

    const slanting = () => state.phrases.some((p, i) => !state.struck[i] && p.stage >= DIAGONAL_FROM);

    function touching(a, b) {
        const dr = Math.abs(a[0] - b[0]);
        const dc = Math.abs(a[1] - b[1]);
        return dr + dc === 1 || (dr === 1 && dc === 1 && slanting());
    }

    /*
     * The pick's sound -- the owner's call, 8 November 2026: a cell picked
     * pops like a small bubble, a little higher with every letter of the
     * phrase, and a new phrase starts from the bottom again. So the words of
     * a phrase found one by one go on climbing where the last one stopped,
     * counted from the letters of the phrase already found (phraseStep). A
     * cell let go pops softer, a step lower -- at the pitch of the cell that
     * is the pick's last now.
     *
     * By what the pick has become rather than by what made it: a tap, a
     * swipe and a finger jumping cells all end in setPick, and `heard` is
     * what was last sounded. A pick that becomes a word goes quietly: the
     * find has its flight's sounds and the phrase said aloud.
     */
    const POP_GAP = 25;

    let heard = { first: null, n: 0 };

    // How far into the phrase being worked on its next letter is
    function phraseStep() {
        const i = current();
        if (i < 0) return 0;

        return state.phrases[i].tokens.slice(0, state.found[i]).reduce((n, t) => n + t.length, 0);
    }

    // A bubble popping, `step` letters into the phrase, `later` ms from now
    const bubblePop = sfx.bubble;

    function pickSound(cells) {
        const was = heard;
        const on = cells.length && was.first && same(was.first, cells[0]);
        const base = phraseStep();

        if (!cells.length) {
            if (was.n) bubblePop(base - 1, 0, true);
        } else if (!on) {
            bubblePop(base + cells.length - 1, 0);
        } else if (cells.length > was.n) {
            for (let k = was.n; k < cells.length; k++) bubblePop(base + k, (k - was.n) * POP_GAP);
        } else if (cells.length < was.n) {
            bubblePop(base + cells.length - 1, 0, true);
        }
    }

    // The pick drawn as `cells`; none, and it is gone. `quiet` when it went
    // to a word
    function setPick(cells, quiet) {
        if (!quiet) pickSound(cells);
        heard = { first: cells.length ? cells[0] : null, n: cells.length };

        if (!cells.length) {
            if (pick && pick.el) pick.el.remove();
            pick = null;
            return;
        }

        if (!pick) {
            pick = { cells, el: $(svg.querySelector('.search-lines'), marksGroup(cells, palette.drawing, 'search-drawn')) };
            return;
        }

        pick.cells = cells;
        pick.el.innerHTML = marksHtml(cells);
    }

    // What a tap on `at` makes of the pick `before` it -- see pick above
    function tapped(before, at) {
        const k = before.findIndex(c => same(c, at));
        if (k >= 0) return before.slice(0, k);

        return before.length && touching(before[before.length - 1], at) ? before.concat([at]) : [at];
    }

    /*
     * A swipe follows the pointer cell by cell. A cell is entered when the
     * pointer comes within INNER of its middle rather than over its edge, so
     * that a finger going past a corner does not take the cell beside it,
     * and one resting on an edge does not flicker between two. Going back
     * into the cell before takes the last step back; a cell the pick already
     * holds is not entered again.
     *
     * Across a corner only while a word of the run may step that way, and
     * then only when the finger kept further than CORNER from both cells
     * beside it: a bend, as a finger draws one, is round and cuts its corner.
     * Otherwise the pick goes round the corner, through whichever of the two
     * the finger came nearer. A finger quick enough to jump cells gets the
     * ones between.
     *
     * Round through a cell the pick already holds -- back, that is -- only
     * when the finger plainly went nearer it, by BACK_BIAS: a fast finger
     * leaves no points near either cell, and a step across a corner is then
     * a step on, not back over the word (found by tracing "hola" round its
     * bend in two moves, 8 November 2026).
     */
    const INNER = 0.45;
    const CORNER = 0.6;
    const BACK_BIAS = 0.15;

    // The next cell of the pick on its way to `to`
    function stepToward(to) {
        const at = pick.cells[pick.cells.length - 1];
        const dr = Math.sign(to[0] - at[0]);
        const dc = Math.sign(to[1] - at[1]);
        if (!dr || !dc) return [at[0] + dr, at[1] + dc];

        const nearest = (cell) => Math.min(...drag.trail.map(p => Math.hypot(p[0] - cell[0], p[1] - cell[1])));
        const cost = (cell) => nearest(cell) + (pick.cells.some(c => same(c, cell)) ? BACK_BIAS : 0);

        const down = [at[0] + dr, at[1]];
        const across = [at[0], at[1] + dc];

        if (drag.slant && Math.min(nearest(down), nearest(across)) > CORNER) return [at[0] + dr, at[1] + dc];
        return cost(down) <= cost(across) ? down : across;
    }

    /*
     * Which word the pick spells, if any: the next unfound word of a phrase
     * not yet done -- the words of a phrase are found in their order, as in
     * searchlines. From its first letter to its last only (the owner's call,
     * 8 November 2026): until then a word picked from its end counted too,
     * and with it the snake could be traced from either end. A phrase already
     * begun is preferred, and in an ordered run only the phrase the order is
     * at counts.
     *
     * Any pick that spells the word counts, not only the snake it was laid
     * along: the filler can spell a word by chance, and finding it there is
     * finding it. Nothing found is kept from being picked again, so a find
     * in the wrong place never leaves a word that cannot be found.
     */
    function spelled(letters) {
        const spelt = letters.map(look).join('');
        const open = state.phrases.map((_, i) => i).filter(i => !state.struck[i] && !(state.asking && state.asking.phrase === i));

        const candidates = state.ordered ? open.slice(0, 1) : open.filter(i => state.found[i] > 0).concat(open.filter(i => state.found[i] === 0));

        for (const i of candidates) {
            const tokenAt = state.found[i];
            const token = state.phrases[i].tokens[tokenAt];
            if (!token) continue;

            const word = token.map(look).join('');
            if (word === spelt) return { phrase: i, token: tokenAt };
        }

        return null;
    }

    function bindGrid() {
        /*
         * A press shows at once what it would make of the pick: the pick
         * carried on from the cell pressed, or a new one there. Whether it
         * was a tap or a swipe is known only when the finger moves to
         * another cell or is lifted.
         */
        svg.addEventListener('pointerdown', (e) => {
            if (state.asking || drag || finishing) return;

            const point = pointAt(e);
            const at = [Math.round(point[0]), Math.round(point[1])];
            if (!inside(at[0], at[1])) return;

            e.preventDefault();
            try { svg.setPointerCapture(e.pointerId); } catch (err) { }

            const before = pick ? pick.cells.slice() : [];
            const k = before.findIndex(c => same(c, at));
            const from = k >= 0 ? before.slice(0, k + 1) : tapped(before, at);

            drag = { id: e.pointerId, at, before, moved: false, trail: [point], slant: slanting() };
            setPick(from);
        });

        svg.addEventListener('pointermove', (e) => {
            if (!drag || drag.id !== e.pointerId) return;
            follow(pointAt(e));
        });

        svg.addEventListener('pointerup', (e) => {
            if (!drag || drag.id !== e.pointerId) return;

            const { at, before, moved } = drag;
            drag = null;

            // A swipe: what it picked stays picked, and was checked on every
            // step but one -- back to a single cell, it is a press lifted
            if (moved) {
                if (pick && pick.cells.length === 1) check(true);
                return;
            }

            setPick(tapped(before, at));
            if (pick) check(true);
        });

        svg.addEventListener('pointercancel', (e) => {
            if (!drag || drag.id !== e.pointerId) return;

            const { before } = drag;
            drag = null;
            setPick(before);
        });
    }

    function follow(point) {
        drag.trail.push(point);

        const to = [Math.round(point[0]), Math.round(point[1])];
        if (!inside(to[0], to[1]) || Math.hypot(point[0] - to[0], point[1] - to[1]) > INNER) return;

        const cells = pick.cells;
        let moved = false;

        // Each step closer to `to`, back or on, so this ends
        while (!same(cells[cells.length - 1], to)) {
            const next = stepToward(to);

            if (cells.length > 1 && same(next, cells[cells.length - 2])) cells.pop();
            else if (cells.some(c => same(c, next))) break;
            else cells.push(next);

            moved = true;
            drag.trail = [point];
        }

        if (!moved) return;

        drag.moved = true;
        setPick(cells);
        check();
    }

    /*
     * The moment the pick spells a word it is that word's: it takes the
     * word's colour and stays, whatever the finger does next -- searchlines'
     * rule, which is what makes a find feel like one.
     *
     * Except a pick of one cell, which is a word only once the finger is
     * `lifted` from it. Taken at the press, the "a" of "a la derecha" was
     * found by every press on an A, and took the swipe of "abierto" from
     * its first cell (8 November 2026). A tap on an A still finds it: a tap
     * is a press lifted.
     */
    function check(lifted) {
        if (pick.cells.length < 2 && !lifted) return false;

        const { cols, cells } = state.grid;
        const hit = spelled(pick.cells.map(([r, c]) => cells[r * cols + c]));
        if (!hit) return false;

        const path = { phrase: hit.phrase, token: hit.token, cells: pick.cells.slice() };
        setPick([], true);
        drag = null;

        found(path);
        return true;
    }

    function found(path) {
        const i = path.phrase;

        state.paths.push(path);
        state.found[i] += 1;

        $(svg.querySelector('.search-lines'), marksGroup(path.cells, LINE_COLOURS[i % LINE_COLOURS.length], 'search-line', i));

        drawBoard();

        // The whole phrase: said, and asked about
        if (state.found[i] >= state.phrases[i].tokens.length) {
            const item = state.sessionPool[i];
            speech.say(item.word.original, item.originalLang);

            if (item.word.translation) {
                state.asking = { phrase: i, options: optionsFor(item) };

                // A moment to see the word marked, and its letters fly up
                // into the question -- see comeIn
                setTimeout(() => drawQuestion(true), QUESTION_AFTER);
            } else {
                // Nothing to ask: the word is done once it is found
                score(i, true);
                strike(i);
            }
        }

        page.save();
    }

    /* ---------------------------------------------------------------- peek */

    /*
     * A hidden word shown on request. It stays shown for the rest of the run,
     * and the phrase it is in can no longer be a right answer: the answer
     * becomes the share of its words found before the first peek (see score).
     * Saved straight away, so that closing the popup does not refund it.
     *
     * The first peek into a phrase not yet answered is a mistake made, and
     * sounds as one (see lose); a phrase already peeked into, or answered
     * wrong, has made its mistake already.
     */
    function peekAt(i, t) {
        if (state.struck[i] || state.shown[i][t]) return;

        state.shown[i][t] = true;

        if (state.peeked[i] === null) {
            state.peeked[i] = state.found[i];
            if (!state.sessionResults[i]) lose();
        }

        drawBoard();
        page.save();
    }

    /* ------------------------------------------------------------ question */

    // The translations on offer: from the word's own set, as the quiz takes them
    function optionsFor(item) {
        const right = item.word.translation;
        const stage = spacedRepetitions.getWordStats(item.word).stage || 0;
        const count = Math.max(LEAST_OPTIONS, Math.min(stage + 1, MOST_OPTIONS));

        const others = [];
        store.wordsOf(item.setId).forEach(({ word }) => {
            if (word.translation && word.translation !== right && !others.includes(word.translation)) others.push(word.translation);
        });

        for (let i = others.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [others[i], others[j]] = [others[j], others[i]];
        }

        const options = [right].concat(others.slice(0, count - 1));
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }

        return options;
    }

    /*
     * What is written for a phrase, once, at its first answer: 1 when every
     * word of it was found unseen and the translation picked right, the share
     * of its words found before the first peek when it was peeked at, two
     * figures truncated as Snake and Wordcraft write theirs, and 0 for a wrong
     * translation. A phrase asked again after a wrong answer writes nothing:
     * one answer to a word in a run.
     */
    function score(i, right) {
        if (state.sessionResults[i]) return;

        const peeked = state.peeked[i];
        const n = state.phrases[i].tokens.length;
        const share = !right ? 0 : (peeked === null ? 1 : Math.floor(peeked / n * 100) / 100);

        store.recordRepetition(state.sessionPool[i], share, 'search', { at: state.sessionAt, size: state.sessionPool.length });
        state.sessionResults[i] = share === 1 ? 'correct' : 'wrong';

        store.save();
    }

    let veil = null;

    /*
     * The question comes in out of the phrase's own cells -- the owner's
     * calls, 9 November 2026. Each cell of the phrase marked on the grid
     * lifts off it, its square and its letter as the grid draws them, one
     * after another in the phrase's order, and flies along an arc to its
     * letter in the question's phrase, the square shrinking to the letter's
     * height and the letter growing to the phrase's size. On the way the
     * grid's letter gives way to the phrase's -- upper case to the case it
     * is written in -- so that what lands is the phrase as it will stand
     * (the owner's call: changed on landing, the capitals lined up on the
     * card and then turned small all along it). An Arabic letter still
     * lands alone and joins on landing: a letter alone cannot be drawn in a
     * form that depends on its neighbours. While they line up, the veil and the card come in under them; with all of them there
     * the squares go and the letters stay, and the options fall from under
     * the phrase one after another.
     *
     * The squares overlap once lined up -- a letter is narrower than the
     * line is tall -- and run under the phrase as one band, the way the marks
     * run along the grid with the links between them.
     *
     * Earlier the same morning each cell flew as a cloud and turned into its
     * letter, and the veil came only with the phrase whole; the evening
     * before, one cloud flew from the word's last letter and burst where the
     * question would stand, the question showing through puffs as they
     * cleared; before that the question covered the grid all at once.
     *
     * With motion turned down the question only fades in.
     */
    const QUESTION_AFTER = 250;
    const CLOUD_SIZE = 18;
    const CLOUD_FLIGHT = 600;
    const PUFF_RUN = 700;

    const LETTER_FLIGHT = 700;    // a cell, the grid to its letter
    const LETTERS_SPAN = 600;     // however many letters, all off within this
    const LETTER_GAP = 70;        // and never further apart than this
    const FLIGHT_FRAMES = 10;
    const TILE_TILT = 25;         // degrees at most, halfway, back to none
    const TILE_FIT = 0.95;        // of the letter's height
    const GRID_FONT = 0.54;       // of a cell: the grid's font-size, 5.4 of 10
    const SWAP_AT = 0.3;          // of the flight: the grid's letter into the phrase's
    const SWAP_FOR = 0.35;        // of the flight, the two letters crossing
    const REST_IN = 220;          // spaces and marks, with the last letter
    const GROUND_IN = 400;        // from the first landing, under the rest
    const TILES_REST = 250;       // all landed, a moment, and the squares go
    const TILES_OUT = 300;
    const OPTIONS_AFTER = 100;    // from the squares going
    const OPTION_GAP = 70;
    const OPTION_FALL = 450;

    // searchlines' cloud: four balls round the first, offset in its sizes
    const LUMPS = [[-0.5, 0.1], [-0.8, -1], [-0.1, -0.7], [-1, -0.3]];

    // Where the five balls' middle is, from the first ball's own
    const LUMPS_MIDDLE = [-0.48, -0.38];

    // The middle of a cell of the grid, in the units the page is laid out in
    function cellMiddle([r, c]) {
        const box = appRect(svg);
        const { rows, cols } = state.grid;
        return [box.left + (c + 0.5) * box.width / cols, box.top + (r + 0.5) * box.height / rows];
    }

    // A cloud with its middle at x, y, each ball `size` across, in `colour`;
    // `soft` blurs the four round the first, as searchlines' puffs had them.
    // Unseen but for what its animation draws: the moment between the
    // animation's end and the cloud's removal must not show it
    function cloud(x, y, size, soft, colour) {
        const blur = soft ? size * 0.2 : 0;
        const lumps = LUMPS.map(([dx, dy]) => `${colour} ${dx * size}px ${dy * size}px ${blur}px`).join(', ');
        const left = x - size / 2 - LUMPS_MIDDLE[0] * size;
        const top = y - size / 2 - LUMPS_MIDDLE[1] * size;
        const turnAt = `${(0.5 + LUMPS_MIDDLE[0]) * size}px ${(0.5 + LUMPS_MIDDLE[1]) * size}px`;

        return $(container, `<div class="search-cloud" aria-hidden="true" style="position: fixed; left: ${left}px; top: ${top}px; width: ${size}px; height: ${size}px; border-radius: 50%; background: ${colour}; box-shadow: ${lumps}; transform-origin: ${turnAt}; opacity: 0; z-index: 10; pointer-events: none;"></div>`);
    }

    const gone = (el, run) => run.finished.catch(() => null).then(() => el.remove());

    // A cloud blowing up where it stands and thinning to nothing
    function puff(x, y, size, delay, colour) {
        const el = cloud(x, y, size, true, colour);
        const turn = Math.random() * 360;

        gone(el, el.animate([
            { transform: `rotate(${turn}deg) scale(0.1)`, opacity: 0 },
            { transform: `rotate(${turn}deg) scale(0.3)`, opacity: 1, offset: 0.1 },
            { transform: `rotate(${turn}deg) scale(2)`, opacity: 0 }
        ], { duration: PUFF_RUN, delay, easing: 'ease-out', fill: 'backwards' }));
    }

    /*
     * The cloud's sounds -- the owner's call, 8 November 2026: a gust of wind
     * for its flight, a soft pop where it bursts, and as it paints the phrase
     * after an answer, a chime when right and the tone of a loss when wrong.
     * The first sounds of the app that are not its voice; the cells picked
     * pop with the same means (see pickSound).
     *
     * Made here until 9 November 2026, when every game was given sounds and
     * the means went to core/sfx.js -- and with them the switch: under the
     * game's own sound effects switch now, apart from the voice, where until
     * then the voice's switch silenced these too.
     *
     * A loss: a tone falling two octaves less a third, the length of the red
     * running down a star that cannot be filled (see endRun). Heard there
     * first; the owner then had it for every mistake as it is made -- a wrong
     * answer as it paints the phrase red, the first peek into a phrase not
     * yet answered (8 November 2026).
     */
    const { gust, pop, note, chime, lose } = sfx;

    const middleOf = (el) => {
        const box = appRect(el);
        return [box.left + box.width / 2, box.top + box.height / 2];
    };

    // A cloud's flight, searchlines' vfxFlyCloud: two puffs where it leaves,
    // a spin on the way, shrinking, and a burst where it lands CLOUD_FLIGHT
    // later
    function fly(from, to, size, colour) {
        puff(from[0], from[1], size, 0, colour);
        puff(from[0], from[1], size, 0, colour);

        pop(0, 0.08);
        gust(0, CLOUD_FLIGHT);
        pop(CLOUD_FLIGHT, 0.22);

        const flyer = cloud(from[0], from[1], size, false, colour);
        const shift = `translate(${to[0] - from[0]}px, ${to[1] - from[1]}px)`;
        const turn = (Math.random() - 0.5) * 1900 + 50;

        gone(flyer, flyer.animate([
            { transform: 'translate(0px, 0px) rotate(0deg) scale(1)', opacity: 1 },
            { transform: `${shift} rotate(${turn}deg) scale(0.5)`, opacity: 1, offset: 0.8 },
            { transform: `${shift} rotate(${turn}deg) scale(2)`, opacity: 0 }
        ], { duration: CLOUD_FLIGHT + 150, easing: 'ease-in' }));

        puff(to[0], to[1], size, CLOUD_FLIGHT, colour);
    }

    const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

    /*
     * A marked cell lifting off: its square as the grid draws a mark --
     * MARK_SIDE of the cell, rounded MARK_ROUND, in one solid colour -- and
     * its letter as the grid writes it, with their middles at `at`.
     *
     * In the veil, each at its own height there: the squares over the veil's
     * ground and the card (z-index 1), the phrase over the squares (2, see
     * drawQuestion), and the grid's letters over all (3). Two elements and
     * not one, the letters over every square: lined up the squares overlap,
     * and the next one's would cover the last one's letter. Outside the veil,
     * as the clouds before them flew, the squares covered the phrase's
     * letters as they came in, and the phrase stood invisible on its band
     * until the squares went.
     */
    function tile(at, cell, letter, colour) {
        const side = cell * MARK_SIDE / 10;

        const square = $(veil, `<div class="search-tile" aria-hidden="true" style="position: fixed; left: ${at[0] - side / 2}px; top: ${at[1] - side / 2}px; width: ${side}px; height: ${side}px; border-radius: ${side * MARK_ROUND / MARK_SIDE}px; background: ${colour}; z-index: 1; pointer-events: none;"></div>`);

        const glyph = $(veil, `<div class="search-tile-letter" aria-hidden="true" style="position: fixed; left: ${at[0] - cell / 2}px; top: ${at[1] - cell / 2}px; width: ${cell}px; height: ${cell}px; display: flex; align-items: center; justify-content: center; font-size: ${cell * GRID_FONT * letterFit(letter)}px; font-weight: 700; line-height: 1; color: ${palette.ink}; z-index: 3; pointer-events: none;">${escapeText(letter)}</div>`);

        return { square, glyph, side };
    }

    /*
     * The phrase's letter flown in by the grid's: the letter as the card
     * writes it, in a box the size and font of its place there, with its
     * middle at `at`. Landed and unscaled it covers the card's letter
     * exactly -- the same glyph, the same baseline: the box's line is as
     * tall as the letter's own, as an inline box is -- and gives way to it
     * with nothing seen to change.
     */
    function phraseGlyph(at, box, font, letter) {
        return $(veil, `<div class="search-tile-letter" aria-hidden="true" style="position: fixed; left: ${at[0] - box.width / 2}px; top: ${at[1] - box.height / 2}px; width: ${box.width}px; height: ${box.height}px; font-size: ${font}px; font-weight: 700; line-height: ${box.height}px; text-align: center; white-space: pre; color: ${palette.ink}; z-index: 3; pointer-events: none;">${escapeText(letter)}</div>`);
    }

    /*
     * One flight, `later` ms from now: from `from` to `to` along an arc bent
     * `bend` of the way to one side, tilting by up to `tilt` halfway and
     * landing straight, scaled from `scale[0]` to `scale[1]`, and staying
     * there. Eased by hand along the arc, so that the square and its
     * letters, each flown by its own call, keep together.
     */
    function flight(el, from, to, [grown, grow], tilt, bend, later) {
        const dx = to[0] - from[0];
        const dy = to[1] - from[1];
        const bx = dx / 2 - dy * bend;
        const by = dy / 2 + dx * bend;
        const frames = [];

        for (let j = 0; j <= FLIGHT_FRAMES; j++) {
            const u = j / FLIGHT_FRAMES;
            const s = u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
            const x = 2 * (1 - s) * s * bx + s * s * dx;
            const y = 2 * (1 - s) * s * by + s * s * dy;

            frames.push({ transform: `translate(${x}px, ${y}px) rotate(${tilt * Math.sin(Math.PI * s)}deg) scale(${grown + (grow - grown) * s})` });
        }

        return el.animate(frames, { duration: LETTER_FLIGHT, delay: later, fill: 'both' });
    }

    function comeIn(i) {
        const card = veil.querySelector('.search-question-card');
        const ground = veil.querySelector('.search-question-ground');
        const options = [...veil.querySelectorAll('.search-option-btn')];

        // The phrase's marks go with their squares -- see hideMarks
        hideMarks(i);

        if (still()) {
            // Not the veil itself: a parent fading would hide from the
            // ground's blur what lies behind it, the blur coming in at the end
            [...veil.children].forEach(el => el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' }));
            return;
        }

        // The phrase's letters in its order, each with the cell it was found in
        const flights = [];
        const { cols, cells } = state.grid;

        state.paths.filter(p => p.phrase === i).sort((a, b) => a.token - b.token).forEach(p => {
            p.cells.forEach((cell, k) => {
                const letter = card.querySelector(`.search-question-letter[data-token="${p.token}"][data-k="${k}"]`);
                if (letter) flights.push({ cell, letter, shown: look(cells[cell[0] * cols + cell[1]]) });
            });
        });

        // The mark's colour as the grid shows it, at LINE_OPACITY over the grid
        const colour = mix(LINE_COLOURS[i % LINE_COLOURS.length], palette.surface, LINE_OPACITY);
        const cell = appRect(svg).width / cols;
        const font = parseFloat(getComputedStyle(card).fontSize);
        const gap = flights.length > 1 ? Math.min(LETTER_GAP, LETTERS_SPAN / (flights.length - 1)) : 0;
        const landed = (k) => k * gap + LETTER_FLIGHT;
        const last = flights.length ? landed(flights.length - 1) : 0;
        const out = last + TILES_REST;

        // Nothing to press until it is there to be seen
        veil.style.pointerEvents = 'none';

        pop(0, 0.08);
        if (flights.length) gust(0, last);

        const going = flights.map(({ cell: at, letter, shown }, k) => {
            const later = k * gap;
            const from = cellMiddle(at);
            const box = appRect(letter);
            const to = [box.left + box.width / 2, box.top + box.height / 2];
            const bend = (Math.random() - 0.5) * 0.4;
            const tilt = (Math.random() < 0.5 ? -1 : 1) * TILE_TILT * (0.4 + Math.random() * 0.6);
            const { square, glyph, side } = tile(from, cell, shown, colour);
            const written = phraseGlyph(from, box, font, letter.textContent);
            const sizes = font / (cell * GRID_FONT);

            flight(square, from, to, [1, box.height * TILE_FIT / side], tilt, bend, later);
            flight(glyph, from, to, [1, sizes / letterFit(shown)], tilt, bend, later);
            const flown = flight(written, from, to, [1 / sizes, 1], tilt, bend, later);

            // On the way the grid's letter gives way to the phrase's
            const swap = { duration: LETTER_FLIGHT * SWAP_FOR, delay: later + LETTER_FLIGHT * SWAP_AT };
            gone(glyph, glyph.animate([{ opacity: 1 }, { opacity: 0 }], { ...swap, fill: 'forwards' }));
            written.animate([{ opacity: 0 }, { opacity: 1 }], { ...swap, fill: 'backwards' });

            // Landed, the card's own letter takes its place
            gone(written, flown);
            letter.animate([{ opacity: 0 }, { opacity: 0 }], { duration: landed(k) });

            // Each lands as a picked cell pops, softer, climbing to the last
            bubblePop(k, landed(k), true);

            // And with all of them there, the squares go
            const fading = square.animate([{ opacity: 1 }, { opacity: 0 }], { duration: TILES_OUT, delay: out, easing: 'ease-in', fill: 'forwards' });
            gone(square, fading);
            return fading;
        });

        // What is not a letter -- a space, an apostrophe, a "?" -- comes with
        // the last of them
        veil.querySelectorAll('.search-question-rest').forEach(el => el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: REST_IN, delay: last, easing: 'ease-out', fill: 'backwards' }));

        // The veil and the card coming in under them as they line up, from
        // the first landing, with a breath
        const under = flights.length ? landed(0) : 0;
        const timing = { duration: GROUND_IN, delay: under, easing: 'ease-out', fill: 'backwards' };

        pop(under, 0.1, 0.45);

        const shown = ground.animate([{ opacity: 0 }, { opacity: 1 }], timing);

        card.animate([
            { backgroundColor: 'transparent', borderColor: 'transparent' },
            { backgroundColor: palette.surface, borderColor: palette.border }
        ], timing);

        const speaker = card.querySelector('.say-all');
        if (speaker) speaker.animate([{ opacity: 0 }, { opacity: 1 }], timing);

        // The options falling from under the phrase, one after another
        options.forEach((btn, k) => btn.animate([
            { transform: 'translateY(-32px)', opacity: 0 },
            { transform: 'translateY(4px)', opacity: 1, offset: 0.7 },
            { transform: 'translateY(0px)', opacity: 1 }
        ], { duration: OPTION_FALL, delay: (flights.length ? out : under + GROUND_IN) + OPTIONS_AFTER + k * OPTION_GAP, easing: 'ease-out', fill: 'backwards' }));

        // There: pressable, and the phrase plain text again -- see drawQuestion
        const ready = going.length ? going[going.length - 1] : shown;
        const here = veil;
        const original = state.sessionPool[i].word.original;

        ready.finished.catch(() => null).then(() => {
            here.style.pointerEvents = '';
            const phrase = here.querySelector('.search-question-phrase');
            if (phrase) phrase.textContent = original;
        });
    }

    /*
     * The question after a find: the phrase, which can be heard, and its
     * translation among others -- see answer for what a press does. The
     * options narrower than the phrase over them, OPTIONS_INSET in from either
     * side (the owner's call, 8 November 2026): the same width, they read as
     * one column of cards with the phrase among them.
     *
     * Its phrase, when a find opens it, a letter to a span, each named by
     * the word and the place in it its cell has in the run (data-token,
     * data-k), for the cells to fly to -- over the squares they come on (see
     * tile), and plain text again once they are gone: a browser that shapes
     * each span apart would leave Arabic letters standing alone; and the veil's colour and blur a layer of their own under
     * the question, to come in after the phrase. `fresh` when a find opens it
     * (see comeIn); drawn again for an answer, on a popup opened again or for
     * the voices, it is simply there.
     */
    const OPTIONS_INSET = 20.5;

    function drawQuestion(fresh) {
        if (veil) veil.remove();
        veil = null;

        const ask = state.asking;
        if (!ask) return;

        const item = state.sessionPool[ask.phrase];

        const words = !fresh ? escapeText(item.word.original) : state.phrases[ask.phrase].parts.map(part => {
            if (part.token === null) return `<span class="search-question-rest">${escapeText(part.text)}</span>`;

            let k = 0;
            return speech.letters(part.text).map(g => LETTER.test(g)
                ? `<span class="search-question-letter" data-token="${part.token}" data-k="${k++}">${escapeText(g)}</span>`
                : `<span class="search-question-rest">${escapeText(g)}</span>`).join('');
        }).join('');

        veil = $(container, `<div class="search-question" style="position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 8; display: flex; align-items: center; justify-content: center; padding: 13.7px; box-sizing: border-box;">
            <div class="search-question-ground" style="position: absolute; top: 0; right: 0; bottom: 0; left: 0; background: ${palette.veil}; ${blurred()}"></div>
            <div style="position: relative; width: 100%; max-width: 330px;">
                <div class="search-question-card" data-press style="padding: 17px 13.7px; background: ${palette.surface}; border: 1px solid ${palette.border}; border-radius: 15.4px; text-align: center; margin-bottom: 10.2px; color: ${palette.ink}; font-size: 25.6px; font-weight: 700; word-break: break-word; cursor: pointer;">
                    ${speech.speakerHtml(item.word.original, item.originalLang, palette.sayIcon, 'margin: 0 0.4em 0 0; font-size: 0.8em; vertical-align: -0.1em;')}<span class="search-question-phrase" style="position: relative; z-index: 2;">${words}</span>
                </div>
                <div class="search-options" style="display: flex; flex-direction: column; gap: 6.8px; margin: 0 ${OPTIONS_INSET}px;"></div>
            </div>
        </div>`);

        veil.querySelector('.search-question-card').addEventListener('click', (e) => {
            speech.say(item.word.original, item.originalLang, null, e.target.closest('.say-all'));
        });

        const list = veil.querySelector('.search-options');

        ask.options.forEach((opt, k) => {
            const btn = $(list, `<button class="search-option-btn" style="width: 100%; padding: 12px 13.7px; background: ${palette.surface}; border: 2px solid ${palette.border}; border-radius: 12px; font-weight: 600; font-size: 14.3px; color: ${palette.ink}; cursor: pointer; text-align: left; display: flex; justify-content: space-between; align-items: center; gap: 8.5px;">
                <span>${escapeText(opt)}</span><span class="status-icon"></span>
            </button>`);

            btn.addEventListener('click', (e) => answer(k, btn, e));
        });

        if (fresh) comeIn(ask.phrase);
    }

    /*
     * An answer, either one, closes the question at once, as searchlines'
     * did -- the owner's call, 8 November 2026: until then a wrong one stayed
     * up with the right one shown, to be pressed to go on. A cloud flies
     * from where the answer was pressed to the phrase above the grid and
     * paints it as it lands, ANSWER_CLOUD the size of the question's: in the
     * colour of the stage the phrase has come to when right, red when wrong.
     *
     * A wrong one takes the phrase's finds off the grid at once, to be found
     * again (searchlines' rule), and the phrase is red until it is done. Found
     * again it is asked again, and that answer writes nothing (see score).
     *
     * The run is changed and saved at the press, not when the cloud lands: a
     * popup closed under the cloud opens with the answer given.
     */
    const ANSWER_CLOUD = 1.5;

    function answer(k, btn, e) {
        const ask = state.asking;
        if (!ask) return;

        const i = ask.phrase;
        const item = state.sessionPool[i];
        const right = ask.options[k] === item.word.translation;

        // From the finger, or from the option when no pointer pressed it
        const scale = appScale();
        const from = e && (e.clientX || e.clientY) ? [e.clientX / scale, e.clientY / scale] : middleOf(btn);

        score(i, right);
        state.asking = null;

        if (right) {
            state.struck[i] = true;
            showMarks(i);
        } else {
            state.missed[i] = true;
            state.found[i] = 0;
            state.paths = state.paths.filter(p => p.phrase !== i);
            drawGrid();
        }

        page.save();
        leave();

        const stage = spacedRepetitions.getWordStats(item.word).stage || 0;

        const landed = () => {
            drawBoard();
            bounce(i);

            if (right) chime(stage);
            else lose();

            if (right) checkDone();
        };

        const bubble = board.querySelector(`.search-bubble[data-phrase="${i}"]`);
        if (still() || !bubble) return landed();

        const colour = right ? tokens.stages()[Math.min(stage, tokens.stages().length - 1)].fill : palette.err;

        fly(from, middleOf(bubble), CLOUD_SIZE * ANSWER_CLOUD, colour);
        setTimeout(landed, CLOUD_FLIGHT);
    }

    // The question going, quicker than it came
    function leave() {
        const was = veil;
        veil = null;
        if (!was) return;

        was.style.pointerEvents = 'none';
        gone(was, was.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-out', fill: 'forwards' }));
    }

    // The phrase above the grid taking its new colour, as searchlines'
    // bounced
    function bounce(i) {
        const el = board.querySelector(`.search-bubble[data-phrase="${i}"]`);
        if (!el || still()) return;

        el.animate([
            { transform: 'scale(1)' },
            { transform: 'scale(1.15)', offset: 0.35 },
            { transform: 'scale(0.94)', offset: 0.7 },
            { transform: 'scale(1)' }
        ], { duration: 420, easing: 'ease-out' });
    }

    let finishing = false;

    function strike(i) {
        state.struck[i] = true;
        drawBoard();
        page.save();
        checkDone();
    }

    function checkDone() {
        if (state.struck.every(Boolean)) {
            finishing = true;
            setTimeout(endRun, NEXT_AFTER);
        }
    }

    /*
     * The run over: the grid stays as the run left it, to be looked at, with
     * the star of the run over it (see endRun), and a press anywhere goes
     * back to the sets -- the owner's call, 8 November 2026. Until then the
     * page went to the sets at once, and the last word found was the last of
     * the run anybody saw.
     *
     * search-won with the star full, as the full star's own screen was
     * called before, and search-over without it -- see ANALYTICS.md. Drawn
     * again, a theme changed under it, the screen keeps the way out and not
     * the star.
     */
    let over = false;

    function showOver() {
        const cls = overFull ? 'search-won' : 'search-over';
        $(container, `<div class="${cls}" data-press title="Back to the sets" style="position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 9; cursor: pointer;"></div>`)
            .addEventListener('click', () => page.home());
    }

    /* -------------------------------------------------------------- render */

    function render() {
        container.innerHTML = '';
        veil = null;
        drag = null;

        header = $(container, `<div class="search-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6.8px;">
            <div class="search-header-info" style="display: flex; flex: 1; align-items: center; gap: 6.8px;">
                <a class="back-btn" href="index.html" title="Back" style="display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; width: 29px; height: 29px; flex: none; background: transparent; border: 1px solid ${palette.chromeBorder}; border-radius: 10.2px; color: ${palette.backBtn}; cursor: pointer; padding: 0; text-decoration: none;"><svg viewBox="0 0 24 24" width="18.8" height="18.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12H5" /><path d="M11 6l-6 6 6 6" /></svg></a>
            </div>
        </div>`);

        header.querySelector('.back-btn').addEventListener('click', (e) => {
            e.preventDefault();
            speech.hush();
            page.home();
        });

        // The settings, and the one line of this game's own: capitals --
        // see look. The grid drawn again in the other case at once
        page.settingsButton(header, palette.backBtn, palette.chromeBorder, [{
            name: 'caps',
            label: 'Capital letters',
            on: caps,
            set: (value) => {
                page.saveSetting('searchCaps', value);
                if (state.grid) drawGrid();
            }
        }]);

        board = $(container, `<div class="search-board" style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 4.5px; margin-bottom: ${GRID_GAP}px;"></div>`);
        gridHost = $(container, `<div class="search-grid-host"></div>`);

        board.addEventListener('click', (e) => {
            const peek = e.target.closest('.search-peek');
            if (peek) return peekAt(+peek.dataset.phrase, +peek.dataset.token);

            const bubble = e.target.closest('.search-bubble');
            const i = bubble ? +bubble.dataset.phrase : -1;
            if (i >= 0 && state.struck[i]) {
                const item = state.sessionPool[i];
                speech.say(item.word.original, item.originalLang);
            }
        });

        if (!state.sessionPool) deal(board);

        if (!state.sessionPool.length || !state.grid) {
            state.sessionPool = null;
            state.allowEarly = false;
            store.save();
            page.finish();
            return;
        }

        fit(board);

        drawBoard();
        drawGrid();

        if (state.asking) drawQuestion();
        if (over) showOver();

        speech.onVoices(voicesKnown);

        page.save();
    }

    // The speaker on the question was drawn on trust, before the voices were
    // known: drawn again once they are. One function, because onVoices keeps
    // one call per function however often a screen asks.
    function voicesKnown() {
        if (state.asking) drawQuestion();
    }

    /*
     * A width that changed -- the handle on the popup's edge, a phone turned
     * -- changes the sizes and nothing else: the grid is the run's, and a grid
     * dealt again would be another run.
     */
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (!board || !state.sessionPool || !state.grid || !fitted || drag) return;
            if (widthOf(board) === fitted.width) return;
            fit(board);
            drawBoard();
            drawGrid();
        }, 150);
    });

    search.render = render;

    search.setTheme = (isDark) => {
        const t = tokens.of(isDark);

        palette = {
            chromeBorder: t.chrome,
            cursor: t.progress,
            stageInk: t.muted,
            backBtn: t.muted,
            surface: t.surface,
            border: t.border,
            ink: t.ink,
            muted: t.muted,
            ok: t.ok,
            err: t.err,
            onResult: '#0f2b3c',
            sayIcon: t.muted,

            // The line while it is being drawn, before it has spelled anything
            drawing: t.muted,

            starEdge: isDark ? STAR_GOLD : '#b7860f',

            veil: fade(t.ground, BLURS ? VEIL_BLURRED : VEIL_PLAIN)
        };
    };

    /*
     * The veil under the question: the page's ground over the grid, blurring
     * it -- the owner's call, 8 November 2026, after an old phone showed the
     * question with nothing under it at all, the grid plain between the
     * options. The colour was a color-mix and the box was set by `inset`, and
     * that phone's browser knew neither: a property it does not know it drops,
     * and the veil had no colour and no size. Now rgba, and the four sides one
     * by one, which every browser reads.
     *
     * Blurred where the browser can (backdrop-filter, -webkit- for Safari),
     * and then lighter, the grid a soft shape behind the question; where it
     * cannot, nearly solid, so that the letters do not show between the
     * options.
     */
    const BLURS = !!(window.CSS && CSS.supports && (CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)')));
    const VEIL_BLUR = 6;
    const VEIL_BLURRED = 0.6;
    const VEIL_PLAIN = 0.94;

    // A colour of the tokens, #rrggbb, at `alpha`
    function fade(hex, alpha) {
        const n = parseInt(hex.slice(1), 16);
        return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
    }

    // `a` of one colour of the tokens over another, both #rrggbb: what a
    // mark at LINE_OPACITY looks like on the grid, as one solid colour
    function mix(hex, under, a) {
        const top = parseInt(hex.slice(1), 16);
        const low = parseInt(under.slice(1), 16);
        const at = (shift) => Math.round(((top >> shift) & 255) * a + ((low >> shift) & 255) * (1 - a));
        return `rgb(${at(16)}, ${at(8)}, ${at(0)})`;
    }

    const blurred = () => (BLURS ? `backdrop-filter: blur(${VEIL_BLUR}px); -webkit-backdrop-filter: blur(${VEIL_BLUR}px);` : '');

    search.start = (setId, allowEarly) => {
        state.selectedSetId = setId;
        state.allowEarly = allowEarly;
    };

    search.getState = () => ({
        selectedSetId: state.selectedSetId,
        allowEarly: state.allowEarly,
        sessionPool: state.sessionPool,
        sessionAt: state.sessionAt,
        sessionResults: state.sessionResults,

        // The grid is random and is the run: saved whole, so that a popup
        // closed and opened again shows the same letters in the same places
        phrases: state.phrases,
        grid: state.grid,
        found: state.found,
        paths: state.paths,
        peeked: state.peeked,
        shown: state.shown,
        struck: state.struck,
        missed: state.missed,
        asking: state.asking,
        ordered: state.ordered
    });

    search.setState = (snap) => {
        if (!snap) return;
        state = { ...getEmptyState(), ...snap };
    };
}

bootGame('search', search);
