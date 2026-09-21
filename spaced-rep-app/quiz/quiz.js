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

    let state = getEmptyState();
    let palette = {};

    function getEmptyState() {
        return { selectedSetId: 'all', currentIndex: 0, sessionResults: [], sessionPool: null, allowEarly: false };
    }

    // Keyboard: ↑/↓ move the highlight over the options, → answers with the highlighted one
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
    // Drawn on the same 24-unit grid and 2-unit stroke as every other icon here.
    const SUBMIT_ARROW = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true" style="display: block;">
        <path d="M5 12h13M13 6l6 6-6 6" /></svg>`;

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
        return speech.words(text).map(part => {
            if (!part.isWord) return escapeText(part.text);

            const letters = speech.letters(part.text)
                .map(ch => `<span class="say-letter">${escapeText(ch)}</span>`)
                .join('');

            return `<span class="say-word" style="border-radius: 4px;">${letters}</span>`;
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
    const WORD_SIZE = 35.2;

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
            // which is the third depth reached without the first two.
            if (!letter) {
                forgetTaps();
                return sayLine(root, text, lang);
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
     * A letter is coloured rather than filled: it is one glyph wide, and a fill
     * that size reads as a typo rather than as a mark. A word is filled, because
     * mid-light mint as text is 2.1:1 on the light theme — unreadable at the
     * moment it is being read out — while as a fill it is one value in both
     * themes with dark ink on it.
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

    function sayWord(root, word, lang) {
        if (!word) return;

        sayLater(word.textContent, lang, light([tint(word, wordsIn(root).indexOf(word))]));
    }

    function sayLine(root, text, lang) {
        // A colour each, so the line reads as the words it is made of rather
        // than as one long stripe. They repeat past the fourth word, which is
        // where a question stops being a question and starts being a sentence.
        sayLater(text, lang, light(wordsIn(root).map(tint)));
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

            return `<div class="quiz-dot" style="width: 10px; height: 10px; border-radius: 50%; background: ${bg}; ${ringStyle} transition: all 0.2s; flex-shrink: 0;"></div>`;
        }).join('');

        // The dots are redrawn as soon as the answer is scored, not only on the next word
        function refreshDots() {
            const group = header.querySelector('.quiz-dots-group');
            if (group) group.innerHTML = dotsHtml();
        }

        const header = $(container, `<div class="quiz-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div class="quiz-header-info" style="display: flex; flex: 1; align-items: center; gap: 8px;">
                <a class="back-btn" href="index.html" title="Back" style="display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; flex: none; background: transparent; border: 1px solid ${palette.chromeBorder}; border-radius: 12px; color: ${palette.backBtn}; cursor: pointer; padding: 0; text-decoration: none;"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12H5" /><path d="M11 6l-6 6 6 6" /></svg></a>
            </div>
            <div class="quiz-dots-group" style="display: flex; flex: 1; justify-content: center; align-items: center; gap: 6px;">
                ${dotsHtml()}
            </div>
        </div>`);

        header.querySelector('.back-btn').addEventListener('click', () => {
            page.home();
        });

        page.muteButton(header, palette.backBtn, palette.chromeBorder);

        const questionCard = $(container, `<div class="quiz-question-card" style="width: 100%; padding: 24px 16px; background: ${palette.questionBg}; border: 1px solid ${palette.questionBorder}; border-radius: 18px; text-align: center; margin-bottom: 16px; box-sizing: border-box; cursor: pointer;">
            <div class="quiz-question-word" style="font-size: ${WORD_SIZE}px; font-weight: 700; color: ${palette.questionText}; margin-top: 6px; word-break: break-word;">${speech.speakerHtml(currentItem.word.original, currentItem.word.originalLang, palette.sayIcon, SAY_LEAD)}${lineHtml(currentItem.word.original)}</div>
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
        listen(questionCard, currentItem.word.original, currentItem.word.originalLang);

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
         * Read through the pool item's own set rather than the session's,
         * because a session over every set is still a sequence of questions,
         * each of which came from one.
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
        const allTranslations = [];
        const langOf = new Map();

        store.wordsOf(currentItem.setId).forEach(({ word }) => {
            if (!word.translation || allTranslations.includes(word.translation)) return;

            allTranslations.push(word.translation);
            langOf.set(word.translation, word.translationLang);
        });

        const correctTranslation = currentItem.word.translation;
        const distractors = allTranslations.filter(t => t !== correctTranslation);
        distractors.sort(() => Math.random() - 0.5);

        const countToTake = Math.min(targetOptionsCount - 1, distractors.length);
        const selectedOptions = [correctTranslation, ...distractors.slice(0, countToTake)];
        selectedOptions.sort(() => Math.random() - 0.5);

        const optionsList = $(container, `<div class="quiz-options-list" style="display: flex; flex-direction: column; gap: 8px;"></div>`);

        const optionButtons = [];
        let selectedIndex = 0;
        let isAnswered = false;
        let wasWrong = false;

        // The keyboard cursor is an outline drawn outside the border, so it never
        // covers the border itself, plus an arrow in the option's right gutter
        // saying which key sends it. Both are dropped the moment an answer is
        // given: from then on the fill carries the result, and a cursor sitting
        // on top of it only makes that harder to read.
        function showCursor(button, on) {
            button.style.outline = on ? `2px solid ${palette.cursor}` : 'none';
            button.style.outlineOffset = '2px';
            const arrow = button.querySelector('.quiz-option-arrow');
            if (arrow) arrow.style.display = on ? 'block' : 'none';
        }

        /*
         * The ink an answered option is written in — the speaker along with the
         * rest of it. It carries a colour of its own, so it would otherwise stay
         * muted on top of the fill, which is both where it is least readable and
         * where it is most wanted: after a mistake the right answer is showing,
         * and that is the one worth hearing.
         */
        function inkOnResult(button) {
            button.style.color = palette.onResult;

            const speaker = button.querySelector('.say-all');
            if (speaker) speaker.style.color = palette.onResult;
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
                page.finish();
            } else {
                render();
                page.save();
            }
        }

        selectedOptions.forEach((opt, optIndex) => {
            const optBtn = $(optionsList, `<button class="quiz-option-btn" style="width: 100%; padding: 14px 16px; background: ${palette.optionBg}; border: 2px solid ${palette.optionBorder}; border-radius: 14px; font-weight: 600; font-size: 16.8px; color: ${palette.optionText}; cursor: pointer; transition: all 0.2s; text-align: left; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                <span class="quiz-option-left" style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                    ${speech.speakerHtml(opt, langOf.get(opt), palette.sayIcon, 'margin-top: 0; font-size: 18px; flex: none;')}
                    <span class="quiz-option-label">${escapeText(opt)}</span>
                </span>
                <span class="quiz-option-right" style="display: flex; align-items: center; flex: none;">
                    <span class="quiz-option-icon status-icon" style="font-size: 16.8px;"></span>
                    <span class="quiz-option-arrow" style="display: none; color: ${palette.cursor};">${SUBMIT_ARROW}</span>
                </span>
            </button>`);

            optionButtons.push(optBtn);

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

                // Nothing heard, and the switch in the header is the reason:
                // the switch answers, the same as it does for the question.
                if (speech.say(opt, langOf.get(opt))) return;
                if (speech.muted()) page.pulseMute();
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
                        optBtn.style.background = palette.okFill;
                        optBtn.style.borderColor = palette.okFill;
                        inkOnResult(optBtn);
                        optBtn.querySelector('.status-icon').textContent = '✓';

                        store.recordRepetition(currentItem, 1, 'quiz');
                        state.sessionResults[state.currentIndex] = 'correct';

                        store.save();
                        refreshDots();

                        setTimeout(advance, 700);
                    } else {
                        wasWrong = true;

                        store.recordRepetition(currentItem, 0, 'quiz');
                        state.sessionResults[state.currentIndex] = 'wrong';

                        store.save();
                        refreshDots();

                        // Reveal the right answer, mark the wrong pick, dim the rest
                        const allBtns = optionsList.querySelectorAll('.quiz-option-btn');
                        allBtns.forEach(b => {
                            const text = b.querySelector('.quiz-option-label').textContent;
                            if (text === correctTranslation) {
                                b.style.background = palette.okFill;
                                b.style.borderColor = palette.okFill;
                                inkOnResult(b);
                                b.querySelector('.status-icon').textContent = '✓';
                            } else if (b === optBtn) {
                                b.style.background = palette.errFill;
                                b.style.borderColor = palette.errFill;
                                inkOnResult(b);
                                b.querySelector('.status-icon').textContent = '✕';
                                b.dataset.disabled = 'true';
                            } else {
                                b.style.opacity = '0.5';
                                b.dataset.disabled = 'true';
                            }
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

        highlight(0);

        bindKeys((code) => {
            if (code === 'ArrowUp') highlight(selectedIndex - 1);
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
            backBtn: t.muted,

            // Flat panels, no gradients: the question and the answers already
            // differ by shape and position, which is enough.
            questionBg: t.surface,
            questionBorder: t.border,
            questionText: t.ink,

            optionBg: t.surface,
            optionBorder: t.border,
            optionText: t.ink,

            // An answered option keeps its surface and states itself through the
            // border, the way the reference does.
            // An answered option is filled solid rather than tinted: the result
            // is the loudest thing on the screen for the moment it is shown.
            //
            // The ink is dark, not white. White on the dark theme's mint is
            // 2.1:1 — unreadable — where this ink is 6.9:1, and it clears 3.6:1
            // or better on all four fills, which white manages on exactly one.
            okFill: t.ok,
            errFill: t.err,
            onResult: '#0f2b3c',

            // Said out loud: a mint fill and that same dark ink, for the same
            // reason — a mid-light colour belongs on a fill rather than in
            // letters. The speaker beside the question is muted until it
            // answers: it is an offer, not the thing to press.
            // A letter being said is written in mint rather than filled with it:
            // one glyph is too small a thing to fill. Words are filled instead,
            // from the bubble ramp — see WORD_FILLS.
            sayFill: t.progress,
            sayIcon: t.muted,

            // Still read by the dots along the top, which are too small to fill.
            okText: t.ok,
            errText: t.err
        };
    };

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
        allowEarly: state.allowEarly
    });

    quiz.setState = (snap) => {
        if (!snap) return;
        state = { ...getEmptyState(), ...snap };
    };
}

bootGame('quiz', quiz);
