/**
 * "Quiz" game. The number of options grows with the word stage, so a word
 * that is well known is asked among more distractors.
 */
function quiz(container) {
    // How many words this game takes per session — its own decision
    const POOL_LIMIT = 10;

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

    function render() {
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
            <div class="quiz-header-info" style="display: flex; align-items: center; gap: 8px;">
                <a class="back-btn" href="index.html" title="Back" style="display: inline-flex; align-items: center; background: transparent; border: none; color: ${palette.backBtn}; cursor: pointer; padding: 0; text-decoration: none;"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12H5" /><path d="M11 6l-6 6 6 6" /></svg></a>
            </div>
            <div class="quiz-dots-group" style="display: flex; align-items: center; gap: 6px;">
                ${dotsHtml()}
            </div>
        </div>`);

        header.querySelector('.back-btn').addEventListener('click', () => {
            page.home();
        });

        $(container, `<div class="quiz-question-card" style="width: 100%; padding: 24px 16px; background: ${palette.questionBg}; border: 1px solid ${palette.questionBorder}; border-radius: 18px; text-align: center; margin-bottom: 16px; box-sizing: border-box;">
            <div class="quiz-question-word" style="font-size: 26.4px; font-weight: 700; color: ${palette.questionText}; margin-top: 6px; word-break: break-word;">${currentItem.word.original}</div>
        </div>`);

        // The better the word is known, the more options are offered
        const stats = spacedRepetitions.getWordStats(currentItem.word);
        const currentStage = stats.stage || 0;
        const targetOptionsCount = currentStage + 1;

        const allTranslations = [];
        store.sets().forEach(s => {
            s.words.forEach(w => {
                if (w.translation && !allTranslations.includes(w.translation)) {
                    allTranslations.push(w.translation);
                }
            });
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
            const optBtn = $(optionsList, `<button class="quiz-option-btn" style="width: 100%; padding: 14px 16px; background: ${palette.optionBg}; border: 2px solid ${palette.optionBorder}; border-radius: 14px; font-weight: 600; font-size: 16.8px; color: ${palette.optionText}; cursor: pointer; transition: all 0.2s; text-align: left; display: flex; justify-content: space-between; align-items: center;">
                <span class="quiz-option-label">${opt}</span>
                <span class="quiz-option-right" style="display: flex; align-items: center; flex: none;">
                    <span class="quiz-option-icon status-icon" style="font-size: 16.8px;"></span>
                    <span class="quiz-option-arrow" style="display: none; color: ${palette.cursor};">${SUBMIT_ARROW}</span>
                </span>
            </button>`);

            optionButtons.push(optBtn);

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
                        optBtn.style.color = palette.onResult;
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
                                b.style.color = palette.onResult;
                                b.querySelector('.status-icon').textContent = '✓';
                            } else if (b === optBtn) {
                                b.style.background = palette.errFill;
                                b.style.borderColor = palette.errFill;
                                b.style.color = palette.onResult;
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
        if (Array.isArray(state.sessionPool)) {
            state.sessionPool.forEach(item => store.migrateWord(item && item.word));
        }
    };
}

bootGame('quiz', quiz);
