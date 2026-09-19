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
    let unfolding = null;

    // Whether the settings panel is open. Screen state like the edit form: it
    // has no business surviving a reload.
    let settingsOpen = false;

    // Whether the answer to the question mark is folded out. Panel state like
    // the panel itself, and it outlives a redraw: switching the setting while
    // reading about it should not put the reading away.
    let splitHintOpen = false;

    /*
     * Whether everything under the theme switch is folded out.
     *
     * Shut to begin with, and that is the point of it: the panel is opened to
     * change the theme or to wipe the data, and what lay between those two was
     * a question about word boundaries and fifteen numbers. Both are worth
     * having and neither is worth meeting on the way past.
     *
     * Drawn as a heading and not as a row — small caps in the hint colour with
     * a rule running off to the edge, no pill and no border. In the pill it
     * wore first it was the third switch in a column of switches, and a switch
     * is a thing that has a state: it read as a setting called Advanced that
     * was currently off.
     */
    let advancedOpen = false;

    // Whether the interval ladder is folded out. Panel state like the hint
    // above it, and it outlives a redraw for a sharper reason: every interval
    // taken redraws the catalog under the panel, and a section that put itself
    // away each time would be a section you can change one number in.
    let intervalsOpen = false;

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

    /*
     * The two rings, and the other way of drawing them: filled in, on a thinner
     * stroke. A press on the mark switches between the two and a second press
     * switches back — nothing else in the app changes, and nothing is saved.
     *
     * Screen state, like the open settings panel: it is a look being tried on,
     * not a setting, and a reload brings the mark back as it is drawn here.
     *
     * Filled in, they are eyes rather than rings, and eyes blink — see
     * blinkLogo. Shut is a line where the ring was, the length of its diameter,
     * which is the same drawing the snake's head wears; the two faces are the
     * same face and they close the same way.
     */
    const RINGS = [
        { cx: 11.37, r: 4.86, width: 2.83 },
        { cx: 23.02, r: 3.01, width: 1.75 }
    ];

    const FILLED_RING = { fill: '#000000', width: 1.5 };

    let ringsFilled = false;
    let ringsShut = false;

    function ringsSvg() {
        return RINGS.map(ring => (ringsFilled && ringsShut)
            ? `<path d="M${ring.cx - ring.r} 16H${ring.cx + ring.r}" fill="none"
                    stroke="#ffffff" stroke-width="${FILLED_RING.width}" stroke-linecap="round" />`
            : `<circle cx="${ring.cx}" cy="16" r="${ring.r}"
                    fill="${ringsFilled ? FILLED_RING.fill : 'none'}" stroke="#ffffff"
                    stroke-width="${ringsFilled ? FILLED_RING.width : ring.width}" />`).join('');
    }

    function logoSvg(fill, size) {
        return `<svg class="dict-logo" width="${size}" height="${size}" viewBox="0 0 32 32"
            aria-hidden="true" style="display: block; flex-shrink: 0;">
            <g transform="rotate(-7 16 16)">
                <rect x="1.95" y="4.34" width="28.09" height="23.31" rx="5.23" fill="${fill}" />
                <g class="dict-logo-eyes">${ringsSvg()}</g>
            </g>
        </svg>`;
    }

    /*
     * The blink, and the one place in this file that changes what is on screen
     * without redrawing it.
     *
     * Everything else here answers a press, and a press is rare enough that
     * rebuilding the catalog costs nothing. This happens every few seconds for
     * as long as the mark is wearing eyes, and a redraw on that clock would
     * restart every bubble's animation on the shelf below — the whole page
     * twitching in time with a blink. So the two rings are replaced where they
     * stand, in a group of their own kept for exactly that.
     *
     * The group is looked up again on every beat rather than held: a redraw for
     * some other reason throws the old svg away, and a reference to it would go
     * on blinking an element that is no longer in the page.
     *
     * The gap is uneven, for the reason snake.js gives at its own blink: on a
     * metronome it reads as a machine.
     */
    const BLINK_SHUT_MS = 130;
    const BLINK_GAP_MS = 2400;

    let blinkTimer = null;

    function blinkLogo() {
        clearTimeout(blinkTimer);

        ringsShut = false;
        if (!ringsFilled) return;

        blinkTimer = setTimeout(() => {
            ringsShut = true;
            paintRings();

            blinkTimer = setTimeout(() => {
                ringsShut = false;
                paintRings();
                blinkLogo();
            }, BLINK_SHUT_MS);
        }, BLINK_GAP_MS + Math.random() * 2000);
    }

    function paintRings() {
        const eyes = container.querySelector('.dict-logo-eyes');
        if (eyes) eyes.innerHTML = ringsSvg();
    }

    // Chrome icons: the same 24-unit grid and 2-unit stroke as the game icons,
    // so the header does not look like it was drawn by someone else.
    function chromeIcon(body, size = 18) {
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round" aria-hidden="true" style="display: block;">${body}</svg>`;
    }

    // A disc and eight marks around it. The rays are half what they were and the
    // disc is wider: at 18px eight long spokes crowd the ring until the middle
    // of the sun is the smallest part of it, which is the one thing a sun is
    // not. Short marks read as light coming off something.
    const SUN = chromeIcon(`
        <circle cx="12" cy="12" r="5" />
        <path d="M12 2.6v1.6M12 19.8v1.6M4.2 4.2l1.2 1.2M18.6 18.6l1.2 1.2M2.6 12h1.6M19.8 12h1.6M4.2 19.8l1.2-1.2M18.6 5.4l1.2-1.2" />`);

    /*
     * Sliders rather than a cog: the cog that suits this line weight is a ring
     * with spokes, and that is the sun sitting next to it.
     *
     * Two tracks, not three, and lying down rather than standing up. Three
     * upright channels with their handles crossing them came to eleven strokes
     * inside 18 pixels, and at that size eleven strokes are a texture — a
     * hatched square you take on trust because it sits where settings usually
     * sit. Two knobs on two lines have somewhere to be: one pushed left, one
     * pushed right, which is what a setting looks like.
     */
    const SLIDERS = chromeIcon(`
        <circle cx="7.5" cy="8" r="3.4" />
        <path d="M12.4 8h8.6" />
        <path d="M3 16h8.6" />
        <circle cx="16.5" cy="16" r="3.4" />`);

    const MOON = chromeIcon(`
        <path d="M20.6 14.4A8.7 8.7 0 0 1 9.6 3.4 8.7 8.7 0 1 0 20.6 14.4z" />`);

    const CHEVRON = chromeIcon(`<path d="M9 5l7 7-7 7" />`);

    // The same arrow cut down for the Advanced heading, where it stands beside
    // a 12px word rather than a 15px one.
    const CHEVRON_SMALL = chromeIcon(`<path d="M9 5l7 7-7 7" />`, 14);

    const CROSS = chromeIcon(`<path d="M6 6l12 12M18 6L6 18" />`);

    /*
     * The three ways to have this app — see platformStrip. Drawn a size up from
     * the chrome around them: they are the picture in a cell rather than the
     * mark on a button, and at 18 they read as three smudges.
     *
     * A puzzle piece for the extension, because that is the picture the browser
     * itself uses for one — it is on the button this popup hangs from. A
     * monitor and a handset for the other two: the thing that separates them is
     * the machine it is opened on, and a globe would have said "the web", which
     * is what all three are.
     */
    // Three dots over the slot where the next game goes, so that the fourth
    // button is built like the three beside it — a picture with a word under
    // it — and not a lone label in a row of them.
    const DOTS = chromeIcon(`
        <circle cx="5" cy="12" r="1.8" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1.8" fill="currentColor" stroke="none" />`, 24);

    const PUZZLE = chromeIcon(`<path d="M5 6a1 1 0 0 1 1-1h4a2 2 0 0 1 4 0h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-4a2 2 0 0 0 0-4z" />`, 22);

    const DESKTOP = chromeIcon(`
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M12 17v4" />
        <path d="M8 21h8" />`, 22);

    const HANDSET = chromeIcon(`
        <rect x="6" y="2" width="12" height="20" rx="3" />
        <path d="M11 18h2" />`, 22);

    // The same speaker the words carry, with and without what comes out of it.
    // Crossed out rather than greyed: a grey icon is one you cannot press, and
    // this one is the only way back to the sound.
    const SPEAKER = chromeIcon(`
        <path d="M11 5L6 9H2v6h4l5 4V5z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M18.8 5.2a9 9 0 0 1 0 13.6" />`);

    const SPEAKER_OFF = chromeIcon(`
        <path d="M11 5L6 9H2v6h4l5 4V5z" />
        <path d="M16 9.5l5 5M21 9.5l-5 5" />`);

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
    /*
     * All three of them behind one heading, because the form is for the box and
     * not for them: a person who already has a list in the clipboard opened
     * this to paste it, and three questions between the box and Save is three
     * questions asked of someone who was not asking.
     *
     * The heading names the sources rather than promising instructions — what
     * is wanted is not "how do I export from Google Translate" but the fact
     * that a hundred words can come from somewhere other than the keyboard.
     *
     * Cut to one line, which at 326px of label is about forty-seven
     * characters: two lines of heading over three headings is a paragraph, and
     * a paragraph is the thing this fold exists to put away. What the nouns
     * lost is only detail the sections under them repeat — a book is a paper
     * book, a video is a YouTube video.
     */
    const ROUTES_LABEL = 'From Google Translate, a book, a page or a video';

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
     * The words of the box, as they would be saved.
     *
     * Pulled out of the save handler because the plates under the box need the
     * same answer while the text is still being typed. One reader, so the thing
     * shown and the thing saved cannot disagree.
     *
     * Returns null when the box is empty — that is the request to delete the set,
     * and it is the caller's business what to do about it.
     */
    function readWords(text, set) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0) return null;

        // A first line that already carries a separator is a word, not a title:
        // the name was simply left out. An existing set keeps the name it had.
        const titled = !/\t|--/.test(lines[0]);

        // Existing words keep what is already known about them
        const existingMap = new Map(set.words.map(w => [w.original.toLowerCase(), w]));
        const words = [];

        for (let i = titled ? 1 : 0; i < lines.length; i++) {
            // "--" or a tab, whichever comes first: the tab is what a paste from a
            // spreadsheet brings. Everything past that first separator is the
            // translation, so it may contain either character itself.
            const cut = lines[i].search(/\t|--/);
            const original = (cut === -1 ? lines[i] : lines[i].slice(0, cut)).trim();
            const translation = cut === -1 ? '' : lines[i].slice(cut).replace(/^(\t|--)/, '').trim();

            if (!original) continue;

            // Rebuilt rather than edited, so everything already known about a
            // word has to be carried across by hand: its history, and the two
            // languages. A word that kept its spelling keeps both; one nobody
            // has seen before arrives bare and store.label names it.
            const old = existingMap.get(original.toLowerCase());
            const word = {
                original: original,
                translation: translation,
                repetitions: old ? old.repetitions : []
            };

            if (old && old.originalLang) word.originalLang = old.originalLang;
            if (old && old.translationLang) word.translationLang = old.translationLang;

            words.push(word);
        }

        return { title: titled ? lines[0] : (set.title || 'NEW SET NAME'), words };
    }

    /*
     * Language tags turned into something a person reads: "Ukrainian", not
     * "uk-UA". The region is dropped on purpose — en-US and en-GB are one
     * answer to the question the plate asks.
     *
     * Intl.DisplayNames is in every browser this runs in; where it is not, the
     * tag itself is still an answer, just a worse one.
     */
    const LANGUAGE_NAMES = (() => {
        try {
            return new Intl.DisplayNames(['en'], { type: 'language' });
        } catch (e) {
            return null;
        }
    })();

    // Intl hands the code back for a language it cannot name, and a list with
    // "ba" in it among a hundred and thirty names is a list with a hole in it.
    const NAMED_BY_HAND = { ba: 'Bashkir', bo: 'Tibetan' };

    function languageName(tag) {
        const base = String(tag || '').split('-')[0];
        if (!base) return null;

        let named = null;
        try {
            named = LANGUAGE_NAMES && LANGUAGE_NAMES.of(base);
        } catch (e) {
            named = null;
        }

        if (named && named !== base) return named;
        return NAMED_BY_HAND[base] || base;
    }

    // Every language on one side of the set, in the order the words are
    // written, each named once.
    function languagesOf(words, field) {
        const tags = [];
        words.forEach(w => {
            if (w[field] && !tags.includes(w[field])) tags.push(w[field]);
        });
        return tags;
    }

    /*
     * What the dropdowns offer: every language there is a code for, not the
     * sixty-odd the detector can name. Recognising and choosing are different
     * questions — a set in Dutch is still in Dutch, and its words carry no
     * letter that could ever prove it.
     *
     * Sorted by name, because that is the order a person looks through a list
     * in.
     */
    const LANGUAGE_CHOICES = (() => {
        const taken = new Set();

        return speech.allLanguages()
            .map(tag => ({ tag, name: languageName(tag) }))
            .filter(c => {
                // Anything the browser cannot name is dropped: a bare "za" among
                // two hundred names is a hole, not an option. So is a second
                // entry with a name already in the list — the browser calls both
                // ak and tw "Akan", and a list cannot ask you to choose between
                // two identical lines.
                if (!c.name || c.name === c.tag || taken.has(c.name)) return false;
                taken.add(c.name);
                return true;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    })();

    /*
     * The options every dropdown on the form is filled with, built as text and
     * handed out as many times as asked — there is a pair of them per word.
     *
     * Three speakers for the three answers speech.readableBy gives: the language
     * has a voice of its own here, it will be read by the voice that owns its
     * writing system — Italian by an English one, Ukrainian by a Russian one —
     * or there is nothing on this device that can say it.
     *
     * The last one is marked rather than left bare. A missing mark is read as a
     * line the app has not got round to, and the crossed-out speaker says what
     * no mark only implied: this one will be silent here.
     *
     * The list is the same everywhere and the marks are not: they come from the
     * voices the browser happens to have, which differ between Chrome and Edge
     * on one machine and between a laptop and a phone. Nothing about the marks
     * is stored — choosing a language this device cannot say is allowed, and on
     * the next device it may be the only one it can.
     */
    const OWN_VOICE = '🔊';
    const BORROWED_VOICE = '🔈';
    const NO_VOICE = '🔇';

    // A language named the way the dropdowns name it: with what this device
    // would read it in.
    function markedName(tag) {
        const by = speech.readableBy(tag);
        const mark = by === tag ? OWN_VOICE : (by ? BORROWED_VOICE : NO_VOICE);
        return mark + ' ' + languageName(tag);
    }

    /*
     * The first option is hidden and belongs to nobody: it is where a select
     * puts what it has to say when no single option says it — a set in three
     * languages, or a word in none.
     *
     * Hidden keeps it out of the open list, where it would read as a choice,
     * and leaves it free to be the selected one, which is all the closed select
     * ever shows. That is what makes "Auto" a thing you ask for rather than a
     * thing the form claims to be in: asked for, it is answered by a language,
     * and the language is what stands there afterwards.
     */
    const STATE_VALUE = '__state';

    function languageOptions() {
        return `<option value="${STATE_VALUE}" hidden></option><option value="auto">Auto</option>`
            + LANGUAGE_CHOICES.map(c => `<option value="${c.tag}">${markedName(c.tag)}</option>`).join('');
    }

    /*
     * Shows a select what it is: the language, when one of its options is it,
     * and the hidden option when none is — several languages at once, or no
     * language found at all.
     */
    function showLanguages(select, tags) {
        const text = tags.length ? tags.map(markedName).join(', ') : '–';
        const only = tags.length === 1 && select.querySelector(`option[value="${tags[0]}"]`);

        select.title = text;

        if (only) {
            select.value = tags[0];
            return;
        }

        select.querySelector(`option[value="${STATE_VALUE}"]`).textContent = text;
        select.value = STATE_VALUE;
    }

    // The words come from a textarea, so they are whatever was typed
    function escapeText(text) {
        return String(text)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

    /*
     * An interval as the settings panel writes it, and as a person types it
     * back: "0", "45m", "4h", "14d".
     *
     * The same notation the bubbles wear, because it is the same quantity —
     * someone who has read "2h" on a word and wants it asked sooner should be
     * able to write "1h" without learning a second way of saying an hour.
     *
     * In the largest unit that divides the span exactly, so that what is read
     * back is what was typed: ninety minutes stays 90m instead of becoming an
     * hour and a half rounded to one of them.
     */
    const SPAN_UNITS = { m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };

    function spanText(ms) {
        if (!ms) return '0';
        if (ms % SPAN_UNITS.d === 0) return `${ms / SPAN_UNITS.d}d`;
        if (ms % SPAN_UNITS.h === 0) return `${ms / SPAN_UNITS.h}h`;

        return `${ms / SPAN_UNITS.m}m`;
    }

    /*
     * And back, or null when what was typed is not an interval.
     *
     * Minutes when the unit is left off, which is the one guess worth making:
     * the short rungs are the ones that get edited, and "5" is what a person
     * types into a field already saying "5m".
     *
     * Null rather than a fallback for anything else. This is the only place in
     * the app where a value is typed rather than picked, and a value that is
     * not a number has to be refused here — srs.js says what a NaN does to
     * every date it touches.
     */
    function spanValue(text) {
        const parts = /^\s*(\d+(?:[.,]\d+)?)\s*([mhd]?)\s*$/i.exec(text || '');
        if (!parts) return null;

        const unit = SPAN_UNITS[(parts[2] || 'm').toLowerCase()];

        return Math.round(Number(parts[1].replace(',', '.')) * unit);
    }

    /**
     * Build bubble data for a word object based on its repetition history.
     * Marks are the symbols of the whole timeline: results, skipped and pending intervals.
     */
    /*
     * A word whose last answer was wrong, written in the red of the mark it just
     * earned — the same #ff1744 the failed dot is drawn in, so the colour of the
     * word and the colour of the dot under it are one statement and not two.
     *
     * Both lines of the bubble, the word and its translation: what is wrong is
     * the word, not one of the two languages it is written in.
     *
     * This replaces a rule that painted stage 1 alone, which could never show
     * anything this one does not — stage 1 is reachable by error only, so every
     * word on it has a failed last answer. The other direction is not true, and
     * that is the point of the change: a word with a long run behind it lands
     * three rungs down rather than at the bottom, and was still just got wrong.
     */
    const FAIL_INK = '#ff1744';

    /*
     * Stage 1 is not a rung of the ramp so much as a hole under it: the only one
     * a success cannot reach, where a word lands when a mistake has taken the
     * whole of its run. The ramp's own colour for it is the first pale yellow of
     * a series that means ripening, which is the opposite of what happened.
     *
     * So it takes a light red instead — the colour of a thing that has been hit,
     * and the palest one that still reads as red rather than as pink. Kept here
     * rather than swapped into tokens.stages(), because that ramp is generated as
     * one arc and a step recoloured by hand inside it is a step that will drift
     * away from its neighbours the next time the arc is regenerated.
     */
    const DAMAGED_FILL = '#f9d4d4';

    function buildBubbleData(word) {
        const progress = spacedRepetitions.getWordProgress(word);
        const colors = getStageColors(progress.stage);
        const timer = getCompactTimerText(progress.nextRepetition);

        return {
            word: word.original,
            translation: word.translation,
            bgColor: progress.stage === 1 ? DAMAGED_FILL : colors.fill,
            textColor: progress.lastFailed ? FAIL_INK : colors.ink,
            transColor: progress.lastFailed ? FAIL_INK : colors.sub,
            marks: progress.marks,
            stage: progress.stage, // TEMP (debug): stage number shown in the bubble
            sad: progress.lastFailed,
            timer,
            lang: word.originalLang
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

    /*
     * A word that was just got wrong takes the same hop five times slower.
     *
     * The same hop, because there is only one thing a moving bubble has to say —
     * answer me — and a word that was got wrong is not asking for something
     * different, it is asking less brightly. A shape of its own said that in a
     * second language nobody had been taught.
     *
     * Five times is far enough that the two speeds are not compared but simply
     * different: at three the slow one still read as the same hop being dragged,
     * and a viewer measured it against its neighbours. At three and a quarter
     * seconds it stops being a hop with a tempo and becomes something that moves
     * about once while you are looking at it.
     */
    const SAD_BOUNCE_MS = BOUNCE_MS * 5;

    /*
     * The bubble that is being read, held a little larger until it stops.
     *
     * A bubble is said whole and has nothing inside it to mark, so without this
     * a tap on one produces no visible answer at all — which on a phone reads as
     * a tap that missed. Cards and the quiz have the mark on the word instead,
     * and want none of this: growing a card would move the very line it is
     * pointing at.
     *
     * Here rather than in speech.js, which knows about voices and languages and
     * has no business knowing how this screen answers a finger. All it hands
     * over is the moment the sound stops.
     *
     * Five per cent. Enough to catch as movement, small enough that a bubble in
     * a row of bubbles does not shove its neighbours about.
     *
     * Written as `scale` with `!important`, which is not decoration: a bubble
     * carries the bounce animation, a CSS animation outranks ordinary inline
     * styles, and the keyframes animate `scale` themselves — a polite one would
     * simply be ignored. Important beats an animation, so the bubble keeps its
     * skew and its rotation and takes this size on top of them.
     *
     * One bubble at a time, because one word at a time is said.
     */
    const SWELL = 1.05;

    let swollen = null;

    function shrink() {
        if (!swollen) return;

        swollen.style.removeProperty('scale');
        swollen = null;
    }

    function grow(bubble) {
        shrink();

        swollen = bubble;
        bubble.style.transition = 'scale 140ms ease-out';
        bubble.style.setProperty('scale', String(SWELL), 'important');
    }

    /*
     * The sound switch, saying that it is the reason nothing was said.
     *
     * The animation is cleared when it ends so that the next tap can start it
     * again: an animation already on an element is not restarted by being set
     * to the same value, and the second tap would move nothing.
     */
    function pulseMute() {
        const btn = container.querySelector('#mute-btn');
        if (!btn) return;

        btn.style.animation = 'mute-pulse 420ms ease-out';
        btn.addEventListener('animationend', () => { btn.style.animation = ''; }, { once: true });
    }

    /*
     * How a bubble moves, which is a single question: is this word asking to be
     * answered right now.
     *
     * Only a word that is due moves at all, and the speed says how brightly it
     * is asking. Everything else is still.
     *
     * Two kinds of still, and they look the same on purpose. A word nothing has
     * happened to yet has nothing to be ready for — and would otherwise hop from
     * the very first draw. A word counting down is not ready either, whatever it
     * has been through: its badge says when, and a bubble that moved while its
     * own timer was running would be contradicting it. Motion here means one
     * thing or it means nothing, and the screen is quieter for having only the
     * words that want something on it moving.
     */
    function bubbleMotion(stage, timer, sad, order) {
        if (stage === 0 || timer) return '';

        const period = sad ? SAD_BOUNCE_MS : BOUNCE_MS;

        return `animation: bounce ${period}ms ease-in-out ${-order * 170}ms infinite;`;
    }

    function createBubble(bubbleData, parent, order) {
        const { word, translation, bgColor, textColor, transColor, marks, stage, sad, timer, lang } = bubbleData;

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
            <div class="word-bubble-card" style="${bubbleMotion(stage, timer, sad, order || 0)} background-color: ${bgColor}; border: none; border-radius: 14px; padding: 6px 10px; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-sizing: border-box; position: relative; user-select: none; cursor: pointer; flex: 0 1 auto; min-width: 48px; max-width: 100%;">
                <span class="bubble-word-text" style="font-weight: 800; font-size: 15.6px; line-height: 1.15; color: ${textColor}; word-break: break-word; overflow-wrap: anywhere; max-width: 100%; text-align: center; outline: none;">${word}</span>
                <div class="bubble-dots-group" style="font-size: 7px; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 1px; max-width: 100%; margin-top: 3px; line-height: 1;">
                    ${dotsHtml}
                </div>
                <span class="bubble-trans-text" style="font-size: 15.6px; font-weight: 600; line-height: 1.1; -margin-top: 2px; color: ${transColor}; word-break: break-word; overflow-wrap: anywhere; max-width: 100%; text-align: center; outline: none;">${translation}</span>
                ${timerHtml}
            </div>
        `;

        const bubble = $(parent, bubbleHtml);

        // Tapping a word says it. The original rather than the translation, for
        // the same reason the cards do it that way: the translation is in a
        // language the player already has.
        //
        // Silent where the device has no voice for the script — speech.say says
        // so by returning false, and there is nothing useful to do about it
        // here. The pointer is offered anyway: whether a voice exists is not
        // known at draw time, because the voice list arrives asynchronously and
        // is usually still empty on the first render.
        bubble.addEventListener('click', () => {
            // Grown after the word is asked for rather than before: asking
            // settles whatever was in the air, and settling takes the last
            // bubble back down — this one included, when it is the one that was
            // talking. Grown at all only if there was something to hear.
            if (speech.say(word, lang, shrink)) return grow(bubble);

            // Nothing was heard, and when the reason is the switch in the
            // header, the switch is what answers: a tap that produces neither
            // sound nor movement is a tap that looks lost.
            if (speech.muted()) pulseMute();
        });

        return bubble;
    }

    function render() {
        // Read once per draw, so every card in the pass agrees, and cleared here
        // rather than at the end: an exception further down should not leave the
        // animation armed for whatever redraws next.
        const intro = introduce;
        introduce = false;

        // Every bubble on the screen is about to be thrown away, the swollen one
        // included. What is still being said goes on being said; there is just
        // nothing left to take back down afterwards.
        swollen = null;

        const unfold = unfolding;
        unfolding = null;

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
                <button class="dict-add-set-btn" id="add-set-btn" style="padding: 6px 14px; background: ${addBg}; color: ${palette.softColor}; border: 1px solid ${palette.softBorder}; border-radius: 12px; font-weight: 600; font-size: 15.6px; cursor: pointer; transition: all 0.2s;">+ New Set</button>
                <button class="dict-settings-btn" id="settings-btn" style="display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; padding: 0; background: ${settingsOpen ? palette.cardBg : 'transparent'}; border: 1px solid ${palette.softBorder}; border-radius: 12px; cursor: pointer; color: ${palette.softColor}; transition: all 0.2s;" title="Settings">${SLIDERS}</button>
                <button class="dict-mute-btn" id="mute-btn" style="display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; padding: 0; background: transparent; border: 1px solid ${palette.softBorder}; border-radius: 12px; cursor: pointer; color: ${palette.softColor}; transition: all 0.2s;" title="${speech.muted() ? 'Sound off' : 'Sound on'}">${speech.muted() ? SPEAKER_OFF : SPEAKER}</button>
            </div>
        </div>`);

        /*
         * The sound, on and off.
         *
         * A redraw rather than a swapped icon: the header is drawn from what is
         * true, and the mute state is now part of that. Nothing else on the
         * screen changes shape, so the redraw is invisible.
         */
        header.querySelector('#mute-btn').addEventListener('click', () => {
            speech.mute(!speech.muted());
            saveSetting('muted', speech.muted());
            render();
        });

        // The mark's rings, filled in and back — see RINGS. A redraw for the
        // same reason the mute button takes one: the header is built from what
        // is true, and swapping attributes underneath it would leave the two
        // disagreeing the next time anything else redraws.
        header.querySelector('.dict-logo').addEventListener('click', () => {
            ringsFilled = !ringsFilled;
            render();
            blinkLogo();
        });

        // Opens the settings layer and closes it again. A toggle, like the New
        // Set button next to it: the press that opened something is the press
        // that takes it away, whatever shape the something has.
        header.querySelector('#settings-btn').addEventListener('click', () => {
            if (closing) return;

            if (settingsOpen) {
                closeSettings();
                return;
            }

            settingsOpen = true;
            unfolding = 'settings';
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
            unfolding = 'set';
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

        if (unfold === 'set') {
            const card = newSetCard();
            if (card) unfoldInto(card, bannerSpace);
        }

        // Last, so it is over everything this pass drew. Redrawn with the rest
        // of the screen — the theme button repaints the catalog under an open
        // panel — and it only rises into place when this pass is the one that
        // opened it.
        if (settingsOpen) renderSettings(container, unfold === 'settings');
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
    function collapsed(card, gap, floor) {
        const cs = getComputedStyle(card);
        const frame = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
        const pads = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);

        // max-height caps the content box, and the card's padding and border sit
        // outside it. Asking for the banner's height directly would leave a card
        // that tall plus 34px of frame — which is exactly the jump this is meant
        // to remove.
        const inner = floor - frame - pads;

        if (inner >= 0) {
            card.style.maxHeight = `${inner}px`;
        } else {
            // Nothing to fit the padding into: flatten it and give the content
            // whatever the frame leaves. This is also the no-banner case, where
            // the card folds all the way down to its own two border lines.
            card.style.paddingTop = '0px';
            card.style.paddingBottom = '0px';
            card.style.maxHeight = `${Math.max(floor - frame, 0)}px`;
        }

        if (gap) card.style.marginBottom = `-${gap}px`;
    }

    function unfoldInto(card, floor) {
        const opened = card.scrollHeight;
        const gap = listGap(card);

        // Taken before they are overridden, and put back by value at the end.
        // The card's padding is written in its own style attribute, so clearing
        // the override does not uncover it — it uncovers nothing, and the card
        // would keep the flattened padding it was animated through.
        const padTop = getComputedStyle(card).paddingTop;
        const padBottom = getComputedStyle(card).paddingBottom;

        card.style.overflow = 'hidden';
        collapsed(card, gap, floor);

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

    function foldAway(card, done, floor) {
        const gap = listGap(card);

        card.style.overflow = 'hidden';
        card.style.maxHeight = `${card.scrollHeight}px`;

        pin(card);

        card.style.transition = `max-height ${FOLD_SHUT}ms ease-in,`
            + ` padding ${FOLD_SHUT}ms ease-in, margin-bottom ${FOLD_SHUT}ms ease-in`;
        collapsed(card, gap, floor);

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
        }, bannerSpace);
    }

    /*
     * How long the panel takes to grow out of the button and to fold back into
     * it.
     *
     * Shorter than the fold above, and out shorter than in: the fold moves a
     * card the list has to make room for, while this only opens something over
     * the page. A dismissal that lingers reads as the app thinking about it.
     */
    const RISE_IN = 170;
    const RISE_OUT = 130;

    // How far the panel is from the button it hangs under, and how close it may
    // come to the edge of the screen before it stops following.
    const ANCHOR_GAP = 8;
    const SCREEN_EDGE = 12;

    /*
     * Hangs the panel under the button that opened it, right edges together.
     *
     * Right rather than left because the button is the last thing in the header:
     * lined up by its left edge the panel would hang off the screen. Clamped all
     * the same — the header is laid out by the browser, and a measurement is
     * worth less than the check that it landed somewhere visible.
     *
     * The height it is allowed is whatever is left below it, so a panel that
     * outgrows the screen scrolls inside itself instead of running off the
     * bottom. Read off the viewport, which is safe to read and unsafe to decide:
     * a fixed element takes no part in how wide the popup ends up, so measuring
     * it here closes no loop — see app.css on why no CSS rule may.
     *
     * Returns where the button is, in the panel's own coordinates, for the
     * transform to grow from.
     */
    function hangUnder(panel, anchor) {
        const a = anchor.getBoundingClientRect();
        const room = document.documentElement.clientHeight;

        const left = Math.max(SCREEN_EDGE, a.right - panel.offsetWidth);
        const top = a.bottom + ANCHOR_GAP;

        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
        panel.style.maxHeight = `${Math.max(120, room - top - SCREEN_EDGE)}px`;

        return `${a.left + a.width / 2 - left}px ${a.top + a.height / 2 - top}px`;
    }

    /*
     * Escape while the panel is up, and a window that changed size under it.
     *
     * Held on the document rather than on the overlay because a div gets no keys
     * unless it is focused, and focusing the panel would take the caret out of
     * whatever was being typed behind it.
     *
     * In the extension popup neither fires: the window is a fixed size, and
     * Chrome closes the popup on Escape before the page sees it. On the site and
     * in the installed app both do — a phone turned on its side moves the button
     * the panel is hanging from, and a panel left where the button used to be
     * points at nothing.
     */
    let watching = null;

    function watchWhileOpen(panel, anchor) {
        stopWatching();

        watching = {
            key: (e) => { if (e.key === 'Escape') closeSettings(); },
            moved: () => { panel.style.transformOrigin = hangUnder(panel, anchor); }
        };

        document.addEventListener('keydown', watching.key);
        window.addEventListener('resize', watching.moved);
    }

    function stopWatching() {
        if (!watching) return;
        document.removeEventListener('keydown', watching.key);
        window.removeEventListener('resize', watching.moved);
        watching = null;
    }

    // Folds the panel back into the button it came out of. It has nothing
    // behind it to discard — the shrinking is the whole of the closing — and the
    // redraw afterwards is what puts the button back to unpressed.
    function closeSettings() {
        const overlay = container.querySelector('.dict-settings-overlay');
        stopWatching();

        if (!overlay) {
            settingsOpen = false;
            render();
            return;
        }

        const panel = overlay.querySelector('.dict-settings-panel');

        closing = true;
        overlay.style.transition = `opacity ${RISE_OUT}ms ease-in`;
        overlay.style.opacity = '0';
        panel.style.transition = `transform ${RISE_OUT}ms ease-in, opacity ${RISE_OUT}ms ease-in`;
        panel.style.transform = 'scale(0.6)';
        panel.style.opacity = '0';

        setTimeout(() => {
            closing = false;
            settingsOpen = false;
            render();
        }, RISE_OUT);
    }

    /*
     * The settings panel: hung under the button that opens it, over the page.
     *
     * It used to open at the top of the list of sets, and that list is the one
     * place on this screen that belongs to the player — their sets, in their
     * order — with a panel of the app's own pushing the first of them down the
     * page. Settings are not a set, and over the page nothing has to move to let
     * them in.
     *
     * Under the button rather than in the middle of the screen. A centred sheet
     * is the shape of a question that has to be answered before anything else
     * can happen — which is what the early-play dialog is, and this is not. This
     * is a drawer belonging to a control: it opens where that control is, it
     * grows out of it, and it folds back into it.
     *
     * The wash underneath both catches the press that means "enough" and darkens
     * what is behind it. The same wash as the early-play question, to the value:
     * one screen with two different dimmings would read as two different kinds
     * of layer, and these are one kind — something over the page, waiting to be
     * dealt with before the page can be used again.
     *
     * It fades with the panel rather than snapping on. Appearing at full
     * strength under something that is still growing reads as two events, and it
     * is one.
     *
     * Fixed and inset rather than sized in vw — app.css says why no rule here
     * may be viewport-derived in a popup. inset: 0 is not: it takes whatever the
     * viewport turns out to be instead of having an opinion about it.
     *
     * Two things in it. The light switch came out of the header, where it stood
     * next to the one button this app is for: a header of three controls where
     * two are about the app and one is about making sets reads as three equal
     * offers, and they are not equal. A theme is chosen about as often as
     * anything else in here — which is to say once — and this is where the
     * things chosen once now live.
     *
     * The switch is a row rather than a bare icon, because in a list a picture
     * with no name is a guess: pressed, it does something, and what it did is
     * the only way to find out what it was. The row says which theme is on, and
     * the icon stays as the picture of that answer.
     *
     * It sits outside the body below it, which the erase question rewrites
     * wholesale — a control that vanished while a different question was being
     * asked would look like part of the question.
     *
     * The second thing is the destructive one, which is why it asks first. The
     * question replaces the button rather than opening something over the panel:
     * the player is already inside a layer they chose to open, and stacking a
     * second one to say a single sentence is more ceremony than the moment
     * deserves.
     *
     * Coral marks the button by its border and not by its label. Coral text on
     * this card is 3.7:1 in the dark theme and 3.0:1 in the light one — under
     * what a 15px label needs — while the border carries the same warning at a
     * size where that contrast is enough.
     */
    /*
     * The ladder itself: one cell per stage, in the colour that stage wears on
     * a bubble.
     *
     * The colours are half of what the section is for. A number of hours means
     * little on its own, and the ramp is the only place the stages are ever
     * seen — putting the two side by side is what turns fifteen numbers into a
     * shape a person can recognise on the shelf behind the panel.
     *
     * Three columns because there are fifteen of them: in one column the
     * ladder is taller than the panel, and a list you have to scroll to see the
     * ends of is a list you cannot compare the ends of. Three fit across 300px
     * once the cells are cut to what they hold — a two-digit stage and "14d",
     * which is the longest interval anyone is going to type.
     *
     * Stage 0 has no field. It is the state of a word nothing has happened to,
     * and its interval is never read — a repetition always leaves a word on
     * stage 1 or above, which is where the waiting starts. It keeps its cell so
     * that the ramp is shown whole, with the wait drawn as a blank.
     */
    function intervalRows() {
        const spans = spacedRepetitions.intervals();

        const cells = spans.map((ms, stage) => {
            const c = getStageColors(stage);

            // Stage 1 in the colours it is actually drawn in, which are not the
            // ramp's — see DAMAGED_FILL. A swatch showing the pale yellow of a
            // rung nothing is ever drawn in would be a legend for a colour that
            // is not on screen.
            const fill = stage === 1 ? DAMAGED_FILL : c.fill;
            const ink = stage === 1 ? FAIL_INK : c.ink;

            const field = stage === 0
                ? `<span class="dict-interval-none" style="display: flex; align-items: center; justify-content: center; flex: 1; min-width: 0; height: 26px; box-sizing: border-box; border: 1px dashed ${palette.softBorder}; border-radius: 8px; font-size: 13.2px; font-weight: 700; color: ${palette.hint};">&mdash;</span>`
                : `<input class="dict-interval-input" type="text" spellcheck="false" data-stage="${stage}" value="${spanText(ms)}" aria-label="Stage ${stage}" style="flex: 1; min-width: 0; height: 26px; box-sizing: border-box; padding: 0 3px; background: ${palette.inputBg}; color: ${palette.inputText}; border: 1px solid ${palette.softBorder}; border-radius: 8px; font-family: inherit; font-size: 13.2px; font-weight: 700; line-height: 1; text-align: center; outline: none;">`;

            // min-width on the cell as well as on the field inside it: a grid
            // item is auto-sized to its content, and a text input's content is
            // whatever twenty characters come to — which pushed the first
            // column wide enough to squeeze the second out of the panel.
            return `<div class="dict-interval-row" style="display: flex; align-items: center; gap: 4px; min-width: 0;">
                <span class="dict-interval-stage" style="display: inline-flex; align-items: center; justify-content: center; flex: none; width: 24px; height: 26px; border-radius: 8px; background: ${fill}; color: ${ink}; font-size: 12px; font-weight: 700; line-height: 1;">${stage}</span>
                ${field}
            </div>`;
        }).join('');

        return `<div style="padding-top: 8px;">
            <div class="dict-intervals-hint" style="margin-bottom: 8px; font-size: 11.4px; font-weight: 600; line-height: 1.5; color: ${palette.hint};">How long a word waits on each stage before it comes up again. Minutes unless the number carries <b>h</b> or <b>d</b>.</div>
            <div class="dict-intervals-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">${cells}</div>
            <div class="dict-intervals-foot" style="display: flex; justify-content: flex-end; margin-top: 8px;">
                <button class="dict-intervals-reset" style="padding: 5px 10px; background: transparent; border: 1px solid ${palette.softBorder}; border-radius: 10px; font-family: inherit; font-size: 13.2px; font-weight: 600; color: ${palette.softColor}; cursor: pointer;">Defaults</button>
            </div>
        </div>`;
    }

    /*
     * A block unrolled and rolled back, with nothing else on the panel moving:
     * both the hint and the ladder are drawn where they belong and only hidden,
     * so this is a fold rather than a redraw.
     *
     * Height through max-height, because neither has a height to animate to —
     * it is however many lines the text wraps into at whatever width the panel
     * ends up, and that is known only once it is in the page. The cap is
     * measured there and dropped as soon as the run ends: left on, it would clip
     * the content the moment anything reflowed it.
     *
     * Opacity alongside it, because content sliding out from under a cap reads
     * as content being cut off; fading as it comes reads as content arriving.
     *
     * The panel is already as tall as the screen allows and scrolls inside
     * itself, so a block longer than the room left over can still be read.
     *
     * The timers are held per element rather than in one variable: two folds
     * can be running at once, and a press on one would otherwise arrive to tidy
     * away the other one's run. Weakly, because the elements are thrown away on
     * every redraw of the panel and there is no moment to clear the entry in.
     */
    const PANEL_OPEN = 190;
    const PANEL_SHUT = 150;

    const foldTimers = new WeakMap();

    function foldOut(el, open) {
        // A press during the run leaves the last one's clean-up in the air, and
        // it would arrive to tidy away a fold going the other way.
        clearTimeout(foldTimers.get(el));

        if (open) el.hidden = false;

        el.style.opacity = open ? '0' : '1';
        el.style.maxHeight = open ? '0px' : `${el.scrollHeight}px`;

        pin(el);

        el.style.transition = open
            ? `max-height ${PANEL_OPEN}ms ease-out, opacity ${PANEL_OPEN}ms ease-out`
            : `max-height ${PANEL_SHUT}ms ease-in, opacity ${PANEL_SHUT}ms ease-in`;

        el.style.opacity = open ? '1' : '0';
        el.style.maxHeight = open ? `${el.scrollHeight}px` : '0px';

        foldTimers.set(el, setTimeout(() => {
            if (!open) el.hidden = true;

            el.style.maxHeight = '';
            el.style.opacity = '';
            el.style.transition = '';
        }, (open ? PANEL_OPEN : PANEL_SHUT) + 40));
    }

    /*
     * Where this app can be had, and which of those exists.
     *
     * One codebase, three deliveries: the extension is the one that is
     * finished, the site and the phone app are not. It goes at the top of the
     * settings panel rather than into a readme because the panel is the only
     * page a person opens without being sent to it, and the question this
     * answers — "is a browser all this runs in?" — is asked once, early.
     *
     * The two that do not exist yet are drawn in dashes, the same dashes the
     * stage with no interval of its own wears further down the panel: an
     * outline with nothing filling it is the shortest way to say planned rather
     * than missing. Nothing here can be pressed — it is a legend, and a cell
     * that looked like a button would promise a place to go.
     */
    function platformStrip() {
        const spots = [
            { icon: PUZZLE, name: 'Extension', note: 'You are here', here: true },
            { icon: DESKTOP, name: 'Web App', note: 'In progress' },
            { icon: HANDSET, name: 'Phone', note: 'In progress' }
        ];

        const cells = spots.map(spot => `<div class="dict-where-cell" style="display: flex; flex-direction: column; align-items: center; gap: 5px; flex: 1; min-width: 0; box-sizing: border-box; padding: 9px 2px; border: 1px ${spot.here ? 'solid' : 'dashed'} ${palette.softBorder}; border-radius: 12px; background: ${spot.here ? palette.softBg : 'transparent'}; color: ${spot.here ? palette.title : palette.hint};">
                ${spot.icon}
                <span style="font-size: 12px; font-weight: 700; line-height: 1;">${spot.name}</span>
                <span style="font-size: 11.4px; font-weight: 600; line-height: 1.2; text-align: center; color: ${palette.hint};">${spot.note}</span>
            </div>`).join('');

        return `<div class="dict-where" style="display: flex; gap: 6px; margin-bottom: 10px;">${cells}</div>`;
    }

    function renderSettings(parent, rising) {
        const anchor = container.querySelector('#settings-btn');

        const overlay = $(parent, `<div class="dict-settings-overlay" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); z-index: 100;">
            <div class="dict-settings-panel" style="position: absolute; box-sizing: border-box; width: 300px; background: ${palette.dialogBg}; color: ${palette.dialogText}; border: 1px solid ${palette.dialogBorder}; border-radius: 18px; padding: 16px; overflow-y: auto; box-shadow: 0 12px 28px rgba(0, 0, 0, 0.32);">
                <div class="dict-settings-head" style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 10px;">
                    <div class="dict-settings-title" style="font-size: 16.8px; font-weight: 700; color: ${palette.heading};">Settings</div>
                    <button class="dict-settings-close" style="display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; flex: none; padding: 0; background: transparent; border: 1px solid ${palette.softBorder}; border-radius: 10px; cursor: pointer; color: ${palette.softColor};" title="Close">${CROSS}</button>
                </div>
                ${platformStrip()}
                <button class="dict-theme-row" style="display: flex; justify-content: space-between; align-items: center; gap: 12px; width: 100%; box-sizing: border-box; padding: 8px 10px; background: ${palette.softBg}; border: 1px solid ${palette.softBorder}; border-radius: 12px; font-family: inherit; font-size: 15px; font-weight: 600; color: ${palette.softColor}; cursor: pointer; margin-bottom: 8px;">
                    <span>Theme</span>
                    <span class="dict-theme-state" style="display: inline-flex; align-items: center; gap: 7px;">${theme.isDark() ? 'Dark' : 'Light'}${palette.themeIcon}</span>
                </button>
                <button class="dict-advanced-line" aria-expanded="${advancedOpen}" style="display: flex; align-items: center; gap: 6px; width: 100%; box-sizing: border-box; margin-top: 4px; padding: 6px 2px; background: transparent; border: none; font-family: inherit; font-size: 12px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: ${palette.hint}; cursor: pointer;">
                    <span class="dict-advanced-chevron" style="display: block; flex: none; transform: rotate(${advancedOpen ? 90 : 0}deg); transition: transform 0.18s ease-out;">${CHEVRON_SMALL}</span>
                    <span>Advanced</span>
                    <span class="dict-advanced-rule" style="flex: 1; height: 1px; background: ${palette.softBorder};"></span>
                </button>
                <div class="dict-advanced-fold" style="overflow: hidden;"${advancedOpen ? '' : ' hidden'}>
                <div class="dict-advanced-body" style="padding-top: 8px;">
                <div class="dict-split-line" style="display: flex; align-items: center; gap: 8px;">
                    <button class="dict-split-row" style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex: 1; min-width: 0; box-sizing: border-box; padding: 8px 10px; background: ${palette.softBg}; border: 1px solid ${palette.softBorder}; border-radius: 12px; font-family: inherit; font-size: 15px; font-weight: 600; color: ${palette.softColor}; cursor: pointer;">
                        <span>Split words</span>
                        <span class="dict-split-state">${speech.splitsByLanguage() ? 'By language' : 'By spaces'}</span>
                    </button>
                    <button class="dict-split-help" aria-expanded="${splitHintOpen}" title="What this does" style="display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; flex: none; padding: 0; background: transparent; border: 1px solid ${palette.softBorder}; border-radius: 50%; font-family: inherit; font-size: 14.4px; font-weight: 700; line-height: 1; color: ${palette.softColor}; cursor: pointer;">?</button>
                </div>
                <div class="dict-split-hint" style="overflow: hidden;"${splitHintOpen ? '' : ' hidden'}>
                    <div style="padding-top: 8px; font-size: 11.4px; font-weight: 600; line-height: 1.5; color: ${palette.hint};">
                        <div>Where a word ends, when you tap one on a card.</div>
                        <div style="margin-top: 6px;"><b>By spaces</b> — letters between spaces and punctuation. A line written without spaces, as Japanese and Chinese are, comes out as one word.</div>
                        <div style="margin-top: 6px;"><b>By language</b> — worth trying for Japanese, Chinese and Thai, which are written in characters with no spaces between the words: the browser's own rules can find where one word ends inside such a line. Not every browser knows how, phones least of all — where that is missing, every character becomes a word of its own.</div>
                        <div style="margin-top: 8px;"><b>If this browser cannot</b>, put the spaces in yourself and they will work everywhere. Open the set for editing, copy everything out of the box, ask any AI tool to space the words apart, then paste the result back and save.</div>
                    </div>
                </div>
                <button class="dict-intervals-line" aria-expanded="${intervalsOpen}" style="display: flex; align-items: center; gap: 8px; width: 100%; box-sizing: border-box; margin-top: 8px; padding: 8px 10px; background: ${palette.softBg}; border: 1px solid ${palette.softBorder}; border-radius: 12px; font-family: inherit; font-size: 15px; font-weight: 600; color: ${palette.softColor}; cursor: pointer;">
                    <span class="dict-intervals-chevron" style="display: block; flex: none; transform: rotate(${intervalsOpen ? 90 : 0}deg); transition: transform 0.18s ease-out;">${CHEVRON}</span>
                    <span style="flex: 1; text-align: left;">Repetition intervals</span>
                </button>
                <div class="dict-intervals-fold" style="overflow: hidden;"${intervalsOpen ? '' : ' hidden'}>${intervalRows()}</div>
                <div class="dict-settings-body" style="margin-top: 14px;"></div>
                </div>
                </div>
            </div>
        </div>`);

        const panel = overlay.querySelector('.dict-settings-panel');
        const body = panel.querySelector('.dict-settings-body');

        // Placed before anything is shown, because where it is placed is also
        // where it grows from: the button's own middle, in the panel's
        // coordinates — above its top edge, which a transform origin is allowed
        // to be.
        const origin = hangUnder(panel, anchor);
        panel.style.transformOrigin = origin;

        // Three ways out, and the fourth is the button that opened it. A press
        // on the wash counts only when it lands on the wash itself: the panel
        // sits inside it, and a click anywhere in the panel would otherwise
        // bubble up and shut the thing being used.
        // The panel is redrawn by the same render() the switch asks for, and it
        // stays open through it: the row comes back saying the other theme, over
        // a catalog that is already wearing it.
        overlay.querySelector('.dict-theme-row').addEventListener('click', () => {
            theme.set(!theme.isDark());
            catalog.setTheme(theme.isDark());
            render();
        });

        /*
         * Where a word ends — a question only the games ask. A tap on a card
         * says the word it landed on, and what a word is decides what that is.
         * Nothing on this screen changes shape when it is switched: the row is
         * redrawn saying the other answer, and the next card drawn anywhere
         * uses it.
         *
         * By spaces unless asked otherwise, because that answer is either right
         * or plainly wrong. The other is right where the browser carries the
         * dictionary for writing without spaces, and quietly wrong where it does
         * not — speech.js says why that cannot be asked about in advance.
         */
        /*
         * Advanced holds the other two folds inside it, and nothing has to be
         * done about that: foldOut takes the cap off as soon as its run ends,
         * so a section opened inside this one is free to make it taller
         * afterwards. Only a fold left permanently capped would clip them.
         */
        const deep = overlay.querySelector('.dict-advanced-fold');
        const deepLine = overlay.querySelector('.dict-advanced-line');
        const deepTurn = overlay.querySelector('.dict-advanced-chevron');

        deepLine.addEventListener('click', () => {
            advancedOpen = !advancedOpen;
            deepLine.setAttribute('aria-expanded', advancedOpen);
            deepTurn.style.transform = `rotate(${advancedOpen ? 90 : 0}deg)`;
            foldOut(deep, advancedOpen);
        });

        // The question mark unrolls its answer and rolls it back — see foldOut.
        const help = overlay.querySelector('.dict-split-help');
        const hint = overlay.querySelector('.dict-split-hint');

        help.addEventListener('click', () => {
            splitHintOpen = !splitHintOpen;
            help.setAttribute('aria-expanded', splitHintOpen);
            foldOut(hint, splitHintOpen);
        });

        const ladder = overlay.querySelector('.dict-intervals-fold');
        const ladderLine = overlay.querySelector('.dict-intervals-line');
        const ladderTurn = overlay.querySelector('.dict-intervals-chevron');

        ladderLine.addEventListener('click', () => {
            intervalsOpen = !intervalsOpen;
            ladderLine.setAttribute('aria-expanded', intervalsOpen);
            ladderTurn.style.transform = `rotate(${intervalsOpen ? 90 : 0}deg)`;
            foldOut(ladder, intervalsOpen);
        });

        /*
         * An interval is taken when the field is left rather than as it is
         * typed. A ladder rebuilt on every keystroke would pass through "1" on
         * the way to "14d" — every timer in the catalog behind the panel redrawn
         * against an interval nobody asked for, twice.
         */
        for (const field of overlay.querySelectorAll('.dict-interval-input')) {
            field.addEventListener('change', () => takeInterval(field));
            field.addEventListener('keydown', (e) => { if (e.key === 'Enter') field.blur(); });
        }

        overlay.querySelector('.dict-intervals-reset')
            .addEventListener('click', () => applyIntervals(spacedRepetitions.defaultIntervals()));

        function takeInterval(field) {
            const stage = Number(field.dataset.stage);
            const ms = spanValue(field.value);
            const spans = spacedRepetitions.intervals();

            // Anything that is not an interval puts the field back to what it
            // was showing. Refused without a word, because the refusal is the
            // whole of the message and it is visible in the field itself.
            if (ms === null) {
                field.value = spanText(spans[stage]);
                return;
            }

            if (ms === spans[stage]) return;

            spans[stage] = ms;
            applyIntervals(spans);
        }

        /*
         * The catalog is redrawn rather than the panel alone, because the
         * ladder is what every timer and every stage colour on the shelf is
         * computed from: a word's stage is replayed from its history against
         * the intervals in force, so a rung moved can move bubbles that are
         * nowhere near the stage that was edited.
         */
        function applyIntervals(spans) {
            if (!spacedRepetitions.setIntervals(spans)) return;

            saveSetting('intervals', spans);
            render();
        }

        overlay.querySelector('.dict-split-row').addEventListener('click', () => {
            speech.splitByLanguage(!speech.splitsByLanguage());
            saveSetting('splitByLanguage', speech.splitsByLanguage());
            render();
        });

        overlay.querySelector('.dict-settings-close').addEventListener('click', closeSettings);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeSettings();
        });
        watchWhileOpen(panel, anchor);

        if (rising) {
            overlay.style.opacity = '0';
            panel.style.transform = 'scale(0.6)';
            panel.style.opacity = '0';

            pin(panel);

            overlay.style.transition = `opacity ${RISE_IN}ms ease-out`;
            panel.style.transition = `transform ${RISE_IN}ms ease-out, opacity ${RISE_IN}ms ease-out`;
            overlay.style.opacity = '';
            panel.style.transform = '';
            panel.style.opacity = '';

            setTimeout(() => {
                overlay.style.transition = '';
                panel.style.transition = '';
            }, RISE_IN + 40);
        }

        function offer() {
            body.innerHTML = `
                <button class="dict-wipe-btn" style="padding: 7px 12px; background: transparent; color: ${palette.title}; border: 1px solid ${palette.accent}; border-radius: 12px; font-family: inherit; font-weight: 700; font-size: 15px; cursor: pointer;">Clear data</button>
                <p class="dict-wipe-note" style="margin: 8px 0 0; font-size: 13.2px; font-weight: 600; line-height: 1.4; color: ${palette.hint};">Removes every set, all progress and the offline copy of the app kept on this device.</p>`;

            body.querySelector('.dict-wipe-btn').addEventListener('click', confirm);
        }

        function confirm() {
            body.innerHTML = `
                <p class="dict-wipe-note" style="margin: 0 0 10px; font-size: 13.2px; font-weight: 600; line-height: 1.4; color: ${palette.hint};">Every set and all progress will be gone, and there is no undo. The starting sets come back.</p>
                <div class="dict-wipe-actions" style="display: flex; gap: 8px;">
                    <button class="dict-wipe-confirm" style="padding: 7px 12px; background: ${palette.accent}; color: ${palette.onAccent}; border: none; border-radius: 12px; font-family: inherit; font-weight: 700; font-size: 15px; cursor: pointer;">Erase</button>
                    <button class="dict-wipe-cancel" style="padding: 7px 12px; background: ${palette.softBg}; color: ${palette.softColor}; border: 1px solid ${palette.softBorder}; border-radius: 12px; font-family: inherit; font-weight: 600; font-size: 15px; cursor: pointer;">Cancel</button>
                </div>`;

            body.querySelector('.dict-wipe-cancel').addEventListener('click', offer);
            body.querySelector('.dict-wipe-confirm').addEventListener('click', wipeEverything);
        }

        offer();
    }

    // The name every cache of this app starts with, kept in step with web/sw.js
    // by hand: the worker is a separate script that this file cannot import, and
    // in the extension it is not shipped at all. The rest of the name is the
    // build hash that build.sh stamps in.
    const CACHE_PREFIX = 'spaced-repetition-app-';

    /*
     * The colour of the slot where the next game goes.
     *
     * Filled like the three beside it, because the row is four blocks and an
     * outline among them is a hole in it — the button was drawn that way first
     * and it read as something gone wrong rather than as something to come.
     *
     * Blue, which is the one place left in the row: coral, gold and mint cover
     * the warm half of the wheel and the green corner of the cool one, and this
     * sits opposite all three. It was a warm greige first, and a neutral among
     * three colours is what a disabled button looks like — the slot is meant to
     * be inviting, not switched off.
     *
     * Light enough to clear the card it lies on in the dark theme, which is
     * itself blue: 3.2 against that surface, and 3.3 under the white label, so
     * it neither sinks into the card nor swallows its own word.
     *
     * One value for both themes, like the game colours in registry.js: a block
     * that changed colour with the theme would be two blocks.
     */
    const MORE_FILL = '#4a90d9';


    /*
     * Empties every store and starts the app over.
     *
     * Reloading rather than redrawing: half this app's state lives in variables
     * that were read at boot, and a redraw over a database that no longer exists
     * would show a catalog built from memories of it. A reload comes back to an
     * empty store, which is what seeds the starting sets again.
     */
    async function wipeEverything() {
        try {
            localStorage.clear();
        } catch (e) {
            // Private mode, or storage switched off — there was nothing to clear
        }

        await storage.wipe();
        await dropOfflineCopy();

        location.reload();
    }

    /*
     * The offline copy: the service worker and the caches it filled.
     *
     * Without this the button clears the data and leaves the code. The worker is
     * cache-first, so a page that has one keeps being served the shell that
     * worker installed — a reload right after wiping would come back on the old
     * build, and "start over" would mean starting over on whatever version
     * happened to be cached. Dropping both makes the reload below come from the
     * network, and the next worker installs its shell from scratch.
     *
     * Only ours are touched. Both of these namespaces belong to the whole
     * origin, and the site this is published under has other pages on it: the
     * caches are matched by the prefix sw.js gives them, the workers by whether
     * their scope is inside this app. The extension has neither and falls
     * through both blocks without doing anything.
     */
    async function dropOfflineCopy() {
        const root = new URL('./', location.href).href;

        try {
            if (globalThis.navigator && navigator.serviceWorker) {
                const workers = await navigator.serviceWorker.getRegistrations();
                await Promise.all(workers
                    .filter(worker => worker.scope.startsWith(root))
                    .map(worker => worker.unregister()));
            }
        } catch (e) {
            // No worker to remove, or no API to remove it with
        }

        try {
            if (globalThis.caches) {
                const names = await caches.keys();
                await Promise.all(names
                    .filter(name => name.startsWith(CACHE_PREFIX))
                    .map(name => caches.delete(name)));
            }
        } catch (e) {
            // Cache Storage is not reachable outside a secure origin
        }
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
            /*
             * Under the box, what the text in it is written in: the words on the
             * left, their translations on the right.
             *
             * A real <select> rather than a plate with a menu built under it.
             * Clicking it is what opens a dropdown on every platform, the
             * keyboard works, and on a phone it is the system's own picker —
             * none of which is worth rewriting to own the arrow.
             *
             * What the closed plate shows is the state, not a label: one
             * language when every word is in it, all of them named in a row when
             * they differ. refreshPlates keeps both in step with the box.
             */
            const SELECT_STYLE = `width: 100%; box-sizing: border-box; background: ${palette.softBg}; color: ${palette.softColor}; border: 1px solid ${palette.softBorder}; border-radius: 12px; padding: 7px 10px; font-family: inherit; font-size: 13.8px; font-weight: 600; cursor: pointer; outline: none;`;

            // A caption over a dropdown, cut to the width it has. Both of them
            // are one line high whatever they hold, so the two columns stay
            // level and the dropdowns under them line up across every row.
            //
            // The indent is the dropdown's own: its border plus its padding, so
            // the word starts exactly above the language it names rather than a
            // few pixels to the left of it.
            //
            // The line height is set rather than inherited, so a caption in Arabic
            // or Devanagari — both taller than Latin at the same size — takes the
            // same band as the word next to it in the ordinary case.
            //
            // Keeping the two dropdowns level is not left to that, though. The
            // row is a grid and the captions share one of its rows: whichever of
            // them turns out taller, both dropdowns begin where that row ends.
            // Matching two boxes by eye is what was tried first, and a phone
            // found a script where the numbers did not agree.
            const caption = (text, strong, indent) => `<div style="font-size: 12.6px; line-height: 20px; font-weight: ${strong ? 700 : 600}; color: ${strong ? palette.softColor : palette.hint}; padding-left: ${indent}px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${text}</div>`;

            const langPlate = (side) => `<select class="set-lang-select" data-side="${side}" style="${SELECT_STYLE}">${languageOptions()}</select>`;

            let textLines = [set.title];
            set.words.forEach(w => {
                textLines.push(`${w.original} -- ${w.translation}`);
            });

            const box = `<label class="set-edit-hint" style="display: block; font-size: 13.2px; font-weight: 600; color: ${palette.hint}; margin-bottom: 6px;">
                    First line - Title, then: "word -- translation" (a tab works too; clear text to delete)
                </label>
                <textarea class="set-edit-textarea" placeholder="NEW SET NAME&#10;example -- пример&#10;two words -- два слова" style="width: 100%; height: 115px; background: ${palette.inputBg}; color: ${palette.inputText}; border: 1px solid ${palette.softBorder}; border-radius: 12px; padding: 8px; font-family: inherit; font-size: 15.6px; box-sizing: border-box; resize: vertical; outline: none;">${textLines.join('\n')}</textarea>
                <div class="set-lang-area" style="margin-top: 8px;" hidden>
                    <div class="set-lang-plates" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        ${langPlate('originalLang')}
                        ${langPlate('translationLang')}
                    </div>
                    <div class="set-lang-fold">${foldingSection('Advanced', `<div style="font-size: 11.4px; font-weight: 600; line-height: 1.5; color: ${palette.hint};">
                            <div>${OWN_VOICE} voice installed</div>
                            <div>${BORROWED_VOICE} read by a related voice</div>
                            <div>${NO_VOICE} no voice at all</div>
                        </div>
                        <div class="set-word-langs" style="display: flex; flex-direction: column; gap: 6px; margin-top: 14px;"></div>`, false)}</div>
                </div>`;

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

            // The routes are nested one level in: the folds are plain hidden
            // bodies, so a section inside a section needs nothing but the
            // indent that says which is which.
            const routes = `<div class="set-fold-nest" style="padding-left: 12px;">`
                + ROUTES.map(r => foldingSection(r.question, steps(r), false)).join('')
                + `</div>`;

            const formBody = guided
                ? staticSection('Paste words here', box)
                    + foldingSection(ROUTES_LABEL, routes, false)
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
            // should not mean opening one twice. The heading they sit under
            // works the same way and needs no special case — every toggle's
            // body is the element right after it, nested or not.
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

            /*
             * What the person chose on each plate, until the form is closed:
             *
             *     null   nothing chosen — a word that has a language keeps it,
             *            a word that has none is named by the detector;
             *     'auto' chosen by hand — every word on that side is named again
             *            from scratch, whatever it carried before;
             *     a tag  every word on that side is in that language.
             *
             * Null and 'auto' differ, and the difference matters: opening the
             * form must not quietly re-guess what was already known, while
             * asking for Auto is exactly the request to re-guess it.
             */
            const choice = { originalLang: null, translationLang: null };

            /*
             * The same three states, one word at a time, kept by the word's own
             * text: the list below is rebuilt from the box on every keystroke,
             * and the text is the only thing a word keeps across that. Rename a
             * word and its pick is gone with the name — the same deal its
             * history and its languages get in readWords.
             */
            const wordChoice = new Map();
            const keyOf = (word) => word.original.toLowerCase();

            function nameWords(words) {
                ['originalLang', 'translationLang'].forEach(field => {
                    if (choice[field] === 'auto') words.forEach(w => { delete w[field]; });
                    else if (choice[field]) words.forEach(w => { w[field] = choice[field]; });
                });

                // A word's own pick beats the side's: choosing for one word would
                // be pointless if the plate above could overrule it.
                words.forEach(w => {
                    const own = wordChoice.get(keyOf(w));
                    if (!own) return;

                    ['originalLang', 'translationLang'].forEach(field => {
                        if (own[field] === 'auto') delete w[field];
                        else if (own[field]) w[field] = own[field];
                    });
                });

                if (words.length) store.label({ words });
            }

            /*
             * The plates follow the box. The words are read exactly as saving
             * would read them and named exactly as saving would name them — on
             * the fresh objects readWords just built, never on the ones the app
             * is holding — so what the plate shows is what Save will write.
             */
            const plates = editForm.querySelectorAll('.set-lang-select');
            const wordList = editForm.querySelector('.set-word-langs');

            /*
             * One row per word: what it says, and the two languages it is in.
             *
             * The rows are rebuilt only when the words themselves change, not
             * on every keystroke. Each row carries a pair of hundred-option
             * lists, so a set of any size would otherwise rebuild a few thousand
             * nodes between one letter and the next.
             */
            let drawnKeys = null;

            function drawWordRows(words) {
                // Nothing is built while the section is shut: a set of any size
                // carries two hundred-option lists per word, and typing into the
                // box would otherwise fill a hidden div with them on every
                // change. Reopening draws whatever the words are by then.
                if (wordList.closest('.set-fold-body').hidden) {
                    drawnKeys = null;
                    return false;
                }

                const keys = words.map(w => w.original + String.fromCharCode(31) + w.translation).join(String.fromCharCode(30));
                if (keys === drawnKeys) return false;
                drawnKeys = keys;

                // Each side over its own dropdown rather than both over the
                // pair: with one line for the two of them there was nothing to
                // say which dropdown answered for which half of it.
                const options = languageOptions();
                const rowSelect = `width: 100%; box-sizing: border-box; background: ${palette.softBg}; color: ${palette.softColor}; border: 1px solid ${palette.softBorder}; border-radius: 10px; padding: 4px 8px; font-family: inherit; font-size: 12.6px; font-weight: 600; cursor: pointer; outline: none;`;

                // Four cells in two columns: the two captions share the first grid
                // row, the two dropdowns the second. Whatever either caption is
                // written in, the dropdowns under them start together.
                wordList.innerHTML = words.map(w => `<div class="set-word-lang" data-key="${escapeText(keyOf(w))}" style="display: grid; grid-template-columns: 1fr 1fr; gap: 3px 6px; align-items: start;">
                        ${caption(escapeText(w.original), false, 9)}
                        ${caption(w.translation ? escapeText(w.translation) : '–', false, 9)}
                        <select class="set-word-lang-select" data-field="originalLang" style="${rowSelect}">${options}</select>
                        <select class="set-word-lang-select" data-field="translationLang" style="${rowSelect}">${options}</select>
                    </div>`).join('');

                wordList.querySelectorAll('.set-word-lang-select').forEach(select => {
                    select.addEventListener('change', () => {
                        const key = select.closest('.set-word-lang').dataset.key;
                        const own = wordChoice.get(key) || {};
                        own[select.dataset.field] = select.value;
                        wordChoice.set(key, own);
                        refreshPlates();
                    });
                });

                return true;
            }

            const langArea = editForm.querySelector('.set-lang-area');

            function refreshPlates() {
                const parsed = readWords(textarea.value, set);
                const words = parsed ? parsed.words : [];
                nameWords(words);

                // An empty box has no languages to set. The controls arrive with
                // the first word and leave with the last one.
                langArea.hidden = !words.length;

                drawWordRows(words);

                words.forEach((w, i) => {
                    const row = wordList.children[i];
                    if (!row) return;

                    row.querySelectorAll('.set-word-lang-select').forEach(select => {
                        showLanguages(select, w[select.dataset.field] ? [w[select.dataset.field]] : []);
                    });
                });

                // Every language its side is in, so a choice made for one word
                // shows up here as well: this pair answers for the whole set.
                plates.forEach(plate => showLanguages(plate, languagesOf(words, plate.dataset.side)));
            }

            if (plates.length) {
                refreshPlates();
                textarea.addEventListener('input', refreshPlates);

                // The generic fold handler above has already flipped the body by
                // the time this runs, so opening the section is what draws it.
                editForm.querySelector('.set-lang-fold .set-fold-toggle')
                    .addEventListener('click', refreshPlates);

                /*
                 * The voice list lands after the page does — getVoices() is
                 * empty for the first moments — so a form opened right away
                 * would mark nothing. One redraw when it arrives puts the
                 * speakers in: the rows are rebuilt from scratch, and the two
                 * plates keep what they were showing while their options are
                 * replaced under them.
                 */
                if (speech.available()) {
                    speechSynthesis.addEventListener('voiceschanged', () => {
                        plates.forEach(plate => {
                            const kept = plate.value;
                            plate.innerHTML = languageOptions();
                            plate.value = kept;
                        });

                        drawnKeys = null;
                        refreshPlates();
                    }, { once: true });
                }

                plates.forEach(plate => plate.addEventListener('change', () => {
                    const side = plate.dataset.side;
                    choice[side] = plate.value;

                    // This pair answers for the whole set, so it answers for the
                    // words that were given a language of their own too — one
                    // language for all of them, or the detector for each. Only
                    // this side is cleared: naming the words says nothing about
                    // what their translations are in.
                    wordChoice.forEach(own => { delete own[side]; });

                    refreshPlates();
                }));
            }

            // Neither form takes the caret. On a phone focus raises the keyboard
            // over the half of the form that was just opened, and what is worth
            // reading first — the words already in the box, the routes above it,
            // the languages below — is exactly what the keyboard covers. Tapping
            // the box is one tap, and it is the tap of someone who has decided
            // to type.

            editForm.querySelector('.set-save-btn').addEventListener('click', () => {
                const parsed = readWords(textarea.value, set);

                /*
                 * No words, no set. An empty box has always meant delete, and a
                 * box with nothing but a title means the same: a name with
                 * nothing under it cannot be played, and the catalog would show
                 * it only to say that it is empty.
                 */
                if (!parsed || !parsed.words.length) {
                    store.removeAt(index);
                } else {
                    set.title = parsed.title;
                    set.words = parsed.words;

                    // The same naming the plates have been showing all along
                    nameWords(set.words);
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

                <div class="set-actions-group" style="display: flex; gap: 8px; height: 58px; margin-top: 18px;">
                    ${GAMES.map(g => `<button class="set-play-btn" data-game="${g.id}" style="flex: 1; min-width: 0; padding: 6px 2px; background: ${g.color}; color: #ffffff; border: none; border-radius: 12px; font-weight: 700; font-size: 15px; line-height: 1.1; cursor: pointer; transition: background 0.2s; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;">${g.icon(24)}<span>${g.title}</span></button>`).join('')}
                    <button class="set-more-btn" style="flex: 1; min-width: 0; padding: 6px 2px; background: ${MORE_FILL}; color: #ffffff; border: none; border-radius: 12px; font-family: inherit; font-weight: 700; font-size: 15px; line-height: 1.1; text-align: center; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;">${DOTS}<span class="set-more-label">More...</span></button>
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

            // The fourth button is not a game, it is the place the next one
            // goes: MORE_FILL says what it is painted in, moreSoon what it
            // says when pressed.
            card.querySelector('.set-more-btn').addEventListener('click', moreSoon);

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
            // The moon while the dark theme is on: the icon stands next to the
            // word "Dark" and has to agree with it. As a bare button in the
            // header it meant the opposite — where the press would take you —
            // and a picture that has to be pressed to be understood is what the
            // row replaced.
            themeIcon: isDark ? MOON : SUN,

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

    /*
     * What the fourth button has to say, which is more than a button can hold.
     *
     * It was two words swapped in place at first, and two words cannot carry
     * either half of this: that the row is not finished, and that finishing it
     * will cost the people here now nothing. The promise is the heading and not
     * a line in the middle, because it is the half worth interrupting someone
     * for — an app with three games and no reason to keep it is an app that
     * goes when the phone runs short of room.
     *
     * Built like the early-play dialog below and dismissed the same two ways,
     * because it is the same kind of thing: something said in the middle of the
     * catalog that the catalog goes back to being once it is read.
     */
    function moreSoon() {
        const overlay = $(`<div class="more-dialog-overlay" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 100;">
            <div class="more-dialog" style="background: ${palette.dialogBg}; color: ${palette.dialogText}; border: 1px solid ${palette.dialogBorder}; border-radius: 20px; padding: 20px; max-width: 320px; width: 100%;">
                <div class="more-dialog-title" style="font-size: 16.8px; font-weight: 700; margin-bottom: 8px;">Forever free for early adopters</div>
                <div class="more-dialog-text" style="font-size: 15px; line-height: 1.4; color: ${palette.dialogBody};">
                    <p style="margin: 0 0 10px;">Congratulations — you are one of the first to install it, so it stays free for you whatever this app charges later.</p>
                    <p style="margin: 0 0 14px;">More games to help you remember words are coming soon.</p>
                </div>
                <button class="more-dialog-ok" style="width: 100%; padding: 9px; background: ${palette.accent}; color: ${palette.onAccent}; border: none; border-radius: 12px; font-family: inherit; font-weight: 700; font-size: 15px; cursor: pointer;">Got it</button>
            </div>
        </div>`);

        const close = () => overlay.remove();

        overlay.querySelector('.more-dialog-ok').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
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

    // The ladder the player is on, if they have changed it. Absent means the
    // defaults, which is what the algorithm starts with anyway — see srs.js.
    if (settings && settings.intervals) spacedRepetitions.setIntervals(settings.intervals);

    /*
     * Dark unless the player has chosen otherwise; there is no first-run prompt
     * and no system sniffing, so an absent setting simply means the default.
     *
     * Absent is the word that matters. This used to ask whether the record
     * existed, which was the same question while the record could only be
     * written by choosing a theme — and stopped being it the moment anything
     * else was saved beside it. Turning the sound on inside a game wrote the
     * record with no theme in it, and the catalog came back in the light one.
     */
    const isDark = settings ? settings.isDark !== false : true;

    // Words are split by spaces unless the player asked for the other way.
    speech.splitByLanguage(settings ? !!settings.splitByLanguage : false);

    // Silent unless the player has turned the sound on. An absent setting is a
    // first run, and a first run is silent.
    speech.mute(settings ? settings.muted !== false : true);

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
