/**
 * "Quiz" game. The number of options grows with the word stage, so a word
 * that is well known is asked among more distractors — as many as its own set
 * can supply, up to a ceiling, and no more.
 */
function quiz(container) {
    // How many words this game takes per session — its own decision
    const POOL_LIMIT = 10;

    /*
     * The most answers a question is ever asked with, and the fewest.
     *
     * Two at the bottom because one is not a question: a word being seen for
     * the first time is at stage 0, and offering it the answer on its own asks
     * nothing and teaches nothing. Two is the smallest thing that can be got
     * wrong.
     *
     * Six at the top because a list read from the top every time stops being a
     * question somewhere around there and becomes a search. The ladder goes to
     * fourteen and the stage keeps climbing long after the asking has stopped
     * getting harder; six is also what the popup can show under the question
     * without the last answer falling past the fold.
     */
    const LEAST_OPTIONS = 2;
    const MOST_OPTIONS = 6;

    /*
     * The look of a game -- the owner's call, 11 November 2026, chosen out of
     * three drawn up that evening ("B, colour blocks"). The question is a
     * paper label stuck on at a slant; the options are bold blocks in muted
     * colours -- mint, lavender, sky, peach, butter, rose -- in a thick dark
     * outline on a hard shadow BLOCK_EDGE down and to the right, pressed into
     * it by a finger, each with its speaker in a ring at its head where the
     * language has a voice. They are dealt onto the table as the question
     * comes (see enter). A right answer lifts its block and slams a stamp on
     * it, and the others slide off; a wrong one shakes its head, fades and is
     * stamped with a cross, and the right one lifts and is stamped beside it.
     *
     * Before it the same day: cards of cream stock in the craft look of
     * Wordcraft, then the same cards darkened, and both were dull. A green
     * ring round the right answer after a mistake was drawn too, and did not
     * sit on the light theme; the lift and the stamp mark it on both.
     *
     * The same blocks and outline on both themes: they are the page's
     * colour, not the theme's. Only the label's paper follows the theme.
     */
    const BLOCK_EDGE = 4;
    const BLOCK_LINE = '#061820';

    /*
     * The next word comes this long after a right answer. 700 until 11
     * November 2026, when the right answer began to take a bow in that beat,
     * and 700 cut it short. Wordcraft made the same move the same day.
     */
    const NEXT_AFTER = 1000;

    const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

    // The question whose entrance has been played, and when: drawn again in
    // the middle of it -- the voices arriving -- it goes on from where it was
    let introduced = { key: null, at: 0 };

    let state = getEmptyState();
    let palette = {};

    function getEmptyState() {
        return { selectedSetId: null, currentIndex: 0, sessionResults: [], sessionPool: null, sessionAt: null, allowEarly: false, starLevel: 0 };
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
        return `<svg class="quiz-star" viewBox="0 0 24 24" width="${STAR_SIZE}" height="${STAR_SIZE}" aria-hidden="true" style="display: block; flex: none; margin: 0 auto 0 8.5px; overflow: visible; opacity: ${level ? 1 : 0};">
            <defs><clipPath id="quiz-star-shape"><path d="${STAR_PATH}" /></clipPath></defs>
            <g clip-path="url(#quiz-star-shape)">
                <rect class="quiz-star-fill" x="${STAR_BOX.x}" y="${STAR_BOX.y}" width="${STAR_BOX.width}" height="${STAR_BOX.height}" fill="${STAR_GOLD}" style="transform-box: fill-box; transform-origin: 50% 100%; transform: scaleY(${starShare(level)});" />
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
     * whenever one changes colour: the next word comes 700ms after a right
     * answer, with the light still on its way. Whatever is drawn again takes
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
        const colour = answered.right ? palette.okText : palette.errText;

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
        star.querySelector('.quiz-star-fill').style.transform = `scaleY(${starShare(now)})`;

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

        star.querySelector('.quiz-star-fill').animate([
            { transform: `scaleY(${starShare(was)})` },
            { transform: `scaleY(${starShare(now)})`, offset: turn },
            { transform: `scaleY(${starShare(now)})` }
        ], timing);
    }

    /*
     * The star hears about an answer the moment its dot takes its colour,
     * once a question. A wrong answer with no star up sends nothing: there is
     * no star for the light to reach.
     */
    function starAnswered(right) {
        const was = Math.min(STAR_TOP, state.starLevel);
        if (!right && !was) return;

        state.starLevel = right ? Math.min(STAR_TOP, was + 1) : 1;

        const waiting = Math.max(0, state.sessionResults.length - state.currentIndex - 1);
        answered = { at: performance.now(), from: state.currentIndex, right, was, arrives: WAVE_START + waiting * WAVE_STEP };

        waveStar(container.querySelector('.quiz-star'));
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
     * is what fills it, and it comes 700ms before this.
     *
     * With reduced motion nothing flies or shines: the star is simply there.
     *
     * The press is written down as `quiz-won` -- see ANALYTICS.md: the veil is
     * no button, and data-press is what makes it one to the analytics.
     */
    const WON_FLIGHT = 1100;
    const WON_TURN = 144;
    const WON_SHINE = 1900;

    async function winStar() {
        store.achieve(state.selectedSetId, 'quiz', 'star', state.sessionResults.filter(r => r === 'correct').length);
        page.endSession();
        unbindKeys();

        const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const small = container.querySelector('.quiz-star');

        if (small && !still) await Promise.all(small.getAnimations({ subtree: true }).map(a => a.finished)).catch(() => null);

        // The star out to the middle of the screen, to a fanfare
        sfx.fanfare();

        const veil = $(container, `<div class="quiz-won" data-press title="Back to the sets" style="position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 9; display: flex; align-items: center; justify-content: center; background: ${palette.veil}; cursor: pointer;">
            <svg class="quiz-won-star" viewBox="0 0 24 24" width="${WON_SIZE}" height="${WON_SIZE}" aria-hidden="true" style="display: block; overflow: visible;">
                <defs>
                    <linearGradient id="quiz-won-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a0" /><stop offset="0.6" stop-color="${STAR_GOLD}" /><stop offset="1" stop-color="#e3a51c" /></linearGradient>
                    <linearGradient id="quiz-won-glint" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity="0" /><stop offset="0.5" stop-color="#ffffff" stop-opacity="0.85" /><stop offset="1" stop-color="#ffffff" stop-opacity="0" /></linearGradient>
                    <clipPath id="quiz-won-shape"><path d="${STAR_PATH}" /></clipPath>
                </defs>
                <path d="${STAR_PATH}" fill="url(#quiz-won-gold)" />
                <g clip-path="url(#quiz-won-shape)">
                    <rect class="quiz-won-glint" x="-4" y="0" width="5" height="24" fill="url(#quiz-won-glint)" style="transform-box: fill-box; transform-origin: center; transform: skewX(-20deg); opacity: 0;" />
                </g>
                <path d="${STAR_PATH}" fill="none" stroke="${palette.starEdge}" stroke-width="0.7" stroke-linejoin="round" />
            </svg>
        </div>`);

        veil.addEventListener('click', () => page.home());

        if (small) small.style.visibility = 'hidden';
        if (still) return;

        const big = veil.querySelector('.quiz-won-star');

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

        veil.querySelector('.quiz-won-glint').animate([
            { transform: 'translateX(0px) skewX(-20deg)', opacity: 1 },
            { transform: 'translateX(30px) skewX(-20deg)', opacity: 1, offset: 0.55 },
            { transform: 'translateX(30px) skewX(-20deg)', opacity: 0 }
        ], { duration: WON_SHINE, delay: WON_FLIGHT, iterations: Infinity, easing: 'ease-in-out' });
    }

    // Keyboard: ↑/↓ move the highlight over the options, → answers with the highlighted one.
    // Nothing is highlighted until a key asks: ↓ then lands on the first option and ↑ on the
    // last -- the owner's call, 4 November 2026. Until then the first stood highlighted from
    // the start, which pointed at one answer of four before anybody had read them.
    const KEYS = ['ArrowUp', 'ArrowDown', 'ArrowRight'];

    let keyHandler = null;

    // One listener at a time, dropped by cleanup() when the screen goes away
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


    // Shown on the option the cursor is on: the key you press to send it.
    // Drawn on the same 24-unit grid as every other icon here, at the size
    // of the options' 17px type and a stroke as heavy as their letters -- it
    // was 13.7px and a hairline beside them (the owner, 11 November 2026).
    const SUBMIT_ARROW = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2.8" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true" style="display: block;">
        <path d="M5 12h13M13 6l6 6-6 6" /></svg>`;

    // The stamp an answered option is marked with: a tick or a cross on a
    // white disc in the blocks' outline, put down at a slant as a rubber
    // stamp is -- see stamp
    const STAMP = (ok) => `<span style="display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; box-sizing: border-box; border-radius: 50%; background: #ffffff; border: 2.5px solid ${BLOCK_LINE}; color: ${ok ? '#2f9e6e' : '#d9543f'};"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ok ? '<path d="M5 12.5l4.5 4.5L19 7.5" />' : '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />'}</svg></span>`;

    // A word off a card goes straight into markup, and a word is whatever
    // somebody typed into the box.
    function escapeText(text) {
        return String(text)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /*
     * The question as a row of letters inside a row of words.
     *
     * Every letter is its own target because a tap has to be able to land on
     * one. What lies between the words — spaces, commas, the question mark —
     * stays as plain text and takes no colour: the only thing that can be
     * tapped is a thing that can be said.
     *
     * Letters come from speech.letters, which counts them the way a reader
     * does: й is written as two code units and न्न as three, and splitting
     * there would hand back half a letter to say out loud.
     *
     * The options are not drawn this way. An option is a button whose press is
     * an answer, and a tap on the words in it has to go on meaning that; the
     * speaker beside it is the one thing there that speaks.
     */
    function lineHtml(text) {
        // The same corner on the letter as on the word around it: both are
        // filled while they are being said, and a square mark inside a rounded
        // one reads as two different kinds of thing.
        const tinted = 'border-radius: 3.4px;';

        return speech.words(text).map(part => {
            if (!part.isWord) return escapeText(part.text);

            const letters = speech.letters(part.text)
                .map(ch => `<span class="say-letter" data-press style="${tinted}">${escapeText(ch)}</span>`)
                .join('');

            return `<span class="say-word" style="${tinted}">${letters}</span>`;
        }).join('');
    }

    /*
     * What the last tap lit, so it can be put out when the voice stops, and
     * which mark that is.
     *
     * One mark at a time for the whole screen, because one thing at a time is
     * being said. The voice that finishes has to take its own mark down and
     * nobody else's: by the time it stops, a later tap may have put a different
     * one up, and that tap's own voice is what will clear it — so what stops
     * speaking checks the number it was given against the number that is up now.
     *
     * The quiz's own copy, not shared with cards. The two started with one
     * behaviour between them, and that is how a screen ends up unable to
     * change: the shared version has to keep doing what the other one needs.
     */
    let lit = [];
    let marks = 0;

    function unlight() {
        lit.forEach(el => {
            el.style.background = '';
            el.style.color = '';
        });
        lit = [];
    }

    function light(marked) {
        unlight();

        lit = marked.map(m => m.el);

        marked.forEach(({ el, fill, ink }) => {
            if (fill) el.style.background = fill;
            if (ink) el.style.color = ink;
        });

        marks += 1;
        return marks;
    }

    /*
     * Never sooner than a short spell after the mark went up. There are three
     * ways to be told the sound is over — it ended, there was no voice for the
     * language, or the voice list had not arrived yet and the word turned out
     * unsayable once it did — and the last two answer within a quarter of a
     * second, which would put the colour on the question and take it off again
     * in one blink.
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
     * A tap on the question goes deeper the more it is repeated: the letter
     * under the finger, then the word it belongs to, then the whole line.
     *
     * Counted here rather than read off the event's own click count, which
     * phones do not agree about — a second tap is a zoom gesture to some of
     * them, and the count never arrives.
     *
     * One gesture is taps inside the same word, not taps on the same letter. A
     * finger lands where it lands: a glyph is a couple of dozen pixels wide and
     * a fingertip is wider, so the second tap of a double tap often comes down
     * on the letter next door — and in Japanese, where 日本語 is one word of
     * three glyphs, that is most of the time.
     *
     * Each tap acts at once instead of waiting to see whether another is
     * coming. Waiting would put a quarter of a second between every single tap
     * and its answer, and a tap that answers late reads as a tap that missed.
     */
    const TAP_GAP = 500;

    /*
     * A colour for every word of the line, and the same colour every time that
     * word is marked — whether it is said on its own or as part of the line.
     *
     * Taken from the bubble ramp, four steps far enough apart to be told at a
     * glance and not close enough to read as a series: the words of a line are
     * not in an order that means anything, they are simply not each other.
     */
    const WORD_FILLS = [3, 6, 9, 12];

    function wordsIn(root) {
        return Array.from(root.querySelectorAll('.say-word'));
    }

    function tint(el, place) {
        const stage = tokens.stages()[WORD_FILLS[place % WORD_FILLS.length]];
        return { el, fill: stage.fill, ink: stage.ink };
    }

    /*
     * The speaker leads the line, as though it were its first letter.
     *
     * One place for it everywhere: this is what an option in the quiz has
     * always looked like, and a card and a question were each putting the same
     * icon somewhere else — a corner here, a corner there — so the one thing
     * that means "this can be heard" was in three places depending on what was
     * offering it.
     *
     * Sized in em, so it is a letter's worth of icon at whatever size the line
     * ends up: on a card that size is not known until the word has been fitted
     * to the face, and a speaker fixed in pixels would be half the line on a
     * long phrase and a speck on a short one.
     *
     * A letter's worth means a capital's worth, and two measurements decide what
     * that costs. The drawing fills two thirds of its own square — the 24-unit
     * path runs from y=4 to y=20 — and a capital in this face stands 0.7 of the
     * type size. So the box has to be larger than the type, not smaller, to put
     * the same height of ink on the line: 0.7 over two thirds. It was 0.7 flat
     * before, which was the cap height applied to the box instead of to the ink,
     * and what arrived was two thirds of a capital.
     *
     * And it has to hang a little lower. An inline-flex box rests its bottom
     * edge on the baseline, so the empty sixth below the drawing would hold the
     * speaker up off the line; dropped by that sixth, its foot stands where the
     * foot of a capital stands.
     *
     * The gap is the same fraction of the icon that a quiz option leaves beside
     * its own: ten pixels against eighteen. Written as em on the same element
     * that sets the font-size, so the em here is the icon's own size and the
     * margin is that fraction directly. Standing any nearer, the speaker stops
     * being a thing in front of the word and starts reading as its first letter.
     */
    const SAY_INK = 2 / 3;
    const CAP_HEIGHT = 0.7;

    const round3 = (n) => Math.round(n * 1000) / 1000;

    const SAY_SCALE = round3(CAP_HEIGHT / SAY_INK);
    const SAY_DROP = round3((1 - SAY_INK) / 2);

    const SAY_LEAD = `margin-top: 0; margin-right: 0.55em; font-size: ${SAY_SCALE}em; vertical-align: -${SAY_DROP}em;`;

    const SAY_DELAY = 250;

    /*
     * The question, at the size a card's word is drawn at.
     *
     * The same thing is on both screens — one word, being studied — and it read
     * as two different things while the card shouted it and the question
     * murmured it.
     *
     * Its own constant rather than one borrowed from cards: the two screens
     * agree about a number today, and a screen that cannot change its own type
     * size without changing another screen's is a screen that stops being
     * changed. Nothing shrinks it either, because nothing has to — this card
     * has no height of its own to fit inside, it grows down the page.
     */
    const WORD_SIZE = 30;

    let taps = 0;
    let tapped = null;
    let tapTimer = null;
    let sayTimer = null;

    function forgetTaps() {
        clearTimeout(tapTimer);

        // A word still waiting its quarter second belongs to the question that
        // was tapped. Answer fast enough and it would be said over the next
        // one, which is a different word entirely.
        clearTimeout(sayTimer);

        taps = 0;
        tapped = null;
    }

    function listen(root, text, lang) {
        if (!root) return;

        root.addEventListener('click', (e) => {
            const letter = e.target.closest('.say-letter');

            // Beside the words, or on the speaker under them: the whole line,
            // which is the third depth reached without the first two. The
            // speaker's is the one sound the switch in the header leaves
            // alone -- see speech.say.
            if (!letter) {
                forgetTaps();
                return sayLine(root, text, lang, e.target.closest('.say-all'));
            }

            const word = letter.closest('.say-word');

            if (word !== tapped) {
                taps = 0;
                tapped = word;
            }

            taps = Math.min(3, taps + 1);

            clearTimeout(tapTimer);
            tapTimer = setTimeout(forgetTaps, TAP_GAP);

            // The letter is the one under the finger; the word is the one the
            // gesture is being counted in.
            if (taps === 1) return sayLetter(root, letter, lang);
            if (taps === 2) return sayWord(root, word, lang);

            sayLine(root, text, lang);
        });
    }

    /*
     * The colour lands with the finger; the voice waits to see what the finger
     * meant.
     *
     * A quarter of a second, which is the gap between the two taps of a double
     * tap. Without it a letter starts being said the instant it is touched and
     * is cut off by its word a moment later, and every double tap comes out as
     * a stutter.
     *
     * Only the voice waits: the mark goes up at once, before it is known
     * whether the device even has a voice for this. A tap answered by nothing
     * for a quarter of a second is a tap that missed, as far as the person
     * tapping can tell.
     *
     * All three depths are filled now, in one colour: the letter, the word it
     * stands in, the line. The letter was the exception, written in a colour
     * instead — one glyph wide, and a fill that size was judged to read as a
     * typo rather than as a mark. The exception cost more than it saved. A mark
     * made of ink says nothing wherever the letter already carries a colour,
     * which on the games' bars is everywhere, and two ways of marking three
     * depths is two things to learn instead of one.
     *
     * One colour because the three are one gesture going deeper: the mark
     * widens from the letter to its word to the line, and the letter takes that
     * word's colour off the same ramp — see WORD_FILLS. A colour kept for
     * single letters would have been saying the next tap marks something else.
     */
    function sayLater(text, lang, mark, asked) {
        clearTimeout(sayTimer);

        sayTimer = setTimeout(() => {
            const done = until(mark);

            // Nothing heard -- no voice for this script, or the sound is off --
            // and then there is nothing to wait behind: the mark stands its
            // minimum and goes. The silence itself is not answered; see
            // speech.say.
            if (!speech.say(text, lang, done, asked)) done();
        }, SAY_DELAY);
    }

    function sayLetter(root, letter, lang) {
        // Which word it stands in, because that is the colour it is marked in.
        // A letter outside every word cannot be tapped — only the letters of a
        // word are drawn as targets, see lineHtml — so there is no such case to
        // answer for, and indexOf's -1 is kept out of the ramp regardless.
        const place = wordsIn(root).indexOf(letter.closest('.say-word'));

        sayLater(letter.textContent, lang, light([tint(letter, Math.max(0, place))]));
    }

    function sayWord(root, word, lang) {
        if (!word) return;

        sayLater(word.textContent, lang, light([tint(word, wordsIn(root).indexOf(word))]));
    }

    function sayLine(root, text, lang, asked) {
        // A colour each, so the line reads as the words it is made of rather
        // than as one long stripe. They repeat past the fourth word, which is
        // where a question stops being a question and starts being a sentence.
        sayLater(text, lang, light(wordsIn(root).map(tint)), asked);
    }

    function render() {
        container.innerHTML = '';

        // The nodes that were lit are gone with it, so there is nothing to put
        // back — and a tap on the question that was here counts towards nothing
        // on the question that replaces it.
        lit = [];
        forgetTaps();

        if (!state.sessionPool) {
            const pool = store.duePool(state.selectedSetId, state.allowEarly, POOL_LIMIT);

            state.sessionPool = pool;
            state.sessionResults = new Array(pool.length).fill(null);
            state.currentIndex = 0;

            // When this run was dealt its words, which is what every answer in it
            // will be stamped with -- see store.recordRepetition. Kept in the
            // saved state so that closing the popup mid-run does not start a
            // second one in the records.
            state.sessionAt = Date.now();
        }

        let pool = state.sessionPool;

        if (pool.length === 0 || state.currentIndex >= pool.length) {
            state.sessionPool = null;
            state.allowEarly = false;
            store.save();
            page.finish();
            return;
        }

        const currentItem = pool[state.currentIndex];

        const STAGE_HINT = 'The stage of this word: how well you know it. The higher it is, the more answers there are to choose from.';

        const dotsHtml = () => pool.map((item, idx) => {
            const res = state.sessionResults[idx];
            let bg = palette.dotIdle;
            if (res === 'correct') bg = palette.okText;
            if (res === 'wrong') bg = palette.errText;

            return page.dotHtml('quiz-dot', bg, idx === state.currentIndex, item.word, palette, STAGE_HINT);
        }).join('');

        // The dots are redrawn as soon as the answer is scored, not only on the
        // next word -- and the light of an answer on its way to the star goes
        // on along the new ones (see waveDots)
        function refreshDots() {
            const group = header.querySelector('.quiz-dots-group');
            if (!group) return;

            group.innerHTML = dotsHtml();
            waveDots(group);
        }

        const header = $(container, `<div class="quiz-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6.8px;">
            <div class="quiz-header-info" style="display: flex; flex: 1; align-items: center; gap: 6.8px;">
                <a class="back-btn" href="index.html" title="Back" style="display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; width: 29px; height: 29px; flex: none; background: transparent; border: 1px solid ${palette.chromeBorder}; border-radius: 10.2px; color: ${palette.backBtn}; cursor: pointer; padding: 0; text-decoration: none;"><svg viewBox="0 0 24 24" width="18.8" height="18.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12H5" /><path d="M11 6l-6 6 6 6" /></svg></a>
            </div>
            <div class="quiz-dots-group" style="display: flex; flex: 1; justify-content: center; align-items: center; gap: ${page.DOT_GAP}px;">
                ${dotsHtml()}
            </div>
        </div>`);

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

        waveDots(header.querySelector('.quiz-dots-group'));
        waveStar(header.querySelector('.quiz-star'));

        // The question: a paper label stuck on at a slant -- see BLOCK_EDGE
        const questionCard = $(container, `<div class="quiz-question-card" data-press style="width: 100%; padding: 14px 6px 4px; text-align: center; margin-bottom: 20px; box-sizing: border-box; cursor: pointer;">
            <div class="quiz-question-word" style="display: inline-block; max-width: calc(100% - 12px); box-sizing: border-box; padding: 6px 18px 8px; background: ${palette.label}; border: 2px solid ${BLOCK_LINE}; border-radius: 12px; box-shadow: ${BLOCK_EDGE}px ${BLOCK_EDGE}px 0 ${BLOCK_LINE}; transform: rotate(-2deg); font-size: ${WORD_SIZE}px; font-weight: 800; color: ${palette.blockInk}; word-break: break-word;">${speech.speakerHtml(currentItem.word.original, currentItem.originalLang, palette.labelMuted, SAY_LEAD)}${lineHtml(currentItem.word.original)}</div>
        </div>`);

        /*
         * The question can be heard, the same way a card can: a click says the
         * word it landed on, or the whole line when it lands beside the words.
         *
         * The question only, never the options. They are answers, and a click on
         * one is the answer being given — a word in them that spoke instead of
         * answering would take the round away from the player. They are also the
         * translations, which is the language the player already has.
         */
        listen(questionCard, currentItem.word.original, currentItem.originalLang);

        // Drawn before the voices were known, so the speakers — on the question
        // and on every option — were drawn on trust. One redraw when the list
        // lands takes back the ones this device cannot keep.
        speech.onVoices(render);

        // The better the word is known, the more options are offered — see
        // LEAST_OPTIONS and MOST_OPTIONS for where it starts and where it stops.
        const stats = spacedRepetitions.getWordStats(currentItem.word);
        const currentStage = stats.stage || 0;
        const targetOptionsCount = Math.min(currentStage + LEAST_OPTIONS, MOST_OPTIONS);

        /*
         * The answers on offer, drawn from the set the question came from and
         * from nowhere else.
         *
         * Every set there is was the wider net, and it caught nothing: a
         * translation from another set is rarely a plausible answer to this
         * question, it is a tell. "багаж" among greetings is not a choice
         * to weigh, it is the one line that obviously does not belong, and a
         * round of those asks nothing.
         *
         * A set too small to fill the stage's count simply asks with fewer
         * options. What can be asked is limited by what is in the set, and
         * padding the question from elsewhere is exactly what this stopped
         * doing.
         *
         * Each option carries the language of the word it came from. Within one
         * set that is usually the same language throughout, but it need not be,
         * and an option that says which language it is in cannot be read aloud
         * in the wrong one. Absent where the word never got a language, and then
         * speech.say guesses from the text, which is all a lone word can offer.
         */
        // Every option on the screen comes out of one set, so every option is
        // in that set's translation language -- there is nothing left to look up
        // per option.
        const optionLang = currentItem.translationLang;

        const allTranslations = [];

        store.wordsOf(currentItem.setId).forEach(({ word }) => {
            if (!word.translation || allTranslations.includes(word.translation)) return;

            allTranslations.push(word.translation);
        });

        const correctTranslation = currentItem.word.translation;
        const distractors = allTranslations.filter(t => t !== correctTranslation);
        distractors.sort(() => Math.random() - 0.5);

        const countToTake = Math.min(targetOptionsCount - 1, distractors.length);
        const selectedOptions = [correctTranslation, ...distractors.slice(0, countToTake)];
        selectedOptions.sort(() => Math.random() - 0.5);

        // Air at the sides for the block the cursor grows (see CURSOR_SCALE),
        // which otherwise ran up against the popup's edges, and under the last
        // one -- the owner's call, 11 November 2026
        const optionsList = $(container, `<div class="quiz-options-list" style="display: flex; flex-direction: column; gap: 12px; padding: 0 12px 22px;"></div>`);

        const BLOCK_UP = `${BLOCK_EDGE}px ${BLOCK_EDGE}px 0 ${BLOCK_LINE}`;
        const BLOCK_DOWN = `1px 1px 0 ${BLOCK_LINE}`;
        const BLOCK_LIFT = `${BLOCK_EDGE + 2}px ${BLOCK_EDGE + 2}px 0 ${BLOCK_LINE}`;
        const BLOCK_IN = `translate(${BLOCK_EDGE - 1}px, ${BLOCK_EDGE - 1}px)`;

        // How a block stands when nothing is pressing it: up on its shadow, or
        // a little higher once it is shown to be the right answer (see lift).
        // A sunk one stays where it was put.
        function rest(button) {
            if (button.dataset.sunk) return;

            const lifted = !!button.dataset.lifted;

            button.style.transform = lifted ? 'translate(-2px, -2px)' : '';
            button.style.boxShadow = lifted ? BLOCK_LIFT : BLOCK_UP;
        }

        // Pushed into its shadow while the finger is on it, and back to rest
        // when it lets go
        function squish(button) {
            button.addEventListener('pointerdown', () => {
                if (button.dataset.sunk) return;

                button.style.transform = BLOCK_IN;
                button.style.boxShadow = BLOCK_DOWN;
            });

            ['pointerup', 'pointerleave', 'pointercancel'].forEach(type => button.addEventListener(type, () => rest(button)));
        }

        function lift(button) {
            button.dataset.lifted = '1';
            rest(button);
        }

        // A block out of play: pushed into the table and faded
        function sink(button) {
            button.dataset.sunk = '1';
            button.style.transform = BLOCK_IN;
            button.style.boxShadow = 'none';
            button.style.opacity = '0.45';
            button.style.filter = 'saturate(0.4)';
        }

        /*
         * The stamp put down on an answered block: dropped from above at a
         * slant, hitting a shade small and settling -- a rubber stamp.
         */
        function stamp(button, ok) {
            const icon = button.querySelector('.status-icon');
            if (!icon) return;

            icon.innerHTML = STAMP(ok);
            icon.style.display = 'block';
            icon.style.transform = 'rotate(-14deg)';

            if (still()) return;

            icon.animate([
                { transform: 'rotate(-14deg) scale(1.9)', opacity: 0 },
                { transform: 'rotate(-14deg) scale(0.86)', opacity: 1, offset: 0.65 },
                { transform: 'rotate(-14deg) scale(1)', opacity: 1 }
            ], { duration: 260, easing: 'ease-in' });
        }

        /*
         * What the screen does with an answer, once it is given:
         *
         * Right -- the block lifts and bumps, a tick is stamped on it, the
         * label gives a little hop, and the other blocks slide off to the
         * side one after another.
         *
         * Wrong -- the block shakes its head, fades to grey and is stamped
         * with a cross; a beat later the right one lifts and is stamped with
         * a tick, and the rest sink into the table.
         *
         * On `scale`, `translate` and `rotate` rather than on transform,
         * which a press and a sunk block are using.
         */
        function answered(picked, right) {
            const rightBtn = optionButtons.find(b => b.querySelector('.quiz-option-label').textContent === correctTranslation);
            const label = questionCard.querySelector('.quiz-question-word');

            if (right) {
                lift(picked);
                stamp(picked, true);

                if (still()) return;

                picked.animate([{ scale: 1 }, { scale: 1.03, offset: 0.4 }, { scale: 1 }], { duration: 320, easing: 'ease-out' });

                if (label) label.animate([{ translate: '0px 0px' }, { translate: '0px -5px', offset: 0.4 }, { translate: '0px 0px' }], { duration: 360, easing: 'ease-out' });

                optionButtons.filter(b => b !== picked).forEach((b, k) => b.animate([
                    { translate: '0px 0px', rotate: '0deg', opacity: 1 },
                    { translate: '110% 0px', rotate: '6deg', opacity: 0 }
                ], { duration: 420, delay: 160 + k * 60, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' }));

                return;
            }

            // Out of play, but not sunk: it is the one being shown wrong
            picked.dataset.sunk = '1';
            picked.style.filter = 'grayscale(1) brightness(0.85)';
            stamp(picked, false);

            if (rightBtn) {
                lift(rightBtn);
                setTimeout(() => { if (rightBtn.isConnected) stamp(rightBtn, true); }, still() ? 0 : 260);
            }

            optionButtons.forEach(b => { if (b !== picked && b !== rightBtn) sink(b); });

            if (still()) return;

            picked.animate([
                { translate: '0px 0px' },
                { translate: '-8px 0px', offset: 0.15 },
                { translate: '7px 0px', offset: 0.35 },
                { translate: '-4px 0px', offset: 0.55 },
                { translate: '2px 0px', offset: 0.75 },
                { translate: '0px 0px' }
            ], { duration: 380, easing: 'ease-out' });

            if (rightBtn) rightBtn.animate([{ scale: 1 }, { scale: 1.03, offset: 0.5 }, { scale: 1 }], { duration: 340, delay: 260, easing: 'ease-out' });
        }

        /*
         * The question coming on: the label is stuck on, dropped in at more of
         * a slant than it settles at, and the blocks are dealt onto the table
         * one after another. Once a question -- see `introduced`.
         */
        function enter() {
            const key = `${state.sessionAt}:${state.currentIndex}`;

            if (introduced.key !== key) introduced = { key, at: performance.now() };

            if (still()) return;

            const gone = performance.now() - introduced.at;
            const play = (el, frames, timing) => {
                if (timing.delay + timing.duration - gone <= 0) return;
                el.animate(frames, { ...timing, delay: timing.delay - gone, fill: 'backwards' });
            };

            const label = questionCard.querySelector('.quiz-question-word');

            if (label) play(label, [
                { translate: '0px -10px', rotate: '-6deg', opacity: 0 },
                { translate: '0px 0px', rotate: '0deg', opacity: 1 }
            ], { duration: 340, delay: 0, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' });

            optionButtons.forEach((b, k) => play(b, [
                { translate: '0px -10px', rotate: `${k % 2 ? 2.5 : -2.5}deg`, opacity: 0 },
                { translate: '0px 0px', rotate: '0deg', opacity: 1 }
            ], { duration: 320, delay: 120 + k * 60, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' }));
        }

        const optionButtons = [];
        let selectedIndex = -1;

        /*
         * Whether this question has been answered, read from the saved dot rather
         * than started at false.
         *
         * Started at false it was, and the answer was written twice. These two
         * are born again with every drawing of the question, and a question is
         * drawn again more often than it looks: after a wrong answer the round
         * stays on the same word, waiting to be confirmed by a click on the right
         * one, and the state is saved there -- so closing the popup and coming
         * back drew the question afresh with nothing remembered, and answering it
         * again put a second record on the word. The voices arriving mid-round do
         * the same thing, since they redraw too.
         *
         * The dot is in the saved state and survives both. Snake learned this
         * first, in scoreRound, and for the same reason.
         */
        let isAnswered = !!state.sessionResults[state.currentIndex];
        let wasWrong = state.sessionResults[state.currentIndex] === 'wrong';

        /*
         * The keyboard cursor: the block pointed at grows a little and stands
         * over its neighbours, with an arrow at its end saying which key sends
         * it. Both are dropped the moment an answer is given: from then on the
         * stamps carry the result.
         *
         * By `scale` rather than by anything that takes room: a transform is
         * drawn, not laid out, so the block grows over the gap round it and
         * nothing else moves -- the owner's call, 11 November 2026, when this
         * took the place of a green outline. The outline was another colour
         * on the block's own thick one, and on the light theme it did not sit.
         * `scale` and not `transform`, which a press is using.
         */
        const CURSOR_SCALE = 1.035;

        function showCursor(button, on) {
            button.style.scale = on ? String(CURSOR_SCALE) : '';
            button.style.zIndex = on ? '1' : '';
            const arrow = button.querySelector('.quiz-option-arrow');
            if (arrow) arrow.style.display = on ? 'block' : 'none';
        }

        function highlight(index) {
            if (optionButtons.length === 0) return;

            // The cursor keeps moving after an answer — a wrong pick moves it onto
            // the right one so Enter still advances — it just stops being drawn.
            selectedIndex = (index + optionButtons.length) % optionButtons.length;
            optionButtons.forEach((b, i) => showCursor(b, !isAnswered && i === selectedIndex));
        }

        // Moves to the next word, or ends the session on the last one
        function advance() {
            state.currentIndex++;
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

        selectedOptions.forEach((opt, optIndex) => {
            // The speaker sits at the head of the block in a ring of the
            // block's own outline, where a letter of the option would be in a
            // quiz show -- and only where the language has a voice: no voice,
            // no ring (the owner's call, 11 November 2026)
            const optBtn = $(optionsList, `<button class="quiz-option-btn" style="width: calc(100% - ${BLOCK_EDGE}px); min-height: 50px; padding: 8px 12px; background: ${palette.blocks[optIndex % palette.blocks.length]}; border: 2px solid ${BLOCK_LINE}; border-radius: 12px; box-shadow: ${BLOCK_UP}; font-family: inherit; font-weight: 800; font-size: 17px; color: ${palette.blockInk}; cursor: pointer; transition: filter 0.25s, opacity 0.25s, scale 0.15s; text-align: left; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                <span class="quiz-option-left" style="display: flex; align-items: center; gap: 11px; min-width: 0;">
                    ${speech.speakerHtml(opt, optionLang, palette.blockInk, `margin-top: 0; flex: none; width: 30px; height: 30px; box-sizing: border-box; align-items: center; justify-content: center; border-radius: 50%; background: rgba(255, 255, 255, 0.6); border: 2px solid ${BLOCK_LINE}; font-size: 15px;`)}
                    <span class="quiz-option-label">${escapeText(opt)}</span>
                </span>
                <span class="quiz-option-right" style="display: flex; align-items: center; flex: none;">
                    <span class="quiz-option-icon status-icon" style="font-size: 14.3px;"></span>
                    <span class="quiz-option-arrow" style="display: none; color: ${palette.blockInk};">${SUBMIT_ARROW}</span>
                </span>
            </button>`);

            optionButtons.push(optBtn);
            squish(optBtn);

            /*
             * The speaker is the one spot on an option that does not answer with
             * it. The option is a button and all of it answers, so the click has
             * to stop here — the same click would otherwise say the word and end
             * the round, which is two things at once.
             *
             * The option whole, not word by word: an option is one answer, and
             * there is nothing inside it to point at. Nothing is marked while it
             * is said, for the same reason — the mark on a card says which word
             * of several is speaking, and here there is only the one. The mark
             * would also be the wrong thing to flash on an answer: it is a mint
             * fill, and a mint fill on an option is how a right one is shown.
             */
            const speaker = optBtn.querySelector('.say-all');
            if (speaker) speaker.addEventListener('click', (e) => {
                e.stopPropagation();

                speech.say(opt, optionLang, null, speaker);
            });

            optBtn.addEventListener('click', () => {
                if (optBtn.dataset.disabled === 'true') return;

                // Clicking moves the cursor too, so mouse and keyboard never disagree
                highlight(optIndex);

                const isCorrect = (opt === correctTranslation);

                if (!isAnswered) {
                    isAnswered = true;
                    optionButtons.forEach(b => showCursor(b, false));

                    if (isCorrect) {
                        answered(optBtn, true);

                        store.recordRepetition(currentItem, 1, 'quiz', { at: state.sessionAt, size: state.sessionPool.length });
                        state.sessionResults[state.currentIndex] = 'correct';
                        starAnswered(true);

                        // The chime of the stage the word has come to
                        sfx.chime(spacedRepetitions.getWordStats(currentItem.word).stage || 0);

                        store.save();
                        refreshDots();

                        setTimeout(advance, NEXT_AFTER);
                    } else {
                        wasWrong = true;

                        store.recordRepetition(currentItem, 0, 'quiz', { at: state.sessionAt, size: state.sessionPool.length });
                        state.sessionResults[state.currentIndex] = 'wrong';
                        starAnswered(false);
                        sfx.lose();

                        store.save();
                        refreshDots();

                        // Reveal the right answer, mark the wrong pick, sink the
                        // rest -- see answered. Only the right one still does
                        // anything.
                        answered(optBtn, false);
                        optionButtons.forEach(b => {
                            if (b.querySelector('.quiz-option-label').textContent !== correctTranslation) b.dataset.disabled = 'true';
                        });

                        // The right answer is the only option that still does anything,
                        // and clicking it is what closes the round — put the cursor there
                        highlight(selectedOptions.indexOf(correctTranslation));
                        page.save();
                    }
                } else if (wasWrong && isCorrect) {
                    // After a mistake the player confirms by clicking the right answer
                    advance();
                }
            });
        });

        enter();

        bindKeys((code) => {
            /*
             * Answered, ↑/↓ have nothing to do: the cursor is not drawn after
             * an answer, and moving it about unseen only took → away from the
             * right option, where it had been put -- the owner found → doing
             * nothing after a mistake, 11 November 2026. So → presses the
             * right option whatever happened, which after a mistake is the way
             * on to the next word, and after a right answer does nothing.
             */
            if (isAnswered) {
                if (code !== 'ArrowRight') return;

                const right = optionButtons.find(b => b.querySelector('.quiz-option-label').textContent === correctTranslation);
                if (right) right.click();
                return;
            }

            if (code === 'ArrowUp') highlight(selectedIndex < 0 ? -1 : selectedIndex - 1);
            else if (code === 'ArrowDown') highlight(selectedIndex + 1);
            else if (optionButtons[selectedIndex]) optionButtons[selectedIndex].click();
        });

        page.save();
    }

    quiz.render = render;

    quiz.setTheme = (isDark) => {
        const t = tokens.of(isDark);

        palette = {
            dotIdle: t.border,

            // The way out and the sound stand on the page, like dict's header
            // buttons, and are outlined the same — see tokens.chrome.
            chromeBorder: t.chrome,
            // Marks where you are right now — the dot you are on, and in quiz
            // the option under the keyboard cursor. Its own token rather than
            // the accent, because `ring` also paints the buttons, and "you are
            // here" should not shout in the same colour as "press this".
            cursor: t.progress,
            // The stage in the dot of the word in play -- see page.dotHtml
            stageInk: t.muted,
            backBtn: t.muted,

            // The label the question is written on: paper, a shade warmer on
            // the dark theme so that it does not glare -- see BLOCK_EDGE
            label: isDark ? '#f3efe4' : '#fffdf7',
            labelMuted: '#6b6256',

            // The blocks, in this order down the list -- mint, lavender, sky,
            // peach, butter, rose -- and the ink written on them: the same on
            // both themes, see BLOCK_EDGE
            blocks: ['#b7e4c7', '#cbbdf3', '#a7d3f2', '#f6c8a6', '#f3e1a0', '#f2b8c6'],
            blockInk: '#10232d',

            // Nothing here for what is being said: letter, word and line are
            // all marked off the bubble ramp — see sayLater.
            //
            // The speaker beside the question stays muted until it answers: it
            // is an offer, not the thing to press.
            sayIcon: t.muted,

            // Still read by the dots along the top, which are too small to fill.
            okText: t.ok,
            errText: t.err,

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
    // start so a game can carry its own settings across. Progress never rides along.
    quiz.start = (setId, allowEarly) => {
        state.selectedSetId = setId;
        state.allowEarly = allowEarly;
    };

    quiz.getState = () => ({
        selectedSetId: state.selectedSetId,
        currentIndex: state.currentIndex,
        sessionResults: state.sessionResults,
        sessionPool: state.sessionPool,

        // Goes with the pool it belongs to. Left out, a run that was interrupted
        // came back nameless, and the answers after the break were recorded
        // without saying which run they were part of.
        sessionAt: state.sessionAt,

        allowEarly: state.allowEarly,

        // The star is the session's and goes with it -- see STAR_TOP
        starLevel: state.starLevel
    });

    quiz.setState = (snap) => {
        if (!snap) return;
        state = { ...getEmptyState(), ...snap };
    };
}

bootGame('quiz', quiz);
