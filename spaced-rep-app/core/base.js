/*
 * Shared shell utilities: the DOM helper, navigation between pages and the
 * light/dark flag. Everything here is needed by the catalog and by every game
 * page alike, and nothing here knows about words or repetitions.
 */

// Appends html to a parent (document.body when called with one argument)
// and returns the created element.
function $(...parent_html) {
    let p = parent_html.length == 2 ? parent_html[0] : document.body;
    p.insertAdjacentHTML('beforeend', '\n' + parent_html.at(-1) + '\n');
    return p.lastElementChild;
}

/**
 * Navigation. Every transition writes before it leaves, because leaving
 * destroys the document together with any transaction still in flight.
 */
function nav() {
    // Every page of the app sits at the root — index.html next to cards.html and
    // the rest — so a bare relative path resolves identically from all of them.
    // Only the scripts live in folders, and nothing navigates to a script.

    // The files are always .html. What differs is whether something on the other
    // end will fill the name in: GitHub Pages resolves /cards to cards.html and /
    // to index.html, so the site gets the tidy address.
    //
    // Everywhere else the full name is required, and that is two cases, not one.
    // The extension serves by exact path. And file:// has no server at all — the
    // folder opened by double-clicking index.html, which is a property worth
    // keeping: it is half the reason this project uses plain scripts instead of
    // modules. Asking "is this the web" rather than "is this the extension" keeps
    // both of them working.
    //
    // Note that a static server which does not resolve extensionless paths would
    // break this — hence devserver.py rather than python -m http.server.
    const onWeb = location.protocol === 'http:' || location.protocol === 'https:';
    const PAGE_EXT = onWeb ? '' : '.html';
    const HOME = onWeb ? './' : 'index.html';

    // In the extension the popup always reopens at action.default_popup, so the
    // entry point is moved along with the player. Scoped to the browser session
    // on purpose — after a restart the catalog is the right place to land, and
    // the "Continue" banner is there to pick the session back up.
    nav.setEntryPoint = (page) => {
        if (globalThis.chrome && chrome.action && chrome.action.setPopup) {
            chrome.action.setPopup({ popup: page });
        }
    };

    nav.home = async () => {
        nav.setEntryPoint('index.html');
        await store.save();
        location.href = HOME;
    };

    // Only the identifier travels in the URL. The words themselves are read back
    // from the store by the game, so recordRepetition() still resolves the live
    // word inside its own set.
    nav.game = async (game, setId, allowEarly) => {
        await store.save();
        const early = allowEarly ? '&early=1' : '';
        location.href = `${game.page}${PAGE_EXT}?set=${encodeURIComponent(setId)}${early}`;
    };

    // Picking an unfinished session back up, as opposed to starting a fresh one
    // on the same set. Only this way in does the game restore its saved state.
    nav.resume = async (game, setId) => {
        await store.save();
        location.href = `${game.page}${PAGE_EXT}?set=${encodeURIComponent(setId)}&resume=1`;
    };
}
nav();

/**
 * The light/dark flag: one boolean for the whole app plus the ground it paints.
 * The palettes themselves stay inside the catalog and inside each game.
 */
/*
 * One record holds every setting, so every write to it starts by reading it.
 *
 * Two settings saved independently would each write their own idea of what the
 * record contains, and the second one to be changed would drop the first. Rare
 * enough — a person changing a setting — that the extra read costs nothing worth
 * measuring.
 */
async function saveSetting(key, value) {
    const saved = (await storage.get('settings')) || {};
    saved[key] = value;
    return storage.set('settings', saved);
}

function theme() {
    let isDark = false;

    theme.isDark = () => isDark;

    // The attribute is what the stylesheet keys off. The localStorage copy exists
    // only so prepaint.js can read it synchronously on the next page — IndexedDB
    // remains the source of truth, and refreshing the mirror here is what keeps a
    // stale cache from surviving more than one frame.
    theme.apply = (value) => {
        isDark = !!value;

        const root = document.documentElement;
        root.dataset.theme = isDark ? 'dark' : 'light';

        try {
            const mirror = isDark ? '1' : '0';
            if (localStorage.getItem('dark') !== mirror) localStorage.setItem('dark', mirror);
        } catch (e) { }
    };

    theme.set = (value) => {
        theme.apply(value);
        return saveSetting('isDark', isDark);
    };
}
theme();

/**
 * Keeps the extension popup from collapsing on every navigation.
 *
 * The popup takes its height from the document, and the document is built by
 * script after two async reads. prepaint.js reserves the height the popup had a
 * moment ago; this releases the reservation once the content is really laid out,
 * and remembers whatever height the popup settles at for next time.
 */
function popupHeight() {
    const inPopup = location.protocol === 'chrome-extension:';
    let timer = null;

    // innerHeight, not scrollHeight: it is the popup's actual height, already
    // capped by Chrome at 600. Storing the content height instead would reserve
    // a tall catalog's 768.3px on a short game page and leave dead space below it.
    function remember() {
        clearTimeout(timer);
        timer = setTimeout(() => {
            try { localStorage.setItem('popup-height', window.innerHeight); } catch (e) { }
        }, 200);
    }

    // Two frames: the first lets the just-appended content into the layout, the
    // second measures a settled page rather than one mid-reflow.
    popupHeight.release = () => {
        if (!inPopup) return;
        requestAnimationFrame(() => requestAnimationFrame(() => {
            document.documentElement.style.setProperty('--boot-height', '0px');
            remember();
        }));
    };

    // In the popup a window resize *is* Chrome resizing the popup, so this
    // measures exactly the thing being stored — including the changes that happen
    // mid-session, such as a quiz question with more options than the last.
    if (inPopup) window.addEventListener('resize', remember);
}
popupHeight();

/**
 * The handle on the left edge: drag it sideways and the app changes width.
 *
 * Which corner it is and why it is mouse-only is in app.css, with the rest of
 * its looks. What is here is where it sits, what a drag does to the body and
 * where the width is kept.
 *
 * Width and nothing else. Height is the one measurement the app has always
 * been able to work out for itself -- it is as tall as what is in it, and in
 * the popup Chrome caps that at 600 anyway -- so there was nothing for a
 * person to decide, only something for them to get wrong.
 *
 * The width outlives the page. The popup is rebuilt from scratch on every
 * navigation, and a width that went with it would last until the first game
 * was opened -- so the number goes to localStorage and comes back out in
 * prepaint.js, before <body> is parsed, as the custom property the body takes
 * its width from. Re-applying it from here instead would put a frame of the
 * old width at the top of every navigation, which in a popup is the window
 * itself jumping.
 */
function resizeGrip() {
    /*
     * As narrow as the handle will pull. There is no other end to it: the app
     * is as wide as it is dragged, and what stops it growing is the screen.
     *
     * A chosen number, and it is worth being clear that it is only that.
     * Nothing in the app stops working above it and nothing starts working
     * below it -- the app is not laid out again at a smaller size, it is the
     * same 350px drawing shown smaller, and a quarter of a drawing is a
     * perfectly well-formed quarter of a drawing. The two floors before this
     * one were measurements of something (305, where the catalog's header
     * stopped fitting, and 260, where the type stopped being comfortable), and
     * both went when what they measured stopped being true.
     *
     * What this one is for is to end the drag a long way before the arithmetic
     * does. The width is the top of the zoom and the bottom of the handle's
     * own counter-zoom, so there is nothing good waiting near nought.
     */
    const LEAST_WIDTH = 100;

    /*
     * Two presses closer together than this are one gesture, and the gesture
     * is "put it back".
     *
     * Counted here rather than left to a dblclick listener: the pointerdown is
     * prevented, or the drag takes the page with it, and a prevented
     * pointerdown does not produce the mouse events a double click is made of.
     */
    const DOUBLE_GAP = 400;

    // Read back by prepaint.js, which is the only other place that knows it.
    const WIDTH_KEY = 'app-width';

    const root = document.documentElement;

    /*
     * The corner of a window, drawn the way corners of windows are drawn:
     * short diagonals nested into it, getting shorter as they approach.
     *
     * It says "take hold here" and says nothing about which way, which is the
     * division of labour that works -- the cursor turns into a two-headed
     * arrow the moment the pointer arrives, and that is the last thing seen
     * before the hand moves. Drawing that arrow here instead was tried, and so
     * were two upright bars and three dots up the edge: the first says the
     * same thing twice, the second reads as a pause button, and the third has
     * nothing to say about corners.
     */
    const handle = $(`<div class="app-grip" title="Drag to set the width, double-click to reset">
        <svg width="13.7" height="13.7" viewBox="0 0 16 16" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M2 10.5L10.5 2" />
            <path d="M2 5.5L5.5 2" />
        </svg></div>`);

    let held = null;
    let saveTimer = null;
    let lastDown = 0;

    /*
     * On the app's own corner rather than the window's. In the popup the two
     * are the same place -- there the column is the window -- and everywhere
     * else the window's corner is across an empty margin from anything the
     * handle can resize.
     *
     * Nothing about what the page contains comes into it any more. The handle
     * sat level with the first thing in the header for a while, and halfway
     * down what was showing before that, and both had to be asked again every
     * time the app changed height. A corner is where the page begins: the
     * same place on every screen of the app, from the first frame, before
     * anything at all has been drawn into it.
     *
     * Clamped sideways all the same, because the app can be wider than what is
     * showing it and the page under it can be scrolled across: a corner past the
     * left edge is a grip that cannot be reached without first scrolling to it,
     * and scrolling across is not what a reader of a catalogue is doing.
     *
     * Not clamped downwards, which it was. Held at the top of the window it
     * stayed in the corner of the screen through the whole of a scroll, and a
     * mark that outlives everything it was next to stops reading as the corner
     * of the page and starts reading as furniture of the browser. It belongs to
     * the top of the document, so it leaves with the top of the document and
     * comes back with it.
     *
     * Which of the two is scrolling differs between the popup and the web, and
     * this has to work in both. On the web the document scrolls and the body's
     * box moves up with it. In the popup the document is capped at 600 and the
     * scrolling is moved inside the body -- see .in-popup in app.css -- so the
     * body's box never moves at all and its content slides under it, which is
     * exactly how the handle came to sit in the corner of a popup that was being
     * scrolled. Subtracting the body's own scroll answers both: on the web it is
     * nought, in the popup it is the whole of the movement.
     */
    function place() {
        const box = document.body.getBoundingClientRect();

        const edge = Math.max(0, box.left);

        /*
         * Everything above is measured on the screen; `left` below is not.
         *
         * A fixed element is laid out in the initial containing block, and the
         * strips reserved for the scrollbar are outside it — see
         * scrollbar-gutter in app.css. The two spaces agree to the pixel while
         * nothing is reserved, and the day both edges were, the handle stood a
         * whole gutter to the right of the edge it belongs on.
         *
         * The root's own box is that block, so its left edge is where `left: 0`
         * lands. Plus the page's horizontal scroll, which slides the root under
         * the viewport and leaves anything fixed where it was.
         *
         * Only across. There is no such strip at the top, and the root's top
         * does move with the page.
         */
        const origin = document.documentElement.getBoundingClientRect().left + window.scrollX;

        handle.style.left = edge - origin + 'px';
        handle.style.top = box.top - document.body.scrollTop + 'px';
    }

    // Written behind a pause, like the popup's own height a few lines up: a
    // drag is sixty widths a second and only the last of them is a width
    // anybody chose.
    function remember() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            try {
                if (held) localStorage.setItem(WIDTH_KEY, held);
                else localStorage.removeItem(WIDTH_KEY);
            } catch (e) { }
        }, 200);
    }

    /*
     * Through the root's custom property rather than onto body, because that
     * is the number the stylesheet already reads and prepaint.js already
     * writes. One way in for a width, whether it arrives from a drag now or
     * from storage before the page existed.
     */
    function paint(width) {
        held = Math.round(width);

        // Bare, with no unit: see app.css, where it is divided by.
        root.style.setProperty('--app-width', held);

        place();
        remember();
    }

    // Back to the width the stylesheet draws, and nothing left behind to bring
    // the old one back on the next page.
    function reset() {
        held = null;

        root.style.removeProperty('--app-width');

        place();
        remember();
    }

    handle.addEventListener('pointerdown', (event) => {
        // Otherwise the drag begins by selecting the page, and the grip spends
        // it dragging a selection around instead of a corner.
        event.preventDefault();

        // Asked for, so it stops asking. Before anything else here, because the
        // press is the answer whatever the drag turns out to be -- a double
        // click that resets the width comes through here too.
        if (!tried) {
            tried = true;
            handle.classList.remove(CALLING);
            saveSetting('gripTried', true);
        }

        const twice = Date.now() - lastDown < DOUBLE_GAP;
        lastDown = Date.now();

        if (twice) return reset();

        /*
         * Where the pointer is on the screen, and not where it is in the
         * window.
         *
         * In the popup the window is the thing being resized, and Chrome holds
         * it by the top right corner: every pixel the app gives up in width
         * moves the window's left edge a pixel right, and a pointer that has
         * not moved at all reports a clientX a pixel smaller. Measured against
         * the window, a drag therefore reads its own last move back as a fresh
         * one with the sign flipped -- w := 2*w0 - w - moved, which has no
         * fixed point and flips between two widths -- and the popup shakes for
         * as long as the button is held. The web never showed it, because
         * there nothing moves the window.
         *
         * screenX is outside all of that: it says where the mouse is, and the
         * mouse is not resized by anything the page does. What it costs is
         * being in the screen's pixels rather than the page's, so a popup at
         * some zoom other than 100% follows the pointer a little fast or a
         * little slow. Nobody has ever noticed a resize doing that; everybody
         * notices shaking.
         */
        const from = { x: event.screenX, width: document.body.getBoundingClientRect().width };

        // The grip keeps the pointer for the length of the drag, so letting go
        // outside it -- or outside the window -- still ends the drag, and moving
        // faster than the corner can follow does not drop it.
        handle.setPointerCapture(event.pointerId);

        /*
         * One pixel of pointer is one pixel of width, which is exact in the
         * popup and half speed anywhere else: the column is centred, so a
         * hundred pixels off its width moves each edge by fifty. Following the
         * pointer instead would put the error in the popup -- the one place
         * that has both a mouse and a window that really resizes.
         *
         * Applied once a frame, however many moves arrive in it. A mouse
         * reports oftener than the screen is drawn, and in the popup every one
         * of those reports is a window for Chrome to resize around a page it
         * is still laying out. Nothing is lost by dropping the rest: only the
         * last width of a frame was ever going to be seen.
         */
        let wanted = 0;
        let frame = 0;

        const apply = () => {
            frame = 0;
            paint(wanted);
        };

        const move = (e) => {
            wanted = Math.max(LEAST_WIDTH, from.width - (e.screenX - from.x));

            if (!frame) frame = requestAnimationFrame(apply);
        };

        const stop = () => {
            handle.removeEventListener('pointermove', move);
            handle.removeEventListener('pointerup', stop);
            handle.removeEventListener('pointercancel', stop);
        };

        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', stop);
        handle.addEventListener('pointercancel', stop);
    });

    /*
     * The corner calling attention to itself.
     *
     * It is the one thing in the app nobody finds by looking: a 13.7px mark in a
     * corner, drawn at a third of the ink's strength, that does something no
     * other corner in a popup does. Everything else here is a button with a word
     * under it.
     *
     * So it says so itself rather than being pointed at. A hand flying in to
     * drag it was the other way to do this, and it was a second animated thing
     * on a screen that already has two, for a feature that is worth exactly one
     * blinking corner.
     *
     * It stops the moment somebody takes hold of it -- not when they finish a
     * drag, and not when the width ends up different. Reaching for it is the
     * whole of what this is asking for; what they then do with the width is
     * their business, including letting go at once and leaving it alone.
     *
     * Written down because it is a thing that was said to someone, and the same
     * record keeps it said after the popup closes. Beside coloursRead, which is
     * the same kind of fact, and taken by "Clear data" with everything else --
     * which is right, since a shelf that has been reset is one nobody has been
     * shown anything on.
     */
    const CALLING = 'app-grip-calling';

    let tried = false;

    resizeGrip.setTried = (value) => {
        tried = !!value;
        if (tried) handle.classList.remove(CALLING);
    };

    resizeGrip.call = (on) => {
        handle.classList.toggle(CALLING, !!on && !tried);
    };

    // Capture, because a scroll inside the body does not bubble: in the popup
    // the body is the thing that scrolls, and the corner moves with it.
    window.addEventListener('scroll', place, true);

    // The window moving the column without resizing it: the app is centred, so
    // a wider window puts its left edge somewhere else, and a shorter one moves
    // the fold the corner is clamped to.
    window.addEventListener('resize', place);

    /*
     * And the body's own height, which is what the handle is halfway down.
     * This runs before anything has been drawn -- the page is built by script
     * after two async reads -- so there is no first position to take up yet,
     * and the app goes on changing height long afterwards: a set folded open,
     * a dialog, a game swapping its board for a victory panel.
     *
     * The body is the only box worth watching for as long as nothing pins its
     * height: it is as tall as whatever is in it, so its own size answers for
     * all of them. It was not always -- while the grip dragged a height as
     * well, the body became the one box in the document that could not change
     * size, and the catalog opened at a stale corner without noticing. Width
     * only is what makes one observer enough.
     *
     * No loop in it: the grip is out of flow, so placing it cannot change the
     * size that placed it.
     */
    new ResizeObserver(place).observe(document.body);

    place();
}
resizeGrip();

/**
 * The browser's own right-click menu, off.
 *
 * This is an app and not a page. What the menu offers — Back, Reload, View
 * source, Save as, Translate — is either meaningless here or a way out of the
 * app by accident, and in the popup it opens a list taller than the window it
 * is opened in, over the thing that was right-clicked.
 *
 * Anything editable keeps it, and that is not a nicety. A set of words gets
 * into this app by being pasted into the new-set form, and on a phone the only
 * way to paste is the menu a long press raises: a long press fires contextmenu
 * like a right click does, so refusing it there would leave the box with no way
 * to fill it and no keyboard shortcut to fall back on.
 *
 * The test is what the element is rather than where it sits, so nothing in
 * core has to know which screen grew a text box.
 */
/**
 * The hand that shows someone where to press.
 *
 * Yellow, and the same yellow in both themes. A colour that changes with the
 * theme is two colours — the rule the game colours in registry.js are kept by —
 * and this one's whole job is to be the brightest thing on a screen nobody has
 * learned yet. The dark outline is what makes that work on the light theme,
 * where a flat yellow on a white card is 1.9 against it and would read as a
 * smudge rather than a hand.
 *
 * It hangs inside the thing it points at rather than being placed against it.
 * A floating element would have to be positioned in the screen's pixels while
 * the app is laid out in its own — see appScale — and moved again every time
 * the handle resizes the app or the list under it grows. A child moves with its
 * parent for nothing.
 *
 * Nothing about it takes a press. It overhangs the button it is pointing at,
 * and a press that landed on the hint instead of the button would be a hint
 * that blocked the very thing it was asking for.
 */
// The one hand, drawn once. Two things are made of it — the finger that points
// at a button and the fist that holds up a card — and they have to be the same
// hand, or the second one reads as a different character arriving to explain
// what the first one meant.
const HAND_PATH = 'M11 21.5a6 6 0 0 1-6-6v-2.1a1.6 1.6 0 0 1 3.2 0v1.1V5.4a1.8 1.8 0 0 1 3.6 0v5.8a1.5 1.5 0 0 1 3 0v.7a1.5 1.5 0 0 1 3 0v.8a1.5 1.5 0 0 1 3 0v2.8a6 6 0 0 1-6 6z';

function pointingHand() {
    const HAND = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" style="display: block;">
        <path d="${HAND_PATH}" fill="#eab308" stroke="#7c4a03" stroke-width="1.1" stroke-linejoin="round" />
    </svg>`;

    let shown = null;

    function place(el) {
        if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
        return el;
    }

    /*
     * Two ways to hang it, and the second exists because of what the first asks
     * of the target.
     *
     * By default the hand goes inside the thing it points at, which is the cheap
     * one: a child moves with its parent through every redraw and every drag of
     * the size handle, and nothing has to be measured. It needs a target big
     * enough to have a hand standing in it and willing not to clip what hangs
     * out — a button on a card is both.
     *
     * `into` is for targets that are neither. A letter box on the snake's word
     * bar is twelve pixels wide inside a bar of fixed height, so a hand put in
     * one is a hand mostly cut off. Given somewhere else to live, the hand is
     * placed over the target instead — measured in the layout's own pixels
     * rather than the screen's, see appRect, because that is what a left and a
     * top are read as from inside the app's zoom.
     *
     * Standing in the target it sits 25 of its 52 below it, which puts the
     * fingernail on the last line of the page: the catalog's last card is the
     * last thing there is. Placed over one it overlaps by six — what is under it
     * there is a board, not the end of the world.
     *
     * The press it is asking for is what takes it down either way, and the hand
     * arranges that itself on the target: whoever puts a hand up is spared
     * knowing how it comes down, and nothing else on the screen can answer for
     * it — a hint dismissed by an unrelated tap is a hint gone before it was
     * understood.
     */
    pointingHand.at = (target, opts) => {
        pointingHand.clear();
        if (!target) return null;

        const size = (opts && opts.size) || 52;
        const host = opts && opts.into;

        if (host) {
            place(host);

            const a = appRect(target);
            const h = appRect(host);

            shown = $(host, `<span class="pointing-hand" style="position: absolute; left: ${a.left - h.left + a.width / 2}px; top: ${a.bottom - h.top}px; margin: -6px 0 0 -${size / 2}px; pointer-events: none; z-index: 5;">${HAND(size)}</span>`);
        } else {
            place(target);

            shown = $(target, `<span class="pointing-hand" style="position: absolute; left: 50%; top: 100%; margin: -27.1px 0 0 -${size / 2}px; pointer-events: none; z-index: 5;">${HAND(size)}</span>`);
        }
        target.addEventListener('pointerdown', pointingHand.clear, { once: true });

        return shown;
    };

    // Asked before a new hand is scheduled. `isConnected` rather than the
    // variable alone: a screen that redraws itself takes the hand with it without
    // going through clear(), and the reference left behind points at a node
    // hanging off nothing.
    pointingHand.showing = () => !!(shown && shown.isConnected);

    pointingHand.clear = () => {
        if (shown) shown.remove();
        shown = null;
    };
}
pointingHand();

/**
 * The same hand, holding up a card with a question on it.
 *
 * It comes in from the edge rather than appearing where it will stand, and it
 * is clipped by its own box while it does: the slide has to start somewhere,
 * and anywhere outside the app is somewhere a phone would rather scroll to. A
 * box the size of the hand, with the hand sliding inside it, is an entrance
 * that cannot reach past the screen because it never leaves the hand's own
 * square.
 *
 * Tilted, and the pointing one is not. The two are the same yellow at the same
 * size in the same corner of the eye, and the tilt is what says at a glance
 * that this one is offering something rather than telling you where to press.
 */
function askingHand() {
    /*
     * The window is not the usual 0 0 24 24, and cannot be. The hand is drawn on
     * that grid but then pushed down under the card it is holding, and the two
     * together run from -0.11 to 26.77 — an svg clips to its viewport, so the
     * bottom of the fist was being cut off by three units of it.
     *
     * Widened rather than the drawing shrunk: the numbers in the paths are the
     * ones the hand was drawn with, and a viewBox is the one place where "show
     * me this much of it" can be said without touching them. Square, and centred
     * on what is actually there, so the thing stays in the middle of its button.
     *
     * The box grew with it, 44 to 50, which is the same 27.5 units against the
     * same pixels per unit the drawing had at 24 to 44. A wider window in a box
     * that stayed put would have shown the whole hand by making it smaller, and
     * the hand was not the thing that was wrong.
     */
    const SIGN = `<svg width="50" height="50" viewBox="-1.8 -0.4 27.5 27.5" aria-hidden="true" style="display: block;">
        <g class="asking-hand-grip" transform="translate(2.2 12) scale(0.66) rotate(-8 12 12)">
            <path d="${HAND_PATH}" fill="#eab308" stroke="#7c4a03" stroke-width="1.7" stroke-linejoin="round" />
        </g>
        <g transform="rotate(-6 12 7)">
            <rect x="3" y="0.8" width="18" height="12" rx="2.8" fill="#eab308" stroke="#7c4a03" stroke-width="1.2" />
            <path d="M9.7 4.5a2.45 2.45 0 0 1 4.75.85c0 1.6-2.05 1.95-2.35 3.4" fill="none" stroke="#7c4a03" stroke-width="1.6" stroke-linecap="round" />
            <circle cx="11.85" cy="10.8" r="1.05" fill="#7c4a03" />
        </g>
    </svg>`;

    let shown = null;

    askingHand.at = (card, onPress) => {
        askingHand.clear();
        if (!card) return null;

        if (getComputedStyle(card).position === 'static') card.style.position = 'relative';

        // Flush with the edge of the app, which from the card's padding box is its
        // own border and the page's side padding: 1 + 6.8. Further out and the
        // hand hangs off the body, which on a screen exactly as wide as the app
        // is a scrollbar; further in and it stops looking like something that
        // came from outside.
        //
        // Which is why it is the page's own padding and not a number of its own.
        // It stayed at 11.2 for a while after the page went from 10.2 to 6.8,
        // and the 3.4 left over was exactly that scrollbar: in the popup the
        // window is the app's width and nothing has anywhere to hang off to.
        shown = $(card, `<button class="asking-hand" title="What the colours mean" style="position: absolute; right: -7.8px; top: 50%; margin-top: -25px; width: 50px; height: 50px; padding: 0; background: transparent; border: none; cursor: pointer; overflow: hidden; z-index: 5;">
            <span class="asking-hand-slide" style="display: block;">${SIGN}</span>
        </button>`);

        shown.addEventListener('click', onPress);

        return shown;
    };

    askingHand.showing = () => !!(shown && shown.isConnected);

    askingHand.clear = () => {
        if (shown) shown.remove();
        shown = null;
    };
}
askingHand();

function noContextMenu() {
    document.addEventListener('contextmenu', (event) => {
        const el = event.target;

        if (el instanceof Element
            && el.closest('input, textarea, [contenteditable]:not([contenteditable="false"])')) {
            return;
        }

        event.preventDefault();
    });
}
noContextMenu();

/**
 * How large the app is being shown against how large it is drawn, and the
 * usual thing done with that number.
 *
 * The app is one 350px-wide drawing shown at whatever size the handle was
 * dragged to, and the way that is done is a zoom on body — see app.css. Inside
 * that zoom a style is written in the layout's pixels, while
 * getBoundingClientRect, the viewport's own size and a pointer's clientX all
 * speak the screen's. At the size the app is drawn at the two are the same and
 * the difference cannot be seen, which is the whole danger of it: the few
 * places that measure the screen and then write a length back into the page
 * are right until somebody drags the handle, and then they are wrong by
 * exactly the scale.
 *
 * appRect is that conversion for the usual case — where is this element, in
 * the units something inside the page can be positioned with.
 */
function appScale() {
    const drawn = document.body.clientWidth;

    return drawn ? document.body.getBoundingClientRect().width / drawn : 1;
}

function appRect(el) {
    const box = el.getBoundingClientRect();
    const scale = appScale();

    return {
        left: box.left / scale, right: box.right / scale,
        top: box.top / scale, bottom: box.bottom / scale,
        width: box.width / scale, height: box.height / scale
    };
}

// How far the panel is from the button it hangs under, and how close it may
// come to the edge of the screen before it stops following.
const ANCHOR_GAP = 6.8;
const SCREEN_EDGE = 10.2;

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
    // Both in the layout's pixels rather than the screen's: the panel is
    // positioned from inside the app's zoom, and a rect and the viewport
    // are measured outside it. See appScale.
    const a = appRect(anchor);
    const room = document.documentElement.clientHeight / appScale();

    const left = Math.max(SCREEN_EDGE, a.right - panel.offsetWidth);
    const top = a.bottom + ANCHOR_GAP;

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.maxHeight = `${Math.max(120, room - top - SCREEN_EDGE)}px`;

    return `${a.left + a.width / 2 - left}px ${a.top + a.height / 2 - top}px`;
}
