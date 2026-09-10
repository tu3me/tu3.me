/**
 * The catalog — the start screen: word sets, their progress bubbles, the theme
 * toggle and the entry points into the games. Owns the bubble rendering and the
 * "nothing to repeat yet" dialog, since nothing else uses them.
 *
 * It learns which mechanics exist only from GAMES, and which session is
 * unfinished only from active_session. It never reads a game's own state.
 */
function catalog(container) {
    let palette = {};

    // The unfinished session, or null. Handed in at boot.
    let session = null;

    // Screen state, deliberately not stored on the set objects: word_sets carries
    // domain data only, and an edit form has no business surviving a reload.
    const editing = new Set();
    const createdEmpty = new Set();

    // Stage-based bubble palette (stages 0-8 mapped to increasing progress colors).
    // Independent of the light/dark theme: the bubble always carries its own colors.
    const STAGE_COLORS = [
        // Stage 0 — new/unplayed (neutral gray-slate)
        { bgColor: "#F8FAFC", borderColor: "#cbd5e1", textColor: "#334155", transColor: "#64748b" },
        // Stage 1 — just started (warm yellow)
        { bgColor: "#FEFCE8", borderColor: "#fde047", textColor: "#713f12", transColor: "#854d0e" },
        // Stage 2 — early progress (amber)
        { bgColor: "#FEF3C7", borderColor: "#fcd34d", textColor: "#78350f", transColor: "#92400e" },
        // Stage 3 — gaining momentum (lime-green)
        { bgColor: "#ECFCCB", borderColor: "#a3e635", textColor: "#365314", transColor: "#4d7c0f" },
        // Stage 4 — solid progress (emerald)
        { bgColor: "#A7F3D0", borderColor: "#34d399", textColor: "#064e3b", transColor: "#047857" },
        // Stage 5 — strong (teal)
        { bgColor: "#99F6E4", borderColor: "#2dd4bf", textColor: "#134e4a", transColor: "#0f766e" },
        // Stage 6 — very strong (cyan-sky)
        { bgColor: "#BAE6FD", borderColor: "#38bdf8", textColor: "#0c4a6e", transColor: "#0369a1" },
        // Stage 7 — near mastery (indigo)
        { bgColor: "#C7D2FE", borderColor: "#818cf8", textColor: "#312e81", transColor: "#3730a3" },
        // Stage 8 — mastered (purple-pink)
        { bgColor: "#FBCFE8", borderColor: "#f472b6", textColor: "#831843", transColor: "#9d174d" }
    ];

    function getStageColors(stage) {
        const idx = Math.min(Math.max(stage || 0, 0), STAGE_COLORS.length - 1);
        return STAGE_COLORS[idx];
    }

    // Compact timer text for bubble badges (e.g. "5m", "2h", "3d")
    function getCompactTimerText(nextReview) {
        if (!nextReview) return null;
        const diffMs = nextReview - Date.now();
        if (diffMs <= 0) return null; // due — no timer needed

        const diffMins = Math.ceil(diffMs / (60 * 1000));
        if (diffMins < 60) return `${diffMins}m`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h`;

        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d`;
    }

    /**
     * Build bubble data for a word object based on its repetition history.
     * Marks are the symbols of the whole timeline: results, skipped and pending intervals.
     */
    function buildBubbleData(word) {
        const progress = spacedRepetitions.getWordProgress(word);
        const colors = getStageColors(progress.stage);
        const timer = getCompactTimerText(progress.nextRepetition);

        return {
            word: word.original,
            translation: word.translation,
            bgColor: colors.bgColor,
            borderColor: colors.borderColor,
            textColor: colors.textColor,
            transColor: colors.transColor,
            marks: progress.marks,
            stage: progress.stage, // TEMP (debug): stage number shown in the bubble
            timer
        };
    }

    // How every timeline status is drawn: a symbol from the sprite in <body> and its output size.
    // OK/LATE_OK and FAIL/LATE_FAIL look the same on purpose; MISSED is the same dark dot at half size.
    const MARK_ICONS = {
        OK: { id: 'mark-dot-dark', size: 5 },
        FAIL: { id: 'mark-dot-red', size: 5 },
        LATE_OK: { id: 'mark-dot-dark', size: 5 },
        LATE_FAIL: { id: 'mark-dot-red', size: 5 },
        MISSED: { id: 'mark-dot-dark', size: 3 },
        EARLY_OK: { id: 'mark-ring-dark', size: 5 },
        EARLY_FAIL: { id: 'mark-ring-red', size: 5 }
    };

    /**
     * Creates a bubble HTML element and appends it to parent
     */
    function createBubble(bubbleData, parent) {
        const { word, translation, bgColor, borderColor, textColor, transColor, marks, stage, timer } = bubbleData;

        // Build the repetition timeline: one sprite icon per repetition or elapsed interval
        let dotsHtml = '';
        for (const mark of (marks || [])) {
            const icon = MARK_ICONS[mark];
            if (!icon) continue;
            dotsHtml += `<svg class="bubble-progress-dot" width="${icon.size}" height="${icon.size}" style="display: block; flex: none;"><use href="#${icon.id}" /></svg>`;
        }

        // TEMP (debug): current stage number at the end of the timeline
        //dotsHtml += `<span class="bubble-stage-debug" style="margin-left: 2px; -font-weight: 800; color: ${textColor || '#0f172a'};">${stage}</span>`;

        // Optional timer badge in bottom-right corner
        const timerHtml = timer
            ? `<span class="bubble-timer-badge" style="position: absolute; bottom: -5px; right: -4px; background: #2563eb; color: #ffffff; font-size: 10.8px; font-weight: 800; line-height: 1; padding: 1.5px 4.5px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.18); z-index: 3; white-space: nowrap; outline: none; letter-spacing: -0.2px;">${timer}</span>`
            : '';

        const bubbleHtml = `
            <div class="word-bubble-card" style="background-color: ${bgColor}; border: 2px solid ${borderColor}; border-radius: 12px; padding: 4px; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-sizing: border-box; position: relative; user-select: none; flex: 0 1 auto; min-width: 48px; max-width: 100%;">
                <span class="bubble-word-text" style="font-weight: 800; font-size: 15.6px; line-height: 1.15; color: ${textColor || '#0f172a'}; word-break: break-word; overflow-wrap: anywhere; max-width: 100%; text-align: center; outline: none;">${word}</span>
                <div class="bubble-dots-group" style="font-size: 7px; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 1px; max-width: 100%; margin-top: 3px; line-height: 1;">
                    ${dotsHtml}
                </div>
                <span class="bubble-trans-text" style="font-size: 15.6px; font-weight: 600; line-height: 1.1; -margin-top: 2px; color: ${transColor || '#64748b'}; word-break: break-word; overflow-wrap: anywhere; max-width: 100%; text-align: center; outline: none;">${translation}</span>
                ${timerHtml}
            </div>
        `;

        return $(parent, bubbleHtml);
    }

    function render() {
        container.innerHTML = '';

        const sets = store.sets();

        const header = $(container, `<div class="dict-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 class="dict-title" style="margin: 0; font-size: 18px; color: ${palette.heading}; font-weight: 700;">Word Sets (${sets.length})</h3>
            <div class="dict-header-actions" style="display: flex; gap: 8px;">
                <button class="theme-toggle-btn" style="padding: 6px 10px; background: transparent; border: 1px solid ${palette.softBorder}; border-radius: 6px; cursor: pointer; font-size: 15.6px; color: ${palette.softColor}; transition: all 0.2s;" title="Toggle theme">${palette.themeIcon}</button>
                <button class="dict-add-set-btn" id="add-set-btn" style="padding: 6px 12px; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: 600; font-size: 15.6px; cursor: pointer; transition: background 0.2s;">+ New Set</button>
            </div>
        </div>`);

        header.querySelector('.theme-toggle-btn').addEventListener('click', () => {
            theme.set(!theme.isDark());
            catalog.setTheme(theme.isDark());
            render();
        });

        header.querySelector('#add-set-btn').addEventListener('click', () => {
            const id = Date.now().toString();
            store.addSet({
                id: id,
                // Nameless on purpose: an empty box is what lets the placeholder example
                // show, and saving without a name falls back to NEW SET NAME
                title: '',
                words: []
            });
            editing.add(id);
            createdEmpty.add(id);
            render();
        });

        const resumable = session ? GAMES.find(g => g.id === session.game) : null;
        if (resumable) {
            const label = `${resumable.icon} ${resumable.title}`;
            const banner = $(container, `<div class="continue-banner" style="background: #1e293b99; color: white; padding: 10px; border-radius: 8px; margin-bottom: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 15.6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <span class="continue-banner-text">Continue: ${label}</span>
                <span class="continue-banner-arrow">▶</span>
            </div>`);
            banner.addEventListener('click', () => {
                nav.resume(resumable, session.setId);
            });
        }

        const setsList = $(container, `<div class="dict-sets-list" style="display: flex; flex-direction: column; gap: 14px;"></div>`);

        sets.forEach((set, index) => {
            renderSetCard(setsList, set, index);
        });
    }

    function renderSetCard(parent, set, index) {
        const card = $(parent, `<div class="set-card" style="background: ${palette.cardBg}; border: 1px solid ${palette.cardBorder}; border-radius: 8px; padding: 14px; box-shadow: 0 1px 3px ${palette.cardShadow};"></div>`);

        if (editing.has(set.id)) {
            let textLines = [set.title];
            set.words.forEach(w => {
                textLines.push(`${w.original} -- ${w.translation}`);
            });

            const editForm = $(card, `<div class="set-edit-form">
                <div class="set-edit-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span class="set-edit-title" style="font-size: 15.6px; font-weight: 700; color: ${palette.heading};">Edit Set</span>
                    <div class="set-edit-actions" style="display: flex; gap: 6px;">
                        <button class="set-save-btn" style="padding: 4px 10px; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: 600; font-size: 14.4px; cursor: pointer;">Save</button>
                        <button class="set-cancel-btn" style="padding: 4px 10px; background: ${palette.softBg}; color: ${palette.softColor}; border: 1px solid ${palette.softBorder}; border-radius: 6px; font-weight: 600; font-size: 14.4px; cursor: pointer;">Cancel</button>
                    </div>
                </div>
                <label class="set-edit-hint" style="display: block; font-size: 13.2px; font-weight: 600; color: ${palette.hint}; margin-bottom: 6px;">
                    First line — Title, then: "word -- translation" (a tab works too; clear text to delete)
                </label>
                <textarea class="set-edit-textarea" placeholder="NEW SET NAME&#10;example -- пример&#10;two words -- два слова" style="width: 100%; height: 230px; background: ${palette.inputBg}; color: ${palette.inputText}; border: 1px solid ${palette.softBorder}; border-radius: 6px; padding: 8px; font-family: inherit; font-size: 15.6px; box-sizing: border-box; resize: vertical; outline: none;">${textLines.join('\n')}</textarea>
            </div>`);

            const textarea = editForm.querySelector('.set-edit-textarea');

            // Ready to type straight away, caret after whatever is already there
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);

            editForm.querySelector('.set-save-btn').addEventListener('click', () => {
                const lines = textarea.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);

                if (lines.length === 0) {
                    store.removeAt(index);
                } else {
                    // A first line that already carries a separator is a word, not a title:
                    // the name was simply left out. An existing set keeps the name it had.
                    const titled = !/\t|--/.test(lines[0]);
                    set.title = titled ? lines[0] : (set.title || 'NEW SET NAME');

                    // Existing words keep their history when the text is re-parsed
                    const existingMap = new Map(set.words.map(w => [w.original.toLowerCase(), w]));
                    const parsedWords = [];

                    for (let i = titled ? 1 : 0; i < lines.length; i++) {
                        // "--" or a tab, whichever comes first: the tab is what a paste from a
                        // spreadsheet brings. Everything past that first separator is the
                        // translation, so it may contain either character itself.
                        const cut = lines[i].search(/\t|--/);
                        const original = (cut === -1 ? lines[i] : lines[i].slice(0, cut)).trim();
                        const translation = cut === -1 ? '' : lines[i].slice(cut).replace(/^(\t|--)/, '').trim();

                        if (original) {
                            const old = existingMap.get(original.toLowerCase());
                            parsedWords.push({
                                original: original,
                                translation: translation,
                                repetitions: old ? (old.repetitions || []) : []
                            });
                        }
                    }
                    set.words = parsedWords;
                }

                editing.delete(set.id);
                createdEmpty.delete(set.id);
                store.save();
                render();
            });

            editForm.querySelector('.set-cancel-btn').addEventListener('click', () => {
                if (createdEmpty.has(set.id)) {
                    store.removeAt(index);
                }
                editing.delete(set.id);
                createdEmpty.delete(set.id);
                store.save();
                render();
            });

        } else {
            const totalWords = set.words.length;
            const progress = spacedRepetitions.calculateSetProgress(set.words);

            // Where the bar animates from: the progress this set had when the
            // running session started, kept in active_session rather than on the set.
            const baseline = session && session.startProgress ? session.startProgress[set.id] : undefined;
            const startProgress = baseline !== undefined ? baseline : progress;
            const hasProgressed = startProgress !== progress;

            $(card, `
                <div class="set-card-header" style="display: flex; gap:5px; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h4 class="set-title" style="margin: 0; line-height:1; font-size: 18px; color: ${palette.title}; font-weight: 700;">${set.title}</h4>
                    <div class="set-btn-group" style="display: flex; align-items: center; gap: 8px;">
                        <button class="set-edit-btn" title="Edit" style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; padding: 0; background: ${palette.softBg}; color: ${palette.softColor}; border: 1px solid ${palette.softBorder}; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
                            <svg class="set-edit-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </button>
                        <button class="set-flip-btn" title="Flip" style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; padding: 0; background: ${palette.softBg}; color: ${palette.softColor}; border: 1px solid ${palette.softBorder}; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
                            <svg class="set-flip-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 4 4 4-4 4M20 8H4M8 20l-4-4 4-4M4 16h16"></path></svg>
                        </button>
                    </div>
                </div>

                <div class="set-progress-bar-bg" style="position: relative; background: ${palette.barBg}; border-radius: 4px; height: 16px; width: 100%; overflow: hidden; margin-bottom: 12px;">
                    <div class="set-progress-bar-fill" style="background: ${palette.barFill}; height: 100%; border-radius: 4px; width: ${hasProgressed ? startProgress : progress}%; transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1);"></div>
                    <span class="set-progress-text" style="position: absolute; right: 4px; top: 50%; transform: translateY(-50%); font-size: 14.4px; color: ${palette.barText}; font-weight: 800; white-space: nowrap; padding: 0px 5px; border-radius: 3px; line-height: 14.4px; display: ${(hasProgressed ? startProgress : progress) === 0 ? 'none' : 'inline'};">${hasProgressed ? startProgress : progress}%</span>
                </div>

                <div class="set-words-bubbles" style="-padding-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;"></div>

                <div class="set-actions-group" style="display: flex; gap: 8px; height:50px; margin-top: 18px;">
                    ${GAMES.map(g => `<button class="set-play-btn" data-game="${g.id}" style="flex: 1; padding: 7px 4px; background: ${g.color}; color: white; border: none; border-radius: 6px; font-weight: 700; font-size: 15px; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; justify-content: center; gap: 3px;">${g.icon} ${g.title}</button>`).join('')}
                </div>
            `);

            // Render bubbles into the container
            const bubblesContainer = card.querySelector('.set-words-bubbles');
            if (totalWords === 0) {
                $(bubblesContainer, `<p class="set-empty-msg" style="margin: 4px 0; color: #94a3b8; font-size: 15.6px; font-style: italic;">Set is empty</p>`);
            } else {
                set.words.forEach(w => {
                    const bubbleData = buildBubbleData(w);
                    createBubble(bubbleData, bubblesContainer);
                });
            }

            // Animate the bar from the progress the set had when the session started
            if (hasProgressed) {
                setTimeout(() => {
                    const bar = card.querySelector('.set-progress-bar-fill');
                    const text = card.querySelector('.set-progress-text');
                    if (bar) bar.style.width = `${progress}%`;
                    if (text) {
                        text.textContent = `${progress}%`;
                        text.style.display = progress === 0 ? 'none' : 'inline';
                    }
                    // Animated once; the next render should not replay it
                    if (session && session.startProgress) {
                        session.startProgress[set.id] = progress;
                        storage.set('active_session', session);
                    }
                }, 150);
            }

            card.querySelectorAll('.set-play-btn').forEach(btn => {
                const game = GAMES.find(g => g.id === btn.dataset.game);
                btn.addEventListener('click', () => launch(game, set.id));
            });

            card.querySelector('.set-edit-btn').addEventListener('click', () => {
                editing.add(set.id);
                render();
            });

            const flipBtn = card.querySelector('.set-flip-btn');
            if (flipBtn) {
                flipBtn.addEventListener('click', () => {
                    if (!set.words || set.words.length === 0) return;
                    set.words.forEach(w => {
                        const temp = w.original;
                        w.original = w.translation || '';
                        w.translation = temp || '';
                    });
                    store.save();
                    render();
                });
            }
        }
    }

    catalog.render = render;

    catalog.setTheme = (isDark) => {
        palette = {
            heading: isDark ? '#f8fafc' : '#1e293b',
            title: isDark ? '#f8fafc' : '#0f172a',
            themeIcon: isDark ? '☀️' : '🌙',
            softBg: isDark ? '#334155' : '#f1f5f9',
            softColor: isDark ? '#cbd5e1' : '#475569',
            softBorder: isDark ? '#475569' : '#cbd5e1',
            cardBg: isDark ? '#1e293b' : '#ffffff',
            cardBorder: isDark ? '#334155' : '#e2e8f0',
            cardShadow: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
            hint: isDark ? '#94a3b8' : '#64748b',
            inputBg: isDark ? '#0f172a' : '#ffffff',
            inputText: isDark ? '#f8fafc' : '#0f172a',
            barBg: isDark ? '#334155' : '#e2e8f0',
            barFill: isDark ? '#3b82f6' : '#2563eb',
            barText: isDark ? '#f8fafc' : '#64748b',
            dialogBg: isDark ? '#1e293b' : '#ffffff',
            dialogText: isDark ? '#f8fafc' : '#0f172a',
            dialogBorder: isDark ? '#334155' : '#e2e8f0',
            dialogBody: isDark ? '#cbd5e1' : '#475569'
        };
    };

    catalog.setSession = (value) => { session = value; };

    // Starting a session. Whether anything is due is a property of the set and of
    // the algorithm, not of any game, so the catalog answers it itself — and asking
    // here means Cancel costs nothing, since no page has been loaded yet.
    function launch(game, setId) {
        if (store.wordsOf(setId).length === 0) return;

        if (store.duePool(setId, false).length === 0) {
            confirmEarly(() => beginSession(game, setId, true));
            return;
        }
        beginSession(game, setId, false);
    }

    async function beginSession(game, setId, allowEarly) {
        await storage.set('active_session', {
            game: game.id,
            setId: setId,
            startedAt: Date.now(),
            startProgress: store.progressSnapshot()
        });
        await nav.game(game, setId, allowEarly);
    }

    // Modal shown when every word of the selection is still waiting for its timer
    function confirmEarly(onPlayAnyway) {
        const overlay = $(`<div class="early-dialog-overlay" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 100;">
            <div class="early-dialog" style="background: ${palette.dialogBg}; color: ${palette.dialogText}; border: 1px solid ${palette.dialogBorder}; border-radius: 12px; padding: 16px; max-width: 320px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.25);">
                <div class="early-dialog-title" style="font-size: 16.8px; font-weight: 700; margin-bottom: 6px;">⏳ Nothing to repeat yet</div>
                <div class="early-dialog-text" style="font-size: 15px; line-height: 1.35; color: ${palette.dialogBody}; margin-bottom: 14px;">All words in this selection are still waiting for their timers. An early repetition will not raise the progress, but a mistake will still set the word back.</div>
                <div class="early-dialog-actions" style="display: flex; gap: 8px;">
                    <button class="early-dialog-cancel" style="flex: 1; padding: 9px; background: ${palette.softBg}; color: ${palette.softColor}; border: 1px solid ${palette.softBorder}; border-radius: 8px; font-weight: 700; font-size: 15px; cursor: pointer;">Cancel</button>
                    <button class="early-dialog-play" style="flex: 1; padding: 9px; background: #2563eb; color: #ffffff; border: none; border-radius: 8px; font-weight: 700; font-size: 15px; cursor: pointer;">Play anyway</button>
                </div>
            </div>
        </div>`);

        const close = () => overlay.remove();
        overlay.querySelector('.early-dialog-cancel').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        overlay.querySelector('.early-dialog-play').addEventListener('click', () => {
            close();
            onPlayAnyway();
        });
    }
}

async function bootCatalog() {
    spacedRepetitions();
    storage();
    store();

    await storage.init();

    const settings = await storage.get('settings');
    const isDark = !!(settings && settings.isDark);

    await store.load();

    const container = $(`<div class="app-main-content"></div>`);
    catalog(container);
    catalog.setSession(await storage.get('active_session'));

    // The player is here, so this is where the popup should reopen.
    nav.setEntryPoint('index.html');

    theme.apply(isDark);
    catalog.setTheme(isDark);
    catalog.render();
    popupHeight.release();
}

bootCatalog();
