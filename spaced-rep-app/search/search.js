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

    // How many answers the question after a find offers: the quiz's numbers
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
            sessionPool: null, sessionAt: null, sessionResults: [], starLevel: 0,
            phrases: [], grid: null, found: [], paths: [], peeked: [], shown: [],
            struck: [], missed: [], asking: null, ordered: false
        };
    }

    /* ---------------------------------------------------------------- star */

    /*
     * The star beside the dots, as Quiz and Wordcraft have it: a run of right
     * answers, and the set's achievement if it is full when the run ends.
     * Written out here again rather than shared -- the owner's rule: each
     * game's achievements are its own, and may go their own ways.
     */
    const STAR_FILL_STEP = 0.2;
    const STAR_TOP = 1 + Math.ceil(1 / STAR_FILL_STEP);
    const STAR_SIZE = 29;
    const WON_SIZE = 168;
    const STAR_GOLD = '#f5bf3a';

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

    const starShare = (level) => (level > 1 ? Math.min(1, (level - 1) * STAR_FILL_STEP) : 0);

    function starHtml(level) {
        return `<svg class="search-star" viewBox="0 0 24 24" width="${STAR_SIZE}" height="${STAR_SIZE}" aria-hidden="true" style="display: block; flex: none; margin: 0 auto 0 8.5px; overflow: visible; opacity: ${level ? 1 : 0};">
            <defs><clipPath id="search-star-shape"><path d="${STAR_PATH}" /></clipPath></defs>
            <g clip-path="url(#search-star-shape)">
                <rect class="search-star-fill" x="${STAR_BOX.x}" y="${STAR_BOX.y}" width="${STAR_BOX.width}" height="${STAR_BOX.height}" fill="${STAR_GOLD}" style="transform-box: fill-box; transform-origin: 50% 100%; transform: scaleY(${starShare(level)});" />
            </g>
            <path d="${STAR_PATH}" fill="none" stroke="${palette.starEdge}" stroke-width="1.1" stroke-linejoin="round" />
        </svg>`;
    }

    const WAVE_START = 140;
    const WAVE_STEP = 70;
    const WAVE_PULSE = 320;
    const DOT_SWELL_MS = 420;
    const STAR_PULSE = 520;

    let answered = null;

    const elapsed = () => (answered ? performance.now() - answered.at : Infinity);

    function waveDots(group) {
        if (!answered || !group) return;

        const gone = elapsed();
        const dots = [...group.children];
        const colour = answered.right ? palette.ok : palette.err;

        const answeredDot = dots[answered.from];
        if (answeredDot && gone < DOT_SWELL_MS) {
            answeredDot.animate([
                { scale: 1 }, { scale: 1.8, offset: 0.3 }, { scale: 0.84, offset: 0.65 }, { scale: 1 }
            ], { duration: DOT_SWELL_MS, delay: -gone, easing: 'ease-out' });
        }

        dots.slice(answered.from + 1).forEach((dot, k) => {
            const delay = WAVE_START + k * WAVE_STEP - gone;
            if (delay + WAVE_PULSE <= 0) return;

            dot.animate([
                { background: palette.dotIdle, transform: 'scale(1)' },
                { background: colour, transform: 'scale(1.4)' },
                { background: palette.dotIdle, transform: 'scale(1)' }
            ], { duration: WAVE_PULSE, delay, easing: 'ease-in-out' });
        });
    }

    function waveStar(star) {
        if (!star) return;

        const now = state.starLevel;
        star.style.opacity = now ? '1' : '0';
        star.querySelector('.search-star-fill').style.transform = `scaleY(${starShare(now)})`;

        if (!answered) return;

        const was = answered.was;
        const delay = answered.arrives - elapsed();
        if (delay + STAR_PULSE <= 0) return;

        const up = now > was || (now === was && now >= STAR_TOP);
        const turn = up ? 0.4 : 0.5;
        const timing = { duration: STAR_PULSE, delay, easing: 'ease-out', fill: 'backwards' };

        star.animate([
            { transform: was ? 'scale(1)' : 'scale(0.4)', opacity: was ? 1 : 0 },
            { transform: up ? 'scale(1.7)' : 'scale(0.5)', opacity: 1, offset: turn },
            { transform: 'scale(1)', opacity: 1 }
        ], timing);

        star.querySelector('.search-star-fill').animate([
            { transform: `scaleY(${starShare(was)})` },
            { transform: `scaleY(${starShare(now)})`, offset: turn },
            { transform: `scaleY(${starShare(now)})` }
        ], timing);
    }

    /*
     * The star hears about a word once: at its answer, or at the first peek
     * if that came first -- a word peeked at can no longer be a right answer,
     * and its dot goes red then, as Wordcraft's does for a word heard.
     */
    function starAnswered(phrase, right) {
        const was = Math.min(STAR_TOP, state.starLevel);
        if (!right && !was) return;

        state.starLevel = right ? Math.min(STAR_TOP, was + 1) : 1;

        const waiting = Math.max(0, state.sessionPool.length - phrase - 1);
        answered = { at: performance.now(), from: phrase, right, was, arrives: WAVE_START + waiting * WAVE_STEP };

        waveStar(container.querySelector('.search-star'));
    }

    const WON_FLIGHT = 1100;
    const WON_TURN = 144;
    const WON_SHINE = 1900;

    // A run ended with the star full -- Quiz's ending, see winStar there
    async function winStar() {
        store.achieve(state.selectedSetId, 'search', 'star', state.sessionResults.filter(r => r === 'correct').length);
        page.endSession();

        const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const small = container.querySelector('.search-star');

        if (small && !still) await Promise.all(small.getAnimations({ subtree: true }).map(a => a.finished)).catch(() => null);

        const veil = $(container, `<div class="search-won" data-press title="Back to the sets" style="position: fixed; inset: 0; z-index: 9; display: flex; align-items: center; justify-content: center; background: ${palette.veil}; cursor: pointer;">
            <svg class="search-won-star" viewBox="0 0 24 24" width="${WON_SIZE}" height="${WON_SIZE}" aria-hidden="true" style="display: block; overflow: visible;">
                <defs>
                    <linearGradient id="search-won-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a0" /><stop offset="0.6" stop-color="${STAR_GOLD}" /><stop offset="1" stop-color="#e3a51c" /></linearGradient>
                    <linearGradient id="search-won-glint" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity="0" /><stop offset="0.5" stop-color="#ffffff" stop-opacity="0.85" /><stop offset="1" stop-color="#ffffff" stop-opacity="0" /></linearGradient>
                    <clipPath id="search-won-shape"><path d="${STAR_PATH}" /></clipPath>
                </defs>
                <path d="${STAR_PATH}" fill="url(#search-won-gold)" />
                <g clip-path="url(#search-won-shape)">
                    <rect class="search-won-glint" x="-4" y="0" width="5" height="24" fill="url(#search-won-glint)" style="transform-box: fill-box; transform-origin: center; transform: skewX(-20deg); opacity: 0;" />
                </g>
                <path d="${STAR_PATH}" fill="none" stroke="${palette.starEdge}" stroke-width="0.7" stroke-linejoin="round" />
            </svg>
        </div>`);

        veil.addEventListener('click', () => page.home());

        if (small) small.style.visibility = 'hidden';
        if (still) return;

        const big = veil.querySelector('.search-won-star');

        if (small) {
            const from = appRect(small);
            const to = appRect(big);
            const dx = from.left + from.width / 2 - (to.left + to.width / 2);
            const dy = from.top + from.height / 2 - (to.top + to.height / 2);

            big.animate([
                { transform: `translate(${dx}px, ${dy}px) scale(${from.width / to.width}) rotate(${-WON_TURN}deg)`, easing: 'ease-in-out' },
                { transform: 'translate(0px, 0px) scale(1.12) rotate(0deg)', offset: 0.8, easing: 'ease-out' },
                { transform: 'translate(0px, 0px) scale(1) rotate(0deg)' }
            ], { duration: WON_FLIGHT });
        }

        veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: WON_FLIGHT * 0.5, easing: 'ease-out' });

        big.animate([
            { filter: 'drop-shadow(0 0 0px rgba(255, 214, 92, 0))' },
            { filter: 'drop-shadow(0 0 22px rgba(255, 214, 92, 0.9))', offset: 0.5 },
            { filter: 'drop-shadow(0 0 0px rgba(255, 214, 92, 0))' }
        ], { duration: WON_SHINE, delay: WON_FLIGHT, iterations: Infinity, easing: 'ease-in-out' });

        veil.querySelector('.search-won-glint').animate([
            { transform: 'translateX(0px) skewX(-20deg)', opacity: 1 },
            { transform: 'translateX(30px) skewX(-20deg)', opacity: 1, offset: 0.55 },
            { transform: 'translateX(30px) skewX(-20deg)', opacity: 0 }
        ], { duration: WON_SHINE, delay: WON_FLIGHT, iterations: Infinity, easing: 'ease-in-out' });
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
     * Upper case where that leaves one letter, as Snake has it: 'ß' becomes
     * 'SS', and a cell holds one. In the set's language, so that Turkish i
     * comes out dotted.
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

    const lettersOf = (text, lang) => speech.letters(text).filter(g => LETTER.test(g)).map(g => shownAs(g, lang));

    /*
     * A word or a phrase of the set as this game needs it: the parts its line
     * is written in, the words of it to be found -- one after another along
     * its snake, each traced on its own and in order, as searchlines found
     * them -- and what it shows of itself.
     *
     * Words as speech.words cuts them, which is spaces unless the player asked
     * for the dictionary's answer: a Chinese phrase with no spaces in it is
     * one word to find, which is what a reader of it would look for.
     */
    function phraseOf(item) {
        const stage = spacedRepetitions.getWordStats(item.word).stage || 0;
        const lang = item.originalLang;
        const parts = [];
        const tokens = [];

        speech.words(item.word.original || '').forEach(part => {
            const letters = part.isWord ? lettersOf(part.text, lang) : [];

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
            pool = pool.concat(lettersOf(item.word.original || '', item.originalLang));
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

    const STAGE_HINT = 'The stage of this word: how well you know it. The higher it is, the less it shows of itself.';

    // The word being worked on: the one asked about, the one the order is at,
    // or one with a word of it found
    function current() {
        if (state.asking) return state.asking.phrase;

        const open = state.phrases.map((_, i) => i).filter(i => !state.struck[i]);
        if (state.ordered) return open.length ? open[0] : -1;

        const started = open.find(i => state.found[i] > 0);
        return started === undefined ? -1 : started;
    }

    function dotsHtml() {
        const now = current();

        return state.sessionPool.map((item, i) => {
            const res = state.sessionResults[i];
            let bg = palette.dotIdle;
            if (res === 'correct') bg = palette.ok;
            if (res === 'wrong' || (!res && state.peeked[i] !== null)) bg = palette.err;

            return page.dotHtml('search-dot', bg, i === now, item.word, palette, STAGE_HINT);
        }).join('');
    }

    function refreshDots() {
        const group = header && header.querySelector('.search-dots-group');
        if (!group) return;

        group.innerHTML = dotsHtml();
        waveDots(group);
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
     * says itself when pressed.
     *
     * `measure` is the word drawn to be measured, as it stands at the deal.
     */
    function bubbleHtml(phrase, i, item, measure) {
        const live = !measure;
        const struck = live && state.struck[i];
        const found = live ? state.found[i] : 0;
        const missed = live && state.missed[i];
        const asked = live && state.ordered && current() === i && !struck;

        const blur = 'filter: blur(0.32em);';

        const line = phrase.parts.map(part => {
            if (part.token === null) return escapeText(part.text);

            const t = part.token;
            const isFound = !struck && t < found;
            const peeked = live && state.shown[i][t];
            const hidden = phrase.hideOriginal && !struck && !isFound && !peeked;
            const ink = isFound ? palette.ok : (peeked && !struck ? palette.err : 'inherit');

            return hidden
                ? `<span class="search-peek" data-press data-phrase="${i}" data-token="${t}" title="Peek at the word -- it then counts as not known" style="display: inline-block; ${blur} cursor: pointer;">${escapeText(part.text)}</span>`
                : `<span style="color: ${ink};">${escapeText(part.text)}</span>`;
        }).join('');

        const translation = item.word.translation;
        const hideTranslation = phrase.hideTranslation && !struck;

        let bg = palette.surface;
        let ink = palette.ink;
        let edge = missed ? palette.err : palette.border;

        if (struck) {
            const stage = spacedRepetitions.getWordStats(item.word).stage || 0;
            const tone = tokens.stages()[Math.min(stage, tokens.stages().length - 1)];
            bg = tone.fill;
            ink = tone.ink;
            edge = tone.fill;
        }

        const ring = asked ? `outline: 2px solid ${palette.cursor};` : '';
        const press = struck ? ' data-press title="Say it"' : '';

        return `<div class="search-bubble"${press} data-phrase="${i}" style="padding: 0.3em 0.6em; border-radius: 0.9em; background: ${bg}; color: ${ink}; border: 1px solid ${edge}; ${ring} text-align: center; line-height: 1.15; max-width: 100%; box-sizing: border-box; cursor: ${struck ? 'pointer' : 'default'}; user-select: none; -webkit-user-select: none;">
            <div style="font-weight: 700; word-break: break-word;">${line}</div>
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

    function lineXY(at) {
        return `${at[1] * 10 + 5},${at[0] * 10 + 5}`;
    }

    // A path through cells as a polyline's points; a path of one cell, a dot
    const pointsOf = (cells) => (cells.length > 1 ? cells : [cells[0], cells[0]]).map(lineXY).join(' ');

    function lineHtml(path, colour, cls) {
        return `<polyline class="${cls || 'search-line'}" points="${pointsOf(path.cells)}" stroke="${colour}" opacity="${LINE_OPACITY}" />`;
    }

    function drawGrid() {
        const { rows, cols, cells } = state.grid;
        const cell = fitted.cell;

        gridHost.innerHTML = `<svg class="search-grid" data-untracked viewBox="0 0 ${cols * 10} ${rows * 10}" width="${+(cols * cell).toFixed(2)}" height="${+(rows * cell).toFixed(2)}" style="display: block; box-sizing: border-box; margin: 0 auto; touch-action: none; user-select: none; -webkit-user-select: none; background: ${palette.surface}; border: 1px solid ${palette.border}; border-radius: ${+(cell * 0.3).toFixed(2)}px; cursor: pointer; overflow: hidden;">
            <g class="search-lines" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="7.2">
                ${state.paths.map(p => lineHtml(p, LINE_COLOURS[p.phrase % LINE_COLOURS.length])).join('')}
            </g>
            <g class="search-letters" font-size="5.4" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="${palette.ink}" style="pointer-events: none;">
                ${cells.map((ch, k) => `<text x="${(k % cols) * 10 + 5}" y="${Math.floor(k / cols) * 10 + 5.3}">${escapeText(ch)}</text>`).join('')}
            </g>
        </svg>`;

        svg = gridHost.querySelector('svg');
        bindGrid();
    }

    /* ------------------------------------------------------------- tracing */

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

    /*
     * The trace: the cells the finger has gone through, one after another.
     * A cell is entered when the pointer comes within INNER of its middle
     * rather than over its edge, so that a finger going past a corner does
     * not take the cell beside it, and one resting on an edge does not
     * flicker between two. Going back into the cell before takes the last
     * step back; a cell the trace already holds is not entered again.
     *
     * Across a corner only while a word of the run may step that way (see
     * DIAGONAL_FROM), and then only when the finger kept further than CORNER
     * from both cells beside it: a bend, as a finger draws one, is round and
     * cuts its corner. Otherwise the trace goes round the corner, through
     * whichever of the two the finger came nearer. A finger quick enough to
     * jump cells gets the ones between.
     *
     * Round through a cell the trace already holds -- back, that is -- only
     * when the finger plainly went nearer it, by BACK_BIAS: a fast finger
     * leaves no points near either cell, and a step across a corner is then
     * a step on, not back over the word (found by tracing "hola" round its
     * bend in two moves, 8 November 2026).
     */
    const INNER = 0.45;
    const CORNER = 0.6;
    const BACK_BIAS = 0.15;

    const slanting = () => state.phrases.some((p, i) => !state.struck[i] && p.stage >= DIAGONAL_FROM);

    // The next cell of the trace on its way to `to`
    function stepToward(to) {
        const at = drag.cells[drag.cells.length - 1];
        const dr = Math.sign(to[0] - at[0]);
        const dc = Math.sign(to[1] - at[1]);
        if (!dr || !dc) return [at[0] + dr, at[1] + dc];

        const nearest = (cell) => Math.min(...drag.trail.map(p => Math.hypot(p[0] - cell[0], p[1] - cell[1])));
        const cost = (cell) => nearest(cell) + (drag.cells.some(c => same(c, cell)) ? BACK_BIAS : 0);

        const down = [at[0] + dr, at[1]];
        const across = [at[0], at[1] + dc];

        if (drag.slant && Math.min(nearest(down), nearest(across)) > CORNER) return [at[0] + dr, at[1] + dc];
        return cost(down) <= cost(across) ? down : across;
    }

    /*
     * Which word the trace spells, if any: the next unfound word of a phrase
     * not yet done -- the words of a phrase are found in their order, as in
     * searchlines -- read either way along it, since a snake is traced from
     * whichever end the eye found first. A phrase already begun is preferred,
     * and in an ordered run only the phrase the order is at counts.
     *
     * Any trace that spells the word counts, not only the snake it was laid
     * along: the filler can spell a word by chance, and finding it there is
     * finding it. Nothing found is kept from being traced again, so a find
     * in the wrong place never leaves a word that cannot be found.
     */
    function spelled(letters) {
        const forward = letters.join('');
        const backward = letters.slice().reverse().join('');
        const open = state.phrases.map((_, i) => i).filter(i => !state.struck[i] && !(state.asking && state.asking.phrase === i));

        const candidates = state.ordered ? open.slice(0, 1) : open.filter(i => state.found[i] > 0).concat(open.filter(i => state.found[i] === 0));

        for (const i of candidates) {
            const tokenAt = state.found[i];
            const token = state.phrases[i].tokens[tokenAt];
            if (!token) continue;

            const word = token.join('');
            if (word === forward || word === backward) return { phrase: i, token: tokenAt };
        }

        return null;
    }

    function bindGrid() {
        svg.addEventListener('pointerdown', (e) => {
            if (state.asking || drag || finishing) return;

            const point = pointAt(e);
            const from = [Math.round(point[0]), Math.round(point[1])];
            if (!inside(from[0], from[1])) return;

            e.preventDefault();
            try { svg.setPointerCapture(e.pointerId); } catch (err) { }

            const el = $(svg.querySelector('.search-lines'), `<polyline class="search-drawn" points="${pointsOf([from])}" stroke="${palette.drawing}" opacity="${LINE_OPACITY}" />`);
            drag = { id: e.pointerId, cells: [from], trail: [point], slant: slanting(), el };
        });

        svg.addEventListener('pointermove', (e) => {
            if (!drag || drag.id !== e.pointerId) return;
            follow(pointAt(e));
        });

        const end = (e) => {
            if (!drag || drag.id !== e.pointerId) return;
            if (e.type === 'pointerup' && check(true)) return;

            const el = drag.el;
            drag = null;

            // Not a word: the trace fades where it was drawn
            el.animate([{ opacity: LINE_OPACITY }, { opacity: 0 }], { duration: 220, easing: 'ease-out' }).finished
                .catch(() => null).then(() => el.remove());
        };

        svg.addEventListener('pointerup', end);
        svg.addEventListener('pointercancel', end);
    }

    function follow(point) {
        drag.trail.push(point);

        const to = [Math.round(point[0]), Math.round(point[1])];
        if (!inside(to[0], to[1]) || Math.hypot(point[0] - to[0], point[1] - to[1]) > INNER) return;

        const cells = drag.cells;
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

        drag.el.setAttribute('points', pointsOf(cells));
        check();
    }

    /*
     * The moment the trace spells a word it is that word's: it takes the
     * word's colour and stays, whatever the finger does next -- searchlines'
     * rule, which is what makes a find feel like one.
     *
     * Except a trace of one cell, which is a word only when the finger is
     * `lifted` there. Taken at once, the "a" of "a la derecha" was found by
     * every press on an A, and took the trace of "abierto" from its first
     * cell (8 November 2026).
     */
    function check(lifted) {
        if (drag.cells.length < 2 && !lifted) return false;

        const { cols, cells } = state.grid;
        const hit = spelled(drag.cells.map(([r, c]) => cells[r * cols + c]));
        if (!hit) return false;

        const path = { phrase: hit.phrase, token: hit.token, cells: drag.cells.slice() };
        drag.el.remove();
        drag = null;

        found(path);
        return true;
    }

    function found(path) {
        const i = path.phrase;

        state.paths.push(path);
        state.found[i] += 1;

        $(svg.querySelector('.search-lines'), lineHtml(path, LINE_COLOURS[i % LINE_COLOURS.length]));

        drawBoard();
        refreshDots();

        // The whole phrase: said, and asked about
        if (state.found[i] >= state.phrases[i].tokens.length) {
            const item = state.sessionPool[i];
            speech.say(item.word.original, item.originalLang);

            if (item.word.translation) {
                state.asking = { phrase: i, options: optionsFor(item), picked: null };
                setTimeout(drawQuestion, 350);
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
     * becomes the share of its words found before the first peek (see score),
     * and its dot goes red at once. Saved straight away, so that closing the
     * popup does not refund it.
     */
    function peekAt(i, t) {
        if (state.struck[i] || state.shown[i][t]) return;

        state.shown[i][t] = true;

        if (state.peeked[i] === null) {
            state.peeked[i] = state.found[i];
            if (!state.sessionResults[i]) starAnswered(i, false);
        }

        drawBoard();
        refreshDots();
        page.save();
    }

    /* ------------------------------------------------------------ question */

    // The translations on offer: from the word's own set, as the quiz takes them
    function optionsFor(item) {
        const right = item.word.translation;
        const stage = spacedRepetitions.getWordStats(item.word).stage || 0;
        const count = Math.min(stage + LEAST_OPTIONS, MOST_OPTIONS);

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

        // A peek told the star already -- see peekAt
        if (peeked === null) starAnswered(i, share === 1);

        store.save();
    }

    let veil = null;

    /*
     * The question after a find: the phrase, which can be heard, and its
     * translation among others. Right, and it is done; wrong, and the right
     * one is shown, pressed to go on -- and the phrase's lines come off the
     * grid, to be found again (searchlines' rule). A phrase found again is
     * asked again, and that answer writes nothing.
     */
    function drawQuestion() {
        if (veil) veil.remove();
        veil = null;

        const ask = state.asking;
        if (!ask) return;

        const item = state.sessionPool[ask.phrase];
        const right = item.word.translation;

        veil = $(container, `<div class="search-question" style="position: fixed; inset: 0; z-index: 8; display: flex; align-items: center; justify-content: center; padding: 13.7px; box-sizing: border-box; background: ${palette.veil};">
            <div style="width: 100%; max-width: 330px;">
                <div class="search-question-card" data-press style="padding: 17px 13.7px; background: ${palette.surface}; border: 1px solid ${palette.border}; border-radius: 15.4px; text-align: center; margin-bottom: 10.2px; color: ${palette.ink}; font-size: 25.6px; font-weight: 700; word-break: break-word; cursor: pointer;">
                    ${speech.speakerHtml(item.word.original, item.originalLang, palette.sayIcon, 'margin: 0 0.4em 0 0; font-size: 0.8em; vertical-align: -0.1em;')}${escapeText(item.word.original)}
                </div>
                <div class="search-options" style="display: flex; flex-direction: column; gap: 6.8px;"></div>
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

            const isRight = opt === right;

            if (ask.picked !== null) {
                if (isRight) mark(btn, palette.ok, '✓');
                else if (k === ask.picked) mark(btn, palette.err, '✕');
                else btn.style.opacity = '0.5';
            }

            btn.addEventListener('click', () => {
                if (ask.picked === null) {
                    ask.picked = k;
                    score(ask.phrase, isRight);
                    refreshDots();

                    if (isRight) {
                        mark(btn, palette.ok, '✓');
                        page.save();
                        setTimeout(() => close(true), NEXT_AFTER);
                        return;
                    }

                    drawQuestion();
                    page.save();
                } else if (isRight) {
                    close(ask.picked === k);
                }
            });
        });

        /*
         * Answered right and closed in the 0.7s before the phrase was struck:
         * it opens on the answer and goes on, as Wordcraft's word does -- a
         * right answer with nothing left to press would be a question that
         * cannot be closed.
         */
        if (ask.picked !== null && ask.options[ask.picked] === right) setTimeout(() => close(true), NEXT_AFTER);
    }

    function mark(btn, fill, sign) {
        btn.style.background = fill;
        btn.style.borderColor = fill;
        btn.style.color = palette.onResult;
        btn.querySelector('.status-icon').textContent = sign;
    }

    function close(right) {
        const i = state.asking ? state.asking.phrase : -1;
        if (i < 0) return;

        state.asking = null;
        if (veil) veil.remove();
        veil = null;

        if (right) {
            strike(i);
        } else {
            state.missed[i] = true;
            state.found[i] = 0;
            state.paths = state.paths.filter(p => p.phrase !== i);
            drawGrid();
            drawBoard();
            refreshDots();
            page.save();
        }
    }

    let finishing = false;

    function strike(i) {
        state.struck[i] = true;
        drawBoard();
        refreshDots();
        page.save();

        if (state.struck.every(Boolean)) {
            finishing = true;
            setTimeout(() => {
                state.sessionPool = null;
                if (state.starLevel >= STAR_TOP) winStar();
                else page.finish();
            }, NEXT_AFTER);
        }
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
            <div class="search-dots-group" style="display: flex; flex: 1; justify-content: center; align-items: center; gap: ${page.DOT_GAP}px;"></div>
        </div>`);

        header.querySelector('.back-btn').addEventListener('click', (e) => {
            e.preventDefault();
            speech.hush();
            page.home();
        });

        page.muteButton(header, palette.backBtn, palette.chromeBorder);

        const end = header.querySelector('.game-header-end');
        if (end) end.insertAdjacentHTML('afterbegin', starHtml(state.starLevel));

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

        header.querySelector('.search-dots-group').innerHTML = dotsHtml();
        waveDots(header.querySelector('.search-dots-group'));
        waveStar(header.querySelector('.search-star'));

        drawBoard();
        drawGrid();

        if (state.asking) drawQuestion();

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
            dotIdle: t.border,
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
            veil: `color-mix(in srgb, ${t.ground} 82%, transparent)`
        };
    };

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
        starLevel: state.starLevel,

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
