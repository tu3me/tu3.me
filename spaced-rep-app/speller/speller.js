/**
 * "Speller" game. The word is cut into pieces, the pieces are laid out in no
 * order with pieces of other words mixed in among them, and the player puts the
 * word back together by clicking them.
 *
 * Nothing is marked as it is pressed. What is judged is the line of letters,
 * once the last box of it is full: the same word can come out of a different
 * handful of tiles, and somebody who spelled the word spelled the word. Until
 * then a piece in the wrong place is only a piece in the wrong place, and Undo
 * takes it back.
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
function speller(container) {
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
     * Two, because the stages under it are where the word is still being met —
     * at stage 0 it has never been answered and at 1 it has been answered once —
     * and the cut is question enough there: a tray with nothing wrong in it can
     * be read straight through, which is what learning to spell a word looks
     * like. Strangers come in where the question would otherwise start getting
     * easier, since every stage cuts the word finer and finer pieces are a
     * shorter thing to spell.
     */
    const DECOYS_FROM = 2;

    let state = getEmptyState();
    let palette = {};

    function getEmptyState() {
        return {
            selectedSetId: 'all', currentIndex: 0, sessionResults: [], sessionPool: null,
            sessionAt: null, allowEarly: false, round: null
        };
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
        // judged at the end is the line of letters, and a tile that spells the
        // right letters is the right tile whatever it was cut from.
        //
        // `laid` is the tiles that are down, in the order they were put down —
        // an order, because Undo takes the last of them back. `right` is where
        // the first Check cut the line, in boxes, and null until there has been
        // one; `locked` is how many of the laid tiles that Check settled, which
        // is as far back as Undo reaches.
        return { at: state.currentIndex, tray, laid: [], shown: false, done: false, right: null, locked: 0 };
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
     */
    function sayNow(text, paint) {
        const done = until(light(paint));
        if (!speech.say(text, sayLang, done)) done();
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

    const boxAt = (index) => barEl && barEl.querySelector(`.speller-box[data-at="${index}"]`);

    function sayLetterMark(index) {
        const el = boxAt(index);
        if (!el) return;

        hold(el);

        // Coral, which is what this app paints the thing being acted on. Not
        // mint: mint is a letter that is already in the word, and a letter that
        // turned mint because it was being read out would be saying a piece had
        // just landed.
        el.style.color = palette.saying;
    }

    function sayWordsMark(ranges) {
        ranges.forEach(({ from, to, place }) => {
            const stage = tokens.stages()[WORD_FILLS[place % WORD_FILLS.length]];

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

        const boxes = barEl.querySelectorAll('.speller-box, .speller-space');
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

        const dotsHtml = () => pool.map((_, idx) => {
            const res = state.sessionResults[idx];

            let bg = palette.dotIdle;
            if (res === 'correct') bg = palette.ok;
            if (res === 'wrong') bg = palette.err;

            const ring = idx === state.currentIndex ? `outline: 1px solid ${palette.cursor}; transform: scale(1.15);` : '';

            return `<div class="speller-dot" style="width: 8px; height: 8px; border-radius: 50%; background: ${bg}; ${ring} transition: all 0.2s; flex-shrink: 0;"></div>`;
        }).join('');

        const header = $(container, `<div class="speller-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6.8px;">
            <div class="speller-header-info" style="display: flex; flex: 1; align-items: center; gap: 6.8px;">
                <a class="back-btn" href="index.html" title="Back" style="display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; width: 29px; height: 29px; flex: none; background: transparent; border: 1px solid ${palette.chromeBorder}; border-radius: 10.2px; color: ${palette.backBtn}; cursor: pointer; padding: 0; text-decoration: none;"><svg viewBox="0 0 24 24" width="18.8" height="18.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12H5" /><path d="M11 6l-6 6 6 6" /></svg></a>
            </div>
            <div class="speller-dots-group" style="display: flex; flex: 1; justify-content: center; align-items: center; gap: 5px;">${dotsHtml()}</div>
        </div>`);

        function refreshDots() {
            const group = header.querySelector('.speller-dots-group');
            if (group) group.innerHTML = dotsHtml();
        }

        header.querySelector('.back-btn').addEventListener('click', (e) => {
            e.preventDefault();

            // Whatever is being said belongs to this screen and goes with it.
            speech.hush();
            page.home();
        });

        page.muteButton(header, palette.backBtn, palette.chromeBorder);

        const banner = $(container, `<div class="speller-hint-banner" style="background: ${palette.hintBg}; border: 1px solid ${palette.hintBorder}; border-radius: 12px; padding: 6.8px 12px; text-align: center; margin-bottom: 10.2px; height: 88.8px; min-height: 88.8px; max-height: 88.8px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 3.4px; overflow: hidden;">
            <div class="speller-translation" style="font-size: 16.4px; font-weight: 700; line-height: 1.25; color: ${palette.hintText}; text-align: center; word-break: break-word; overflow-wrap: anywhere; max-width: 100%; max-height: 35.9px; overflow: hidden;">${escapeText(currentItem.word.translation || '')}</div>
            <div class="speller-bar" style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; max-width: 100%; max-height: ${BAR_MAX}px; overflow: hidden; width: 100%;"></div>
        </div>`);

        fitTranslation(banner.querySelector('.speller-translation'));

        barEl = banner.querySelector('.speller-bar');

        // The boxes, in order: the word without the spaces between its words.
        // Everything the player lays out is measured against this and against
        // nothing else — see checkWord.
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
         * The letters in them are the player's own, right or wrong, and nothing
         * is green until Check. A letter that has gone down is in the page's own
         * ink, which says "this is yours" and not whether it belongs.
         *
         * After Check the line is cut at the first letter that did not belong:
         * green before the cut and coral from it on, and the green stays where
         * it is for the rest of the round — which half of the word was known is
         * said by where it ends. Past it the coral is the app's: a box waiting
         * to be filled again, or a letter standing there because the word was
         * given away. Filled again by the player, it goes back to ink.
         *
         * The speaker is there from the first frame and reads the whole line
         * out loud without opening anything. It costs nothing, and it is not a
         * way around the round: hearing the word is this game — what is being
         * asked is how it is written, and the sound does not say that. Giving
         * up the letters is the shortcut, and that one still costs.
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
                 */
                speaker.addEventListener('click', () => {
                    sayNow(currentItem.word.original, () => {
                        hold(speaker);
                        speaker.style.color = palette.saying;
                    });
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

                    gap.className = 'speller-space';
                    gap.style.cssText = `width: ${WORD_SPACE}em; font-size: ${BOX_SIZE}px;`;
                    barEl.appendChild(gap);
                    return;
                }

                const slot = slotOf[i];
                const mine = slot < laid.length ? laid[slot] : '';

                // Whether a verdict has been given at all, and where it cut the
                // line: everything before round.right was right when it was
                // asked for, everything from it on was not.
                const judged = round.right !== null;

                let text = '?';
                let colour = palette.letterPending;

                /*
                 * Three things a box can be, and a colour for each.
                 *
                 * Green is the part that was right when the verdict came, and it
                 * stays green: that is the whole record of how far the player
                 * got on their own, and where it ends is where they stopped
                 * getting it right.
                 *
                 * Coral is everything past that: a box waiting to be filled
                 * again after a Check, or a letter standing there because the
                 * word was given away. Either way it is the app's, not the
                 * player's.
                 *
                 * The page's ink is the player's own letter wherever the line
                 * has nothing to say about it — before any verdict, and over the
                 * coral afterwards. Once a verdict exists, the one thing a
                 * colour can still report is which of those boxes have been
                 * filled again, and it reads the same both ways round: ink is
                 * what the player put there, coral is what is waiting or shown.
                 */
                if (mine) {
                    text = mine;
                    colour = judged && slot < round.right ? palette.letterPlaced : palette.letterLaid;
                } else if (round.shown) {
                    text = slots[slot];
                    colour = palette.letterWrong;
                } else if (judged) {
                    colour = palette.letterWrong;
                }

                const open = text !== '?';

                const box = document.createElement('div');

                box.className = 'speller-box';

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

                if (!open || worthSaying(text)) {
                    box.style.cursor = 'pointer';
                    box.title = open ? 'Say it' : 'Click to give the word away (counts as a mistake)';

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

            // The letter that is standing there, which until Check is the
            // player's letter and not the word's.
            sayNow(char, () => sayLetterMark(index));
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
        function scoreRound(result, dot) {
            if (state.sessionResults[state.currentIndex]) return;

            store.recordRepetition(currentItem, result, 'speller', { at: state.sessionAt, size: state.sessionPool.length });
            state.sessionResults[state.currentIndex] = dot;
            store.save();
        }

        /*
         * Showing the whole word, which is only ever asked for by clicking a box
         * that is still "?".
         *
         * A verdict like Check, and marked like one: what was right up to the
         * point the player gave up is kept and turns green, what came after it
         * goes back on the table, and those boxes are coral from then on — they
         * are the part that was not known, which is the same thing Check says
         * and is worth saying here too. Filling them in afterwards is copying
         * letters off a line that already shows them, and the colour keeps
         * saying so to the end of the round.
         */
        function giveAway() {
            if (round.shown) return;

            const keep = keptPrefix();

            round.shown = true;
            round.laid = keep;
            round.locked = keep.length;

            if (round.right === null) round.right = laidOut().length;

            scoreRound(0, 'wrong');

            drawBar();
            refreshTray();
            drawActions();
            refreshDots();
            page.save();
        }

        // Moves to the next word, or ends the session on the last one.
        function advance() {
            state.currentIndex += 1;
            state.round = null;

            if (state.currentIndex >= pool.length) {
                state.sessionPool = null;
                page.finish();
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
        const trayEl = $(container, `<div class="speller-tray" style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 8.5px;"></div>`);

        // Under them the round's buttons: Undo and Check while it is being
        // played, Next once it has been judged.
        const actionsEl = $(container, `<div class="speller-actions" style="display: flex; justify-content: center; align-items: center; gap: 8.5px; margin-top: 15.4px;"></div>`);

        function pieceStyle(spent) {
            return `padding: 8.5px 13.7px; background: ${palette.pieceBg}; border: 2px solid ${palette.pieceBorder};`
                + ` border-radius: 12px; font-family: inherit; font-weight: 700; font-size: 20.5px; line-height: 1.2;`
                + ` color: ${palette.pieceText}; white-space: pre; cursor: ${spent ? 'default' : 'pointer'};`
                + ` opacity: ${spent ? '0.35' : '1'}; transition: background 0.2s, border-color 0.2s, color 0.2s, opacity 0.2s;`;
        }

        const ACTION = `padding: 7.7px 17.1px; border-radius: 10.2px; font-family: inherit; font-weight: 700; font-size: 12.8px; line-height: 1.2;`;

        const tiles = round.tray.map((text, at) => {
            const tile = $(trayEl, `<button class="speller-piece" data-at="${at}" style="${pieceStyle(false)}">${escapeText(text)}</button>`);

            tile.addEventListener('click', () => {
                round.laid.push(at);

                drawBar();
                refreshTray();
                drawActions();
                page.save();
            });

            return tile;
        });

        /*
         * Which of them are still in play: not one that is already down, not one
         * longer than the room that is left, and none at all once the word has
         * been spelled out and said so.
         *
         * All three look the same, because the only thing the player needs to
         * know about any of them is that it is not going anywhere now. Shown
         * rather than left to be pressed and ignored: a tile that answers a
         * press by doing nothing reads as the game being broken, not as the
         * piece not fitting.
         */
        function refreshTray() {
            const room = slots.length - laidOut().length;

            tiles.forEach((tile, at) => {
                const spent = round.done || round.laid.includes(at) || boxesOf(round.tray[at]).length > room;

                tile.disabled = spent;
                tile.style.cssText = pieceStyle(spent);
            });
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

        /*
         * The verdict, and the player asks for it.
         *
         * Nothing is judged until this is pressed. A line is a guess that can be
         * taken apart and tried again, and a game that marked it the moment the
         * last box filled would be marking a hand that was still moving.
         *
         * What is written down is the share of the word that was right: two
         * decimals, truncated, which is the number snake records for a word it
         * was asked to open and for the same reason — truncating is what keeps
         * an unfinished word from ever recording a 1, the one number that means
         * it was spelled.
         *
         * Written once. The first Check is the one that counts, and a word put
         * right on the second go is a word that was not known on the first; the
         * dot keeps the first verdict, and round.right keeps the cut that
         * verdict was made at, which is what the colours on the line are saying
         * from then on.
         *
         * What was wrong goes back on the table, because the alternative is a
         * line nobody can finish: the pieces that spell the rest of the word are
         * exactly the ones standing in the wrong boxes. Read out only when the
         * whole line is right — a word read aloud with a mistake in it is this
         * app teaching the mistake.
         */
        function checkWord() {
            const keep = keptPrefix();
            const right = keep.reduce((sum, at) => sum + boxesOf(round.tray[at]).length, 0);

            const share = slots.length ? Math.floor((right / slots.length) * 100) / 100 : 0;
            const whole = right === slots.length;

            if (round.right === null) round.right = right;

            scoreRound(whole ? 1 : share, whole ? 'correct' : 'wrong');

            round.laid = keep;
            round.locked = keep.length;
            round.done = whole;

            drawBar();
            refreshTray();
            drawActions();
            refreshDots();

            if (whole) sayNow(currentItem.word.original, () => sayWordsMark(lineWords(letters)));

            page.save();
        }

        /*
         * The buttons, which are whichever of the three the round has earned.
         *
         * Undo takes back the last piece, and no further than the last Check:
         * what a Check kept is settled, and pulling it apart would be undoing a
         * verdict that is already written down. The last piece only — a piece
         * out of the middle would leave the letters after it standing in boxes
         * they no longer belong to, and what a player wants from the middle of a
         * line is to try again from there, which is this button pressed twice.
         *
         * Check arrives when the last box fills and goes again if a piece is
         * taken back.
         *
         * Next arrives when the word is spelled and Check has said so, and not
         * one moment earlier. It used to come with the verdict, whatever the
         * verdict was, which made it a way past a word the player had just got
         * wrong or given away — and the word they had got wrong is the one word
         * on the screen worth putting together. The score is already written by
         * then and nothing here can change it; what is left is the spelling, and
         * doing it is the round.
         *
         * Nobody is trapped by that. Every piece the word needs is on the table
         * — a Check puts the wrong ones back — Undo takes back anything laid
         * since the last Check, and a word that was given away is on the line to
         * copy. And the way out of the game is where it always is, in the corner:
         * leaving keeps the session, and the catalog offers to continue it.
         */
        function drawActions() {
            actionsEl.innerHTML = '';

            const next = () => {
                // The last word of the run says so. What is behind the button
                // there is not another word but the way out, and a run that ends
                // under the same "Next" as every word before it ends without
                // anybody noticing it has.
                const last = state.currentIndex >= pool.length - 1;

                const btn = $(actionsEl, `<button class="speller-next" style="${ACTION} background: ${palette.accent}; color: ${palette.onAccent}; border: none; cursor: pointer;">${last ? 'Finish!' : 'Next'}</button>`);

                btn.addEventListener('click', advance);
            };

            if (round.done) return next();

            const can = round.laid.length > round.locked;

            const undo = $(actionsEl, `<button class="speller-undo" style="${ACTION} background: transparent; color: ${palette.backBtn}; border: 1px solid ${palette.chromeBorder}; cursor: ${can ? 'pointer' : 'default'}; opacity: ${can ? '1' : '0.45'};"${can ? '' : ' disabled'}>Undo</button>`);

            if (can) undo.addEventListener('click', () => {
                round.laid.pop();

                drawBar();
                refreshTray();
                drawActions();
                page.save();
            });

            if (laidOut().length >= slots.length) {
                const check = $(actionsEl, `<button class="speller-check" style="${ACTION} background: ${palette.accent}; color: ${palette.onAccent}; border: none; cursor: pointer;">Check</button>`);

                check.addEventListener('click', checkWord);
            }
        }

        drawBar();
        refreshTray();
        drawActions();

        // Drawn before the voices were known, so the speaker was drawn on
        // trust. One redraw when the list lands takes it back where this device
        // cannot keep it.
        speech.onVoices(render);

        page.save();
    }

    speller.render = render;

    speller.setTheme = (isDark) => {
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

            // Said out loud: coral, which is what this app paints the thing
            // being acted on. Mint is a letter already in the word.
            saying: t.accent,

            // The speaker is an offer rather than the thing to press, so it
            // sits in muted like the ones in cards, quiz and snake.
            sayIcon: t.muted,

            // A piece is a card standing on the page, like a quiz option: the
            // same surface, the same border, the same ink.
            pieceBg: t.surface,
            pieceBorder: t.border,
            pieceText: t.ink,

            // Check and Next are the thing to press, so they are the colour
            // this app paints the thing to press. Undo is not: it stands in the
            // chrome's own outline, like the way out and the sound.
            accent: t.accent,
            onAccent: t.onAccent
        };
    };

    // The third argument is the previous session, handed over even on a fresh
    // start so a game can carry its own settings across. This one has none to
    // carry, and progress never rides along.
    speller.start = (setId, allowEarly) => {
        state.selectedSetId = setId;
        state.allowEarly = allowEarly;
    };

    speller.getState = () => ({
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

        allowEarly: state.allowEarly
    });

    speller.setState = (snap) => {
        if (!snap) return;
        state = { ...getEmptyState(), ...snap };
    };
}

bootGame('speller', speller);
