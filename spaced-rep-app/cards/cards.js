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

    // Keyboard: ← is "don't remember", → is "know" before the flip and "got it" after it
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

            return `<div class="cards-dot" style="width: 10px; height: 10px; border-radius: 50%; background: ${bg}; ${ringStyle} transition: all 0.2s; flex-shrink: 0;"></div>`;
        }).join('');

        // The dots are redrawn mid-card now, not only when the next card is rendered
        function refreshDots() {
            const group = header.querySelector('.cards-dots-group');
            if (group) group.innerHTML = dotsHtml();
        }

        const header = $(container, `<div class="cards-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div class="cards-header-info" style="display: flex; align-items: center; gap: 8px;">
                <a class="back-btn" href="index.html" title="Back" style="display: inline-flex; align-items: center; background: transparent; border: none; color: ${palette.backBtn}; cursor: pointer; padding: 0; text-decoration: none;"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12H5" /><path d="M11 6l-6 6 6 6" /></svg></a>
            </div>
            <div class="cards-dots-group" style="display: flex; align-items: center; gap: 6px;">
                ${dotsHtml()}
            </div>
        </div>`);

        header.querySelector('.back-btn').addEventListener('click', () => {
            page.home();
        });

        const cardWrapper = $(container, `<div class="cards-viewport" style="width: 100%; height: 170px; cursor: pointer; margin-bottom: 16px; perspective: 1000px;">
            <div class="cards-flipper-inner" id="card-inner" style="width: 100%; height: 100%; position: relative; transform-style: preserve-3d; transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); transform: ${state.isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'};">

                <div class="card-face card-face--front" style="position: absolute; width: 100%; height: 100%; backface-visibility: hidden; -webkit-backface-visibility: hidden; background: ${palette.frontBg}; border: 1px solid ${palette.frontBorder}; border-radius: 18px; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 16px; box-sizing: border-box;">
                    <div class="cards-word-text" style="font-size: 26.4px; font-weight: 700; color: ${palette.frontText}; text-align: center; word-break: break-word;">${currentItem.word.original}</div>
                </div>

                <div class="card-face card-face--back" style="position: absolute; width: 100%; height: 100%; backface-visibility: hidden; -webkit-backface-visibility: hidden; transform: rotateY(180deg); background: ${palette.backBg}; border: 1px solid ${palette.backBorder}; border-radius: 18px; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 16px; box-sizing: border-box;">
                    <div class="cards-word-text" style="font-size: 26.4px; font-weight: 700; color: ${palette.backText}; text-align: center; word-break: break-word;">${currentItem.word.translation || '—'}</div>
                </div>

            </div>
        </div>`);

        const actionsContainer = $(container, `<div class="cards-actions-group"></div>`);

        // Seeing the translation is the mistake itself, so it is recorded and shown on the
        // dots at that moment — by the time "Got it" is pressed there is nothing left to
        // score. Guarded, because the card can be revealed by its button or by a click on it.
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

        function renderActionButtons() {
            actionsContainer.innerHTML = '';

            if (!state.hasBeenFlipped) {
                const actionButtons = $(actionsContainer, `<div class="cards-buttons-row" style="display: flex; gap: 8px;">
                    <button class="cards-btn-dont-know" id="btn-dont-know" style="flex: 1; padding: 11px; background: ${palette.noBg}; color: ${palette.noText}; border: none; border-radius: 14px; font-weight: 700; font-size: 15.6px; cursor: pointer; transition: all 0.2s;">← ✕ Don't remember</button>
                    <button class="cards-btn-know" id="btn-know" style="flex: 1; padding: 11px; background: ${palette.yesBg}; color: ${palette.yesText}; border: none; border-radius: 14px; font-weight: 700; font-size: 15.6px; cursor: pointer; transition: all 0.2s;">✓ Know →</button>
                </div>`);

                actionButtons.querySelector('#btn-dont-know').addEventListener('click', () => {
                    markRevealed();
                    state.isFlipped = true;
                    const inner = container.querySelector('#card-inner');
                    if (inner) inner.style.transform = 'rotateY(180deg)';
                    renderActionButtons();
                    page.save();
                });

                actionButtons.querySelector('#btn-know').addEventListener('click', () => {
                    advance(1, 'correct');
                });
            } else {
                const singleBtn = $(actionsContainer, `<div class="cards-btn-remember-wrapper">
                    <button class="cards-btn-remember" id="btn-remember" style="width: 100%; padding: 10px; background: ${palette.ring}; color: ${palette.onRing}; border: none; border-radius: 14px; font-weight: 700; font-size: 15.6px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        Got it →
                    </button>
                </div>`);

                // The mistake was already recorded when the translation was revealed
                singleBtn.querySelector('#btn-remember').addEventListener('click', () => {
                    advance();
                });
            }
        }

        cardWrapper.addEventListener('click', () => {
            if (!state.isFlipped) markRevealed();
            state.isFlipped = !state.isFlipped;
            const inner = cardWrapper.querySelector('#card-inner');
            if (inner) inner.style.transform = state.isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
            renderActionButtons();
            page.save();
        });

        renderActionButtons();

        // The buttons are rebuilt on every flip, so the key press looks them up by then:
        // ← only exists before the flip, → always confirms whatever the right-hand button is
        bindKeys((code) => {
            const btn = code === 'ArrowLeft'
                ? container.querySelector('#btn-dont-know')
                : (container.querySelector('#btn-know') || container.querySelector('#btn-remember'));
            if (btn) btn.click();
        });

        page.save();
    }

    cards.render = render;

    cards.setTheme = (isDark) => {
        const t = tokens.of(isDark);

        palette = {
            dotIdle: t.border,
            ring: t.accent,
            // Marks where you are right now — the dot you are on, and in quiz
            // the option under the keyboard cursor. Its own token rather than
            // the accent, because `ring` also paints the buttons, and "you are
            // here" should not shout in the same colour as "press this".
            cursor: t.progress,
            backBtn: t.muted,

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

            onRing: t.onAccent,

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
        if (Array.isArray(state.sessionPool)) {
            state.sessionPool.forEach(item => store.migrateWord(item && item.word));
        }
    };
}

bootGame('cards', cards);
