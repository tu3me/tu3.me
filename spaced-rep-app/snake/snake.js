/**
 * "Snake" game. The snake collects the letters of the word in order; a wrong
 * letter or a self-collision costs a heart. The round state is persisted on
 * every step, so closing the popup mid-game loses at most the last move.
 *
 * The board is an SVG, rebuilt from scratch on every frame. It was a canvas
 * first, and for a while both renderers were kept side by side to be measured
 * against each other: canvas carries a complex scene more cheaply, but it pays
 * for resolution and SVG does not — and resolution is the thing a phone screen
 * has a great deal of. The canvas twin has been removed; what it measured is
 * in docs/FINDINGS.md.
 *
 * Four sub-modules are private to this game and follow the same init-once
 * shape as the top-level ones:
 *
 *     view    everything that draws — DOM, SVG, d-pad. Decides nothing.
 *     clock   pacing: the tick, acceleration, and every timer the game owns.
 *     board   the rules and the field. Touches no DOM and no storage.
 *     input   keyboard and d-pad presses turned into direction intents.
 *
 * What is left in snake() is the session: which word is current, what a step
 * means for the player's progress, and when the session is over.
 */
function snake(container) {
    // How many words this game takes per session — its own decision
    const POOL_LIMIT = 10;

    // The playing field: board reasons about it, view draws it
    const GRID_COUNT = 12;

    /*
     * A word's letters, as the person reading it would count them.
     *
     * Not word.split(''), which counts UTF-16 code units and is wrong in every
     * script but the simplest: it cuts an emoji in half into two cells that are
     * each nothing, it strips the vowel signs off a Devanagari or Thai syllable
     * and scatters them as separate letters, and an é typed as e + combining
     * acute becomes two cells, the second of which is an invisible mark the
     * player cannot see, steer into, or tell from the next one.
     *
     * Intl.Segmenter is the one thing that knows where the breaks fall in all
     * of them at once, which is what makes the game work the same in Japanese,
     * Hindi or Arabic as in English.
     *
     * Where it is missing, code points are the next best guess: right for CJK
     * and for emoji that are a single code point, still wrong for combining
     * marks. Better than halving a surrogate pair, which is what the old split
     * did everywhere.
     */
    const SEGMENTER = typeof Intl !== 'undefined' && Intl.Segmenter
        ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
        : null;

    function lettersOf(word) {
        if (!word) return [];

        return SEGMENTER
            ? Array.from(SEGMENTER.segment(word), part => part.segment)
            : Array.from(word);
    }

    /*
     * How a letter is shown — on the board, in the bar, and in the comparison
     * that decides whether the player ate the right one, which is why it is
     * applied once and stored rather than at each of those.
     *
     * Upper case, but only where that leaves one letter: 'ß' upper-cases to
     * 'SS' and a cell holds a single glyph. Scripts with no case of their own
     * pass through untouched.
     */
    /*
     * A letter that is blank: the boundary between two words, and the one thing
     * in a line that is not collected. Nothing is spawned for it, the snake can
     * never eat one, and the bar shows it as the space between two letters.
     *
     * It used to be a letter like any other — a filled block on the board, to be
     * steered into in its turn. What that asked of the player was to find a cell
     * with nothing written on it, in a game about reading the letters off the
     * board, and the block had to be explained twice over before it read as a
     * letter's worth of nothing rather than as a letter.
     *
     * Any blank, not the space bar alone: French writes a narrow no-break space
     * before its question mark and Japanese has an ideographic one, and a word
     * boundary is a word boundary in every script.
     */
    const BLANK = /^\s+$/;

    /*
     * A letter with a sound of its own.
     *
     * Anything carrying neither a letter nor a digit has none: a blank, and —
     * the reason this exists — a punctuation mark. Asked for «?» on its own a
     * synthesiser does not fall silent, it says "question mark", which is not
     * something the word contains; «؟», «¿», «।» and «。» go the same way in
     * whatever language the voice happens to be.
     *
     * Only on its own. Inside a word or a phrase the mark stays where it was
     * written: there it is not read out, it shapes how the rest is said, and
     * «¿Cómo aprender español?» would be the poorer without it.
     *
     * By letters and digits rather than by a list of marks, because the list
     * would have to be every script's: the danda, the ideographic full stop,
     * the Greek question mark that is a semicolon, the Armenian ones that look
     * like nothing else.
     */
    const SOUNDED = /[\p{L}\p{N}]/u;

    const worthSaying = (text) => SOUNDED.test(String(text || ''));

    /*
     * Whether a word is written right to left.
     *
     * Judged by script, because the word is the only evidence there is: nothing
     * tells this game what language it was handed, and a set may hold several.
     *
     * The letters are collected in the order they are written either way — the
     * first letter of the word is the first one to go for, in Hebrew as in
     * English. What this decides is only which end of the bar that first letter
     * sits at, and for a right-to-left word, laying it out leftwards shows the
     * word backwards to the one person who can read it.
     */
    const RTL_SCRIPT = /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Adlam}]/u;

    function isRtl(text) {
        return RTL_SCRIPT.test(text);
    }

    /*
     * The typeface the letters are drawn in, taken from the page rather than
     * written out again.
     *
     * The letters on the board, the letters in the bar and the canvas that
     * measures them all have to name the same typeface, and each of the three
     * names it separately. The measuring canvas is the one that punishes a
     * short list: wherever system-ui fails to resolve, a canvas falls back to
     * its default, which is a serif — and then every letter is placed by the
     * metrics of a typeface it is not drawn in. Measured, not guessed: an
     * unresolvable family on canvas renders pixel for pixel as `serif`.
     *
     * Read from the body, so the two cannot drift apart even if the stylesheet
     * changes its mind.
     */
    const LETTER_FONT = getComputedStyle(document.body).fontFamily
        || 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    function fontOf(px, weight) {
        return `${weight ? weight + ' ' : ''}${px}px ${LETTER_FONT}`;
    }

    function shownAs(letter) {
        const upper = letter.toUpperCase();

        return lettersOf(upper).length === 1 ? upper : letter;
    }

    // The two header toggles: the label is what the button shows, the index is what is persisted.
    //
    // Controls used to have a third mode, a thumb stick beside the board. It went
    // because the d-pad beat it at the one thing either of them is for: a snake
    // turns four ways, a key per way says which one, and a stick made the player
    // aim at an angle to pick from four.
    const CONTROL_MODES = ['Off', 'D-pad'];
    const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

    // Milliseconds between free-running steps per difficulty; null — the player steps by hand
    const STEP_MS = [null, 400, 220];

    /*
     * Where a new game starts: the slowest of the three, which is the one with
     * no clock at all — the snake waits, and every step is a press.
     *
     * The middle one used to be the start, and it is a poor first thirty seconds:
     * the board is unfamiliar, the letters have to be read off it, and a snake
     * that walks into a wall while all that is happening crashed for a reason
     * that had nothing to do with the game. The speed chip is in the header for
     * the player who wants the pressure.
     */
    const SPEED_AT_START = 0;

    let state = getEmptyState();

    /**
     * Rendering. Holds the DOM references and the palette, and knows nothing
     * about the rules: mount() builds the screen and stores the callbacks,
     * every other method just paints what it is handed.
     */
    function view(host) {

        let palette = {};
        let cb = {};
        let header, hintBanner, gatheredBar, svg, scene, measure, controlsArea;
        let cellSize = 0;

        /*
         * Which link is wearing the head's colour this frame, while the head is
         * running down the body after a crash — null the rest of the time.
         *
         * Display state and nothing else, which is why it lives here and not on
         * the board: nothing about the snake has changed while this runs. Where
         * it is, how long it is and what it is carrying are all exactly as they
         * were, and they stay that way until headToTail turns it round for real.
         * It is also why it is never persisted — a saved game that resumed
         * halfway through a flash would be a saved game with a glitch in it.
         */
        let headRun = null;

        view.headRun = (at) => { headRun = at; };

        // Whether the eyes are shut this frame — the blink, and nothing else.
        // Display state like headRun: it is never saved, and a round resumed
        // from storage opens its eyes.
        let eyesShut = false;

        view.eyesShut = (on) => { eyesShut = on; };

        let controlMode = 0;
        let difficulty = SPEED_AT_START;

        // Victory takes the control panel away for good. renderControls has to
        // know: the chip in the header stays live, and without this, switching
        // the d-pad on would raise the panel again over the end-of-session screen.
        let controlsRetired = false;

        function translationEl() {
            return hintBanner ? hintBanner.querySelector('#snake-translation') : null;
        }

        // Shrinks the translation until it fits the fixed-height banner
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

        /*
         * How tall a letter's line is, and how much room the bar has for lines
         * of it.
         *
         * 1.2 was enough while the letters were Latin, and cut everything else:
         * a line box that tall leaves 2.9px under the baseline at this size,
         * and a Hebrew final kaf or a sheva needs 4. Measured across a page
         * of ten scripts, the deepest letter (हूँ, a Devanagari vowel sign
         * hanging under its consonant) reaches 5px below the baseline and the
         * tallest (कै) 18px above it — past the font's own ascent of 17 — so
         * the ink wants 23px where the line gave 18.7. The bar clips what does
         * not fit, which is what made the tops and tails disappear.
         *
         * 1.6 leaves about a pixel of air at each end. The cap grows with it,
         * so a word that takes two lines still does so at full size rather than
         * shrinking to fit a box built for shorter letters; the banner has the
         * room, and what is over three lines shrinks as it always did.
         */
        const BOX_LINE = 1.6;
        const BAR_MAX = 56;

        /*
         * The size the letters start at, before anything is measured.
         *
         * Big enough that a short word fills the banner instead of sitting in
         * the middle of it as small type. Nothing is risked by asking for too
         * much: fitGathered only ever comes down from here, so a long word ends
         * up exactly where it would have anyway, and a short one keeps the size
         * it was given.
         */
        const BOX_SIZE = 31.2;

        /*
         * The speaker that reads the finished line, in front of it, the size a
         * letter of it is — the same place and the same proportion as the one on
         * a card and the one on a quiz option.
         *
         * The margin only tops up the bar's own gap. Letters here stand apart,
         * unlike the letters of a card, and that gap is already 0.25 of a box —
         * 0.357 of an icon this size. Another 0.19 brings the space after the
         * speaker to the 0.55 of itself it has everywhere else, and both numbers
         * are in em of the icon, so the sum survives every step of fitGathered.
         *
         * The end of the line rather than the right of it: the bar is turned
         * around for a word written right to left, and in front of it is then
         * the right-hand side.
         */
        /*
         * The colours a word and a line are filled with while they are being
         * said: four steps off the bubble ramp, far enough apart to be told at a
         * glance and not close enough to read as a series — the words of a line
         * are not in an order that means anything, they are simply not each
         * other. The same four cards fills its words from, for the same reason.
         *
         * A word keeps its colour whether it is said on its own or as part of
         * the line, so the fill is picked by where the word stands in the line
         * rather than by what is being said at the time.
         *
         * They are pale with dark ink on them, which is what makes them usable
         * here: the bar sits on a banner that is nearly black in one theme and
         * nearly white in the other, and a fill that carries its own ink does
         * not care which.
         */
        const WORD_FILLS = [3, 6, 9, 12];

        /*
         * The air around a box that is still hiding its letter.
         *
         * The bar is two things at once and they want opposite spacing. What is
         * still "?" is a row of slots, and a player has to be able to see at a
         * glance how many are left — six of them run together read as one blob
         * and have to be counted. What has been collected is a word, and the
         * letters of a word belong shoulder to shoulder.
         *
         * So the spacing is a property of the box rather than of the bar: half
         * on each side, which puts a full step between two slots, half a step
         * where the collected part meets the rest, and nothing at all between
         * two letters. The word closes up as it is spelled out.
         *
         * In em, so it comes down with the letters when fitGathered shrinks
         * them. The bar does get narrower as the slots close, and the fitting
         * runs again on every letter — a word can come back up a size on its way
         * to being finished, which is a reward rather than a glitch.
         */
        const SLOT_AIR = '0.125em';

        /*
         * How wide a blank is, in the letters' own size, and the only space this
         * bar has anywhere: what stands between two words.
         */
        const WORD_SPACE = 0.4;

        /*
         * The speaker and the air after it.
         *
         * A word's space, the same one that stands between two words — which is
         * what the speaker is to the line, a thing in front of it rather than
         * its first letter. It had a sliver before, written back when the bar
         * put a quarter of a letter between every pair of letters and the margin
         * only had to top that up to the gap a card gives; the bar's gap has
         * since gone and the sliver stayed behind as the whole of it.
         *
         * Divided by the scale because the margin is em of the icon's own size
         * and the space it is matching is em of a letter's.
         *
         * The scale itself is a capital's worth of ink. The drawing fills two
         * thirds of its own square — the 24-unit path runs from y=4 to y=20 —
         * and a capital stands 0.7 of the type size, so the box comes out larger
         * than a letter to put the same height of ink beside it. It was 0.7 flat
         * before: the cap height applied to the box rather than to the ink, and
         * what arrived was two thirds of a capital.
         *
         * Nothing has to be nudged downwards here, unlike on a card. The ink sits
         * dead centre of its square, and the bar centres what it holds, so the
         * speaker lines up with the letters by being the same shape of problem.
         */
        const SAY_INK = 2 / 3;
        const CAP_HEIGHT = 0.7;

        const SAY_SCALE = Math.round((CAP_HEIGHT / SAY_INK) * 1000) / 1000;
        const SAY_LEAD = `margin-top: 0; margin-inline-end: ${WORD_SPACE / SAY_SCALE}em; font-size: ${BOX_SIZE * SAY_SCALE}px; flex: none;`;

        function fitGathered() {
            // The gaps standing in for the blanks are measured and sized with
            // the letters: their width is in em, so a gap left at the starting
            // size while the letters shrank would grow wider than the words on
            // either side of it.
            const boxes = gatheredBar.querySelectorAll('.snake-gathered-box, .snake-gathered-space');
            if (boxes.length === 0) return;

            // The speaker comes down with them, at its own fraction of the size:
            // it is a letter's worth of icon, and a letter's worth of anything
            // has to keep being that once the letters have shrunk.
            const say = gatheredBar.querySelector('.say-all');

            const wear = (size) => {
                boxes.forEach(b => {
                    b.style.fontSize = size + 'px';
                });
                if (say) say.style.fontSize = (size * SAY_SCALE) + 'px';
            };

            let size = BOX_SIZE;
            const maxH = BAR_MAX;

            wear(size);

            while ((gatheredBar.scrollHeight > maxH || gatheredBar.offsetHeight > maxH) && size > 8 && gatheredBar.offsetHeight > 0) {
                size -= 0.5;
                wear(size);
            }
        }

        // The header chips draw their state instead of naming it. Everything is currentColor,
        // so both icons follow the chip's own colour in either theme.
        function chipIcon(body, extra) {
            return `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" ${extra || ''}>${body}</svg>`;
        }

        /*
         * What the chip says it is doing, asked the way renderControls asks it:
         * off, or the one panel there is.
         *
         * Not CONTROL_MODES[controlMode], which assumes the number came from that
         * list. A session saved while the stick still existed carries a 2, and the
         * label read "Controls: undefined" over a panel that was showing a d-pad.
         */
        function controlLabel() {
            return CONTROL_MODES[controlMode === 0 ? 0 : 1];
        }

        // The control chip is a d-pad laid out like the panel it summons: one key on top,
        // three in a row below. The same face whether the panel is up or down — the panel
        // itself is the answer to which it is, and the tooltip says so in words.
        function controlIcon() {
            const key = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" rx="1.5" fill="currentColor" />`;
            return chipIcon(key(8.5, 4.5) + key(0.5, 12.5) + key(8.5, 12.5) + key(16.5, 12.5));
        }

        // Speed as three chevrons: one lit on easy, two on medium, all three on hard.
        // Each mark keeps its own colour and only lights up once the level reaches it.
        function difficultyIcon(level) {
            const marks = [[3, '#eab308'], [10, '#f97316'], [17, '#ef4444']];
            return chipIcon(
                marks.map(([x, colour], i) => `<path d="M${x} 7l4 5-4 5" stroke="${colour}" opacity="${i <= level ? 1 : 0.25}" />`).join(''),
                'fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"'
            );
        }

        // One button style for every on-screen control, d-pad and turn row alike. Both
        // panels are 3-column grids filling the whole width — this is thumb territory on
        // a phone, so the cell places the button and `place` only says which cell.
        function padBtn(id, glyph, place) {
            return `<button class="snake-pad-btn" id="${id}" style="grid-area: ${place}; width: 100%; height: 56px; background: ${palette.dpadBg}; border: 1px solid ${palette.dpadBorder}; border-radius: 14px; font-weight: 700; font-size: 24px; cursor: pointer; color: ${palette.dpadColor}; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent;">${glyph}</button>`;
        }

        // Both panels share it: three equal columns, full width
        const PAD_GRID = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: 100%;';

        // A press asks for a move, a release drops the acceleration the hold built up.
        //
        // touchstart is cancelled too: holding a button to accelerate looks exactly like
        // the long press that opens a context menu, and Android answers that gesture with
        // a short vibration. Cancelling pointerdown does not stop it — the gesture is
        // recognized from the touch stream, so the touch default is what has to go.
        function bindPad(root, id, press) {
            const btn = root.querySelector('#' + id);
            if (!btn) return;

            const handlePress = (e) => {
                if (e) e.preventDefault();
                press();
            };
            const handleRelease = (e) => {
                if (e) e.preventDefault();
                cb.onDirectionRelease();
            };

            const swallow = (e) => e.preventDefault();

            btn.addEventListener('pointerdown', handlePress);
            btn.addEventListener('pointerup', handleRelease);
            btn.addEventListener('pointerleave', handleRelease);
            btn.addEventListener('pointercancel', handleRelease);
            btn.addEventListener('touchstart', swallow, { passive: false });
            btn.addEventListener('contextmenu', swallow);
        }

        function renderControls() {
            const wrapper = controlsArea.querySelector('#controls-wrapper');
            if (!wrapper) return;

            wrapper.innerHTML = '';

            // The panel is what is hidden, not the wrapper inside it. An empty
            // wrapper collapses to nothing, but the panel around it keeps its
            // 10px margins top and bottom, so a d-pad switched off still pushed
            // everything below it down by 20px of blank space.
            if (controlMode === 0 || controlsRetired) {
                controlsArea.style.display = 'none';
                return;
            }

            controlsArea.style.display = 'flex';

            // Anything that is not "off" is the d-pad, rather than a mode matched
            // by its number: there is one panel left to show.
            const dPad = $(wrapper, `<div class="snake-dpad" style="${PAD_GRID}">
                ${padBtn('dpad-up', '▲', '1 / 2')}
                ${padBtn('dpad-left', '◀', '2 / 1')}
                ${padBtn('dpad-down', '▼', '2 / 2')}
                ${padBtn('dpad-right', '▶', '2 / 3')}
            </div>`);

            bindPad(dPad, 'dpad-up', () => cb.onDirection(0, -1));
            bindPad(dPad, 'dpad-down', () => cb.onDirection(0, 1));
            bindPad(dPad, 'dpad-left', () => cb.onDirection(-1, 0));
            bindPad(dPad, 'dpad-right', () => cb.onDirection(1, 0));

        }


        view.setTheme = (p) => { palette = p; };

        // Builds the screen from scratch and remembers the callbacks
        view.mount = (opts) => {
            cb = opts;

            // A screen built fresh has nothing mid-blink about it, whatever the
            // last one was doing when it went away.
            headRun = null;
            controlMode = opts.controlMode || 0;
            difficulty = opts.difficulty === undefined ? SPEED_AT_START : opts.difficulty;

            const chipStyle = `display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 28px; padding: 0; background: ${palette.dpadBg}; border: 1px solid ${palette.dpadBorder}; border-radius: 6px; color: ${palette.dpadColor}; cursor: pointer;`;

            /*
             * Three groups of one third each: the way out and the speed, the
             * dots, the d-pad switch and the sound.
             *
             * One chip at each end rather than both at one, which puts the same
             * weight either side of the dots. The two ends have to stay equal for
             * a second reason as well: ten dots are wider than a third, and what
             * keeps them in the middle of the header is the two groups beside
             * them being the same width — not the third they were handed.
             */
            header = $(host, `<div class="snake-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div class="snake-header-info" style="display: flex; flex: 1; align-items: center; gap: 8px;">
                    <a class="back-btn" href="index.html" title="Back" style="display: inline-flex; align-items: center; background: transparent; border: none; color: ${palette.backBtn}; cursor: pointer; padding: 0; text-decoration: none;"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12H5" /><path d="M11 6l-6 6 6 6" /></svg></a>
                    <button class="snake-difficulty-btn" id="snake-difficulty-toggle" title="Difficulty: ${DIFFICULTIES[difficulty]}" style="${chipStyle}">${difficultyIcon(difficulty)}</button>
                </div>
                <div class="snake-dots-group" id="snake-dots" style="display: flex; flex: 1; justify-content: center; align-items: center; gap: 6px;"></div>
                <div class="game-header-end" style="display: flex; flex: 1; justify-content: flex-end; align-items: center; gap: 8px;">
                    <button class="snake-control-btn" id="snake-control-toggle" title="Controls: ${controlLabel()}" style="${chipStyle}">${controlIcon()}</button>
                </div>
            </div>`);

            header.querySelector('.back-btn').addEventListener('click', (e) => {
                e.preventDefault();
                cb.onBack();
            });
            page.muteButton(header, palette.backBtn);

            header.querySelector('#snake-control-toggle').addEventListener('click', () => cb.onControlMode());
            header.querySelector('#snake-difficulty-toggle').addEventListener('click', () => cb.onDifficulty());

            hintBanner = $(host, `<div class="snake-hint-banner" style="background: ${palette.hintBg}; border: ${palette.hintBorder}; border-radius: 14px; padding: 8px 14px; text-align: center; margin-bottom: 10px; height: 104px; min-height: 104px; max-height: 104px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 4px; overflow: hidden;">
                <div class="snake-translation-text" id="snake-translation" style="font-size: 19.2px; font-weight: 700; line-height: 1.25; color: ${palette.hintText}; text-align: center; word-break: break-word; overflow-wrap: anywhere; max-width: 100%; max-height: 42px; overflow: hidden;">${opts.translation}</div>
            </div>`);

            /*
             * The bar itself takes no clicks any more — each box takes its own.
             *
             * It used to take one anywhere on it and mean "show me the answer",
             * and it kept meaning that after the word was already spelled out:
             * a stray click during the heart phase called onRevealHint on a
             * round that had just been won, and the dot went from right to
             * wrong. Now only a box that still reads "?" can say that, and once
             * there are none left there is nothing to hit.
             */
            /*
             * No gap on the bar itself. What air there is belongs to the boxes
             * that are still hiding a letter, and they carry it themselves —
             * see SLOT_AIR.
             */
            gatheredBar = $(hintBanner, `<div class="snake-gathered-bar" style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; max-width: 100%; max-height: ${BAR_MAX}px; overflow: hidden; width: 100%;"></div>`);

            const side = document.body.clientWidth;

            // The grid is the same 26 lines on every frame, so it is drawn once
            // into its own group and left alone. Everything that moves lives in
            // the group after it, which is the only thing a frame touches.
            let grid = '';
            for (let i = 0; i <= GRID_COUNT; i++) {
                const at = i * (side / GRID_COUNT);
                grid += `M${at} 0V${side}M0 ${at}H${side}`;
            }

            svg = $(host, `<svg class="snake-svg" id="snake-svg" viewBox="0 0 ${side} ${side}" style="background: ${palette.boardBg}; border: 1px solid ${palette.boardBorder}; border-radius: 14px; box-shadow: 0 4px 12px rgba(0,0,0,${palette.boardShadow}); display: block; touch-action: none; width: 100%; height: auto; aspect-ratio: 1; cursor: pointer;">
                <path d="${grid}" stroke="${palette.grid}" stroke-width="1" fill="none" />
                <g class="snake-svg-scene"></g>
            </svg>`);

            scene = svg.querySelector('.snake-svg-scene');

            // SVG can measure text only once it is in the document and laid
            // out, which is the thing this renderer is trying not to do twice
            // per glyph. A canvas measures without drawing, so one is kept here
            // for that alone — it paints nothing.
            measure = document.createElement('canvas').getContext('2d');

            cellSize = side / GRID_COUNT;

            controlsArea = $(host, `<div class="snake-controls-panel" style="display: flex; flex-direction: column; align-items: center; gap: 8px; margin-top: 10px; margin-bottom: 10px;">
                <div class="snake-controls-wrapper" id="controls-wrapper" style="display: flex; justify-content: center; width: 100%; min-height: 80px; align-items: center;"></div>
            </div>`);

            svg.addEventListener('click', () => cb.onBoardClick());

            renderControls();
        };

        view.dots = (pool, results, currentIndex) => {
            const dotsEl = header.querySelector('#snake-dots');
            if (!dotsEl) return;
            dotsEl.innerHTML = pool.map((_, idx) => {
                const res = results[idx];
                let bg = palette.dotIdle;
                if (res === 'correct') bg = palette.ok;
                if (res === 'wrong') bg = palette.err;

                const isCurrent = idx === currentIndex;
                const ringStyle = isCurrent ? `outline: 2px solid ${palette.cursor}; outline-offset: 1px; transform: scale(1.15);` : '';

                return `<div class="snake-dot" style="width: 10px; height: 10px; border-radius: 50%; background: ${bg}; ${ringStyle} transition: all 0.2s; flex-shrink: 0;"></div>`;
            }).join('');
        };

        view.banner = (text) => {
            const el = translationEl();
            if (el) {
                el.textContent = text;
                fitTranslation(el);
            }
        };

        // Takes the letters already segmented and cased, not the word: the bar
        // and the board have to agree on what counts as one letter, and the one
        // way to be sure of that is to be given the same list.
        view.gathered = (targetLetters, collected, showHint) => {
            gatheredBar.innerHTML = '';

            // The bar runs the way the word does, so the letter to go for next
            // is where its reader expects the next letter to be.
            gatheredBar.style.direction = isRtl(targetLetters.join('')) ? 'rtl' : 'ltr';

            /*
             * The speaker is there from the first frame, with every letter still
             * a "?", and it reads the line out loud without opening any of them.
             *
             * It costs nothing — no mistake, nothing on the dots. Hearing the
             * word you are hunting for is the round being played rather than a
             * way around it: the board is a row of letters in no order, and what
             * turns it into a word is knowing which word it is. Opening the
             * letters is the shortcut, and that one still costs.
             *
             * It used to wait until the line was whole, on the grounds that half
             * a word said out loud is not the word — true of the letters as they
             * are eaten, and beside the point for this, which says all of it
             * whatever has been found so far.
             *
             * It leads the line rather than trailing it, which is where a card,
             * a question and an option all keep theirs, and it rides inside the
             * bar rather than under it: the banner is a fixed 104px and a third
             * row would not fit in it.
             */
            const speakerHtml = speech.speakerHtml(targetLetters.join(''), sayLang, palette.sayIcon, SAY_LEAD);

            if (speakerHtml) {
                $(gatheredBar, speakerHtml).addEventListener('click', () => cb.onSayAll());
            }

            for (let i = 0; i < targetLetters.length; i++) {
                const char = targetLetters[i];

                /*
                 * A blank is the space between two words and nothing else: no
                 * box, no "?" standing in for it, nothing to reveal and nothing
                 * to say. It is not collected, so it is not a secret either —
                 * the line shows where one word ends from the first frame, and
                 * every "?" left in the bar is a letter that is out there to be
                 * eaten.
                 *
                 * Sized in em, and scaled by fitGathered along with the letters:
                 * a gap that kept its size while they shrank would end up wider
                 * than the words on either side of it.
                 */
                if (BLANK.test(char)) {
                    const gap = document.createElement('div');
                    gap.className = 'snake-gathered-space';
                    gap.style.cssText = `width: ${WORD_SPACE}em; font-size: ${BOX_SIZE}px;`;
                    gatheredBar.appendChild(gap);
                    continue;
                }

                const isCollected = i < collected;

                let color = palette.letterPending;
                let displayText = '?';
                let shown = false;

                if (isCollected) {
                    color = palette.letterCollected;
                    displayText = char;
                    shown = true;
                } else if (showHint) {
                    color = palette.letterHinted;
                    displayText = char;
                    shown = true;
                }

                const box = document.createElement('div');
                box.className = 'snake-gathered-box';

                // Which letter of the line this box is, because the boxes and
                // the letters are not the same list: a blank gets a gap and no
                // box, so by the second word the two have drifted apart. The
                // marks are asked for by letter, and this is how they are found.
                box.dataset.at = i;

                // Air only while it is a slot — see SLOT_AIR. A letter that is
                // open has nothing to be told apart from: it is part of a word.
                const air = shown ? '0' : SLOT_AIR;

                box.style.cssText = `display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: ${BOX_SIZE}px; line-height: ${BOX_LINE}; margin-inline: ${air}; color: ${color}; border-radius: 0.12em; transition: color 0.2s;`;

                box.textContent = displayText;

                // An open mark is drawn and left alone — worthSaying says why —
                // so it does not offer a pointer it cannot honour. Under a "?"
                // it is a box like any other and shows the answer like any
                // other: which letter is hiding there is exactly what the player
                // does not know yet.
                if (!shown || worthSaying(char)) {
                    box.style.cursor = 'pointer';
                    box.title = shown ? 'Say it' : 'Click to reveal answer (counts as mistake)';

                    // What the click means depends on how much of the word is
                    // open, and the board is what knows that — the view only
                    // says where the click landed.
                    box.addEventListener('click', () => cb.onLetterClick(i));
                }

                gatheredBar.appendChild(box);
            }

            fitGathered();
        };

        /*
         * The mark on what is being said, and the state needed to take it off
         * again.
         *
         * Each box remembers the colour it was wearing rather than being reset
         * to none: its colour is not decoration, it says whether that letter has
         * been collected, hinted or is still out there, and a mark that cleared
         * it would be answering a different question.
         *
         * Snake's own copy, like the ones in cards and the quiz. The three ask
         * the same thing of a tap and paint it over different furniture — faces
         * of a card, an option, a row of boxes half of which are still "?".
         */
        let lit = [];

        const boxAt = (index) => gatheredBar.querySelector(`.snake-gathered-box[data-at="${index}"]`);

        function hold(el) {
            lit.push({ el, colour: el.style.color });
        }

        view.unlight = () => {
            lit.forEach(({ el, colour }) => {
                el.style.background = '';
                el.style.color = colour;
            });
            lit = [];
        };

        /*
         * One letter, written in a colour rather than filled with one.
         *
         * Coral, which is what this app paints the thing you act on — the head
         * you steer, the button you press. Not mint: mint is what a collected
         * letter is written in, and a letter that turned mint because it was
         * being read out would be saying the snake had just eaten it.
         */
        view.sayLetter = (index) => {
            view.unlight();

            const el = boxAt(index);
            if (!el) return;

            hold(el);
            el.style.color = palette.saying;
        };

        /*
         * Whole words, filled behind their letters.
         *
         * The boxes alone are the whole fill: the letters of a word touch, so
         * their backgrounds meet and the word comes out as one block. The fill
         * used to be carried sideways past each box with a pair of shadows,
         * because a gap between the letters broke a filled word into a row of
         * separate tiles; the gap has gone and taken the reason with it.
         *
         * What still separates one filled word from the next is the blank
         * between them, which is a box of its own and is never filled.
         */
        view.sayWords = (ranges) => {
            view.unlight();

            ranges.forEach(({ from, to, place }) => {
                const stage = tokens.stages()[WORD_FILLS[place % WORD_FILLS.length]];

                for (let at = from; at <= to; at++) {
                    const el = boxAt(at);
                    if (!el) continue;

                    hold(el);
                    el.style.color = stage.ink;
                    el.style.background = stage.fill;
                }
            });
        };

        view.setControlMode = (mode) => {
            controlMode = mode;
            // Only the tooltip moves — the icon is the same in every mode
            const btn = header.querySelector('#snake-control-toggle');
            if (btn) btn.title = 'Controls: ' + controlLabel();
            renderControls();
        };

        view.setDifficulty = (level) => {
            difficulty = level;
            const btn = header.querySelector('#snake-difficulty-toggle');
            if (btn) {
                btn.innerHTML = difficultyIcon(level);
                btn.title = 'Difficulty: ' + DIFFICULTIES[level];
            }
        };

        // Replaces the banner and the letter row with the end-of-session panel
        /*
         * The confetti that comes down over a finished board.
         *
         * It rains: every piece starts above the top edge, falls the height of
         * the board and a bit more, and goes out the bottom. No burst, no
         * cannon — the shape of the thing is the falling, and anything thrown
         * reads as an explosion somewhere.
         *
         * Over the board rather than the banner, because it is the place the
         * work was done and by the time this runs it is the biggest empty thing
         * on the screen: the snake has stopped and the letters are all eaten.
         *
         * Fixed rather than absolute, and hung on nothing: a piece is above the
         * board before it is over it and below the board after, and an overlay
         * inside the layout would either clip it or push something. Fixed means
         * viewport coordinates, which is exactly what getBoundingClientRect
         * hands back, and means nothing on the screen moves an inch to make room.
         *
         * Two things keep it from being a curtain: they do not all set off at
         * once, and they do not all fall at the same speed. Either one alone
         * still reads as a single sheet coming down.
         *
         * The sky takes itself down when the last piece lands. The timer after it
         * is for the cases where no piece ever lands — animations turned off at
         * the system level, a tab that was in the background the whole time — and
         * removing a node twice costs nothing.
         */
        const CONFETTI = ['🎉', '🎊', '✨', '🎆', '🎇', '⭐', '🌟', '💫', '🥳', '🏆'];

        const PIECES = 44;
        const START_WINDOW = 900;
        const FALL_LEAST = 1500;
        const FALL_SPAN = 900;

        function fireworks() {
            // In the layout's pixels, because that is what the pieces are
            // placed with and the rect is measured outside the app's zoom —
            // see appScale.
            const board = svg && appRect(svg);
            if (!board || !board.width) return;

            const sky = $(host, `<div class="snake-confetti" style="position: fixed; left: 0; top: 0; width: 0; height: 0; pointer-events: none; z-index: 5;"></div>`);

            let falling = 0;
            const landed = () => { if (--falling <= 0) sky.remove(); };

            for (let i = 0; i < PIECES; i++) {
                // Spread across the width and then nudged, so the pieces cover
                // it without coming down in a row.
                const along = (i + Math.random()) / PIECES;

                const x = board.left + board.width * along;

                // Above the top edge by more than a piece is tall, so none of
                // them is seen waiting to start.
                const y = board.top - 40;

                // Far enough past the bottom edge that the last of it is out of
                // sight rather than stopping on the line.
                const fall = board.height + 80;

                const piece = $(sky, `<span class="snake-confetti-piece" style="position: absolute; left: ${Math.round(x)}px; top: ${Math.round(y)}px; margin-left: -0.5em; font-size: ${Math.round(15 + Math.random() * 14)}px; line-height: 1; will-change: transform, opacity; --dx: ${Math.round((Math.random() - 0.5) * board.width * 0.22)}px; --fall: ${Math.round(fall)}px; --sway: ${Math.round(6 + Math.random() * 14)}px; --spin: ${Math.round((Math.random() * 2 - 1) * 360)}deg; animation: snake-rain ${Math.round(FALL_LEAST + Math.random() * FALL_SPAN)}ms linear ${Math.round(Math.random() * START_WINDOW)}ms both;">${CONFETTI[i % CONFETTI.length]}</span>`);

                falling += 1;
                piece.addEventListener('animationend', landed, { once: true });
            }

            setTimeout(() => sky.remove(), START_WINDOW + FALL_LEAST + FALL_SPAN + 500);
        }

        view.victory = () => {
            const el = translationEl();
            if (el) {
                el.innerHTML = '🎉 Victory! Snake completed! 🏆';
                fitTranslation(el);
            }

            gatheredBar.innerHTML = `
                <div class="snake-win-actions" style="display: flex; gap: 8px; width: 100%;">
                    <button class="snake-go-dict-btn" id="snake-go-dict" style="flex: 1; padding: 9px 10px; background: ${palette.ring}; color: ${palette.onRing}; border: none; border-radius: 14px; font-weight: 700; font-size: 14.4px; cursor: pointer; transition: background 0.2s;">📚 Dictionary</button>
                </div>
            `;

            controlsRetired = true;
            if (controlsArea) controlsArea.style.display = 'none';

            const goDictBtn = gatheredBar.querySelector('#snake-go-dict');
            if (goDictBtn) {
                goDictBtn.addEventListener('click', () => cb.onGoDictionary());
            }

            // Last, so the burst is measured against the board as it now stands
            // and lands on a screen that has finished changing.
            fireworks();
        };

        // Markup is being assembled as text, so anything coming from a word has
        // to be neutered first. A word is whatever the player typed.
        function esc(text) {
            return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        // Where a glyph's baseline goes so that its ink is centred on the cell
        // rather than its em box: the ink of a comma sits at the bottom of the
        // box, so a glyph centred by its box is not centred by eye.
        function inkOffset(char, font) {
            measure.font = font;
            const m = measure.measureText(char);
            return (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2 || 0;
        }

        function glyph(char, cx, cy, px, fill, weight) {
            const font = fontOf(px, weight);
            const size = fitSize(char, px, font);
            const shown = size === px ? font : fontOf(size, weight);

            return `<text x="${cx}" y="${cy + inkOffset(char, shown)}" fill="${fill}"
                font-family="${LETTER_FONT}" font-size="${size}" font-weight="${weight || 'normal'}"
                text-anchor="middle">${esc(char)}</text>`;
        }

        /*
         * Brings a letter down to the size its cell can hold.
         *
         * A Latin letter never needs this, which is why the board could ignore it
         * until now. A Devanagari cluster and an Arabic letter in its initial
         * form both draw wider than a cell at the nominal size, and a letter
         * spilling into the cells beside it is a letter the player cannot tell
         * apart from its neighbours — the one thing this board is for.
         *
         * Measured by ink rather than by advance. The advance is where the next
         * letter would start; a Devanagari vowel sign hangs to the left of it
         * and a matra past its right, so the advance calls a cluster a fit while
         * what is actually drawn is already in the cell next door.
         *
         * Shrinking rather than clipping: a Thai syllable with its tone mark cut
         * off is a different syllable.
         */
        function fitSize(char, nominal, font) {
            const room = cellSize - 2;
            measure.font = font;
            const m = measure.measureText(char);
            const ink = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;

            if (!ink || ink <= room) return nominal;

            return Math.max(10, Math.floor(nominal * room / ink));
        }

        view.draw = (s) => {
            let out = '';

            if (s.phase === 'HEART' && s.heartPos) {
                out += `<text x="${(s.heartPos.x + 0.5) * cellSize}" y="${(s.heartPos.y + 0.5) * cellSize}"
                    font-family="${LETTER_FONT}" font-size="19.2" text-anchor="middle"
                    dominant-baseline="central">\u2764\ufe0f</text>`;
            }

            // Every letter out there is one to be read and gone for. The blanks
            // are not among them — see BLANK.
            s.lettersOnBoard.forEach(l => {
                if (l.isEaten) return;

                out += glyph(l.char, (l.x + 0.5) * cellSize, (l.y + 0.5) * cellSize, 30, palette.boardLetter, 'bold');
            });

            // The head has its own colour; the body runs along a hue ramp and goes deeper
            // wherever a letter is being carried
            const segmentColor = (idx) => {
                if (idx === 0) return palette.head;

                const bodyLength = s.snakeBody.length - 1;
                const ratio = bodyLength > 1 ? (idx - 1) / (bodyLength - 1) : 0;
                const h = palette.bodyHueStart + ratio * (palette.bodyHueEnd - palette.bodyHueStart);

                const carries = s.snakeBody[idx].char;
                const sat = carries ? palette.bodySatChar : palette.bodySatPlain;
                const light = carries ? palette.bodyLightChar : palette.bodyLightPlain;

                return `hsl(${h}, ${sat}%, ${light}%)`;
            };

            /*
             * What a link wears this frame, which is not always what its place in
             * the snake says.
             *
             * While the head is running down the body after a crash, three things
             * are true at once: everything the flash has passed already wears the
             * colour it will have once the snake is turned round, the one link it
             * is on wears the head's colour, and everything ahead of it still
             * wears what it wore before the crash.
             *
             * The colour after the turn is the colour of the slot at the other
             * end, because that is the slot that will be standing on this cell:
             * headToTail swaps the coordinates and leaves the slots where they
             * are, so the cell the flash has just left will be lit by slot
             * total-1-idx — its hue, and its saturation, which depends on whether
             * that slot is carrying a letter.
             *
             * The last link is the exception that needs no code: total-1-idx is 0
             * there, and slot 0 is the head, so the flash arrives at the tail and
             * simply stays. The snake has a head again, at the other end.
             */
            const total = s.snakeBody.length;

            const colourAt = (idx) => {
                if (headRun === null || idx > headRun) return segmentColor(idx);
                if (idx === headRun) return palette.head;

                return segmentColor(total - 1 - idx);
            };

            // Joints between consecutive segments, drawn under them. A tightly coiled snake
            // is otherwise one blob: a neighbouring cell looks the same whether it is the
            // next segment or another coil lying alongside, and the path cannot be read.
            // The segments are inset far enough that only a real joint bridges the gap.
            // Pairs split by the wrap around the board edge are skipped — on screen those
            // two cells are on opposite sides and there is nothing to bridge.
            const SEG_INSET = 3;
            const jointReach = SEG_INSET + 1;   // 1px into each segment, so no seam shows
            const jointWidth = cellSize * 0.42;

            for (let i = 0; i < s.snakeBody.length - 1; i++) {
                const a = s.snakeBody[i];
                const b = s.snakeBody[i + 1];
                if (Math.abs(b.x - a.x) + Math.abs(b.y - a.y) !== 1) continue;

                const fill = colourAt(i + 1);

                if (a.y === b.y) {
                    const edge = Math.max(a.x, b.x) * cellSize;
                    out += `<rect x="${edge - jointReach}" y="${(a.y + 0.5) * cellSize - jointWidth / 2}"
                        width="${jointReach * 2}" height="${jointWidth}" fill="${fill}" />`;
                } else {
                    const edge = Math.max(a.y, b.y) * cellSize;
                    out += `<rect x="${(a.x + 0.5) * cellSize - jointWidth / 2}" y="${edge - jointReach}"
                        width="${jointWidth}" height="${jointReach * 2}" fill="${fill}" />`;
                }
            }

            /*
             * The face, and it is the app's own: the two rings of the mark in
             * the header, the left one larger, which is what gives it the
             * puzzled look — see logoSvg in catalog.js.
             *
             * The numbers are that drawing's, divided by the width of the
             * card it sits on, so the face keeps its proportions on a head of
             * any size.
             *
             * The offsets centre the pair by its edges, not by its centres.
             * Two eyes of different sizes with their middles the same
             * distance out have their ink further out on the big side, and
             * the face ends up leaning that way — a snake looking slightly
             * left of where it is going. Placed so the outer edge of each eye
             * is the same distance from the middle of the head, at -0.388 and
             * +0.388, the pair sits in the middle and the big eye simply
             * reaches closer to it.
             *
             * Turned to face where the snake is going. The pair is laid out
             * along x across the middle of the head, which is the snake
             * heading down the screen; every other heading is that picture
             * rotated. atan2(-dx, dy) is the angle that does it — zero for
             * down, 180 for up, ±90 for the sides.
             *
             * Filled inside the white ring, which is the mark's other look —
             * the one the logo in the header takes when it is pressed. An open
             * ring on a coral square reads as a hole in the head; a dark
             * centre reads as a pupil, and a pupil is what makes the thing
             * look back at you.
             *
             * The fill is the dark theme's ground, the same value the logo's
             * pupil takes, and fixed in both themes for the same reason the
             * game colours are. Black was tried and is a hole punched in the
             * head; this is the navy the app is built on, and it reads as a
             * dark that belongs here.
             *
             * Shut is a line where the ring was, the length of its diameter and
             * the thickness of its stroke: the same eye with the lid down. A
             * closed eye drawn any other way stops being the same eye.
             */
            const EYES = [
                { off: -0.164, r: 0.173, width: 0.101 },
                { off: 0.250, r: 0.107, width: 0.062 }
            ];

            const faceOn = (part, shut) => {
                const size = cellSize - SEG_INSET * 2;
                const turn = Math.atan2(-s.dir.x, s.dir.y) * 180 / Math.PI;

                const pair = EYES.map(eye => {
                    const x = eye.off * size;
                    const r = eye.r * size;
                    const width = eye.width * size;

                    return shut
                        ? `<path d="M${x - r} 0H${x + r}" stroke="#ffffff"
                            stroke-width="${width}" stroke-linecap="round" fill="none" />`
                        : `<circle cx="${x}" cy="0" r="${r}" fill="#0f2b3c"
                            stroke="#ffffff" stroke-width="${width}" />`;
                }).join('');

                return `<g transform="translate(${(part.x + 0.5) * cellSize} ${(part.y + 0.5) * cellSize})
                    rotate(${turn})">${pair}</g>`;
            };

            s.snakeBody.forEach((part, idx) => {
                const partColor = colourAt(idx);
                const radius = idx === 0 ? 6 : 4;

                if (s.isFrozen && idx === s.losingHeartIdx) {
                    const centerX = (part.x + 0.5) * cellSize;
                    const centerY = (part.y + 0.5) * cellSize;
                    const heartChar = s.blinkVisible ? '\u2764\ufe0f' : '\ud83d\udda4';

                    // Drawn as a group because the glyph has to sit on its own
                    // square, not because it is any bigger than its neighbours —
                    // it used to be scaled half again, which made the loss look
                    // like an event happening to the board rather than to one
                    // link of the snake.
                    out += `<g transform="translate(${centerX} ${centerY})">
                        <rect x="${-cellSize / 2 + 1}" y="${-cellSize / 2 + 1}"
                            width="${cellSize - 2}" height="${cellSize - 2}" rx="${radius}" fill="${partColor}" />
                        <text x="0" y="0" font-family="${LETTER_FONT}" font-size="15.6" font-weight="bold"
                            text-anchor="middle" dominant-baseline="central">${heartChar}</text>
                    </g>`;
                    return;
                }

                out += `<rect x="${part.x * cellSize + SEG_INSET}" y="${part.y * cellSize + SEG_INSET}"
                    width="${cellSize - SEG_INSET * 2}" height="${cellSize - SEG_INSET * 2}"
                    rx="${radius}" fill="${partColor}" />`;

                // Only while there is a head to put them on: during the run
                // down the body the head has gone out, and a face on a link
                // that is only borrowing the colour would be a second snake.
                if (idx === 0 && headRun === null) out += faceOn(part, eyesShut);

                if (!part.char) return;

                out += glyph(part.char, (part.x + 0.5) * cellSize, (part.y + 0.5) * cellSize, 14.4, '#ffffff', 'bold');
            });

            // The spark sits on the edge the head ran into: half a cell along the heading,
            // which is exactly the border between the head and whatever it hit. Drawn with
            // strokes rather than a glyph — an emoji star arrives in its own colours and
            // cannot be made red.
            if (s.crashPhase === 1) {
                const head = s.snakeBody[0];
                const cx = (head.x + 0.5 + s.dir.x * 0.5) * cellSize;
                const cy = (head.y + 0.5 + s.dir.y * 0.5) * cellSize;
                const reach = cellSize * 0.3;

                let spark = '';
                for (let i = 0; i < 4; i++) {
                    const angle = (Math.PI / 4) * i;
                    const len = i % 2 === 0 ? reach : reach * 0.55; // long cross, short diagonals
                    const dx = Math.cos(angle) * len;
                    const dy = Math.sin(angle) * len;
                    spark += `M${cx - dx} ${cy - dy}L${cx + dx} ${cy + dy}`;
                }

                out += `<path d="${spark}" stroke="#ff1744" stroke-width="3" stroke-linecap="round" fill="none" />`;
            }

            scene.innerHTML = out;
        };
    }

    /**
     * Pacing. Owns every timer the game creates, so cleanup() is guaranteed to
     * leave nothing running — including the crash-animation delays, which used
     * to be bare setTimeouts that survived leaving the screen.
     *
     * "Halted" means paused (waiting for the first key) or blocked by the board
     * (frozen during a crash); the board supplies that check at attach time.
     */
    function clock() {
        const FAST_SPEED = 100;

        let difficulty = SPEED_AT_START;
        let isAccelerating = false;
        let paused = true;
        let tickTimer = null;
        let accelTimer = null;
        let delayed = [];

        let onTick = () => { };
        let blocked = () => false;

        function halted() {
            return paused || blocked();
        }

        function tick() {
            if (halted()) return;
            onTick();
            if (tickTimer !== null && !halted()) clock.schedule();
        }

        clock.attach = (opts) => {
            onTick = opts.onTick;
            blocked = opts.blocked;
            isAccelerating = false;
            paused = true;
            tickTimer = null;
            accelTimer = null;
            delayed = [];
        };

        clock.isPaused = () => paused;

        clock.pause = () => {
            paused = true;
            if (tickTimer) clearTimeout(tickTimer);
        };

        clock.resume = () => {
            paused = false;
        };

        clock.schedule = () => {
            if (tickTimer) clearTimeout(tickTimer);
            tickTimer = null;
            if (halted()) return;

            // Easy has no free-running clock — every step comes from a press. Holding a
            // button down still accelerates, in every difficulty.
            const delay = isAccelerating ? FAST_SPEED : STEP_MS[difficulty];
            if (!delay) return;

            tickTimer = setTimeout(tick, delay);
        };

        clock.forceStep = () => {
            if (halted()) return;
            if (tickTimer) clearTimeout(tickTimer);
            onTick();
            if (!halted()) clock.schedule();
        };

        clock.setAcceleration = (accel) => {
            if (isAccelerating === accel) return;
            isAccelerating = accel;
            // Rescheduled even with no timer running: in easy mode a held button is the
            // only thing that ever starts the clock.
            if (!halted()) clock.schedule();
        };

        clock.setDifficulty = (level) => {
            difficulty = level;
            if (!halted()) clock.schedule();
        };

        // Holding a direction speeds the snake up after a short delay
        clock.startAccelTimeout = () => {
            if (accelTimer) clearTimeout(accelTimer);
            accelTimer = setTimeout(() => clock.setAcceleration(true), 300);
        };

        clock.cancelAccel = () => {
            if (accelTimer) clearTimeout(accelTimer);
        };

        // Tracked setTimeout — cleared by stop(), unlike a bare one
        clock.after = (ms, fn) => {
            const id = setTimeout(() => {
                delayed = delayed.filter(x => x !== id);
                fn();
            }, ms);
            delayed.push(id);
        };

        clock.stop = (keepDelayed) => {
            // Paused as well, so nothing can schedule the clock back to life afterwards
            paused = true;
            if (tickTimer) clearTimeout(tickTimer);
            if (accelTimer) clearTimeout(accelTimer);

            // The waits are what sayProgress is holding the rest of the word in,
            // so the end of a session keeps them: the board has stopped, but the
            // word it just finished has not been said yet. Leaving the screen
            // drops them as it always did — see cleanup.
            if (keepDelayed) return;

            delayed.forEach(clearTimeout);
            delayed = [];
        };
    }

    /**
     * The rules and the field. No DOM, no storage, no timers — the only part
     * of the game that can be reasoned about (and tested) on its own.
     *
     * step() reports what happened and lets the session decide what it means:
     *   'moved' | 'letter' | 'wordDone' | 'heart' | 'crashHeart' | 'crashRestart'
     */
    function board() {
        let snakeBody = [];
        let dir = { x: 0, y: -1 };
        let inputQueue = [];
        let nextLetterIndex = 0;
        let lettersOnBoard = [];
        let phase = 'WORD';
        let heartPos = null;
        let isFrozen = false;
        let blinkVisible = true;
        let losingHeartIdx = -1;
        let inputCooldown = false;
        let crashPhase = 0;
        let newTail = null;

        // The word as a list of letters, segmented and cased once. Every rule
        // that counts letters counts these; the word itself the board has no
        // further use for.
        let targetLetters = [];

        const clone = (v) => JSON.parse(JSON.stringify(v));
        const randomCell = () => ({
            x: Math.floor(Math.random() * GRID_COUNT),
            y: Math.floor(Math.random() * GRID_COUNT)
        });

        function placeSnake() {
            const rx = Math.floor(Math.random() * (GRID_COUNT - 4)) + 2;
            const ry = Math.floor(Math.random() * (GRID_COUNT - 4)) + 2;
            snakeBody = [{ x: rx, y: ry, char: '' }];
        }

        /*
         * Moves the pointer off a blank and onto the next letter that is
         * actually on the board.
         *
         * The two halves of one rule: spawnLetters places nothing for a blank,
         * so nothing on the board can ever match one, and the pointer has to
         * walk over it by itself. Without this a phrase stops dead at its first
         * space, waiting to be handed a letter that was never put out.
         */
        function skipBlanks() {
            while (nextLetterIndex < targetLetters.length && BLANK.test(targetLetters[nextLetterIndex])) {
                nextLetterIndex++;
            }
        }

        function spawnLetters() {
            lettersOnBoard = [];

            targetLetters.forEach((char, idx) => {
                if (BLANK.test(char)) return;

                let pos;
                let attempts = 0;
                while (attempts < 500) {
                    attempts++;
                    pos = randomCell();
                    const onSnake = snakeBody.some(s => s.x === pos.x && s.y === pos.y);
                    const onOtherLetter = lettersOnBoard.some(l => l.x === pos.x && l.y === pos.y);
                    if (!onSnake && !onOtherLetter) break;
                }
                lettersOnBoard.push({
                    char: char,
                    index: idx,
                    x: pos.x,
                    y: pos.y,
                    isEaten: false
                });
            });
        }

        function spawnHeart() {
            let attempts = 0;
            while (attempts < 500) {
                attempts++;
                const pos = randomCell();
                if (!snakeBody.some(s => s.x === pos.x && s.y === pos.y)) {
                    heartPos = pos;
                    break;
                }
            }
        }

        // Every segment follows the one in front of it, head lands on (x, y)
        function advance(x, y) {
            for (let i = snakeBody.length - 1; i > 0; i--) {
                snakeBody[i].x = snakeBody[i - 1].x;
                snakeBody[i].y = snakeBody[i - 1].y;
            }
            snakeBody[0].x = x;
            snakeBody[0].y = y;
        }

        // Same move, but the old tail cell stays behind as a new segment
        function grow(x, y, char) {
            const oldTailPos = { x: snakeBody[snakeBody.length - 1].x, y: snakeBody[snakeBody.length - 1].y };
            advance(x, y);
            snakeBody.push({ x: oldTailPos.x, y: oldTailPos.y, char });
        }

        function hits(x, y) {
            return snakeBody.some(s => s.x === x && s.y === y);
        }

        // Rolls the move back and freezes; a collected heart pays for the mistake
        function crash(prev) {
            const heartIdx = prev.findIndex(s => s.char === '❤️');
            snakeBody = prev;

            crashPhase = 1;
            isFrozen = true;

            if (heartIdx !== -1) {
                snakeBody[heartIdx].char = '🖤';
                losingHeartIdx = heartIdx;
                blinkVisible = true;
                return 'crashHeart';
            }

            losingHeartIdx = -1;
            return 'crashRestart';
        }

        board.load = (saved, word) => {
            targetLetters = lettersOf(word).map(shownAs);

            if (saved.savedSnake && saved.savedSnake.length > 0) {
                snakeBody = clone(saved.savedSnake);
                dir = clone(saved.savedDir || { x: 0, y: -1 });
                inputQueue = clone(saved.savedInputQueue || []);
                nextLetterIndex = saved.savedNextLetterIndex !== undefined ? saved.savedNextLetterIndex : 0;
                lettersOnBoard = clone(saved.savedLettersOnBoard || []);
                phase = saved.savedPhase || 'WORD';
                heartPos = saved.savedHeartPos ? clone(saved.savedHeartPos) : null;
                isFrozen = saved.savedIsFrozen || false;
                blinkVisible = saved.savedBlinkVisible !== undefined ? saved.savedBlinkVisible : true;
                losingHeartIdx = saved.savedLosingHeartIdx !== undefined ? saved.savedLosingHeartIdx : -1;
                inputCooldown = false;
                crashPhase = saved.savedCrashPhase || 0;
                newTail = saved.savedNewTail ? clone(saved.savedNewTail) : null;
                return false;
            }

            placeSnake();
            dir = { x: 0, y: -1 };
            inputQueue = [];
            nextLetterIndex = 0;
            skipBlanks();
            lettersOnBoard = [];
            phase = 'WORD';
            heartPos = null;
            isFrozen = false;
            blinkVisible = true;
            losingHeartIdx = -1;
            inputCooldown = false;
            crashPhase = 0;
            newTail = null;
            return true; // fresh round — the caller spawns the letters
        };

        // Writes the round into the game state, which is what gets persisted
        board.persistTo = (saved) => {
            saved.savedSnake = clone(snakeBody);
            saved.savedDir = clone(dir);
            saved.savedInputQueue = clone(inputQueue);
            saved.savedNextLetterIndex = nextLetterIndex;
            saved.savedLettersOnBoard = clone(lettersOnBoard);
            saved.savedPhase = phase;
            saved.savedHeartPos = heartPos ? clone(heartPos) : null;
            saved.savedIsFrozen = isFrozen;
            saved.savedLosingHeartIdx = losingHeartIdx;
            saved.savedBlinkVisible = blinkVisible;
            saved.crashPhase = crashPhase;
            saved.savedCrashPhase = crashPhase;
            saved.c_new_tail = newTail;
            saved.savedNewTail = newTail ? clone(newTail) : null;
        };

        board.snapshot = () => ({
            snakeBody, lettersOnBoard, phase, heartPos,
            isFrozen, losingHeartIdx, blinkVisible, crashPhase, dir
        });

        board.phase = () => phase;
        board.isFrozen = () => isFrozen;
        board.crashPhase = () => crashPhase;
        board.progress = () => nextLetterIndex;
        board.spawnLetters = spawnLetters;

        board.acceptsInput = () => !inputCooldown && !(isFrozen && crashPhase === 1);
        board.releaseInput = () => { inputCooldown = false; };

        // Frozen frames blink the lost heart between red and black
        board.blink = () => {
            if (isFrozen) blinkVisible = !blinkVisible;
        };

        board.letters = () => targetLetters;

        board.setWord = (word) => {
            targetLetters = lettersOf(word).map(shownAs);
            nextLetterIndex = 0;
            skipBlanks();
            phase = 'WORD';
            heartPos = null;
            spawnLetters();
        };

        board.beginHeartPhase = () => {
            phase = 'HEART';
            lettersOnBoard = [];
            spawnHeart();
        };

        board.restartRound = () => {
            placeSnake();
            dir = { x: 0, y: -1 };
            inputQueue = [];
            nextLetterIndex = 0;
            skipBlanks();
            phase = 'WORD';
            heartPos = null;
            isFrozen = false;
            losingHeartIdx = -1;
            inputCooldown = false;
            crashPhase = 0;
            newTail = null;
            spawnLetters();
        };

        // Second stage of a crash: the snake turns around, head where the tail was
        board.headToTail = () => {
            if (!isFrozen || crashPhase !== 1) return false;

            crashPhase = 2;

            const newCoords = [];
            for (let i = snakeBody.length - 1; i >= 0; i--) {
                newCoords.push({ x: snakeBody[i].x, y: snakeBody[i].y });
            }
            for (let i = 0; i < snakeBody.length; i++) {
                snakeBody[i].x = newCoords[i].x;
                snakeBody[i].y = newCoords[i].y;
            }

            inputCooldown = true;
            return true;
        };

        // false — the press is refused; otherwise says whether it thawed the board
        board.tryUnfreeze = (reqDirX, reqDirY) => {
            if (!isFrozen) return 'notFrozen';

            if (crashPhase === 1) return false;

            if (crashPhase === 2) {
                if (reqDirX === undefined || reqDirY === undefined) return false;

                // Turning straight back into its own neck is not a way out
                if (snakeBody.length > 1) {
                    const neck = snakeBody[1];
                    if (snakeBody[0].x + reqDirX === neck.x && snakeBody[0].y + reqDirY === neck.y) {
                        return false;
                    }
                }

                dir = { x: reqDirX, y: reqDirY };
                inputQueue = [];
                crashPhase = 0;
            }

            isFrozen = false;
            losingHeartIdx = -1;
            blinkVisible = true;
            return 'unfroze';
        };

        // What a new direction is measured against: the last queued turn, or the current heading
        board.refDir = () => ({ ...(inputQueue.length > 0 ? inputQueue[inputQueue.length - 1] : dir) });

        board.enqueueDir = (dx, dy) => {
            const refDir = board.refDir();
            if (snakeBody.length > 1 || inputQueue.length > 0) {
                if (refDir.x === -dx && refDir.y === -dy) {
                    return false;
                }
            }
            inputQueue.push({ x: dx, y: dy });
            return true;
        };

        board.step = () => {
            if (inputQueue.length > 0) {
                dir = inputQueue.shift();
            }

            const headX = (snakeBody[0].x + dir.x + GRID_COUNT) % GRID_COUNT;
            const headY = (snakeBody[0].y + dir.y + GRID_COUNT) % GRID_COUNT;
            const prev = snakeBody.map(s => ({ ...s }));

            if (phase === 'HEART') {
                if (hits(headX, headY)) return crash(prev);

                if (heartPos && headX === heartPos.x && headY === heartPos.y) {
                    grow(headX, headY, '❤️');
                    return 'heart';
                }

                advance(headX, headY);
                return 'moved';
            }

            if (hits(headX, headY)) return crash(prev);

            const touched = lettersOnBoard.find(l => !l.isEaten && l.x === headX && l.y === headY);

            if (touched) {
                if (touched.char !== targetLetters[nextLetterIndex]) return crash(prev);

                touched.isEaten = true;
                nextLetterIndex++;
                skipBlanks();
                grow(headX, headY, touched.char);

                return nextLetterIndex === targetLetters.length ? 'wordDone' : 'letter';
            }

            advance(headX, headY);
            return 'moved';
        };
    }

    /**
     * Keyboard input. Produces direction intents and nothing else — it does not
     * know whether the game is frozen, paused or finished.
     */
    function input() {
        const DIRECTIONS = {
            ArrowUp: { x: 0, y: -1 }, KeyW: { x: 0, y: -1 },
            ArrowDown: { x: 0, y: 1 }, KeyS: { x: 0, y: 1 },
            ArrowLeft: { x: -1, y: 0 }, KeyA: { x: -1, y: 0 },
            ArrowRight: { x: 1, y: 0 }, KeyD: { x: 1, y: 0 }
        };
        const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

        let keyDown = null;
        let keyUp = null;

        input.attach = (opts) => {
            input.detach();

            keyDown = (e) => {
                const reqDir = DIRECTIONS[e.code];
                if (!reqDir) return;
                // Arrows would scroll the popup otherwise
                if (ARROWS.includes(e.code)) e.preventDefault();
                opts.onDirection(reqDir, !e.repeat);
            };

            keyUp = (e) => {
                if (DIRECTIONS[e.code]) opts.onRelease();
            };

            window.addEventListener('keydown', keyDown);
            window.addEventListener('keyup', keyUp);
        };

        input.detach = () => {
            if (keyDown) window.removeEventListener('keydown', keyDown);
            if (keyUp) window.removeEventListener('keyup', keyUp);
            keyDown = null;
            keyUp = null;
        };
    }

    function getEmptyState() {
        return {
            selectedSetId: 'all', currentIndex: 0, sessionResults: [], sessionPool: null, allowEarly: false,
            hadErrorThisRound: false, showHint: false, controlMode: 0, difficulty: SPEED_AT_START, savedSnake: null,
            savedDir: null, savedInputQueue: null, savedNextLetterIndex: 0, savedLettersOnBoard: null,
            savedPhase: 'WORD', savedHeartPos: null, savedIsFrozen: false, savedLosingHeartIdx: -1,
            savedBlinkVisible: true, crashPhase: 0, c_new_tail: null, savedCrashPhase: 0, savedNewTail: null
        };
    }


    // Leaving the screen: anything mid-sentence goes with the screen it
    // belonged to, and so do the waits holding the rest of what it was saying.
    // Winning is not leaving — showVictory stops the same machinery by hand,
    // without the silence.
    function cleanup() {
        clock.stop();
        forgetTaps();
        dropMark();

        // The narration goes with the screen — see `narration`. hush() below
        // cancels the voice it may be waiting on, and a cancelled voice reports
        // back the same way a finished one does.
        narration += 1;

        speech.hush();
        input.detach();
    }

    /*
     * Reads the board out loud as it is collected: every letter as it is eaten,
     * the word it finishes when a space or the end arrives, and the whole line
     * once the last letter is in.
     *
     * Three levels because the target can be three things. A single word is
     * said once, at the end — the word boundary and the end of the line are the
     * same moment, and saying it twice would be a stutter. A phrase says each
     * word as it lands and then the whole of it, which is the only way to hear
     * what the parts add up to.
     *
     * A word of one letter is not spelled out before it is said. The letter and
     * the word are the same sound, and hearing it twice in a row does not teach
     * anything it did not teach the first time.
     *
     * Blanks and punctuation are not announced: neither has a sound of its own,
     * and "space" and "question mark" are not what a reader hears when they read
     * across one. A mark inside the word it was written in is another matter —
     * see worthSaying.
     *
     * One thing at a time, each starting a breath after the one before it has
     * stopped. The waits used to run from the moment a letter started instead,
     * and 420ms is less than a letter takes to say — so the word did not follow
     * the letter, it landed on top of it and cut it off. Waiting on the voice
     * rather than on a guess is also the only way to keep the gap the same on a
     * device that reads slowly.
     *
     * The waits go through clock.after, which the clock clears when the screen
     * is left. A bare setTimeout would keep its word and say it into whatever
     * page the player opened next.
     */
    // The language the board is being read in. Kept here because sayProgress
    // works off the board alone: the board knows its letters, not whose word
    // they spell. Set wherever the target word is.
    let sayLang = null;

    /*
     * A word asked for by hand, rather than said by the board as the snake eats.
     *
     * Only these are answered by the sound switch when nothing comes out: the
     * board narrates every letter it swallows, and a silent session would have
     * the header twitching from one end of the word to the other.
     */
    function sayAloud(text, whenDone) {
        if (speech.say(text, sayLang, whenDone)) return true;

        if (speech.muted()) page.pulseMute();
        return false;
    }

    /*
     * The words of the line, in order, as ranges of letters, each with the place
     * that decides its fill.
     *
     * Asked of speech.words rather than read off the blanks. Where a word ends
     * is a question about the language and the player has already answered it —
     * the Split words setting — and answering it again here, with "wherever
     * there is a space", is no answer at all in a script that does not use them.
     * A Japanese line came out as one word: one colour across the whole of it,
     * and a double tap anywhere in it reading the lot.
     *
     * In letters rather than in characters, because everything else here counts
     * the way a reader does: й is two code units and न्न is three, and the board
     * spawns one glyph for each of them.
     *
     * What falls between the words — the spaces, the commas, the question mark —
     * belongs to no range and so takes no colour, which is what a card does with
     * the same marks. They are still out there to be eaten; they are simply not
     * a word.
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
     * Tapping the finished line, counted rather than read off the event's own
     * click count — phones do not agree about that one, and a second tap is a
     * zoom gesture to some of them.
     *
     * Counted per word and not per box: a fingertip is wider than a letter, so
     * the second tap of a double tap lands on the letter next door as often as
     * not, and in a script without spaces that is most of the time.
     *
     * Snake's own copy, like the ones in cards and in the quiz. The three screens
     * ask the same question of a tap and answer it over different things — three
     * faces of a card, an option, a row of boxes half of which are still "?" —
     * and one version shared between them is how one of them stops being able to
     * change.
     */
    const TAP_GAP = 500;

    /*
     * The voice waits to see what the finger meant; a quarter of a second is the
     * gap between the two taps of a double tap. Without it a letter starts being
     * said the instant it is touched and is cut off by its word a moment later,
     * and every double tap comes out as a stutter.
     */
    const SAY_DELAY = 250;

    let taps = 0;
    let tappedWord = -1;
    let tapTimer = null;
    let sayTimer = null;

    /*
     * Which mark is up, counted rather than named.
     *
     * The voice that finishes has to take its own mark down and nobody else's:
     * by the time it stops, a later tap may have put a different one up, and
     * that tap's own voice is what will clear it.
     */
    let marks = 0;

    /*
     * Never sooner than a short spell after the mark went up. There are two ways
     * to be told the sound is over at once rather than in a second — no voice
     * for the language, or the sound switched off — and either would put the
     * colour on the bar and take it off again in one blink.
     */
    const MARK_LEAST = 450;

    function light(paint) {
        paint();
        marks += 1;
        return marks;
    }

    function until(mark) {
        const born = Date.now();

        return () => {
            if (mark !== marks) return;

            const left = MARK_LEAST - (Date.now() - born);
            if (left <= 0) return view.unlight();

            setTimeout(() => { if (mark === marks) view.unlight(); }, left);
        };
    }

    function forgetTaps() {
        clearTimeout(tapTimer);

        // A word still waiting its quarter second belongs to the line that was
        // tapped. Leave the screen fast enough and it would be said into
        // whatever page was opened next.
        clearTimeout(sayTimer);

        taps = 0;
        tappedWord = -1;
    }

    /*
     * The mark comes down now rather than when the voice reports back.
     *
     * A separate thing from forgetting the gesture, and deliberately not part of
     * it: the gesture is over half a second after the last tap, while the mark
     * belongs to the voice and stays up as long as it is talking — which on a
     * long line is several seconds. Tying the two together took the colour off
     * mid-sentence, every time.
     *
     * The count moving is what tells any wait still out there that the mark it
     * was holding is not the one that is up.
     */
    function dropMark() {
        marks += 1;
        view.unlight();
    }

    // Said and marked at once, for a tap that cannot be deepened by another.
    function sayNow(text, paint) {
        clearTimeout(sayTimer);

        const done = until(light(paint));
        if (!sayAloud(text, done)) done();
    }

    /*
     * The mark lands with the finger; the voice waits to see what the finger
     * meant.
     *
     * Only the voice waits. A tap answered by nothing at all for a quarter of a
     * second is a tap that missed, as far as the person tapping can tell — and
     * the mark goes up before it is known whether this device even has a voice
     * for the language.
     */
    function sayLater(text, paint) {
        clearTimeout(sayTimer);

        const mark = light(paint);

        sayTimer = setTimeout(() => {
            const done = until(mark);
            if (!sayAloud(text, done)) done();
        }, SAY_DELAY);
    }

    // The one word a letter stands in, carrying the place it holds in the line:
    // that is what its fill is chosen by, so a word looks the same said alone as
    // it does said inside the line. Nothing, for a letter that is between words.
    const wordAt = (letters, at) => lineWords(letters).find(w => at >= w.from && at <= w.to);

    /*
     * The breath between one thing the board says and the next, counted from
     * where the last one stopped.
     *
     * Short enough to hear the two as one thought — the letter and the word it
     * finished — and long enough that they are two sounds rather than a slur.
     */
    const NARRATION_GAP = 350;

    /*
     * Which screen the narration belongs to, and which letter of it.
     *
     * A chain of waits outlives the moment it was started in, and there are
     * three ways for it to become wrong. The player eats the next letter, and
     * what the board was still saying about the last one is out of date. The
     * player catches the heart, and the line being read is no longer the line on
     * the bar. Or the player leaves, and hush() cancels the voice — which
     * reports back exactly the way finishing does, so the chain wakes up on a
     * screen that is gone and says its word into whatever page was opened next.
     *
     * All three are the same question — is this still the narration that is
     * running — and a number answers it without any caller knowing about the
     * others.
     */
    let narration = 0;

    /*
     * `whenDone` is called once the last of the queue has stopped, and not at all
     * if a later narration takes over — the caller is being told that this one
     * finished, which a narration that was interrupted did not.
     */
    function sayInTurn(queue, whenDone) {
        const mine = narration;

        const next = () => {
            if (mine !== narration) return;

            const said = queue.shift();
            if (!said) return whenDone && whenDone();

            // Marked before it is spoken and for as long as it is spoken, which
            // is what a tap does — see sayLater. The bar is the only place the
            // board can point at, and a letter said with nothing lit is a sound
            // with no source.
            const done = until(light(said.paint));

            const after = () => {
                done();
                clock.after(NARRATION_GAP, next);
            };

            // Nothing was heard — no voice for this, or the sound is off — so
            // there is nothing to wait behind and the rest follows at once. The
            // mark still stands its minimum: see MARK_LEAST.
            if (!speech.say(said.text, sayLang, after)) after();
        };

        next();
    }

    function sayProgress(whenDone) {
        // Whatever the board was still saying about the letter before this one
        // has been overtaken by events.
        narration += 1;

        const letters = board.letters();
        const done = board.progress();

        // What was just eaten is the last letter before the pointer that is not
        // a blank. The pointer steps over the blanks itself — nothing is spawned
        // for them — so at a word boundary it stands a place further on than the
        // letter that was actually swallowed.
        let index = done - 1;
        while (index >= 0 && BLANK.test(letters[index])) index--;

        if (index < 0) return;

        const atEnd = done === letters.length;
        const phrase = letters.join('');

        // Where the words of this line end — see lineWords, and the Split words
        // setting behind it. A word closes when its last letter is the one that
        // has just been swallowed.
        const words = lineWords(letters);
        const isPhrase = words.length > 1;

        const spoken = words.find(w => index >= w.from && index <= w.to);
        const closed = !!spoken && index === spoken.to;
        const word = spoken ? letters.slice(spoken.from, spoken.to + 1).join('').toLowerCase() : '';

        // The word is this one letter, so the letter is the word and saying both
        // would be saying it twice.
        const alone = closed && spoken.from === index;

        const queue = [];

        // A letter is said as the board shows it — upper case is how a letter is
        // named. A word is said in the case it was written in: a run of capitals
        // is read out letter by letter by some engines, which is the right sound
        // for one letter and the wrong one for seven.
        //
        // Each carries what to light while it is being said, and they are the
        // same three marks a tap puts up: the letter written in coral, the word
        // filled behind its letters, the line filled a colour to a word.
        if (!alone && worthSaying(letters[index])) {
            queue.push({ text: letters[index], paint: () => view.sayLetter(index) });
        }

        if (closed && isPhrase && worthSaying(word)) {
            queue.push({ text: word, paint: () => view.sayWords([spoken]) });
        }

        if (atEnd && worthSaying(phrase)) {
            queue.push({ text: phrase.toLowerCase(), paint: () => view.sayWords(words) });
        }

        sayInTurn(queue, whenDone);
    }

    function render() {
        cleanup();

        container.innerHTML = '';

        if (!state.sessionPool) {
            const pool = store.duePool(state.selectedSetId, state.allowEarly, POOL_LIMIT);

            state.sessionPool = pool;
            state.sessionResults = new Array(pool.length).fill(null);
            state.currentIndex = 0;
        }

        let pool = state.sessionPool;

        if (pool.length === 0 || state.currentIndex >= pool.length) {
            state.sessionPool = null;
            state.savedSnake = null;
            state.allowEarly = false;
            store.save();
            page.finish();
            return;
        }

        let currentItem = pool[state.currentIndex];
        let targetWord = currentItem.word.original.toLowerCase();
        sayLang = currentItem.word.originalLang;

        view.mount({
            translation: currentItem.word.translation,
            controlMode: state.controlMode,
            difficulty: state.difficulty,

            onBack: () => {
                state.savedIsFrozen = state.savedIsFrozen || false;
                cleanup();
                page.home();
            },

            /*
             * A click on one box of the bar.
             *
             * Still hidden — the box reads "?" — and it is the old "show me the
             * answer", which costs the round. That is the one thing a tap can
             * cost, and it is the only thing that opens a box.
             *
             * Open, and the tap goes as deep as it is repeated: the letter, then
             * the word it belongs to, then the whole line. The same three depths
             * a card gives, on the same three taps, and they do not wait for the
             * line to be finished — a bar half full of "?" answers the same way
             * as a full one, because the question a tap asks is about the thing
             * under the finger and not about how the round is going.
             *
             * A word with letters still out there is said all the same, and
             * nothing about it opens: what is hidden is hidden in the boxes, not
             * in the sound. The speaker at the head of the bar has read the whole
             * line aloud, for nothing, since the first frame — see view.gathered
             * — so there is no secret left for a word of it to give away.
             *
             * Each tap acts at once rather than waiting to see whether another
             * is coming; only the voice waits, in sayLater. A tap answered late
             * reads as a tap that missed.
             */
            onLetterClick: (index) => {
                const letters = board.letters();
                const isShown = (at) => state.showHint || at < board.progress();

                if (!isShown(index)) {
                    forgetTaps();
                    revealHint();
                    return;
                }

                // A blank or a mark says nothing on its own — see worthSaying
                if (!worthSaying(letters[index])) return;

                // The word this letter stands in — see lineWords. A letter
                // that is in none of them is a mark between words, and there is
                // nothing to say about it that worthSaying has not said already.
                const spoken = wordAt(letters, index);
                if (!spoken) return;

                const from = spoken.from;
                const to = spoken.to;

                // A letter is said as the board shows it, upper case, which is
                // how a letter is named; a word in the case it was written in,
                // because a run of capitals is read out letter by letter by some
                // engines. The same two rules sayProgress reads the board by.
                const letter = letters[index];
                const word = letters.slice(from, to + 1).join('').toLowerCase();

                if (from !== tappedWord) {
                    taps = 0;
                    tappedWord = from;
                }

                taps = Math.min(3, taps + 1);

                clearTimeout(tapTimer);
                tapTimer = setTimeout(forgetTaps, TAP_GAP);

                if (taps === 1) return sayLater(letter, () => view.sayLetter(index));
                if (taps === 2) return sayLater(word, () => view.sayWords([spoken]));

                // Every word in a colour of its own, so the line reads as the
                // words it is made of rather than as one long stripe.
                sayLater(letters.join('').toLowerCase(), () => view.sayWords(lineWords(letters)));
            },

            /*
             * The speaker says the line whatever has been tapped, and ends the
             * gesture: a letter still waiting its quarter second would otherwise
             * be said over the top of it.
             *
             * Nothing here touches showHint or hadErrorThisRound. Listening is
             * free — see the speaker in view.gathered — and the marks it paints
             * are over boxes that go on reading "?" until they are found.
             */
            onSayAll: () => {
                forgetTaps();

                const letters = board.letters();
                sayNow(letters.join('').toLowerCase(), () => view.sayWords(lineWords(letters)));
            },

            onBoardClick: () => {
                clock.pause();
                board.persistTo(state);
            },

            onControlMode: () => {
                state.controlMode = (state.controlMode + 1) % CONTROL_MODES.length;
                view.setControlMode(state.controlMode);
                page.save();
            },

            onDifficulty: () => {
                state.difficulty = (state.difficulty + 1) % DIFFICULTIES.length;
                view.setDifficulty(state.difficulty);
                clock.setDifficulty(state.difficulty);
                page.save();
            },

            onDirection: (dx, dy) => handleInput({ x: dx, y: dy }, true),

            onDirectionRelease: () => {
                clock.cancelAccel();
                clock.setAcceleration(false);
            },

            onGoDictionary: () => {
                state.sessionPool = null;
                state.savedSnake = null;
                page.home();
            }
        });

        function refreshDots() {
            view.dots(pool, state.sessionResults, state.currentIndex);
        }

        function refreshGathered() {
            // The boxes that were tapped are gone with the redraw, and a tap on
            // one of them counts towards nothing on the boxes that replace them.
            // The mark goes with them: the nodes it was painted on are about to
            // stop existing, and whatever was said over them is over too.
            forgetTaps();
            dropMark();
            view.gathered(board.letters(), board.progress(), state.showHint);
        }

        /*
         * How much of the word the player had before they asked to be shown
         * the rest of it, as a share of the whole.
         *
         * Counted in letters and not in boxes: the spaces are boxes on the bar
         * and are neither remembered nor forgotten -- nothing is spawned for
         * them and nothing is gone for. A word of two letters and a space is
         * out of two.
         *
         * Two decimals, and truncated rather than rounded. Two is already more
         * precision than a share of a dozen letters can carry, and truncating
         * is what keeps a word that was opened from ever recording a 1 --
         * which is the one number that means it was not.
         */
        function recalledShare() {
            const letters = board.letters();
            const held = letters.slice(0, board.progress());

            const total = letters.filter(ch => !BLANK.test(ch)).length;
            const known = held.filter(ch => !BLANK.test(ch)).length;

            return total ? Math.floor(known / total * 100) / 100 : 0;
        }

        // Showing the answer, which is only ever asked for by clicking a letter
        // that is still hidden
        function revealHint() {
            if (state.showHint) return;

            state.showHint = true;
            state.hadErrorThisRound = true;

            /*
             * The repetition is written here, and not when the word is
             * finally spelled out.
             *
             * This is the moment the round is decided: everything after it is
             * the player copying letters off a bar that already shows them.
             * Written at the end instead, the verdict lived only in the dot —
             * open the word, walk out of the game, and dict showed a word
             * nothing had ever happened to. The dot said one thing and the
             * shelf said another, and the shelf is the one that is still
             * there tomorrow.
             *
             * The share is measured before the bar is redrawn below: a moment
             * later it shows the whole word, and by the end of the round every
             * box of it is filled in either way.
             *
             * wordDone writes nothing for a round that came through here —
             * see `clean` there. One round is one repetition.
             */
            store.recordRepetition(currentItem, recalledShare(), 'snake');
            store.save();

            refreshGathered();

            // The round is lost the moment the answer is shown, so the dot says
            // so now rather than when the word is finally spelled out. wordDone
            // writes the same 'wrong' again from hadErrorThisRound; this only
            // moves the telling earlier, not the verdict.
            //
            // Saved straight away because the verdict now exists: without this,
            // closing the popup between the reveal and the end of the round
            // would lose it and the word would come back marked clean.
            state.sessionResults[state.currentIndex] = 'wrong';
            refreshDots();
            page.save();
        }

        function paint() {
            view.draw(board.snapshot());
        }

        refreshDots();

        if (board.load(state, targetWord)) board.spawnLetters();

        clock.attach({ onTick: onTick, blocked: () => board.isFrozen() });
        clock.setDifficulty(state.difficulty);
        input.attach({
            onDirection: (reqDir, isNewPress) => handleInput(reqDir, isNewPress),
            onRelease: () => {
                clock.cancelAccel();
                clock.setAcceleration(false);
            }
        });

        // Thaws the board and starts the clock on the first press of a round
        function unfreezeAndResume(reqDirX, reqDirY) {
            const result = board.tryUnfreeze(reqDirX, reqDirY);
            if (result === false) return false;

            if (result === 'unfroze') {
                board.persistTo(state);
                paint();
            }

            if (clock.isPaused()) {
                clock.resume();
                view.banner(currentItem.word.translation);
                clock.schedule();
                board.persistTo(state);
            }
            return true;
        }

        function stepNow() {
            clock.setAcceleration(false);
            clock.startAccelTimeout();
            clock.forceStep();
        }

        function handleInput(reqDir, isNewPress) {
            if (!reqDir) return;
            if (!board.acceptsInput()) return;

            const wasFrozenOrPaused = (board.isFrozen() || clock.isPaused());
            const wasPhase2 = (board.isFrozen() && board.crashPhase() === 2);

            if (wasFrozenOrPaused) {
                if (unfreezeAndResume(reqDir.x, reqDir.y)) {
                    if (wasPhase2) {
                        stepNow();
                    } else if (board.enqueueDir(reqDir.x, reqDir.y)) {
                        stepNow();
                    } else if (clock.isPaused()) {
                        clock.schedule();
                    }
                }
                return;
            }

            if (isNewPress && board.enqueueDir(reqDir.x, reqDir.y)) {
                stepNow();
            }
        }

        /*
         * The crash, told as a picture: the head goes out, and a flash of its
         * colour runs down the body to the tail.
         *
         * What actually happens to a crashed snake is that it is turned round —
         * headToTail swaps the coordinates end for end, and every link changes
         * colour where it stands. Done in one frame that is a jump: the same
         * cells, suddenly a different snake, and the player has to work out what
         * they are looking at. Run link by link it is a single readable event —
         * the head leaves the wall it hit, travels the length of its own body,
         * and stops at the far end, which is where the head now is.
         *
         * Nothing moves. Every cell is exactly where it was, and only the colours
         * change — see colourAt. The whole turn is a re-colouring, and this is
         * what makes that legible instead of surprising.
         *
         * Fast on purpose. This is a beat between the crash and playing again,
         * not a cutscene: a long snake has more links to light and so takes
         * longer, which is right — there is more of it to turn round.
         *
         * Driven by clock.after rather than by the game's own ticks, which is the
         * only way it works at every speed: on the slowest there is no
         * free-running clock at all and the board is repainted only when the
         * player presses something.
         */
        const HEAD_RUN_MS = 45;

        function runHeadToTail(whenDone) {
            const total = board.snapshot().snakeBody.length;

            // A snake of one link is all head. There is nothing for the flash to
            // run along and nothing that turning it round would change.
            if (total < 2) return clock.after(HEAD_RUN_MS * 4, whenDone);

            let at = 1;

            const step = () => {
                view.headRun(at);
                paint();

                at += 1;
                if (at < total) return clock.after(HEAD_RUN_MS, step);

                // Cleared without painting: the frame that follows is the one
                // headToTail draws, and it is the same picture this leaves —
                // so there is nothing to see in between, and nothing to flicker.
                view.headRun(null);
                whenDone();
            };

            clock.after(HEAD_RUN_MS, step);
        }

        /*
         * The heart the crash cost, blinking red and black where it lies in the
         * body, until the player sets off again.
         *
         * On a timer rather than on the game's ticks, for the same reason as the
         * run above: at the slowest speed the board has no ticks to blink on, and
         * this is exactly the moment the game is standing still waiting for a
         * press. It stops by asking the board whether it is still frozen, which
         * is the same question as "has the player moved yet".
         *
         * Numbered, because that question can be answered wrongly. A snake that
         * has just been turned round is often pointing straight back into its own
         * body, so the press that ends one crash can begin the next inside the
         * same tick — and the old blink, whose next beat had not come yet, would
         * wake to find the board frozen again and carry on beside the new one,
         * two loops blinking one heart at twice the rate. Starting a blink puts
         * the one before it out of date.
         */
        const HEART_BLINK_MS = 380;

        let heartBlink = 0;

        function blinkLostHeart() {
            const mine = ++heartBlink;

            const flip = () => {
                if (mine !== heartBlink || !board.isFrozen()) return;

                board.blink();
                paint();

                clock.after(HEART_BLINK_MS, flip);
            };

            clock.after(HEART_BLINK_MS, flip);
        }

        /*
         * The blink. It runs for as long as the screen does — standing still,
         * moving, crashed, waiting to be set off again.
         *
         * On its own timer rather than on the tick, and that is what makes
         * "always" possible at all: the board is repainted by the tick while
         * the snake is running and by nothing whatever while it waits, and on
         * the slowest speed there is no tick to begin with. clock.after covers
         * all three, and it is tracked, so leaving the screen takes the blink
         * with it.
         *
         * The gap is uneven on purpose. Blinking on a metronome is the one way
         * to make something look less alive than not blinking at all.
         *
         * Numbered like the heart's blink below, and for the same reason: the
         * loop outlives the state it was started in, and a second one started
         * over the top of it would shut and open the same eyes twice over.
         */
        const BLINK_SHUT_MS = 130;
        const BLINK_GAP_MS = 2400;

        let idleBlink = 0;

        function blinkEyes() {
            const mine = ++idleBlink;
            const gap = () => BLINK_GAP_MS + Math.random() * 2000;

            const open = () => {
                if (mine !== idleBlink) return;

                view.eyesShut(false);
                paint();

                clock.after(gap(), shut);
            };

            const shut = () => {
                if (mine !== idleBlink) return;

                view.eyesShut(true);
                paint();

                clock.after(BLINK_SHUT_MS, open);
            };

            clock.after(gap(), shut);
        }

        // Restarts the round after the crash animation has played out
        function afterCrash(event) {
            if (event === 'crashHeart') {
                if (!board.headToTail()) return;
                paint();
                board.persistTo(state);
                clock.after(500, () => board.releaseInput());
                blinkLostHeart();
                return;
            }

            clock.pause();
            clock.cancelAccel();
            board.restartRound();
            view.banner(currentItem.word.translation);
            refreshGathered();
            board.persistTo(state);
            paint();
        }

        function moveToNextWord() {
            /*
             * Whatever the board was still reading goes with the word that is
             * leaving.
             *
             * The line is read out as the last letter lands, and the heart is
             * one move away: catch it quickly and the reading is still going
             * when the next word arrives. It did not stop — it could not know
             * the bar had been rebuilt under it — so the old line went on being
             * said over the new one, marking the new boxes letter by letter and
             * word by word as it went.
             *
             * Both halves of it stop here: the number retires the chain of waits
             * behind it, hush() the sound already in the air.
             */
            narration += 1;
            speech.hush();

            currentItem = pool[state.currentIndex];
            targetWord = currentItem.word.original.toLowerCase();
            sayLang = currentItem.word.originalLang;
            state.hadErrorThisRound = false;
            state.showHint = false;
            board.setWord(targetWord);
            view.banner(currentItem.word.translation);
            refreshGathered();
            board.persistTo(state);
            page.save();
        }

        /*
         * The end of a session, in two halves, because they want different
         * moments.
         *
         * The board stops the instant the last letter lands — a snake that went
         * on walking while the line was being read out would walk into a wall
         * and lose a round that had already been won.
         *
         * Stopped by hand rather than through cleanup(), which silences the
         * screen it is leaving. Nothing is being left here — the panel appears
         * on the same page, and the last word of the session is still being read
         * out at that moment: sayProgress says the letter as it lands and holds
         * the word and the line behind a wait. cleanup() cancelled the one and
         * cleared the other, so the last word of every session was the one word
         * that went by in silence.
         *
         * The session is closed here too rather than with the panel: leaving the
         * page during the wait has to leave a finished session behind, not one
         * the "Continue" banner will offer to resume onto a board with nothing
         * left on it.
         */
        function stopPlaying() {
            clock.stop(true);
            input.detach();

            clock.setAcceleration(false);
            paint();
            page.endSession();
        }

        /*
         * And the panel waits for the line to be read out.
         *
         * It is drawn over the bar — the banner is a fixed 104px and there is no
         * room for both — so putting it up while the line is still being narrated
         * takes away the very thing the narration is pointing at, marks and all.
         * The wait is however long the voice takes, which on a phrase is a couple
         * of seconds and on a silent device is almost none.
         */
        function showVictory() {
            view.victory();
        }

        // One tick of the game: the board says what happened, the session
        // decides what it means for the player's progress.
        function onTick() {
            if (board.isFrozen() || clock.isPaused()) {
                // The lost heart blinks on its own timer — see blinkLostHeart —
                // so a tick arriving in the middle of it only repaints.
                paint();
                board.persistTo(state);
                return;
            }

            const wasHeartPhase = board.phase() === 'HEART';
            const event = board.step();

            if (event === 'crashHeart') {
                board.persistTo(state);
                paint();
                runHeadToTail(() => afterCrash(event));
                return;
            }

            // Nothing to turn round: the round starts over, so the crash is a
            // beat long enough to see the spark and no more.
            if (event === 'crashRestart') {
                board.persistTo(state);
                paint();
                clock.after(500, () => afterCrash(event));
                return;
            }

            if (wasHeartPhase) {
                if (event === 'heart') {
                    state.currentIndex++;
                    state.savedSnake = null;
                    refreshDots();
                    store.save();

                    if (state.currentIndex >= pool.length) {
                        showVictory();
                    } else {
                        moveToNextWord();
                    }
                } else {
                    board.persistTo(state);
                }
                paint();
                return;
            }

            if (event === 'letter') {
                // Redrawn first, and then narrated. A redraw throws the boxes
                // away, and a mark goes with the box it was painted on — so a
                // narration that marked before this ran was marking nodes that
                // were about to be replaced.
                refreshGathered();
                sayProgress();
                board.persistTo(state);
                paint();
                page.save();
                return;
            }

            if (event === 'wordDone') {
                // Redrawn before it is narrated — same reason as above.
                refreshGathered();

                const lastOfSession = state.currentIndex >= pool.length - 1;

                if (!lastOfSession) sayProgress();

                board.persistTo(state);

                /*
                 * A whole word, spelled out without ever asking to see it.
                 *
                 * The other kind of round wrote its repetition the moment the
                 * player asked -- see revealHint, which also explains why the
                 * result there is a fraction and not a 0. Both are one
                 * repetition each; this is the half of that rule that lives
                 * here.
                 */
                const clean = !state.hadErrorThisRound;

                if (clean) store.recordRepetition(currentItem, 1, 'snake');

                state.sessionResults[state.currentIndex] = clean ? 'correct' : 'wrong';
                store.save();

                /*
                 * And the dot says so now, with the last letter, rather than
                 * when the heart is caught.
                 *
                 * The heart is the fee for the next word, not part of
                 * answering this one -- the word was spelled out a move ago
                 * and the repetition is already in the log. The dots were
                 * redrawn only where the index moves, which is at the heart,
                 * so a word could be finished and still look unanswered for
                 * as long as it took to go and get one.
                 */
                refreshDots();

                // The last word of the session ends it; otherwise the player has
                // to catch a heart before the next word appears.
                if (lastOfSession) {
                    state.currentIndex++;
                    state.savedSnake = null;
                    refreshDots();

                    // The board stops now and the panel comes when the line has
                    // been read out — see stopPlaying.
                    stopPlaying();
                    sayProgress(showVictory);
                    return;
                }

                // The banner keeps the translation through the heart round.
                // It used to be replaced by a single big heart, which said
                // nothing the board was not already saying — there is a heart on
                // it to be caught — and took away the one thing worth reading at
                // that moment: the word just spelled out, next to what it means.
                board.beginHeartPhase();
                board.persistTo(state);
                paint();
                page.save();
                return;
            }

            board.persistTo(state);
            paint();
            page.save();
        }

        refreshGathered();

        /*
         * Drawn before the voices were known, which means the speaker at the
         * head of the bar was drawn on trust — an empty voice list reads as "yes"
         * rather than as "no", because a speaker missing from the first word of
         * a session is worse than one that promises a little too much.
         *
         * One redraw when the list lands settles it, and a redraw of the bar
         * rather than of the screen: a screen is a board with a snake somewhere
         * on it, and this is a row of boxes.
         *
         * It began to matter when the speaker stopped waiting for the line to be
         * finished. While it only appeared at the end of a round the list had
         * long since arrived, and the guess was never the one on screen.
         */
        speech.onVoices(refreshGathered);

        view.banner(currentItem.word.translation);
        paint();
        board.persistTo(state);

        // Started once, here, and it runs until the screen goes.
        blinkEyes();
    }

    snake.render = render;

    snake.setTheme = (isDark) => {
        const t = tokens.of(isDark);

        view.setTheme({
            backBtn: t.muted,
            dotIdle: t.border,
            ring: t.accent,
            // Marks where you are right now — the dot you are on, and in quiz
            // the option under the keyboard cursor. Its own token rather than
            // the accent, because `ring` also paints the buttons, and "you are
            // here" should not shout in the same colour as "press this".
            cursor: t.progress,
            onRing: t.onAccent,
            ok: t.ok,
            err: t.err,
            // Darker than `soft` in the light theme, where soft is a hair off the
            // page ground and the banner all but vanishes into it. The dark
            // theme keeps soft, which already stands clear of its ground.
            hintBg: isDark ? t.soft : t.border,
            hintBorder: '1px solid ' + t.border,
            // Ink rather than mint: this is the word to read, and mint on the
            // light theme's white panel is 2.1:1.
            hintText: t.ink,
            boardBg: isDark ? t.ground : t.surface,
            boardBorder: t.border,
            boardShadow: '0',
            /*
             * The d-pad and the header chips stand straight on the page, with no
             * card under them, so they have to be the thing that lifts.
             *
             * On the dark theme `soft` does that — it is the ground raised a
             * step. On the light theme it cannot: every light neutral is within
             * a tenth of every other, so a soft-filled button on the page was
             * 1.06 against it, which is a button you find by knowing where it is.
             * White gives it the 1.32 a card gets, and the border does the rest.
             */
            dpadBg: isDark ? t.soft : t.surface,
            dpadBorder: t.border,
            dpadColor: t.ink,
            // The speaker at the end of a finished line is an offer rather
            // than the thing to press, so it sits in muted like the ones in
            // cards and quiz.
            sayIcon: t.muted,

            /*
             * A letter being read out loud.
             *
             * Coral, which is what this app paints the thing being acted on: the
             * snake's head, the button under the finger. It is the one colour
             * left that means something here and is not already spoken for —
             * mint is a letter collected, muted is a letter still out there, and
             * a mark in either would be answering a question nobody asked.
             */
            saying: t.accent,

            letterPending: t.muted,
            /*
             * A collected letter turns mint — the colour progress and a right
             * answer are painted in everywhere else in the app, and collecting a
             * letter is exactly that.
             *
             * The deep mint on the light theme, and it is the same statement in
             * a readable voice. Mint is mid-light by design: on the dark banner
             * it is 5.8 against its ground, on the light one 1.4, which is a
             * letter you have to go looking for. progressFill exists for exactly
             * this and is the same hue.
             */
            letterCollected: isDark ? t.progress : t.progressFill,
            letterHinted: t.muted,
            grid: t.soft,
            // The letters keep the mint that progress and a right answer are
            // painted in — the deep one on the light theme, where the board is
            // white and the light mint comes to 2.1 against it. The head takes
            // the coral of the button you press: the thing you steer told apart
            // from the thing you steer at, and far enough from the body's blues
            // and violets to stay legible against every segment behind it.
            boardLetter: isDark ? t.progress : t.progressFill,
            head: t.accent,
            /*
             * The body, along its length.
             *
             * It used to cross a hundred degrees of hue at high saturation —
             * cyan to violet — and what that bought was a snake so loud it
             * competed with the letters it was there to collect. The point of
             * the ramp is to say which end is which and to keep a coiled snake
             * readable where it lies alongside itself; a rainbow is more than
             * that costs.
             *
             * Thirty degrees now, teal drifting to blue, and the work is done by
             * lightness instead: the body goes from light at the neck to dark at
             * the tail on the dark theme, the other way on the light one, so on
             * either the far end is the end that fades into its ground. Two
             * neighbours still differ in two ways at once, which is what makes a
             * coil legible; they simply no longer differ in kind.
             *
             * A segment carrying a letter is deeper and more saturated than a
             * plain one, and that gap is kept — it is the one place the body has
             * anything to say, and the white letter on it needs the contrast.
             */
            bodyHueStart: isDark ? 186 : 200,
            bodyHueEnd: isDark ? 214 : 228,
            bodySatChar: isDark ? 66 : 72,
            bodySatPlain: isDark ? 40 : 46,
            bodyLightChar: isDark ? 50 : 45,
            bodyLightPlain: isDark ? 38 : 60
        });
    };

    // The third argument is the previous session, handed over even on a fresh
    // start so a game can carry its own settings across. Progress never rides along.
    snake.start = (setId, allowEarly, previous) => {
        state.selectedSetId = setId;
        state.allowEarly = allowEarly;

        // The two header toggles are settings, not progress: a new session keeps them
        if (previous) {
            if (previous.controlMode !== undefined) state.controlMode = previous.controlMode;
            if (previous.difficulty !== undefined) state.difficulty = previous.difficulty;
        }
    };

    snake.getState = () => ({
        selectedSetId: state.selectedSetId,
        currentIndex: state.currentIndex,
        sessionResults: state.sessionResults,
        sessionPool: state.sessionPool,
        allowEarly: state.allowEarly,
        controlMode: state.controlMode,
        difficulty: state.difficulty,
        hadErrorThisRound: state.hadErrorThisRound,
        showHint: state.showHint,
        savedSnake: state.savedSnake,
        savedDir: state.savedDir,
        savedInputQueue: state.savedInputQueue,
        savedNextLetterIndex: state.savedNextLetterIndex,
        savedLettersOnBoard: state.savedLettersOnBoard,
        savedPhase: state.savedPhase,
        savedHeartPos: state.savedHeartPos,
        savedIsFrozen: state.savedIsFrozen,
        savedLosingHeartIdx: state.savedLosingHeartIdx,
        savedBlinkVisible: state.savedBlinkVisible,
        savedCrashPhase: state.crashPhase,
        savedNewTail: state.c_new_tail
    });

    snake.setState = (snap) => {
        if (!snap) return;
        state = { ...getEmptyState(), ...snap };
    };

    // Sub-modules are initialized once, like the top-level ones
    view(container);
    clock();
    board();
    input();
}

bootGame('snake', snake);
