/**
 * "Cards" game. Owns its state, its palette and its own rule for picking
 * words out of a set. Talks to the outside only through store, and through
 * app for navigation.
 */
function cards(container) {
    // How many words this game takes per session — its own decision
    const POOL_LIMIT = 10;

    let state = getEmptyState();
    let palette = {};

    function getEmptyState() {
        return { selectedSetId: 'all', currentIndex: 0, isFlipped: false, hasBeenFlipped: false, sessionResults: [], sessionPool: null, allowEarly: false };
    }

    // Keyboard: ← turns the card over, → is done with this word
    const KEYS = ['ArrowLeft', 'ArrowRight'];

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
     * round it. It was half again bigger for a while, which was too far: a card
     * is 145.1px and the room inside it is 136, so at that size a phrase of any
     * length was landing on the fitting below — four of the seeded seventy-four
     * came out at a size this number had no say in. At this one none of them do.
     *
     * Not every word fits even here, and the card is not allowed to grow: it is
     * 145.1px whatever is on it, because the deck has to look like a deck and not
     * like a column of boxes of different heights. So the size is where the
     * fitting starts rather than where it ends.
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

    /*
     * Shrinks the line until it fits the face it is on.
     *
     * By the rendered height rather than by counting letters: what fits is
     * decided by the font, the script and where the browser puts the line
     * breaks, and only the browser knows all three. A Japanese line of eight
     * glyphs and an English line of eight letters take different room, and both
     * take different room again in the light theme's face, which is the same
     * size but holds the same text at a different weight.
     *
     * A pixel at a time, downwards, because the answer is usually one or two
     * steps away and a search would cost more reflows than the walk does.
     *
     * The room is the whole of the face, less its padding. Nothing else is
     * taken out for the speaker: it stands in the line now, so the height being
     * measured already has it in it — and it is sized in em, so it comes down
     * with every step of the walk instead of eating more of the line at each
     * one.
     */
    function fitWord(face) {
        const text = face && face.querySelector('.cards-word-text');
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
     * The line as a row of letters inside a row of words.
     *
     * Every letter is its own target because a tap has to be able to land on
     * one. What lies between the words — spaces, commas, the question mark —
     * stays as plain text: the only thing that can be tapped is a thing that
     * can be said.
     *
     * Letters come from speech.letters, which counts them the way a reader
     * does: й is written as two code units and न्न as three, and splitting
     * there would hand back half a letter to say out loud.
     */
    function lineHtml(text) {
        const tinted = 'border-radius: 3.4px;';

        return speech.words(text).map(part => {
            if (part.isWord) {
                const letters = speech.letters(part.text)
                    .map(ch => `<span class="say-letter">${escapeText(ch)}</span>`)
                    .join('');

                return `<span class="say-word" style="${tinted}">${letters}</span>`;
            }

            // What sits between the words stays as it was written and takes
            // no colour: a comma has nothing to say, and marking it would be
            // pointing at a thing the tap cannot reach.
            return escapeText(part.text);
        }).join('');
    }

    /*
     * What the last tap lit, so it can be put out when the voice stops.
     *
     * One mark at a time for the whole screen, because one thing at a time is
     * being said: two marks up at once would be claiming both are, and only the
     * later one is.
     *
     * Cards paints its own, rather than sharing with the quiz. The two started
     * with the same behaviour and the quiz still has it; this screen went on to
     * three depths of tap, and a shared version would have had to keep doing
     * what the quiz needs while doing this as well.
     */
    let lit = [];

    /*
     * Which mark is up, counted rather than named.
     *
     * The voice that finishes has to take its own mark down and nobody else's.
     * By the time it stops, a later tap may have put up a different one — that
     * tap's own voice is what will clear it — so what stops speaking checks the
     * number it was given against the number that is up now, and keeps quiet if
     * they differ.
     */
    let marks = 0;

    /*
     * The colour goes on and comes off in the frame it is asked for, both ways.
     *
     * It used to fade in over a fifth of a second, which is measurable and was
     * measured: the style is written 0.6ms after the tap, but the colour was a
     * fifth of the way there at 30ms and only arrived at 200. That reads as the
     * app thinking it over, and a tap wants answering.
     *
     * Going was faded too, for a while, on the grounds that a colour vanishing
     * between two frames pulls the eye. It does, a little — and an animation
     * whose whole argument is "a little" is an animation to do without. What is
     * left has no transition in it at all, which is one fewer thing to reason
     * about the next time these marks are touched.
     */
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
     * What to do when this mark's voice stops, or turns out never to have
     * started.
     *
     * Only if it is still the mark that is up: by the time a voice stops, a
     * later tap may have put a different one there, and that tap's own voice is
     * what will clear it.
     *
     * And never sooner than a short spell after it went up. There are three
     * ways to be told the sound is over — it ended, there was no voice for the
     * language, or the voice list had not arrived yet and the word turned out
     * unsayable once it did — and the last two answer within a quarter of a
     * second, which put the colour on the card and took it off again in one
     * blink. On a card in a language this device cannot say, that was every tap.
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
     * A tap goes deeper the more it is repeated: the letter under the finger,
     * then the word it belongs to, then the whole line.
     *
     * Counted here rather than read off the event's own click count, which
     * phones do not agree about — a second tap is a zoom gesture to some of
     * them, and the count never arrives.
     *
     * One gesture is taps inside the same word, not taps on the same letter. A
     * finger lands where it lands: a glyph is a couple of dozen pixels wide and
     * a fingertip is wider, so the second tap of a double tap often comes down
     * on the letter next door — and in Japanese, where 日本語 is one word of
     * three glyphs, that is most of the time. Asking for the same letter twice
     * made the second tap a fresh first one, which is exactly the word never
     * being reached. The word is the thing being pointed at, so the word is what
     * holds the count; a tap in a different word starts again at its letter.
     *
     * Each tap acts at once instead of waiting to see whether another is
     * coming. Waiting would put a quarter of a second between every single tap
     * and its answer, and a tap that answers late reads as a tap that missed.
     * What it costs is a moment of the letter being said before the word cuts
     * it off, which is at least the truth about what is happening: each press
     * asks for more than the last one.
     */
    const TAP_GAP = 500;

    /*
     * A colour for every word of the line, and the same colour every time that
     * word is marked.
     *
     * Taken from the bubble ramp, four steps far enough apart to be told at a
     * glance and not close enough to read as a series: the words of a line are
     * not in an order that means anything, they are simply not each other.
     *
     * A word keeps its colour whether it is said on its own or as part of the
     * line. It used to be mint alone and gold in the line, and that change was
     * the loudest thing on the card at a moment when nothing had changed but
     * the reason for looking.
     */
    const WORD_FILLS = [3, 6, 9, 12];

    function wordsIn(face) {
        return Array.from(face.querySelectorAll('.say-word'));
    }

    function tint(el, place) {
        const stage = tokens.stages()[WORD_FILLS[place % WORD_FILLS.length]];
        return { el, fill: stage.fill, ink: stage.ink };
    }

    const SAY_DELAY = 250;

    let taps = 0;
    let tapped = null;
    let tapTimer = null;
    let sayTimer = null;

    function forgetTaps() {
        clearTimeout(tapTimer);

        // A word still waiting its quarter second belongs to the card that was
        // tapped. Press "Know" fast enough and it would be said over the next
        // one, which is a different word entirely.
        clearTimeout(sayTimer);

        taps = 0;
        tapped = null;
    }

    function listen(face, text, lang) {
        if (!face) return;

        face.addEventListener('click', (e) => {
            const letter = e.target.closest('.say-letter');

            // Beside the words, or on the speaker under them: the whole line,
            // which is the third depth reached without the first two.
            if (!letter) {
                forgetTaps();
                return sayLine(face, text, lang);
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
            if (taps === 1) return sayLetter(letter, lang);
            if (taps === 2) return sayWord(face, word, lang);

            sayLine(face, text, lang);
        });
    }

    /*
     * The colour lands with the finger; the voice waits to see what the finger
     * meant.
     *
     * A quarter of a second, which is the gap between the two taps of a double
     * tap. Without it a letter starts being said the instant it is touched and
     * is cut off by its word a moment later, and every double tap comes out as
     * a stutter. With it the second tap arrives before the first has made a
     * sound, and what is heard is the one thing that was asked for.
     *
     * Only the voice waits. A tap that is answered by nothing for a quarter of a
     * second is a tap that missed, as far as the person doing the tapping can
     * tell, so the mark goes up at once — before it is known whether the device
     * even has a voice for this. If the asking comes back silent, the mark goes
     * off again: better a colour that appears and leaves than a screen that sits
     * still under a finger.
     *
     * A letter is coloured rather than filled: it is one glyph wide, and a fill
     * that size reads as a typo rather than as a mark. A word is filled, because
     * mid-light mint as text is 2.1:1 on the light card — unreadable at the
     * moment it is being read out — while as a fill it is one value in both
     * themes with 6.9:1 ink on it.
     */
    function sayLater(text, lang, mark) {
        clearTimeout(sayTimer);

        sayTimer = setTimeout(() => {
            const done = until(mark);
            if (speech.say(text, lang, done)) return;

            done();

            // Nothing was heard, and when the reason is the switch in the
            // header, the switch is what answers.
            if (speech.muted()) page.pulseMute();
        }, SAY_DELAY);
    }

    function sayLetter(letter, lang) {
        sayLater(letter.textContent, lang, light([{ el: letter, ink: palette.sayFill }]));
    }

    function sayWord(face, word, lang) {
        if (!word) return;

        sayLater(word.textContent, lang, light([tint(word, wordsIn(face).indexOf(word))]));
    }

    function sayLine(face, text, lang) {
        // A colour each, so the line reads as the words it is made of rather
        // than as one long stripe. They repeat past the fourth word, which is
        // where a card stops being a card and starts being a sentence.
        sayLater(text, lang, light(wordsIn(face).map(tint)));
    }

    function render() {
        container.innerHTML = '';

        // The nodes that were lit are gone with it, so there is nothing to put
        // back — and a tap on the card that was here counts towards nothing on
        // the card that replaces it.
        lit = [];
        forgetTaps();

        if (!state.sessionPool) {
            const pool = store.duePool(state.selectedSetId, state.allowEarly, POOL_LIMIT);

            state.sessionPool = pool;
            state.sessionResults = new Array(pool.length).fill(null);
            state.currentIndex = 0;
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

        const dotsHtml = () => pool.map((_, idx) => {
            const res = state.sessionResults[idx];
            let bg = palette.dotIdle;
            if (res === 'correct') bg = palette.okText;
            if (res === 'wrong') bg = palette.errText;

            const isCurrent = idx === state.currentIndex;
            const ringStyle = isCurrent ? `outline: 2px solid ${palette.cursor}; outline-offset: 1px; transform: scale(1.15);` : '';

            return `<div class="cards-dot" style="width: 8.5px; height: 8.5px; border-radius: 50%; background: ${bg}; ${ringStyle} transition: all 0.2s; flex-shrink: 0;"></div>`;
        }).join('');

        // The dots are redrawn mid-card now, not only when the next card is rendered
        function refreshDots() {
            const group = header.querySelector('.cards-dots-group');
            if (group) group.innerHTML = dotsHtml();
        }

        const header = $(container, `<div class="cards-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10.2px;">
            <div class="cards-header-info" style="display: flex; flex: 1; align-items: center; gap: 6.8px;">
                <a class="back-btn" href="index.html" title="Back" style="display: inline-flex; align-items: center; justify-content: center; width: 29px; height: 29px; flex: none; background: transparent; border: 1px solid ${palette.chromeBorder}; border-radius: 10.2px; color: ${palette.backBtn}; cursor: pointer; padding: 0; text-decoration: none;"><svg viewBox="0 0 24 24" width="18.8" height="18.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12H5" /><path d="M11 6l-6 6 6 6" /></svg></a>
            </div>
            <div class="cards-dots-group" style="display: flex; flex: 1; justify-content: center; align-items: center; gap: 5.1px;">
                ${dotsHtml()}
            </div>
        </div>`);

        header.querySelector('.back-btn').addEventListener('click', () => {
            page.home();
        });

        page.muteButton(header, palette.backBtn, palette.chromeBorder);

        const cardWrapper = $(container, `<div class="cards-viewport" style="width: 100%; height: 145.1px; cursor: pointer; margin-bottom: 13.7px; perspective: 1000px;">
            <div class="cards-flipper-inner" id="card-inner" style="width: 100%; height: 100%; position: relative; transform-style: preserve-3d; transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); transform: ${state.isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'};">

                <div class="card-face-front" style="position: absolute; width: 100%; height: 100%; backface-visibility: hidden; -webkit-backface-visibility: hidden; background: ${palette.frontBg}; border: 1px solid ${palette.frontBorder}; border-radius: 15.4px; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 13.7px; box-sizing: border-box;">
                    <div class="cards-word-text" style="font-size: ${WORD_SIZE}px; font-weight: 700; line-height: 1.15; color: ${palette.frontText}; text-align: center; word-break: break-word;">${speech.speakerHtml(currentItem.word.original, currentItem.word.originalLang, palette.sayIcon, SAY_LEAD)}${lineHtml(currentItem.word.original)}</div>
                </div>

                <div class="card-face-back" style="position: absolute; width: 100%; height: 100%; backface-visibility: hidden; -webkit-backface-visibility: hidden; transform: rotateY(180deg); background: ${palette.backBg}; border: 1px solid ${palette.backBorder}; border-radius: 15.4px; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 13.7px; box-sizing: border-box;">
                    <div class="cards-word-text" style="font-size: ${WORD_SIZE}px; font-weight: 700; line-height: 1.15; color: ${palette.backText}; text-align: center; word-break: break-word;">${speech.speakerHtml(currentItem.word.translation, currentItem.word.translationLang, palette.sayIcon, SAY_LEAD)}${currentItem.word.translation ? lineHtml(currentItem.word.translation) : '—'}</div>
                </div>

            </div>
        </div>`);

        const actionsContainer = $(container, `<div class="cards-actions-group"></div>`);

        // Seeing the translation is the mistake itself, so it is recorded the
        // moment the card turns and shown on the dots there and then. Once, not
        // once per press: the card can be turned back and turned again, and none
        // of that unsees what was already seen.
        //
        // Flip is the only way to it — a click on the card says the word it
        // landed on and turns nothing over.
        function markRevealed() {
            if (state.hasBeenFlipped) return;
            state.hasBeenFlipped = true;

            store.recordRepetition(currentItem, 0, 'cards');
            state.sessionResults[state.currentIndex] = 'wrong';
            store.save();
            refreshDots();
        }

        // Moves on to the next word, or ends the session on the last one
        function advance(result, mark) {
            if (result !== undefined) {
                store.recordRepetition(currentItem, result, 'cards');
                state.sessionResults[state.currentIndex] = mark;
            }

            state.isFlipped = false;
            state.hasBeenFlipped = false;
            state.currentIndex++;

            store.save();

            if (state.currentIndex >= pool.length) {
                state.sessionPool = null;
                page.finish();
            } else {
                render();
                page.save();
            }
        }

        /*
         * Two buttons, the same two throughout: turn the card over, or move on.
         *
         * They used to be replaced by a single "Got it" as soon as the card was
         * turned, which made the turn a one-way door — the front was gone and
         * the only thing left to do was leave the word. Now the pair stays, Flip
         * works every time it is pressed, and a player who wants to look at the
         * two sides one after the other can.
         *
         * Drawn once. Nothing about them changes any more, so nothing rebuilds
         * them.
         */
        function renderActionButtons() {
            actionsContainer.innerHTML = '';

            const actionButtons = $(actionsContainer, `<div class="cards-buttons-row" style="display: flex; gap: 6.8px;">
                <button class="cards-btn-flip" id="btn-flip" style="flex: 1; padding: 9.4px; background: ${palette.noBg}; color: ${palette.noText}; border: none; border-radius: 12px; font-weight: 700; font-size: 13.3px; cursor: pointer; transition: all 0.2s;">← Flip</button>
                <button class="cards-btn-know" id="btn-know" style="flex: 1; padding: 9.4px; background: ${palette.yesBg}; color: ${palette.yesText}; border: none; border-radius: 12px; font-weight: 700; font-size: 13.3px; cursor: pointer; transition: all 0.2s;">✓ Know →</button>
            </div>`);

            // The card is turned by hand rather than by a redraw: the flip is a
            // half-second of animation, and rebuilding the card mid-turn would
            // start it again from wherever it had got to.
            actionButtons.querySelector('#btn-flip').addEventListener('click', () => {
                markRevealed();

                state.isFlipped = !state.isFlipped;

                const inner = container.querySelector('#card-inner');
                if (inner) inner.style.transform = state.isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';

                page.save();
            });

            /*
             * Right is "done with this one", and what that is worth depends on
             * whether the card was turned.
             *
             * Untouched, it is the word answered from memory and counts. Turned,
             * the mistake was written down at the turn and there is nothing left
             * to score — pressing this then only moves on, and passing it a
             * result would write a correct answer over the wrong one and undo
             * the very thing the turn admitted.
             */
            actionButtons.querySelector('#btn-know').addEventListener('click', () => {
                if (state.hasBeenFlipped) return advance();
                advance(1, 'correct');
            });
        }

        /*
         * Saying the word is all a click on the card does now.
         *
     * It used to turn the card over as well, and to say the original
         * whichever side was up — the translation being in a language the player
         * already has. Both are gone. Turning it over is what Flip is for, and a
         * click now points at a particular word on a particular side, so that
         * word is what is said, in that side's own language: pointing at one
         * word and hearing another would be nonsense.
         *
         * Each face is wired on its own because each has its own language. Only
         * the face in front is ever clicked — the other one is turned away, and
         * a backface-hidden element is not painted and so not hit either.
         */
        listen(cardWrapper.querySelector('.card-face-front'), currentItem.word.original, currentItem.word.originalLang);
        listen(cardWrapper.querySelector('.card-face-back'), currentItem.word.translation, currentItem.word.translationLang);

        // Both faces, and both now: the back is turned away but it is laid out
        // all the same, and a size worked out only when it comes round would be
        // worked out in the middle of the turn.
        fitWord(cardWrapper.querySelector('.card-face-front'));
        fitWord(cardWrapper.querySelector('.card-face-back'));

        renderActionButtons();

        // Drawn before the voices were known, which means the speaker beside
        // the word was drawn on trust. One redraw when the list lands settles
        // it: a card in a language this device cannot say loses the offer it
        // could not have kept.
        speech.onVoices(render);

        // One key each, and both buttons are always there to press.
        bindKeys((code) => {
            const btn = container.querySelector(code === 'ArrowLeft' ? '#btn-flip' : '#btn-know');
            if (btn) btn.click();
        });

        page.save();
    }

    cards.render = render;

    cards.setTheme = (isDark) => {
        const t = tokens.of(isDark);

        palette = {
            dotIdle: t.border,

            // The way out and the sound stand on the page, like dict's header
            // buttons, and are outlined the same — see tokens.chrome.
            chromeBorder: t.chrome,
            // Marks where you are right now: the dot you are on. Its own token
            // rather than the accent, which is what a button that wants pressing
            // is painted in — "you are here" should not shout in the same colour
            // as "press this".
            cursor: t.progress,
            backBtn: t.muted,

            // The speaker beside the word is an offer rather than the thing to
            // press, so it sits in muted until it answers.
            sayIcon: t.muted,

            // A letter being said is written in mint rather than filled with
            // it: one glyph is too small a thing to fill, and mint as ink on a
            // dark card is the same colour progress is drawn in everywhere
            // else. Words and punctuation are filled instead, from the bubble
            // ramp — see WORD_FILLS.
            sayFill: t.progress,

            frontBg: t.surface,
            frontBorder: t.border,
            frontText: t.ink,
            backBg: t.soft,
            backBorder: t.progress,

            // Ink, not mint. The mint is a mid-light colour built to sit on the
            // dark ground; as text on the light theme's cream face it falls to
            // 1.8:1. It still marks this face — as the border around it, where
            // being mid-light costs nothing.
            backText: t.ink,

            // Filled in the two colours, no border, white label.
            noBg: t.err, noText: '#ffffff',
            yesBg: t.ok, yesText: '#ffffff',

            // The dots keep the colours. They used to read the button labels,
            // which is how they went to ink along with them — a dot is a filled
            // shape with nothing written on it, so mid-light costs it nothing,
            // and it has no other way to say how the word went.
            okText: t.ok,
            errText: t.err
        };
    };

    // The third argument is the previous session, handed over even on a fresh
    // start so a game can carry its own settings across. Progress never rides along.
    cards.start = (setId, allowEarly) => {
        state.selectedSetId = setId;
        state.allowEarly = allowEarly;
    };

    cards.getState = () => ({
        selectedSetId: state.selectedSetId,
        currentIndex: state.currentIndex,
        isFlipped: state.isFlipped,
        hasBeenFlipped: state.hasBeenFlipped,
        sessionResults: state.sessionResults,
        sessionPool: state.sessionPool,
        allowEarly: state.allowEarly
    });

    cards.setState = (snap) => {
        if (!snap) return;
        state = { ...getEmptyState(), ...snap };
    };
}

bootGame('cards', cards);
