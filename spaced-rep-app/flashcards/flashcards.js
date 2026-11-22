/**
 * The "Flashcards" game: a set seen as a shelf of boxes, one box to a stage --
 * the Leitner box system, which is what the ladder in srs.js always was. Owns
 * its state, its palette and its drawing. Talks to the outside only through
 * store, and through page for navigation.
 *
 * Asked for by the owner on 20 November 2026, after two pictures of a craft
 * cabinet of card boxes: the boxes are not a second model of the set but the
 * same stages drawn as places, so nothing here decides where a card goes --
 * srs.js does, from the answers, and the card flies to wherever it says.
 */
function flashcards(container) {
    let state = getEmptyState();
    let palette = {};

    /*
     * `sessionPool` is the run: the cards taken out of the box the player
     * chose, one after another. Null on the shelf. The name and `sessionAt`
     * are what page.save reads for the analytics (see noteRun there).
     *
     * `currentIndex` is how many of them have been answered, so the first not
     * yet answered; `view` the card on the table, which is that one or, gone
     * back to with the arrows on the card, one answered before it; `answers`
     * what each was answered, by its place in the run, with the moment the
     * answer was written -- what store.forgetRepetition needs to take it back
     * if the player answers it the other way.
     */
    function getEmptyState() {
        return { selectedSetId: null, currentIndex: 0, view: 0, answers: [], isFlipped: false, sessionPool: null, sessionAt: null, allowEarly: false };
    }

    const MINUTE = 60 * 1000;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;

    // Animations are skipped, not slowed, for somebody who has asked for less
    // motion: every one of them here is decoration on a change of state.
    const MOTION = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = (ms) => (MOTION ? ms : 1);

    // Keyboard: ← don't know, → know, ↑ ↓ or space turns the card over
    const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];

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

    /*
     * How big the word is, and how small it is allowed to get.
     *
     * A card holds one word and shows it to a person who may be holding the
     * phone at arm's length, so the word should be the thing in the room rather
     * than something sitting politely in the middle of a card with space all
     * round it.
     *
     * Not every word fits even here, and the card is not allowed to grow: an
     * index card is the size it is whatever is written on it. So the size is
     * where the fitting starts rather than where it ends.
     *
     * The floor is where the word stops being readable at arm's length. A line
     * that cannot fit even there is a line that was never going to fit — it
     * overflows, and overflowing is a better answer than a size nobody can read.
     */
    const WORD_SIZE = 30;
    const WORD_MIN = 12.8;

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
     * the same height of ink on the line: 0.7 over two thirds.
     *
     * And it has to hang a little lower. An inline-flex box rests its bottom
     * edge on the baseline, so the empty sixth below the drawing would hold the
     * speaker up off the line; dropped by that sixth, its foot stands where the
     * foot of a capital stands.
     *
     * The gap is the same fraction of the icon that a quiz option leaves beside
     * its own: ten pixels against eighteen.
     */
    const SAY_INK = 2 / 3;
    const CAP_HEIGHT = 0.7;

    const round3 = (n) => Math.round(n * 1000) / 1000;

    const SAY_SCALE = round3(CAP_HEIGHT / SAY_INK);
    const SAY_DROP = round3((1 - SAY_INK) / 2);

    const SAY_LEAD = `margin-top: 0; margin-right: 0.55em; font-size: ${SAY_SCALE}em; vertical-align: -${SAY_DROP}em;`;

    /*
     * Shrinks the line until it fits the face it is on.
     *
     * By the rendered height rather than by counting letters: what fits is
     * decided by the font, the script and where the browser puts the line
     * breaks, and only the browser knows all three.
     *
     * A pixel at a time, downwards, because the answer is usually one or two
     * steps away and a search would cost more reflows than the walk does.
     *
     * The room is the whole of the face, less its padding -- and the padding
     * at the top is where the card's coloured band is, so the band is kept
     * clear without a measurement of its own.
     */
    function fitWord(face) {
        const text = face && face.querySelector('.flashcards-word-text');
        if (!text) return;

        const box = getComputedStyle(face);

        const room = face.clientHeight
            - parseFloat(box.paddingTop) - parseFloat(box.paddingBottom);

        let size = WORD_SIZE;
        text.style.fontSize = size + 'px';

        while (text.offsetHeight > room && size > WORD_MIN) {
            size -= 1;
            text.style.fontSize = size + 'px';
        }
    }

    // A word off a card goes straight into markup, and a word is whatever
    // somebody typed into the box.
    function escapeText(text) {
        return String(text)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /*
     * The speaker before the word says it, in its face's language. It is all
     * of the card that speaks now: a press anywhere else on the card turns it
     * over (the owner's call, 20 November 2026), where until then the letter,
     * the word and the line under a finger were said, one deeper at each tap.
     * The speaker's is the one sound the switch in the header leaves alone --
     * see speech.say.
     */
    function sayFrom(speaker, text, lang) {
        if (text) speech.say(text, lang, () => {}, speaker);
    }

    /*
     * ---- The shelf ----
     *
     * One box per stage, numbered by the stage, as the settings panel numbers
     * the rungs of the ladder -- except stages 0 and 1, which share box 1 (the
     * owner's call, 20 November 2026). Both are the cards that wait for
     * nothing: what nothing has happened to yet, and what an error has taken
     * back to the floor. A box each made two boxes the player had to open one
     * after the other to do the same thing in, and a box 0 nobody counts from.
     * So the boxes are 1 to 14 and box N is stage N everywhere else.
     *
     * All fourteen, three to a shelf -- the second picture the owner gave --
     * with the fifteenth place holding the desk lamp (see the night below).
     * For most of 20 November the shelf began with five boxes, two to a
     * shelf, and grew when a card needed the sixth; the owner took that out
     * the same evening.
     */
    const LAST = 14;

    const boxOf = (stage) => Math.max(1, stage || 0);

    /*
     * Every length a box is drawn with. The width is not here: it is what the
     * shelf leaves once the gaps are taken out -- see layoutOf.
     *
     *   padX, gap, rowGap   the wall showing round the boxes: wider than the
     *                       first drawing, at the owner's word, with the boxes
     *                       a little smaller for it
     *   rimTop, frontTop    the top of the back wall, and of the front: the
     *                       box is seen a little from above, so what lies
     *                       between them is the opening, with the cards in it
     *   inset               how much narrower the back wall looks than the
     *                       front -- the side walls running away from the eye
     *   layers, raise       how many cards at most stand in view, and how much
     *                       higher a card ready to be repeated stands
     *   plate*, foot*       the label holder, and the line of figures under it
     *   aim                 where the night's desk lamp points from the free
     *                       place, in radians: at the middle of the cabinet,
     *                       where the card is laid
     */
    const SHELF = {
        name: 'all', cols: 3, count: LAST, padX: 14, gap: 13, rowGap: 10, plank: 8, boxH: 76,
        rimTop: 3, frontTop: 32, inset: 9, round: 2.5, layers: 4, band: 3.4, raise: 3.6,
        plateTop: 5, plateH: 17, platePad: 6, plateFont: 9.2, ear: 2.6, aim: -1.95,
        footBottom: 5.5, footFont: 8.4, footIcon: 8.4, footGap: 3.5,
        badgeFont: 9.6, badgeIcon: 11
    };

    // The cabinet's own frame and the wall's edge, which the boxes stand inside
    const FRAME_PAD = 8;
    const FRAME_EDGE = 1.2;
    const WALL_EDGE = 1;

    const stageOf = (word) => spacedRepetitions.getWordStats(word).stage || 0;

    /*
     * The shelf in force, with the width of a box worked out from the room
     * the page gives: written down, the width would be one more number to
     * keep in step with the page's padding.
     */
    function layoutOf() {
        const L = SHELF;
        const cs = getComputedStyle(container);
        const room = container.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const wall = room - 2 * (FRAME_PAD + FRAME_EDGE + WALL_EDGE);
        const w = Math.floor((wall - 2 * L.padX - (L.cols - 1) * L.gap) / L.cols * 10) / 10;

        return { ...L, w };
    }

    /*
     * The card out of its box: on the table being answered, or in the air
     * between two boxes. It is counted in neither -- a card in the hand is not
     * in a box -- so the box it came out of shows one fewer the moment it
     * leaves, and the box it goes to one more only when it lands.
     */
    let held = null;

    // Which box the run is being played out of, for the cheer when it is done
    let openNumber = null;

    // Whether the session was closed by finishing a run -- see openBox
    let closed = false;

    // A flight in the air; the shelf takes no presses until it lands
    let busy = false;

    // Bumped by every full redraw: a flight that lands on a screen drawn since
    // it took off has nothing left to land on
    let drawn = 0;

    // The arrows over the shelf are shown once a page, when it opens
    let introduced = false;

    let stageEl = null;
    let refreshTimer = null;

    const same = (a, b) => !!a && !!b && a.word.original === b.word.original;

    /*
     * What every box holds: how many cards and of which stages, how many of
     * them ready, and when the first of the rest will be. By box number, 1 to
     * 14; the slot at 0 is empty.
     *
     * Ready is the store's own rule -- store.duePool -- so a set with the
     * spaced repetition system switched off has every card ready, as it has in
     * every other game.
     */
    function shelfCounts() {
        const setId = state.selectedSetId;
        const due = new Set(store.duePool(setId, false).map(i => i.word.original));
        const boxes = Array.from({ length: LAST + 1 }, () => ({ total: 0, ready: 0, soonest: null, painted: false, strung: false }));

        // The lowest and the highest stage in the set, the card on the table
        // among them: it is taken out of its box, not out of the game, and a
        // box would lose its string the moment its last laggard was lifted
        let low = Infinity;
        let high = -Infinity;

        store.wordsOf(setId).forEach(item => {
            const progress = spacedRepetitions.getWordProgress(item.word);
            const stage = progress.stage || 0;
            low = Math.min(low, stage);
            high = Math.max(high, stage);

            if (same(item, held)) return;

            const box = boxes[boxOf(progress.stage)];

            box.total += 1;

            if (due.has(item.word.original)) box.ready += 1;
            else if (progress.nextRepetition && (!box.soonest || progress.nextRepetition < box.soonest)) box.soonest = progress.nextRepetition;
        });

        /*
         * The shelf as a picture of how far the set has come (the owner, 22
         * November 2026): a box takes its stage's colour once a card has got
         * as far as its stage -- one card at stage 5 or above paints box 5 --
         * and its string of lights once every card has; by the end of the
         * game, every box painted and strung. Box 1 by the same count: painted
         * at the first answer, strung once every word has been answered at
         * least once. By where the cards are now, as everything on the shelf
         * is: a card got wrong goes back three boxes, and may take a string
         * down with it.
         */
        boxes.forEach((box, n) => {
            box.painted = n >= 1 && high >= n;
            box.strung = n >= 1 && low >= n;
        });

        return boxes;
    }

    /*
     * The interval on a box, in the notation the settings panel writes it in
     * and the bubbles wear: "45m", "2h", "14d" -- in the largest unit that
     * divides it exactly, so a rung someone typed as 90m reads back as 90m.
     * Box 1 waits as stage 1 does, which is for nothing unless somebody has
     * changed it: what is in it is asked again now.
     */
    function spanText(box) {
        const ms = spacedRepetitions.intervals()[box];
        if (!ms) return 'now';
        if (ms % DAY === 0) return `${ms / DAY}d`;
        if (ms % HOUR === 0) return `${ms / HOUR}h`;
        return `${Math.round(ms / MINUTE)}m`;
    }

    // How long until a moment, as the bubbles' badges say it
    function timerText(at) {
        const mins = Math.max(1, Math.ceil((at - Date.now()) / MINUTE));
        if (mins < 60) return `${mins}m`;

        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;

        return `${Math.floor(hours / 24)}d`;
    }

    const CLOCK = (size, colour) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${colour}" stroke-width="2.6" stroke-linecap="round" aria-hidden="true" style="display: block; flex: none;"><circle cx="12" cy="12" r="8.6" /><path d="M12 7.4V12l3 2" /></svg>`;

    /*
     * The colour of a card: the band across its top, in the colour the
     * bubbles wear on its stage -- softened, mixed a quarter of the way towards
     * the kraft and taken down a little, because the owner's pictures are in
     * the soft colours of a painted storybook, and the ramp's pastels are lit
     * from behind beside them. Softened, they still climb the same way.
     *
     * The two stages of box 1 are told apart: a grey blue for a card nothing
     * has happened to -- the stone of the ramp, which on cream paper is no
     * colour at all -- and a soft salmon for one just got wrong, the red the
     * catalog draws that state in, as soft as the rest.
     */
    const KRAFT_MIX = [0xea, 0xdf, 0xc6];

    function soften(hex) {
        const n = parseInt(hex.slice(1), 16);
        const rgb = [n >> 16, (n >> 8) & 255, n & 255];
        return '#' + rgb.map((c, i) => Math.round((c * 0.74 + KRAFT_MIX[i] * 0.26) * 0.9).toString(16).padStart(2, '0')).join('');
    }

    function bandOf(stage) {
        if (stage === 0) return '#c3d1d8';
        if (stage === 1) return '#e8b29b';
        return soften(tokens.stages()[stage].fill);
    }

    // How many cards stand in view for so many in the box: a few more as the
    // box fills, never more than the box has room to show
    function layersFor(total, most) {
        const n = total <= 0 ? 0 : total === 1 ? 1 : total <= 3 ? 2 : total <= 7 ? 3 : total <= 14 ? 4 : 5;
        return Math.min(most, n);
    }

    /*
     * The boxes with a card ready in them hop now and then, one at a time and
     * at no fixed beat -- a double hop, the owner's call the same evening, of
     * the hop they give when the arrows reach them --
     * the owner's call, 20 November 2026, in place of the cards inside them
     * hopping as the catalog's bubbles do. Not until the arrows are done (or
     * waved away), not while a card is on the table, and not at all with the
     * set's Bounce switched off in its view menu, the same switch that stills
     * the bubbles. No sound: the arrows' pops are a greeting, and this would
     * be a noise that never stops.
     */
    // One hop for an arrow arriving; two in a row, the second a little lower,
    // for a box calling to be opened (the owner)
    function hopBox(box, twice) {
        if (!box) return;

        if (!twice) {
            box.animate([
                { transform: 'translateY(0) scale(1)' },
                { transform: 'translateY(-3px) scale(1.04, 0.97)', offset: 0.3 },
                { transform: 'translateY(0) scale(0.99, 1.02)', offset: 0.65 },
                { transform: 'translateY(0) scale(1)' }
            ], { duration: 380, easing: 'ease-out' });
            return;
        }

        box.animate([
            { transform: 'translateY(0) scale(1)' },
            { transform: 'translateY(-3px) scale(1.04, 0.97)', offset: 0.15 },
            { transform: 'translateY(0) scale(0.99, 1.02)', offset: 0.32 },
            { transform: 'translateY(0) scale(1)', offset: 0.46 },
            { transform: 'translateY(-2.4px) scale(1.03, 0.975)', offset: 0.6 },
            { transform: 'translateY(0) scale(0.995, 1.015)', offset: 0.78 },
            { transform: 'translateY(0) scale(1)' }
        ], { duration: 700, easing: 'ease-out' });
    }

    function bouncing() {
        const set = store.sets().find(s => s.id === state.selectedSetId);
        return MOTION && !!set && store.viewOf(set).bounce;
    }

    let idleTimer = null;

    function idleHops(token) {
        clearTimeout(idleTimer);

        idleTimer = setTimeout(() => {
            if (token !== drawn || !stageEl) return;

            if (!busy && !held && bouncing()) {
                const ready = Array.from(stageEl.querySelectorAll('.flashcards-box')).filter(box => /^\d+$/.test(box.dataset.press));
                if (ready.length) hopBox(ready[Math.floor(Math.random() * ready.length)], true);
            }

            idleHops(token);
        }, 900 + Math.random() * 1400);
    }

    /*
     * A box, drawn: an open cardboard box seen a little from above, as in the
     * pictures. The front is a plain rectangle; above it the opening, its back
     * wall narrower than the front as the side walls run away from the eye,
     * the cut edge of the card showing light all round the rim. In the
     * opening the cards stand on end one behind the other, as cards stand in
     * a file -- the back ones higher, so that each shows the coloured band
     * across its top -- and a card ready to be repeated stands a little
     * higher than the others.
     *
     * Everything is drawn round, as the pictures are -- once in the shelf's
     * dark ink, which made the boxes look drawn for children (the owner, 22
     * November 2026); now in a darker shade of the box's own card (boxLine,
     * see boxTone).
     *
     * And it has depth, which the first flat drawing of it lost (the owner,
     * the same day): the front darker towards its foot and at both ends, as a
     * box lit from above is; the inside darker the deeper it goes; the cards
     * at the back in the box's shadow, each with the shadow of the one in
     * front of it across it. The box cast its shadow on the wall and the
     * shelf too until the owner took it off, the same picture in hand (22
     * November 2026).
     *
     * A long box, going a good way back into the cabinet (the owner, 22
     * November 2026): its back edge higher above the front and narrower than
     * it was (rimTop, inset), and all of the opening -- the rim, the cards --
     * darker the further back it is, in the dark at the back of the cabinet
     * (`depthShade`).
     *
     * In SVG, sized to the box in pixels, so that the lines fall on the same
     * places at either size; the lettering stays HTML on top -- see boxInner.
     */
    /*
     * The cardboard of a box with cards in it, in its stage's colour (the
     * owner's picture, 22 November 2026), once a card has got as far as it
     * (see shelfCounts): the hue its cards wear (bandOf)
     * laid on the kraft at the kraft's own lightness -- painted cardboard,
     * its light and its shading where they were, only the colour changed.
     * The stages' own colours are pale pastels, and mixed into the kraft
     * they only bleached it: half and half, even three parts to one, the
     * boxes came out a washed khaki beside the picture's teal and coral.
     * Less of it inside, which is in the box's own shadow; at night less
     * colour all round, the room being dark. A box no card has reached
     * stays plain kraft.
     */
    function boxTone(n, info) {
        const p = palette;
        const tone = info.painted ? paintedTone(n, p) : p;

        /*
         * Every line on a box -- round its front and rim, its label and its
         * tag -- in a darker shade of the box's own cardboard, not the
         * shelf's dark ink (the owner, 22 November 2026, beside a picture of
         * the same shelf: with the near-black outline the boxes looked drawn
         * for children). So a box is told from the wall by its colour and its
         * shadow, as in the picture, and the line only firms up its edge.
         */
        return { ...tone, boxLine: mixHex(tone.kraftLow, p.line, isNight ? 0.5 : 0.55) };
    }

    /*
     * By day a quieter colour than first tried (0.36, the owner: too
     * bright), and quieter again beside the owner's picture of the shelf
     * (22 November 2026), whose teal box is a greyed sage (0.25 until then);
     * at night quieter still.
     */
    function paintedTone(n, p) {
        const { h } = toHsl(bandOf(n));
        const sat = isNight ? 0.16 : 0.2;
        const paint = (key, share) => mixHex(p[key], fromHsl(h, sat, toHsl(p[key]).l), share);

        return {
            ...p,
            kraft: paint('kraft', 0.85), kraftMid: paint('kraftMid', 0.85), kraftLow: paint('kraftLow', 0.85),
            kraftLight: paint('kraftLight', 0.8), rim: paint('rim', 0.8),
            inside: paint('inside', 0.5), insideLow: paint('insideLow', 0.45)
        };
    }

    // #rrggbb to hue (degrees), saturation and lightness (0..1), and back
    function toHsl(hex) {
        const v = parseInt(hex.slice(1), 16);
        const [r, g, b] = [v >> 16, (v >> 8) & 255, v & 255].map(c => c / 255);
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;
        const d = max - min;
        if (!d) return { h: 0, s: 0, l };

        const s = d / (1 - Math.abs(2 * l - 1));
        const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        return { h: (h * 60 + 360) % 360, s, l };
    }

    function fromHsl(h, s, l) {
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
        return '#' + [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
    }

    function boxSvg(n, info, L, garland) {
        const p = boxTone(n, info);
        const W = L.w;
        const H = L.boxH;
        const ft = L.frontTop;
        const rt = L.rimTop;
        const ins = L.inset;
        const r = (v) => Math.round(v * 100) / 100;

        const k = layersFor(info.total, L.layers);
        const up = info.ready ? Math.max(1, Math.round(k * info.ready / info.total)) : 0;

        let cards = '';

        // The inner face of a side wall, where it is at a height: the cards
        // stand between the two, so a card further back is a narrower card
        const wallTop = rt + 2.2;
        const wallAt = (y) => (ins + 1.6) + (2.4 - (ins + 1.6)) * Math.min(1, Math.max(0, (y - wallTop) / (ft - wallTop)));

        // Spread over the whole depth of the box, back to front, however many
        // there are, so that every card shows its own strip; a single card
        // stands a little way in from the back. Each sits a hair to one side
        // or the other, as cards put in by hand do.
        const JITTER = [0, 0.9, -0.7, 0.5, -1];

        for (let i = 0; i < k; i++) {
            const depth = k === 1 ? 0.3 : i / (k - 1);
            const stand = rt + 3 + depth * (ft - rt - 9);
            const y = stand - (i < up ? L.raise : 0);
            const left = wallAt(stand) + 1.1 + JITTER[i];
            const w = W - 2 * wallAt(stand) - 2.2;
            const h = ft + 3 - y;

            // Plain paper while it is in a box -- the box wears the stage's
            // colour now (22 November 2026, the owner: white, if not snow
            // white, and not coloured; for two days before that each card in
            // a box was in its stage's colour). An older paper than the card
            // on the table's, which by day shone out of the boxes too white
            // (the owner). Further back further into the box's shadow, and
            // at night all of it in the dark of the room
            const tint = mixHex(p.boxPaper, p.cardShade, (isNight ? 0.4 : 0) + (1 - depth) * 0.3);

            // The shadow this card throws on the one behind it
            const cast = i > 0 ? `<rect x="${r(left - 0.5)}" y="${r(y - 2.6)}" width="${r(w + 1)}" height="2.8" rx="1.4" fill="${p.cardCast}" />` : '';

            // Its edge a little darker than its own paper, not drawn round
            // in ink: the cast above it is what parts it from the next
            cards += cast
                + `<rect x="${r(left)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="1.6" fill="${tint}" stroke="${mixHex(tint, p.cardLine, 0.6)}" stroke-width="0.8" />`;
        }

        // The inside all one, the two side walls the colour of the back (the
        // owner, 22 November 2026: each was a shade of its own, the left
        // darker, the right lighter), and the corners where they meet it
        // drawn as dark lines, as in the owner's picture
        const id = `fc-${L.name}-${n}`;
        const front = `x="0.55" y="${ft}" width="${r(W - 1.1)}" height="${r(H - ft - 0.55)}" rx="${L.round}"`;

        /*
         * Its shadow hard and flat, as everything in the owner's picture is
         * (22 November 2026), and all one shade: on the back of the cabinet
         * its own outline moved to the right, as a lamp up to the left would
         * throw it, and under it a band it stands in, running a little way up
         * its left side at the bottom corner and out to the right as far as
         * the outline -- the box drawn over all but a strip down its right
         * side and along its foot. The two are one path, wound the same way,
         * so that where they overlap the shade is laid once and not twice;
         * the band was darker than the outline for an evening, and the owner
         * asked for the one line.
         *
         * Until that day a drop-shadow filter on the drawing and a soft patch
         * under its foot -- the filter the dearest thing on the shelf, worked
         * out again whenever the box was drawn -- and for an hour no shadow
         * at all.
         */
        const CAST = { x: 5.5, y: 1.5 };
        const cast = (x, y) => `${r(x + CAST.x)} ${r(y + CAST.y)}`;
        const band = { x0: -1.6, x1: W + CAST.x, y0: H - 6.5, y1: H + 3, round: 2.5 };
        const shadow = `M${cast(ins, rt)}L${cast(W - ins, rt)}L${cast(W, ft)}L${cast(W, H)}L${cast(0, H)}L${cast(0, ft)}Z`
            + `M${r(band.x0 + band.round)} ${r(band.y0)}H${r(band.x1 - band.round)}A${band.round} ${band.round} 0 0 1 ${r(band.x1)} ${r(band.y0 + band.round)}V${r(band.y1 - band.round)}A${band.round} ${band.round} 0 0 1 ${r(band.x1 - band.round)} ${r(band.y1)}H${r(band.x0 + band.round)}A${band.round} ${band.round} 0 0 1 ${r(band.x0)} ${r(band.y1 - band.round)}V${r(band.y0 + band.round)}A${band.round} ${band.round} 0 0 1 ${r(band.x0 + band.round)} ${r(band.y0)}Z`;

        return `<svg class="flashcards-box-art" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true" style="position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none;">
            <defs>
                <linearGradient id="${id}-k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.kraft}" /><stop offset="0.55" stop-color="${p.kraftMid}" /><stop offset="1" stop-color="${p.kraftLow}" /></linearGradient>
                <linearGradient id="${id}-e" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${p.edgeShade}" /><stop offset="0.14" stop-color="${p.edgeShade}" stop-opacity="0" /><stop offset="0.8" stop-color="${p.edgeShade}" stop-opacity="0" /><stop offset="1" stop-color="${p.edgeShade}" /></linearGradient>
                <linearGradient id="${id}-i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.inside}" /><stop offset="1" stop-color="${p.insideLow}" /></linearGradient>
                <linearGradient id="${id}-d" gradientUnits="userSpaceOnUse" x1="0" y1="${rt}" x2="0" y2="${ft}"><stop offset="0" stop-color="${p.depthShade}" /><stop offset="0.75" stop-color="${p.depthShade}" stop-opacity="0" /></linearGradient>
            </defs>
            <path d="${shadow}" fill="${p.wallCast}" />
            <polygon points="0.6,${ft} ${ins},${rt} ${r(W - ins)},${rt} ${r(W - 0.6)},${ft}" fill="${p.rim}" stroke="${p.boxLine}" stroke-width="1" stroke-linejoin="round" />
            <polygon points="2.4,${ft} ${r(ins + 1.6)},${rt + 2.2} ${r(W - ins - 1.6)},${rt + 2.2} ${r(W - 2.4)},${ft}" fill="url(#${id}-i)" />
            <path d="M${r(ins + 1.6)} ${rt + 2.2}V${ft}M${r(W - ins - 1.6)} ${rt + 2.2}V${ft}" stroke="${mixHex(p.insideLow, '#1a120c', 0.5)}" stroke-width="1" />
            <path d="M${r(ins + 1.8)} ${rt + 2.9}H${r(W - ins - 1.8)}" stroke="${p.rimShade}" stroke-width="1.4" />
            ${cards}
            <polygon points="0.6,${ft} ${ins},${rt} ${r(W - ins)},${rt} ${r(W - 0.6)},${ft}" fill="url(#${id}-d)" />
            <rect x="1" y="${ft - 1.6}" width="${r(W - 2)}" height="3" fill="${p.frontCast}" />
            <rect ${front} fill="url(#${id}-k)" stroke="${p.boxLine}" stroke-width="1" />
            <rect ${front} fill="url(#${id}-e)" />
            <path d="M2.6 ${ft + 1.7}H${r(W - 2.6)}" stroke="${p.kraftLight}" stroke-width="1.2" stroke-linecap="round" />
            ${garland ? garland.art : ''}
        </svg>`;
    }

    /*
     * The fairy lights on a box: a string of small bulbs on every box all the
     * set's cards have got as far as (see shelfCounts) -- the owner's call, 22
     * November 2026. From 20 November until then they hung on every box with
     * a card ready in it and on no other, in place of a string round the
     * whole cabinet and the neon stars between the boxes, so that the boxes
     * that wanted opening were the lit ones; that is the mustard tag's to say
     * now, and the hop's.
     *
     * Thrown over the box rather than strung along a line -- the owner, after
     * a picture of Christmas lights on these boxes: a loose string that goes
     * over the top and the opening, round a front corner, hangs down a side
     * into the gap, or lies in a loop along the foot; bulbs at uneven steps
     * and of uneven sizes. Which of four drapes, which way round, and every
     * bend of it a little off, is the box's number's to say -- a seeded
     * random -- so a box keeps its string from one look to the next. All of
     * them keep clear of the label and the figures in the middle of the front.
     *
     * At night the light is deep and warm, amber rather than yellow: a hot
     * white core in every bulb, a wide halo that lightens the cardboard round
     * it (screened over the box's drawing), a soft band of light along the
     * whole wire, the box itself warmed by it, and a few sparks in the air.
     * Bulbs and sparks twinkle each in its own time (see twinkle). By day the
     * string is off: glass the colour of the kraft and a thin wire, nothing
     * that asks to be looked at -- the mustard tag on the box says the same
     * thing by day.
     */
    const BULBS = ['#ffa63a', '#ffb44a', '#ff9d36', '#ffbe5a', '#ffaa44'];

    // A small random that gives the same numbers for the same seed
    function seeded(seed) {
        let x = (seed * 7919 + 104729) % 233280;
        return () => {
            x = (x * 9301 + 49297) % 233280;
            return x / 233280;
        };
    }

    // The four drapes, as the points the string passes through: over the top
    // and down a side past the front corner; across the top, round the other
    // front corner and in a loop along the foot; heaped at the foot with an
    // end thrown up over a back corner; down a side from across the top
    const DRAPES = [
        (W, H, ft, rt) => [[-5, rt + 1], [W * 0.18, rt - 7], [W * 0.5, rt + 9], [W * 0.8, rt - 2], [W + 3, ft + 3], [W + 5, ft + 22], [W + 1, H - 10]],
        (W, H, ft, rt) => [[W + 6, rt - 4], [W * 0.62, rt + 7], [W * 0.3, rt - 3], [2, ft + 3], [-4, ft + 18], [W * 0.18, H + 1], [W * 0.55, H - 3], [W * 0.85, H + 1.5], [W + 4, H - 8]],
        (W, H, ft, rt) => [[-5, H - 12], [W * 0.12, H + 1.5], [W * 0.34, H - 5], [W * 0.56, H + 1], [W * 0.8, H - 4], [W + 4, H - 14], [W + 6, ft + 6], [W - 6, rt - 5], [W * 0.62, rt + 3]],
        (W, H, ft, rt) => [[W * 0.85, rt - 6], [W * 0.55, rt + 6], [W * 0.25, rt - 2], [-3, ft + 1], [-6, ft + 20], [-2, H - 16], [-5, H - 4]]
    ];

    // A smooth curve through the points, as Catmull-Rom is: the path, and
    // the curve sampled finely, for the bulbs to be spaced along it
    function smooth(pts) {
        const f = (v) => Math.round(v * 10) / 10;
        const samples = [];
        let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;

        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i - 1] || pts[i];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = pts[i + 2] || p2;
            const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
            const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];

            d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;

            for (let k = 0; k < 12; k++) {
                const t = k / 12;
                const u = 1 - t;
                samples.push({
                    x: u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0],
                    y: u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1]
                });
            }
        }

        const last = pts[pts.length - 1];
        samples.push({ x: last[0], y: last[1] });

        return { d, samples };
    }

    function garlandSvg(n, L) {
        const p = palette;
        const f = (v) => Math.round(v * 10) / 10;
        const rnd = seeded(n * 31 + 3);
        const W = L.w;

        const drape = DRAPES[n % DRAPES.length];
        const mirror = rnd() < 0.5;
        const jitter = 1.8;

        const pts = drape(W, L.boxH, L.frontTop, L.rimTop).map(([x, y]) => [
            (mirror ? W - x : x) + (rnd() - 0.5) * 2 * jitter,
            y + (rnd() - 0.5) * 2 * jitter
        ]);

        const { d, samples } = smooth(pts);

        // Bulbs at uneven steps along the string
        const run = [0];
        for (let i = 1; i < samples.length; i++) run.push(run[i - 1] + Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y));

        const pointAt = (dist) => {
            let i = 1;
            while (i < run.length - 1 && run[i] < dist) i++;
            const k = (dist - run[i - 1]) / Math.max(0.001, run[i] - run[i - 1]);
            return { x: samples[i - 1].x + (samples[i].x - samples[i - 1].x) * k, y: samples[i - 1].y + (samples[i].y - samples[i - 1].y) * k };
        };

        const length = run[run.length - 1];
        const stops = [];
        for (let dist = 6 + rnd() * 10; dist < length - 3; dist += 22 + rnd() * 10) stops.push(dist);

        let bulbs = '';
        let sparks = '';

        const lights = [];

        stops.forEach((dist, k) => {
            const pt = pointAt(dist);
            lights.push(pt);
            const c = Math.floor(rnd() * BULBS.length);
            const big = 1 + rnd() * 0.55;
            const x = f(pt.x);
            const y = f(pt.y + 2.2 * big);
            const socket = `<rect x="${f(pt.x - 0.9)}" y="${f(pt.y)}" width="1.8" height="1.2" fill="${p.line}" opacity="${isNight ? 1 : 0.5}" />`;

            if (!isNight) {
                bulbs += `${socket}<ellipse cx="${x}" cy="${y}" rx="${f(1.3 * big)}" ry="${f(1.8 * big)}" fill="${mixHex(BULBS[c], p.kraft, 0.62)}" stroke="${p.line}" stroke-opacity="0.45" stroke-width="0.5" />`;
                return;
            }

            const halo = 11 * big * (0.85 + rnd() * 0.35);

            // Its own group, the socket left out, for switching on (see lightUp)
            bulbs += `${socket}<g class="flashcards-bulb"><circle class="flashcards-bulb-bloom" cx="${x}" cy="${y}" r="${f(halo * 2.6)}" fill="url(#fc-bloom)" /><circle class="flashcards-bulb-glow" cx="${x}" cy="${y}" r="${f(halo)}" fill="url(#fc-bulb-${c})" /><ellipse cx="${x}" cy="${y}" rx="${f(1.7 * big)}" ry="${f(2.2 * big)}" fill="#ffd36a" stroke="#4a2a10" stroke-width="0.4" /><circle cx="${x}" cy="${f(pt.y + 2 * big)}" r="${f(1.2 * big)}" fill="#fff6d0" /></g>`;

            // Every so often a spark in the air beside the string
            if (k % 2 === 0) {
                const sx = pt.x + (rnd() - 0.5) * 22;
                const sy = pt.y + (rnd() - 0.5) * 18;
                sparks += `<circle class="flashcards-spark" cx="${f(sx)}" cy="${f(sy)}" r="${f(0.6 + rnd() * 0.7)}" fill="#ffe9b4" />`;
            }
        });

        const wire = `<path d="${d}" fill="none" stroke="${isNight ? '#2a1a0e' : p.line}" stroke-opacity="${isNight ? 0.9 : 0.4}" stroke-width="0.8" stroke-linecap="round" />`;

        // By day nothing on it moves, and it stays in the box's drawing
        if (!isNight) return { art: `<g class="flashcards-garland">${wire}${bulbs}</g>`, lights: '' };

        // The box warmed by its lights, and a band of light along the wire
        const front = `x="0.55" y="${L.frontTop}" width="${f(W - 1.1)}" height="${f(L.boxH - L.frontTop - 0.55)}" rx="${L.round}"`;
        const warm = `<rect ${front} fill="url(#fc-box-lit)" style="mix-blend-mode: screen;" />`;

        /*
         * And the light the bulbs throw on the box itself, in patches rather
         * than evenly (the owner): a few soft warm pools of different sizes
         * and strengths, each where a bulb hangs -- a bulb outside the box
         * lights the edge nearest it -- kept to the box's own outline, and
         * still: they breathed slowly once, and on an old phone that was the
         * whole box drawn again at every frame (see twinkle). Which bulbs, how
         * big and how strong
         * is the box's seeded random, so it keeps its light from one look to
         * the next.
         */
        const clipId = `fc-lit-${n}`;
        const ins = L.inset;
        const clip = `<clipPath id="${clipId}"><rect ${front} /><polygon points="0.6,${L.frontTop} ${ins},${L.rimTop} ${f(W - ins)},${L.rimTop} ${f(W - 0.6)},${L.frontTop}" /></clipPath>`;

        const pools = lights.filter((_, k) => k % 2 === (n % 2)).slice(0, 4).map(pt => {
            const rx = W * (0.26 + rnd() * 0.3);
            const ry = L.boxH * (0.24 + rnd() * 0.26);
            const cx = Math.max(-W * 0.1, Math.min(W * 1.1, pt.x + (rnd() - 0.5) * 10));
            const cy = Math.max(L.rimTop, Math.min(L.boxH, pt.y + 4 + rnd() * 10));
            return `<ellipse class="flashcards-box-glow" cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#fc-box-spot)" fill-opacity="${f(0.45 + rnd() * 0.45)}" style="mix-blend-mode: screen;" />`;
        }).join('');

        const patches = `<defs>${clip}</defs><g clip-path="url(#${clipId})">${pools}</g>`;
        /*
         * The band along the wire, soft at its edges: strokes laid one over
         * another, each narrower than the last, where it was one stroke under
         * a blur filter -- a blur is worked out afresh at every repaint, and
         * old phones stuttered (21 November 2026). Four steps of a faint
         * orange read as the blur did.
         */
        const spill = `<g fill="none" stroke="#ff9a35" stroke-linecap="round" style="mix-blend-mode: screen;">${[34, 26, 16, 6].map(w => `<path d="${d}" stroke-opacity="0.04" stroke-width="${w}" />`).join('')}</g>`;

        /*
         * `art` goes into the box's drawing and is drawn once; `lights` --
         * the wire, the bulbs, the sparks, which twinkle -- over it, in a
         * drawing of its own. Inside the box's drawing every twinkle drew the
         * box again at every frame, its drop shadow and all while it had one
         * (until 22 November 2026). The light stays with the box
         * because it is screened over the cardboard, which a separate drawing
         * cannot do.
         */
        return {
            art: `<g class="flashcards-garland-light">${warm}${patches}${spill}</g>`,
            lights: `<g class="flashcards-garland">${wire}${bulbs}<g class="flashcards-sparks">${sparks}</g></g>`
        };
    }

    /*
     * The garlands coming on when the lamp turns night on: the room goes dark
     * at once, and only then the strings light up, each at its own moment and
     * each bulb a little apart from the others, catching once as it comes on
     * (the owner) -- not all of them with the room, which read as the light
     * never having gone off. The light a string throws on its box comes up
     * with its bulbs.
     */
    // By when every string is lit, from the start of lightUp
    const LIT_UP = 380 + 1100 + 520 + 240;

    function lightUp() {
        const set = [];
        if (!isNight || !MOTION || !stageEl) return set;

        const DARK = 380;
        const on = [{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0.45, offset: 0.55 }, { opacity: 1 }];

        stageEl.querySelectorAll('.flashcards-box').forEach(box => {
            if (!box.querySelector('.flashcards-bulb')) return;

            const at = DARK + Math.random() * 1100;

            box.querySelectorAll('.flashcards-bulb').forEach(bulb => {
                set.push(bulb.animate(on, { duration: 240, delay: at + Math.random() * 520, easing: 'linear', fill: 'backwards' }));
            });

            // In three steps, not smoothly: the light on the box is in the
            // box's drawing, and each step is that drawing done again --
            // forty-odd times in a smooth fade, and with the drop shadow the
            // box had until 22 November 2026
            box.querySelectorAll('.flashcards-garland-light, .flashcards-sparks').forEach(el => {
                set.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, delay: at + 120, easing: 'steps(3, end)', fill: 'backwards' }));
            });
        });

        return set;
    }

    /*
     * Every lit bulb breathing in its own time, at night -- dimming a little,
     * never going out -- and the sparks coming and going. Nothing else on the
     * shelf moves on its own, and that is the point (21 November 2026, old
     * phones stuttering at night): what an endless animation touches is drawn
     * again at every frame, and so it is only the bulbs and the sparks, in a
     * drawing of their own with no filter on it (see garlandSvg). The light
     * on the boxes and the band along the wire used to breathe too, the band
     * under a blur, the whole under each box's drop shadow.
     *
     * `root` is the stage, or a box drawn again. While a card is on the
     * table the twinkling is held -- the shelf is under the wash then, and
     * nobody looks at it -- see showTable.
     */
    let twinkling = [];
    let tableUp = false;

    function twinkle(root) {
        if (!isNight || !MOTION || !root) return;

        twinkling = twinkling.filter(a => a.effect && a.effect.target && a.effect.target.isConnected);

        // Each box its own rhythms, not the same pattern again in every box
        const k = root.dataset && root.dataset.box ? +root.dataset.box * 5 : 0;
        const add = (a) => {
            if (tableUp) a.pause();
            twinkling.push(a);
        };

        root.querySelectorAll('.flashcards-bulb-glow').forEach((el, j) => {
            const i = j + k;
            add(el.animate([{ opacity: 1 }, { opacity: 0.6 + (i % 3) * 0.1 }], { duration: 1100 + (i * 337) % 1300, delay: (i * 211) % 900, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }));
        });

        root.querySelectorAll('.flashcards-spark').forEach((el, j) => {
            const i = j + k;
            add(el.animate([{ opacity: 0.1 }, { opacity: 1 }], { duration: 700 + (i * 271) % 900, delay: (i * 157) % 1200, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }));
        });
    }

    function holdTwinkle(hold) {
        twinkling.forEach(a => hold ? a.pause() : a.play());
    }

    // One colour `share` of the way to another, both #rrggbb
    function mixHex(a, b, share) {
        const x = parseInt(a.slice(1), 16);
        const y = parseInt(b.slice(1), 16);
        const ch = (v, s) => (v >> s) & 255;
        return '#' + [16, 8, 0].map(s => Math.round(ch(x, s) + (ch(y, s) - ch(x, s)) * share).toString(16).padStart(2, '0')).join('');
    }

    // The label holder of a card file: a frame with a round ear at each end
    // and a slip of paper in it
    // `tone` for a plate in colours of its own -- the set's name in the header,
    // dark wood with pale letters at night (the owner, who tried it a shade
    // darker with its own letters and came back to this) -- the boxes'
    // labels taking the palette's
    function plateHtml(text, size, pad, height, ear, tone) {
        const p = { ...palette, ...(tone || {}) };
        const earCss = (side) => `position: absolute; ${side}: 0; top: 50%; width: ${ear * 2}px; height: ${ear * 2}px; margin-top: -${ear}px; box-sizing: border-box; border-radius: 50%; background: ${p.brass}; border: 1px solid ${p.line};`;

        return `<span style="position: relative; display: inline-flex; align-items: center; height: ${height}px; padding: 0 ${ear}px; box-sizing: border-box; filter: drop-shadow(0 1px 1px rgba(40, 24, 10, 0.3));">
            <span style="${earCss('left')}"></span><span style="${earCss('right')}"></span>
            <span style="position: relative; display: flex; align-items: center; height: 100%; min-width: 0; padding: 1.6px; box-sizing: border-box; border-radius: 3px; background: linear-gradient(180deg, ${p.brassLight}, ${p.brass}); border: 1px solid ${p.line};">
                <span style="display: block; height: 100%; min-width: 0; overflow: hidden; text-overflow: ellipsis; padding: 0 ${pad}px; box-sizing: border-box; border-radius: 1.6px; background: ${p.labelPaper}; box-shadow: inset 0 1px 1.5px rgba(84, 64, 47, 0.35); font-size: ${size}px; line-height: ${height - 5.2}px; font-weight: 700; color: ${p.labelInk}; white-space: nowrap;">${text}</span>
            </span>
        </span>`;
    }

    /*
     * The count on a box, `ready/total`, as a paper tag (the owner, 21
     * November 2026: craftier than the round pill it was): cut to a point at
     * the left with a hole punched in it, drawn round in the box's line,
     * on cream paper -- mustard paper while cards are ready (the owner, 22
     * November 2026; green until then) -- and hung a little askew, each box
     * its own way.
     *
     * The ink round it is the tag itself one pixel larger behind the paper:
     * a CSS border cannot follow the cut point, and a clip-path cuts a
     * border off.
     */
    function countTag(n, info) {
        const p = boxTone(n, info);
        const ready = info.ready > 0;
        const [top, foot] = ready ? p.tagReady : p.tag;
        const tip = 5.5;
        const cut = (point, shoulder) => `polygon(${shoulder}px 0, 100% 0, 100% 100%, ${shoulder}px 100%, ${point}px 50%)`;
        const tilt = (((n * 37) % 7) - 3) * 0.6;

        return `<span style="display: inline-flex; padding: 1px; background: ${p.boxLine}; clip-path: ${cut(0, tip)}; -webkit-clip-path: ${cut(0, tip)}; transform: rotate(${tilt}deg);">`
            + `<span style="position: relative; display: inline-flex; align-items: baseline; padding: 1.8px 4.4px 1.6px ${tip + 4.2}px; background: linear-gradient(180deg, ${top}, ${foot}); color: ${ready ? p.tagReadyInk : p.tagInk}; clip-path: ${cut(0.4, tip - 0.6)}; -webkit-clip-path: ${cut(0.4, tip - 0.6)}; white-space: nowrap; font-variant-numeric: tabular-nums;">`
            + `<span style="position: absolute; left: ${tip - 1.4}px; top: 50%; width: 3.2px; height: 3.2px; margin-top: -1.6px; box-sizing: border-box; border-radius: 50%; background: ${p.kraftMid}; border: 0.8px solid ${p.boxLine};"></span>`
            + `<span>${info.ready}</span><span style="opacity: 0.7;">/${info.total}</span>`
            + `</span></span>`;
    }

    /*
     * A box's label: the shape of the label holders the boxes had first (see
     * plateHtml, which the set's name in the header still is) -- a plate
     * with its corners a little rounded and a round ear at each end, the
     * ears behind it -- drawn round with one wide even grey line, the face
     * light card, the box's plain kraft lightened whatever colour the box
     * itself is, and the number on it in the labels' ink (the owner, 22
     * November 2026).
     *
     * The grey line and the face with no white slip are the labels of the
     * owner's picture of the shelf: the brass holder with a cream slip in
     * it, all in the shelf's dark ink, was what made the boxes look drawn
     * for children. The same day the label was in between a frame with its
     * corners cut, a plate pointed at both ends as the picture's are, and a
     * plain rounded one, the line first double and then darker and thinner
     * (2.6 pixels; the owner wanted it a little wider and lighter).
     */
    function labelHtml(text, L, p) {
        const h = L.plateH;
        const LINE = 3;
        // As wide as the line and no more, so that an ear is all line: at 5
        // pixels each had a light hole in it, a ring (the owner)
        const EAR = LINE;
        // How far an ear stands out past the plate's end: by the line's own
        // width (the owner, who had it at 1.6 pixels for a moment)
        const OUT = LINE;
        const face = mixHex(palette.kraft, palette.labelPaper, 0.5);
        const grey = mixHex(p.kraftLow, isNight ? '#3d3a36' : '#77736e', 0.7);

        const ear = (side) => `<span style="position: absolute; ${side}: 0; top: 50%; width: ${EAR * 2}px; height: ${EAR * 2}px; margin-top: -${EAR}px; box-sizing: border-box; border-radius: 50%; border: ${LINE}px solid ${grey}; background: ${face};"></span>`;

        // As long as the picture's labels at the least, whose "Box 2" a lone
        // figure is not: a short plate comes out nearly square
        return `<span style="position: relative; display: inline-flex; padding: 0 ${OUT}px;">${ear('left')}${ear('right')}`
            + `<span style="position: relative; display: flex; align-items: center; justify-content: center; height: ${h}px; min-width: ${Math.round(h * 1.9)}px; padding: 0 ${L.platePad}px; box-sizing: border-box; border: ${LINE}px solid ${grey}; border-radius: 4px; background: ${face}; font-size: ${L.plateFont}px; line-height: 1; font-weight: 700; color: ${p.labelInk}; white-space: nowrap;">${text}</span>`
            + `</span>`;
    }

    function boxParts(n, info, L) {
        const p = palette;
        const ready = info.ready > 0;

        const plate = `<span style="position: absolute; left: 50%; top: ${L.frontTop + L.plateTop}px; transform: translateX(-50%); display: flex;">${labelHtml(`${n}`, L, boxTone(n, info))}</span>`;

        const span = `<span style="display: inline-flex; align-items: center; gap: 2px; color: ${p.stampInk}; white-space: nowrap;">${CLOCK(L.footIcon, p.stampInk)}${spanText(n)}</span>`;

        const pill = countTag(n, info);

        const foot = `<span class="flashcards-box-foot" style="position: absolute; left: 0; right: 0; bottom: ${L.footBottom}px; display: flex; align-items: center; justify-content: center; gap: ${L.footGap}px; font-size: ${L.footFont}px; font-weight: 700; line-height: 1;">${span}${pill}</span>`;

        const garland = info.strung ? garlandSvg(n, L) : null;
        const lights = garland && garland.lights ? `<svg class="flashcards-box-lights" width="${L.w}" height="${L.boxH}" viewBox="0 0 ${L.w} ${L.boxH}" aria-hidden="true" style="position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none;">${garland.lights}</svg>` : '';

        return { art: boxSvg(n, info, L, garland) + lights, plate, foot };
    }

    // What each box was last drawn with, by its number -- see refreshBoxes
    const drawnBox = new Map();

    function boxInner(n, info, L) {
        const parts = boxParts(n, info, L);
        drawnBox.set(n, parts);
        return parts.art + parts.plate + parts.foot;
    }

    /*
     * What a press on a box will do, for the analytics (data-press, see
     * ANALYTICS.md): open it -- the number alone -- open it ahead of the
     * timers, shake because nothing in it is ready, or shake because it is
     * empty.
     */
    function pressOf(n, info) {
        if (!info.total) return `${n}-empty`;
        if (info.ready) return `${n}`;
        return earlyAllowed() ? `${n}-early` : `${n}-wait`;
    }

    function labelOf(n, info) {
        return `Box ${n}: ${info.ready} ready of ${info.total}, repeated ${spanText(n) === 'now' ? 'straight away' : `after ${spanText(n)}`}`;
    }

    /*
     * Ahead of the timers, by the store's own rule: only when the player
     * asked for it on the way in -- the catalog's "Play anyway" -- and only
     * while nothing at all in the set is ready (see store.duePool). Then every
     * box opens with all it holds. Otherwise a box with nothing ready only
     * shakes and shows its timer: the owner's call, the same day, in place of
     * a dialog asking whether to play early.
     */
    function earlyAllowed() {
        return !!state.allowEarly && store.duePool(state.selectedSetId, false).length === 0;
    }

    // No focus ring: a box pressed and then played from the keyboard kept one
    // round it, a white frame round a box just emptied (the owner)
    function boxHtml(n, info, L) {
        return `<button class="flashcards-box" data-box="${n}" data-press="${pressOf(n, info)}" aria-label="${labelOf(n, info)}" title="${labelOf(n, info)}" style="position: relative; display: block; width: ${L.w}px; height: ${L.boxH}px; padding: 0; margin: 0; border: none; outline: none; background: transparent; cursor: pointer; font-family: inherit; -webkit-tap-highlight-color: transparent;">${boxInner(n, info, L)}</button>`;
    }

    /*
     * The free place at the end of either shelf, and what stands in it: the
     * desk lamp, in both themes -- switched off by day and on at night, and
     * itself the switch between the two (the owner's call, 20 November 2026,
     * in place of the plant in a pot that stood there by day). Pressed, it
     * turns the light on, which is the room going dark round it, or off.
     *
     * A button, so that the press is counted (`flashcards-lamp`, see
     * ANALYTICS.md) and the theme it switches to is written as the panel's
     * switch writes it -- page.switchTheme.
     */
    function spareHtml(L) {
        const label = isNight ? 'Turn the lamp off' : 'Turn the lamp on';
        return `<button class="flashcards-lamp flashcards-spare" aria-label="${label}" title="${label}" style="position: relative; display: block; width: ${L.w}px; height: ${L.boxH}px; padding: 0; margin: 0; border: none; outline: none; background: transparent; cursor: pointer; -webkit-tap-highlight-color: transparent;">${deskLampSvg(L)}</button>`;
    }

    /*
     * The desk lamp: a heavy base, two brass arms, and a head turned up and
     * to the left, where the table is -- so that when a card is out, the
     * light falls on it (see beam). Its geometry in the place's own pixels,
     * scaled with the shelf; where its light comes out is what lampSpot
     * reads back.
     */
    function lampGeometry(L) {
        // A little larger than the place's own scale: a heavy lamp (the owner)
        const s = L.boxH / 100 * 1.1;
        const W = L.w;
        const H = L.boxH;
        const base = { x: W * 0.64, y: H - 4 * s };
        const knee = { x: base.x + 9 * s, y: H - 46 * s };
        const pivot = { x: base.x - 15 * s, y: H - 69 * s };
        const aim = L.aim;
        const dir = { x: Math.cos(aim), y: Math.sin(aim) };
        const mouth = { x: pivot.x + dir.x * 24 * s, y: pivot.y + dir.y * 24 * s };

        return { s, base, knee, pivot, aim, dir, mouth };
    }

    /*
     * The lamp's two poses, as two turns: of its upper arm about the elbow,
     * and of its head about the joint at the end of the arm. Up, lit: the arm
     * as drawn, the head at `aim`. Off: the arm let down and the head hanging
     * towards the shelf (the owner) -- and switched on it lifts itself into
     * the other pose before the light comes, see switchLamp.
     */
    const ARM_DOWN = -34;
    const HEAD_DOWN = 104;

    function poseOf(on, L) {
        return on ? { arm: 0, head: L.aim * 180 / Math.PI } : { arm: ARM_DOWN, head: HEAD_DOWN - ARM_DOWN };
    }

    function deskLampSvg(L) {
        const p = palette;
        const g = lampGeometry(L);
        const { s, base, knee, pivot, mouth } = g;
        const f = (v) => Math.round(v * 10) / 10;
        const pose = poseOf(isNight, L);
        // Heavy, as the owner asked: thick arms, a broad base, a big shade --
        // in the same place, about the same size overall. The lower arm
        // starts inside the base, which is drawn over it: from the base's foot
        // its round end showed under the base (the owner)
        const arm = (a, b) => `<path d="M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}" stroke="${p.line}" stroke-width="${f(7.4 * s + 1)}" stroke-linecap="round" /><path d="M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}" stroke="${p.lampArm}" stroke-width="${f(4.6 * s + 0.4)}" stroke-linecap="round" /><path d="M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}" stroke="rgba(255, 240, 210, 0.35)" stroke-width="${f(1.2 * s)}" stroke-linecap="round" transform="translate(-0.6 -0.6)" />`;

        // Lit: a glow round the head and a warm patch on the shelf under it,
        // the bulb bright in the mouth. Off: the bulb a dull glass, and the
        // lamp casts a shadow like the boxes beside it.
        const lit = isNight
            ? `<defs><radialGradient id="fc-lamp-glow"><stop offset="0" stop-color="#ffdc96" stop-opacity="0.7" /><stop offset="0.45" stop-color="#ffc56e" stop-opacity="0.22" /><stop offset="1" stop-color="#ffc56e" stop-opacity="0" /></radialGradient></defs>
            <circle class="flashcards-lamp-glow" cx="${f(mouth.x)}" cy="${f(mouth.y)}" r="${f(46 * s)}" fill="url(#fc-lamp-glow)" />
            <ellipse class="flashcards-lamp-glow" cx="${f(base.x)}" cy="${f(base.y + 2.6 * s)}" rx="${f(18 * s)}" ry="${f(3 * s)}" fill="rgba(255, 205, 135, 0.18)" />`
            : `<ellipse cx="${f(base.x + 2)}" cy="${f(base.y + 3 * s)}" rx="${f(17 * s)}" ry="${f(2.8 * s)}" fill="${p.boxShadow}" />`;

        // The head, drawn pointing to the right of its joint and turned from
        // there
        const hx = (dx) => f(pivot.x + dx * s);
        const hy = (dy) => f(pivot.y + dy * s);

        /*
         * In layers (21 November 2026, a weak phone): what stands still -- the
         * glow, the lower arm, and over them the elbow and the base -- and
         * between them the upper arm turning about the elbow, carrying the
         * head turning about its joint. Each turning part is a box of its own
         * the size of the place, turned by CSS about its joint in the place's
         * pixels, the head's box inside the arm's -- just as the head's group
         * sat inside the arm's in one drawing, when each frame of a switch
         * turned them by their attributes and drew the lamp again, by day its
         * drop shadow with it. Now the browser turns the layers as they are,
         * see moveLamp.
         */
        const layer = (inner) => `<svg width="${L.w}" height="${L.boxH}" viewBox="0 0 ${L.w} ${L.boxH}" style="position: absolute; left: 0; top: 0; overflow: visible;">${inner}</svg>`;
        const turning = (cls, deg, at, inner) => `<span class="${cls}" style="position: absolute; left: 0; top: 0; display: block; width: ${L.w}px; height: ${L.boxH}px; transform-origin: ${f(at.x)}px ${f(at.y)}px; transform: rotate(${f(deg)}deg);">${inner}</span>`;

        const headArt = layer(`
                    <path d="M${hx(-6)} ${hy(-7.5)}L${hx(24)} ${hy(-16.5)}A${f(2.4 * s)} ${f(16.5 * s)} 0 0 1 ${hx(24)} ${hy(16.5)}L${hx(-6)} ${hy(7.5)}Z" fill="${p.lampHead}" stroke="${p.line}" stroke-width="1.3" stroke-linejoin="round" />
                    <path d="M${hx(-6)} ${hy(3)}L${hx(24)} ${hy(7)}L${hx(24)} ${hy(16.5)}L${hx(-6)} ${hy(7.5)}Z" fill="rgba(20, 30, 28, 0.18)" />
                    <path d="M${hx(3)} ${hy(-9)}L${hx(21)} ${hy(-14.4)}" stroke="rgba(255, 255, 255, 0.38)" stroke-width="${f(2.2 * s)}" stroke-linecap="round" />
                    <rect x="${hx(-9)}" y="${hy(-4)}" width="${f(5 * s)}" height="${f(8 * s)}" rx="${f(1.5 * s)}" fill="${p.lampArm}" stroke="${p.line}" stroke-width="1.1" />
                    <ellipse cx="${hx(24)}" cy="${hy(0)}" rx="${f(2.4 * s)}" ry="${f(16.5 * s)}" fill="${isNight ? '#fff3c8' : p.bulbOff}" stroke="${p.line}" stroke-width="1.2" />
`);
        const armArt = layer(arm(knee, pivot)) + turning('flashcards-lamp-head', pose.head, pivot, headArt) + layer(`
                <circle cx="${f(pivot.x)}" cy="${f(pivot.y)}" r="${f(4.6 * s)}" fill="${p.lampArm}" stroke="${p.line}" stroke-width="1.2" />
                <circle cx="${f(pivot.x)}" cy="${f(pivot.y)}" r="${f(1.6 * s)}" fill="${p.line}" opacity="0.55" />
`);

        return `<span class="flashcards-lamp-art" style="position: absolute; left: 0; top: 0; display: block; width: ${L.w}px; height: ${L.boxH}px; pointer-events: none;${isNight ? '' : ` filter: drop-shadow(${p.drop});`}">
            ${layer(lit + arm({ x: base.x, y: base.y - 6 * s }, knee))}
            ${turning('flashcards-lamp-arm', pose.arm, knee, armArt)}
            ${layer(`
            <circle cx="${f(knee.x)}" cy="${f(knee.y)}" r="${f(4.8 * s)}" fill="${p.lampArm}" stroke="${p.line}" stroke-width="1.2" />
            <circle cx="${f(knee.x)}" cy="${f(knee.y)}" r="${f(1.7 * s)}" fill="${p.line}" opacity="0.55" />
            <path d="M${f(base.x - 23 * s)} ${f(base.y + 1)}Q${f(base.x - 21 * s)} ${f(base.y - 11 * s)} ${f(base.x)} ${f(base.y - 11.5 * s)}Q${f(base.x + 21 * s)} ${f(base.y - 11 * s)} ${f(base.x + 23 * s)} ${f(base.y + 1)}Z" fill="${p.lampBase}" stroke="${p.line}" stroke-width="1.3" stroke-linejoin="round" />
            <path d="M${f(base.x - 16 * s)} ${f(base.y - 3.5 * s)}Q${f(base.x)} ${f(base.y - 10 * s)} ${f(base.x + 9 * s)} ${f(base.y - 8 * s)}" fill="none" stroke="rgba(255, 240, 215, 0.25)" stroke-width="${f(1.6 * s)}" stroke-linecap="round" />
`)}
        </span>`;
    }

    function lampParts() {
        const lamp = stageEl && stageEl.querySelector('.flashcards-lamp');
        const arm = lamp && lamp.querySelector('.flashcards-lamp-arm');
        const head = lamp && lamp.querySelector('.flashcards-lamp-head');
        return arm && head ? [arm, head] : null;
    }

    // `parts` the lamp a move began on: a move outlived by a redraw (a quick
    // second press of the lamp) put its last pose on the new lamp, which was
    // then left up by day or down at night
    function poseLamp(pose, parts = lampParts()) {
        if (!parts) return;
        parts[0].style.transform = `rotate(${pose.arm}deg)`;
        parts[1].style.transform = `rotate(${pose.head}deg)`;
    }

    // The arm and the head made layers of their own ahead of their move, so
    // that the browser has them ready by the time they set off
    function readyLamp(ready) {
        (lampParts() || []).forEach(el => { el.style.willChange = ready ? 'transform' : ''; });
    }

    /*
     * The lamp moved from one pose to the other. The arm and the head are
     * layers of their own (see deskLampSvg), and their turns are animations
     * of CSS transforms, which the browser runs off the main thread without
     * drawing anything again -- where each frame used to set their transform
     * attributes and draw the lamp anew, and on a weak phone the move came
     * in jerks (the owner, 21 November 2026). The spring of the move is
     * written out as keyframes. Done by a timer rather than by the
     * animations' own ending: a page out of sight gets no frames, and the
     * lamp must not stay half up.
     */
    function moveLamp(from, to, ms) {
        const parts = lampParts();
        if (!parts) return Promise.resolve();

        const [armEl, headEl] = parts;

        poseLamp(from, parts);
        if (!MOTION) {
            poseLamp(to, parts);
            return Promise.resolve();
        }

        // The head turns the short way round: down to up through pointing
        // left, not a turn and a half through pointing right
        const turn = ((to.head - from.head) % 360 + 540) % 360 - 180;
        const goal = { arm: to.arm, head: from.head + turn };

        // Out quickly, settling with a little give, as a sprung arm does
        const ease = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
        const STEPS = 16;
        const frames = (a, b) => Array.from({ length: STEPS + 1 }, (_, i) => ({
            transform: `rotate(${Math.round((a + (b - a) * ease(i / STEPS)) * 100) / 100}deg)`,
            offset: i / STEPS
        }));
        const how = { duration: ms, easing: 'linear', fill: 'forwards' };

        parts.forEach(el => { el.style.willChange = 'transform'; });
        const moves = [armEl.animate(frames(from.arm, goal.arm), how), headEl.animate(frames(from.head, goal.head), how)];

        return new Promise(done => {
            setTimeout(() => {
                poseLamp(to, parts);
                moves.forEach(m => m.cancel());
                parts.forEach(el => { el.style.willChange = ''; });
                done();
            }, ms + 40);
        });
    }

    // After the browser has put on the screen what was just drawn: two frames
    // on -- or soon, if no frames are coming (a page out of sight gets none)
    function afterPaint(fn) {
        let done = false;
        const go = () => {
            if (done) return;
            done = true;
            fn();
        };

        requestAnimationFrame(() => requestAnimationFrame(go));
        setTimeout(go, 400);
    }

    /*
     * The boxes in order, left to right along each shelf and shelf after
     * shelf, the free place last -- as the boxes of the pictures are
     * numbered. They stood as a snake for an afternoon (6 5 4 on the second
     * shelf), so that the arrows from box to box would never cross; the owner
     * put them back in rows the same evening, and the arrows are drawn one
     * after another instead, so that none crosses another while it is drawn.
     */
    function rowsOf(L) {
        const rows = [];
        const places = L.cols * Math.ceil((L.count + 1) / L.cols);

        for (let first = 1; first <= places; first += L.cols) {
            rows.push(Array.from({ length: L.cols }, (_, i) => first + i));
        }

        return rows;
    }

    /*
     * The cabinet: a wooden frame, a plain back, and the boxes standing on
     * shelves in rows of three.
     *
     * Each shelf is a board seen a little from above, its top in light and
     * its front edge in shade, and the boxes stand on its top rather than on
     * its edge. Under each shelf the wall is in its shadow, and the wall's two
     * ends are darker than its middle -- the inside of a cabinet.
     *
     * Deep shadows, and a back in one piece (the owner, 22 November 2026: so
     * that the cabinet looks deeper and rounder). The back was boards, a seam
     * every 52 pixels, and the shadows half as dark; the seams ran behind the
     * boxes and broke up the dark the boxes stand out against. And deep
     * shelves, their tops going a long way back and darker as they go (SINK
     * was 4), in the dark grey browns of the owner's picture, where they were
     * light warm wood.
     */
    function cabinetHtml() {
        const p = palette;
        const L = layoutOf();
        const counts = shelfCounts();
        const SINK = 14;

        /*
         * The cabinet's two sides, seen from inside (the owner, the same day,
         * after the picture): at each end of a shelf a narrow wall running
         * from the front edge back to the back, the left one catching more
         * light than the right. Its foot is cut off on the slant where the
         * shelf's top runs into it -- the shelf's back edge is SINK higher
         * than the line its front edge starts at, three pixels below the
         * row -- and the shadow under the shelf above falls on it as it does
         * on the back.
         */
        const SIDE = 12;
        const back = `calc(100% - ${SINK + 3}px)`;
        const side = (left) => `<span class="flashcards-side" aria-hidden="true" style="position: absolute; ${left ? 'left' : 'right'}: 0; top: 0; bottom: -3px; width: ${SIDE}px; pointer-events: none; background: linear-gradient(180deg, ${p.rowShade} 0, transparent ${L.rowGap + 26}px), linear-gradient(${left ? 90 : 270}deg, ${left ? p.sideLit : p.sideNear}, ${p.sideFar}); box-shadow: inset ${left ? -1 : 1}px 0 0 ${p.sideEdge}; clip-path: ${left ? `polygon(0 0, 100% 0, 100% ${back}, 0 100%)` : `polygon(0 0, 100% 0, 100% 100%, 0 ${back})`};"></span>`;

        const rows = rowsOf(L).map(row => {
            const cells = row.map(n => (n <= L.count ? boxHtml(n, counts[n], L) : spareHtml(L))).join('');

            return `<div class="flashcards-row" style="position: relative; z-index: 2; display: grid; grid-template-columns: repeat(${L.cols}, ${L.w}px); justify-content: space-between; padding: ${L.rowGap}px ${L.padX}px 0; background: linear-gradient(180deg, ${p.rowShade} 0, transparent ${L.rowGap + 26}px);">${side(true)}${side(false)}${cells}</div>
                <div class="flashcards-plank" style="position: relative; z-index: 1; margin-top: -${SINK}px; height: ${L.plank + SINK}px; box-sizing: border-box; border-bottom: 1px solid ${p.line}; background: linear-gradient(180deg, ${p.plankBack} 0, ${p.plankTop} ${SINK + 3}px, ${p.line} ${SINK + 3}px, ${p.line} ${SINK + 4}px, ${p.plankFront} ${SINK + 4}px, ${p.plankFrontLow} 100%); box-shadow: 0 3px 5px ${p.plankShade};"></div>`;
        }).join('');

        // The two ends of the wall in the shadow of the cabinet's sides
        const ends = `linear-gradient(90deg, ${p.sideShade} 0, transparent 34px, transparent calc(100% - 34px), ${p.sideShade} 100%)`;

        return `<div class="flashcards-cabinet" data-layout="${L.name}" style="position: relative; padding: 9px ${FRAME_PAD}px ${FRAME_PAD}px; border-radius: 10px; border: ${FRAME_EDGE}px solid ${p.line}; background: linear-gradient(180deg, ${p.frame}, ${p.frameLow}); box-shadow: inset 0 1.5px 0 rgba(255, 236, 205, 0.25), inset 0 -2px 0 rgba(30, 18, 8, 0.25), ${p.cabinetShadow};">
            <div class="flashcards-wall" style="position: relative; border-radius: 4px; overflow: hidden; border: ${WALL_EDGE}px solid ${p.line}; background: ${ends}, ${p.wall}; box-shadow: ${p.wallDepth};">${rows}</div>
        </div>`;
    }

    /*
     * ---- The night ----
     *
     * The dark theme is not the shelf in darker colours but the room with the
     * light off (the owner's call, 20 November 2026, after a picture of the
     * same cabinet at night): the wood and the cardboard in shadow, and lit
     * by what is in the room -- the desk lamp in the free place at the end of
     * the shelf, whose light falls on the card when one is out, and the fairy
     * lights on the boxes that have a card ready (see garlandSvg).
     *
     * The light and the shade are two layers laid over the cabinet: one that
     * darkens (multiply), deepest in the corner farthest from the lamp, and
     * one that lights (screen), warmest round the lamp. The fairy lights
     * shine through both: their glow is drawn in the boxes' own drawing.
     */
    let isNight = false;

    // Where the lamp's light comes out, in the stage's pixels
    function lampSpot() {
        const spare = stageEl && stageEl.querySelector('.flashcards-spare');
        if (!spare) return null;

        const at = offsetIn(spare);
        const { mouth } = lampGeometry(layoutOf());

        return { x: at.x + mouth.x, y: at.y + mouth.y };
    }

    function drawNight() {
        if (!stageEl) return;

        stageEl.querySelectorAll('.flashcards-night').forEach(el => el.remove());
        if (!isNight) return;

        const cabinet = stageEl.querySelector('.flashcards-cabinet');
        const top = cabinet.offsetTop;
        const W = cabinet.offsetWidth;
        const H = cabinet.offsetHeight;
        const lamp = lampSpot() || { x: W * 0.75, y: top + H * 0.85 };
        const lx = Math.round(lamp.x / W * 100);
        const ly = Math.round((lamp.y - top) / H * 100);
        const place = `position: absolute; left: 0; top: ${top}px; width: ${W}px; height: ${H}px; border-radius: 10px; pointer-events: none;`;

        // The shade: deepest in the corner farthest from the lamp
        $(stageEl, `<div class="flashcards-night" style="${place} z-index: 1; mix-blend-mode: multiply; background: radial-gradient(ellipse 120% 95% at ${lx}% ${ly}%, rgba(255, 255, 255, 0) 18%, rgba(18, 20, 40, 0.66) 100%);"></div>`);

        // The light: a warm pool round the lamp, and a glow along the side
        // the fairy lights hang down
        $(stageEl, `<div class="flashcards-night flashcards-lamplight" style="${place} z-index: 1; mix-blend-mode: screen; background: radial-gradient(ellipse 46% 28% at ${lx}% ${ly}%, rgba(255, 176, 95, 0.34), rgba(255, 176, 95, 0) 100%);"></div>`);

        // The lamp's cone, over the boxes: above the shelves, which stand
        // above the two layers -- see coneOf
        const cone = coneOf();
        if (cone) $(stageEl, lightSvg(cone, 'flashcards-night flashcards-lamplight flashcards-shelf-cone', 'fc-shelf-beam', `top: ${top}px; z-index: 2;`, BEAM_STRENGTH));

        // The glow of the bulbs on the boxes, defined once for all of them
        $(stageEl, `<svg class="flashcards-night" aria-hidden="true" width="0" height="0" style="position: absolute;"><defs>${BULBS.map((c, i) => `<radialGradient id="fc-bulb-${i}"><stop offset="0" stop-color="#fff3c2" stop-opacity="1" /><stop offset="0.14" stop-color="#ffd067" stop-opacity="0.95" /><stop offset="0.32" stop-color="${c}" stop-opacity="0.62" /><stop offset="0.6" stop-color="#ff8a24" stop-opacity="0.2" /><stop offset="1" stop-color="#ff8a24" stop-opacity="0" /></radialGradient>`).join('')}<radialGradient id="fc-bloom"><stop offset="0" stop-color="#ff9a3a" stop-opacity="0.16" /><stop offset="0.5" stop-color="#ff9a3a" stop-opacity="0.06" /><stop offset="1" stop-color="#ff9a3a" stop-opacity="0" /></radialGradient><radialGradient id="fc-box-lit" cx="0.5" cy="0.15" r="0.85"><stop offset="0" stop-color="#ffa840" stop-opacity="0.36" /><stop offset="1" stop-color="#ffa840" stop-opacity="0.06" /></radialGradient><radialGradient id="fc-box-spot"><stop offset="0" stop-color="#ffbe62" stop-opacity="0.62" /><stop offset="0.45" stop-color="#ffa646" stop-opacity="0.3" /><stop offset="1" stop-color="#ff9a3a" stop-opacity="0" /></radialGradient></defs></svg>`);

        twinkle(stageEl);
    }

    function boxEl(n) {
        return stageEl ? stageEl.querySelector(`.flashcards-box[data-box="${n}"]`) : null;
    }

    /*
     * The figures and the cards of every box, drawn again in place: after a
     * card leaves or lands, and every so often while the shelf is looked at,
     * because a timer runs out without anybody pressing anything.
     *
     * Only what has changed (21 November 2026, old phones): a card moving
     * changes two boxes, and the timer most often none. All fourteen were
     * drawn anew every time -- at night some eight hundred pieces of drawing
     * with their filters, a stutter after every answer. A box whose drawing
     * or label is as it was keeps them; one whose figures alone changed gets
     * new figures only.
     */
    function refreshBoxes() {
        if (!stageEl) return;

        const L = layoutOf();
        const counts = shelfCounts();

        stageEl.querySelectorAll('.flashcards-box').forEach(box => {
            const n = +box.dataset.box;
            const info = counts[n];
            const parts = boxParts(n, info, L);
            const was = drawnBox.get(n);
            const foot = box.querySelector('.flashcards-box-foot');

            if (!was || was.art !== parts.art || was.plate !== parts.plate || !foot) {
                box.innerHTML = parts.art + parts.plate + parts.foot;
                twinkle(box);
            } else if (was.foot !== parts.foot) {
                foot.outerHTML = parts.foot;
            }

            drawnBox.set(n, parts);
            box.dataset.press = pressOf(n, info);
            box.setAttribute('aria-label', labelOf(n, info));
            box.title = labelOf(n, info);
        });
    }

    /*
     * Where something is inside the stage, in the stage's own pixels.
     *
     * Walked up the offsets rather than read off getBoundingClientRect: the
     * page stands inside a zoom (see app.css), and what a rectangle measures
     * is the zoomed screen, where the transforms below are written in the
     * layout's own units.
     */
    function offsetIn(el) {
        let x = 0;
        let y = 0;

        for (let n = el; n && n !== stageEl; n = n.offsetParent) {
            x += n.offsetLeft;
            y += n.offsetTop;

            const up = n.offsetParent;
            if (up && up !== stageEl) {
                x += up.clientLeft;
                y += up.clientTop;
            }
        }

        return { x, y };
    }

    // The middle of the box's opening: where a card comes out and goes in
    function mouthOf(box) {
        const L = layoutOf();
        const at = offsetIn(box);
        return { x: at.x + box.offsetWidth / 2, y: at.y + (L.rimTop + L.frontTop) / 2 };
    }

    /*
     * ---- The arrows ----
     *
     * When the shelf opens, a dotted arrow draws itself from box 1 to box 2
     * and is wiped, and the boxes after it hop one after another, each with
     * its pop, as far as the last -- the way a card travels when it is
     * answered right, which is the whole of the game in one look (the owner's
     * call, 20 November 2026; the dashed arrow is the pictures'). Until the
     * evening of 22 November an arrow went from every box to the next, along
     * the shelf over the gap and from the end of a shelf down across it; the
     * owner kept the first and let the hops say the rest.
     *
     * Once a page and not on every redraw, and not over a card already on the
     * table. A press anywhere takes them away at once; they take no presses
     * themselves.
     */
    function introArrows(token) {
        // No arrows after all: the boxes' hops start without them
        if (!MOTION || token !== drawn || held || !stageEl) {
            if (token === drawn) idleHops(token);
            return;
        }

        const L = layoutOf();
        const p = palette;
        // In the order of their numbers, which on the snake is not the order
        // they stand in on the page
        const boxes = Array.from(stageEl.querySelectorAll('.flashcards-box')).sort((a, b) => a.dataset.box - b.dataset.box);
        if (boxes.length < 2) return;

        const spots = boxes.map(box => ({ ...offsetIn(box), w: box.offsetWidth, h: box.offsetHeight }));
        const f = (v) => Math.round(v * 10) / 10;

        // One after another, each drawn to its head before the next begins
        // (the owner): the one from the end of a shelf to the start of the
        // next crosses the shelf, and drawn alongside the others it crossed
        // them. Each is wiped as the next is drawn -- see below

        let body = '';

        const routes = spots.slice(1).map((b, i) => {
            const a = spots[i];
            let from, to, c1, c2;

            if (Math.abs(a.y - b.y) < 2) {
                // Along the shelf, whichever way this shelf runs: an arc over
                // the gap between the two
                const way = b.x > a.x ? 1 : -1;
                from = { x: a.x + a.w * (way > 0 ? 0.72 : 0.28), y: a.y + L.rimTop + 2 };
                to = { x: b.x + b.w * (way > 0 ? 0.28 : 0.72), y: b.y + L.rimTop + 2 };
                c1 = { x: from.x + way * 6, y: a.y - L.rowGap - 4 };
                c2 = { x: to.x - way * 6, y: b.y - L.rowGap - 4 };
            } else {
                // From the foot of the last box of a shelf, clear of its label
                // and figures, across to the first box of the next
                from = { x: a.x + a.w * 0.14, y: a.y + a.h - 2 };
                to = { x: b.x + b.w * 0.72, y: b.y + L.rimTop + 2 };
                c1 = { x: from.x - 12, y: from.y + 18 };
                c2 = { x: to.x + 22, y: to.y - 22 };
            }

            return { from, to, c1, c2 };
        });

        /*
         * Each arrow drawn once, whole, standing still, in a small layer of
         * its own (will-change), and only the edge of its clip moving: a
         * clip-path inset that opens it from its tail to its head and then
         * closes it the same way (the owner, 22 November 2026). What changes
         * at a frame is one arrow's clip -- at worst its own small layer
         * painted again, never the shelf under it.
         *
         * Until then the arrow was drawn through an SVG mask, a dash as long
         * as the path slid along it: a mask is worked out afresh at every
         * frame, and the arrows' layer, lying over the whole shelf, was
         * painted again with everything under it -- the drawing stuttered.
         * The same evening, for a moment, the arrows came on and went off
         * with no movement at all, and then were shown through a window
         * sliding one way with the drawing in it sliding back: the two moves
         * did not keep step, and the arrows shook from side to side (the
         * owner). One moving edge has nothing to keep step with.
         *
         * The edge travels across, the way from the tail to the head, which
         * every route keeps to: along a shelf the arc only rises and falls,
         * and the one from the end of a shelf goes leftwards all the way
         * down to the next.
         */
        const PAD = 8;

        // The clip shut from the tail's side (before it is drawn) or from the
        // head's (once it is wiped): all of the arrow's width cut away from
        // that side
        const shut = (way, before) => ((way > 0) === before ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)');
        const OPEN = 'inset(0 0 0 0)';

        // Only the first is drawn; the rest still set the run's pace, which
        // the hops keep to -- see below
        const frames = routes.slice(0, 1).map((route, i) => {
            const { from, to, c1, c2 } = route;

            // Its box: the curve keeps inside its four points, and the head
            // and the dots' round caps inside the margin round them
            const xs = [from.x, c1.x, c2.x, to.x];
            const ys = [from.y, c1.y, c2.y, to.y];
            const x0 = Math.min(...xs) - PAD;
            const y0 = Math.min(...ys) - PAD;
            const w = Math.max(...xs) + PAD - x0;
            const h = Math.max(...ys) + PAD - y0;
            const way = to.x >= from.x ? 1 : -1;

            // In the arrow's own pixels
            const q = (pt) => `${f(pt.x - x0)} ${f(pt.y - y0)}`;
            const d = `M${q(from)}C${q(c1)} ${q(c2)} ${q(to)}`;

            // The head points the way the curve arrives
            const ang = Math.atan2(to.y - c2.y, to.x - c2.x);
            const wing = (turn) => q({ x: to.x - Math.cos(ang + turn) * 6.5, y: to.y - Math.sin(ang + turn) * 6.5 });
            const head = `M${wing(0.5)}L${q(to)}L${wing(-0.5)}`;

            // A line of round dots, with no shadow (the owner): dashes of no
            // length, the round caps making each one a dot. Shut to begin
            // with, its clip all on the tail's side
            body += `<div class="flashcards-arrow" data-i="${i}" style="position: absolute; left: ${f(x0)}px; top: ${f(y0)}px; width: ${f(w)}px; height: ${f(h)}px; will-change: transform; clip-path: ${shut(way, true)};">`
                + `<svg width="${f(w)}" height="${f(h)}" viewBox="0 0 ${f(w)} ${f(h)}" style="display: block;">`
                + `<path d="${d}" fill="none" stroke="${p.arrow}" stroke-width="2.6" stroke-dasharray="0 5.4" stroke-linecap="round" />`
                + `<path d="${head}" fill="none" stroke="${p.arrow}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />`
                + `</svg></div>`;

            return way;
        });

        const layer = $(stageEl, `<div class="flashcards-arrows" aria-hidden="true" style="position: absolute; left: 0; top: 0; width: ${stageEl.offsetWidth}px; height: ${stageEl.offsetHeight}px; z-index: 2; pointer-events: none;">${body}</div>`);

        /*
         * Each arrow is drawn from its tail to its head, and while the next
         * one is being drawn it is wiped away the same way, tail first, its
         * head going last (the owner's call, 20 November 2026) -- so that one
         * arrow at a time is on the shelf, travelling from box to box. The
         * last one waits a moment and goes the same way.
         *
         * Gathering speed as it goes (the owner, 22 November 2026): the first
         * arrow drawn at an easy pace, each after it quicker by a sixth, down
         * to a floor, and the last wiped almost as soon as it is drawn. At one
         * pace all the way, with the last one held, the run took six and a
         * half seconds and dragged at its end; so it takes under three, and
         * ends at a run. The boxes' pops come quicker with it.
         */
        const count = routes.length;
        const FIRST = 420;
        const SPEED_UP = 0.84;
        const FASTEST = 90;

        // How long each arrow takes to draw (and to be wiped, alongside the
        // next one's drawing), and when it starts
        const draws = routes.map((_, i) => Math.max(FASTEST, FIRST * Math.pow(SPEED_UP, i)));
        const starts = [0];
        for (let i = 1; i < count; i++) starts.push(starts[i - 1] + draws[i - 1] + 60 * Math.pow(SPEED_UP, i - 1));

        // The last waits only a breath before it goes, at its own pace
        const wipes = draws.map((d, i) => i < count - 1 ? [starts[i + 1], draws[i + 1]] : [starts[i] + d + 120, d]);

        layer.querySelectorAll('.flashcards-arrow').forEach((arrow, i) => {
            const way = frames[i];

            const drawAt = starts[i];
            const draw = draws[i];
            const [wipeAt, wipe] = wipes[i];
            const span = wipeAt + wipe - drawAt;

            // Shut, open, open, shut from the other side. Each stroke eased
            // on its own, not the whole timeline as one: the drawing and the
            // wiping are of different lengths
            arrow.animate([
                { clipPath: shut(way, true), offset: 0, easing: 'ease-in-out' },
                { clipPath: OPEN, offset: draw / span },
                { clipPath: OPEN, offset: (wipeAt - drawAt) / span, easing: 'ease-in-out' },
                { clipPath: shut(way, false), offset: 1 }
            ], { duration: span, delay: drawAt, easing: 'linear', fill: 'both' });
        });

        /*
         * And the boxes answer the arrows (the owner): the first gives a
         * little start as the first arrow leaves it, and each after it hops
         * as an arrow reaches it, with a soft pop a step higher each time --
         * the way up the shelf heard as a rising run. Light, and under the
         * sound effects' switch, as every sound of the games is (see sfx).
         */
        const timers = [];
        const hop = hopBox;

        const reach = (i, at) => timers.push(setTimeout(() => {
            if (!layer.isConnected || layer.dataset.leaving) return;
            hop(boxes[i]);
            sfx.bubble(i, 0, true);
        }, at));

        reach(0, 0);
        for (let i = 1; i < boxes.length; i++) reach(i, starts[i - 1] + draws[i - 1] * 0.9);

        const total = wipes[count - 1][0] + wipes[count - 1][1];

        const leave = (quick) => {
            if (!layer.isConnected || layer.dataset.leaving) return;
            layer.dataset.leaving = '1';
            timers.forEach(clearTimeout);

            // Done, or waved away: the boxes' own hops begin
            idleHops(token);

            if (!quick) return layer.remove();
            settled(layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'ease-in', fill: 'forwards' })).then(() => layer.remove());
        };

        setTimeout(() => leave(false), total + 100);
        stageEl.addEventListener('pointerdown', () => leave(true), { once: true });
    }

    /*
     * ---- The card on the table ----
     */
    const CARD_W = 268;
    const CARD_H = 158;
    const BAND = 22;

    // The card lies a little askew, as a card put down by hand does
    const TILT = -1.2;
    const REST = `rotate(${TILT}deg)`;

    /*
     * An index card: cream paper drawn round in the shelf's ink, a band
     * across the top in the soft colour of its stage on the front and plain
     * kraft on the back -- so the two sides are told apart before a word of
     * either is read -- a faint red rule under the band and faint blue ones
     * down the rest.
     */
    function faceStyle(paper, band, rotate) {
        const p = palette;

        return `position: absolute; width: 100%; height: 100%; backface-visibility: hidden; -webkit-backface-visibility: hidden; ${rotate ? 'transform: rotateX(180deg);' : ''} box-sizing: border-box; border-radius: 10px; border: 1.3px solid ${p.line}; background: linear-gradient(180deg, ${band} 0, ${band} ${BAND}px, ${p.line} ${BAND}px, ${p.line} ${BAND + 1}px, ${p.margin} ${BAND + 1}px, ${p.margin} ${BAND + 2}px, transparent ${BAND + 2}px), repeating-linear-gradient(180deg, transparent 0 19px, ${p.rule} 19px 20px), ${paper}; box-shadow: ${p.cardHalo}; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: ${BAND + 9}px 14px 10px; cursor: pointer;`;
    }

    /*
     * Turned over top over bottom, the top edge coming forward and down (the
     * owner's call, 20 November 2026): rotateX, where it used to turn side
     * over side. The back is laid upside down to begin with, so that it
     * stands the right way up once turned.
     */
    const TURNED = 'rotateX(-180deg)';
    const UNTURNED = 'rotateX(0deg)';

    const NAV_ICON = (path) => `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display: block;"><path d="${path}" /></svg>`;

    function cardHtml(item) {
        const p = palette;
        const stage = stageOf(item.word);
        const i = state.view;
        const given = state.answers[i];

        // ‹ and › in the band: back to the card before and on to the next --
        // see step -- each switched off where there is nowhere to go
        const nav = (cls, label, path, ok) => `<button class="${cls}" aria-label="${label}" title="${label}" ${ok ? '' : 'disabled'} style="display: flex; align-items: center; justify-content: center; width: 22px; height: 18px; padding: 0; border: none; border-radius: 5px; background: transparent; color: ${p.labelInk}; opacity: ${ok ? 0.85 : 0.25}; cursor: ${ok ? 'pointer' : 'default'};">${NAV_ICON(path)}</button>`;

        // A card answered before shows how: a tick or a cross in its band
        const mark = given ? `<span title="${given.result === 1 ? 'Answered: know' : 'Answered: don\'t know'}" style="display: flex; align-items: center; justify-content: center; width: 15px; height: 15px; margin-right: 4px; border-radius: 50%; background: ${given.result === 1 ? p.know : p.flip}; border: 1px solid ${p.line}; color: #ffffff;">${NAV_ICON(given.result === 1 ? 'M6 12.5l4 4L18 8' : 'M7.5 7.5l9 9M16.5 7.5l-9 9')}</span>` : '';

        const band = `<span class="flashcards-band" style="position: absolute; left: 12px; right: 6px; top: 0; height: ${BAND}px; display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 10.2px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${p.labelInk}; pointer-events: none;">Box ${boxOf(stage)}</span>
            <span style="display: flex; align-items: center; gap: 2px;">${mark}${nav('flashcards-prev', 'Previous card', 'M15 5l-7 7 7 7', canStep(-1))}${nav('flashcards-next', 'Next card', 'M9 5l7 7-7 7', canStep(1))}</span>
        </span>`;

        const word = `font-size: ${WORD_SIZE}px; font-weight: 700; line-height: 1.15; color: ${p.ink}; text-align: center; word-break: break-word;`;

        return `<div class="flashcards-card" style="position: absolute; left: 0; top: 0; width: ${CARD_W}px; height: ${CARD_H}px; perspective: 1000px; transform: ${REST};">
            <div class="flashcards-flipper-inner" id="card-inner" style="width: 100%; height: 100%; position: relative; transform-style: preserve-3d; transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1); transform: ${state.isFlipped ? TURNED : UNTURNED};">
                <div class="card-face-front" data-press title="Turn the card over" style="${faceStyle(p.tablePaper, bandOf(stage), false)}">
                    ${band}
                    <div class="flashcards-word-text" style="${word}">${speech.speakerHtml(item.word.original, item.originalLang, p.sayIcon, SAY_LEAD)}${escapeText(item.word.original)}</div>
                </div>
                <div class="card-face-back" data-press title="Turn the card over" style="${faceStyle(p.tablePaperBack, p.backBand, true)}">
                    ${band}
                    <div class="flashcards-word-text" style="${word}">${speech.speakerHtml(item.word.translation, item.translationLang, p.sayIcon, SAY_LEAD)}${item.word.translation ? escapeText(item.word.translation) : '—'}</div>
                </div>
            </div>
        </div>`;
    }

    /*
     * Two buttons, the same two throughout: don't know, and know -- the
     * player says outright which it is, and turning the card over (a press
     * on it) says nothing either way (the owner's call, 20 November 2026).
     * Until then the left button was Flip, and seeing the back was the
     * mistake.
     *
     * Icons rather than words -- the owner's call, 11 November 2026: the
     * game is played by people learning a language, often in an interface
     * language that is not theirs. A cross for don't know and a tick for
     * know, each laid on a card.
     *
     * The arrows at the outer ends stay: they are the keys (← and →) and
     * need no language either. The words stay too, as the buttons' names for
     * a screen reader and the tooltip.
     *
     * Coloured as the buttons of the pictures, a terracotta and a sage, drawn
     * round in the shelf's ink and raised on an edge of their own colour: a
     * button in a cabinet of cardboard and wood is a thing that is pressed
     * down, and shows it.
     */
    const ICON = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

    // The card both icons stand on, cut round whatever is drawn over it
    // -- the mask, whose id has to be the icon's own, as both are on the
    // page at once
    const onCard = (gap, over) => `<svg ${ICON} width="28" height="28">`
        + `<defs><mask id="${gap}" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">`
        + `<rect width="24" height="24" fill="white" />${over.replace(/<path /g, '<path stroke="black" ').replace(/stroke-width="([\d.]+)"/g, (_, w) => `stroke-width="${+w + 2.8}"`).replace(/fill="currentColor"/g, 'fill="black"')}`
        + '</mask></defs>'
        + `<g mask="url(#${gap})"><rect x="3.5" y="3" width="13" height="17.5" rx="2.6" transform="rotate(-10 10 11.75)" fill="currentColor" fill-opacity="0.5" stroke="none" /></g>`
        + `${over}</svg>`;

    const DUNNO_ICON = onCard('flashcards-dunno-gap', '<path d="M8 8l10 10M18 8L8 18" stroke-width="3" />');
    const KNOW_ICON = onCard('flashcards-know-gap', '<path d="M6.5 12.5l4 4L20.5 6" stroke-width="3" />');

    const KEY_LEFT = `<svg ${ICON} width="16" height="16" stroke-width="2.4" style="opacity: 0.8;"><path d="M19 12H5" /><path d="M11 6l-6 6 6 6" /></svg>`;
    const KEY_RIGHT = `<svg ${ICON} width="16" height="16" stroke-width="2.4" style="opacity: 0.8;"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>`;

    const CLOSE_ICON = `<svg ${ICON} width="14" height="14" stroke-width="2.6"><path d="M6 6l12 12M18 6L6 18" /></svg>`;

    const BUTTON = 'flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; height: 46px; padding: 0 8px; box-sizing: border-box; border-radius: 13px; cursor: pointer; color: #ffffff; transition: transform 0.08s, box-shadow 0.08s;';

    const lifted = (edge) => `0 3px 0 ${edge}, 0 6px 12px rgba(40, 25, 12, 0.22)`;
    const raised = (edge) => `box-shadow: ${lifted(edge)};`;

    // Pressed down onto its edge while the finger is on it
    function press(btn, edge) {
        const down = () => {
            btn.style.transform = 'translateY(2px)';
            btn.style.boxShadow = `0 1px 0 ${edge}, 0 3px 6px rgba(40, 25, 12, 0.2)`;
        };
        const up = () => {
            btn.style.transform = '';
            btn.style.boxShadow = lifted(edge);
        };
        btn.addEventListener('pointerdown', down);
        btn.addEventListener('pointerup', up);
        btn.addEventListener('pointerleave', up);
        btn.addEventListener('pointercancel', up);
    }

    /*
     * The table: the cabinet dimmed under a wash, the card on it and the two
     * buttons under the card -- the card alone, with nothing showing under
     * it: cards come out of a box one at a time (the owner). A press on the
     * wash -- or on the cross in its corner -- puts the card back in its box
     * and leaves the run, which is the way back to the shelf: a run is every
     * ready card in a box, forty of them in a box of new words, and nobody
     * should have to answer forty to choose another box.
     */
    function overlayHtml() {
        const p = palette;

        return `<div class="flashcards-overlay" style="position: absolute; left: 0; top: 0; right: 0; bottom: 0; z-index: 3; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 13px;">
            <div class="flashcards-wash" data-press style="position: absolute; left: 0; top: 0; right: 0; bottom: 0; border-radius: 10px; background: ${p.wash}; cursor: pointer;"></div>
            <button class="flashcards-close" aria-label="Back to the shelf" title="Back to the shelf" style="position: absolute; top: 8px; right: 8px; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; padding: 0; box-sizing: border-box; border-radius: 50%; background: ${p.labelPaper}; border: 1.3px solid ${p.line}; box-shadow: inset 0 0 0 2px ${p.brass}, 0 2px 4px rgba(30, 18, 8, 0.3); color: ${p.labelInk}; cursor: pointer;">${CLOSE_ICON}</button>
            <div class="flashcards-card-slot" style="position: relative; width: ${CARD_W}px; height: ${CARD_H}px; flex: none;"></div>
            <div class="flashcards-buttons-row" style="position: relative; display: flex; gap: 10px; width: ${CARD_W}px; flex: none;">
                <button class="flashcards-btn-dunno" id="btn-dunno" aria-label="Don't know" title="I don't know it" style="${BUTTON} border: 1.3px solid ${p.line}; background: ${p.flip}; ${raised(p.flipEdge)}">${KEY_LEFT}${DUNNO_ICON}</button>
                <button class="flashcards-btn-know" id="btn-know" aria-label="Know" title="I know it" style="${BUTTON} border: 1.3px solid ${p.line}; background: ${p.know}; ${raised(p.knowEdge)}">${KNOW_ICON}${KEY_RIGHT}</button>
            </div>
        </div>`;
    }

    const overlayEl = () => (stageEl ? stageEl.querySelector('.flashcards-overlay') : null);
    const cardEl = () => (stageEl ? stageEl.querySelector('.flashcards-card') : null);

    // The table's furniture, which comes and goes with the card on it
    const TABLE = ['.flashcards-wash', '.flashcards-shade', '.flashcards-beam', '.flashcards-buttons-row', '.flashcards-close'];

    /*
     * The lamp pressed: the light on or off, which is the theme -- the panel's
     * switch, see page.switchTheme -- with the click of a switch, and, going
     * on, a flicker as the bulb catches.
     *
     * It is a switch with a card on the table too (the owner). The table is
     * placed clear of it, and the wash has a hole round it, so it is in view
     * -- see placeTable; but a press on it is still a press on the wash,
     * which would put the card away, so the wash asks first whether the
     * press landed on the lamp.
     */
    let lampTurn = 0;

    function switchLamp() {
        if (busy) return;

        sfx.note(0, 2600, 1700, 0.025, 0.08, 'triangle');
        sfx.note(28, 900, 650, 0.035, 0.05);

        page.switchTheme();

        if (!stageEl) return;

        const L = layoutOf();
        const from = poseOf(!isNight, L);
        const to = poseOf(isNight, L);
        const token = ++lampTurn;

        // Up first, in the dark; then the light, catching once
        const RISE = 560;

        /*
         * The room first and the lamp after it (the owner, on a weak phone,
         * 21 November 2026): the whole shelf has just been drawn again in the
         * other theme, the heaviest frame there is, and a lamp set moving in
         * that same frame lost the start of its move to it, in both
         * directions. So the lamp waits in the pose it had until the new room
         * is on the screen, its layers made ready meanwhile, and only then
         * moves; at night all that comes on with it waits too, held where it
         * starts -- and the bulbs' twinkling until every string is lit.
         */
        poseLamp(from);
        readyLamp(true);

        const held = [];

        if (isNight && MOTION) {
            // The light comes on and trembles once, a little -- it does not
            // drop back towards dark (the owner). The shade outside the cone
            // with it, not before it: a card on the table had its edges and
            // its buttons dark before the lamp was on (the owner)
            const flicker = [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0.85, offset: 0.5 }, { opacity: 1 }];

            stageEl.querySelectorAll('.flashcards-lamp-glow, .flashcards-lamplight, .flashcards-beam, .flashcards-shade').forEach(el => held.push(el.animate(flicker, { duration: 380, delay: RISE - 60, easing: 'linear', fill: 'backwards' })));
            held.push(...lightUp());
            holdTwinkle(true);
        }

        held.forEach(a => a.pause());

        afterPaint(() => {
            if (token !== lampTurn || !stageEl) return;

            held.forEach(a => a.play());
            moveLamp(from, to, isNight ? RISE : 420);

            if (isNight) setTimeout(() => {
                if (token === lampTurn && !tableUp) holdTwinkle(false);
            }, LIT_UP);
        });
    }

    function onLamp(e) {
        const lamp = stageEl && stageEl.querySelector('.flashcards-lamp');
        if (!lamp) return false;

        const box = lamp.getBoundingClientRect();
        return e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom;
    }

    /*
     * Where the card and its buttons stand: in the middle of the cabinet, or
     * higher if the middle would put the buttons over the lamp -- on the
     * narrow shelf it would, the lamp standing on the bottom shelf, under the
     * Know button. The lamp is a switch with a card out as well (the owner),
     * so it has to be there to press: clear of the table, and seen through a
     * hole in the wash round it.
     */
    const TABLE_H = CARD_H + 13 + 46;

    // How far down the stage the card stands, for a stage this tall
    function tableTop(height) {
        const lamp = stageEl.querySelector('.flashcards-spare');
        const middle = (height - TABLE_H) / 2;
        const clear = lamp ? offsetIn(lamp).y - TABLE_H - 6 : middle;

        return Math.round(Math.max(10, Math.min(middle, clear)));
    }

    function placeTable(overlay) {
        overlay.style.paddingTop = `${tableTop(overlay.offsetHeight)}px`;

        const lamp = stageEl.querySelector('.flashcards-spare');
        if (!lamp) return;

        const at = offsetIn(lamp);
        const f = (v) => Math.round(v * 10) / 10;
        const h = lamp.offsetHeight;
        const hole = `radial-gradient(circle at ${f(at.x + lamp.offsetWidth * 0.55)}px ${f(at.y + h * 0.55)}px, transparent ${f(h * 0.34)}px, #000 ${f(h * 0.62)}px)`;
        const wash = overlay.querySelector('.flashcards-wash');

        wash.style.webkitMaskImage = hole;
        wash.style.maskImage = hole;
    }

    /*
     * At night, the lamp's light: a cone from the lamp's head, in the free
     * place at the end of the shelf, towards where the card is laid and on
     * past it, fading as it goes -- wide, so that most of the card is in it.
     *
     * There whether a card is out or not (the owner): over the boxes on the
     * shelf -- see drawNight -- and, with a card out, over the table as well.
     * Both are worked out here, the same cone, aimed at where the card stands
     * whether it is there yet or not, so that the one lies exactly on the
     * other when the card comes.
     *
     * Wider on its lower side than on its upper (the owner): the lower edge
     * runs low enough for more than half of the Flip button to be in the
     * light. Turned ten degrees clockwise from the line to the card's middle
     * (the owner, five and five more; the lamp's head with it, see `aim`). Long, and fading slowly
     * all the way to the cabinet's edge, so that it never stops at a line. Its
     * sides are near enough sharp -- the light of a lamp with a shade on it;
     * blurred further, they were a glow and not a beam (the owner).
     *
     * Over the table, two layers over everything on it -- the wash, the card,
     * the buttons (the owner) -- so that the cone shows across all three:
     *
     *   the shade   darkens what is outside the cone a little, more the
     *               farther it is from the lamp -- a little: at first it went
     *               nearly black, which was too much (the owner)
     *   the light   lightens what is inside it (screen), warmest near the lamp
     *
     * The card is paper a shade darker at night for the light to show on
     * (tablePaper). The cross in the corner is laid over both, to stay seen.
     * Neither takes a press, see showTable.
     */
    // How strong the light is, the same over the shelf and over the table:
    // with a card out the cone over the shelf goes, the one over the table
    // comes, and the light is no brighter for it (the owner)
    const BEAM_STRENGTH = 0.45;

    const BEAM_UP = 0.5;
    const BEAM_DOWN = 0.95;
    const BEAM_TURN = 10 * Math.PI / 180;

    function coneOf() {
        const lamp = lampSpot();
        if (!lamp) return null;

        const f = (v) => Math.round(v * 10) / 10;
        const W = stageEl.offsetWidth;
        const H = stageEl.offsetHeight;

        const centre = { x: W / 2, y: tableTop(H) + CARD_H / 2 };
        const axis = Math.atan2(centre.y - lamp.y, centre.x - lamp.x) + BEAM_TURN;
        const near = Math.hypot(centre.x - lamp.x, centre.y - lamp.y);
        const reach = near * 3.2;
        const ray = (turn) => [lamp.x + Math.cos(axis + turn) * reach, lamp.y + Math.sin(axis + turn) * reach];
        const side = [-Math.sin(axis) * 4, Math.cos(axis) * 4];

        const points = [
            [lamp.x + side[0], lamp.y + side[1]],
            ray(BEAM_UP),
            ray(-BEAM_DOWN),
            [lamp.x - side[0], lamp.y - side[1]]
        ].map(([x, y]) => `${f(x)},${f(y)}`).join(' ');

        // Where the light has faded out: a good way past the card
        const end = { x: lamp.x + Math.cos(axis) * near * 2.2, y: lamp.y + Math.sin(axis) * near * 2.2 };

        return { lamp, near, points, end, W, H };
    }

    // The light of the cone, screened over whatever is under it, clipped to
    // the cabinet: the light falls inside it, not on the page
    function lightSvg(cone, cls, id, css, strength) {
        const f = (v) => Math.round(v * 10) / 10;
        const { lamp, end, points, W, H } = cone;
        const k = strength || 1;
        const stop = (at, alpha) => `<stop offset="${at}" stop-color="#ffd38c" stop-opacity="${Math.round(alpha * k * 1000) / 1000}" />`;

        return `<svg class="${cls}" aria-hidden="true" width="${W}" height="${H}" style="position: absolute; left: 0; top: 0; overflow: hidden; border-radius: 10px; pointer-events: none; mix-blend-mode: screen; ${css || ''}">
            <defs>
                <linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(lamp.x)}" y1="${f(lamp.y)}" x2="${f(end.x)}" y2="${f(end.y)}">${stop(0, 0.58)}${stop(0.2, 0.38)}${stop(0.45, 0.2)}${stop(0.72, 0.08)}${stop(1, 0)}</linearGradient>
                <filter id="${id}-edge" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.2" /></filter>
            </defs>
            <polygon points="${points}" fill="url(#${id})" filter="url(#${id}-edge)" />
        </svg>`;
    }

    function beam(overlay) {
        overlay.querySelectorAll('.flashcards-beam, .flashcards-shade').forEach(el => el.remove());

        const cone = coneOf();
        if (!cone) return;

        const f = (v) => Math.round(v * 10) / 10;
        const { lamp, near, points, W, H } = cone;

        // The last things on the table, so that they lie over all the rest
        $(overlay, `<svg class="flashcards-shade" aria-hidden="true" width="${W}" height="${H}" style="position: absolute; left: 0; top: 0; overflow: hidden; border-radius: 10px; pointer-events: none;">
            <defs>
                <filter id="fc-cone-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.5" /></filter>
                <mask id="fc-cone-cut" maskUnits="userSpaceOnUse" x="-40" y="-40" width="${W + 80}" height="${H + 80}"><rect x="-40" y="-40" width="${W + 80}" height="${H + 80}" fill="#ffffff" /><polygon points="${points}" fill="#000000" filter="url(#fc-cone-soft)" /></mask>
                <radialGradient id="fc-shade-fall" gradientUnits="userSpaceOnUse" cx="${f(lamp.x)}" cy="${f(lamp.y)}" r="${f(near * 2.2)}"><stop offset="0" stop-color="#04050d" stop-opacity="0" /><stop offset="0.25" stop-color="#04050d" stop-opacity="0.1" /><stop offset="0.6" stop-color="#04050d" stop-opacity="0.2" /><stop offset="1" stop-color="#04050d" stop-opacity="0.3" /></radialGradient>
            </defs>
            <rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="url(#fc-shade-fall)" mask="url(#fc-cone-cut)" />
        </svg>`);

        $(overlay, lightSvg(cone, 'flashcards-beam', 'fc-beam', '', BEAM_STRENGTH));

        overlay.appendChild(overlay.querySelector('.flashcards-close'));
    }

    function ensureOverlay() {
        let overlay = overlayEl();
        if (overlay) return overlay;

        overlay = $(stageEl, overlayHtml());
        placeTable(overlay);
        if (isNight) beam(overlay);

        // Laid out unseen, and brought in by showTable
        // (The beam is only there at night)
        TABLE.forEach(sel => {
            const el = overlay.querySelector(sel);
            if (!el) return;
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
        });

        const wash = overlay.querySelector('.flashcards-wash');

        // Marked before the click is counted (the analytics listen in the
        // capture phase): `flashcards-wash|||lamp` is the lamp switched
        // through the wash, the bare class the card put away
        wash.addEventListener('pointerdown', (e) => { wash.dataset.press = onLamp(e) ? 'lamp' : ''; });
        wash.addEventListener('click', (e) => (onLamp(e) ? switchLamp() : putBack()));
        overlay.querySelector('.flashcards-close').addEventListener('click', putBack);

        const dunnoBtn = overlay.querySelector('#btn-dunno');
        const knowBtn = overlay.querySelector('#btn-know');

        press(dunnoBtn, palette.flipEdge);
        press(knowBtn, palette.knowEdge);

        dunnoBtn.addEventListener('click', () => answer(0));
        knowBtn.addEventListener('click', () => answer(1));

        return overlay;
    }

    // The card for the item, laid in the slot and wired: a press on a face
    // turns the card over, except on its speaker, which says the word in that
    // face's language, and on the arrows in its band
    function layCard(item) {
        const overlay = ensureOverlay();
        const slot = overlay.querySelector('.flashcards-card-slot');

        const was = slot.querySelector('.flashcards-card');
        if (was) was.remove();

        const card = $(slot, cardHtml(item));

        [['.card-face-front', item.word.original, item.originalLang], ['.card-face-back', item.word.translation, item.translationLang]].forEach(([sel, text, lang]) => {
            card.querySelector(sel).addEventListener('click', (e) => {
                if (e.target.closest('.flashcards-prev')) return step(-1);
                if (e.target.closest('.flashcards-next')) return step(1);

                const speaker = e.target.closest('.say-all');
                if (speaker) return sayFrom(speaker, text, lang);

                flip();
            });
        });

        // Both faces, and both now: the back is turned away but it is laid out
        // all the same, and a size worked out only when it comes round would be
        // worked out in the middle of the turn.
        fitWord(card.querySelector('.card-face-front'));
        fitWord(card.querySelector('.card-face-back'));

        return card;
    }

    // The table's furniture in and out: the wash, the buttons, the cross, and
    // at night the lamp's beam, drawn again each time -- the shelf may have
    // grown under the table since it was last shown. `instant` for a table
    // that was up already and is only drawn again (the theme switched, the
    // voices came): faded in anew, the buttons went out and came back while
    // the lamp was switched (the owner)
    function showTable(on, instant) {
        const overlay = overlayEl();
        if (!overlay) return;

        tableUp = on;
        holdTwinkle(on);

        if (on) {
            placeTable(overlay);

            if (isNight) {
                beam(overlay);
                overlay.querySelectorAll('.flashcards-beam, .flashcards-shade').forEach(el => { el.style.opacity = '0'; });
            }
        }

        const fade = (el, to) => {
            if (!el) return;
            // The beam and its shade are light, and never take a press: they
            // lie over the wash and the lamp, and would swallow the presses
            // meant for them
            const light = el.classList.contains('flashcards-beam') || el.classList.contains('flashcards-shade');
            el.style.pointerEvents = to && !light ? '' : 'none';
            el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: to }], { duration: instant ? 0 : dur(220), easing: 'ease-out', fill: 'forwards' });
        };

        TABLE.forEach(sel => fade(overlay.querySelector(sel), on ? 1 : 0));

        // The cone over the shelf gives way to the one over the table
        const shelfCone = stageEl.querySelector('.flashcards-shelf-cone');
        if (shelfCone) shelfCone.animate([{ opacity: getComputedStyle(shelfCone).opacity }, { opacity: on ? 0 : 1 }], { duration: instant ? 0 : dur(220), easing: 'ease-out', fill: 'forwards' });
    }

    /*
     * ---- Flights ----
     *
     * A card out of a box: from the box's opening, small and askew, up out of
     * it and over to the table, growing on the way. And back into one: lifted
     * over the box, and dropped in.
     *
     * The wash goes while the card flies home, so that the box it lands in is
     * seen as it lands, and comes back with the next card.
     */
    function flyOut(card, box) {
        const from = mouthOf(box);
        const at = offsetIn(card.parentNode);
        const dx = from.x - (at.x + CARD_W / 2);
        const dy = from.y - (at.y + CARD_H / 2);
        const s = layoutOf().w * 0.62 / CARD_W;

        return card.animate([
            { transform: `translate(${dx}px, ${dy + 6}px) scale(${s}) rotate(-6deg)`, opacity: 0 },
            { transform: `translate(${dx}px, ${dy - 16}px) scale(${s * 1.15}) rotate(-4deg)`, opacity: 1, offset: 0.22 },
            { transform: REST, opacity: 1 }
        ], { duration: dur(520), easing: 'cubic-bezier(0.3, 0.7, 0.2, 1)' });
    }

    function flyIn(card, box) {
        const to = mouthOf(box);
        const at = offsetIn(card.parentNode);
        const dx = to.x - (at.x + CARD_W / 2);
        const dy = to.y - (at.y + CARD_H / 2);
        const s = layoutOf().w * 0.62 / CARD_W;

        return card.animate([
            { transform: REST, opacity: 1 },
            { transform: `translate(${dx}px, ${dy - 24}px) scale(${s * 1.08}) rotate(5deg)`, opacity: 1, offset: 0.72 },
            { transform: `translate(${dx}px, ${dy + 8}px) scale(${s}) rotate(3deg)`, opacity: 0 }
        ], { duration: dur(560), easing: 'ease-in-out', fill: 'forwards' });
    }

    /*
     * Not known: the card counts its way down (the owner, 22 November 2026).
     * Off the table to the box it came out of, then box by box back towards
     * the one it goes to, touching each on the way -- a tick, a step lower
     * each time, and the box nods under it -- and into the last. Three boxes
     * for a mistake, the penalty in srs.js; fewer near box 1, which nothing
     * goes below; four for an answer changed from know to don't know, which
     * takes back the step up as well (see answer). One animation for the
     * whole way, its hops written out as keyframes, so that it is the
     * browser's to run like any other flight; the ticks are timed alongside
     * it, and dropped if the shelf is drawn again meanwhile.
     */
    function countDown(card, from, dest) {
        const token = drawn;
        const at = offsetIn(card.parentNode);
        const s = layoutOf().w * 0.62 / CARD_W;
        const round = (v) => Math.round(v * 10) / 10;

        // Over a box, the card's lower edge on its opening
        const over = (n) => {
            const m = mouthOf(boxEl(n));
            return { x: m.x - (at.x + CARD_W / 2), y: m.y - (at.y + CARD_H / 2) - CARD_H * s / 2 };
        };
        const pose = (x, y, scale, deg, opacity, offset, easing) => ({
            transform: `translate(${round(x)}px, ${round(y)}px) scale(${round(scale * 1000) / 1000}) rotate(${round(deg)}deg)`,
            opacity, offset, ...(easing ? { easing } : {})
        });

        const LEG = 420;
        const HOP = 250;
        const PEAK = 20;
        const SAMPLES = 6;
        const hops = from - dest;
        const total = LEG + hops * HOP;

        const start = over(from);
        const frames = [
            { transform: REST, opacity: 1, offset: 0, easing: 'ease-in-out' },
            pose(start.x, start.y - 6, s * 1.08, 5, 1, LEG / total)
        ];

        let a = start;
        for (let k = 1; k <= hops; k++) {
            const last = k === hops;
            const b = over(from - k);
            // The last hop goes on down into the box, fading as it goes in,
            // as every flight home does (flyIn)
            const end = last ? { x: b.x, y: b.y + CARD_H * s / 2 + 8 } : b;

            for (let i = 1; i <= SAMPLES; i++) {
                const t = i / SAMPLES;
                const along = t * t * (3 - 2 * t);
                const x = a.x + (end.x - a.x) * along;
                const y = a.y + (end.y - a.y) * t - PEAK * 4 * t * (1 - t);
                const fade = last && t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
                frames.push(pose(x, y, last ? s * (1.08 - 0.08 * t) : s * 1.08, 5 - 7 * Math.sin(Math.PI * t), fade, (LEG + (k - 1 + t) * HOP) / total));
            }

            a = b;

            // A touch on each box on the way; the landing has its own sound
            // and nod (putAway)
            if (!last) setTimeout(() => {
                if (token !== drawn) return;
                bump(boxEl(from - k));
                const f = 1046 * Math.pow(2, -2 * (k - 1) / 12);
                sfx.note(0, f, f * 0.84, 0.08, 0.07, 'triangle');
            }, LEG + k * HOP);
        }

        return card.animate(frames, { duration: total, easing: 'linear', fill: 'forwards' });
    }

    const settled = (animation) => animation.finished.catch(() => null);

    // Rays round a box: a card landing up (sage), down (terracotta), or a box
    // played out (gold, and wider)
    function burst(box, colour, big) {
        if (!box || !MOTION) return;

        const at = offsetIn(box);
        const size = Math.max(box.offsetWidth, box.offsetHeight) * (big ? 1.5 : 1.25);
        const cx = at.x + box.offsetWidth / 2;
        const cy = at.y + box.offsetHeight / 2 + 4;

        const rays = Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2 + 0.3;
            const r1 = 34;
            const r2 = big ? 47 : 43;
            return `<line x1="${50 + Math.cos(a) * r1}" y1="${50 + Math.sin(a) * r1}" x2="${50 + Math.cos(a) * r2}" y2="${50 + Math.sin(a) * r2}" />`;
        }).join('');

        const svg = $(stageEl, `<svg viewBox="0 0 100 100" aria-hidden="true" style="position: absolute; left: ${cx - size / 2}px; top: ${cy - size / 2}px; width: ${size}px; height: ${size}px; z-index: 4; pointer-events: none; overflow: visible;" fill="none" stroke="${colour}" stroke-width="${big ? 4 : 3.4}" stroke-linecap="round">${rays}</svg>`);

        settled(svg.animate([
            { transform: 'scale(0.7)', opacity: 0 },
            { transform: 'scale(0.95)', opacity: 1, offset: 0.3 },
            { transform: 'scale(1.18)', opacity: 0 }
        ], { duration: big ? 720 : 520, easing: 'ease-out' })).then(() => svg.remove());
    }

    function bump(box) {
        if (!box) return;
        box.animate([
            { transform: 'scale(1)' },
            { transform: 'scale(1.07, 0.95)', offset: 0.3 },
            { transform: 'scale(0.98, 1.03)', offset: 0.65 },
            { transform: 'scale(1)' }
        ], { duration: dur(320), easing: 'ease-out' });
    }

    /*
     * A box with nothing ready in it, pressed: it shakes, and a kitchen timer
     * comes up on it with the time until its first card is ready, the hand
     * ticking round -- the owner's call, 20 November 2026, in place of the
     * dialog the catalog shows. An empty box only shakes.
     */
    function refuse(box, soonest) {
        if (!box) return;

        box.animate([
            { transform: 'translateX(0) rotate(0)' },
            { transform: 'translateX(-4px) rotate(-2deg)', offset: 0.15 },
            { transform: 'translateX(4px) rotate(2deg)', offset: 0.35 },
            { transform: 'translateX(-3px) rotate(-1.4deg)', offset: 0.55 },
            { transform: 'translateX(2px) rotate(0.8deg)', offset: 0.75 },
            { transform: 'translateX(0) rotate(0)' }
        ], { duration: dur(460), easing: 'ease-out' });

        if (!soonest) {
            sfx.thud();
            return;
        }

        // Tick, tock, tick, tock: a high and a lower click by turns
        [0, 260, 520, 780].forEach((t, k) => sfx.note(t, k % 2 ? 1500 : 2100, k % 2 ? 1500 : 2100, 0.03, 0.07, 'triangle'));

        const was = box.querySelector('.flashcards-timer');
        if (was) was.remove();

        const p = palette;
        const L = layoutOf();

        const timer = $(box, `<span class="flashcards-timer" aria-hidden="true" style="position: absolute; left: 50%; top: ${Math.max(0, L.rimTop - 6)}px; z-index: 2; display: inline-flex; align-items: center; gap: 3px; padding: 2.5px 7px 2.5px 4px; border-radius: 99px; background: ${p.labelPaper}; border: 1.3px solid ${p.line}; box-shadow: 0 3px 6px rgba(30, 18, 8, 0.3); font-size: ${L.badgeFont}px; font-weight: 700; line-height: 1; color: ${p.labelInk}; white-space: nowrap; transform: translateX(-50%); pointer-events: none;">
            <svg viewBox="0 0 24 24" width="${L.badgeIcon}" height="${L.badgeIcon}" fill="none" stroke="${p.labelInk}" stroke-width="2.6" stroke-linecap="round" style="display: block; flex: none;">
                <circle cx="12" cy="13" r="8.4" /><path d="M10 2.6h4M12 2.6v2" />
                <path class="flashcards-timer-hand" d="M12 13V8.2" style="transform-box: view-box; transform-origin: 12px 13px;" />
            </svg>${timerText(soonest)}</span>`);

        timer.animate([
            { transform: 'translateX(-50%) scale(0.5)', opacity: 0 },
            { transform: 'translateX(-50%) scale(1.08)', opacity: 1, offset: 0.08 },
            { transform: 'translateX(-50%) scale(1)', opacity: 1, offset: 0.14 },
            { transform: 'translateX(-50%) scale(1)', opacity: 1, offset: 0.86 },
            { transform: 'translateX(-50%) scale(0.9)', opacity: 0 }
        ], { duration: 2400, easing: 'linear', fill: 'forwards' }).finished.catch(() => null).then(() => timer.remove());

        // The hand goes round in steps, as a timer's does
        const hand = timer.querySelector('.flashcards-timer-hand');
        if (MOTION) hand.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 2000, easing: 'steps(8, end)' });
    }

    /*
     * ---- The run ----
     *
     * Choosing a box deals a run: its ready cards, shuffled, one after the
     * other until none is left -- which is the goal the owner set, every card
     * out of one box and into another. A new run on the same page after the
     * last was played out goes the way snake's "Grow more" does: the session
     * the last one ended is opened again (page.reopen), so that the run is
     * written, saved and offered by the catalog like any other.
     */
    function openBox(n) {
        if (busy || state.sessionPool) return;

        const setId = state.selectedSetId;
        const box = boxEl(n);
        const inBox = store.wordsOf(setId).filter(item => boxOf(stageOf(item.word)) === n);

        if (!inBox.length) return refuse(box, null);

        const due = store.duePool(setId, false).filter(item => boxOf(stageOf(item.word)) === n);

        if (!due.length && !earlyAllowed()) {
            const soonest = inBox.reduce((first, item) => {
                const at = spacedRepetitions.getWordProgress(item.word).nextRepetition;
                return at && (!first || at < first) ? at : first;
            }, null);

            return refuse(box, soonest);
        }

        // Ahead of the timers, everything the box holds -- duePool's own
        // answer when nothing is due, shuffled as it shuffles
        const pool = due.length ? due : store.duePool(setId, true).filter(item => boxOf(stageOf(item.word)) === n);

        if (closed) {
            page.reopen();
            closed = false;
        }

        state.sessionPool = pool;
        state.currentIndex = 0;
        state.view = 0;
        state.answers = [];
        state.isFlipped = false;

        // When this run was dealt its words, which is what every answer in it
        // will be stamped with -- see store.recordRepetition. Kept in the
        // saved state so that closing the popup mid-run does not start a
        // second one in the records.
        state.sessionAt = Date.now();

        page.save();
        takeOut();
    }

    // The card in view up out of its box and onto the table
    function takeOut() {
        busy = true;
        const token = drawn;

        held = state.sessionPool[state.view];
        openNumber = boxOf(stageOf(held.word));
        refreshBoxes();

        const box = boxEl(openNumber);
        const card = layCard(held);

        showTable(true);
        sfx.whoosh();

        settled(flyOut(card, box)).then(() => {
            if (token !== drawn) return;
            busy = false;
        });
    }

    // The card turned over and back, by hand rather than by a redraw: the
    // turn is half a second of animation, and rebuilding the card mid-turn
    // would start it again from wherever it had got to. It answers nothing.
    function flip() {
        if (busy || !held) return;

        sfx.whoosh();
        state.isFlipped = !state.isFlipped;

        const inner = stageEl.querySelector('#card-inner');
        if (inner) inner.style.transform = state.isFlipped ? TURNED : UNTURNED;

        page.save();
    }

    /*
     * Know (1) or don't know (0), said outright with the buttons.
     *
     * A card answered before -- gone back to with ‹ -- answered the same way
     * again is only moved on from; answered the other way, the first answer
     * is taken out of the word's history (store.forgetRepetition) and the new
     * one written in its place, and the card goes to the box the new one puts
     * it in.
     *
     * Either way the card then goes to the box of the stage it is on now,
     * which srs.js decides: up one for a right answer on time, nowhere for a
     * right answer ahead of the timer, and down by the penalty for a wrong one
     * (three stages, never below box 1). The game draws where it goes and has
     * no say in it. Then the next card of the run comes out.
     */
    function answer(result) {
        if (busy || !held) return;

        const item = held;
        const i = state.view;
        const was = state.answers[i];

        if (!was || was.result !== result) {
            if (was) store.forgetRepetition(item, was.at);

            const entry = store.recordRepetition(item, result, 'flashcards', { at: state.sessionAt, size: state.sessionPool.length });
            state.answers[i] = { result, at: entry.timestamp };
        }

        // Known: the chime of the stage the word has come to; not known, the
        // mistake's falling tone -- see sfx
        if (result === 1) sfx.chime(stageOf(item.word));
        else sfx.lose(0);

        if (i === state.currentIndex) state.currentIndex += 1;
        state.view = i + 1;
        state.isFlipped = false;

        const last = state.view >= state.sessionPool.length;

        // Closed before the flight rather than after it: the popup may be shut
        // while the card is in the air, and the run is over either way
        if (last) closeRun('done');
        else page.save();

        store.save();

        putAway(item, last ? 'done' : 'next', result === 0);
    }

    /*
     * ‹ and › on the card (the owner's call, 20 November 2026): back to the
     * card answered before this one, to look again or answer it the other
     * way, and on again towards the first card not yet answered -- never past
     * it. The card on the table goes back into its box and the other comes
     * out of its own.
     */
    function canStep(by) {
        const to = state.view + by;
        if (!state.sessionPool || to < 0 || to > state.currentIndex) return false;
        return to === state.currentIndex || !!state.answers[to];
    }

    function step(by) {
        if (busy || !held || !canStep(by)) return;

        const item = held;
        sfx.whoosh();

        state.view += by;
        state.isFlipped = false;
        page.save();

        putAway(item, 'next');
    }

    // The card back into the box it is in now, and the run left -- see
    // overlayHtml
    function putBack() {
        if (busy || !held) return;

        const item = held;
        sfx.whoosh();

        closeRun('shelf');
        putAway(item, 'shelf');
    }

    function closeRun(why) {
        state.sessionPool = null;
        state.currentIndex = 0;
        state.view = 0;
        state.answers = [];
        state.isFlipped = false;
        state.sessionAt = null;

        closed = true;
        store.save();

        // `why` for the analytics: `done`, every card of the run answered;
        // `shelf`, put back half way; `set`, left for another set -- see
        // ANALYTICS.md
        return page.endSession(why);
    }

    // The card flies to the box of its stage, and what follows the landing:
    // the next card out, or the end of the run. `missed` for a card just
    // answered don't know, which counts its way down (countDown)
    function putAway(item, then, missed) {
        busy = true;
        const token = drawn;
        const from = openNumber;
        const dest = boxOf(stageOf(item.word));

        showTable(false);

        const box = boxEl(dest);
        const card = cardEl();
        const flight = missed && dest < from && MOTION ? countDown(card, from, dest) : flyIn(card, box);

        settled(flight).then(() => {
            if (token !== drawn) return;

            held = null;
            card.remove();
            refreshBoxes();

            bump(box);
            sfx.pop(0, 0.14, 0.09);

            if (dest > from) burst(box, palette.upRay);
            if (dest < from) burst(box, palette.downRay);

            if (then === 'next') return setTimeout(() => { if (token === drawn) takeOut(); }, dur(140));

            const overlay = overlayEl();
            if (overlay) overlay.remove();
            busy = false;

            // A box played out: every card that was ready in it has gone
            if (then === 'done') {
                setTimeout(() => {
                    if (token !== drawn) return;
                    bump(boxEl(from));
                    sfx.caught();
                }, dur(260));
            }
        });
    }

    /*
     * ---- The screen ----
     */
    function render() {
        closeSetMenu();
        container.innerHTML = '';
        twinkling = [];
        tableUp = false;

        // Whatever was in the air belongs to the screen that is gone
        drawn += 1;
        busy = false;
        clearInterval(refreshTimer);

        // A run whose last card was answered and whose flight was cut short:
        // over, as answer() had already said
        if (state.sessionPool && state.currentIndex >= state.sessionPool.length) closeRun('done');

        // The card in view is the first not yet answered, or one answered
        // before it that the run still knows the answer of
        if (state.sessionPool && !(state.view <= state.currentIndex && (state.view === state.currentIndex || state.answers[state.view]))) state.view = state.currentIndex;

        held = state.sessionPool ? state.sessionPool[state.view] : null;
        openNumber = held ? boxOf(stageOf(held.word)) : null;

        const set = store.sets().find(s => s.id === state.selectedSetId);
        const p = palette;

        const header = $(container, `<div class="flashcards-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6.8px;">
            <div class="flashcards-header-info" style="display: flex; flex: 1; align-items: center; gap: 6.8px;">
                <a class="back-btn" href="index.html" title="Back" style="display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; width: 29px; height: 29px; flex: none; background: transparent; border: 1px solid ${p.chromeBorder}; border-radius: 10.2px; color: ${p.backBtn}; cursor: pointer; padding: 0; text-decoration: none;"><svg viewBox="0 0 24 24" width="18.8" height="18.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12H5" /><path d="M11 6l-6 6 6 6" /></svg></a>
            </div>
            <button class="flashcards-title" aria-haspopup="listbox" aria-expanded="false" title="Choose a set" style="position: relative; display: flex; flex: 0 1 auto; min-width: 0; max-width: 214px; justify-content: center; padding: 0; border: none; background: transparent; cursor: pointer; font-family: inherit;">${plateHtml(`${escapeText((set && set.title) || 'Flashcards')}${CHEVRON}`, 12.3, 11, 26, 4, p.titleTone)}</button>
        </div>`);

        header.style.position = 'relative';
        header.querySelector('.flashcards-title').addEventListener('click', () => toggleSetMenu(header));

        header.querySelector('.back-btn').addEventListener('click', (e) => {
            e.preventDefault();

            // Whatever is being said belongs to this screen and goes with it.
            speech.hush();
            page.home();
        });

        page.settingsButton(header, p.backBtn, p.chromeBorder);

        stageEl = $(container, `<div class="flashcards-stage" style="position: relative;">${cabinetHtml()}</div>`);
        drawNight();

        stageEl.addEventListener('click', (e) => {
            if (e.target.closest('.flashcards-lamp')) return switchLamp();

            const box = e.target.closest('.flashcards-box');
            if (!box || e.target.closest('.flashcards-overlay')) return;

            // Not left holding the focus, whose ring would stay round it
            box.blur();
            openBox(+box.dataset.box);
        });

        if (held) {
            layCard(held);
            showTable(true, true);
        }

        // The arrows once a page, over the shelf the player arrives at, and
        // the boxes' hops after them -- or at once, with no arrows to wait for
        if (!introduced && !held) {
            introduced = true;
            const token = drawn;
            setTimeout(() => introArrows(token), 350);
        } else {
            idleHops(drawn);
        }

        // ← and → the two answers, ↑ ↓ and space turning the card: clicked
        // rather than called, so that a key is counted as the press it stands
        // for -- the turn as a press on the face in front
        bindKeys((code) => {
            if (busy || !held) return;

            const target = code === 'ArrowLeft' ? '#btn-dunno'
                : code === 'ArrowRight' ? '#btn-know'
                    : (state.isFlipped ? '.card-face-back' : '.card-face-front');

            const el = stageEl.querySelector(target);
            if (el) el.click();
        });

        // The figures again every so often: a card's timer runs out while the
        // shelf is being looked at, and the box it is in becomes ready.
        refreshTimer = setInterval(() => { if (!busy) refreshBoxes(); }, 20000);

        // Drawn before the voices were known, which means the speaker beside
        // the word was drawn on trust. One redraw when the list lands settles
        // it -- unless a card is in the air, which the next card drawn settles.
        speech.onVoices(voicesKnown);

        page.save();
    }

    /*
     * The list of sets under the title, to play another without going back to
     * the catalog (the owner's call, 20 November 2026): every set by its name,
     * with how many of its words are ready out of how many, the one being
     * played ticked. Choosing another opens Flashcards on it -- a new page, as
     * from the catalog, with the active session the catalog would have
     * written; a run in the middle of being played is ended first (`set`).
     */
    const CHEVRON = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display: inline-block; margin-left: 5px; vertical-align: -1px;"><path d="M6 9l6 6 6-6" /></svg>`;

    let setMenu = null;

    function closeSetMenu() {
        if (!setMenu) return;
        setMenu.menu.remove();
        document.removeEventListener('pointerdown', setMenu.away, true);
        document.removeEventListener('keydown', setMenu.key, true);
        const btn = container.querySelector('.flashcards-title');
        if (btn) btn.setAttribute('aria-expanded', 'false');
        setMenu = null;
    }

    function toggleSetMenu(header) {
        if (setMenu) return closeSetMenu();

        const p = palette;
        const btn = header.querySelector('.flashcards-title');

        const rows = store.sets().map(set => {
            const total = (set.words || []).length;
            const ready = store.duePool(set.id, false).length;
            const here = set.id === state.selectedSetId;
            const tick = here ? `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="${p.ready}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: none;"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>` : '<span style="width: 13px; flex: none;"></span>';

            return `<button class="flashcards-set-option" role="option" aria-selected="${here}" data-set-id="${escapeText(set.id)}" style="display: flex; align-items: center; gap: 7px; width: 100%; padding: 7px 9px; box-sizing: border-box; border: none; border-radius: 7px; background: ${here ? p.labelPaper : 'transparent'}; color: ${p.labelInk}; font-family: inherit; font-size: 12.3px; font-weight: ${here ? 800 : 700}; text-align: left; cursor: pointer;">
                ${tick}
                <span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeText(set.title || 'Untitled')}</span>
                <span style="flex: none; padding: 1.5px 6px; border-radius: 99px; border: 1px solid ${p.line}; background: ${ready ? p.ready : p.pill}; color: ${ready ? p.readyInk : p.pillInk}; font-size: 10.4px; font-weight: 700; font-variant-numeric: tabular-nums;">${ready}<span style="opacity: 0.75;">/${total}</span></span>
            </button>`;
        }).join('');

        const menu = $(header, `<div class="flashcards-set-menu" role="listbox" style="position: absolute; left: 50%; top: 34px; z-index: 50; width: 240px; max-height: 300px; overflow-y: auto; transform: translateX(-50%); padding: 5px; box-sizing: border-box; border-radius: 10px; border: 1.3px solid ${p.line}; background: ${p.menuBg}; box-shadow: 0 10px 22px rgba(30, 18, 8, 0.35);">${rows}</div>`);

        if (MOTION) menu.animate([{ opacity: 0, transform: 'translateX(-50%) translateY(-6px)' }, { opacity: 1, transform: 'translateX(-50%) translateY(0)' }], { duration: 160, easing: 'ease-out' });

        menu.addEventListener('click', (e) => {
            const option = e.target.closest('.flashcards-set-option');
            if (option) switchSet(option.dataset.setId);
        });

        // Away by a press anywhere else, or by Escape
        const away = (e) => { if (!menu.contains(e.target) && !btn.contains(e.target)) closeSetMenu(); };
        const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeSetMenu(); } };
        document.addEventListener('pointerdown', away, true);
        document.addEventListener('keydown', key, true);

        btn.setAttribute('aria-expanded', 'true');
        setMenu = { menu, away, key };
    }

    async function switchSet(id) {
        closeSetMenu();
        if (!id || id === state.selectedSetId) return;

        speech.hush();
        if (state.sessionPool) await closeRun('set');

        await storage.set('active_session', { game: 'flashcards', setId: id, startedAt: Date.now() });
        await nav.game({ id: 'flashcards' }, id, false);
    }

    function voicesKnown() {
        if (!busy) render();
    }

    flashcards.render = render;

    flashcards.setTheme = (isDark) => {
        const t = tokens.of(isDark);

        isNight = isDark;

        /*
         * Wood, cardboard and paper in the soft, warm colours of the owner's
         * pictures -- a painted storybook rather than a photograph: nothing
         * saturated, and drawn round in one dark brown ink (`line`) -- all but
         * the boxes, see boxTone -- with the shading that gives it depth -- the shadow under
         * each shelf, at the wall's two ends, inside the boxes and behind
         * them (`drop`).
         *
         * The dark theme is the same room at night (see the night above): the
         * same things in shadow, cooler and a good deal darker, for the lamp
         * and the fairy lights to light. The card on the table is lit by the
         * lamp, so it stays warm paper (`tablePaper`) with a glow round it.
         * Only the way out and the gear are the app's, in its own chrome --
         * they are the page's furniture, not the cabinet's.
         */
        const light = {
            line: '#54402f',
            frame: '#93735a', frameLow: '#7f604a', cabinetShadow: '0 8px 16px rgba(45, 28, 14, 0.3)',
            wall: '#6f5e4f', rowShade: 'rgba(40, 22, 10, 0.6)', sideShade: 'rgba(40, 22, 10, 0.45)',
            sideLit: '#6b5546', sideNear: '#614c3e', sideFar: '#4e3d32', sideEdge: 'rgba(30, 18, 10, 0.45)',
            depthShade: 'rgba(40, 22, 10, 0.5)',
            wallDepth: 'inset 0 7px 14px rgba(30, 16, 6, 0.5), inset 0 -4px 8px rgba(30, 16, 6, 0.25)',
            plankBack: '#463c35', plankTop: '#6f6258', plankFront: '#685c53', plankFrontLow: '#564b43', plankShade: 'rgba(45, 28, 14, 0.4)',
            kraft: '#d0ae86', kraftMid: '#c4a179', kraftLow: '#b4916b', kraftLight: '#e2c9a6', rim: '#d6bb98', edgeShade: 'rgba(70, 42, 18, 0.16)',
            inside: '#8c6d52', insideLow: '#5f4733', rimShade: 'rgba(45, 28, 14, 0.4)', frontCast: 'rgba(45, 28, 14, 0.28)',
            boxShadow: 'rgba(45, 28, 14, 0.36)', drop: '4px 3px 5px rgba(45, 28, 14, 0.42)', wallCast: 'rgba(30, 18, 10, 0.45)',
            cardShade: '#9c8164', cardCast: 'rgba(50, 30, 14, 0.2)', cardLine: '#7d634d',
            tablePaper: '#fcf6e4', tablePaperBack: '#f5ecd6', boxPaper: '#e9dcc0', cardHalo: '0 10px 22px rgba(45, 28, 14, 0.36), 0 2px 4px rgba(45, 28, 14, 0.2)',
            brass: '#caa57f', brassLight: '#dcbc96', labelPaper: '#f9f0dd', labelInk: '#4a3628', stampInk: '#5a4331',
            pill: '#6f5644', pillInk: '#fbf3e3', ready: '#7d9e77', readyInk: '#ffffff',
            tag: ['#f8edd4', '#ead9b6'], tagInk: '#5a4331', tagReady: ['#e4c068', '#d2a84b'], tagReadyInk: '#4a3410',
            flip: '#dc9470', flipEdge: '#ae6c4d', know: '#90bd99', knowEdge: '#679773',
            wash: 'rgba(72, 50, 30, 0.42)',
            arrow: '#fff7e6',
            upRay: '#a8d4a2', downRay: '#eda083',
            lampArm: '#c09a6b', lampBase: '#5d4636', lampHead: '#8fb2a5', bulbOff: '#d8d2c2', menuBg: '#f3e8d2'
        };

        const dark = {
            ...light,
            line: '#241a13',
            frame: '#3a2e26', frameLow: '#2e241e', cabinetShadow: '0 0 30px rgba(255, 160, 80, 0.1), 0 8px 18px rgba(0, 0, 0, 0.55)',
            wall: '#30261f', rowShade: 'rgba(0, 0, 0, 0.72)', sideShade: 'rgba(0, 0, 0, 0.6)',
            sideLit: '#30271f', sideNear: '#2a221c', sideFar: '#1f1915', sideEdge: 'rgba(0, 0, 0, 0.5)',
            depthShade: 'rgba(0, 0, 0, 0.55)',
            wallDepth: 'inset 0 7px 14px rgba(0, 0, 0, 0.65), inset 0 -4px 8px rgba(0, 0, 0, 0.35)',
            plankBack: '#1d1915', plankTop: '#3d352f', plankFront: '#36302a', plankFrontLow: '#2a2520', plankShade: 'rgba(0, 0, 0, 0.6)',
            kraft: '#7c6650', kraftMid: '#705b47', kraftLow: '#5f4d3c', kraftLight: '#8e775e', rim: '#86705a', edgeShade: 'rgba(0, 0, 0, 0.32)',
            inside: '#463a2f', insideLow: '#251d17', rimShade: 'rgba(0, 0, 0, 0.55)', frontCast: 'rgba(0, 0, 0, 0.45)',
            boxShadow: 'rgba(0, 0, 0, 0.5)', drop: '3px 2px 3px rgba(0, 0, 0, 0.5)', wallCast: 'rgba(0, 0, 0, 0.5)',
            cardShade: '#3e3229', cardCast: 'rgba(0, 0, 0, 0.32)', cardLine: '#3a2d22',
            tablePaper: '#e6d7b8', tablePaperBack: '#ddcca9', boxPaper: '#e6d7b8', cardHalo: '0 0 26px rgba(255, 196, 120, 0.22), 0 10px 22px rgba(0, 0, 0, 0.5)',
            brass: '#957a5b', brassLight: '#a88c6b', labelPaper: '#d6c7a6', labelInk: '#2a1f16', stampInk: '#d8c6a2',
            pill: '#2e241d', pillInk: '#e8dbc2', ready: '#5d8357',
            tag: ['#a99879', '#968566'], tagInk: '#251a11', tagReady: ['#b48e3e', '#9a7832'], tagReadyInk: '#1f1606',
            flip: '#c98466', flipEdge: '#94573f', know: '#7ea888', knowEdge: '#557a5e',
            wash: 'rgba(6, 8, 18, 0.55)',
            arrow: '#fff1d2', menuBg: '#e3d6ba',
            titleTone: { labelPaper: '#4a3b2f', labelInk: '#eadcc0', brass: '#6e5841', brassLight: '#806849', line: '#1c140e' }
        };

        palette = {
            ...(isDark ? dark : light),

            // The way out and the gear stand on the page, like dict's header
            // buttons, and are outlined the same way -- see tokens.chrome.
            // At night this game's ground is the app's, and so are they; by
            // day it is its own blue (flashcards.html), where the app's warm
            // outline and icon were faint and out of tune: the outline about
            // 1.8 against the ground, as tokens.chrome is against the app's,
            // the icon over 4
            chromeBorder: isDark ? t.chrome : '#5e7989',
            backBtn: isDark ? t.muted : '#24404f',

            // Ink on cream paper whichever the theme: the card is paper in both
            ink: '#3a2a1c',
            rule: 'rgba(110, 145, 170, 0.18)',
            margin: 'rgba(214, 120, 100, 0.35)',
            backBand: isDark ? '#dcc39b' : '#e3cfaa',

            // The speaker beside the word is an offer rather than the thing to
            // press, so it sits quiet until it answers -- a faded brown on the
            // paper, which is light in both themes.
            sayIcon: '#a08868'
        };
    };

    flashcards.start = (setId, allowEarly) => {
        state.selectedSetId = setId;
        state.allowEarly = allowEarly;
    };

    flashcards.getState = () => ({
        selectedSetId: state.selectedSetId,
        currentIndex: state.currentIndex,
        view: state.view,
        answers: state.answers,
        isFlipped: state.isFlipped,
        sessionPool: state.sessionPool,

        // Goes with the pool it belongs to. Left out, a run that was interrupted
        // came back nameless, and the answers after the break were recorded
        // without saying which run they were part of.
        sessionAt: state.sessionAt,

        allowEarly: state.allowEarly
    });

    flashcards.setState = (snap) => {
        if (!snap) return;
        state = { ...getEmptyState(), ...snap };
    };
}

bootGame('flashcards', flashcards);
