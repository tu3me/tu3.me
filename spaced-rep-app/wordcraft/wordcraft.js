/**
 * "Wordcraft" game. The word is cut into pieces, the pieces are laid out in no
 * order with pieces of other words mixed in among them, and the player puts the
 * word back together by clicking them.
 *
 * Every piece is judged as it is laid -- the owner's call, 11 November 2026,
 * which took Check and Undo away. What is judged is its letters against the
 * letters of the line where it would go, not which tile it was: the same word
 * can come out of a different handful of tiles, and somebody who spelled the
 * word spelled the word. A piece that does not go there goes up to the line,
 * is turned back and returns to its place, and the first such piece is the
 * round's verdict -- see reject.
 *
 * Both numbers come off the word's own stage, the way the quiz takes its option
 * count from it: a word seen once is cut in two with nothing standing beside
 * it, and a word that has been up the ladder is cut as fine as its letters go
 * with strangers around it.
 *
 * The top of the screen is the snake's — the translation to go on, the word as
 * a row of boxes that fill as the pieces land, the speaker in front of it and
 * the same taps on an open letter. What is under it is the only part that
 * differs, and it is where this game is played.
 */
function wordcraft(container) {
    // How many words a session takes — this game's own decision, and the same
    // ten the other three happen to have made.
    const POOL_LIMIT = 10;

    /*
     * The fewest pieces a word is ever cut into.
     *
     * One piece is the word itself, and clicking it asks nothing. Two is the
     * smallest cut that can be got wrong, which is the same floor the quiz puts
     * under its options and for the same reason.
     */
    const LEAST_PIECES = 2;

    /*
     * The stage a word has to reach before strangers turn up beside its pieces;
     * after it there is one more of them per stage.
     *
     * Four, so the first stranger arrives at stage 5. Everything under that is
     * the day the word was met: stages 1 to 4 wait five minutes, a quarter of
     * an hour, three quarters and two — the whole ladder below 5 fits inside
     * one evening — and there the cut is question enough on its own. A tray
     * with nothing wrong in it can be read straight through, which is what
     * learning to spell a word looks like.
     *
     * Strangers come in where the question would otherwise start getting
     * easier, since every stage cuts the word finer and finer pieces are a
     * shorter thing to spell. It was two before, which put them on the tray
     * within minutes of the first right answer: a word still being met, cut in
     * three, with somebody else's pieces beside it.
     */
    const DECOYS_FROM = 4;

    /*
     * What hearing the word takes off the round.
     *
     * The speaker reads the whole line out from the first frame, and that used
     * to be free: what is asked here is how a word is written, and a sound does
     * not answer it. Except that it very nearly does — told the word, the tray
     * stops being "which word is this" and becomes "spell the word you have
     * just been given", and those are not the same round.
     *
     * So it has a price: a tenth. Any price at all misses the only number that
     * counts as knowing the word -- srs.js reads a 1 and nothing else as
     * success, so 0.9 is a word that comes round again -- and a tenth also
     * shows in every figure made of the results rather than only in that one.
     * It was a hundredth until 21 October 2026, the smallest price there is;
     * the answers recorded before keep the 0.99 they were given.
     */
    const HEARD_COST = 0.1;

    let state = getEmptyState();
    let palette = {};

    // The word spelled right goes on to the next by itself, this long after
    // -- see moveOn in render -- and which word that has been set going for.
    // 700 until 11 November 2026, when the line began taking a bow in that
    // beat (see celebrate): at 700 the next word cut the confetti off mid-air.
    const NEXT_AFTER = 1000;
    let movingOn = -1;

    /*
     * The look of a game rather than of a form -- the owner's call, 11
     * November 2026: the mechanic is a good one and the screen was dull. Three
     * games built on this one were tried that day and taken back, and this is
     * what was asked for instead: the same game, with a board, tiles with some
     * weight to them, and things that move.
     *
     * A piece flies from the tray into its boxes and its letters stay there
     * (see flyIn); taken back, or sent back by Check, it flies home. FLY_MS
     * is one flight: 360 ms at first, and that was slow to watch piece after
     * piece (the owner, the same evening).
     */
    const FLY_MS = 240;

    /*
     * And in a craft look rather than a toy one -- the owner's call the same
     * evening: candy colours, gloss and bounce made it a children's game, and
     * it should be modern, a bit hipster, crafty. So paper and ink: a kraft
     * board with a grain to it, cream card tiles outlined in ink and standing
     * on a hard shadow cast down and to the right, muted earth colours, and
     * motion that settles rather than springs. The colours are in setTheme.
     *
     * The type on a tile, and how far a tile stands off the board: the
     * shadow's offset, and as far as a press pushes it in.
     */
    const TILE_FONT = 20.5;
    const TILE_EDGE = 3;

    /*
     * The air round the pieces: from the banner down to them, and from them
     * to the bottom of the screen, the same -- the owner's call, 11 November
     * 2026, looking at the popup: the pieces were centred in a board never
     * shorter than 168px, with a row kept for the buttons under it, and that
     * left twice this above them and five times this below. The screen now
     * takes its height from the rows of pieces, and a word in one row is a
     * shorter popup than a word in three.
     *
     * The banner's own margin and the page's padding are part of the air, so
     * the board's padding is what is left of it: BANNER_GAP and PAGE_PAD are
     * those two, written out here because the board has to know them.
     */
    const PIECES_AIR = 37;
    const BANNER_GAP = 10.2;
    const PAGE_PAD = 6.8;

    const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

    /*
     * The boxes a piece in the air is flying to: slot -> the moment it lands.
     * They stay empty until then, and their letters pop in when it gets there.
     *
     * Outside render, as `answered` is, and for the same reason: the screen
     * is drawn again when the voices arrive, and a piece in the air then has
     * to land in the new boxes -- not find its letters already standing there.
     */
    const landing = new Map();

    // The round whose entrance has been played, and when: a redraw in the
    // middle of it goes on from where it was rather than starting it again
    let introduced = { key: null, at: 0 };

    /*
     * Every how many pieces laid one leaves a wet print rather than a blot
     * (see wetPrint), and which tiles have: "round:tile". Outside render, so
     * that a redraw keeps the print where it was; not saved, so a popup
     * opened again shows a blot there -- the count goes on (piecesLaid), the
     * print is only a joke.
     */
    const WET_EVERY = 20;
    const wet = new Set();

    function getEmptyState() {
        return {
            selectedSetId: null, currentIndex: 0, sessionResults: [], sessionPool: null,
            sessionAt: null, allowEarly: false, round: null, starLevel: 0,

            // Every piece laid in the session, for the wet print left by
            // every WET_EVERY-th of them -- see wetPrint
            piecesLaid: 0
        };
    }

    /*
     * The star beside the dots: a run of right answers, kept in the session
     * while it is played, and in the set's achievements if it is full when the
     * session ends -- the owner's call, 3 November 2026, after Snake's (see
     * STAR_TOP in snake.js). Written out here again rather than shared, which
     * is the owner's rule too: each game's achievements are its own, and may
     * go their own ways.
     *
     * Counted in steps. Nought is no star at all; the first right answer puts
     * up its outline, and every one after that fills another STAR_FILL_STEP
     * of it with gold from the bottom up -- five of them to fill it. Right
     * answers past a full star change nothing; a wrong one takes it back to
     * the outline.
     */
    const STAR_FILL_STEP = 0.2;
    const STAR_TOP = 1 + Math.ceil(1 / STAR_FILL_STEP);

    // The star in the header, the size of the buttons at its two ends
    const STAR_SIZE = 29;

    // And over the middle of the screen when it is won, and the gold of both
    const WON_SIZE = 168;
    const STAR_GOLD = '#f5bf3a';

    /*
     * The star with its corners rounded, the same drawing as Snake's: the ten
     * corners of the usual five-pointed star, each cut back along both its
     * edges and turned with a curve, the points by more than the hollows.
     * STAR_BOX is what the gold is measured against.
     */
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

    // How much of the star is gold at `level`
    const starShare = (level) => (level > 1 ? Math.min(1, (level - 1) * STAR_FILL_STEP) : 0);

    // The star in the header: out of sight at nought. The gold is a rectangle
    // clipped to the star and scaled up from its foot -- clipped on a group
    // round it, or the clip would shrink with the fill.
    function starHtml(level) {
        return `<svg class="wordcraft-star" viewBox="0 0 24 24" width="${STAR_SIZE}" height="${STAR_SIZE}" aria-hidden="true" style="display: block; flex: none; margin: 0 auto 0 8.5px; overflow: visible; opacity: ${level ? 1 : 0};">
            <defs><clipPath id="wordcraft-star-shape"><path d="${STAR_PATH}" /></clipPath></defs>
            <g clip-path="url(#wordcraft-star-shape)">
                <rect class="wordcraft-star-fill" x="${STAR_BOX.x}" y="${STAR_BOX.y}" width="${STAR_BOX.width}" height="${STAR_BOX.height}" fill="${STAR_GOLD}" style="transform-box: fill-box; transform-origin: 50% 100%; transform: scaleY(${starShare(level)});" />
            </g>
            <path d="${STAR_PATH}" fill="none" stroke="${palette.starEdge}" stroke-width="1.1" stroke-linejoin="round" />
        </svg>`;
    }

    /*
     * An answer on its way to the star, as Snake sends it: the answered dot
     * swells once, every dot still waiting to its right lights up in the
     * answer's colour one after another, and the star takes the news when
     * the light gets to it -- swelling as the gold rises, or shrinking as it
     * drains.
     *
     * Kept as when it was sent rather than as animations on nodes, because
     * this game draws its screen again for every word, and its dots again
     * whenever one changes colour -- and Next can be pressed with the light
     * still on its way. Whatever is drawn again takes
     * the light up from where it was by a negative delay -- see waveDots and
     * waveStar.
     */
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

    // The star at the level it has come to, and the swell or the shrink it
    // takes the news with when the light gets there
    function waveStar(star) {
        if (!star) return;

        const now = state.starLevel;
        star.style.opacity = now ? '1' : '0';
        star.querySelector('.wordcraft-star-fill').style.transform = `scaleY(${starShare(now)})`;

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

        star.querySelector('.wordcraft-star-fill').animate([
            { transform: `scaleY(${starShare(was)})` },
            { transform: `scaleY(${starShare(now)})`, offset: turn },
            { transform: `scaleY(${starShare(now)})` }
        ], timing);
    }

    /*
     * The star hears about an answer the moment its dot takes its colour,
     * once a word: from scoreRound, or from hearWord before any verdict --
     * a word heard is a word told, and its dot goes red then, as Snake has
     * it. A wrong answer with no star up sends nothing: there is no star for
     * the light to reach.
     */
    function starAnswered(right) {
        const was = Math.min(STAR_TOP, state.starLevel);
        if (!right && !was) return;

        state.starLevel = right ? Math.min(STAR_TOP, was + 1) : 1;

        const waiting = Math.max(0, state.sessionResults.length - state.currentIndex - 1);
        answered = { at: performance.now(), from: state.currentIndex, right, was, arrives: WAVE_START + waiting * WAVE_STEP };

        waveStar(container.querySelector('.wordcraft-star'));
    }

    /*
     * The end of a session with the star full: it goes into the set's
     * achievements, flies out of the header to the middle of the screen and
     * stays there shining, and a press on it -- or anywhere -- is the way back
     * to the catalog. Not full, the session ends as it always did, straight
     * back to the catalog.
     *
     * The session is over the moment this begins (page.endSession), so that a
     * popup closed while the star is up leaves a finished session behind. The
     * star waits for itself to have finished filling first: the last answer
     * is what fills it, and Next can come before it has.
     *
     * The voice is left to finish: the last word is said as it is spelled,
     * and the star coming out is no reason to cut it short. It was hushed
     * here until 3 November 2026, and the last word of a session was never
     * heard to its end.
     *
     * With reduced motion nothing flies or shines: the star is simply there.
     *
     * The press is written down as `wordcraft-won` -- see ANALYTICS.md: the veil is
     * no button, and data-press is what makes it one to the analytics.
     */
    const WON_FLIGHT = 1100;
    const WON_TURN = 144;
    const WON_SHINE = 1900;

    /*
     * Keyboard: ←/→ move over the pieces still in play, ↑ takes the one pointed
     * at -- the owner's call, 4 November 2026. ↓ took back the last piece until
     * 11 November, when Undo went (see reject); ↑ with the line full was Check.
     * And ↑ on a last word presses Finish!, pointed at or not: there is no piece
     * left to point at, and it is the only way out of a last word for somebody
     * on the keyboard.
     *
     * Nothing is pointed at until a key asks, as in the quiz: → then lands on the
     * first piece and ← on the last. Nothing on the screen says the keys exist,
     * which is also the owner's call.
     */
    const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp'];

    let keyHandler = null;

    // One listener at a time: every word draws the screen and binds its own
    function bindKeys(onKey) {
        unbindKeys();
        keyHandler = (e) => {
            if (e.repeat || !KEYS.includes(e.code)) return;
            e.preventDefault(); // arrows would scroll the popup otherwise
            onKey(e.code);
        };
        window.addEventListener('keydown', keyHandler);
    }

    function unbindKeys() {
        if (keyHandler) window.removeEventListener('keydown', keyHandler);
        keyHandler = null;
    }

    async function winStar() {
        store.achieve(state.selectedSetId, 'wordcraft', 'star', state.sessionResults.filter(r => r === 'correct').length);
        page.endSession();
        unbindKeys();

        const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const small = container.querySelector('.wordcraft-star');

        if (small && !still) await Promise.all(small.getAnimations({ subtree: true }).map(a => a.finished)).catch(() => null);

        // The star out to the middle of the screen, to a fanfare
        sfx.fanfare();

        const veil = $(container, `<div class="wordcraft-won" data-press title="Back to the sets" style="position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 9; display: flex; align-items: center; justify-content: center; background: ${palette.veil}; cursor: pointer;">
            <svg class="wordcraft-won-star" viewBox="0 0 24 24" width="${WON_SIZE}" height="${WON_SIZE}" aria-hidden="true" style="display: block; overflow: visible;">
                <defs>
                    <linearGradient id="wordcraft-won-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a0" /><stop offset="0.6" stop-color="${STAR_GOLD}" /><stop offset="1" stop-color="#e3a51c" /></linearGradient>
                    <linearGradient id="wordcraft-won-glint" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity="0" /><stop offset="0.5" stop-color="#ffffff" stop-opacity="0.85" /><stop offset="1" stop-color="#ffffff" stop-opacity="0" /></linearGradient>
                    <clipPath id="wordcraft-won-shape"><path d="${STAR_PATH}" /></clipPath>
                </defs>
                <path d="${STAR_PATH}" fill="url(#wordcraft-won-gold)" />
                <g clip-path="url(#wordcraft-won-shape)">
                    <rect class="wordcraft-won-glint" x="-4" y="0" width="5" height="24" fill="url(#wordcraft-won-glint)" style="transform-box: fill-box; transform-origin: center; transform: skewX(-20deg); opacity: 0;" />
                </g>
                <path d="${STAR_PATH}" fill="none" stroke="${palette.starEdge}" stroke-width="0.7" stroke-linejoin="round" />
            </svg>
        </div>`);

        // Whatever is still being said goes with the screen, as by the way
        // back in the header
        veil.addEventListener('click', () => {
            speech.hush();
            page.home();
        });

        if (small) small.style.visibility = 'hidden';
        if (still) return;

        const big = veil.querySelector('.wordcraft-won-star');

        // Out of the header: from the small star exactly, measured in the
        // app's own pixels -- the app is zoomed, see appRect
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

        // And shining for as long as it is up: a glow that swells and fades,
        // and a glint across the gold
        big.animate([
            { filter: 'drop-shadow(0 0 0px rgba(255, 214, 92, 0))' },
            { filter: 'drop-shadow(0 0 22px rgba(255, 214, 92, 0.9))', offset: 0.5 },
            { filter: 'drop-shadow(0 0 0px rgba(255, 214, 92, 0))' }
        ], { duration: WON_SHINE, delay: WON_FLIGHT, iterations: Infinity, easing: 'ease-in-out' });

        veil.querySelector('.wordcraft-won-glint').animate([
            { transform: 'translateX(0px) skewX(-20deg)', opacity: 1 },
            { transform: 'translateX(30px) skewX(-20deg)', opacity: 1, offset: 0.55 },
            { transform: 'translateX(30px) skewX(-20deg)', opacity: 0 }
        ], { duration: WON_SHINE, delay: WON_FLIGHT, iterations: Infinity, easing: 'ease-in-out' });
    }

    // A word off a card goes straight into markup, and a word is whatever
    // somebody typed into the box.
    function escapeText(text) {
        return String(text)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /*
     * A letter that is blank: the boundary between two words. It is never
     * hidden and never clicked — the bar shows it as the space between two
     * letters, exactly as the snake's does — and no piece ever carries one, for
     * which see wordsOf.
     */
    const BLANK = /^\s+$/;

    /*
     * A letter with a sound of its own: anything carrying neither a letter nor
     * a digit has none. Asked for «?» on its own a synthesiser says "question
     * mark", which is not something the word contains — see the same rule, at
     * greater length, in snake.js.
     */
    const SOUNDED = /[\p{L}\p{N}]/u;

    const worthSaying = (text) => SOUNDED.test(String(text || ''));

    /*
     * Whether a word is written right to left, judged by script because the
     * word is the only evidence there is. What it decides is which end of the
     * bar the first letter sits at: laid out leftwards, a Hebrew word is shown
     * backwards to the one person who can read it.
     *
     * The pieces below are not turned round. They are in no order on purpose,
     * so there is no direction for the row of them to have, and each piece is
     * laid out by the browser in the direction its own letters ask for.
     */
    const RTL_SCRIPT = /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Adlam}]/u;

    const isRtl = (text) => RTL_SCRIPT.test(text);

    /*
     * The line as the words it is made of, each a run of letters with no blank
     * in it.
     *
     * Every cut is made inside one of these, so a space can never end up inside
     * a piece. A tile reading "as no" is the end of one word, a gap and the
     * start of another: three things nobody ever wrote together, and the player
     * is being asked to recognise it as a part of the phrase. The spaces belong
     * to the line and the line already draws them — see the bar, where a blank
     * is a gap and never a box.
     *
     * Letters, not characters: speech.letters counts them the way a reader
     * does, and splitting inside й or न्न hands back half a letter.
     */
    function wordsOf(text) {
        const words = [];

        speech.letters(text).forEach(ch => {
            if (BLANK.test(ch)) return words.push([]);

            if (words.length === 0) words.push([]);

            words[words.length - 1].push(ch);
        });

        return words.filter(word => word.length > 0);
    }

    /*
     * How many pieces each word of the line is cut into.
     *
     * One each to begin with, because a word with no piece of its own cannot be
     * put back at all, and then the rest go to whichever word is carrying the
     * most letters per piece — the next cut is least felt where the pieces are
     * longest. Never more pieces than a word has letters: past that there is
     * nothing left to cut.
     */
    function shareOut(words, pieces) {
        const share = words.map(() => 1);

        const load = (at) => words[at].length / share[at];

        for (let left = pieces - words.length; left > 0; left--) {
            let best = -1;

            words.forEach((word, at) => {
                if (share[at] >= word.length) return;
                if (best < 0 || load(at) > load(best)) best = at;
            });

            if (best < 0) break;

            share[best] += 1;
        }

        return share;
    }

    /*
     * One word in as many pieces as it was given, as evenly as it divides.
     *
     * Even slices and not syllables, though syllables are what the eye wants.
     * Where a syllable ends is a question about the language — about this
     * language, and this app's words are in any of forty — and answering it by
     * guesswork cuts "ración" as "ra|ció|n" and is wrong in a way the player
     * can see. A slice is honestly arbitrary; at the stage where the pieces are
     * single letters, which is where the ladder ends up, the two agree anyway.
     */
    function sliceWord(word, pieces) {
        const out = [];
        let from = 0;

        for (let i = 1; i <= pieces; i++) {
            const to = Math.floor((i * word.length) / pieces);

            out.push(word.slice(from, to).join(''));
            from = to;
        }

        return out;
    }

    /*
     * The letters a word or a piece puts in boxes: everything except the blanks.
     *
     * The bar draws no box for a space — it draws the gap between two words — so
     * a space is not a thing to be put back, and a piece carrying one inside it
     * fills the boxes on either side of it and nothing in between. It is also
     * what the line is judged on at the end, for the same reason: the spaces are
     * the app's and not the player's.
     */
    const boxesOf = (text) => speech.letters(text).filter(ch => !BLANK.test(ch));

    // A run out of some other entry, taken from inside one of its words and as
    // long as that word can make it, up to the size asked for. Inside one word,
    // for the same reason the real pieces are cut there: a stranger carrying a
    // space is a stranger that could never have come off this line.
    function runFrom(text, size) {
        const words = wordsOf(text);
        if (words.length === 0) return '';

        const word = words[Math.floor(Math.random() * words.length)];
        const at = Math.floor(Math.random() * word.length);

        return word.slice(at, at + size).join('');
    }

    /*
     * The pieces that do not belong, one per stage.
     *
     * Out of the set the word came from and nowhere else, which is what the
     * quiz learned about its options: a piece of a word from another set is not
     * a thing to weigh, it is the one tile that obviously does not belong — in
     * another script, as often as not.
     *
     * Each is cut to the length of one of the real pieces, picked at random
     * among them. Cut to its own length instead, a stranger stands out by being
     * the only three-letter tile in a row of twos, and the round is over before
     * it starts.
     *
     * Never a copy of a piece that is wanted. Two tiles reading the same thing
     * where one of them is a mistake is not a question about spelling, and the
     * player would be right to feel cheated. Two real pieces that read the same
     * — "ba|na|na" — are fine, because either of them can be played for the
     * other; see the click handler, which matches on what a tile says.
     *
     * A set too small to supply them simply supplies fewer. What can be asked
     * is limited by what is in the set.
     */
    function decoysFor(item, pieces, count) {
        const out = [];
        if (count <= 0) return out;

        const others = store.wordsOf(item.setId)
            .map(entry => entry.word.original)
            .filter(word => word && word !== item.word.original);

        if (others.length === 0) return out;

        const same = (a, b) => a.toLowerCase() === b.toLowerCase();
        const taken = (text) => pieces.some(p => same(p, text)) || out.some(p => same(p, text));

        // Draws rather than a sweep of everything available: the pool is a
        // handful of words and the cut is random, so the same tries would go on
        // finding the same few pieces. The count is a ceiling on the attempt,
        // not on the result -- a set that cannot fill the order stops here.
        for (let tries = 0; tries < 60 && out.length < count; tries++) {
            const word = others[Math.floor(Math.random() * others.length)];
            const size = pieces[Math.floor(Math.random() * pieces.length)].length;
            const piece = runFrom(word, Math.max(1, size));

            if (piece && !taken(piece)) out.push(piece);
        }

        return out;
    }

    function shuffled(list) {
        const out = list.slice();

        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [out[i], out[j]] = [out[j], out[i]];
        }

        return out;
    }

    /*
     * Everything about one word that is decided by chance, decided once.
     *
     * In the saved state rather than worked out at each drawing, because the
     * screen is drawn again more often than it looks: the voices arriving
     * redraw it, and so does coming back to a session that was left open. Built
     * afresh each time, the tiles would jump into a new order under the hand
     * that was halfway through using them, and the strangers would be different
     * strangers.
     */
    function buildRound(item) {
        const words = wordsOf(item.word.original);
        const letters = words.reduce((sum, word) => sum + word.length, 0);

        const stage = spacedRepetitions.getWordStats(item.word).stage || 0;

        // One more piece per stage, and never more than the line has letters to
        // give: past that there is nothing left to cut. Never fewer than two —
        // one piece is the word itself — and never fewer than the line has
        // words, since each of them has to arrive on a piece of its own.
        const count = Math.min(Math.max(stage + 1, LEAST_PIECES, words.length), letters);

        const share = shareOut(words, count);

        const pieces = words.reduce((out, word, at) => out.concat(sliceWord(word, share[at])), []);

        const tray = shuffled(pieces.concat(decoysFor(item, pieces, Math.max(0, stage - DECOYS_FROM))));

        // What a tile says is all that is kept of it. Which of them came out of
        // the word and which did not is deliberately not written down: what is
        // judged is the letters a tile carries, and a tile that spells the
        // right letters is the right tile whatever it was cut from.
        //
        // `laid` is the tiles that are down, in the order they were put down --
        // every one of them right, since a wrong one is turned back (see
        // reject). `right` is how many boxes were filled when the first wrong
        // piece came, or the word was given away, and null until then.
        // `heard` is whether the word has been asked for out loud, which costs
        // the round a tenth whatever else becomes of it — see HEARD_COST.
        return { at: state.currentIndex, tray, laid: [], shown: false, done: false, right: null, heard: false };
    }

    /*
     * The mark on what is being said, and what it takes to put it back.
     *
     * Each box remembers the colour it was wearing rather than being cleared:
     * its colour says whether that letter is in the word yet, and a mark that
     * reset it would be answering a different question.
     *
     * This game's own copy, like the ones in cards, quiz and snake. The four
     * ask the same thing of a tap and paint it over different furniture, and a
     * shared one is how the first of them stops being able to change.
     */
    let lit = [];
    let marks = 0;

    function unlight() {
        lit.forEach(({ el, colour }) => {
            el.style.background = '';
            el.style.color = colour;
        });

        lit = [];
    }

    function hold(el) {
        lit.push({ el, colour: el.style.color });
    }

    function light(paint) {
        unlight();
        paint();
        marks += 1;

        return marks;
    }

    /*
     * Never sooner than a short spell after the mark went up. There are two
     * ways to be told the sound is over at once rather than in a second — no
     * voice for the language, or the sound switched off — and either would put
     * the colour on the bar and take it off again in one blink.
     */
    const MARK_LEAST = 450;

    function until(mark) {
        const born = Date.now();

        return () => {
            if (mark !== marks) return;

            const left = MARK_LEAST - (Date.now() - born);
            if (left <= 0) return unlight();

            setTimeout(() => { if (mark === marks) unlight(); }, left);
        };
    }

    /*
     * One tap, one letter, and nothing deeper.
     *
     * A tap used to go as deep as it was repeated — the letter, its word, the
     * line — which is what a card and the quiz do with theirs. This screen
     * cannot: the line here is a guess until Check, and a half-built word read
     * aloud is the app saying the player's mistake back to them in the voice it
     * keeps for the language. Past the letter there was also nothing good to
     * say: what is written is the attempt, what is meant is the answer, and a
     * tap would have had to give away one or the other.
     *
     * So the letter under the finger, and the whole phrase from the speaker,
     * which says the word and never the attempt.
     */
    let sayLang = null;

    /*
     * Said and marked at once.
     *
     * The mark goes up with the finger rather than when the voice reports back:
     * it may never report at all — no voice for this language, or the sound
     * switched off — and a tap answered by nothing is a tap that missed, as far
     * as the person tapping can tell.
     *
     * `asked` for the speaker, which the switch in the header does not
     * silence; a tap on a letter and the word said by itself when it is
     * checked whole stay under the switch -- see speech.say.
     */
    function sayNow(text, paint, asked) {
        const done = until(light(paint));
        const said = speech.say(text, sayLang, done, asked);

        if (!said) done();

        /*
         * And whether a sound happened at all, which is what the speaker
         * charges the round on — see hearWord.
         *
         * say() answers false where there is no voice, and a round charged for
         * silence is a round charged for nothing. The switch in the header no
         * longer silences the speaker, which is asked for by hand: switched
         * off, it is heard and charged like any other press.
         */
        return said;
    }

    /*
     * The words of the line as ranges of letters, each with the place that
     * decides its fill.
     *
     * Asked of speech.words rather than read off the blanks: where a word ends
     * is a question about the language, the player has already answered it in
     * the settings, and "wherever there is a space" is no answer at all in a
     * script that does not use them.
     */
    function lineWords(letters) {
        const out = [];
        let at = 0;

        speech.words(letters.join('')).forEach(part => {
            const size = speech.letters(part.text).length;

            if (part.isWord) out.push({ from: at, to: at + size - 1, place: out.length });

            at += size;
        });

        return out;
    }

    /*
     * The colours a word and a line are filled with while they are being said:
     * four steps off the bubble ramp, far enough apart to be told at a glance
     * and not close enough to read as a series. The same four cards, quiz and
     * snake fill their words from, for the same reason.
     */
    const WORD_FILLS = [3, 6, 9, 12];

    /*
     * The bar is the snake's, down to the numbers: a fixed banner with the
     * translation on top and the letters under it, so nothing below moves as
     * the word opens.
     */
    const BOX_LINE = 1.6;
    const BAR_MAX = 47.8;
    const BOX_SIZE = 26.6;

    // The air around a box that is still hiding its letter. Slots have to be
    // countable at a glance; letters of a word belong shoulder to shoulder, so
    // the spacing is a property of the box rather than of the bar, and the word
    // closes up as it is spelled out.
    const SLOT_AIR = '0.125em';

    // How wide a blank is, in the letters' own size.
    const WORD_SPACE = 0.4;

    // A capital's worth of icon: the drawing fills two thirds of its own square
    // and a capital stands 0.7 of the type size, so the box comes out larger
    // than a letter to put the same height of ink beside it.
    const SAY_INK = 2 / 3;
    const CAP_HEIGHT = 0.7;

    const SAY_SCALE = Math.round((CAP_HEIGHT / SAY_INK) * 1000) / 1000;
    const SAY_LEAD = `margin-top: 0; margin-inline-end: ${WORD_SPACE / SAY_SCALE}em; font-size: ${BOX_SIZE * SAY_SCALE}px; flex: none;`;

    let barEl = null;

    const boxAt = (index) => barEl && barEl.querySelector(`.wordcraft-box[data-at="${index}"]`);

    // What a word of the line is filled with while it is being said — see
    // WORD_FILLS. One place, because the letter is filled from it too.
    const fillOf = (place) => tokens.stages()[WORD_FILLS[place % WORD_FILLS.length]];

    /*
     * One letter, filled behind it in the colour of the word it stands in.
     *
     * Behind the letter rather than in it. Every box here is already wearing a
     * colour that means something — green right, ink laid, coral still to come —
     * and a mark made of ink had to take that away to say anything. On a word
     * that had been given away it said nothing at all: those letters are written
     * in coral, and the mark was coral on coral.
     *
     * The word's own colour, off the ramp the whole line is marked from, rather
     * than a colour kept for single letters: what is being said is a letter of
     * that word, and the screen has nothing else to add about it.
     */
    function sayLetterMark(index, place) {
        const el = boxAt(index);
        if (!el) return;

        const stage = fillOf(place || 0);

        hold(el);
        el.style.background = stage.fill;
        el.style.color = stage.ink;
    }

    function sayWordsMark(ranges) {
        ranges.forEach(({ from, to, place }) => {
            const stage = fillOf(place);

            for (let at = from; at <= to; at++) {
                const el = boxAt(at);

                // What is being said is what the player laid out, so a box they
                // have not filled is not part of the sound: a "?" lit up with
                // the rest would be claiming to be read out.
                if (!el || el.dataset.laid !== '1') continue;

                hold(el);
                el.style.color = stage.ink;
                el.style.background = stage.fill;
            }
        });
    }

    // Shrinks the translation until it fits the banner, which has a fixed
    // height so that nothing under it moves between words.
    function fitTranslation(el) {
        if (!el) return;

        let size = 19.2;
        el.style.fontSize = size + 'px';
        el.style.lineHeight = '1.25';

        const maxH = 42;

        while ((el.scrollHeight > maxH || el.offsetHeight > maxH) && size > 9 && el.offsetHeight > 0) {
            size -= 0.5;
            el.style.fontSize = size + 'px';
        }
    }

    // And the letters, the same way. The gaps standing in for the blanks are
    // sized in em, so they come down with the letters rather than growing wider
    // than the words on either side of them; the speaker comes down at its own
    // fraction, being a letter's worth of icon.
    function fitBar() {
        if (!barEl) return;

        const boxes = barEl.querySelectorAll('.wordcraft-box, .wordcraft-space');
        if (boxes.length === 0) return;

        const say = barEl.querySelector('.say-all');

        const wear = (size) => {
            boxes.forEach(b => { b.style.fontSize = size + 'px'; });
            if (say) say.style.fontSize = (size * SAY_SCALE) + 'px';
        };

        let size = BOX_SIZE;

        wear(size);

        while ((barEl.scrollHeight > BAR_MAX || barEl.offsetHeight > BAR_MAX) && size > 8 && barEl.offsetHeight > 0) {
            size -= 0.5;
            wear(size);
        }
    }

    function render() {
        container.innerHTML = '';

        // The nodes that were lit are gone with it, so there is nothing left to
        // put back.
        lit = [];
        barEl = null;

        if (!state.sessionPool) {
            const pool = store.duePool(state.selectedSetId, state.allowEarly, POOL_LIMIT);

            state.sessionPool = pool;
            state.sessionResults = new Array(pool.length).fill(null);
            state.currentIndex = 0;

            // When this run was dealt its words, which is what every answer in
            // it will be stamped with — see store.recordRepetition. Kept in the
            // saved state so that closing the popup mid-run does not start a
            // second one in the records.
            state.sessionAt = Date.now();
        }

        const pool = state.sessionPool;

        if (pool.length === 0 || state.currentIndex >= pool.length) {
            state.sessionPool = null;
            state.round = null;
            state.allowEarly = false;
            store.save();
            page.finish();
            return;
        }

        const currentItem = pool[state.currentIndex];
        const letters = speech.letters(currentItem.word.original);

        sayLang = currentItem.originalLang;

        // A round belongs to one word of the pool, and says which: a saved
        // session that was left between words comes back to the word it was
        // left on, and a round from the one before it would be a tray of pieces
        // of some other word.
        if (!state.round || state.round.at !== state.currentIndex) state.round = buildRound(currentItem);

        const round = state.round;

        const STAGE_HINT = 'The stage of this word: how well you know it. The higher it is, the more pieces the word is cut into.';

        const dotsHtml = () => pool.map((item, idx) => {
            const res = state.sessionResults[idx];

            let bg = palette.dotIdle;
            if (res === 'correct') bg = palette.ok;
            if (res === 'wrong') bg = palette.err;

            /*
             * And the word that has been heard, before anything has been
             * written down about it.
             *
             * Hearing it costs the round its 1 — see HEARD_COST — so what the
             * round can no longer be is already settled, and the dot says so at
             * once: a dot still sitting idle after the speaker would be the
             * screen keeping the price to itself.
             *
             * The record waits all the same. What will finally be written is
             * not known yet — the word can still be given away, and that is
             * worth less again — so this is the dot running ahead of the log by
             * exactly the one thing that is already certain.
             */
            if (!res && idx === state.currentIndex && round.heard) bg = palette.err;

            return page.dotHtml('wordcraft-dot', bg, idx === state.currentIndex, item.word, palette, STAGE_HINT);
        }).join('');

        const header = $(container, `<div class="wordcraft-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6.8px;">
            <div class="wordcraft-header-info" style="display: flex; flex: 1; align-items: center; gap: 6.8px;">
                <a class="back-btn" href="index.html" title="Back" style="display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; width: 29px; height: 29px; flex: none; background: transparent; border: 1px solid ${palette.chromeBorder}; border-radius: 10.2px; color: ${palette.backBtn}; cursor: pointer; padding: 0; text-decoration: none;"><svg viewBox="0 0 24 24" width="18.8" height="18.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12H5" /><path d="M11 6l-6 6 6 6" /></svg></a>
            </div>
            <div class="wordcraft-dots-group" style="display: flex; flex: 1; justify-content: center; align-items: center; gap: ${page.DOT_GAP}px;">${dotsHtml()}</div>
        </div>`);

        // Redrawn whenever a dot changes colour -- and the light of an answer
        // on its way to the star goes on along the new ones (see waveDots)
        function refreshDots() {
            const group = header.querySelector('.wordcraft-dots-group');
            if (!group) return;

            group.innerHTML = dotsHtml();
            waveDots(group);
        }

        header.querySelector('.back-btn').addEventListener('click', (e) => {
            e.preventDefault();

            // Whatever is being said belongs to this screen and goes with it.
            speech.hush();
            page.home();
        });

        page.settingsButton(header, palette.backBtn, palette.chromeBorder);

        // The star at the head of the sound's third, as Snake has it -- and
        // whatever light is still on its way to it, going on from where it was
        const end = header.querySelector('.game-header-end');
        if (end) end.insertAdjacentHTML('afterbegin', starHtml(state.starLevel));

        waveDots(header.querySelector('.wordcraft-dots-group'));
        waveStar(header.querySelector('.wordcraft-star'));

        const banner = $(container, `<div class="wordcraft-hint-banner" style="background: ${palette.hintBg}; border: 1px solid ${palette.hintBorder}; border-radius: 12px; padding: 6.8px 12px; text-align: center; margin-bottom: 10.2px; height: 88.8px; min-height: 88.8px; max-height: 88.8px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 3.4px; overflow: hidden;">
            <div class="wordcraft-translation" style="font-size: 16.4px; font-weight: 700; line-height: 1.25; color: ${palette.hintText}; text-align: center; word-break: break-word; overflow-wrap: anywhere; max-width: 100%; max-height: 35.9px; overflow: hidden;">${escapeText(currentItem.word.translation || '')}</div>
            <div class="wordcraft-bar" style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; max-width: 100%; max-height: ${BAR_MAX}px; overflow: hidden; width: 100%;"></div>
        </div>`);

        fitTranslation(banner.querySelector('.wordcraft-translation'));

        barEl = banner.querySelector('.wordcraft-bar');

        // The boxes, in order: the word without the spaces between its words.
        // Everything the player lays out is measured against this and against
        // nothing else — see layPiece.
        const slots = boxesOf(currentItem.word.original);

        // Which box each letter of the line has, and none for a blank. The
        // marks are asked for by letter and the filling is counted in boxes;
        // this is what joins the two.
        const slotOf = [];

        letters.reduce((boxes, char, i) => {
            slotOf[i] = BLANK.test(char) ? -1 : boxes;

            return BLANK.test(char) ? boxes : boxes + 1;
        }, 0);

        // What is in the boxes so far: the letters of the tiles that are down,
        // in the order they went down. Always a run from the start, because a
        // piece can only go on the end of what is already there.
        const laidOut = () => round.laid.reduce((out, at) => out.concat(boxesOf(round.tray[at])), []);

        /*
         * The word as a row of boxes: what the player has laid out so far, and
         * "?" for what is still missing.
         *
         * Every letter that has gone down is right -- a piece is judged as it
         * is laid, see reject -- and is green for as long as the round has
         * made no mistake. From the first wrong piece (or the word given
         * away) the line is cut where it had got to: green before the cut,
         * coral after it, and the green stays where it is for the rest of the
         * round -- which part of the word was known is said by where it ends.
         * Past it the coral is the app's: a box still to be filled, or a
         * letter standing there because the word was given away. Filled by
         * the player, it goes to the page's ink.
         *
         * Until 11 November 2026 nothing was judged until Check, and the
         * letters laid before it were in ink, which said "this is yours" and
         * not whether it belonged.
         *
         * The speaker is there from the first frame and reads the whole line
         * out loud without opening anything. It costs a tenth of the round
         * — see HEARD_COST — and the dot says so the moment it is pressed,
         * while what is finally written down waits for the end: giving the
         * letters away is still the greater shortcut, and still costs more.
         */
        function drawBar() {
            const laid = laidOut();

            barEl.innerHTML = '';
            barEl.style.direction = isRtl(currentItem.word.original) ? 'rtl' : 'ltr';

            const speakerHtml = speech.speakerHtml(currentItem.word.original, sayLang, palette.sayIcon, SAY_LEAD);

            if (speakerHtml) {
                const speaker = $(barEl, speakerHtml);

                /*
                 * The speaker says the word, and the only thing it marks while
                 * it talks is itself.
                 *
                 * Not the boxes. It is the one thing on this screen that says
                 * the word rather than what the player has made of it, and a
                 * mark running along the line would be pointing at letters it is
                 * not reading out. Its own colour says which of the two sounds
                 * is playing, which is all there is to tell apart.
                 *
                 * And it books what it costs, once the sound is actually on its
                 * way — see hearWord.
                 */
                speaker.addEventListener('click', () => {
                    const said = sayNow(currentItem.word.original, () => {
                        hold(speaker);
                        speaker.style.color = palette.saying;
                    }, speaker);

                    if (said) hearWord();
                });
            }

            letters.forEach((char, i) => {
                /*
                 * A blank is the space between two words and nothing else: no
                 * box, no "?" standing in for it. It is not hidden, so it is
                 * not a secret either — the line shows where one word ends from
                 * the first frame.
                 */
                if (BLANK.test(char)) {
                    const gap = document.createElement('div');

                    gap.className = 'wordcraft-space';
                    gap.style.cssText = `width: ${WORD_SPACE}em; font-size: ${BOX_SIZE}px;`;
                    barEl.appendChild(gap);
                    return;
                }

                const slot = slotOf[i];
                const mine = slot < laid.length ? laid[slot] : '';

                // Whether a mistake has been made at all, and where the line
                // had got to then: everything before round.right was laid
                // before it, everything from it on after.
                const judged = round.right !== null;

                let text = '?';
                let colour = palette.letterPending;

                /*
                 * Three things a box can be, and a colour for each.
                 *
                 * Green is every letter laid before the first mistake, and it
                 * stays green: that is the whole record of how far the player
                 * got on their own, and where it ends is where they stopped
                 * getting it right.
                 *
                 * Coral is everything past that: a box waiting to be filled
                 * after a mistake, or a letter standing there because the word
                 * was given away. Either way it is the app's, not the player's.
                 *
                 * The page's ink is a letter laid after the mistake, over the
                 * coral: right, since nothing wrong stays down, and the player's
                 * own, but not what they knew first time round.
                 */
                if (mine) {
                    text = mine;
                    colour = !judged || slot < round.right ? palette.letterPlaced : palette.letterLaid;
                } else if (round.shown) {
                    text = slots[slot];
                    colour = palette.letterWrong;
                } else if (judged) {
                    colour = palette.letterWrong;
                }

                const open = text !== '?';

                const box = document.createElement('div');

                box.className = 'wordcraft-box';

                // Which letter of the line this box is: a blank gets a gap and
                // no box, so by the second word the boxes and the letters have
                // drifted apart, and the marks are asked for by letter.
                box.dataset.at = i;

                // And whether the player put it there, which is what a mark over
                // several boxes goes by: what is said out loud is what they laid
                // out, so a box they have not filled is not part of the sound
                // and is not lit with it.
                if (mine) box.dataset.laid = '1';

                // Air only while it is a slot — see SLOT_AIR. A letter that is
                // there has nothing to be told apart from: it is part of a word.
                box.style.cssText = `display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: ${BOX_SIZE}px; line-height: ${BOX_LINE}; margin-inline: ${open ? '0' : SLOT_AIR}; color: ${colour}; border-radius: 0.12em; transition: color 0.2s;`;
                box.textContent = text;

                // And which box, which is what a flight is aimed at
                box.dataset.slot = slot;

                // Its letter still in the air: in place, so the line has its
                // final width to aim at, and out of sight until it lands
                if ((landing.get(slot) || 0) > performance.now()) box.style.opacity = '0';

                if (!open || worthSaying(text)) {
                    box.style.cursor = 'pointer';
                    box.title = open ? 'Say it' : 'Click to give the word away (counts as a mistake)';

                    // Which of the two this press is, for the analytics: the
                    // class is the same either way -- see data-press in track.js.
                    box.dataset.press = open ? 'say' : 'reveal';

                    box.addEventListener('click', () => onLetterClick(i, text, open));
                }

                barEl.appendChild(box);
            });

            fitBar();
        }

        /*
         * A click on one box: the letter standing there, said once.
         *
         * Still "?" and it is "show me the word" instead, which costs the round
         * — see giveAway. Nothing answers a second click but the same letter
         * again: see sayLang, where the depths used to be.
         */
        function onLetterClick(index, char, open) {
            if (!open) return giveAway();

            // A mark between words says nothing on its own — see worthSaying.
            if (!worthSaying(char)) return;

            // Which word of the line this box belongs to, which is the colour
            // its mark is painted in — see sayLetterMark. A box in no word is
            // marked in the first word's colour; nothing else would mean more.
            const word = lineWords(letters).find(w => index >= w.from && index <= w.to);

            // The letter that is standing there, which until Check is the
            // player's letter and not the word's.
            sayNow(char, () => sayLetterMark(index, word ? word.place : 0));
        }

        /*
         * The verdict on a round, written once and not again.
         *
         * Asked of the dot rather than of a flag of its own: the dot is set by
         * every ending there is, the next word gets a slot of its own, and it
         * is part of the saved state — so it answers the question through a
         * reload, which a flag would have had to be taught to do. Snake learned
         * this first, and for the same reason: a word scored twice climbs a
         * ladder whose rungs are days.
         */
        function scoreRound(result) {
            if (state.sessionResults[state.currentIndex]) return;

            /*
             * What the word cost to hear comes off here and not at the speaker,
             * because at the speaker there is nothing to take it off yet: the
             * round can still end as a word spelled out, a word part spelled or
             * a word given away, and only one number is ever written.
             *
             * Taken off in hundredths and put back rather than subtracted
             * outright: 0.3 - 0.1 is 0.19999999999999998 in binary floating
             * point, and a repetition is kept for good. Nothing is lost on the
             * way through, because both numbers have two decimals at most — the
             * share is truncated to them.
             *
             * Never below nothing. A word given away records a 0 already, and
             * -0.1 is not a worse answer than that — it is not an answer.
             */
            const paid = round.heard ? HEARD_COST : 0;
            const final = Math.max(0, Math.round((result - paid) * 100)) / 100;

            store.recordRepetition(currentItem, final, 'wordcraft', { at: state.sessionAt, size: state.sessionPool.length });

            /*
             * And the dot is read off the number rather than told apart from it.
             *
             * Green is the one number that means the word was written and
             * nothing was given up to write it. A word spelled out after
             * hearing it records 0.9, which is a verdict its caller believed
             * was a clean one — asked to name the dot itself, the word spelled
             * would have painted it green over a record that says otherwise.
             */
            state.sessionResults[state.currentIndex] = final === 1 ? 'correct' : 'wrong';

            // A heard word told the star at the speaker -- see starAnswered
            if (!round.heard) starAnswered(final === 1);

            store.save();
        }

        /*
         * The word asked for out loud, which is the speaker and nothing else.
         *
         * Charged once. The price is for having been told the word, and being
         * told it twice is the same thing known once — so it is a mark on the
         * round rather than a tally.
         *
         * The dot goes red now; what is written down waits for the verdict, and
         * scoreRound takes the cost off whatever that verdict turns out to be.
         * Saved straight away, because a cost that lived only in this page's
         * memory would be refunded by closing the popup.
         *
         * After a verdict there is nothing left to charge — the number is in
         * the log and scoreRound will not write a second one — and the dot is
         * already saying what the round came to. Pressing the speaker then is
         * what it always was: the word, read out.
         */
        function hearWord() {
            if (round.heard) return;

            round.heard = true;

            // The dot goes red now, and the star hears it with the dot --
            // unless a verdict has told it already
            if (!state.sessionResults[state.currentIndex]) starAnswered(false);

            refreshDots();
            page.save();
        }

        /*
         * Showing the whole word, which is only ever asked for by clicking a box
         * that is still "?".
         *
         * A verdict like a wrong piece, and marked like one: what was laid up
         * to the point the player gave up stays green, and the boxes after it
         * are coral from then on — they are the part that was not known.
         * Filling them in afterwards is copying letters off a line that
         * already shows them, and the colour keeps saying so to the end of
         * the round.
         *
         * keptPrefix still trims the line first. Nothing wrong is ever laid
         * now, but a round saved before 11 November 2026 can come back with
         * a wrong piece down from the days of Check, and with Undo gone this
         * is the one way past it.
         */
        function giveAway() {
            if (round.shown) return;

            landNow();

            // Given away: a mistake, heard as one
            sfx.lose();

            const keep = keptPrefix();

            // What does not stay flies home off the line
            sendHome(keep.length);

            round.shown = true;
            round.laid = keep;

            if (round.right === null) round.right = laidOut().length;

            scoreRound(0);

            drawBar();
            refreshTray();
            drawActions();
            refreshDots();

            // And the word turns up in the boxes left, a letter after another
            reveal(laidOut().length);

            page.save();
        }

        /*
         * The next word, a beat after this one was spelled: the beat is the
         * green line and the word being said. Once a word -- the screen is
         * drawn again in the meantime when the voices arrive, and a session
         * closed in the beat comes back spelled, and moves on from there.
         * The voice is not stopped: it finishes the word under the next one.
         */
        function moveOn() {
            if (movingOn === state.currentIndex) return;

            const from = movingOn = state.currentIndex;
            setTimeout(() => {
                if (state.currentIndex === from && state.sessionPool) advance();
            }, NEXT_AFTER);
        }

        // Moves to the next word, or ends the session on the last one.
        function advance() {
            state.currentIndex += 1;
            state.round = null;

            if (state.currentIndex >= pool.length) {
                state.sessionPool = null;

                // A full star ends it in the middle of the screen -- see winStar
                if (state.starLevel >= STAR_TOP) winStar();
                else page.finish();
            } else {
                render();
                page.save();
            }
        }

        /*
         * The pieces, in no order, with the strangers among them.
         *
         * Clicked rather than dragged. A drag is the gesture this looks like,
         * and it is the wrong one here: the popup is 350px wide, a piece is a
         * couple of letters, and a drag that lands a pixel off is a drag that
         * drops the piece back where it came from. A click cannot miss by a
         * pixel, and it works the same with a finger, a mouse and a trackpad.
         *
         * Laid out once and restyled afterwards, never rebuilt. Rebuilding
         * emptied the row for an instant, and an empty row is a row of no
         * height: the buttons under it jumped up to meet it and back down
         * again, under the hand that was reaching for them.
         */
        //
        // Lying on the page itself, with nothing under them -- the owner's
        // call, 11 November 2026, the evening they had been put on a sheet of
        // kraft with a border and a wide margin round it. The board is only
        // the room they take, with PIECES_AIR above and below them.
        const boardEl = $(container, `<div class="wordcraft-board" style="box-sizing: border-box; display: flex; justify-content: center; padding: ${PIECES_AIR - BANNER_GAP}px 0 ${PIECES_AIR - PAGE_PAD}px;"></div>`);

        const trayEl = $(boardEl, `<div class="wordcraft-tray" style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: ${10 + TILE_EDGE}px 9px;"></div>`);

        // Under them the round's one button, Finish!, on a last word that is
        // spelled -- see drawActions. No room is kept for it: it comes once a
        // run, at its end, and the screen grows by it then. Kept, the room
        // was the empty band at the bottom of every word.
        const actionsEl = $(container, '<div class="wordcraft-actions" style="display: flex; justify-content: center; align-items: center;"></div>');

        // Which round this is, for its entrance -- see `introduced`
        const key = `${state.sessionAt}:${state.currentIndex}`;

        /*
         * A tile: a card of cream stock, outlined in ink, standing on a hard
         * shadow TILE_EDGE down and to the right -- and pressed, pushed most
         * of the way into it. Flat, with no gloss: the gloss and the stage
         * colours it had for an afternoon are what made it a toy. Every tile
         * alike, the strangers included: a look that told them apart would be
         * the answer.
         */
        const TILE_FACE = `background: ${palette.tileFill}; border: 1.5px solid ${palette.tileLine}; color: ${palette.tileInk};`;
        const TILE_UP = `${TILE_EDGE}px ${TILE_EDGE}px 0 ${palette.tileShadow}`;
        const TILE_DOWN = `1px 1px 0 ${palette.tileShadow}`;
        const TILE_IN = `translate(${TILE_EDGE - 1}px, ${TILE_EDGE - 1}px)`;

        /*
         * Four things a tile can be.
         *
         * `live`, to be pressed. `laid`, gone up to the line or on its way
         * back: what is left on the board is a blot where it lay (see
         * blotOf), so the row keeps its shape and the eye can see where the
         * piece came from. `off`, too long for the room left on the line:
         * pushed in and faded, because a tile that answers a press by doing
         * nothing reads as the game being broken, not as the piece not
         * fitting. And `gone`, every tile not in the word once it is spelled:
         * swept off the board (see sweep), and still holding its place.
         */
        function pieceStyle(kind, at) {
            const base = `position: relative; box-sizing: border-box; padding: 7px 13px 8px; border-radius: 7px; font-family: inherit; font-weight: 700; font-size: ${TILE_FONT}px; line-height: 1.2; white-space: pre; transition: opacity 0.25s;`;

            // The blots of a spelled word turn green with it: the board says
            // what the line says, rather than sitting there emptied. The
            // border is kept, unseen, so that the blot takes up exactly the
            // room the tile did and nothing in the row moves.
            if (kind === 'laid') return base + ` background: ${blotOf(at, round.done ? palette.okBlot : palette.blot)} center / 100% 100% no-repeat border-box; border: 1.5px solid transparent; color: transparent; box-shadow: none; cursor: default;`;
            if (kind === 'gone') return base + TILE_FACE + ' box-shadow: none; opacity: 0; cursor: default;';
            if (kind === 'off') return base + TILE_FACE + ` box-shadow: none; transform: ${TILE_IN}; opacity: 0.35; cursor: default;`;

            return base + TILE_FACE + ` box-shadow: ${TILE_UP}; cursor: pointer;`;
        }

        /*
         * The blot a tile leaves where it lay: an ink blot rather than the
         * dashed rectangle that was there before -- the owner's call, 11
         * November 2026. A lopsided round the size of the tile, with a drop
         * or two thrown off it, in the board's shade.
         *
         * Drawn to the tile's own width and height rather than stretched from
         * a square, or the drops would come out as ovals. Its shape comes from
         * the round and the tile and not from chance, so that a redraw -- the
         * voices arriving -- puts back the same blot rather than a new one.
         */
        const blots = new Map();

        function blotOf(at, look) {
            const tile = tiles[at];
            const w = Math.max(1, Math.round(tile.offsetWidth));
            const h = Math.max(1, Math.round(tile.offsetHeight));
            const soaked = wet.has(`${key}:${at}`);

            let shape = blots.get(at);

            if (!shape || shape.w !== w || shape.h !== h || shape.soaked !== soaked) {
                const rand = seeded(`${key}:${at}`);

                shape = { w, h, soaked, body: soaked ? wetPrint(w, h, rand) : `<path d="${blotPath(w, h, rand)}" />` };
                blots.set(at, shape);
            }

            // Solid, and see-through as a whole: the two halves of a wet
            // print overlap, and each at its own alpha would show the overlap
            // darker
            const alpha = soaked ? Math.min(1, look.alpha * WET_DARKER) : look.alpha;
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><g fill="${look.ink}" opacity="${alpha}">${shape.body}</g></svg>`;

            return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
        }

        /*
         * A wet print where somebody sat down in wet trousers, instead of a
         * blot: two round halves side by side, each a little lumpy, the way
         * wet cloth does not print a clean edge, and the drops that ran off
         * underneath -- left by every
         * WET_EVERY-th piece laid (the owner's call, 11 November 2026: a
         * joke for whoever plays long enough to find it). Wetter than a blot,
         * which is what tells it from one at a glance.
         *
         * Drawn in a frame of its own, 135 by 100, and fitted into the tile
         * whole: a print stretched to a tile one letter wide would no longer
         * read as what it is. Two clean ellipses with a dry line down the
         * middle at first; the owner had the line taken out and the edge
         * roughened the same evening.
         */
        const WET_DARKER = 1.4;

        function wetPrint(w, h, rand) {
            const s = Math.min((w - 4) / 135, (h - 4) / 100);
            const ox = ((w - 135 * s) / 2).toFixed(1);
            const oy = ((h - 100 * s) / 2).toFixed(1);

            const drops = Array.from({ length: 3 + Math.floor(rand() * 3) }, () => {
                const x = 22 + rand() * 91;
                const y = 90 + rand() * 7;
                const r = 2 + rand() * 2.5;

                return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" />`;
            }).join('');

            // Rough by a tenth of their size and no more: past that the two
            // halves stop reading as halves and become one more blot
            const tilt = 12 * Math.PI / 180;
            const halves = lump(41, 48, 37, 40, -tilt, 12, 0.9, 0.14, rand) + lump(94, 48, 37, 40, tilt, 12, 0.9, 0.14, rand);

            return `<g transform="translate(${ox} ${oy}) scale(${s.toFixed(3)})"><path d="${halves}" />${drops}</g>`;
        }

        /*
         * A lumpy round: `n` points round (cx, cy) on an ellipse of rx by ry
         * turned by `tilt`, each at a little uneven angle and at between
         * `least` and `least + spread` of the way out, joined by a smooth
         * closed curve through all of them (Catmull-Rom, as Béziers).
         */
        function lump(cx, cy, rx, ry, tilt, n, least, spread, rand) {
            const cos = Math.cos(tilt);
            const sin = Math.sin(tilt);
            const xy = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

            const points = Array.from({ length: n }, (_, i) => {
                const a = ((i + (rand() - 0.5) * 0.5) / n) * Math.PI * 2;
                const k = least + rand() * spread;
                const x = Math.cos(a) * rx * k;
                const y = Math.sin(a) * ry * k;

                return [cx + x * cos - y * sin, cy + x * sin + y * cos];
            });

            let d = `M${xy(points[0])}`;

            for (let i = 0; i < n; i++) {
                const p0 = points[(i + n - 1) % n];
                const p1 = points[i];
                const p2 = points[(i + 1) % n];
                const p3 = points[(i + 2) % n];

                d += `C${xy([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${xy([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${xy(p2)}`;
            }

            return d + 'Z';
        }

        /*
         * The outline of a blot: a lumpy round of eleven points filling the
         * box, far more uneven than a wet print's halves, and one to three
         * round drops just outside it, kept inside the box.
         */
        function blotPath(w, h, rand) {
            const cx = w / 2;
            const cy = h / 2;
            const rx = w / 2 - 3;
            const ry = h / 2 - 3;

            let d = lump(cx, cy, rx, ry, 0, 11, 0.72, 0.24, rand);

            const drops = 1 + Math.floor(rand() * 3);

            for (let i = 0; i < drops; i++) {
                const a = rand() * Math.PI * 2;
                const r = 1.4 + rand() * 1.8;
                const x = Math.min(w - r - 1, Math.max(r + 1, cx + Math.cos(a) * (rx + 1)));
                const y = Math.min(h - r - 1, Math.max(r + 1, cy + Math.sin(a) * (ry + 1)));

                d += `M${(x - r).toFixed(1)} ${y.toFixed(1)}a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(2 * r).toFixed(1)} 0a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(-2 * r).toFixed(1)} 0Z`;
            }

            return d;
        }

        // A sequence of numbers in [0, 1) that is the same every time for the
        // same text: FNV-1a for the seed, mulberry32 for the sequence
        function seeded(text) {
            let s = 2166136261;

            for (const ch of text) s = Math.imul(s ^ ch.codePointAt(0), 16777619);

            return () => {
                s = (s + 0x6d2b79f5) | 0;

                let t = Math.imul(s ^ (s >>> 15), 1 | s);
                t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        }

        /*
         * The one button left, Finish!, is cut from the same card as the
         * tiles: outlined in ink, on the same hard shadow, in the colour this
         * app paints the thing to press. Check and Undo stood beside it until
         * 11 November 2026 -- see reject.
         */
        const ACTION = 'display: inline-flex; align-items: center; gap: 6px; box-sizing: border-box; padding: 9px 20px; border-radius: 8px; font-family: inherit; font-weight: 700; font-size: 14px; line-height: 1.2; letter-spacing: 0.02em;';

        const ACCENT_UP = TILE_UP;
        const ACCENT_DOWN = TILE_DOWN;
        const ACCENT_FACE = `background: ${palette.accent}; color: ${palette.onAccent}; border: 1.5px solid ${palette.tileLine}; box-shadow: ${ACCENT_UP}; cursor: pointer;`;

        // Pushed into its shadow while the finger is on it, and back out
        // when it lets go
        function squish(el, up, down) {
            const press = () => {
                if (el.disabled) return;
                el.style.transform = TILE_IN;
                el.style.boxShadow = down;
            };

            const release = () => {
                if (el.disabled) return;
                el.style.transform = '';
                el.style.boxShadow = up;
            };

            el.addEventListener('pointerdown', press);
            ['pointerup', 'pointerleave', 'pointercancel'].forEach(type => el.addEventListener(type, release));
        }

        // The boxes from `from`, `size` of them
        const slotRange = (from, size) => Array.from({ length: size }, (_, k) => from + k);

        const middle = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

        // Where a run of boxes stands, in the app's own pixels -- see appRect
        function slotsRect(list) {
            const rects = list
                .map(slot => barEl && barEl.querySelector(`.wordcraft-box[data-slot="${slot}"]`))
                .filter(Boolean)
                .map(appRect);

            if (rects.length === 0) return appRect(barEl);

            const left = Math.min(...rects.map(r => r.left));
            const right = Math.max(...rects.map(r => r.right));
            const top = Math.min(...rects.map(r => r.top));
            const bottom = Math.max(...rects.map(r => r.bottom));

            return { left, right, top, bottom, width: right - left, height: bottom - top };
        }

        // How large a tile's letters are on the line, against on the tile
        function lineScale() {
            const box = barEl && barEl.querySelector('.wordcraft-box');
            return box ? (parseFloat(box.style.fontSize) || BOX_SIZE) / TILE_FONT : 1;
        }

        /*
         * One piece in the air on its way home: a copy of the tile, the size
         * of `tile`, from the point `from` to the point `to`, going from `s0`
         * of its size to `s1` on an arc thrown up over the straight line. It
         * fades out at the end, as the tile it lands on takes over. The way
         * up to the line is flyIn.
         *
         * On a timer rather than on the animation's promise: the screen can be
         * drawn again under it, and an animation on a node that has been taken
         * away is not something to wait on.
         */
        function fly(text, tile, from, to, s0, s1) {
            const el = $(container, `<div class="wordcraft-flying" aria-hidden="true" style="position: fixed; left: ${from.x - tile.width / 2}px; top: ${from.y - tile.height / 2}px; width: ${tile.width}px; height: ${tile.height}px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; ${TILE_FACE} border-radius: 7px; box-shadow: ${TILE_UP}; font-weight: 700; font-size: ${TILE_FONT}px; line-height: 1.2; white-space: pre; pointer-events: none; z-index: 8;">${escapeText(text)}</div>`);

            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const lift = Math.min(36, 12 + Math.abs(dx) * 0.2);
            const turn = dx >= 0 ? 4 : -4;

            el.animate([
                { transform: `translate(0px, 0px) scale(${s0}) rotate(0deg)`, opacity: s0 < 1 ? 0.5 : 1 },
                { transform: `translate(${dx / 2}px, ${dy / 2 - lift}px) scale(${((s0 + s1) / 2) * 1.05}) rotate(${turn}deg)`, opacity: 1, offset: 0.5 },
                { transform: `translate(${dx}px, ${dy}px) scale(${s1}) rotate(0deg)`, opacity: 1, offset: 0.86 },
                { transform: `translate(${dx}px, ${dy}px) scale(${s1}) rotate(0deg)`, opacity: 0 }
            ], { duration: FLY_MS, easing: 'ease-in-out', fill: 'forwards' });

            setTimeout(() => el.remove(), FLY_MS + 40);

            return new Promise(done => setTimeout(done, FLY_MS));
        }

        /*
         * The letters of a piece flying up to the line, as it flies: copies
         * of the very boxes it is flying to, each standing exactly where its
         * box stands, in a layer the size of all of them. Copies, so that at
         * the end of the flight they are the line's own letters to the pixel
         * -- same type, same size, same place -- and can hand over to them
         * with nothing to see. Not boxes, though: neither the marks nor the
         * analytics are to find them.
         */
        function copyBoxes(ink, boxes, colour) {
            const rects = boxes.map(appRect);
            const left = Math.min(...rects.map(r => r.left));
            const top = Math.min(...rects.map(r => r.top));
            const right = Math.max(...rects.map(r => r.right));
            const bottom = Math.max(...rects.map(r => r.bottom));

            ink.style.left = left + 'px';
            ink.style.top = top + 'px';
            ink.style.width = (right - left) + 'px';
            ink.style.height = (bottom - top) + 'px';
            ink.innerHTML = '';

            boxes.forEach((box, k) => {
                const copy = box.cloneNode(true);

                copy.removeAttribute('class');
                ['slot', 'at', 'press', 'laid'].forEach(name => delete copy.dataset[name]);
                copy.removeAttribute('title');

                Object.assign(copy.style, {
                    position: 'absolute',
                    left: (rects[k].left - left) + 'px',
                    top: (rects[k].top - top) + 'px',
                    width: rects[k].width + 'px',
                    height: rects[k].height + 'px',
                    margin: '0',
                    opacity: '1',
                    transition: 'none',
                    color: colour
                });

                ink.appendChild(copy);
            });

            return { left, top, right, bottom, width: right - left, height: bottom - top };
        }

        /*
         * A piece flying up to the line, and what is left of it there.
         *
         * In two layers that move as one, on the same path and at the same
         * size: the card -- the tile's face with no letters on it -- and the
         * letters (copyBoxes), carried back to the tile for the start of the
         * flight. The card fades out over the last stretch of the way
         * (CARD_GOES on), so that what arrives is the letters alone: on
         * touchdown the boxes under them are shown and the copies go, with
         * nothing left to wait for.
         *
         * The word that lands is the word that stays -- the owner's call, 11
         * November 2026. Until then one copy of the whole tile flew up, faded
         * out on arrival, and the letters popped up in the boxes under it: the
         * word was seen to vanish and come back.
         *
         * And the card simply goes -- the owner's call the same evening,
         * after it had been torn in two and then blown away as paper dust,
         * and neither came off: the card leaving was a show of its own next
         * to the word, when the word is the thing. Going in the air rather
         * than once it was down, because fading after the touchdown was a
         * pause at the line with the piece already there (the owner again).
         */
        const CARD_GOES = 0.6;

        function flyIn(text, from, lands, landAt, before) {
            const boxAtSlot = (slot) => barEl && barEl.querySelector(`.wordcraft-box[data-slot="${slot}"]`);
            const boxes = lands.map(boxAtSlot).filter(Boolean);

            // Nothing to aim at -- no line drawn -- and it flies the old way
            if (boxes.length === 0) {
                fly(text, from, middle(from), middle(slotsRect(lands)), 1, lineScale());
                setTimeout(() => land(lands, landAt, before), FLY_MS);
                return;
            }

            const scale = lineScale();

            const card = $(container, `<div class="wordcraft-flying" aria-hidden="true" style="position: fixed; left: ${from.left}px; top: ${from.top}px; width: ${from.width}px; height: ${from.height}px; box-sizing: border-box; ${TILE_FACE} border-radius: 7px; box-shadow: ${TILE_UP}; pointer-events: none; z-index: 8;"></div>`);
            const ink = $(container, '<div class="wordcraft-flying" aria-hidden="true" style="position: fixed; pointer-events: none; z-index: 9;"></div>');

            const to = copyBoxes(ink, boxes, palette.tileInk);

            const dx = middle(to).x - middle(from).x;
            const dy = middle(to).y - middle(from).y;
            const lift = Math.min(36, 12 + Math.abs(dx) * 0.2);
            const turn = dx >= 0 ? 4 : -4;
            const mid = ((1 + scale) / 2) * 1.05;
            const timing = { duration: FLY_MS, easing: 'ease-in-out', fill: 'forwards' };

            // The card from the tile to over the boxes, growing to the
            // line's size of type on the way...
            const final = `translate(${dx}px, ${dy}px) scale(${scale}) rotate(0deg)`;

            card.animate([
                { transform: 'translate(0px, 0px) scale(1) rotate(0deg)' },
                { transform: `translate(${dx / 2}px, ${dy / 2 - lift}px) scale(${mid}) rotate(${turn}deg)`, offset: 0.5 },
                { transform: final }
            ], timing);

            // ...and the letters along with it: the same centre and the same
            // size at every moment, from the tile's place down to their own
            ink.animate([
                { transform: `translate(${-dx}px, ${-dy}px) scale(${1 / scale}) rotate(0deg)` },
                { transform: `translate(${-dx / 2}px, ${-dy / 2 - lift}px) scale(${mid / scale}) rotate(${turn}deg)`, offset: 0.5 },
                { transform: 'translate(0px, 0px) scale(1) rotate(0deg)' }
            ], timing);

            card.animate([
                { opacity: 1, offset: 0 },
                { opacity: 1, offset: CARD_GOES },
                { opacity: 0, offset: 1 }
            ], { duration: FLY_MS, fill: 'forwards' });

            // The letters in the line's colour, in one step halfway through
            // the card going. Not a blend: the card going takes the ground
            // from light to dark while the ink goes the other way, and on the
            // dark theme they met in a grey with the word lost in it.
            const turnsAt = (CARD_GOES + 1) / 2;

            [...ink.children].forEach((copy, k) => copy.animate([
                { color: palette.tileInk, offset: 0 },
                { color: palette.tileInk, offset: turnsAt },
                { color: boxes[k].style.color, offset: turnsAt },
                { color: boxes[k].style.color, offset: 1 }
            ], { duration: FLY_MS, fill: 'forwards' }));

            setTimeout(() => {
                // Taken off the screen in the meantime -- a press that changed
                // the line, or the screen drawn again -- and the letters, if
                // they are still wanted, pop into the boxes the old way
                if (!card.isConnected || !ink.isConnected) return land(lands, landAt, before);

                land(lands, landAt, before, true);

                card.remove();
                ink.remove();
            }, FLY_MS);
        }

        /*
         * A piece's letters arriving: each pops into its box, a step higher
         * with every letter of the line -- see sfx.bubble -- and only if the
         * box is still waiting for this flight and not some later one.
         * barEl and not a box held from before: the line may have been drawn
         * again while the piece was in the air.
         *
         * `quiet` when the letters are already standing over their boxes
         * (flyIn): the boxes are only shown, with no pop -- a pop would be the
         * word coming back after it had already arrived.
         */
        function land(list, landAt, before, quiet) {
            list.forEach((slot, k) => {
                if (landing.get(slot) !== landAt) return;

                landing.delete(slot);
                sfx.bubble(before + k, k * 40);

                const box = barEl && barEl.querySelector(`.wordcraft-box[data-slot="${slot}"]`);
                if (!box) return;

                box.style.opacity = '';
                if (quiet) return;

                box.animate([
                    { transform: 'scale(0.6)', opacity: 0 },
                    { transform: 'scale(1.16)', opacity: 1, offset: 0.55 },
                    { transform: 'scale(1)' }
                ], { duration: 260, delay: k * 40, easing: 'ease-out', fill: 'backwards' });
            });
        }

        /*
         * Everything in the air, landed at once: a box given away works on the
         * line as it is, and pieces still flying would land on letters it has
         * just shown. Whatever was on its way home is home.
         */
        const returning = new Map();

        function landNow() {
            landing.clear();
            returning.clear();
            container.querySelectorAll('.wordcraft-flying').forEach(el => el.remove());
        }

        /*
         * A piece flying back to its blot, from where its letters stood on
         * the line, `delay` ms from now. The blot stays a blot until it
         * gets there, and the tile settles back into it.
         */
        function flyHome(at, from, delay) {
            const tile = tiles[at];
            const token = {};

            returning.set(at, token);

            setTimeout(() => {
                if (returning.get(at) !== token || !tile.isConnected) return;

                const home = appRect(tile);

                fly(round.tray[at], home, middle(from), middle(home), lineScale(), 1).then(() => {
                    if (returning.get(at) !== token) return;

                    returning.delete(at);
                    refreshTray();

                    tile.animate([
                        { transform: 'scale(1.06)' },
                        { transform: 'scale(1)' }
                    ], { duration: 200, easing: 'ease-out' });
                });
            }, delay);
        }

        // The pieces laid from the `from`th on fly home off the line, one
        // after another -- measured where they stand, before the line is
        // drawn without them
        function sendHome(from) {
            if (still()) return;

            let pos = round.laid.slice(0, from).reduce((sum, at) => sum + boxesOf(round.tray[at]).length, 0);

            round.laid.slice(from).forEach((at, k) => {
                const size = boxesOf(round.tray[at]).length;

                flyHome(at, slotsRect(slotRange(pos, size)), k * 70);
                pos += size;
            });
        }

        /*
         * A piece taken, and judged there and then: its letters against the
         * letters of the line where it would go. Right, it goes up to the
         * line and stays, its boxes kept for it until it lands; the last one
         * spells the word (see spelled). Wrong, it is turned back -- reject.
         */
        function layPiece(at) {
            const tile = tiles[at];
            if (tile.disabled) return;

            const size = boxesOf(round.tray[at]).length;
            const before = laidOut().length;

            if (!boxesOf(round.tray[at]).every((ch, k) => ch === slots[before + k])) return reject(at, before);
            const lands = slotRange(before, size);
            const flies = !still();
            const landAt = performance.now() + FLY_MS;
            const from = appRect(tile);

            if (flies) lands.forEach(slot => landing.set(slot, landAt));

            round.laid.push(at);

            // Every WET_EVERY-th piece leaves a wet print -- see wetPrint
            state.piecesLaid += 1;
            if (state.piecesLaid % WET_EVERY === 0) wet.add(`${key}:${at}`);

            // The last piece is the word spelled: written down now, and shown
            // once the piece is down -- see spelled
            const whole = laidOut().length === slots.length;

            if (whole) {
                round.done = true;
                scoreRound(1);
            }

            drawBar();
            refreshTray();
            if (whole) refreshDots();
            page.save();

            if (!flies) {
                lands.forEach((_, k) => sfx.bubble(before + k, k * 25));
                if (whole) spelled();
                return;
            }

            flyIn(round.tray[at], from, lands, landAt, before);

            // After the touchdown, which was set going first at the same delay
            if (whole) setTimeout(spelled, FLY_MS);
        }

        /*
         * A piece that does not go there: up to the line all the same, where
         * it turns red and shakes its head, and back to its place -- the
         * owner's call, 11 November 2026, when Check and Undo went. Its blot
         * stays on the board while it is away.
         *
         * The first one is the round's verdict, as the first Check was: the
         * share of the word laid right before it, two decimals, truncated --
         * never a 1, which only a word spelled with no mistake records. Every
         * one after it is heard and shown the same, and changes nothing that
         * is written: scoreRound writes once. Written down at the press
         * rather than at the line, so that closing the popup with the piece
         * in the air does not take the mistake back.
         */
        const REJECT_SHAKE = 260;

        function reject(at, before) {
            const tile = tiles[at];
            const size = boxesOf(round.tray[at]).length;

            if (round.right === null) round.right = before;

            scoreRound(slots.length ? Math.floor((before / slots.length) * 100) / 100 : 0);
            refreshDots();
            page.save();

            if (still()) {
                sfx.lose();
                drawBar();
                return;
            }

            const token = {};
            const home = appRect(tile);
            const target = slotsRect(slotRange(before, size));

            returning.set(at, token);
            refreshTray();

            const el = $(container, `<div class="wordcraft-flying" aria-hidden="true" style="position: fixed; left: ${home.left}px; top: ${home.top}px; width: ${home.width}px; height: ${home.height}px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; ${TILE_FACE} border-radius: 7px; box-shadow: ${TILE_UP}; font-weight: 700; font-size: ${TILE_FONT}px; line-height: 1.2; white-space: pre; pointer-events: none; z-index: 8;">${escapeText(round.tray[at])}</div>`);

            const dx = middle(target).x - middle(home).x;
            const dy = middle(target).y - middle(home).y;
            const scale = lineScale();
            const mid = (1 + scale) / 2;
            const lift = Math.min(36, 12 + Math.abs(dx) * 0.2);
            const turn = dx >= 0 ? 4 : -4;

            // Up, a shake at the line, and back, as one animation
            const total = FLY_MS * 2 + REJECT_SHAKE;
            const up = FLY_MS / total;
            const down = (FLY_MS + REJECT_SHAKE) / total;
            const pose = (x, y, k, r) => `translate(${x}px, ${y}px) scale(${k}) rotate(${r}deg)`;

            el.animate([
                { transform: pose(0, 0, 1, 0), offset: 0, easing: 'ease-in' },
                { transform: pose(dx / 2, dy / 2 - lift, mid, turn), offset: up / 2, easing: 'ease-out' },
                { transform: pose(dx, dy, scale, 0), offset: up },
                { transform: pose(dx - 6, dy, scale, 0), offset: up + (down - up) * 0.2 },
                { transform: pose(dx + 5, dy, scale, 0), offset: up + (down - up) * 0.45 },
                { transform: pose(dx - 3, dy, scale, 0), offset: up + (down - up) * 0.7 },
                { transform: pose(dx, dy, scale, 0), offset: down, easing: 'ease-in' },
                { transform: pose(dx / 2, dy / 2 - lift, mid, -turn), offset: (down + 1) / 2, easing: 'ease-out' },
                { transform: pose(0, 0, 1, 0), offset: 1 }
            ], { duration: total, fill: 'forwards' });

            // Red while it is at the line
            el.animate([
                { borderColor: palette.tileLine, color: palette.tileInk, offset: 0 },
                { borderColor: palette.tileLine, color: palette.tileInk, offset: up },
                { borderColor: palette.err, color: palette.err, offset: up + 0.03 },
                { borderColor: palette.err, color: palette.err, offset: down },
                { borderColor: palette.tileLine, color: palette.tileInk, offset: (down + 1) / 2 },
                { borderColor: palette.tileLine, color: palette.tileInk, offset: 1 }
            ], { duration: total, fill: 'forwards' });

            // At the line: the mistake heard, and the line -- coral from now
            // on past where it had got to -- shaking its head with it
            setTimeout(() => {
                if (!el.isConnected) return;

                sfx.lose();
                drawBar();
                shake(before);
            }, FLY_MS);

            // Home: the tile back in its place, over its blot
            setTimeout(() => {
                el.remove();

                if (returning.get(at) !== token) return;

                returning.delete(at);
                refreshTray();

                tile.animate([
                    { transform: 'scale(1.06)' },
                    { transform: 'scale(1)' }
                ], { duration: 200, easing: 'ease-out' });
            }, total);
        }

        /*
         * The word spelled, once its last piece is down: the line takes its
         * bow, the chime of the stage the word has come to, the word said,
         * and the round's buttons -- the next word by itself, or Finish!.
         * Read out only now, whole and right: a word read aloud with a
         * mistake in it would be this app teaching the mistake.
         */
        function spelled() {
            drawActions();
            celebrate();

            sfx.chime(spacedRepetitions.getWordStats(currentItem.word).stage || 0);
            sayNow(currentItem.word.original, () => sayWordsMark(lineWords(letters)));
        }

        const tiles = round.tray.map((text, at) => {
            const tile = $(trayEl, `<button class="wordcraft-piece" data-at="${at}" style="${pieceStyle('live')}">${escapeText(text)}</button>`);

            squish(tile, TILE_UP, TILE_DOWN);
            tile.addEventListener('click', () => layPiece(at));

            return tile;
        });

        // The tiles that are not in the word, off the board once it is
        // spelled: tipped over and slid away, one after another
        let swept = 0;

        function sweep(tile) {
            if (still()) return;

            const turn = (swept % 2 ? 1 : -1) * (6 + Math.random() * 6);

            tile.animate([
                { transform: 'translateY(0px) rotate(0deg)', opacity: 1 },
                { transform: `translateY(22px) rotate(${turn}deg)`, opacity: 0 }
            ], { duration: 480, delay: 220 + swept * 45, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'backwards' });

            swept += 1;
        }

        /*
         * Which of them are still in play: not one that is already down or on
         * its way home, not one longer than the room that is left, and none at
         * all once the word has been spelled out and said so. What each of the
         * others looks like is in pieceStyle.
         *
         * A tile turning `gone` here is swept off; one drawn `gone` from the
         * start -- the screen drawn again after the word was spelled -- is
         * simply not there.
         */
        function kindOf(at) {
            if (round.laid.includes(at) || returning.has(at)) return 'laid';
            if (round.done) return 'gone';
            if (boxesOf(round.tray[at]).length > slots.length - laidOut().length) return 'off';

            return 'live';
        }

        function refreshTray() {
            tiles.forEach((tile, at) => {
                const kind = kindOf(at);
                const was = tile.dataset.look;

                tile.disabled = kind !== 'live';
                tile.style.cssText = pieceStyle(kind, at);
                tile.dataset.look = kind;

                if (kind === 'gone' && was && was !== 'gone') sweep(tile);

                // The blot spreading where the tile was lifted from, the way
                // ink runs into paper
                if (kind === 'laid' && was === 'live' && !still()) {
                    tile.animate([
                        { transform: 'scale(0.4)', opacity: 0 },
                        { transform: 'scale(1.05)', opacity: 1, offset: 0.65 },
                        { transform: 'scale(1)', opacity: 1 }
                    ], { duration: 280, easing: 'ease-out' });
                }
            });

            settleCursor();
        }

        /*
         * The piece the keyboard is pointing at, drawn as the quiz draws its
         * cursor. A piece, because it is the pieces that stay on the screen: the
         * buttons under them are drawn again with every move.
         *
         * Written over whatever refreshTray has just set, which takes the
         * outline off with the rest of the style. A piece that has left play --
         * it is the one just taken -- hands the cursor to the next one that has
         * not, so that ↑ pressed again goes on building the word.
         */
        let cursor = null;

        function pointAt(tile) {
            if (cursor) cursor.style.outline = 'none';

            cursor = tile;

            if (tile) {
                tile.style.outline = `2px solid ${palette.cursor}`;
                tile.style.outlineOffset = '0';
            }
        }

        function settleCursor() {
            if (!cursor) return;
            if (!cursor.disabled) return pointAt(cursor);

            const at = tiles.indexOf(cursor);
            const open = tiles.filter(tile => !tile.disabled);

            pointAt(open.find(tile => tiles.indexOf(tile) > at) || open[0] || null);
        }

        function moveCursor(by) {
            const open = tiles.filter(tile => !tile.disabled);
            if (!open.length) return;

            const at = open.indexOf(cursor);

            pointAt(open[at < 0 ? (by > 0 ? 0 : open.length - 1) : (at + by + open.length) % open.length]);
        }

        /*
         * How much of the line was right, in whole pieces.
         *
         * The line is cut at the first letter that does not belong there, and a
         * piece lying across that cut comes off with the rest: half a tile
         * cannot stay on the board, and a tile that is part wrong is wrong.
         */
        function keptPrefix() {
            const keep = round.laid.slice();
            const taken = () => keep.reduce((out, at) => out.concat(boxesOf(round.tray[at])), []);

            while (keep.length > 0 && !taken().every((ch, at) => ch === slots[at])) keep.pop();

            return keep;
        }

        const boxesNow = () => (barEl ? [...barEl.querySelectorAll('.wordcraft-box')] : []);

        /*
         * The line spelled: its letters rise one after another, the banner
         * is ringed in green, and scraps of paper go up off the line.
         *
         * A rise of a fifth of a letter and no more. The bar clips what leaves
         * it -- it is a fixed height, so that nothing under it moves -- and
         * the top of a letter sits that far under the top of its box.
         */
        function celebrate() {
            if (still()) return;

            boxesNow().forEach((box, k) => box.animate([
                { transform: 'translateY(0em)' },
                { transform: 'translateY(-0.16em)', offset: 0.4 },
                { transform: 'translateY(0em)' }
            ], { duration: 380, delay: k * 40, easing: 'ease-in-out' }));

            banner.animate([
                { boxShadow: `0 0 0 0 ${palette.okGlow}` },
                { boxShadow: `0 0 0 3px ${palette.okGlow}`, offset: 0.3 },
                { boxShadow: '0 0 0 3px rgba(0, 0, 0, 0)' }
            ], { duration: 900, easing: 'ease-out' });

            confetti(middle(appRect(barEl)));
        }

        /*
         * Scraps of paper in the board's earth colours, out to both sides and
         * up a little, and drifting down. Fixed to the screen rather than in
         * the banner, which would clip them.
         */
        function confetti(from) {
            const colours = palette.scraps;

            for (let k = 0; k < 18; k++) {
                const w = 6 + Math.random() * 5;
                const h = 3 + Math.random() * 3;
                const angle = Math.PI + Math.random() * Math.PI;
                const reach = 60 + Math.random() * 90;
                const x = Math.cos(angle) * reach;
                const y = Math.sin(angle) * reach * 0.45;
                const fall = 60 + Math.random() * 60;
                const spin = (Math.random() - 0.5) * 420;

                const bit = $(container, `<span aria-hidden="true" style="position: fixed; left: ${from.x - w / 2}px; top: ${from.y - h / 2}px; width: ${w}px; height: ${h}px; border-radius: 1px; background: ${colours[k % colours.length]}; pointer-events: none; z-index: 8;"></span>`);

                bit.animate([
                    { transform: 'translate(0px, 0px) rotate(0deg)', opacity: 1, easing: 'cubic-bezier(0.15, 0.7, 0.35, 1)' },
                    { transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(spin / 2).toFixed(0)}deg)`, opacity: 1, offset: 0.4, easing: 'ease-in' },
                    { transform: `translate(${(x * 1.3).toFixed(1)}px, ${(y + fall).toFixed(1)}px) rotate(${spin.toFixed(0)}deg)`, opacity: 0 }
                ], { duration: 900 + Math.random() * 300, fill: 'forwards' });

                setTimeout(() => bit.remove(), 1300);
            }
        }

        // The line not right: it shakes its head, and what was right of it
        // rises a little
        function shake(right) {
            if (still()) return;

            barEl.animate([
                { transform: 'translateX(0px)' },
                { transform: 'translateX(-5px)', offset: 0.2 },
                { transform: 'translateX(4px)', offset: 0.45 },
                { transform: 'translateX(-2px)', offset: 0.7 },
                { transform: 'translateX(0px)' }
            ], { duration: 360, easing: 'ease-out' });

            boxesNow().forEach((box, k) => {
                if (+box.dataset.slot >= right) return;

                box.animate([
                    { transform: 'translateY(0em)' },
                    { transform: 'translateY(-0.12em)', offset: 0.45 },
                    { transform: 'translateY(0em)' }
                ], { duration: 320, delay: 360 + k * 35, easing: 'ease-in-out' });
            });
        }

        // The letters of a word given away, turning over into the boxes left
        // empty, one after another
        function reveal(from) {
            if (still()) return;

            boxesNow()
                .filter(box => +box.dataset.slot >= from)
                .forEach((box, k) => box.animate([
                    { transform: 'rotateX(90deg)', opacity: 0 },
                    { transform: 'rotateX(0deg)', opacity: 1 }
                ], { duration: 300, delay: 120 + k * 40, easing: 'ease-out', fill: 'backwards' }));
        }

        /*
         * The round coming on: the tiles drop onto the board one after
         * another, the boxes come down into the line, the translation fades
         * in. Once a round -- see `introduced`: drawn again in the middle of
         * it, it goes on from where it was.
         */
        function enter() {
            if (introduced.key !== key) introduced = { key, at: performance.now() };

            if (still()) return;

            const gone = performance.now() - introduced.at;
            const play = (el, frames, timing) => {
                if (timing.delay + timing.duration - gone <= 0) return;
                el.animate(frames, { ...timing, delay: timing.delay - gone, fill: 'backwards' });
            };

            const text = banner.querySelector('.wordcraft-translation');

            if (text) play(text, [
                { transform: 'translateY(6px)', opacity: 0 },
                { transform: 'translateY(0px)', opacity: 1 }
            ], { duration: 300, delay: 0, easing: 'ease-out' });

            boxesNow().forEach((box, k) => play(box, [
                { transform: 'translateY(-0.4em)', opacity: 0 },
                { transform: 'translateY(0em)', opacity: 1 }
            ], { duration: 260, delay: 60 + k * 25, easing: 'ease-out' }));

            // Dealt rather than dropped: each slides in a little turned and
            // settles straight, the way a card lands on a table
            tiles.forEach((tile, k) => play(tile, [
                { transform: `translateY(-10px) rotate(${k % 2 ? 5 : -5}deg)`, opacity: 0 },
                { transform: 'translateY(0px) rotate(0deg)', opacity: 1 }
            ], { duration: 340, delay: 120 + k * 45, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' }));
        }

        /*
         * The round's one button, and only at its end.
         *
         * Once the word is spelled the next word comes by itself, NEXT_AFTER
         * later -- the owner's call, 3 November 2026, the way a right answer
         * moves the quiz on. Until then there was a Next button for it.
         *
         * Except on the last word of a run with the star short of full, which
         * keeps its button, "Finish!" -- the owner's call the same day. What
         * is behind it there is not another word but the way out, and a run
         * that ends by itself, with no star to fly out, ends without anybody
         * noticing it has. A full star ends it by flying -- see winStar.
         *
         * Nobody is trapped before that. A wrong piece goes back to the board,
         * so every piece the word needs is always there, and a word that was
         * given away is on the line to copy. And the way out of the game is
         * where it always is, in the corner: leaving keeps the session, and
         * the catalog offers to continue it.
         *
         * Undo and Check stood here until 11 November 2026 -- see reject.
         */
        /*
         * A button the round has just earned comes up into place. Once: the
         * screen can be drawn again with it up, and then it is not news. No
         * breathing after that -- it had it for an afternoon, and a button
         * that pulses is a toy's. On `translate` rather than on transform,
         * which a press is using.
         */
        let shown = '';

        function arrive(button) {
            if (still() || shown.includes(button.className)) return;

            button.animate([
                { translate: '0px 8px', opacity: 0 },
                { translate: '0px 0px', opacity: 1 }
            ], { duration: 260, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' });
        }

        function drawActions() {
            actionsEl.innerHTML = '';
            actionsEl.style.paddingBottom = '';

            const last = state.currentIndex >= pool.length - 1;

            if (round.done && last && state.starLevel < STAR_TOP) {
                // The same air under it as over it -- see PIECES_AIR
                actionsEl.style.paddingBottom = `${PIECES_AIR - PAGE_PAD}px`;

                const finish = $(actionsEl, `<button class="wordcraft-next" style="${ACTION} ${ACCENT_FACE}">Finish!</button>`);

                squish(finish, ACCENT_UP, ACCENT_DOWN);
                finish.addEventListener('click', advance);
                arrive(finish);

                shown = finish.className;
                return;
            }

            shown = '';

            if (round.done) moveOn();
        }

        drawBar();
        refreshTray();
        drawActions();
        enter();

        // Through the buttons' own clicks, so that a key does exactly what the
        // press does -- the analytics included
        bindKeys((code) => {
            if (code === 'ArrowLeft' || code === 'ArrowRight') return moveCursor(code === 'ArrowRight' ? 1 : -1);

            const action = actionsEl.querySelector('.wordcraft-next');

            if (action) action.click();
            else if (cursor) cursor.click();
        });

        // Drawn before the voices were known, so the speaker was drawn on
        // trust. One redraw when the list lands takes it back where this device
        // cannot keep it.
        speech.onVoices(render);

        page.save();
    }

    wordcraft.render = render;

    wordcraft.setTheme = (isDark) => {
        const t = tokens.of(isDark);

        palette = {
            dotIdle: t.border,

            // The way out and the sound stand on the page, like dict's header
            // buttons, and are outlined the same — see tokens.chrome.
            chromeBorder: t.chrome,
            backBtn: t.muted,

            // Marks where you are right now — the dot you are on. Its own token
            // rather than the accent, because "you are here" should not shout
            // in the same colour as "press this".
            cursor: t.progress,
            // The stage in the dot of the word in play -- see page.dotHtml
            stageInk: t.muted,

            ok: t.ok,
            err: t.err,

            // Darker than `soft` in the light theme, where soft is a hair off
            // the page ground and the banner all but vanishes into it. The dark
            // theme keeps soft, which already stands clear of its ground.
            hintBg: isDark ? t.soft : t.border,
            hintBorder: t.border,

            // Ink rather than mint: this is the word to read, and mint on the
            // light theme's white panel is 2.1:1.
            hintText: t.ink,

            /*
             * A letter the player laid, where the line has nothing to say about
             * it: the page's own ink — white on the dark theme and near-black
             * on the light one, which is the same statement either way.
             *
             * Two places want it. Before a verdict, because mint there would be
             * the screen agreeing with every piece as it landed, which is the
             * one thing it does not do until Check. And after one, over the part
             * that was not right: the verdict is already written and shown in
             * the green before it, so what is left for a colour to say there is
             * which of those boxes have been filled again — ink for the ones the
             * player has put back, coral for the ones still waiting or shown.
             */
            letterLaid: t.ink,

            // And after Check: mint for the part that was right — the colour
            // progress and a right answer are painted in everywhere else, the
            // deep one on the light theme, where the light mint is 1.4 against
            // its ground and is a letter you have to go looking for.
            letterPlaced: isDark ? t.progress : t.progressFill,

            // Coral from the first wrong letter on, for as long as those boxes
            // are empty or are only showing the answer. Where the green ends is
            // what says which half of the word was known; the coral says which
            // of the rest is still not the player's doing.
            letterWrong: t.err,

            // A box still waiting for its letter, before anything has been
            // judged: muted, because nothing has happened to it yet.
            letterPending: t.muted,

            // The speaker while it is talking: coral, which is what this app
            // paints the thing being acted on. It marks itself and nothing else
            // — the boxes are marked in the colour of the word they belong to,
            // see sayLetterMark.
            saying: t.accent,

            // The speaker is an offer rather than the thing to press, so it
            // sits in muted like the ones in cards, quiz and snake.
            sayIcon: t.muted,

            /*
             * The craft look -- see TILE_FONT. The tiles are cream card in ink
             * on both themes, which on the dark one is what makes them the
             * brightest thing on the screen after the word. Until the evening
             * of 11 November 2026 they lay on a sheet of kraft; now on the
             * page itself.
             */

            tileFill: isDark ? '#efe6d3' : '#fbf7ee',
            tileInk: '#2b2621',
            tileLine: isDark ? '#06141c' : '#2b2621',
            tileShadow: isDark ? 'rgba(0, 0, 0, 0.6)' : '#2b2621',

            // The blot a tile leaves on the board -- see blotOf: the board's
            // own shade, deeper. And once the word is spelled, green.
            blot: isDark ? { ink: '#000000', alpha: 0.32 } : { ink: '#3c2814', alpha: 0.17 },
            okBlot: { ink: t.ok, alpha: 0.32 },

            // Finish! is the thing to press, so it is the colour this app
            // paints the thing to press, in the tiles' ink outline
            accent: t.accent,
            onAccent: t.onAccent,

            // The scraps that go up off a spelled word: terracotta, mustard,
            // sage, deep teal and the card itself -- earth colours, not the
            // ladder's pastels
            scraps: ['#c4603f', '#d6a23a', '#87a27b', '#2f6a6b', isDark ? '#efe6d3' : '#2b2621', '#e9dcc0'],

            // The glow round the banner when the word is spelled
            okGlow: fade(t.ok, 0.55),

            // The star's edge: its own gold on the dark theme, and a deeper
            // one on the light, where the gold is pale against the page --
            // Snake's
            starEdge: isDark ? STAR_GOLD : '#b7860f',

            // The page under a won star, most of the way to the page's own
            // ground, so that the star is the thing on it
            veil: fade(t.ground, 0.82)
        };
    };

    /*
     * A colour of the tokens, #rrggbb, at `alpha`, as rgba -- which every
     * browser reads. The veil was a color-mix until 8 November 2026, and an
     * old phone's browser did not know it (Chrome before 111, Safari before
     * 16.2): a property a browser does not know it drops, and Word search's
     * question, veiled the same way, stood there with nothing under it.
     */
    function fade(hex, alpha) {
        const n = parseInt(hex.slice(1), 16);
        return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
    }

    // The third argument is the previous session, handed over even on a fresh
    // start so a game can carry its own settings across. This one has none to
    // carry, and progress never rides along.
    wordcraft.start = (setId, allowEarly) => {
        state.selectedSetId = setId;
        state.allowEarly = allowEarly;
    };

    wordcraft.getState = () => ({
        selectedSetId: state.selectedSetId,
        currentIndex: state.currentIndex,
        sessionResults: state.sessionResults,
        sessionPool: state.sessionPool,

        // Goes with the pool it belongs to: left out, a run that was
        // interrupted comes back nameless and the answers after the break are
        // recorded without saying which run they were part of.
        sessionAt: state.sessionAt,

        // The cut, the strangers and how much of the word is already back
        // together — everything about this word that was decided by chance or
        // by the player. Without it, coming back to a session means a new tray
        // over a word that was halfway spelled.
        round: state.round,

        allowEarly: state.allowEarly,

        // The star is the session's and goes with it -- see STAR_TOP
        starLevel: state.starLevel,

        // So that a popup closed and opened again goes on counting rather
        // than starting over -- see wetPrint
        piecesLaid: state.piecesLaid
    });

    wordcraft.setState = (snap) => {
        if (!snap) return;
        state = { ...getEmptyState(), ...snap };
    };
}

bootGame('wordcraft', wordcraft);
