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
            if (res === 'correct') bg = '#22c55e';
            if (res === 'wrong') bg = '#ef4444';

            const isCurrent = idx === state.currentIndex;
            const ringStyle = isCurrent ? `outline: 2px solid ${palette.ring}; outline-offset: 1px; transform: scale(1.15);` : '';

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

        $(container, `<div class="quiz-question-card" style="width: 100%; padding: 24px 16px; background: ${palette.questionBg}; border: 1px solid ${palette.questionBorder}; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); margin-bottom: 16px; box-sizing: border-box;">
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

        // The keyboard cursor is drawn as an outline, so it never collides with the
        // background and border an answered option is painted with
        function highlight(index) {
            if (optionButtons.length === 0) return;
            selectedIndex = (index + optionButtons.length) % optionButtons.length;
            optionButtons.forEach((b, i) => {
                b.style.outline = i === selectedIndex ? `2px solid ${palette.ring}` : 'none';
                b.style.outlineOffset = '2px';
            });
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
            const optBtn = $(optionsList, `<button class="quiz-option-btn" style="width: 100%; padding: 12px; background: ${palette.optionBg}; border: 1px solid ${palette.optionBorder}; border-radius: 8px; font-weight: 600; font-size: 16.8px; color: ${palette.optionText}; cursor: pointer; transition: all 0.2s; text-align: left; display: flex; justify-content: space-between; align-items: center;">
                <span class="quiz-option-label">${opt}</span>
                <span class="quiz-option-icon status-icon" style="font-size: 16.8px;"></span>
            </button>`);

            optionButtons.push(optBtn);

            optBtn.addEventListener('click', () => {
                if (optBtn.dataset.disabled === 'true') return;

                // Clicking moves the cursor too, so mouse and keyboard never disagree
                highlight(optIndex);

                const isCorrect = (opt === correctTranslation);

                if (!isAnswered) {
                    isAnswered = true;

                    if (isCorrect) {
                        optBtn.style.background = palette.okBg;
                        optBtn.style.borderColor = palette.okBorder;
                        optBtn.style.color = palette.okText;
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
                                b.style.background = palette.okBg;
                                b.style.borderColor = palette.okBorder;
                                b.style.color = palette.okText;
                                b.querySelector('.status-icon').textContent = '✓';
                            } else if (b === optBtn) {
                                b.style.background = palette.errBg;
                                b.style.borderColor = palette.errBorder;
                                b.style.color = palette.errText;
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
        palette = {
            dotIdle: isDark ? '#475569' : '#cbd5e1',
            ring: isDark ? '#60a5fa' : '#2563eb',
            backBtn: isDark ? '#cbd5e1' : '#334155',
            questionBg: isDark ? 'linear-gradient(135deg, #1e293b, #0f172a)' : 'linear-gradient(135deg, #ffffff, #f8fafc)',
            questionBorder: isDark ? '#334155' : '#cbd5e1',
            questionText: isDark ? '#f8fafc' : '#0f172a',
            optionBg: isDark ? '#1e293b' : '#ffffff',
            optionBorder: isDark ? '#334155' : '#cbd5e1',
            optionText: isDark ? '#f8fafc' : '#1e293b',
            okBg: isDark ? '#14532d' : '#dcfce7',
            okBorder: isDark ? '#166534' : '#86efac',
            okText: isDark ? '#4ade80' : '#16a34a',
            errBg: isDark ? '#451a1a' : '#fee2e2',
            errBorder: isDark ? '#7f1d1d' : '#fca5a5',
            errText: isDark ? '#fca5a5' : '#dc2626'
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
