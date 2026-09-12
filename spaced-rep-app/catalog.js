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

    // Whether the next draw should grow the bars out of nothing. Armed by
    // catalog.render(), which is the entry the page itself calls — opening the
    // catalog, or coming back to it from a game. The redraws the screen does to
    // itself, toggling the theme or opening an edit form, call render() straight
    // and leave it alone: replaying the animation every time a set is saved is
    // fidgety rather than lively.
    let introduce = false;

    // Armed by the New Set button just before the redraw it causes, and spent by
    // that redraw. The catalog rebuilds itself wholesale, so the form arrives as
    // a brand new element with no past to animate out of: the only way to move
    // it is to hand it a starting state and let it off a frame later.
    let unfolding = false;

    /*
     * The room the Continue banner was taking when the form was opened, measured
     * before the redraw that hides it.
     *
     * The banner goes the moment the form arrives, so a fold that started at
     * nothing would drop the whole column by the banner's height and lift it
     * back at the end. Starting and finishing at exactly that height makes both
     * ends of the fold a swap of one block for another of the same size, and
     * nothing below moves.
     *
     * Its margin counts as much as its height: it is the space the banner was
     * occupying that has to be filled, not the box alone.
     *
     * Zero when there was no banner — nothing unfinished to continue — and then
     * the form folds down to nothing as before.
     */
    let bannerSpace = 0;

    // Set while the form is folding shut. The fold has to finish before the set
    // behind it is dropped, and until then the button still works — a second
    // press would start a second fold on a card that is already half gone.
    let closing = false;

    // The ramp lives in tokens.js. Captured once and never rebound: it is the
    // same in both themes, because a stage means the same thing in both.
    const stageRamp = tokens.stages();

    function getStageColors(stage) {
        const idx = Math.min(Math.max(stage || 0, 0), stageRamp.length - 1);
        return stageRamp[idx];
    }

    /*
     * The logo, drawn rather than loaded.
     *
     * It used to be icons/icon-128.png, and a PNG cannot be recoloured — the
     * blue is baked into the pixels. Redrawn here it takes a fill like anything
     * else, and it stays sharp at any size instead of being a 128px bitmap
     * squeezed into 32.
     *
     * The geometry is make-icons.py's, resolved to a 32-unit grid: a landscape
     * card tilted seven degrees with two rings on it, the left one larger, which
     * is what gives the face its puzzled look. The tilt scaling that script
     * applies so the turned card still fits its canvas is baked into the numbers
     * below.
     *
     * Drawn at LOGO_SIZE, which is a few pixels taller than the two-line
     * wordmark beside it. Matching that height exactly makes the mark look like
     * a third line of the text rather than the thing the text is next to.
     */
    const LOGO_SIZE = 40;

    function logoSvg(fill, size) {
        return `<svg class="dict-logo" width="${size}" height="${size}" viewBox="0 0 32 32"
            aria-hidden="true" style="display: block; flex-shrink: 0;">
            <g transform="rotate(-7 16 16)">
                <rect x="1.95" y="4.34" width="28.09" height="23.31" rx="5.23" fill="${fill}" />
                <circle cx="11.37" cy="16" r="4.86" fill="none" stroke="#ffffff" stroke-width="2.83" />
                <circle cx="23.02" cy="16" r="3.01" fill="none" stroke="#ffffff" stroke-width="1.75" />
            </g>
        </svg>`;
    }

    // Chrome icons: the same 24-unit grid and 2-unit stroke as the game icons,
    // so the header does not look like it was drawn by someone else.
    function chromeIcon(body) {
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round" aria-hidden="true" style="display: block;">${body}</svg>`;
    }

    const SUN = chromeIcon(`
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.4v2.3M12 19.3v2.3M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.4 12h2.3M19.3 12h2.3M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" />`);

    const MOON = chromeIcon(`
        <path d="M20.6 14.4A8.7 8.7 0 0 1 9.6 3.4 8.7 8.7 0 1 0 20.6 14.4z" />`);

    const CHEVRON = chromeIcon(`<path d="M9 5l7 7-7 7" />`);

    /*
     * The ways a word list gets here, each folded away under the box it ends in.
     *
     * Written out because the box on its own answers the wrong question: it says
     * what the text has to look like, not where a hundred words are supposed to
     * come from. Typing them one at a time is the answer nobody wants, and all
     * three of these end in a paste.
     *
     * A step is a line of text, a line that leads somewhere, a line that carries
     * an icon, or a line with a prompt worth pasting into an AI tool.
     *
     * The prompt is written out rather than described because the shape of the
     * answer is the whole point: one "word -- translation" per line is exactly
     * what the box above parses, so a good answer needs no editing.
     *
     * Data rather than three blocks of markup: they are the same shape, and a
     * fourth route should cost one entry.
     */
    const ROUTES = [
        {
            question: 'How to export from Google Translate?',
            steps: [
                {
                    text: 'Go to your saved translations',
                    linkText: 'saved translations',
                    link: 'https://translate.google.com/saved'
                },
                { text: 'Press Export', icon: 'sheet' },
                'Select only words and translations in the table, copy and paste them in the box above'
            ]
        },
        {
            question: 'How to add words from a paper book or notebook?',
            steps: [
                'Photograph the list of words and give the photo to any AI tool',
                {
                    text: 'Ask it to extract the words with their translations',
                    prompt: 'Extract every word from this photo and translate it into [your language]. '
                        + 'Return one pair per line as "word -- translation", with no numbering and nothing else.'
                },
                'Copy the result and paste it in the box above'
            ]
        },
        {
            question: 'How to make a set from a web page or a YouTube video?',
            steps: [
                'Give the link to any AI tool',
                {
                    text: 'Ask it to extract the words with their translations',
                    prompt: 'Extract the useful words from this page or video and translate them into [your language]. '
                        + 'Return one pair per line as "word -- translation", with no numbering and nothing else.'
                },
                'Copy the result and paste it in the box above'
            ]
        }
    ];

    /*
     * One folding section: a header that toggles, and a body that is there or
     * not. Open is written into the markup rather than set afterwards, so the
     * section is drawn in the state it belongs in and nothing flickers shut.
     *
     * A real button, not a div with a click handler: it is reachable by keyboard
     * and says what it is out loud, both for free.
     */
    function foldingSection(label, bodyHtml, open) {
        return `<div class="set-fold">
            <button class="set-fold-toggle" aria-expanded="${open}" style="display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 0; background: transparent; border: none; color: ${palette.title}; font-family: inherit; font-size: 14.4px; font-weight: 600; line-height: 1.35; text-align: left; cursor: pointer;">
                <span class="set-fold-chevron" style="display: block; flex: none; color: ${palette.softColor}; transform: rotate(${open ? 90 : 0}deg); transition: transform 0.18s ease-out;">${CHEVRON}</span>
                <span class="set-fold-label" style="flex: 1;">${label}</span>
            </button>
            <div class="set-fold-body" style="padding-bottom: 10px;"${open ? '' : ' hidden'}>${bodyHtml}</div>
        </div>`;
    }

    /*
     * The spreadsheet the Export button on the Translate page is marked with.
     * Drawn rather than fetched: it is the only image this screen would need,
     * and the app has no picture files to begin with.
     *
     * The tile takes the step's own colour, and the grid is cut out of it in the
     * card's colour rather than painted white — on the dark theme white lines
     * would glare, and a hole reads as a hole in both.
     */
    function sheetIcon() {
        return `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style="display: inline-block; vertical-align: -4px; margin-left: 5px;">
            <rect x="2.5" y="2.5" width="19" height="19" rx="4.6" fill="currentColor" />
            <g stroke="${palette.cardBg}" stroke-width="3">
                <path d="M10.3 5.6v12.8" />
                <path d="M5.6 9.9h12.8" />
            </g>
        </svg>`;
    }

    /*
     * What goes inside a step: its line, with a link in it if it leads somewhere,
     * and the prompt box if it carries one.
     *
     * linkText names the words that carry the link — the ones that name the
     * destination, so the underline marks where it goes instead of dragging
     * along the verb and the pronoun in front of it. Without it the whole line
     * becomes the link.
     *
     * The link keeps the text's own colour and takes an underline instead. The
     * palette has no colour to spare for it — coral is the Save button and mint
     * is progress, and mint on the light theme's white card is 2.1:1 besides.
     * An underline says "link" everywhere and costs no contrast.
     */
    function stepBody(step) {
        if (typeof step === 'string') return step;

        let line = step.text;

        if (step.link) {
            const label = step.linkText || step.text;
            const anchor = `<a class="set-step-link" href="${step.link}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline; text-underline-offset: 2px;">${label}</a>`;
            line = step.linkText ? line.replace(label, anchor) : anchor;
        }

        if (step.icon === 'sheet') line += sheetIcon();

        return step.prompt ? line + promptBox(step.prompt) : line;
    }

    /*
     * A prompt and the button that lifts it.
     *
     * The button is worth more than it looks: the prompt is three lines long and
     * has to arrive in another app intact, and retyping it on a phone is exactly
     * the work this screen exists to avoid.
     *
     * The line above the box is left out of it on purpose: the box is what the
     * button lifts, and a caption inside it would ride along into the paste.
     */
    function promptBox(text) {
        return `<div class="set-prompt-lead" style="margin-top: 4px;">Here is your prompt</div>
        <div class="set-prompt" style="margin: 5px 0 7px; background: ${palette.inputBg}; border: 1px solid ${palette.softBorder}; border-radius: 12px; padding: 8px;">
            <div class="set-prompt-text" style="font-size: 12.6px; font-weight: 500; line-height: 1.45; color: ${palette.inputText};">${text}</div>
            <button class="set-prompt-copy" style="display: block; margin: 7px 0 0 auto; padding: 3px 10px; background: ${palette.cardBg}; color: ${palette.title}; border: 1px solid ${palette.softBorder}; border-radius: 12px; font-family: inherit; font-size: 12.6px; font-weight: 600; cursor: pointer;">Copy</button>
        </div>`;
    }

    /*
     * The box's own section: the same line of type as a route's header, with
     * nothing to press.
     *
     * It does not fold because there is nothing to reveal: it is the box the
     * whole form exists for, and without it the form is empty. A chevron on it
     * would offer a fold that the section has no business performing.
     *
     * The label sits flush with the form's own left edge — the set name above it
     * and the format hint below it start there too. It heads the box rather than
     * joining the folding routes, so it lines up with what it heads rather than
     * with the column their chevrons push them into.
     */
    function staticSection(label, bodyHtml) {
        return `<div class="set-fold">
            <div class="set-fold-label" style="padding: 9px 0; color: ${palette.title}; font-size: 14.4px; font-weight: 600; line-height: 1.35;">${label}</div>
            <div class="set-fold-body" style="padding-bottom: 10px;">${bodyHtml}</div>
        </div>`;
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
            bgColor: colors.fill,
            textColor: colors.ink,
            transColor: colors.sub,
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
    /*
     * How long a bubble takes to hop once.
     *
     * It runs forever, so `order` shifts each bubble into the cycle by a
     * different amount — a negative delay starts it mid-flight — because a row
     * of them moving in lockstep reads as one object jerking rather than as a
     * handful of words.
     */
    const BOUNCE_MS = 650;

    // A word still counting down barely moves: fifteen times slower, and through
    // its own keyframes, which are the same hop at half the size. It is a word
    // breathing in its sleep rather than one asking to be answered.
    const SLOW_BOUNCE_MS = BOUNCE_MS * 15;

    function bubbleMotion(stage, timer, order) {
        // Stage 0 is the pile nothing has happened to yet. It has no wait to sit
        // out and nothing to be ready for, so it does not move at all — and it
        // would otherwise hop from the very first draw.
        if (stage === 0) return '';

        return timer
            ? `animation: bounce-slow ${SLOW_BOUNCE_MS}ms ease-in-out ${-order * 1300}ms infinite;`
            : `animation: bounce ${BOUNCE_MS}ms ease-in-out ${-order * 170}ms infinite;`;
    }

    function createBubble(bubbleData, parent, order) {
        const { word, translation, bgColor, textColor, transColor, marks, stage, timer } = bubbleData;

        // Build the repetition timeline: one sprite icon per repetition or elapsed interval
        let dotsHtml = '';
        for (const mark of (marks || [])) {
            const icon = MARK_ICONS[mark];
            if (!icon) continue;
            dotsHtml += `<svg class="bubble-progress-dot" width="${icon.size}" height="${icon.size}" style="display: block; flex: none;"><use href="#${icon.id}" /></svg>`;
        }

        // TEMP (debug): current stage number at the end of the timeline
        //dotsHtml += `<span class="bubble-stage-debug" style="margin-left: 2px; -font-weight: 800; color: ${textColor};">${stage}</span>`;

        // Optional timer badge in bottom-right corner
        const timerHtml = timer
            ? `<span class="bubble-timer-badge" style="position: absolute; bottom: -5px; right: -4px; background: ${palette.timerFill}; color: ${palette.onTimer}; font-size: 10.8px; font-weight: 800; line-height: 1; padding: 1.5px 4.5px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.18); z-index: 3; white-space: nowrap; outline: none; letter-spacing: -0.2px;">${timer}</span>`
            : '';

        const bubbleHtml = `
            <div class="word-bubble-card" style="${bubbleMotion(stage, timer, order || 0)} background-color: ${bgColor}; border: none; border-radius: 14px; padding: 6px 10px; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-sizing: border-box; position: relative; user-select: none; flex: 0 1 auto; min-width: 48px; max-width: 100%;">
                <span class="bubble-word-text" style="font-weight: 800; font-size: 15.6px; line-height: 1.15; color: ${textColor}; word-break: break-word; overflow-wrap: anywhere; max-width: 100%; text-align: center; outline: none;">${word}</span>
                <div class="bubble-dots-group" style="font-size: 7px; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 1px; max-width: 100%; margin-top: 3px; line-height: 1;">
                    ${dotsHtml}
                </div>
                <span class="bubble-trans-text" style="font-size: 15.6px; font-weight: 600; line-height: 1.1; -margin-top: 2px; color: ${transColor}; word-break: break-word; overflow-wrap: anywhere; max-width: 100%; text-align: center; outline: none;">${translation}</span>
                ${timerHtml}
            </div>
        `;

        return $(parent, bubbleHtml);
    }

    function render() {
        // Read once per draw, so every card in the pass agrees, and cleared here
        // rather than at the end: an exception further down should not leave the
        // animation armed for whatever redraws next.
        const intro = introduce;
        introduce = false;

        const unfold = unfolding;
        unfolding = false;

        container.innerHTML = '';

        const sets = store.sets();

        // Whether a new set is being written. Needed before the header, because
        // the New Set button reads it twice: for its own look, and to know that a
        // press means close rather than open.
        //
        // createdEmpty rather than editing: it holds exactly the sets the New Set
        // button made, and empties again on save or cancel. Editing an existing
        // set opens the same form further down the list, and has nothing to do
        // with this button.
        const addingSet = createdEmpty.size > 0;

        // Open, the button takes the form's own surface. The form is what the
        // press produced, and one surface across both is what says the button is
        // holding that form open rather than offering to open another.
        const addBg = addingSet ? palette.cardBg : 'transparent';

        const header = $(container, `<div class="dict-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h1 class="dict-title" style="margin: 0; display: flex; align-items: center; gap: 9px; color: ${palette.heading};">
                ${logoSvg(palette.logo, LOGO_SIZE)}
                <span class="dict-wordmark" style="display: block; line-height: 1.06;">
                    <span class="dict-wordmark-top" style="display: block; font-size: 18px; font-weight: 800; letter-spacing: 0.235em;">SPACED</span>
                    <span class="dict-wordmark-bottom" style="display: block; font-size: 14.5px; font-weight: 700; letter-spacing: 0.075em;">REPETITION</span>
                </span>
            </h1>
            <div class="dict-header-actions" style="display: flex; gap: 8px;">
                <button class="theme-toggle-btn" style="display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; padding: 0; background: transparent; border: 1px solid ${palette.softBorder}; border-radius: 12px; cursor: pointer; color: ${palette.softColor}; transition: all 0.2s;" title="Toggle theme">${palette.themeIcon}</button>
                <button class="dict-add-set-btn" id="add-set-btn" style="padding: 6px 14px; background: ${addBg}; color: ${palette.softColor}; border: 1px solid ${palette.softBorder}; border-radius: 12px; font-weight: 600; font-size: 15.6px; cursor: pointer; transition: all 0.2s;">+ New Set</button>
            </div>
        </div>`);

        header.querySelector('.theme-toggle-btn').addEventListener('click', () => {
            theme.set(!theme.isDark());
            catalog.setTheme(theme.isDark());
            render();
        });

        // A toggle, not a repeat action: pressed again, the button takes the form
        // back down. Left as a plain action it would mint another empty set on
        // every press, and the catalog would stack blank forms nobody asked for.
        header.querySelector('#add-set-btn').addEventListener('click', () => {
            if (closing) return;

            if (addingSet) {
                closeNewSet();
                return;
            }

            const banner = container.querySelector('.continue-banner');
            bannerSpace = banner
                ? banner.offsetHeight + (parseFloat(getComputedStyle(banner).marginBottom) || 0)
                : 0;

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
            unfolding = true;
            render();
        });

        // The banner is hidden while a new set is being written: it would sit
        // between the form and the list it belongs to, and it is one click away
        // from leaving for a game and throwing the typing away.
        const resumable = (session && !addingSet) ? GAMES.find(g => g.id === session.game) : null;
        if (resumable) {
            const label = `${resumable.icon(20)} ${resumable.title}`;
            const banner = $(container, `<div class="continue-banner" style="background: ${palette.cardBg}; color: ${palette.title}; padding: 16px; border-radius: 18px; margin-bottom: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 15.6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <span class="continue-banner-text">Continue: ${label}</span>
                <span class="continue-banner-arrow">▶</span>
            </div>`);
            banner.addEventListener('click', () => {
                nav.resume(resumable, session.setId);
            });
        }

        const setsList = $(container, `<div class="dict-sets-list" style="display: flex; flex-direction: column; gap: 14px;"></div>`);

        sets.forEach((set, index) => {
            renderSetCard(setsList, set, index, intro);
        });

        if (unfold) {
            const card = newSetCard();
            if (card) unfoldInto(card);
        }
    }

    /*
     * The form growing out of nothing, and folding back into it.
     *
     * Height is animated through max-height because the form has no height to
     * animate to: it is whatever the box, the routes and the header add up to,
     * and that is known only once the thing is in the page. The cap is measured
     * there and dropped as soon as the run ends — left on, it would clip the
     * form the moment a route was opened inside it.
     *
     * The cap has to be dropped after the run and not before, which is what
     * pin() below is for.
     *
     * Padding goes along with it when the card folds to nothing: max-height caps
     * the content box, so padding alone would hold the card 32px tall with
     * nothing in it.
     *
     * Nothing fades. The card is the banner's own colour, and with the fold
     * starting at the banner's height the two read as one block changing shape —
     * a fade would blank that block for a moment instead.
     *
     * The list spaces its cards with a flex gap, which no card can animate. A
     * negative margin of the same size cancels it, so the cards below slide
     * instead of jumping the moment this one appears or leaves. Only when there
     * is another card to be spaced from: alone, that margin would just crop the
     * list.
     */
    const FOLD_OPEN = 260;
    const FOLD_SHUT = 240;

    function listGap(card) {
        const list = card.parentElement;
        if (!list || list.children.length < 2) return 0;
        return parseFloat(getComputedStyle(list).rowGap) || 0;
    }

    /*
     * Puts the starting state into the layout so there is something to move
     * from. Both styles applied in one go would be collapsed into a single
     * pass and the element would simply appear in its end state.
     *
     * A forced reflow rather than requestAnimationFrame. A tab that is not
     * painting throttles rAF to whenever it next paints but leaves setTimeout
     * alone, so the release timer below would fire first — and the callback,
     * arriving afterwards, would put the cap back on and leave it there.
     */
    function pin(card) {
        void card.offsetHeight;
    }

    /*
     * The collapsed end of the fold, and what the card has to do to reach it.
     *
     * The negative margin cancels the list's gap, so at that end the card takes
     * exactly its own height out of the column and nothing more — which is what
     * lets that height be compared with the banner's directly.
     *
     * Padding is flattened only when the card folds all the way down: 32px of it
     * cannot fit inside a card of no height. Against the banner's height it fits
     * easily, and flattening it there would shove the form's own heading about
     * for no reason.
     */
    function collapsed(card, gap) {
        const cs = getComputedStyle(card);
        const frame = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
        const pads = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);

        // max-height caps the content box, and the card's padding and border sit
        // outside it. Asking for the banner's height directly would leave a card
        // that tall plus 34px of frame — which is exactly the jump this is meant
        // to remove.
        const inner = bannerSpace - frame - pads;

        if (inner >= 0) {
            card.style.maxHeight = `${inner}px`;
        } else {
            // Nothing to fit the padding into: flatten it and give the content
            // whatever the frame leaves. This is also the no-banner case, where
            // the card folds all the way down to its own two border lines.
            card.style.paddingTop = '0px';
            card.style.paddingBottom = '0px';
            card.style.maxHeight = `${Math.max(bannerSpace - frame, 0)}px`;
        }

        if (gap) card.style.marginBottom = `-${gap}px`;
    }

    function unfoldInto(card) {
        const opened = card.scrollHeight;
        const gap = listGap(card);

        // Taken before they are overridden, and put back by value at the end.
        // The card's padding is written in its own style attribute, so clearing
        // the override does not uncover it — it uncovers nothing, and the card
        // would keep the flattened padding it was animated through.
        const padTop = getComputedStyle(card).paddingTop;
        const padBottom = getComputedStyle(card).paddingBottom;

        card.style.overflow = 'hidden';
        collapsed(card, gap);

        pin(card);

        card.style.transition = `max-height ${FOLD_OPEN}ms ease-out,`
            + ` padding ${FOLD_OPEN}ms ease-out, margin-bottom ${FOLD_OPEN}ms ease-out`;
        card.style.maxHeight = `${opened}px`;
        card.style.paddingTop = padTop;
        card.style.paddingBottom = padBottom;
        card.style.marginBottom = '';

        setTimeout(() => {
            card.style.maxHeight = '';
            card.style.overflow = '';
            card.style.transition = '';
        }, FOLD_OPEN + 40);
    }

    function foldAway(card, done) {
        const gap = listGap(card);

        card.style.overflow = 'hidden';
        card.style.maxHeight = `${card.scrollHeight}px`;

        pin(card);

        card.style.transition = `max-height ${FOLD_SHUT}ms ease-in,`
            + ` padding ${FOLD_SHUT}ms ease-in, margin-bottom ${FOLD_SHUT}ms ease-in`;
        collapsed(card, gap);

        setTimeout(done, FOLD_SHUT);
    }

    // The card the New Set button opened, or null once it is gone.
    function newSetCard() {
        const id = createdEmpty.values().next().value;
        return id ? container.querySelector(`.set-card[data-set-id="${id}"]`) : null;
    }

    // Folds the form shut and then drops what was behind it. Without a card to
    // fold — nothing open, or the screen redrawn under us — it just does the
    // dropping, so the caller never has to know which case it is in.
    function closeNewSet() {
        const card = newSetCard();

        if (!card) {
            discardNewSets();
            render();
            return;
        }

        closing = true;
        foldAway(card, () => {
            closing = false;
            discardNewSets();
            render();
        });
    }

    // Takes down whatever the New Set button opened. The set behind the form
    // exists only because the form needed something to edit, so closing without
    // saving leaves nothing worth keeping.
    //
    // By id rather than by position: removeAt works on the index in the list,
    // and reading that index back at the moment of removal is what keeps this
    // right regardless of where the set sits.
    function discardNewSets() {
        createdEmpty.forEach(id => {
            const index = store.sets().findIndex(s => s.id === id);
            if (index !== -1) store.removeAt(index);
            editing.delete(id);
        });
        createdEmpty.clear();
        store.save();
    }

    function renderSetCard(parent, set, index, intro) {
        const card = $(parent, `<div class="set-card" data-set-id="${set.id}" style="background: ${palette.cardBg}; border: 1px solid ${palette.cardBorder}; border-radius: 18px; padding: 16px;"></div>`);

        if (editing.has(set.id)) {
            let textLines = [set.title];
            set.words.forEach(w => {
                textLines.push(`${w.original} -- ${w.translation}`);
            });

            const box = `<label class="set-edit-hint" style="display: block; font-size: 13.2px; font-weight: 600; color: ${palette.hint}; margin-bottom: 6px;">
                    First line — Title, then: "word -- translation" (a tab works too; clear text to delete)
                </label>
                <textarea class="set-edit-textarea" placeholder="NEW SET NAME&#10;example -- пример&#10;two words -- два слова" style="width: 100%; height: 115px; background: ${palette.inputBg}; color: ${palette.inputText}; border: 1px solid ${palette.softBorder}; border-radius: 12px; padding: 8px; font-family: inherit; font-size: 15.6px; box-sizing: border-box; resize: vertical; outline: none;">${textLines.join('\n')}</textarea>`;

            // A set being written from scratch gets the box as the first section,
            // always open — it is the one thing always needed. The three routes
            // fold away underneath, where they are read once and then ignored by
            // anyone who already has a list.
            //
            // Editing an existing set shows none of it: the words are already
            // here, and the only reason the form is open is to change them.
            const guided = createdEmpty.has(set.id);

            const steps = r => `<ol class="set-fold-steps" style="margin: 0; padding-left: 42px; font-size: 13.2px; font-weight: 600; line-height: 1.45; color: ${palette.hint};">`
                + r.steps.map(s => `<li style="margin-bottom: 3px;">${stepBody(s)}</li>`).join('')
                + `</ol>`;

            const formBody = guided
                ? staticSection('Paste words here', box)
                    + ROUTES.map(r => foldingSection(r.question, steps(r), false)).join('')
                : box;

            // The page turns selection off everywhere — it is a popup full of
            // things to tap, and a dragged finger selecting a label is noise.
            // This form is the exception: the prompts are here to be carried out
            // to another app, and the hint explains a format worth copying.
            const editForm = $(card, `<div class="set-edit-form" style="user-select: text; -webkit-user-select: text;">
                <div class="set-edit-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span class="set-edit-title" style="font-size: 15.6px; font-weight: 700; color: ${palette.heading};">${guided ? 'New Set' : 'Edit Set'}</span>
                    <div class="set-edit-actions" style="display: flex; gap: 6px;">
                        <button class="set-save-btn" style="padding: 4px 10px; background: ${palette.accent}; color: ${palette.onAccent}; border: none; border-radius: 12px; font-weight: 600; font-size: 14.4px; cursor: pointer;">Save</button>
                        <button class="set-cancel-btn" style="padding: 4px 10px; background: ${palette.softBg}; color: ${palette.softColor}; border: 1px solid ${palette.softBorder}; border-radius: 12px; font-weight: 600; font-size: 14.4px; cursor: pointer;">Cancel</button>
                    </div>
                </div>
                ${formBody}
            </div>`);

            // Each header opens its own section and closes nothing else: the
            // routes are alternatives, not steps, and comparing two of them
            // should not mean opening one twice.
            editForm.querySelectorAll('.set-fold-toggle').forEach(toggle => {
                toggle.addEventListener('click', () => {
                    const body = toggle.nextElementSibling;
                    const opening = body.hidden;
                    body.hidden = !opening;
                    toggle.setAttribute('aria-expanded', opening);
                    toggle.querySelector('.set-fold-chevron').style.transform = `rotate(${opening ? 90 : 0}deg)`;
                });
            });

            editForm.querySelectorAll('.set-prompt-copy').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const field = btn.closest('.set-prompt').querySelector('.set-prompt-text');
                    let copied = true;

                    try {
                        await navigator.clipboard.writeText(field.textContent.trim());
                    } catch (e) {
                        // Refused — file:// has no clipboard permission, and nor
                        // does a page the tap did not reach as a real gesture.
                        // The text is selectable now, so select it and say what
                        // is left to do rather than claiming a copy that did not
                        // happen.
                        copied = false;
                        const range = document.createRange();
                        range.selectNodeContents(field);
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }

                    btn.textContent = copied ? 'Copied' : 'Press Ctrl+C';
                    setTimeout(() => { btn.textContent = 'Copy'; }, 1400);
                });
            });

            const textarea = editForm.querySelector('.set-edit-textarea');

            // Only an existing set opens ready to type, caret after whatever is
            // already there: its words are in the box, and changing them is the
            // one reason that form is open.
            //
            // A new set is not given the caret. The routes above the box are
            // there to be read first, and taking focus scrolls them off on a
            // short screen and raises the keyboard over what is left.
            if (!guided) {
                textarea.focus();
                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            }

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
                // Cancel on a new set is the same closing as the button's, and
                // folds the same way. Cancel on an existing set only puts the
                // form away: the card stays where it is, so there is nothing to
                // fold.
                if (createdEmpty.has(set.id)) {
                    closeNewSet();
                    return;
                }

                editing.delete(set.id);
                store.save();
                render();
            });

        } else {
            const totalWords = set.words.length;
            const progress = spacedRepetitions.calculateSetProgress(set.words);

            // Where the bar animates from: the progress this set had when the
            // running session started, kept in active_session rather than on the set.
            // Where the bar starts before it runs to `progress`: at nothing when
            // the catalog is opened, so the bars fill, and at the real value on
            // the redraws the screen does to itself.
            //
            // The number beside it is not animated. A bar sweeping to its length
            // reads as one motion; a digit counting up beside it reads as a
            // second, slower one, and the eye ends up watching the wrong one.
            const from = intro ? 0 : progress;
            const grows = from !== progress;

            $(card, `
                <div class="set-card-header" style="display: flex; gap:5px; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div class="set-title-group" style="display: flex; align-items: center; gap: 8px; min-width: 0;">
                        <h4 class="set-title" style="margin: 0; line-height:1.1; font-size: 18px; color: ${palette.title}; font-weight: 700; overflow: hidden; text-overflow: ellipsis;">${set.title}</h4>
                        <span class="set-progress-text" style="flex-shrink: 0; background: ${palette.barBg}; color: ${palette.barText}; font-size: 12.6px; font-weight: 800; padding: 3px 8px; border-radius: 999px; line-height: 1; display: ${progress === 0 ? 'none' : 'inline-block'};">${progress}%</span>
                    </div>
                    <div class="set-btn-group" style="display: flex; align-items: center; gap: 8px;">
                        <button class="set-edit-btn" title="Edit" style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; padding: 0; background: transparent; color: ${palette.softColor}; border: none; border-radius: 12px; cursor: pointer; transition: color 0.2s;">
                            <svg class="set-edit-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </button>
                        <button class="set-flip-btn" title="Flip" style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; padding: 0; background: transparent; color: ${palette.softColor}; border: none; border-radius: 12px; cursor: pointer; transition: color 0.2s;">
                            <svg class="set-flip-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 4 4 4-4 4M20 8H4M8 20l-4-4 4-4M4 16h16"></path></svg>
                        </button>
                    </div>
                </div>

                <div class="set-progress-bar-bg" style="background: ${palette.barBg}; border-radius: 999px; height: 8px; width: 100%; overflow: hidden; margin-bottom: 14px;">
                    <div class="set-progress-bar-fill" style="background: ${palette.barFill}; height: 100%; border-radius: 999px; width: ${from}%; transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1);"></div>
                </div>

                <div class="set-words-bubbles" style="-padding-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;"></div>

                <div class="set-actions-group" style="display: flex; gap: 8px; height:50px; margin-top: 18px;">
                    ${GAMES.map(g => `<button class="set-play-btn" data-game="${g.id}" style="flex: 1; padding: 7px 4px; background: ${g.color}; color: #ffffff; border: none; border-radius: 12px; font-weight: 700; font-size: 15px; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; justify-content: center; gap: 7px;">${g.icon(18)} ${g.title}</button>`).join('')}
                </div>
            `);

            // Render bubbles into the container
            const bubblesContainer = card.querySelector('.set-words-bubbles');
            if (totalWords === 0) {
                $(bubblesContainer, `<p class="set-empty-msg" style="margin: 4px 0; color: #94a3b8; font-size: 15.6px; font-style: italic;">Set is empty</p>`);
            } else {
                set.words.forEach((w, order) => {
                    const bubbleData = buildBubbleData(w);
                    createBubble(bubbleData, bubblesContainer, order);
                });
            }

            // Let the first frame land at zero, then run to the real value.
            if (grows) {
                setTimeout(() => {
                    const bar = card.querySelector('.set-progress-bar-fill');
                    if (bar) bar.style.width = `${progress}%`;
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

    catalog.render = () => {
        introduce = true;
        render();
    };

    catalog.setTheme = (isDark) => {
        const t = tokens.of(isDark);

        palette = {
            heading: t.ink,
            title: t.ink,
            // Sun while the dark theme is on, because the icon says where the
            // button goes, not where you are.
            themeIcon: isDark ? SUN : MOON,

            // The logo takes the Cards button's own colour rather than the accent.
            // The game colours do not follow the theme, the accent does, so in
            // the light theme the two would sit side by side as a pair of
            // near-identical corals — which reads as a mistake rather than as a
            // pair. It is the one warm thing in the header now that the New Set
            // button has given the colour up.
            logo: (GAMES.find(g => g.id === 'cards') || {}).color || t.accent,
            softBg: t.soft,
            softColor: t.muted,
            softBorder: t.border,
            cardBg: t.surface,
            cardBorder: t.border,
            hint: t.muted,
            inputBg: t.soft,
            inputText: t.ink,
            barBg: t.soft,
            barFill: t.progress,

            // The timer badge is the same colour family as the bar, taken deep
            // enough to carry white text: the bar has nothing written on it and
            // can stay light, a 10px badge cannot.
            timerFill: t.progressFill,
            onTimer: '#ffffff',
            // The percent beside the title is a quiet readout, and mint text on
            // the light theme's white card is 2.1:1. The bar under it is the
            // thing that is meant to be mint.
            barText: t.muted,
            accent: t.accent,
            onAccent: t.onAccent,
            dialogBg: t.surface,
            dialogText: t.ink,
            dialogBorder: t.border,
            dialogBody: t.muted
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
            startedAt: Date.now()
        });
        await nav.game(game, setId, allowEarly);
    }

    // Modal shown when every word of the selection is still waiting for its timer
    function confirmEarly(onPlayAnyway) {
        const overlay = $(`<div class="early-dialog-overlay" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 100;">
            <div class="early-dialog" style="background: ${palette.dialogBg}; color: ${palette.dialogText}; border: 1px solid ${palette.dialogBorder}; border-radius: 20px; padding: 20px; max-width: 320px; width: 100%;">
                <div class="early-dialog-title" style="font-size: 16.8px; font-weight: 700; margin-bottom: 6px;">⏳ Nothing to repeat yet</div>
                <div class="early-dialog-text" style="font-size: 15px; line-height: 1.35; color: ${palette.dialogBody}; margin-bottom: 14px;">All words in this selection are still waiting for their timers. An early repetition will not raise the progress, but a mistake will still set the word back.</div>
                <div class="early-dialog-actions" style="display: flex; gap: 8px;">
                    <button class="early-dialog-cancel" style="flex: 1; padding: 9px; background: ${palette.softBg}; color: ${palette.softColor}; border: 1px solid ${palette.softBorder}; border-radius: 12px; font-weight: 700; font-size: 15px; cursor: pointer;">Cancel</button>
                    <button class="early-dialog-play" style="flex: 1; padding: 9px; background: ${palette.accent}; color: ${palette.onAccent}; border: none; border-radius: 12px; font-weight: 700; font-size: 15px; cursor: pointer;">Play anyway</button>
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

// Everything the catalog shows comes from storage, and all of it can have moved
// on while a game was in front: progress, timers, and whether a session is still
// unfinished. Kept separate from boot so it can be run again without setting the
// modules up a second time.
async function refreshCatalog() {
    await store.load();
    catalog.setSession(await storage.get('active_session'));
    catalog.render();
}

async function bootCatalog() {
    spacedRepetitions();
    storage();
    store();

    await storage.init();

    const settings = await storage.get('settings');
    // Dark unless the player has chosen otherwise; there is no first-run prompt
    // and no system sniffing, so an absent setting simply means the default.
    const isDark = settings ? !!settings.isDark : true;

    const container = $(`<div class="app-main-content"></div>`);
    catalog(container);

    // The player is here, so this is where the popup should reopen.
    nav.setEntryPoint('index.html');

    theme.apply(isDark);
    catalog.setTheme(isDark);

    await refreshCatalog();
    popupHeight.release();
}

// The browser's own Back button can restore this page from the bfcache: the
// document comes back alive exactly as it was left, so nothing above re-runs.
// Without this the catalog would still be showing the state it had before the
// game started — the old progress, and a "Continue" banner for a session that
// may well have finished.
//
// Only the catalog needs it. A game page rewrites its own address to carry
// resume=1 as soon as its session exists, so every way back into that entry
// continues the session whether the bfcache served it or not.
window.addEventListener('pageshow', (event) => {
    if (event.persisted) refreshCatalog();
});

bootCatalog();
