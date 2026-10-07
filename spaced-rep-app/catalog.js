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

    /*
     * Whether the colours have been explained to this person already. Handed in
     * at boot beside the session, and written down when the dialog is closed.
     *
     * A flag and not a thing derived from the words, which is the exception here
     * and has to be: reading an explanation leaves no mark on anything else. The
     * place it is kept is the settings record, so "Clear data" takes it with
     * everything else — and that is right, because the shelf after a reset is a
     * shelf nobody has had explained to them.
     */
    let coloursRead = false;

    /*
     * The two answers the app is built on: the language the reader has, and the
     * languages they want.
     *
     * A property of the person and not of a set, which is why they are asked
     * once and kept in the settings: somebody learning Spanish is learning it in
     * every set they open, and being asked again per set is being asked the same
     * question all day.
     *
     * Nothing is guessed. Until the pair of questions has been answered there is
     * no shelf to filter and no set to make, so the first screen is the question
     * itself -- see askLanguages.
     */
    let myLang = null;

    let learnLangs = [];

    /*
     * Whether the two questions have been put at all, which is not the same as
     * whether they were answered.
     *
     * Skip is a real answer: somebody who opens the app to look at it does not
     * owe it a language before being allowed in, and the starting set is enough
     * to see what the thing does. Without this flag the screen would have no way
     * to tell "has not decided" from "decided not to", and would ask again on
     * every visit -- which is how a question becomes a wall.
     */
    let langsAsked = false;

/*
     * Which cards have their form open, and what has been typed into each.
     *
     * Not on the set objects: store.save() writes the list whole, so anything
     * left on a set becomes domain data, and a box holding "banana --" is not a
     * set. It lives beside them under a key of its own instead -- the same deal
     * the games get for a session they have not finished.
     *
     * It used to live nowhere at all, and a form went with the window. In a
     * popup that is not a reload, it is a glance: look a word up somewhere else,
     * come back, and what had been typed was never there.
     *
     * The text is what is kept, not the set it would parse to. Half a line is an
     * ordinary state for a box to be in, and a parser handed "banana --" either
     * drops the half or invents the rest.
     */
    const editing = new Set();

    // What an open form holds: the box's text, the language chosen for each side
    // of the whole set, and the picks made for single words. Keyed by set id,
    // the draft's own id included.
    const openForms = new Map();

    /*
     * The set the New Set form is writing, and null when no such form is open.
     *
     * Outside the store, and that is the whole point of it. It used to be added
     * to the list on the press and taken back out by Cancel, which left every
     * other way off this screen leaking it: store.save() writes the list whole,
     * so tapping a game on another card — nav.game saves before it navigates —
     * wrote an untitled empty set into the database. It came back at the top of
     * the catalog with its own "Set is empty" and its own row of games, and the
     * only way to be rid of it was to open it and save it empty. Kept out of the
     * list, there is no save anywhere that can see it.
     */
    let draft = null;

    /*
     * The open forms as they stand, written after every change rather than when
     * a form is closed.
     *
     * There is no closing to hook. A popup goes when it loses focus, without
     * warning and without asking, and an unload handler could not finish the
     * write anyway: it returns, and the commit lands after it, with the page
     * already gone. So the record is kept current instead of being made correct
     * at the end, and a badly timed close costs the last keystroke, which the
     * next one puts back.
     *
     * The whole list goes every time. It is a handful of strings, and a write
     * that carries everything cannot leave half of an older one behind.
     */
    function saveForms() {
        const list = [];

        openForms.forEach((form, id) => list.push({
            id: id,
            isDraft: !!draft && draft.id === id,
            text: form.text,
            choice: form.choice
        }));

        return storage.set('open_forms', list);
    }

    // Opening a form is already worth remembering: a box someone opened and left
    // empty is still a box they opened.
    function rememberForm(id, text) {
        openForms.set(id, {
            text: text,
            choice: { originalLang: null, translationLang: null }
        });

        return saveForms();
    }

    function forgetForm(id) {
        openForms.delete(id);
        return saveForms();
    }

    // What the box shows for a set nobody has typed into yet.
    function setAsText(set) {
        return [set.title].concat(set.words.map(w => `${w.original} -- ${w.translation}`)).join('\n');
    }

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
     * else, and it stays sharp at any size instead of being a 109.3px bitmap
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
     *
     * It was cut to 29 for a while, to make this header exactly as tall as the
     * games' row of 29px buttons. The two screens are still one app, but the
     * catalogue's header is the only place the app says its own name, and a mark
     * sized to a row of buttons on another screen is a mark sized by something
     * that is not on this one.
     */
    const LOGO_SIZE = 34.1;

    /*
     * The two rings of the mark, which are eyes: a dark pupil inside a thin
     * white ring, the same face the snake's head wears — see faceOn in
     * snake.js. They were hollow outlines once, and a press on the mark
     * switched between the two; the switch is gone and the eyes stayed.
     *
     * The pupil is the dark theme's own ground, written out rather than taken
     * from tokens: one fixed value in both themes, the way the game colours
     * are, and a pupil that followed the theme would be a mark that changes
     * when the page does. Not black, which on this coral is a hole punched
     * through the card; this is the navy the whole app is built on, and at
     * this size it reads as a dark that belongs to something.
     *
     * Shut is a line across the eye — the same eye with the lid down, and
     * the same drawing the snake closes with.
     *
     * An eye is written as the two circles a reader actually sees: `eye`, how
     * far the white reaches, and `pupil`, where the dark ends. The ring
     * between them is whatever is left over. SVG wants the other pair — a
     * path radius with a stroke straddling it — and converting is two sums,
     * which is a better place for the arithmetic than a comment explaining
     * that a radius of 4.4 and a stroke of 2.4 happen to make an eye of 5.6.
     *
     * It also keeps the one rule this drawing has: the left eye is the larger
     * of the two, and how much of it is pupil is a separate question from how
     * big it is. The left pupil is the smaller share on purpose — two pupils
     * of the same size in eyes of different sizes is what a face does when it
     * is looking at something.
     */
    const RINGS = [
        { cx: 11.37, eye: 5.61, pupil: 3.2 },
        { cx: 23.02, eye: 3.76, pupil: 2.26 }
    ];

    const RING_INK = '#0f2b3c';
    const LID = 1.5;

    let ringsShut = false;

    function ringsSvg() {
        return RINGS.map(ring => ringsShut
            ? `<path d="M${ring.cx - ring.eye + LID / 2} 16H${ring.cx + ring.eye - LID / 2}" fill="none"
                    stroke="#ffffff" stroke-width="${LID}" stroke-linecap="round" />`
            : `<circle cx="${ring.cx}" cy="16" r="${(ring.eye + ring.pupil) / 2}" fill="${RING_INK}"
                    stroke="#ffffff" stroke-width="${ring.eye - ring.pupil}" />`).join('');
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
     * The blink. It runs from the first render to the end of the page, and it
     * is the one place in this file that changes what is on screen without
     * redrawing it.
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
     *
     * Started once, from the first render, and never stopped: there is one
     * catalog page and it lives as long as the tab does.
     */
    const BLINK_SHUT_MS = 130;
    const BLINK_GAP_MS = 2400;

    let blinkTimer = null;
    let blinking = false;

    function startBlinking() {
        if (blinking) return;

        blinking = true;
        blinkLogo();
    }

    function blinkLogo() {
        clearTimeout(blinkTimer);

        ringsShut = false;

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
    function chromeIcon(body, size = 15.4) {
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round" aria-hidden="true" style="display: block;">${body}</svg>`;
    }

    // A disc and eight marks around it. The rays are half what they were and the
    // disc is wider: at 15.4px eight long spokes crowd the ring until the middle
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
    /*
     * The settings button: a cog with six teeth rather than the eight or ten
     * a cog usually has.
     *
     * The icon is drawn on a 24 grid and shown at 18, so a tooth is about two
     * pixels of screen. Eight of them at this stroke close the gaps between
     * themselves and the ring turns into a blurred circle; six keep air
     * between them and still read as a cog. Seven was tried too and looked
     * like a six with a mistake in it; five reads as a rounded pentagon,
     * because an odd count has no axis to stand on.
     *
     * It is also half a flower. There are no corners anywhere on it: the
     * radius follows a cosine, 9.6 at the top of a lobe and 6.4 at the bottom
     * of a valley, so the six bumps are petals as much as they are teeth. The
     * wave was shallower at first and the petals were only implied; a third
     * deeper and they are the thing you see, while the outline is still round
     * everywhere and never points. A
     * cog drawn the honest way — arcs joined by straight radial sides — is a
     * picture of a machine part, and at eighteen pixels a picture of a
     * machine part is a smudge. This one is the idea of one, and the softer
     * silhouette survives being small.
     *
     * Generated rather than drawn: the curve is sampled four times per lobe
     * and the samples joined with Catmull-Rom, which is what makes it smooth
     * at every point rather than smooth in places. Six samples per lobe were
     * indistinguishable and half again as long; three began to flatten the
     * valleys into a hexagon. Changing the count, the depth or the sampling
     * means generating it again, not nudging points.
     */
    const GEAR = chromeIcon(`
        <path d="M21.60 12.00 C21.60 12.69 20.40 13.54 19.73 14.07 C19.05 14.60 17.89 14.60 17.54 15.20 C17.20 15.80 17.78 16.80 17.66 17.66 C17.53 18.51 17.40 19.97 16.80 20.31 C16.20 20.66 14.87 20.05 14.07 19.73 C13.27 19.41 12.69 18.40 12.00 18.40 C11.31 18.40 10.73 19.41 9.93 19.73 C9.13 20.05 7.80 20.66 7.20 20.31 C6.60 19.97 6.47 18.51 6.34 17.66 C6.22 16.80 6.80 15.80 6.46 15.20 C6.11 14.60 4.95 14.60 4.27 14.07 C3.60 13.54 2.40 12.69 2.40 12.00 C2.40 11.31 3.60 10.46 4.27 9.93 C4.95 9.40 6.11 9.40 6.46 8.80 C6.80 8.20 6.22 7.20 6.34 6.34 C6.47 5.49 6.60 4.03 7.20 3.69 C7.80 3.34 9.13 3.95 9.93 4.27 C10.73 4.59 11.31 5.60 12.00 5.60 C12.69 5.60 13.27 4.59 14.07 4.27 C14.87 3.95 16.20 3.34 16.80 3.69 C17.40 4.03 17.53 5.49 17.66 6.34 C17.78 7.20 17.20 8.20 17.54 8.80 C17.89 9.40 19.05 9.40 19.73 9.93 C20.40 10.46 21.60 11.31 21.60 12.00 Z" />
        <circle cx="12" cy="12" r="3" />`);

    const MOON = chromeIcon(`
        <path d="M20.6 14.4A8.7 8.7 0 0 1 9.6 3.4 8.7 8.7 0 1 0 20.6 14.4z" />`);

    const CHEVRON = chromeIcon(`<path d="M9 5l7 7-7 7" />`);

    // The same arrow cut down for the Advanced heading, where it stands beside
    // a 10.2px word rather than a 12.8px one.
    const CHEVRON_SMALL = chromeIcon(`<path d="M9 5l7 7-7 7" />`, 12);

    const CROSS = chromeIcon(`<path d="M6 6l12 12M18 6L6 18" />`);

    /*
     * A dropdown with the arrow drawn here rather than left to the browser.
     *
     * Chrome pins its own arrow to the right border and ignores the field's
     * padding -- 0, 30 and 60 pixels of padding-right put it in exactly the same
     * place -- so it sits hard against the edge while the text inside has its
     * padding of air on the left. The only way to give the two sides the same
     * inset is to switch the native arrow off and lay the app's own chevron over
     * the field, which is what `inset` is for: it is the field's own border plus
     * padding, so the arrow stands as far from its edge as the text does from
     * the other one.
     *
     * The same icon the folding rows use, turned a quarter so it points down. It
     * takes no clicks: the select underneath has to go on being the whole
     * control, arrow included.
     *
     * Every field wrapped in this has to turn the native arrow off itself --
     * appearance: none -- and leave room for this one in its padding-right.
     */
    const withChevron = (select, inset) => `<div style="position: relative;">
            ${select}
            <span style="position: absolute; right: ${inset}; top: 50%; translate: 0 -50%; rotate: 90deg; display: block; pointer-events: none; color: ${palette.softColor};">${CHEVRON}</span>
        </div>`;

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
    const DOTS_BODY = `
        <circle cx="5" cy="12" r="1.8" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1.8" fill="currentColor" stroke="none" />`;

    const DOTS = chromeIcon(DOTS_BODY, 24);

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
     * Cut to one line, which at 278.3px of label is about forty-seven
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
            <button class="set-fold-toggle" aria-expanded="${open}" style="display: flex; align-items: center; gap: 6.8px; width: 100%; padding: 7.7px 0; background: transparent; border: none; color: ${palette.title}; font-family: inherit; font-size: 12.3px; font-weight: 600; line-height: 1.35; text-align: left; cursor: pointer;">
                <span class="set-fold-chevron" style="display: block; flex: none; color: ${palette.softColor}; transform: rotate(${open ? 90 : 0}deg); transition: transform 0.18s ease-out;">${CHEVRON}</span>
                <span class="set-fold-label" style="flex: 1;">${label}</span>
            </button>
            <div class="set-fold-body" style="padding-bottom: 8.5px;"${open ? '' : ' hidden'}>${bodyHtml}</div>
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
        return `<svg width="15.4" height="15.4" viewBox="0 0 24 24" aria-hidden="true" style="display: inline-block; vertical-align: -4px; margin-left: 4.3px;">
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
        return `<div class="set-prompt-lead" style="margin-top: 3.4px;">Here is your prompt</div>
        <div class="set-prompt" style="margin: 4.3px 0 6px; background: ${palette.inputBg}; border: 1px solid ${palette.softBorder}; border-radius: 10.2px; padding: 6.8px;">
            <div class="set-prompt-text" style="font-size: 10.8px; font-weight: 500; line-height: 1.45; color: ${palette.inputText};">${text}</div>
            <button class="set-prompt-copy" style="display: block; margin: 6px 0 0 auto; padding: 2.6px 8.5px; background: ${palette.cardBg}; color: ${palette.title}; border: 1px solid ${palette.softBorder}; border-radius: 10.2px; font-family: inherit; font-size: 10.8px; font-weight: 600; cursor: pointer;">Copy</button>
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

            // Rebuilt rather than edited, so the one thing already known about a
            // word has to be carried across by hand: its history. A word that
            // kept its spelling keeps it; one nobody has seen before arrives
            // bare. The languages are the set's and are not here at all.
            const old = existingMap.get(original.toLowerCase());

            words.push({
                original: original,
                translation: translation,
                repetitions: old ? old.repetitions : []
            });
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

    /*
     * One dropdown, drawn the same wherever it stands. The set form has a pair
     * of them per word and the catalogue has two in its header, and a select
     * that looked different in the two places would read as two controls.
     *
     * A function and not a constant because it is built out of the palette,
     * which changes under the app when the theme does.
     */
    function selectStyle() {
        return `width: 100%; box-sizing: border-box; background: ${palette.softBg}; color: ${palette.softColor};`
            + ` border: 1px solid ${palette.softBorder}; border-radius: 10.2px; padding: 6px 8.5px;`
            + ` font-family: inherit; font-size: 11.8px; font-weight: 600; cursor: pointer; outline: none;`;
    }

    /*
     * The languages the app has sets in: the table's columns, named the way the
     * form's dropdowns name them but without the speaker marks.
     *
     * Those marks answer "will this be read aloud", which is a question about a
     * voice on this device. Here the question is which language is being learned,
     * and the answer does not change because a voice is missing.
     *
     * One tag per column, so Norwegian is here once. The table takes `nb` as
     * another spelling of `no` -- see SAME_AS -- which is for a tag that arrives
     * from somewhere else, not for offering the same column twice under two
     * names.
     */
    const CATALOG_CHOICES = LANGUAGE_CHOICES.filter(c => vocab.languages().includes(c.tag));

    function languageOptions() {
        return `<option value="${STATE_VALUE}" hidden></option><option value="auto">Auto</option>`
            + LANGUAGE_CHOICES.map(c => `<option value="${c.tag}">${markedName(c.tag)}</option>`).join('');
    }

    /*
     * Shows a select which language its side is in: the language itself when one
     * of its options is it, and the hidden option when there is none -- an empty
     * box, or a column of digits the detector could make nothing of.
     *
     * The hidden option used to carry a list, because a set could be in several
     * languages at once and the select had to say so. A set is one language a
     * side now, so the only thing left for it to say is that nothing is known
     * yet.
     */
    function showLanguage(select, tag) {
        const known = tag && select.querySelector(`option[value="${tag}"]`);

        select.title = tag ? markedName(tag) : '–';

        if (known) {
            select.value = tag;
            return;
        }

        select.querySelector(`option[value="${STATE_VALUE}"]`).textContent = '–';
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
            <div class="set-fold-label" style="padding: 7.7px 0; color: ${palette.title}; font-size: 12.3px; font-weight: 600; line-height: 1.35;">${label}</div>
            <div class="set-fold-body" style="padding-bottom: 8.5px;">${bodyHtml}</div>
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

    /*
     * The bar under a set's name: thirteen boxes, one per rung a word can
     * climb, and the colour of each is the colour its bubbles wear on that
     * rung. It is the legend the shelf never had — the bubbles have always
     * been a ramp and nothing said so.
     *
     * Thirteen because that is how many rungs there are to climb: stage 0 is a
     * word nothing has happened to and stage 1 is one an error has taken back
     * to the floor, and neither is progress. The climbing starts at 2, so
     * segment one is stage 2 and segment thirteen is the top of the ramp.
     *
     * Two words decide what it shows, and they are the two ends of the set:
     *
     *   the best word colours middles — how far anything here has got;
     *   the worst word colours edges  — how far all of it has got.
     *
     * So a set fills in twice over, and a segment has three states it passes
     * through in order:
     *
     *   waiting  the thinnest pill, in the resting colour — see stepIdle;
     *   lit      a little taller, and in the colour of its stage;
     *   grown    taller again, and the tallest the row goes.
     *
     * Height is the whole of it, and that is the second attempt. The first
     * built the same three states out of a border and a fill — a thick
     * transparent edge that the colour later filled in — and it was wrong in
     * two ways at once. A transparent edge insets the strip sideways as well,
     * so the small state sat in a gap three pixels wider at each end than the
     * one the flex row gives, and a row of short dashes drifted apart. And a
     * background is painted under the border unless it is clipped, so the
     * small state was not small at all until background-clip was set — a fix
     * for a problem the design did not need to have.
     *
     * Nothing moves sideways now. Every segment is the full width of its
     * share of the row in all three states, the gaps between them are the
     * row's own, and what changes is how tall the strip is and whether its
     * ends are round.
     *
     * The gap between the passes is the spread of the set, which is worth
     * seeing and which one number for the whole set can never show.
     *
     * Counting: a word on stage s has climbed s - 1 rungs of the thirteen, so
     * stage 2 lights the first box and stage 14 lights the last. The ask said
     * s - 2, which leaves the top box dark on a set that is entirely mastered —
     * a bar that cannot be finished is a bar nobody trusts.
     */
    const SEGMENTS = 13;
    const FIRST_RUNG = 2;

    // Three states, three heights, and every one of them a pill: the radius
    // is always half the height, so what changes down the row is size and
    // nothing else. Four, six and eleven — the first step small enough to
    // read as the same thing lit, the second big enough to read as the thing
    // finished, and neither needs comparing to see, which is the whole job of
    // a bar read at a glance.
    const STEP_WAIT = 3.4;
    const STEP_LIT = 5.1;
    const STEP_TALL = 9.4;

    /*
     * The same colour with the light turned down a notch.
     *
     * A lit segment on the light theme is a pastel on a white card — 1.2 to
     * 2.4 against it — and a shape that pale has no edge of its own: thirteen
     * of them read as one soft smear rather than as thirteen things. A
     * hairline of the segment's own colour, taken a tenth darker, gives each
     * one a boundary without giving it a second colour.
     *
     * Multiplying all three channels by the same factor rather than mixing
     * towards black. It is the one operation that holds the hue: the channels
     * keep their ratios, so both the hue angle and the purity — the HSV kind,
     * (max - min) / max — come out where they went in. Measured across the
     * ramp the hue angle moves by at most a fifth of a degree, and that is
     * rounding to whole channel values, not the maths.
     *
     * The factor is read in gamma-encoded sRGB, which is where the hex sits,
     * so 0.88 is not 12% less light: light goes to about 0.88^2.2, three
     * quarters of what it was. That is the number to think in — a tenth off
     * the code, a quarter off the lamp — and it is why so small a factor is
     * enough to draw an edge.
     *
     * What it does not do is deepen the colour. Lab chroma drops by about a
     * tenth along with the lightness, so the hairline is the same hue, a
     * little darker and a hair less colourful. For a line half a pixel wide
     * that is invisible; it is written down because the obvious guess — that
     * darkening concentrates a colour — is the wrong way round here.
     */
    function shade(hex, by) {
        const n = parseInt(hex.slice(1), 16);
        const down = (v) => Math.round(v * by);

        return `rgb(${down((n >> 16) & 255)}, ${down((n >> 8) & 255)}, ${down(n & 255)})`;
    }

    function ladderOf(words) {
        const stages = (words || []).map(w => spacedRepetitions.getWordProgress(w).stage);
        const climbed = (stage) => Math.max(0, Math.min(SEGMENTS, stage - FIRST_RUNG + 1));

        if (stages.length === 0) return { lit: 0, grown: 0 };

        return {
            lit: climbed(Math.max(...stages)),
            grown: climbed(Math.min(...stages))
        };
    }

    // The language comes in rather than off the word: a bubble is tapped to hear
    // it, and what it is in is the set's answer now -- see store.label.
    function buildBubbleData(word, lang) {
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
            lang: lang
        };
    }

    // How every timeline status is drawn: a symbol from the sprite in <body> and its output size.
    // OK/LATE_OK and FAIL/LATE_FAIL look the same on purpose; MISSED is the same dark dot at half size.
    // The grid every symbol in the sprite is drawn on — see index.html, where
    // all four carry viewBox="0 0 10 10".
    const SPRITE_GRID = 10;

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
            /*
             * The viewBox is not decoration: without one the mark is clipped
             * the moment the app is shown at anything but its drawn size.
             *
             * A <use> of a <symbol> takes its viewport from the width and
             * height written here, and those are the layout's pixels. The box
             * the element actually occupies is those pixels through the app's
             * zoom — smaller — and the symbol, drawn at the unscaled size into
             * a smaller box, loses whatever hangs over the edge. An svg clips
             * to its viewport by default, so what you see is a dot with a
             * slice cut off it.
             *
             * With a viewBox the sprite's own ten-unit grid is mapped onto
             * whatever box the element ends up with, at any zoom.
             *
             * And `overflow: visible`, because an svg clips to its viewport by
             * default and this one is four pixels across sitting at whatever
             * fraction the row lands on — 207.69, 212.48, 217.28. The box is
             * clipped on the device's pixel grid while the circle inside is
             * scaled to the unrounded box, so the two disagree by a fraction
             * of a pixel and the clip takes that fraction out of the dot. On
             * a mark this size a fraction is a visible flat edge on something
             * that is meant to be round. Nothing here needs clipping: the mark
             * is a circle drawn to fill its box and never anything more.
             */
            dotsHtml += `<svg class="bubble-progress-dot" width="${icon.size}" height="${icon.size}" viewBox="0 0 ${SPRITE_GRID} ${SPRITE_GRID}" style="display: block; flex: none; overflow: visible;"><use href="#${icon.id}" /></svg>`;
        }

        // TEMP (debug): current stage number at the end of the timeline
        //dotsHtml += `<span class="bubble-stage-debug" style="margin-left: 2px; -font-weight: 800; color: ${textColor};">${stage}</span>`;

        // Optional timer badge in bottom-right corner
        const timerHtml = timer
            ? `<span class="bubble-timer-badge" style="position: absolute; bottom: -5px; right: -4px; background: ${palette.timerFill}; color: ${palette.onTimer}; font-size: 9.2px; font-weight: 800; line-height: 1; padding: 1.5px 3.8px; border-radius: 10.2px; box-shadow: 0 2px 3.4px rgba(0,0,0,0.18); z-index: 3; white-space: nowrap; outline: none; letter-spacing: -0.2px;">${timer}</span>`
            : '';

        const bubbleHtml = `
            <div class="word-bubble-card" style="${bubbleMotion(stage, timer, sad, order || 0)} background-color: ${bgColor}; border: none; border-radius: 12px; padding: 5.1px 8.5px; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-sizing: border-box; position: relative; user-select: none; cursor: pointer; flex: 0 1 auto; min-width: 41px; max-width: 100%;">
                <span class="bubble-word-text" style="font-weight: 800; font-size: 13.3px; line-height: 1.15; color: ${textColor}; word-break: break-word; overflow-wrap: anywhere; max-width: 100%; text-align: center; outline: none;">${word}</span>
                <div class="bubble-dots-group" style="font-size: 6px; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 1px; max-width: 100%; margin: 2.6px; line-height: 1;">
                    ${dotsHtml}
                </div>
                <span class="bubble-trans-text" style="font-size: 13.3px; font-weight: 600; line-height: 1.1; -margin-top: 2px; color: ${transColor}; word-break: break-word; overflow-wrap: anywhere; max-width: 100%; text-align: center; outline: none;">${translation}</span>
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
            if (speech.say(word, lang, shrink)) grow(bubble);
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
        // The draft rather than `editing`: it is exactly what the New Set button
        // made, and is gone again on save or cancel. Editing an existing set
        // opens the same form further down the list, and has nothing to do with
        // this button.
        const addingSet = !!draft;

        // Open, the button takes the form's own surface. The form is what the
        // press produced, and one surface across both is what says the button is
        // holding that form open rather than offering to open another.
        const addBg = addingSet ? palette.cardBg : 'transparent';

        /*
         * The header keeps no air of its own above it and the page's own measure
         * under it.
         *
         * It is the tallest thing on the screen -- the mark is 34.1 -- and air
         * on both sides of something that tall is a lot of nothing before the
         * first word of content. So nothing is added above: what stands there is
         * the page's 6.8, the same as on every game screen.
         *
         * And the same 6.8 below, because the row of buttons is what the eye
         * measures this band by. Inside the header they are centred -- 2.55 of
         * slack over and under them, the mark being taller than they are -- so
         * whatever stands outside the header is what decides whether they look
         * centred. At 10.2 below they had 9.35 of air above and 12.75 under,
         * which is a row of buttons sitting high in its own strip.
         */
        const header = $(container, `<div class="dict-header" style="position: sticky; top: 0; z-index: 6; margin: -6.8px -6.8px 0; padding: 6.8px; background: ${palette.pageBg}; box-shadow: 0 -2px 0 ${palette.pageBg}; display: flex; justify-content: space-between; align-items: center;">
            <h1 class="dict-title" style="margin: 0; display: flex; align-items: center; gap: 7.7px; color: ${palette.heading};">
                ${logoSvg(palette.logo, LOGO_SIZE)}
                <span class="dict-wordmark" style="display: block; line-height: 1.06;">
                    <span class="dict-wordmark-top" style="display: block; font-size: 15.4px; font-weight: 800; letter-spacing: 0.235em;">SPACED</span>
                    <span class="dict-wordmark-bottom" style="display: block; font-size: 12.4px; font-weight: 700; letter-spacing: 0.075em;">REPETITION</span>
                </span>
            </h1>
            <div class="dict-header-actions" style="display: flex; align-items: center; gap: 6.8px;">
                ${langsAsked ? `<button class="dict-add-set-btn" id="add-set-btn" style="flex: none; height: 29px; padding: 0 10.2px; background: ${addBg}; color: ${palette.softColor}; border: 1px solid ${palette.chromeBorder}; border-radius: 10.2px; font-family: inherit; font-weight: 600; font-size: 12.8px; cursor: pointer; transition: all 0.2s;" title="New card set">+ New set</button>` : ''}
                <button class="dict-settings-btn" id="settings-btn" style="display: inline-flex; align-items: center; justify-content: center; width: 29px; height: 29px; padding: 0; background: ${settingsOpen ? palette.cardBg : 'transparent'}; border: 1px solid ${palette.chromeBorder}; border-radius: 10.2px; cursor: pointer; color: ${palette.softColor}; transition: all 0.2s;" title="Settings">${GEAR}</button>
                <button class="dict-mute-btn" id="mute-btn" style="display: inline-flex; align-items: center; justify-content: center; width: 29px; height: 29px; padding: 0; background: transparent; border: 1px solid ${palette.chromeBorder}; border-radius: 10.2px; cursor: pointer; color: ${palette.softColor}; transition: all 0.2s;" title="${speech.muted() ? 'Sound off' : 'Sound on'}">${speech.muted() ? SPEAKER_OFF : SPEAKER}</button>
            </div>
        </div>`);

        /*
         * The sound, on and off.
         *
         * A redraw rather than a swapped icon: the header is drawn from what is
         * true, and the mute state is now part of that. Nothing else on the
         * screen changes shape, so the redraw is invisible.
         */
        const addSetBtn = header.querySelector('#add-set-btn');

        if (addSetBtn) addSetBtn.addEventListener('click', toggleNewSet);

        header.querySelector('#mute-btn').addEventListener('click', () => {
            speech.mute(!speech.muted());
            saveSetting('muted', speech.muted());
            render();
        });

        // The mark is a picture and nothing else now: no press, no state. The
        // one thing it does, it does on its own — see blinkLogo.
        startBlinking();

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
        //
        // Written here and attached further down, where the button it belongs to
        // is drawn: the button moved into the "My" section, and this is about the
        // header the app has rather than the one a section does.
        function toggleNewSet() {
            if (closing) return;

            if (addingSet) {
                closeNewSet();
                return;
            }

            const id = Date.now().toString();
            draft = {
                id: id,
                // Nameless on purpose: an empty box is what lets the placeholder example
                // show, and saving without a name falls back to NEW SET NAME
                title: '',
                words: []
            };
            editing.add(id);
            rememberForm(id, '');
            unfolding = 'set';
            render();
        }

        /*
         * The question has not been put yet, so it is the whole screen. Asked
         * once: what comes of it -- an answer or a shrug -- is written down, and
         * everything after that is the ordinary list.
         */
        if (!langsAsked) {
            askLanguages(container);

            if (settingsOpen) renderSettings(container, unfold === 'settings');

            return;
        }

        /*
         * One list, and the one it is of is yours.
         *
         * There were two sections here: what you had taken, and a shelf of what
         * there was to take. Three ideas -- a shelf, a flag that moved a set off
         * it, and two places a set could be -- for a reader who had not yet seen
         * a single word. The shelf is now the first screen instead: the pair of
         * questions is asked once, the sets it implies are made, and from then on
         * there is a list of sets that are all equally yours.
         */
        const list = $(container, `<div class="dict-sets-list" style="display: flex; flex-direction: column; gap: 12px; margin-top: 6.8px;"></div>`);

        // The form opens where the button that opened it stands -- at the top,
        // under the header -- above the sets it is about to join.
        if (draft) renderSetCard(list, draft, intro);

        /*
         * The answer about languages decides what is on the shelf, so it decides
         * what is on the screen: a set the app made for a pair that is no longer
         * the reader's is not shown.
         *
         * The pair, both halves of it. Checking only the language being learned
         * was enough until somebody changed their own language in the settings:
         * makeSets then built the same three sets against the new one -- the ids
         * carry both halves, so nothing was in the way -- and the old three went
         * on standing beside them. Six Spanish sets, three names printed twice,
         * and no way to tell from the list which was which.
         *
         * Hidden, not deleted. The set stays in the store with everything that
         * has been answered in it, and naming that pair again brings it back as
         * it was -- makeSets passes over an id that is already there. An answer
         * about languages that could destroy a month of repetitions is an answer
         * nobody could safely change.
         *
         * Only the made ones, told apart by their id -- see CATALOG_ID. A set
         * somebody wrote themselves belongs to them and not to an answer they
         * gave on a first screen, whatever language it turned out to be in.
         */
        const shown = sets.filter(set => !String(set.id).startsWith(CATALOG_ID)
            || (learnLangs.includes(set.originalLang) && set.translationLang === myLang));

        // The sample set is what the screen says when it has nothing else to
        // say -- see seed.js. Anything of the reader's own takes its place, and
        // it comes back if that is ever all there is again.
        const own = shown.filter(set => !isSample(set));

        recent(own.length ? own : shown).forEach(set => renderSetCard(list, set, intro));

        if (unfold === 'set') {
            const card = newSetCard();
            if (card) unfoldInto(card);
        }

        // Under everything the list drew, which is where an ask belongs: the
        // screen is for studying, and this is the app wanting something back.
        rateUs(container);

        // Last, so it is over everything this pass drew. Redrawn with the rest
        // of the screen — the theme button repaints the catalog under an open
        // panel — and it only rises into place when this pass is the one that
        // opened it.
        if (settingsOpen) renderSettings(container, unfold === 'settings');

        // The redraw emptied the container, and the hand was inside it. Put back
        // here rather than at the one entry the page calls, so that it comes back
        // from every way it can be taken away.
        showHint();
        offerColours(sets);

        /*
         * And the corner starts asking as soon as the hand over Flashcards stops
         * -- the first press on a game is what takes one down and sets the other
         * going.
         *
         * Not a third hint competing with the other two, which is why it is in
         * the corner and not on the shelf: it is the window's own furniture
         * saying what it does, and it can say that while a card is being
         * explained. It stops when somebody takes hold of it; see resizeGrip.
         */
        resizeGrip.call(!!session || !neverPlayed());
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
     * the content box, so padding alone would hold the card 27.3px tall with
     * nothing in it.
     *
     * Nothing fades. The card grows out of nothing and shrinks back into it,
     * which is one block changing shape — a fade would blank it for a moment
     * instead, and there is nothing underneath worth a glimpse of.
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
     * The air above the first card, which the list pays only while it holds one
     * -- see .dict-sets-list in app.css.
     *
     * It has to fold with the card, because the list stops paying it the instant
     * the card leaves: a fold that ends with the gap still there ends in a drop
     * of exactly that much.
     *
     * Folded on the list rather than cancelled from the card, which was tried
     * first and does nothing. A negative margin on the only item of a flex
     * column takes the item up, but the column's own height stops at nought --
     * so the list went on reserving its gap with an item of no height inside it.
     * The space belongs to the list, and the list is what has to give it up.
     *
     * Only for a card that is alone there, because only then does the list empty
     * when it goes. A card with siblings leaves that gap standing: it belongs to
     * whichever card is first, which after this one folds will be the next one.
     */
    function listLead(card) {
        const list = card.parentElement;
        if (!list || list.children.length !== 1) return null;
        if (!parseFloat(getComputedStyle(list).marginTop)) return null;

        return list;
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
     * The collapsed end of the fold: nothing at all, measured rather than
     * assumed.
     *
     * Everything that takes height has to be taken down, or the fold stops short
     * of the state the page is in once the card is gone and the difference is
     * paid in one frame. This card ended 10.3px above that state -- 8.5 of the
     * list's own gap above its first card, and 1.8 of the card's two border
     * lines -- and that was the step left at the end of every close and the
     * start of every open.
     *
     * The borders go to nought with the padding: a line is a line whatever the
     * box behind it measures, and two of them are the one thing a card of no
     * height still draws. The negative margin cancels the gap the list is
     * holding under this card, and the list's own gap above it folds with it --
     * see listLead -- so at that end the card takes nothing out of the column at
     * all.
     *
     * It used to fold down to the height of the "Continue" banner instead, which
     * is what the form grew out of while the banner left. There is no banner now
     * -- the game that was started is marked on its own tile -- so there is
     * nothing above the list for a card to be measured against.
     */
    function collapsed(card, gap, lead) {
        card.style.paddingTop = '0px';
        card.style.paddingBottom = '0px';
        card.style.borderTopWidth = '0px';
        card.style.borderBottomWidth = '0px';
        card.style.maxHeight = '0px';

        if (gap) card.style.marginBottom = `-${gap}px`;
        if (lead) lead.style.marginTop = '0px';
    }

    function unfoldInto(card) {
        const opened = card.scrollHeight;
        const gap = listGap(card);
        const lead = listLead(card);

        // Taken before they are overridden, and put back by value at the end.
        // The card's padding and border are written in its own style attribute,
        // so clearing the override does not uncover them — it uncovers nothing,
        // and the card would keep the flattened values it was animated through.
        // A border is worse than padding there: with no longhand and no rule to
        // fall back on, border-width is `medium`, which is three pixels.
        const padTop = getComputedStyle(card).paddingTop;
        const padBottom = getComputedStyle(card).paddingBottom;
        const lineTop = card.style.borderTopWidth || getComputedStyle(card).borderTopWidth;
        const lineBottom = card.style.borderBottomWidth || getComputedStyle(card).borderBottomWidth;

        card.style.overflow = 'hidden';
        collapsed(card, gap, lead);

        pin(card);

        if (lead) lead.style.transition = `margin-top ${FOLD_OPEN}ms ease-out`;

        card.style.transition = `max-height ${FOLD_OPEN}ms ease-out,`
            + ` padding ${FOLD_OPEN}ms ease-out, border-width ${FOLD_OPEN}ms ease-out,`
            + ` margin-bottom ${FOLD_OPEN}ms ease-out`;
        card.style.maxHeight = `${opened}px`;
        card.style.paddingTop = padTop;
        card.style.paddingBottom = padBottom;
        card.style.borderTopWidth = lineTop;
        card.style.borderBottomWidth = lineBottom;
        card.style.marginBottom = '';

        if (lead) lead.style.marginTop = '';

        setTimeout(() => {
            card.style.maxHeight = '';
            card.style.overflow = '';
            card.style.transition = '';

            if (lead) lead.style.transition = '';
        }, FOLD_OPEN + 40);
    }

    function foldAway(card, done) {
        const gap = listGap(card);
        const lead = listLead(card);

        card.style.overflow = 'hidden';
        card.style.maxHeight = `${card.scrollHeight}px`;

        pin(card);

        if (lead) lead.style.transition = `margin-top ${FOLD_SHUT}ms ease-in`;

        card.style.transition = `max-height ${FOLD_SHUT}ms ease-in,`
            + ` padding ${FOLD_SHUT}ms ease-in, border-width ${FOLD_SHUT}ms ease-in,`
            + ` margin-bottom ${FOLD_SHUT}ms ease-in`;
        collapsed(card, gap, lead);

        setTimeout(done, FOLD_SHUT);
    }

    // The card the New Set button opened, or null once it is gone.
    function newSetCard() {
        return draft ? container.querySelector(`.set-card[data-set-id="${draft.id}"]`) : null;
    }

    // Folds the form shut and then drops what was behind it. Without a card to
    // fold — nothing open, or the screen redrawn under us — it just does the
    // dropping, so the caller never has to know which case it is in.
    function closeNewSet() {
        const card = newSetCard();

        if (!card) {
            discardDraft();
            render();
            return;
        }

        closing = true;
        foldAway(card, () => {
            closing = false;
            discardDraft();
            render();
        });
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
     * what a 12.8px label needs — while the border carries the same warning at a
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
     * ends of is a list you cannot compare the ends of. Three fit across 256.1px
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
                ? `<span class="dict-interval-none" style="display: flex; align-items: center; justify-content: center; flex: 1; min-width: 0; height: 22.2px; box-sizing: border-box; border: 1px dashed ${palette.softBorder}; border-radius: 6.8px; font-size: 11.3px; font-weight: 700; color: ${palette.hint};">&mdash;</span>`
                : `<input class="dict-interval-input" type="text" spellcheck="false" data-stage="${stage}" value="${spanText(ms)}" aria-label="Stage ${stage}" style="flex: 1; min-width: 0; height: 22.2px; box-sizing: border-box; padding: 0 2.6px; background: ${palette.inputBg}; color: ${palette.inputText}; border: 1px solid ${palette.softBorder}; border-radius: 6.8px; font-family: inherit; font-size: 11.3px; font-weight: 700; line-height: 1; text-align: center; outline: none;">`;

            // min-width on the cell as well as on the field inside it: a grid
            // item is auto-sized to its content, and a text input's content is
            // whatever twenty characters come to — which pushed the first
            // column wide enough to squeeze the second out of the panel.
            return `<div class="dict-interval-row" style="display: flex; align-items: center; gap: 3.4px; min-width: 0;">
                <span class="dict-interval-stage" style="display: inline-flex; align-items: center; justify-content: center; flex: none; width: 20.5px; height: 22.2px; border-radius: 6.8px; background: ${fill}; color: ${ink}; font-size: 10.2px; font-weight: 700; line-height: 1;">${stage}</span>
                ${field}
            </div>`;
        }).join('');

        return `<div style="padding-top: 6.8px;">
            <div class="dict-intervals-hint" style="margin-bottom: 6.8px; font-size: 9.7px; font-weight: 600; line-height: 1.5; color: ${palette.hint};">How long a word waits on each stage before it comes up again. Minutes unless the number carries <b>h</b> or <b>d</b>.</div>
            <div class="dict-intervals-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5.1px;">${cells}</div>
            <div class="dict-intervals-foot" style="display: flex; justify-content: flex-end; margin-top: 6.8px;">
                <button class="dict-intervals-reset" style="padding: 4.3px 8.5px; background: transparent; border: 1px solid ${palette.softBorder}; border-radius: 8.5px; font-family: inherit; font-size: 11.3px; font-weight: 600; color: ${palette.softColor}; cursor: pointer;">Defaults</button>
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
            { icon: PUZZLE, name: 'Browser', note: 'You are here', here: true },
            { icon: DESKTOP, name: 'Web App', note: 'In progress' },
            { icon: HANDSET, name: 'Mobile', note: 'In progress' }
        ];

        const cells = spots.map(spot => `<div class="dict-where-cell" style="display: flex; flex-direction: column; align-items: center; gap: 4.3px; flex: 1; min-width: 0; box-sizing: border-box; padding: 7.7px 2px; border: 1px ${spot.here ? 'solid' : 'dashed'} ${palette.softBorder}; border-radius: 10.2px; background: ${spot.here ? palette.softBg : 'transparent'}; color: ${spot.here ? palette.title : palette.hint};">
                ${spot.icon}
                <span style="font-size: 10.2px; font-weight: 700; line-height: 1;">${spot.name}</span>
                <span style="font-size: 9.7px; font-weight: 600; line-height: 1.2; text-align: center; color: ${palette.hint};">${spot.note}</span>
            </div>`).join('');

        return `<div class="dict-where" style="display: flex; gap: 5.1px; margin-bottom: 8.5px;">${cells}</div>`;
    }

    /*
     * The two answers from the first screen, where they can be changed.
     *
     * Here and not on a screen of their own, because after the first run they
     * are settings in the ordinary sense: rarely touched, and touched on
     * purpose. The first screen asks them once because nothing can be built
     * without them; afterwards they are two rows among the rest.
     *
     * Adding a language writes its three sets, the same way the first screen
     * did, and brings back any that were written for it before. Removing one
     * takes them off the screen and leaves them in the store: they may have been
     * played, edited, half learned, and a list of languages is not a thing that
     * should be able to destroy that. Sets written by hand are untouched either
     * way -- they are nobody's answer to a question.
     */
    function languageRows() {
        const mine = shownMyLang();

        // The chevron goes a border plus a padding in from the right, the same
        // as the text on the left, and the padding on that side has to hold it.
        const edge = '9.5px';

        const field = `width: 100%; box-sizing: border-box; background: ${palette.softBg}; color: ${palette.softColor};`
            + ` border: 1px solid ${palette.softBorder}; border-radius: 10.2px; padding: 5.1px 27.3px 5.1px 8.5px;`
            + ` appearance: none; -webkit-appearance: none;`
            + ` font-family: inherit; font-size: 12.8px; font-weight: 600; cursor: pointer; outline: none;`;

        const caption = (text) => `<div style="font-size: 10.8px; font-weight: 700; letter-spacing: 0.04em; color: ${palette.hint}; margin: 0 0 3.4px; padding-left: 9.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${text}</div>`;

        const options = (label, skip, chosenTag) => `<option value="">${label}</option>`
            + CATALOG_CHOICES.concat(extra(mine))
                .filter(c => !skip.includes(c.tag))
                .map(c => `<option value="${c.tag}"${c.tag === chosenTag ? ' selected' : ''}>${c.name}</option>`)
                .join('');

        const chip = (tag) => `<span style="display: inline-flex; align-items: center; gap: 3.4px; padding: 2.6px 3.4px 2.6px 6.8px; background: ${palette.cardBg}; color: ${palette.dialogText}; border: 1px solid ${palette.cardBorder}; border-radius: 999px; font-size: 11.3px; font-weight: 600;">
                ${languageName(tag)}
                <button class="dict-lang-drop" data-tag="${tag}" title="Remove" style="display: inline-flex; align-items: center; justify-content: center; width: 13.7px; height: 13.7px; padding: 0; background: transparent; color: ${palette.hint}; border: none; font-family: inherit; font-size: 12px; line-height: 1; cursor: pointer;">×</button>
            </span>`;

        // The same line as the first screen, in the same order, because it is the
        // same question: somebody who answered it there and comes here to change
        // it should not have to work out where it went.
        // The same two rows as the first screen, in the same order and with the
        // same captions: somebody who answered there and comes here to change it
        // should recognise what they are looking at rather than work it out.
        // Side by side they fitted, but only by cutting "Languages to learn" in
        // a panel this narrow -- and the chips under the second one grow, which
        // in a row of two pushes its neighbour about.
        return `<div style="margin-top: 8.5px;">${caption('Your language')}</div>
                ${withChevron(`<select class="dict-my-lang" style="${field}">${options('Pick one', [], mine)}</select>`, edge)}

                <div style="margin-top: 8.5px;">${caption('Languages to learn')}</div>
                <div style="display: flex; flex-wrap: wrap; gap: 3.4px; margin-bottom: ${learnLangs.length ? '3.4px' : '0'};">${learnLangs.map(chip).join('')}</div>
                ${withChevron(`<select class="dict-learn-lang" style="${field}">${options('Add one', [mine].concat(learnLangs), null)}</select>`, edge)}`;
    }

    function renderSettings(parent, rising) {
        const anchor = container.querySelector('#settings-btn');

        const overlay = $(parent, `<div class="dict-settings-overlay" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); z-index: 100;">
            <div class="dict-settings-panel" style="position: absolute; box-sizing: border-box; width: 256.1px; background: ${palette.dialogBg}; color: ${palette.dialogText}; border: 1px solid ${palette.dialogBorder}; border-radius: 15.4px; padding: 13.7px; overflow-y: auto; box-shadow: 0 10.2px 23.9px rgba(0, 0, 0, 0.32);">
                <div class="dict-settings-head" style="display: flex; justify-content: space-between; align-items: center; gap: 10.2px; margin-bottom: 8.5px;">
                    <div class="dict-settings-title" style="font-size: 14.3px; font-weight: 700; color: ${palette.heading};">Settings</div>
                    <div style="display: flex; align-items: center; gap: 5.1px; flex: none;">
                        <button class="dict-theme-row" style="display: inline-flex; align-items: center; justify-content: center; width: 25.6px; height: 25.6px; flex: none; padding: 0; background: transparent; border: 1px solid ${palette.softBorder}; border-radius: 8.5px; cursor: pointer; color: ${palette.softColor};" title="${theme.isDark() ? 'Dark theme' : 'Light theme'}">${palette.themeIcon}</button>
                        <button class="dict-settings-close" style="display: inline-flex; align-items: center; justify-content: center; width: 25.6px; height: 25.6px; flex: none; padding: 0; background: transparent; border: 1px solid ${palette.softBorder}; border-radius: 8.5px; cursor: pointer; color: ${palette.softColor};" title="Close">${CROSS}</button>
                    </div>
                </div>
                ${platformStrip()}
                ${languageRows()}
                <button class="dict-advanced-line" aria-expanded="${advancedOpen}" style="display: flex; align-items: center; gap: 5.1px; width: 100%; box-sizing: border-box; margin-top: 3.4px; padding: 5.1px 2px; background: transparent; border: none; font-family: inherit; font-size: 10.2px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: ${palette.hint}; cursor: pointer;">
                    <span class="dict-advanced-chevron" style="display: block; flex: none; transform: rotate(${advancedOpen ? 90 : 0}deg); transition: transform 0.18s ease-out;">${CHEVRON_SMALL}</span>
                    <span>Advanced</span>
                    <span class="dict-advanced-rule" style="flex: 1; height: 1px; background: ${palette.softBorder};"></span>
                </button>
                <div class="dict-advanced-fold" style="overflow: hidden;"${advancedOpen ? '' : ' hidden'}>
                <div class="dict-advanced-body" style="padding-top: 6.8px;">
                <div class="dict-split-line" style="display: flex; align-items: center; gap: 6.8px;">
                    <button class="dict-split-row" style="display: flex; justify-content: space-between; align-items: center; gap: 10.2px; flex: 1; min-width: 0; box-sizing: border-box; padding: 6.8px 8.5px; background: ${palette.softBg}; border: 1px solid ${palette.softBorder}; border-radius: 10.2px; font-family: inherit; font-size: 12.8px; font-weight: 600; color: ${palette.softColor}; cursor: pointer;">
                        <span>Split words</span>
                        <span class="dict-split-state">${speech.splitsByLanguage() ? 'By language' : 'By spaces'}</span>
                    </button>
                    <button class="dict-split-help" aria-expanded="${splitHintOpen}" title="What this does" style="display: inline-flex; align-items: center; justify-content: center; width: 25.6px; height: 25.6px; flex: none; padding: 0; background: transparent; border: 1px solid ${palette.softBorder}; border-radius: 50%; font-family: inherit; font-size: 12.3px; font-weight: 700; line-height: 1; color: ${palette.softColor}; cursor: pointer;">?</button>
                </div>
                <div class="dict-split-hint" style="overflow: hidden;"${splitHintOpen ? '' : ' hidden'}>
                    <div style="padding-top: 6.8px; font-size: 9.7px; font-weight: 600; line-height: 1.5; color: ${palette.hint};">
                        <div>Where a word ends, when you tap one on a card.</div>
                        <div style="margin-top: 5.1px;"><b>By spaces</b> — letters between spaces and punctuation. A line written without spaces, as Japanese and Chinese are, comes out as one word.</div>
                        <div style="margin-top: 5.1px;"><b>By language</b> — worth trying for Japanese, Chinese and Thai, which are written in characters with no spaces between the words: the browser's own rules can find where one word ends inside such a line. Not every browser knows how, phones least of all — where that is missing, every character becomes a word of its own.</div>
                        <div style="margin-top: 6.8px;"><b>If this browser cannot do it</b>, put the spaces in yourself and they will work everywhere. Open the set for editing, copy everything out of the box, ask any AI tool to space the words apart, then paste the result back and save.</div>
                    </div>
                </div>
                <button class="dict-intervals-line" aria-expanded="${intervalsOpen}" style="display: flex; align-items: center; gap: 6.8px; width: 100%; box-sizing: border-box; margin-top: 6.8px; padding: 6.8px 8.5px; background: ${palette.softBg}; border: 1px solid ${palette.softBorder}; border-radius: 10.2px; font-family: inherit; font-size: 12.8px; font-weight: 600; color: ${palette.softColor}; cursor: pointer;">
                    <span class="dict-intervals-chevron" style="display: block; flex: none; transform: rotate(${intervalsOpen ? 90 : 0}deg); transition: transform 0.18s ease-out;">${CHEVRON}</span>
                    <span style="flex: 1; text-align: left;">Repetition intervals</span>
                </button>
                <div class="dict-intervals-fold" style="overflow: hidden;"${intervalsOpen ? '' : ' hidden'}>${intervalRows()}</div>
                <div class="dict-settings-body" style="margin-top: 12px;"></div>
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
        overlay.querySelector('.dict-my-lang').addEventListener('change', async (e) => {
            if (!e.target.value) return;

            myLang = e.target.value;
            learnLangs = learnLangs.filter(tag => tag !== myLang);

            await saveSetting('myLang', myLang);
            await saveSetting('learnLangs', learnLangs);
            await makeSets();

            render();
        });

        overlay.querySelector('.dict-learn-lang').addEventListener('change', async (e) => {
            if (!e.target.value) return;

            // The row above has been showing an inherited answer, and this is the
            // first moment anything depends on it. Written down now rather than
            // left standing: makeSets has nothing to read a set in without it,
            // and a screen that shows a language and then refuses to use it is
            // worse than one that never showed it.
            if (!myLang) {
                myLang = shownMyLang();

                if (myLang) await saveSetting('myLang', myLang);
            }

            learnLangs = learnLangs.concat(e.target.value);

            await saveSetting('learnLangs', learnLangs);
            await makeSets();

            render();
        });

        overlay.querySelectorAll('.dict-lang-drop').forEach(button => {
            button.addEventListener('click', async () => {
                learnLangs = learnLangs.filter(tag => tag !== button.dataset.tag);

                await saveSetting('learnLangs', learnLangs);

                render();
            });
        });

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
                <button class="dict-wipe-btn" style="padding: 6px 10.2px; background: transparent; color: ${palette.title}; border: 1px solid ${palette.accent}; border-radius: 10.2px; font-family: inherit; font-weight: 700; font-size: 12.8px; cursor: pointer;">Clear data</button>
                <p class="dict-wipe-note" style="margin: 6.8px 0 0; font-size: 11.3px; font-weight: 600; line-height: 1.4; color: ${palette.hint};">Removes every set and all progress kept on this device.</p>`;

            body.querySelector('.dict-wipe-btn').addEventListener('click', confirm);
        }

        function confirm() {
            body.innerHTML = `
                <p class="dict-wipe-note" style="margin: 0 0 8.5px; font-size: 11.3px; font-weight: 600; line-height: 1.4; color: ${palette.hint};">Every set and all progress will be gone, and there is no undo. The starting sets come back.</p>
                <div class="dict-wipe-actions" style="display: flex; gap: 6.8px;">
                    <button class="dict-wipe-confirm" style="padding: 6px 10.2px; background: ${palette.accent}; color: ${palette.onAccent}; border: none; border-radius: 10.2px; font-family: inherit; font-weight: 700; font-size: 12.8px; cursor: pointer;">Erase</button>
                    <button class="dict-wipe-cancel" style="padding: 6px 10.2px; background: ${palette.softBg}; color: ${palette.softColor}; border: 1px solid ${palette.softBorder}; border-radius: 10.2px; font-family: inherit; font-weight: 600; font-size: 12.8px; cursor: pointer;">Cancel</button>
                </div>`;

            body.querySelector('.dict-wipe-cancel').addEventListener('click', offer);
            body.querySelector('.dict-wipe-confirm').addEventListener('click', wipeEverything);
        }

        offer();
    }

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

    // The play mark's own colour. White, because the mark sits on four different
    // tiles and has to be one thing on all of them: coral was tried and is the
    // colour of the Flashcards tile, where it left the triangle showing as a
    // hole rather than a button.
    const PLAY_FILL = '#ffffff';

    /*
     * The games, as a phone draws an app: a coloured tile with nothing in it but
     * the picture, and the name underneath on the background.
     *
     * The name used to be inside the tile with the picture, which is what a
     * toolbar button looks like -- and it cost the picture most of its room,
     * because a 49.5px button holding two lines of anything leaves 20 for the
     * drawing. Out on the background the name costs the tile nothing, and the
     * drawing is half again bigger than the whole button used to be tall.
     *
     * The tile is narrower than the column it sits in, and the name may use the
     * whole of it. That is the arrangement on a home screen, and it is not
     * decoration: "Flashcards" is one word and cannot wrap out of trouble, so
     * what it needs is width the tile does not have to give.
     *
     * The corner radius is a third of the side, which is as round as this shape
     * gets while it is still a shape. A phone icon is a squircle and a
     * border-radius cannot draw one; what it can do is take the corner far
     * enough that the eye stops reading a square with its corners filed off, and
     * a third is where that happens. The next honest stop after it is a circle:
     * between the two the straight part of each side is too short to be a side
     * and too long to be an arc, and the tile reads as a circle somebody sat on.
     */
    /*
     * What the tile of an unfinished game shows instead of its own drawing.
     *
     * It used to be a banner over the whole list -- "Continue: Snake" with an
     * arrow -- which said what was unfinished but not where. The set it belonged
     * to was somewhere below, looking exactly like every other set, and the
     * banner took a row of the screen to say so. On the tile there is nothing to
     * look up: the game, the set and the way back in are one thing, in the place
     * the player would have pressed anyway.
     *
     * Then it was a mark laid over the drawing, which hid most of it and had to
     * pulse to be read as a mark rather than as part of it. Taking the drawing's
     * place instead costs nothing: the tile keeps its colour, and the two faces
     * take turns, so neither has to be visible through the other.
     *
     * The corners are rounded by the stroke rather than by the path. A polygon
     * stroked in its own colour with a round join grows by half the stroke and
     * rounds where it turns, so one set of three points draws both the shape and
     * its corners -- and the dark rim is the same path again underneath, drawn
     * fatter. Writing the curves into the path would be nine numbers where there
     * are three, and every one of them wrong after the first resize.
     */
    const PLAY_FACE = () => `<svg viewBox="0 0 24 24" width="41" height="41" aria-hidden="true" style="display: block;">
            <path d="M8.4 5.6 18.2 12 8.4 18.4z" fill="none" stroke="rgba(15, 23, 42, 0.5)" stroke-width="8.6" stroke-linejoin="round" />
            <path d="M8.4 5.6 18.2 12 8.4 18.4z" fill="${PLAY_FILL}" stroke="${PLAY_FILL}" stroke-width="5.4" stroke-linejoin="round" />
        </svg>`;

    const TILE = 57.6;
    const TILE_RADIUS = 19.2;
    const TILE_ICON = 32;

    /*
     * The games the row shows, and the games it does not.
     *
     * The row holds four tiles and the fourth is not a game, so the third game
     * was the last one that fitted; what the next one displaced is reached from
     * the dialog behind that fourth tile instead. Which is which is said in
     * registry.js, under `away`, and read here once — the split is a fact about
     * the shelf, not about either of the two places that draw a tile.
     */
    const SHELF = GAMES.filter(g => !g.away);
    const AWAY = GAMES.filter(g => g.away);

    // Whether a game was left unfinished on a set, which is a question about
    // both halves of it: the same game on another set is a game that was never
    // started. Asked of the tiles on the shelf and of the tiles in the dialog,
    // which is why it stands outside both.
    const openOn = (game, setId) => !!session && session.game === game.id
        && String(session.setId) === String(setId);


    /*
     * Empties every store and starts the app over.
     *
     * The data and nothing else: IndexedDB and localStorage. The offline copy —
     * the service worker and the shell it cached — is not data, it is the app,
     * and it used to go with them.
     *
     * The reason it did was that a cache-first worker serves whatever build it
     * installed, so the reload below came back on that build rather than on the
     * newest one. That was true and it was the smaller problem. The bigger one
     * is what the button left behind: a PWA with no shell, which is an app that
     * does not open at all until it is next online — and being asked to start
     * over is not a reason to lose the ability to open the thing.
     *
     * Nothing is lost by keeping it: the worker checks for a new build every
     * time the app comes back to the front and reloads the page under itself
     * when one lands — see web.js. The reset simply arrives on the build that
     * was already there.
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

        location.reload();
    }

    // Takes down whatever the New Set button opened. The set behind the form
    // exists only because the form needed something to edit, so closing without
    // saving leaves nothing worth keeping.
    //
    // Nothing is written to word_sets here, because nothing in it has changed:
    // the draft was never in the list. The form is a different matter -- it was
    // written down as it was typed, and this is the press that says to forget
    // it.
    function discardDraft() {
        if (!draft) return;

        editing.delete(draft.id);
        forgetForm(draft.id);
        draft = null;
    }

    /*
     * One of those tiles, with its name under it.
     *
     * The button is the pair rather than the tile: on a home screen the name is
     * part of what is pressed, and a name that only looks pressable is a strip
     * of dead pixels across the middle of a row of targets.
     *
     * The name is cut with an ellipsis rather than wrapped. Two lines under one
     * tile and one under the next would leave the row with tiles at two
     * different heights -- and a name long enough to need two lines is a name
     * nobody reads to the end anyway.
     *
     * An unfinished tile says "Continue" in time with its drawing becoming a
     * triangle: both halves of the tile answer the same question, so they change
     * together or the tile would be saying two things at once.
     *
     * Each face is a cell of the same one-cell grid rather than one box with
     * something absolute over it. The cell takes the size of the wider face, so
     * a name that fits and a "Continue" that does not cannot each be measured
     * against a different box -- and when there is nothing to alternate with,
     * one face in one cell lays out exactly as the plain span it replaces.
     */
    function tileBtn(cls, fill, icon, label, attrs, resuming) {
        const swap = resuming ? ' set-tile-swap' : '';

        const CUT = 'max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';

        return `<button class="${cls}" ${attrs} style="flex: 1; min-width: 0; padding: 0; background: none; border: none; font-family: inherit; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5.1px;">
            <span class="set-tile${swap}" style="display: grid; place-items: center; width: ${TILE}px; height: ${TILE}px; flex: none; background: ${fill}; color: #ffffff; border-radius: ${TILE_RADIUS}px; transition: background 0.2s;">
                <span class="set-tile-face" style="grid-area: 1 / 1; display: flex;">${icon}</span>
                ${resuming ? `<span class="set-tile-face set-tile-face-alt" style="grid-area: 1 / 1; display: flex;">${PLAY_FACE()}</span>` : ''}
            </span>
            <span class="set-tile-label${swap}" style="display: grid; justify-items: center; max-width: 100%; font-size: 11.3px; font-weight: 600; line-height: 1.2; color: ${palette.title};">
                <span class="set-tile-face" style="grid-area: 1 / 1; ${CUT}">${label}</span>
                ${resuming ? `<span class="set-tile-face set-tile-face-alt" style="grid-area: 1 / 1; ${CUT}">Continue</span>` : ''}
            </span>
        </button>`;
    }

    function renderSetCard(parent, set, intro) {
        const card = $(parent, `<div class="set-card" data-set-id="${set.id}" style="background: ${palette.cardBg}; border: 1px solid ${palette.cardBorder}; border-radius: 15.4px; padding: 13.7px;"></div>`);

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
            const SELECT_STYLE = selectStyle();

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
            const caption = (text, strong, indent) => `<div style="font-size: 10.8px; line-height: 17.1px; font-weight: ${strong ? 700 : 600}; color: ${strong ? palette.softColor : palette.hint}; padding-left: ${indent}px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${text}</div>`;

            const langPlate = (side) => `<select class="set-lang-select" data-side="${side}" style="${SELECT_STYLE}">${languageOptions()}</select>`;

            // The pair's captions say which half of the line each dropdown
            // answers for, in the same words the box uses for them: a line is a
            // word and a translation, and these are all of one and all of the
            // other. Set bold, unlike the captions on the rows below, because
            // these two speak for the whole set and those speak for one word.
            //
            // The indent is this dropdown's border plus its padding, which is
            // not the rows' -- their boxes are smaller. Written out rather than
            // typed as a number so the two cannot drift apart.
            const PLATE_INDENT = 1 + 8.5;

            /*
             * What the section is called, and what the dropdowns are doing
             * inside it.
             *
             * Standing in the open directly beneath a box of "word --
             * translation" lines, two language dropdowns read as the languages
             * of the translation -- something to be set before the words mean
             * anything. They set no such thing. The words are already in
             * whatever languages they were pasted in, and all these choose is
             * the voice that reads them aloud.
             *
             * So they went inside the section, and the section stopped being
             * called "Advanced". A name that only says "there is more here" asks
             * to be opened and then explains nothing; this one answers the
             * question the dropdowns were raising before they are even seen.
             *
             * There were rows under them once, one per word, each with the same
             * pair of dropdowns -- a set could be in several languages at a time
             * and every word had to be able to say which. A set is a pair of
             * languages now, so those rows answered a question that can no longer
             * be asked, and the two dropdowns here are the whole of the subject.
             */
            const LANG_SECTION = 'Text-to-speech language';

            /*
             * What goes in the box: what was typed into it, and the set itself
             * only if nothing was. Every way of opening a form remembers it
             * first, so the second half answers a case that should not arise --
             * it is here because a box has to be given something.
             *
             * Escaped, unlike the words this used to be built from. The text
             * came off a keyboard and goes back into markup, so a line with a
             * "<" in it would close the box and take the rest of the form with
             * it.
             */
            const form = openForms.get(set.id);
            const boxText = escapeText(form ? form.text : setAsText(set));

            const box = `<label class="set-edit-hint" style="display: block; font-size: 11.3px; font-weight: 600; color: ${palette.hint}; margin-bottom: 5.1px;">
                    A card set is just plain text, so you can edit it with any AI tool. First line — Title, then: "word -- translation" (a tab works too; clear text to delete)
                </label>
                <textarea class="set-edit-textarea" placeholder="NEW SET NAME&#10;word -- translation&#10;another word -- another translation" style="width: 100%; height: 98.2px; background: ${palette.inputBg}; color: ${palette.inputText}; border: 1px solid ${palette.softBorder}; border-radius: 10.2px; padding: 6.8px; font-family: inherit; font-size: 13.3px; box-sizing: border-box; resize: vertical; outline: none;">${boxText}</textarea>
                <div class="set-lang-area" style="margin-top: 6.8px;" hidden>
                    <div class="set-lang-fold">${foldingSection(LANG_SECTION, `<div class="set-lang-plates" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2.6px 6.8px; align-items: start;">
                            ${caption('Words', true, PLATE_INDENT)}
                            ${caption('Translations', true, PLATE_INDENT)}
                            ${langPlate('originalLang')}
                            ${langPlate('translationLang')}
                        </div>
                        <div style="font-size: 9.7px; font-weight: 600; line-height: 1.5; color: ${palette.hint}; margin-top: 8.5px;">
                            <div>${OWN_VOICE} voice installed</div>
                            <div>${BORROWED_VOICE} read by a related voice</div>
                            <div>${NO_VOICE} no voice at all</div>
                        </div>`, false)}</div>
                </div>`;

            // A set being written from scratch gets the box as the first section,
            // always open — it is the one thing always needed. The three routes
            // fold away underneath, where they are read once and then ignored by
            // anyone who already has a list.
            //
            // Editing an existing set shows none of it: the words are already
            // here, and the only reason the form is open is to change them.
            const guided = set === draft;

            const steps = r => `<ol class="set-fold-steps" style="margin: 0; padding-left: 35.9px; font-size: 11.3px; font-weight: 600; line-height: 1.45; color: ${palette.hint};">`
                + r.steps.map(s => `<li style="margin-bottom: 2.6px;">${stepBody(s)}</li>`).join('')
                + `</ol>`;

            // The routes are nested one level in: the folds are plain hidden
            // bodies, so a section inside a section needs nothing but the
            // indent that says which is which.
            const routes = `<div class="set-fold-nest" style="padding-left: 10.2px;">`
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
                <div class="set-edit-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6.8px;">
                    <span class="set-edit-title" style="font-size: 13.3px; font-weight: 700; color: ${palette.heading};">${guided ? 'New Set' : 'Edit Set'}</span>
                    <div class="set-edit-actions" style="display: flex; gap: 5.1px;">
                        <button class="set-save-btn" style="padding: 3.4px 8.5px; background: ${palette.accent}; color: ${palette.onAccent}; border: none; border-radius: 10.2px; font-weight: 600; font-size: 12.3px; cursor: pointer;">Save</button>
                        <button class="set-cancel-btn" style="padding: 3.4px 8.5px; background: ${palette.softBg}; color: ${palette.softColor}; border: 1px solid ${palette.softBorder}; border-radius: 10.2px; font-weight: 600; font-size: 12.3px; cursor: pointer;">Cancel</button>
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

            // The box is the one thing here that nothing else overhears: the
            // plates below are redrawn from its text, but the text itself is
            // only ever in the box.
            textarea.addEventListener('input', () => {
                if (!form) return;

                form.text = textarea.value;
                saveForms();
            });

            /*
             * What the person chose on each plate, until the form is closed:
             *
             *     null   nothing chosen — a side that has a language keeps it,
             *            a side that has none is named by the detector;
             *     'auto' chosen by hand — that side is named again from scratch,
             *            whatever it carried before;
             *     a tag  that side is in that language.
             *
             * Null and 'auto' differ, and the difference matters: opening the
             * form must not quietly re-guess what was already known, while
             * asking for Auto is exactly the request to re-guess it.
             */
            const choice = form ? form.choice : { originalLang: null, translationLang: null };

            /*
             * Puts the two choices onto a set and lets the detector fill in what
             * neither the person nor the set has answered.
             *
             * Given the set it is to write on rather than taking one: the plates
             * are refreshed against a throwaway built from the box, and Save
             * calls it on the real thing. One reader, so what the plate shows and
             * what Save writes cannot disagree.
             */
            function nameSet(target) {
                ['originalLang', 'translationLang'].forEach(field => {
                    if (choice[field] === 'auto') delete target[field];
                    else if (choice[field]) target[field] = choice[field];
                });

                if ((target.words || []).length) store.label(target);
            }

            /*
             * The plates follow the box. The words are read exactly as saving
             * would read them and named exactly as saving would name them — on a
             * throwaway set built from what readWords returns, never on the one
             * the app is holding — so what the plate shows is what Save will
             * write.
             */
            const plates = editForm.querySelectorAll('.set-lang-select');

            const langArea = editForm.querySelector('.set-lang-area');

            function refreshPlates() {
                const parsed = readWords(textarea.value, set);
                const words = parsed ? parsed.words : [];

                // An empty box has no languages to set. The controls arrive with
                // the first word and leave with the last one.
                langArea.hidden = !words.length;

                // What Save would write, worked out on something nobody is
                // holding: the set's own two languages are the starting point, so
                // a set that was named once is not re-guessed every keystroke.
                const probe = {
                    originalLang: set.originalLang,
                    translationLang: set.translationLang,
                    words: words
                };

                nameSet(probe);

                plates.forEach(plate => showLanguage(plate, probe[plate.dataset.side]));
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

                        refreshPlates();
                    }, { once: true });
                }

                plates.forEach(plate => plate.addEventListener('change', () => {
                    choice[plate.dataset.side] = plate.value;

                    refreshPlates();
                    saveForms();
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
                const keep = !!(parsed && parsed.words.length);

                if (keep) {
                    set.title = parsed.title;
                    set.words = parsed.words;

                    // The same naming the plates have been showing all along
                    nameSet(set);

                    // Writing a set in a language is saying you are learning it.
                    noteLearnLang(set.originalLang);

                    // And typing into the starter set makes it a set like any
                    // other, which is to say one that stays.
                    set.adopted = true;
                }

                /*
                 * No words, no set. An empty box has always meant delete, and a
                 * box with nothing but a title means the same: a name with
                 * nothing under it cannot be played, and the catalog would show
                 * it only to say that it is empty.
                 *
                 * For a draft the same rule is not a deletion but the absence of
                 * an addition: there is nothing of it in the list to remove.
                 */
                if (set === draft) {
                    if (keep) store.addSet(set);
                    draft = null;
                } else if (!keep) {
                    // The position is read here rather than at render time: this
                    // press can come long after the card was drawn, and a set
                    // saved from another form since then sits in front of it.
                    const index = store.sets().findIndex(s => s.id === set.id);
                    if (index !== -1) store.removeAt(index);
                }

                editing.delete(set.id);
                forgetForm(set.id);
                store.save();
                render();
            });

            editForm.querySelector('.set-cancel-btn').addEventListener('click', () => {
                // Cancel on a new set is the same closing as the button's, and
                // folds the same way. Cancel on an existing set only puts the
                // form away: the card stays where it is, so there is nothing to
                // fold.
                if (set === draft) {
                    closeNewSet();
                    return;
                }

                editing.delete(set.id);
                forgetForm(set.id);
                store.save();
                render();
            });

        } else {
            const totalWords = set.words.length;
            const progress = spacedRepetitions.calculateSetProgress(set.words);

            // Every card has the same one button: the words in it are yours,
            // whether you typed them or the first screen wrote them for you.
            const buttons = `<button class="set-edit-btn" title="Edit" style="display: inline-flex; align-items: center; justify-content: center; width: 27.3px; height: 27.3px; padding: 0; background: transparent; color: ${palette.softColor}; border: none; border-radius: 10.2px; cursor: pointer; transition: color 0.2s;">
                            <svg class="set-edit-svg" width="15.4" height="15.4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </button>`;

            // Which of the tiles on this card is the one that was left open.
            const unfinished = (game) => openOn(game, set.id);

            // Where the bar animates from: the progress this set had when the
            // running session started, kept in active_session rather than on the set.
            // Where the bar starts before it runs to `progress`: at nothing when
            // the catalog is opened, so the bars fill, and at the real value on
            // the redraws the screen does to itself.
            //
            // The number beside it is not animated. A bar sweeping to its length
            // reads as one motion; a digit counting up beside it reads as a
            // second, slower one, and the eye ends up watching the wrong one.
            const ladder = ladderOf(set.words);

            // The three states of one segment, and the style that draws any of
            // them. Shared by the markup below and by the timeout that runs
            // the bar up when the catalog opens, so there is one description
            // of what a segment looks like rather than two that must agree.
            const stepLook = (i) => {
                const height = i < ladder.grown ? STEP_TALL : (i < ladder.lit ? STEP_LIT : STEP_WAIT);
                const lit = i < ladder.lit;
                const colour = lit ? getStageColors(i + FIRST_RUNG).fill : palette.stepIdle;

                return {
                    colour,
                    edge: (lit && palette.stepEdge) ? shade(colour, palette.stepEdge) : '',
                    height,
                    radius: height / 2
                };
            };

            const waiting = { colour: palette.stepIdle, edge: '', height: STEP_WAIT, radius: STEP_WAIT / 2 };

            /*
             * Nothing here eases. A segment arrives at its state the moment
             * its turn comes, whole.
             *
             * Height cannot ease: four pixels to eleven is seven pixels of
             * change and a screen can only show it seven ways, so half a
             * second of it is a strip climbing a staircase. Colour could —
             * two hundred and fifty-six levels a channel is smooth enough —
             * and it was fading for a while, but a fade under a snap reads as
             * the segment arriving twice. The wave below is the animation;
             * each segment is one beat of it.
             */
            // The hairline is a shadow rather than a border: a border would eat
            // into a strip that is four pixels tall to begin with, and half a
            // pixel of one is not a thing the box model can hold. A spread
            // shadow sits outside the box, follows the rounding and costs the
            // layout nothing.
            const stepStyle = (look) => `flex: 1; height: ${look.height}px; border-radius: ${look.radius}px;`
                + ` background-color: ${look.colour};`
                + (look.edge ? ` box-shadow: 0 0 0 0.5px ${look.edge};` : '');

            // Drawn empty and coloured in a frame later, so the boxes light up
            // when the catalog opens rather than being found already lit. The
            // redraws the screen does to itself skip that and draw the end
            // state — see the timeout below.
            const grows = intro;

            $(card, `
                <div class="set-card-header" style="display: flex; gap:4.3px; justify-content: space-between; align-items: center; margin-bottom: 6.8px;">
                    <div class="set-title-group" style="display: flex; align-items: center; gap: 6.8px; min-width: 0;">
                        <h4 class="set-title" style="margin: 0; line-height:1.1; font-size: 15.4px; color: ${palette.title}; font-weight: 700; overflow: hidden; text-overflow: ellipsis;">${set.title}</h4>
                        <span class="set-progress-text" style="flex-shrink: 0; background: ${palette.progressPlate}; color: ${palette.barText}; font-size: 10.8px; font-weight: 800; padding: 2.6px 6.8px; border-radius: 999px; line-height: 1; display: ${progress === 0 ? 'none' : 'inline-block'};">${progress}%</span>
                    </div>
                    <div class="set-btn-group" style="display: flex; align-items: center; gap: 6.8px;">
                        ${buttons}
                    </div>
                </div>

                <div class="set-progress-bar" style="display: flex; align-items: center; gap: 3.4px; height: ${STEP_TALL}px; margin-bottom: 12px;">
                    ${Array.from({ length: SEGMENTS }, (_, i) => `<div class="set-progress-step"
                        style="${stepStyle(grows ? waiting : stepLook(i))}"></div>`).join('')}
                </div>

                <div class="set-words-bubbles" style="-padding-top: 6.8px; display: flex; flex-wrap: wrap; gap: 5.1px; justify-content: center;"></div>

                <div class="set-actions-group" style="display: flex; align-items: flex-start; gap: 6.8px; margin-top: 15.4px;">
                    ${SHELF.map(g => tileBtn('set-play-btn', g.color, g.icon(TILE_ICON), g.title, `data-game="${g.id}"`, unfinished(g))).join('')}
                    ${tileBtn('set-more-btn', MORE_FILL, chromeIcon(DOTS_BODY, TILE_ICON), 'More games', '', AWAY.some(unfinished))}
                </div>
            `);

            // Render bubbles into the container
            const bubblesContainer = card.querySelector('.set-words-bubbles');
            if (totalWords === 0) {
                $(bubblesContainer, `<p class="set-empty-msg" style="margin: 3.4px 0; color: #94a3b8; font-size: 13.3px; font-style: italic;">Set is empty</p>`);
            } else {
                set.words.forEach((w, order) => {
                    const bubbleData = buildBubbleData(w, set.originalLang);
                    createBubble(bubbleData, bubblesContainer, order);
                });
            }

            /*
             * The first frame lands as a row of waiting strips, and then the
             * real state runs in — one segment at a time, left to right.
             *
             * All thirteen at once was the first go, and thirteen strips
             * growing in lockstep reads as one block changing height: the row
             * is the thing that moves and the segments are not visible as
             * parts of it. Started one after another it is a wave running down
             * the ladder, which is both nicer to watch and truer — that is the
             * order a word climbs the rungs in.
             *
             * The step is short enough that the wave is one motion rather
             * than a queue: the segments snap 60ms apart, which is close to
             * the rate the eye stops counting at, and the whole run is over
             * in under a second.
             *
             * Every segment gets its turn, including the ones that have
             * nothing to change. The wave passes down the whole bar and simply
             * stops being visible where the colour runs out, which is what
             * makes the end of the colour look like the end of something
             * rather than like a bar that is half drawn.
             */
            const STEP_WAVE_MS = 60;

            if (grows) {
                card.querySelectorAll('.set-progress-step').forEach((step, i) => {
                    setTimeout(() => {
                        const look = stepLook(i);

                        step.style.backgroundColor = look.colour;
                        step.style.boxShadow = look.edge ? `0 0 0 0.5px ${look.edge}` : '';
                        step.style.height = `${look.height}px`;
                        step.style.borderRadius = `${look.radius}px`;
                    }, 150 + i * STEP_WAVE_MS);
                });
            }

            card.querySelectorAll('.set-play-btn').forEach(btn => {
                const game = SHELF.find(g => g.id === btn.dataset.game);

                // The marked tile goes back into the session rather than asking
                // for a new one: resume keeps the pool, the dots and the place
                // in it, and starting over would throw away the half that was
                // played. Everything else on the row is an ordinary start —
                // except a tile whose game is not written yet, which has nowhere
                // to go and opens the dialog that says so.
                btn.addEventListener('click', () => {
                    if (game.soon) moreSoon(set.id);
                    else if (unfinished(game)) nav.resume(game, set.id);
                    else launch(game, set.id);
                });
            });

            // The fourth button is not a game, it is the door to the ones that
            // are not on the row: MORE_FILL says what it is painted in, moreSoon
            // what is behind it. It wears the Continue face when one of those
            // was left unfinished, because the promise that face makes is that
            // the way back in is where the player would have pressed — and for a
            // game off the shelf, that is this button.
            card.querySelector('.set-more-btn').addEventListener('click', () => moreSoon(set.id));

            card.querySelector('.set-edit-btn').addEventListener('click', () => {
                editing.add(set.id);
                rememberForm(set.id, setAsText(set));
                render();
            });
        }
    }

    /*
     * The first press, pointed at.
     *
     * A set of words and a row of coloured buttons under it is not obviously a
     * thing to press — the words are what the eye goes to, and they can be
     * tapped to be heard, which is enough to look like the whole of it. So the
     * hand stands under the first game, from the moment the screen is drawn and
     * every time it is drawn again.
     *
     * Nothing is held back — not a wait, not a panel being open, not a form
     * being written. The hand belongs to the screen the way the buttons do, and
     * a hint that comes and goes by rules of its own is a hint that has to be
     * caught. It is behind the settings overlay while that is up, which is what
     * being behind it means, and clear again when it closes.
     *
     * What takes it down is the press it is asking for, and only that; the hand
     * arranges it itself, on whatever it is hung in — see pointingHand.
     *
     * What stops it for good is the question it is asked of: has anything ever
     * been answered. That is put to the words rather than kept as a flag, so it
     * answers itself — the first repetition ever recorded is the last time this
     * runs, and clearing the data brings it back, which is right, because the
     * screen after a reset is the screen a new player sees.
     */
    function neverPlayed() {
        return store.sets().every(set =>
            (set.words || []).every(w => !w.repetitions || w.repetitions.length === 0));
    }

    /*
     * The hand that offers to explain the colours, on the first set that has any
     * to explain.
     *
     * Once a word has been answered its bubble is a colour, and a colour with no
     * legend is a decoration. Before that there is nothing to explain — every
     * bubble is the same stone — so the hand waits for the first repetition
     * rather than greeting anyone with a lesson about a screen they have not
     * used.
     *
     * The first such set and no more. One hand is an offer; one per card is a
     * row of them down the side of the screen, all saying the same thing.
     *
     * Once, too. It goes when the dialog it opens has been closed, and does not
     * come back: an offer that is still being made after it has been taken is
     * not an offer, and this one would otherwise stand at the edge of the shelf
     * for as long as the app is used, sliding in again on every redraw.
     *
     * Never on a card that is being edited: that card is a form, the bubbles are
     * not on it, and the hand would be pointing at nothing while the player types.
     */
    function offerColours(sets) {
        if (coloursRead) return askingHand.clear();

        const shelf = sets.find(set => !editing.has(set.id)
            && (set.words || []).some(w => w.repetitions && w.repetitions.length > 0));

        if (!shelf) return askingHand.clear();

        askingHand.at(container.querySelector(`.set-card[data-set-id="${shelf.id}"]`), explainColours);
    }

    function showHint() {
        // A session that exists is a game that was started, whether or not it was
        // answered: someone who opened a game and came straight back has been
        // where the hand was pointing, and does not need telling again.
        if (session || !neverPlayed()) return;

        pointingHand.at(container.querySelector('.set-play-btn[data-game="cards"]'));
    }

    /*
     * Where a star leads: the store for four and five, a form of ours for one,
     * two and three.
     *
     * The two kinds of reader do not turn up in the same numbers. Somebody the
     * app suits has no reason to go anywhere and say so; somebody it has failed
     * has every reason, and a listing left to itself fills with the second kind
     * until that is what the app looks like from outside. The stars are the ask
     * the first kind never gets, and the form is somewhere for the second to be
     * answered instead of filed under a rating nobody can reply to.
     *
     * Nothing is sent from here, down either road. A star is a link: pressing
     * one opens a page, and whatever is written there is written by hand on
     * somebody else's site. This app cannot tell that a star was ever pressed,
     * which is what the store listing says about every other part of it.
     */
    const STORE_REVIEWS = 'https://chromewebstore.google.com/detail/spaced-repetition-app/lpklkkakejhmfbckgonadkbcdpdfohfj/reviews';

    const FEEDBACK_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSdMptJ_BiatwliYh3gywHBYcuviZH3s8M-QZZdK4CP9caojVA/viewform';

    /*
     * The stars themselves, and the one build that gets them.
     *
     * Only the extension. It is an extension the page behind the stars rates,
     * and the other two readers of this same screen -- the site, and this folder
     * opened from disk -- may never have installed one: for them the stars lead
     * to a page that has nothing to do with what they are looking at.
     *
     * Asked as "is this the extension", which is the opposite of how the rest of
     * the app asks it. base.js asks "is this the web" on purpose, so that a
     * folder opened by double-clicking still works; here the extension is
     * genuinely the one case meant, and a folder on disk is one of the two that
     * are not.
     *
     * The stars run backwards in the markup -- five first -- and the row is
     * turned round again in the CSS, because lighting them up to the cursor
     * means lighting the ones to its left and CSS can only reach siblings that
     * follow. See .dict-rate-star in app.css.
     */
    function rateUs(parent) {
        if (location.protocol !== 'chrome-extension:') return;

        // Drawn filled rather than outlined: at 17px an outlined star is four
        // hairlines around a hole, and what it reads as is a smudge.
        const star = `<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" style="display: block; fill: currentColor;">
            <path d="M12 2.4 14.16 9.03 21.13 9.03 15.49 13.13 17.64 19.77 12 15.67 6.36 19.77 8.51 13.13 2.87 9.03 9.84 9.03Z" />
        </svg>`;

        const starLink = (stars) => `<a class="dict-rate-star" href="${stars > 3 ? STORE_REVIEWS : FEEDBACK_FORM}" target="_blank" rel="noopener noreferrer" title="${stars} out of 5" aria-label="Rate this app ${stars} out of 5" style="display: block;">${star}</a>`;

        // Air above it and no rule across the page. A line there is read as the
        // end of the list -- it is the only full-width line on the screen -- and
        // what stands under it is two words and five stars, which is not a second
        // half of anything.
        $(parent, `<div class="dict-rate" style="--star-idle: ${palette.softBorder}; display: flex; align-items: center; justify-content: center; gap: 8.5px; margin: 20.4px 0 15.3px;">
            <span style="font-size: 12.8px; font-weight: 600; color: ${palette.hint};">Rate us</span>
            <div style="display: flex; flex-direction: row-reverse; gap: 2.6px;">${[5, 4, 3, 2, 1].map(starLink).join('')}</div>
        </div>`);
    }

    catalog.render = () => {
        introduce = true;
        render();
    };

    /*
     * The one errand migrate.js leaves behind: build the sets for languages it
     * guessed.
     *
     * Called after store.load() and never before it. makeSets writes what the
     * store holds in memory back to storage, and before the load that is the
     * seed -- it would save the starting set over the reader's own.
     */
    catalog.fillGuessedLangs = async () => {
        if (!langsGuessed) return;

        langsGuessed = false;

        await makeSets();
        await saveSetting('langsGuessed', false);
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

            /*
             * The floor the My stuff band is painted in -- see the band itself,
             * where what it is for and why it is sunk rather than lifted live.
             *
             * The two themes answer differently because black does. Three tenths
             * of it over the navy page is a deeper navy; over warm paper the same
             * veil is a grey-brown, which is both the wrong colour and twice the
             * weight -- 2.06 against the page where the dark band is 1.16.
             *
             * The light theme takes the fourth step of its own cream ladder
             * instead, the one the borders are drawn in. Card, page, chips,
             * borders: the band is the step below the page, which puts it 4.5 of
             * L* under it against the dark band's 5.9 -- the nearest thing to the
             * same depth that is already a colour here.
             */
            bandBg: isDark ? sunk(t.ground, 0.3) : t.border,

            // The page's own colour, which the sticky Explore heading wears so
            // that what scrolls under it is covered rather than shown through.
            pageBg: t.ground,

            // The outline of the three header buttons, which stand on the page
            // and not on a card — see tokens, where the colour and the reason
            // for it live, and the games, which outline their own two the same.
            chromeBorder: t.chrome,
            cardBg: t.surface,
            cardBorder: t.border,
            hint: t.muted,
            inputBg: t.soft,
            inputText: t.ink,
            barBg: t.soft,

            /*
             * What a segment of the ladder is before anything has happened to
             * it, and the two themes answer differently.
             *
             * On the light theme it is stage 0's own colour — the stone a
             * bubble wears when nothing has happened to it either. The bar is
             * a legend for the shelf, and its resting state saying the same
             * thing as a resting bubble is the whole idea; the warm neutral it
             * used is the colour of chips and tracks, which on paper reads as
             * part of the page rather than as the bottom of a scale.
             *
             * On the dark theme that stone is near-white and a row of it would
             * be the brightest thing on the card — an empty bar shouting. The
             * dark theme keeps the quiet one it had.
             */
            stepIdle: isDark ? t.soft : stageRamp[0].fill,

            /*
             * The plate the percentage sits on beside a set's name. On the
             * light theme it is the page's own colour, so the plate reads as
             * a hole cut in the card rather than as another chip laid on it.
             *
             * It used to be `soft`, the colour of chips and tracks — one step
             * below the page and a shade warmer. Close enough to the page to
             * look like it was meant to be the page and missed by a hair,
             * which is the worst thing a neutral can do.
             *
             * The dark theme keeps `soft`: there it is a step up from the
             * card rather than a tint of it, and it reads as a plate on the
             * card instead of a hole through it.
             */
            progressPlate: isDark ? t.soft : t.ground,

            /*
             * How much darker a lit segment's hairline is than the segment,
             * and zero for no hairline at all — see shade. At 0.78 the edge
             * keeps 57% of the light of its own fill and stands 1.65 against
             * it, which is a line you see without looking for it; the first
             * try at 0.88 was 75% and 1.30, and that is a line you find only
             * once you know it is there.
             *
             * Only the light theme has one. On the dark theme a pastel on the
             * card is 4.6 to 8.8 and already an object; ringing it would be
             * outlining something that is not in any danger of being missed.
             */
            stepEdge: isDark ? 0 : 0.78,


            // The timer badge is the same colour family as the bar, taken deep
            // enough to carry white text: the bar has nothing written on it and
            // can stay light, a 8.5px badge cannot.
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

    /*
     * A colour sunk towards black by the given amount, which is the colour a
     * veil of black at that strength composites to over it.
     *
     * The My stuff band was that veil -- three tenths of black over the page --
     * and a veil cannot be worn by a heading that has to cover what slides under
     * it. Mixing it down to one opaque value changes nothing on the screen (the
     * composite is the same number the browser was producing) and makes the band
     * a colour that can be painted on something else.
     */
    function sunk(hex, amount) {
        const n = parseInt(hex.slice(1), 16);
        const keep = 1 - amount;
        const part = (shift) => Math.round(((n >> shift) & 255) * keep).toString(16).padStart(2, '0');

        return `#${part(16)}${part(8)}${part(0)}`;
    }

    catalog.setSession = (value) => { session = value; };
    catalog.setColoursRead = (value) => { coloursRead = value; };

    /*
     * A language the app no longer offers is read back as no choice at all.
     *
     * What is stored was picked from a list, and the list is the table's: a tag
     * that is not in it now is one nothing can be built from, and a stored answer
     * that cannot be honoured is worse than no answer, which at least asks again.
     */
    const chosen = (tag) => (vocab.has(tag) ? tag : null);

    catalog.setLangs = (value) => {
        myLang = chosen(value && value.myLang);
        learnLangs = ((value && value.learnLangs) || []).filter(tag => vocab.has(tag) && tag !== myLang);
        langsAsked = !!(value && value.langsAsked);
        langsGuessed = !!(value && value.langsGuessed);

        // The guess goes in before the screen is drawn, so the dropdown opens
        // with an answer in it rather than filling itself in as it appears.
        picking = { mine: systemLang(), learn: [] };
    };

    /*
     * The forms that were open when this screen was last looked at.
     *
     * Authoritative, which is why editing and the draft are emptied first: what
     * is handed in is what is open. It runs again every time the catalog comes
     * back from a game, and what it reads is the record every change wrote to,
     * so there is nothing of its own to carry across the call.
     */
    catalog.setOpenForms = (list) => {
        editing.clear();
        openForms.clear();
        draft = null;

        (list || []).forEach(entry => {
            // A form whose set is gone has nothing left to edit: deleted from
            // another form, or taken by "Clear data" along with everything else.
            if (!entry.isDraft && !store.sets().some(s => s.id === entry.id)) return;

            // Rebuilt rather than kept: the draft is a set-shaped thing for the
            // form to write into, and all of it that outlives a window is its id
            // and the text, which is in the record beside it.
            if (entry.isDraft) draft = { id: entry.id, title: '', words: [] };

            editing.add(entry.id);
            openForms.set(entry.id, {
                text: entry.text || '',
                choice: entry.choice || { originalLang: null, translationLang: null }
            });
        });
    };

    /*
     * Which sets came off the shelf rather than out of somebody's own typing.
     *
     * Read off the id, which the catalogue builds out of the pair and the level
     * -- vocab-es-ru-beginner -- rather than kept as a field on the set. A field
     * would have to be written when the set is taken, read back when it is
     * loaded, and defended against every set that was saved before it existed;
     * the id is already there, already unique, and already says where the thing
     * came from.
     */
    const CATALOG_ID = 'vocab-';

    /*
     * The set the app ships with, told apart the same way: by the id seed.js
     * gives it.
     *
     * It used to carry a field saying so, and that field is exactly the failure
     * the paragraph above warns about. It was added after there were already
     * saved databases without it, and in every one of them the starter set
     * stopped being recognised and stood in the list forever, beside sets in
     * languages its reader had actually asked for. An id cannot be missing.
     *
     * Typing into it makes it a set like any other, and that is written down
     * rather than taken away -- a mark whose absence means "still the sample" is
     * a mark that cannot go missing either.
     */
    const SAMPLE_ID = '1';

    const isSample = (set) => String(set.id) === SAMPLE_ID && !set.adopted;

    /*
     * The order of the list: whatever happened last is on top.
     *
     * For a set that has been answered in, that is its last answer, read off the
     * repetitions rather than kept as a field. A set's last play is the last
     * answer in it, and that is already written on the words -- a date beside it
     * would be a second copy of the same fact, to be kept in step by somebody
     * remembering to.
     *
     * For a set nobody has answered in yet, it is the moment it was added, which
     * store.addSet writes on it. It used to be neither, and then a set somebody
     * had just typed stood below every set they had ever played: nothing had
     * happened in it, so it sorted with everything else nothing had happened in
     * -- at the bottom, while the only reason it existed was that they had made
     * it a minute ago.
     *
     * And a game that is running is a third thing that can have happened to a
     * set. It happened when that game was started: a set opened and left without
     * a single answer is still the one being played, and coming back to the
     * catalogue to find it third from the top would be the screen arguing with
     * what just happened.
     *
     * When it was started, and not "now", which is what it was and what made the
     * date above useless. Reckoned as now, the set with a game open on it was
     * dated afresh on every drawing of the screen, so nothing could ever come
     * above it -- and a session lives until its game is played out, which means
     * one round abandoned a week ago held the top of the list for a week, and a
     * set made a minute ago arrived underneath it.
     *
     * Sets older than that date have none -- see store.addSet -- and sort by
     * their answers alone, which is the order their readers already see. The
     * order the store holds them in is the last tie-breaker, and that is what
     * keeps the three sets a language brings in the order they were built:
     * makeSets adds them backwards so that Beginner comes out on top, and two
     * sets written in the same millisecond have nothing else to tell them apart.
     */
    function recent(sets) {
        const lastAnswer = (set) => (set.words || []).reduce((latest, word) => {
            const reps = word.repetitions || [];
            const last = reps.length ? reps[reps.length - 1].timestamp : 0;

            return Math.max(latest, last || 0);
        }, 0);

        const open = session && session.setId;

        return sets
            .map((set, order) => ({
                set: set,
                order: order,
                touched: Math.max(
                    lastAnswer(set),
                    set.createdAt || 0,
                    String(set.id) === String(open) ? session.startedAt : 0
                )
            }))
            .sort((a, b) => (b.touched - a.touched) || (a.order - b.order))
            .map(row => row.set);
    }

    /*
     * The sets the two answers imply: three levels for every language being
     * learned, read in the language the reader already has.
     *
     * Made once and then owned. They are ordinary sets from the moment they are
     * written -- editable, deletable, no different from one typed by hand --
     * which is the whole point of asking the questions first: there is no shelf
     * to visit and nothing to take off it.
     *
     * A set that is already there is left alone. The questions can be answered
     * again in the settings, and answering them again must not undo whatever has
     * been learned in the meantime.
     */
    function makeSets() {
        // Nothing to read a set in. Somebody who skipped the question can still
        // name a language they are learning, and the sets for it are written
        // when the other half of the pair arrives.
        if (!myLang) return Promise.resolve();

        const made = [];

        learnLangs.forEach(learn => {
            vocab.sets(learn, myLang).forEach(level => {
                const id = `${CATALOG_ID}${learn}-${myLang}-${level.level.toLowerCase()}`;

                if (store.sets().some(saved => saved.id === id)) return;

                made.push({
                    id: id,
                    title: `${languageName(learn)} · ${level.level}`,
                    originalLang: learn,
                    translationLang: myLang,
                    words: level.words
                });
            });
        });

        // Backwards into a store that puts each new set at the front, so what
        // comes out is the order they were built in: the first language first,
        // and inside it the first level first. Added forwards, a reader opening
        // the app for the first time would meet Advanced.
        made.reverse().forEach(set => store.addSet(set));

        return store.save();
    }

    /*
     * A language met for the first time joins the list in the settings.
     *
     * Somebody who writes a set in Greek is learning Greek, whatever they
     * answered on the first screen, and the settings are meant to say what they
     * are learning. Nothing is made for it -- the set they just wrote is what
     * they wanted -- so this only widens the answer.
     */
    function noteLearnLang(tag) {
        if (!tag || tag === myLang || learnLangs.includes(tag)) return null;

        learnLangs = learnLangs.concat(tag);

        return saveSetting('learnLangs', learnLangs);
    }

    /*
     * The language the browser says the reader has.
     *
     * Asked of navigator.languages rather than of one locale: a browser carries
     * the whole preference list, and the first entry is often the interface's
     * language rather than the person's -- an English Chrome on a Russian
     * machine lists en first and ru second. Both are taken in order, and the
     * first one this app can do anything with wins.
     *
     * Region is cut off. "en-GB" and "en-US" are the same column here, and a
     * table of thirty words a side has nothing to say about the difference.
     *
     * A guess, and it is pre-filled rather than accepted: it stands in the
     * dropdown where it can be seen and changed with one press, which is what a
     * guess has earned. Nothing is built until Start.
     */
    function systemLang() {
        const wanted = (navigator.languages || [navigator.language || ''])
            .map(tag => String(tag).split('-')[0].toLowerCase())
            .filter(Boolean);

        return wanted.find(tag => vocab.has(tag))
            || wanted.find(tag => languageName(tag) !== tag)
            || null;
    }

    /*
     * The list of languages, plus the reader's own if the table has never heard
     * of it.
     *
     * A list that cannot name the language somebody actually speaks is a list
     * that calls them wrong, so it is added and it is chosen. What it cannot do
     * is make sets: those are built out of two columns of the table, and one of
     * the two would be missing. Nothing is then written, the app opens on the
     * set it ships with, and the answer is kept for the day the column exists.
     */
    const extra = (tag) => (tag && !vocab.has(tag) && languageName(tag) !== tag)
        ? [{ tag: tag, name: languageName(tag) }]
        : [];

    /*
     * Whether the languages were read off somebody's old sets instead of being
     * answered -- see migrate.js, which is the only thing that ever sets it.
     *
     * It means one job is outstanding: the ready-made sets for those languages
     * have not been built. Done once, by fillGuessedLangs, which takes the note
     * down in the same breath. It cannot be done on every draw instead: that
     * would put back the three sets of anybody who had deleted them.
     */
    let langsGuessed = false;

    // What the first screen has been told so far, which is not the answer until
    // the button at the bottom is pressed.
    let picking = { mine: null, learn: [] };

    /*
     * The reader's language as a row has to show it: the saved answer if there
     * is one, and otherwise whatever the first screen was standing on.
     *
     * Inherited rather than guessed a second time. The first screen opens with
     * the browser's language already in the dropdown and the reader may have
     * changed it -- somebody who named their language there and pressed Skip
     * because they had nothing to add to the second question has answered this
     * half, and a settings row that opens on "Pick one" tells them it was not
     * heard. Both cases are one expression because picking.mine starts out as
     * the guess: a reader who cleared it meant to, and gets no guess back.
     */
    const shownMyLang = () => myLang || picking.mine;

    /*
     * The first screen: two dropdowns on one line, and nothing else to read.
     *
     * It had a heading and a paragraph explaining what a set is made of. Both
     * were true and neither was needed -- the two captions say the same thing in
     * four words, and a screen that explains itself before showing itself is a
     * screen somebody has to get past.
     *
     * One under the other, because the second one grows. A chosen language turns
     * into a chip under its dropdown, and a column that gets taller as it is
     * answered drags its neighbour's dropdown around with it; stacked, the chips
     * push down what is already below them and nothing moves sideways.
     *
     * The second dropdown empties itself into a row of chips rather than being a
     * list of checkboxes. Forty-nine checkboxes is a screen nobody reads to the
     * end; a chip is the answer already given, and the × on it is the only other
     * thing that can be done with it.
     */
    function askLanguages(parent) {
        const ready = !!picking.mine && picking.learn.length > 0;

        const options = (label, skip, chosenTag) => `<option value="">${label}</option>`
            + CATALOG_CHOICES.concat(extra(picking.mine))
                .filter(c => !skip.includes(c.tag))
                .map(c => `<option value="${c.tag}"${c.tag === chosenTag ? ' selected' : ''}>${c.name}</option>`)
                .join('');

        const field = `width: 100%; box-sizing: border-box; background: ${palette.softBg}; color: ${palette.softColor};`
            + ` border: 1px solid ${palette.softBorder}; border-radius: 10.2px; padding: 10.2px 27.3px 10.2px 10.2px;`
            + ` appearance: none; -webkit-appearance: none;`
            + ` font-family: inherit; font-size: 13.3px; font-weight: 600; cursor: pointer; outline: none;`;

        /*
         * Where the writing in this column starts, and the same number for
         * everything in it.
         *
         * A select puts its text a border plus a padding in from its own box; a
         * caption and a bare button have no border and are given the sum by
         * hand. Carried as one value because it was three: the captions sat on
         * 9.5 from when the fields had a smaller padding, the fields moved to
         * 10.2 and the captions did not, and Skip had a padding chosen for the
         * press rather than for the edge -- three left edges inside four pixels
         * of each other, which is the kind of ragged a reader feels without
         * being able to say what is wrong.
         */
        const textEdge = '11.2px';

        const caption = (text) => `<div style="font-size: 12.8px; font-weight: 700; letter-spacing: 0.04em; color: ${palette.hint}; margin: 0 0 6.8px; padding-left: ${textEdge}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${text}</div>`;

        const chip = (tag) => `<span class="dict-start-chip" data-tag="${tag}" style="display: inline-flex; align-items: center; gap: 5.1px; padding: 5.1px 6.8px 5.1px 10.2px; background: ${palette.cardBg}; color: ${palette.title}; border: 1px solid ${palette.cardBorder}; border-radius: 999px; font-size: 12.3px; font-weight: 600;">
                ${languageName(tag)}
                <button class="dict-start-drop" data-tag="${tag}" title="Remove" style="display: inline-flex; align-items: center; justify-content: center; width: 15.4px; height: 15.4px; padding: 0; background: transparent; color: ${palette.hint}; border: none; border-radius: 999px; font-family: inherit; font-size: 13.3px; line-height: 1; cursor: pointer;">×</button>
            </span>`;

        /*
         * The same air on all four sides, so the screen is a block sitting in
         * the window rather than something hanging off the top of it.
         *
         * The sides are wide on purpose. Two fields stretched to the window's
         * edges, one over the other, with a coloured button under them, is the
         * shape of a login form -- and being asked to log in before being shown
         * anything is the one thing this screen must not look like. Pulled in,
         * the same two fields read as a question with room around it.
         */
        const panel = $(parent, `<div class="dict-start" style="margin-top: 27.3px; padding: 0 27.3px 27.3px;">
            ${caption('Your language')}
            ${withChevron(`<select class="dict-start-mine" style="${field}">${options('Pick one', [], picking.mine)}</select>`, textEdge)}

            <div style="margin-top: 27.3px;">${caption('Languages to learn')}</div>
            <div class="dict-start-chips" style="display: flex; flex-wrap: wrap; gap: 6.8px; margin-bottom: ${picking.learn.length ? '6.8px' : '0'};">${picking.learn.map(chip).join('')}</div>
            ${withChevron(`<select class="dict-start-learn" style="${field}">${options('Add one', [picking.mine].concat(picking.learn), null)}</select>`, textEdge)}

            <div style="display: flex; align-items: center; gap: 6.8px; margin-top: 34.1px;">
                <button class="dict-start-skip" style="flex: none; padding: 11.9px ${textEdge}; background: transparent; color: ${palette.hint}; border: none; font-family: inherit; font-size: 12.8px; font-weight: 700; cursor: pointer;">Skip</button>
                <button class="dict-start-go" ${ready ? '' : 'disabled'} style="flex: 1; padding: 11.9px; background: ${palette.accent}; color: ${palette.onAccent}; border: none; border-radius: 999px; font-family: inherit; font-size: 13.3px; font-weight: 700; opacity: ${ready ? 1 : 0.4}; cursor: ${ready ? 'pointer' : 'default'};">Start</button>
            </div>
        </div>`);

        panel.querySelector('.dict-start-mine').addEventListener('change', (e) => {
            picking = { mine: e.target.value || null, learn: picking.learn.filter(t => t !== e.target.value) };
            render();
        });

        panel.querySelector('.dict-start-learn').addEventListener('change', (e) => {
            if (!e.target.value) return;

            picking = { mine: picking.mine, learn: picking.learn.concat(e.target.value) };
            render();
        });

        panel.querySelectorAll('.dict-start-drop').forEach(button => {
            button.addEventListener('click', () => {
                picking = { mine: picking.mine, learn: picking.learn.filter(t => t !== button.dataset.tag) };
                render();
            });
        });

        /*
         * Skipped, and that is written down as firmly as an answer would be.
         *
         * Nothing is made: there is no second language to make anything out of,
         * so what is left is the set the app ships with, which is enough to see
         * what it does. The questions are in the settings from now on, where
         * somebody who has seen the thing can answer them having a reason to.
         *
         * What the first dropdown is standing on is kept, though. Skip answers
         * "which languages are you learning", and is not an instruction to
         * forget the one already named: the settings would otherwise open on
         * "Pick one" and ask it again of somebody who has answered it.
         */
        panel.querySelector('.dict-start-skip').addEventListener('click', async () => {
            myLang = picking.mine;
            langsAsked = true;

            if (myLang) await saveSetting('myLang', myLang);
            await saveSetting('langsAsked', true);

            render();
        });

        panel.querySelector('.dict-start-go').addEventListener('click', async () => {
            if (!ready) return;

            myLang = picking.mine;
            learnLangs = picking.learn;
            langsAsked = true;

            await saveSetting('myLang', myLang);
            await saveSetting('learnLangs', learnLangs);
            await saveSetting('langsAsked', true);
            await makeSets();

            // The sets were just written, so the bars grow out of nothing: this
            // is the first screen anybody sees with anything on it.
            catalog.render();
        });
    }


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
        // Any game, not just the one the hand was on: it is asking for a game to
        // be played, and any of them answers it. The hand over Flashcards comes
        // down by itself when Flashcards is pressed; this is what takes it down
        // when the press went to one of the others.
        pointingHand.clear();

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
     * It is also where a game that is off the shelf is played from. The row ran
     * out of places, and what moved out of it went in here with the tile it had:
     * under the heading, on the set the dialog was opened from. The tile of a
     * game that is not written yet opens the same dialog from the other side —
     * what it has to say is this same sentence.
     *
     * That is what took the "Got it" button out. A dialog with something to
     * press in it does not need a second thing whose only job is to be pressed,
     * and of the two it is the wrong one that draws the hand: a button lying
     * across the bottom in the accent colour is where a press goes. What is left
     * to dismiss it with is the backdrop, which is what dismissed it already for
     * anybody who was not reading the button.
     *
     * Built like the early-play dialog below, because it is the same kind of
     * thing: something said in the middle of the catalog that the catalog goes
     * back to being once it is read.
     */
    function moreSoon(setId) {
        /*
         * A game off the shelf, drawn as the row drew it: same tile, same
         * colour, same two faces when a round of it was left open. A smaller or
         * plainer picture here would be a second way of saying "Snake", and what
         * this has to do is hand back the one thing the player knows by sight.
         *
         * Boxed to the tile's own width, because tileBtn is written for the
         * shelf and takes whatever width it is given. Left to fill the dialog it
         * still draws a tile with a name under it, but the whole line it sits on
         * becomes a press.
         */
        const tile = (game) => `<div style="width: ${TILE}px;">${tileBtn('more-dialog-game', game.color, game.icon(TILE_ICON), game.title, `data-game="${game.id}"`, openOn(game, setId))}</div>`;

        const overlay = $(`<div class="more-dialog-overlay" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; padding: 13.7px; z-index: 100;">
            <div class="more-dialog" style="background: ${palette.dialogBg}; color: ${palette.dialogText}; border: 1px solid ${palette.dialogBorder}; border-radius: 17.1px; padding: 17.1px; max-width: 273.2px; width: 100%;">
                <div class="more-dialog-title" style="font-size: 14.3px; font-weight: 700; margin-bottom: 6.8px;">Forever free for early adopters</div>
                ${AWAY.length ? `<div class="more-dialog-games" style="display: flex; justify-content: center; gap: 13.7px; margin: 10.2px 0 13.7px;">${AWAY.map(tile).join('')}</div>` : ''}
                <div class="more-dialog-text" style="font-size: 12.8px; line-height: 1.4; color: ${palette.dialogBody};">
                    <p style="margin: 0 0 8.5px;">Congratulations — you are one of the first to install this app, so it stays free for you whatever it charges later.</p>
                    <p style="margin: 0;">More games to help you remember words are coming soon.</p>
                </div>
            </div>
        </div>`);

        const close = () => overlay.remove();

        overlay.querySelectorAll('.more-dialog-game').forEach(btn => {
            const game = AWAY.find(g => g.id === btn.dataset.game);

            // Gone before it starts anything, because starting can put another
            // dialog on the screen — launch asks first on a set whose timers
            // have not run out — and a question asked from behind the thing that
            // asked it is a question with two backdrops to click.
            btn.addEventListener('click', () => {
                close();

                if (openOn(game, setId)) nav.resume(game, setId);
                else launch(game, setId);
            });
        });

        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    }

    /*
     * What the colours on the bubbles mean, asked for by the hand that comes in
     * from the edge once a set has any.
     *
     * Shown rather than described. The colour of a bubble is a thing to look at,
     * and a paragraph saying so is a paragraph standing between the reader and
     * the answer — so what is here is three bubbles, two arrows and the four
     * words it takes to say which way they go.
     *
     * Bubbles at the size they are on the shelf, not miniatures of them. The
     * whole point is recognising the thing outside the dialog, and a swatch
     * shrunk to fit a sentence is a swatch that has to be matched up rather than
     * simply seen.
     *
     * Four of them fit the width every other dialog here uses, and they fit
     * because the arrows between them are drawn rather than typed: four bubbles
     * and three arrows come to 243 of the 273.2 there is, which leaves five
     * clear pixels at each join. The arrows gave up the room rather than the
     * bubbles — an arrow is a direction and reads at any size, while a bubble
     * that has shrunk is no longer the thing it is standing in for.
     *
     * The rungs are not evenly spaced, and the second is why. Stage 2 is what a
     * word wears after one right answer — the first change anybody ever sees —
     * so it earns a place beside the stone it came from rather than being
     * averaged away into the middle of the arc. The rest is ends and a middle.
     *
     * The mistake is kept apart and after. It is not a rung of the same ladder:
     * every other colour here is somewhere a word climbed to, and this is the
     * one it was dropped to — see DAMAGED_FILL.
     *
     * Under it the two rows about time, in the order a word lives them: the badge
     * counting down, then the hop that follows it. Neither is about colour at
     * all, and a legend of colours alone would explain the quiet half of the
     * screen and none of the part that waves.
     *
     * The hop uses the same keyframes and the same 650 the bubbles do, because a
     * demonstration at a tempo of its own is a demonstration of something else.
     *
     * All three wear a colour from the middle of the ladder rather than one of
     * their own, so that what is different about a row is the only thing that
     * row is about.
     */
    const COLOUR_STEPS = [0, 2, 8, 14];

    function explainColours() {
        const chip = (fill, ink, extra, inner) => `<span style="display: inline-flex; align-items: center; justify-content: center; background: ${fill}; color: ${ink}; border-radius: 12px; padding: 5.1px 8.5px; font-size: 13.3px; font-weight: 800; line-height: 1.15; ${extra || ''}">word${inner || ''}</span>`;

        // The badge a bubble wears while it waits, copied off createBubble down to
        // the four pixels it hangs over the corner by. Two hours because it has to
        // say something, and a round number reads as an example rather than as
        // whatever this particular word happens to be waiting.
        const timerBadge = `<span style="position: absolute; bottom: -5px; right: -4px; background: ${palette.timerFill}; color: ${palette.onTimer}; font-size: 9.2px; font-weight: 800; line-height: 1; padding: 1.5px 3.8px; border-radius: 10.2px; box-shadow: 0 2px 3.4px rgba(0,0,0,0.18); white-space: nowrap; letter-spacing: -0.2px;">2h</span>`;

        /*
         * Drawn rather than typed. The arrow in a font is set on its own
         * sidebearings — space to its left and right that belongs to it and
         * cannot be taken back — and three of those are most of what was making
         * this row too wide. A path is exactly as wide as the mark.
         *
         * It leans and the shaft bends, because the row it joins is bubbles with
         * rounded corners and a hand-drawn line belongs among them better than a
         * ruled one. The head is the last two strokes of the same gesture rather
         * than a filled triangle, for the same reason.
         */
        const arrow = `<svg width="13" height="10" viewBox="0 0 13 10" fill="none"
            stroke="${palette.dialogBody}" stroke-width="1.5" stroke-linecap="round"
            stroke-linejoin="round" aria-hidden="true" style="flex: none; display: block;">
            <path d="M1.1 6.1c2.3-1 4.8-1.3 7.6-.9" />
            <path d="M6.3 2.9 9.2 5.1 6.1 7.4" />
        </svg>`;

        const note = (text) => `<span style="font-size: 11.3px; font-weight: 600; line-height: 1.3; color: ${palette.dialogBody};">${text}</span>`;

        const ladder = COLOUR_STEPS
            .map(s => chip(stageRamp[s].fill, stageRamp[s].ink))
            .join(arrow);

        const overlay = $(`<div class="colours-dialog-overlay" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; padding: 13.7px; z-index: 100;">
            <div class="colours-dialog" style="background: ${palette.dialogBg}; color: ${palette.dialogText}; border: 1px solid ${palette.dialogBorder}; border-radius: 17.1px; padding: 17.1px; max-width: 273.2px; width: 100%;">
                <div class="colours-dialog-title" style="font-size: 14.3px; font-weight: 700; margin-bottom: 12px;">Words ripen with every repetition</div>

                <div class="colours-dialog-ladder" style="display: flex; align-items: center; justify-content: space-between; gap: 3.4px;">${ladder}</div>
                <div style="display: flex; justify-content: space-between; margin-top: 5.1px;">${note('new')}${note('learned')}</div>

                <div style="height: 1px; margin: 13.7px 0; background: ${palette.dialogBorder};"></div>

                <div style="display: flex; align-items: center; gap: 10.2px;">
                    ${chip(DAMAGED_FILL, FAIL_INK)}
                    ${note('a mistake — three steps back')}
                </div>

                <div style="display: flex; align-items: center; gap: 10.2px; margin-top: 10.2px;">
                    ${chip(stageRamp[8].fill, stageRamp[8].ink, 'position: relative;', timerBadge)}
                    ${note('a timer — repeat it later')}
                </div>

                <div style="display: flex; align-items: center; gap: 10.2px; margin-top: 10.2px;">
                    ${chip(stageRamp[8].fill, stageRamp[8].ink, `animation: bounce ${BOUNCE_MS}ms ease-in-out infinite;`)}
                    ${note('a hop — ready to repeat')}
                </div>

                <button class="colours-dialog-ok" style="width: 100%; margin-top: 13.7px; padding: 7.7px; background: ${palette.accent}; color: ${palette.onAccent}; border: none; border-radius: 10.2px; font-family: inherit; font-weight: 700; font-size: 12.8px; cursor: pointer;">Got it</button>
            </div>
        </div>`);

        // Closing it is the reading. Either way out counts — the button and the
        // press beside the panel are the same answer, and a hand still waiting
        // after one of them would be waiting for nothing.
        const close = () => {
            overlay.remove();

            if (coloursRead) return;

            coloursRead = true;
            saveSetting('coloursRead', true);
            render();
        };

        overlay.querySelector('.colours-dialog-ok').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    }

    // Modal shown when every word of the selection is still waiting for its timer
    function confirmEarly(onPlayAnyway) {
        const overlay = $(`<div class="early-dialog-overlay" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; padding: 13.7px; z-index: 100;">
            <div class="early-dialog" style="background: ${palette.dialogBg}; color: ${palette.dialogText}; border: 1px solid ${palette.dialogBorder}; border-radius: 17.1px; padding: 17.1px; max-width: 273.2px; width: 100%;">
                <div class="early-dialog-title" style="font-size: 14.3px; font-weight: 700; margin-bottom: 5.1px;">⏳ Nothing to repeat yet</div>
                <div class="early-dialog-text" style="font-size: 12.8px; line-height: 1.35; color: ${palette.dialogBody}; margin-bottom: 12px;">All words in this selection are still waiting for their timers. An early repetition will not move a word forward, but a mistake will still set it back.</div>
                <div class="early-dialog-actions" style="display: flex; gap: 6.8px;">
                    <button class="early-dialog-cancel" style="flex: 1; padding: 7.7px; background: ${palette.softBg}; color: ${palette.softColor}; border: 1px solid ${palette.softBorder}; border-radius: 10.2px; font-weight: 700; font-size: 12.8px; cursor: pointer;">Cancel</button>
                    <button class="early-dialog-play" style="flex: 1; padding: 7.7px; background: ${palette.accent}; color: ${palette.onAccent}; border: none; border-radius: 10.2px; font-weight: 700; font-size: 12.8px; cursor: pointer;">Play anyway</button>
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

    // After store.load(), which is what decides whether a form still has a set
    // to edit.
    catalog.setOpenForms(await storage.get('open_forms'));

    // Nothing to do unless an update has just guessed somebody's languages off
    // their old sets. After the load, and before the draw that would otherwise
    // show them a language with no sets under it.
    await catalog.fillGuessedLangs();

    catalog.render();
}

async function bootCatalog() {
    spacedRepetitions();
    storage();
    store();

    await storage.init();

    // Before the first read of anything saved: a 0.1.2 database has to become a
    // 0.2.0 one while nobody is looking at it. A no-op on every other database,
    // and on every run after the first — see migrate.js.
    await migrate.run();

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


    // Speaking unless the player has turned the sound off. An absent setting
    // means the default, and the default is on -- see speech.js.
    speech.mute(!!(settings && settings.muted));

    const container = $(`<div class="app-main-content"></div>`);
    catalog(container);

    // The player is here, so this is where the popup should reopen.
    nav.setEntryPoint('index.html');

    theme.apply(isDark);
    catalog.setTheme(isDark);

    // After catalog(container), which is what defines this. Absent means the
    // explanation has not been read, which is what a first run is.
    catalog.setColoursRead(!!(settings && settings.coloursRead));
    catalog.setLangs(settings);

    // Absent means the corner has never been taken hold of, so it is still worth
    // pointing out.
    resizeGrip.setTried(!!(settings && settings.gripTried));

    await refreshCatalog();
    popupHeight.release();
}

// The browser's own Back button can restore this page from the bfcache: the
// document comes back alive exactly as it was left, so nothing above re-runs.
// Without this the catalog would still be showing the state it had before the
// game started — the old progress, and a play mark on a tile whose session may
// well have finished.
//
// Only the catalog needs it. A game page rewrites its own address to carry
// resume=1 as soon as its session exists, so every way back into that entry
// continues the session whether the bfcache served it or not.
window.addEventListener('pageshow', (event) => {
    if (event.persisted) refreshCatalog();
});

bootCatalog();
