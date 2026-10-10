/**
 * The cards between the header and the list: what this app is, and what the
 * screen under them means.
 *
 * Two things used to say part of this, and each said it once. A hand slid in
 * from the edge of the shelf offering to explain the colours; the corner of the
 * window blinked until somebody took hold of it. Both worked, and both cost the
 * same three things: a piece of machinery of its own, a flag of its own in the
 * settings, and a way of its own to go away for good. Between them they covered
 * two of the five things a reader of this screen does not know, and there was
 * nowhere to put the third.
 *
 * One strip of cards covers all five under one rule:
 *
 *   every card is in the strip from the first day, and the arrows go through
 *     all of them, in order, whenever the strip is up;
 *   every card has a moment — see `moment` on each — which is when the strip
 *     opens on that card by itself, and the earliest it can be marked read;
 *   the strip stands on the screen while a card whose moment has come is
 *     unread, and opens on the first such card.
 *
 * Which gives the two behaviours the hand and the corner were written for, for
 * free. The colours card is where the strip goes at the moment there is a
 * colour on the screen, which is exactly where the hand used to come in, and
 * the corner card at the moment the corner used to start blinking. For a reader
 * who never presses an arrow the strip advances by itself — the next visit
 * opens on the next card that has something to say — so every card is shown
 * once and then the strip retires, which is what both of the things it replaces
 * did.
 *
 * Reading ahead costs nothing, and that is why the moment governs the read-mark
 * as well. Somebody who pages through the whole thing on the first evening has
 * looked at a ladder of colours with no colours on the screen yet; that is
 * theirs to do, and the card still arrives by itself on the day it means
 * something. What the moments decide is only where the strip opens and when it
 * has nothing left to say — never what the reader is allowed to look at.
 *
 * The question mark in a circle is on every card and on the button in the
 * settings that switches the strip off and on. It is the only thing tying a
 * block of prose at the top of the catalog to the one control that can take it
 * away — and, the other way round, the only way back to the colours for
 * somebody who wants them explained twice. The hand never came back.
 *
 * Its own file because the catalog is four thousand lines of its own, and the
 * two meet only at the handful of functions at the bottom of this one. The
 * colours are handed in rather than worked out here: the strip stands in the
 * list, between the cards of the sets, and has to be the same card they are —
 * see catalog.setTheme, which owns that palette.
 *
 * Catalog only. The marks on the dots card are drawn from the sprite in
 * index.html, and nothing on a game page builds one of these.
 */
function onboarding() {
    /*
     * The look of the strip, handed in by the catalog on every theme change —
     * see onboarding.setLook for what is in it.
     */
    let look = {};

    // The unfinished session, or null. The catalog has it from active_session;
    // the width card wants to know whether a game has ever been opened.
    let session = null;

    /*
     * settings.onboarding: true when the button in the settings asked for the
     * strip, false when it sent it away, absent while nobody has touched it.
     *
     * Three states and not two, because the third is the one that behaves: left
     * alone, the strip comes and goes by what has been read, and the two written
     * answers are a reader overruling that in either direction.
     */
    let want = null;

    /*
     * The module's two settings keys, written one at a time.
     *
     * saveSetting is a read of the whole record, a change and a write back, so
     * two of them in flight at once lose one of the changes -- and these two go
     * off together: the switch in the settings writes `onboarding`, and the draw
     * it causes writes the read-mark of whatever card comes up. A queue of our
     * own is enough for that, since nothing else writes these two keys.
     */
    let writing = Promise.resolve();

    function save(key, value) {
        const next = () => saveSetting(key, value);

        writing = writing.then(next, next);

        return writing;
    }

    // settings.onboardingRead: the ids of the cards already drawn for this
    // reader. The one fact here that cannot be derived from anything else —
    // reading leaves no mark on the data — so it is written down, and "Clear
    // data" takes it with everything else, which is right: a shelf that has been
    // reset is a shelf nobody has been shown anything on.
    const read = new Set();

    /*
     * settings.onboardingAt: the card the reader was last left looking at.
     *
     * Written down because closing the popup is not an answer to anything. A
     * strip of seven cards is read a few at a time -- the popup is shut by a
     * click anywhere else on the screen, and a game page is a navigation away
     * and back -- and a booklet that falls open at page one every time is one
     * nobody gets to the end of.
     *
     * The id and not the number. Cards come and go by what the device can show
     * (see `only`) and by what gets written here later; an index is a promise
     * about the shape of a list, and this is a promise about one card.
     */
    let at = null;

    /*
     * Whether the strip is on this screen, and which card it stands on. Both
     * decided once and then kept for the life of the page.
     *
     * Once, because the answer must not change under the reader. Drawing a card
     * marks it read, so a strip that asked the question again on every redraw
     * would vanish the moment anything else on the screen changed — the sound
     * being muted, a form being opened — and it would do it while the card was
     * being read. In the popup the page is rebuilt on every navigation anyway,
     * so "the life of the page" is one visit: the strip retires on the way back
     * from a game, which is a screen the reader is arriving at rather than one
     * they are looking at.
     *
     * The settings button is the one thing that reopens the question mid-page;
     * it answers it itself — see toggle.
     */
    let live = null;
    let place = 0;

    /*
     * Which way the last arrow went, so the card comes in from that side.
     *
     * Spent by the draw that follows it and not kept: the catalog redraws itself
     * for its own reasons -- a sound muted, a form opened -- and a card that
     * slid in again on every one of those would be a page turning by itself.
     */
    let turn = 0;

    /*
     * How to ask the catalog to draw itself again, handed in by it -- see
     * onboarding.setRedraw.
     *
     * The strip has to be able to take itself off the screen: the hide button on
     * the last card is the switch in the settings worded the other way round,
     * and that switch redraws the catalog behind the panel. Handed in rather
     * than called for, because the knowing in this pair goes one way -- the
     * catalog owns the screen and tells the strip things, and a strip that
     * reached into the catalog would be the second half of a circle.
     */
    let redraw = null;

    /*
     * What the app promises the people who are here now, in the words the More
     * games dialog says it in — the catalog reads them from here rather than
     * keeping a second copy, because two copies of a promise is one promise and
     * one mistake waiting.
     */
    const PROMISE = [
        'Congratulations — you are one of the first to install this app, so it stays free for you whatever it charges later.',
        'More games to help you remember words are coming soon.'
    ];

    // Has anything, anywhere, ever been answered. Asked of the words rather than
    // kept as a flag, so it answers itself: the first repetition ever recorded
    // opens the cards that are about colours and dots, and clearing the data
    // closes them again.
    function answered() {
        return store.sets().some(set =>
            (set.words || []).some(w => w.repetitions && w.repetitions.length > 0));
    }

    // A game that was opened counts, answered or not: somebody who started one
    // and came straight back has seen a game drawn at whatever width the app is.
    function played() {
        return !!session || answered();
    }

    // Where there is no mouse the corner is not drawn at all — see .app-grip in
    // app.css, which is behind the same question. A card about a mark that is
    // not on the screen is a card pointing at nothing.
    function mouse() {
        return !!(window.matchMedia && window.matchMedia('(any-pointer: fine)').matches);
    }

    /* ------------------------------------------------------------------ *
     *  Pieces the cards are built out of
     * ------------------------------------------------------------------ */

    // The body text of every card, and the one size it is set in. Muted rather
    // than the ink the title is in: the card is prose on a shelf of word sets,
    // and the sets are what the screen is for.
    const text = (html) => `<span style="font-size: 11.8px; font-weight: 600; line-height: 1.45; color: ${look.body};">${html}</span>`;

    const note = (html) => `<span style="font-size: 11.3px; font-weight: 600; line-height: 1.3; color: ${look.body};">${html}</span>`;

    // A row of the little legends: something to look at, then what it is.
    const row = (mark, html, top, extra) => `<div style="display: flex; align-items: center; gap: 10.2px; margin-top: ${top}px; ${extra || ''}">${mark}${note(html)}</div>`;

    /*
     * A bubble standing in for the ones on the cards below, at the size they are
     * drawn there. The whole job of the colours card is recognising the thing
     * outside it, and a swatch shrunk to fit a sentence is a swatch that has to
     * be matched up rather than simply seen.
     */
    const chip = (fill, ink, extra, inner) => `<span style="display: inline-flex; align-items: center; justify-content: center; background: ${fill}; color: ${ink}; border-radius: 12px; padding: 5.1px 8.5px; font-size: 13.3px; font-weight: 800; line-height: 1.15; ${extra || ''}">word${inner || ''}</span>`;

    /*
     * Drawn rather than typed. The arrow in a font is set on its own
     * sidebearings — space to its left and right that belongs to it and cannot
     * be taken back — and three of those are most of what makes this row too
     * wide. A path is exactly as wide as the mark.
     *
     * It leans and the shaft bends, because the row it joins is bubbles with
     * rounded corners and a hand-drawn line belongs among them better than a
     * ruled one. The head is the last two strokes of the same gesture rather
     * than a filled triangle, for the same reason.
     */
    const ramp = () => look.ramp || tokens.stages();

    const arrow = (extra) => `<svg width="13" height="10" viewBox="0 0 13 10" fill="none"
        stroke="${look.body}" stroke-width="1.5" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true" style="flex: none; display: block; ${extra || ''}">
        <path d="M1.1 6.1c2.3-1 4.8-1.3 7.6-.9" />
        <path d="M6.3 2.9 9.2 5.1 6.1 7.4" />
    </svg>`;

    /*
     * The rungs shown on the colours card, and they are not evenly spaced.
     *
     * Stage 2 is why. It is what a word wears after one right answer — the first
     * change anybody ever sees — so it earns a place beside the stone it came
     * from rather than being averaged away into the middle of the arc. The rest
     * is ends and a middle.
     *
     * Four of them, because four bubbles and three arrows are what fits the
     * width of this card, and because the arrows gave up the room rather than
     * the bubbles: an arrow is a direction and reads at any size, while a bubble
     * that has shrunk is no longer the thing it is standing in for.
     */
    const RUNGS = [0, 2, 8, 14];

    /*
     * The two arrows on the first card, pointing out of it at the two things it
     * names: the set standing under the strip, and the New set button in the
     * header.
     *
     * Both leave the card, which is the whole of what they have to say, and
     * neither is set in the line of prose: an arrow inside a sentence points at
     * the next word.
     *
     * They hang off the card itself rather than off its body, and that is not
     * tidiness. The body carries the page-turn animation, which moves it
     * sideways -- and an element with a transform of its own becomes the box
     * that anything absolutely positioned inside it is measured from. A mark put
     * in the body was therefore in the right place on a card that was drawn and
     * in the wrong place on the same card reached with an arrow, by exactly the
     * card's own padding. See paint, which hangs `marks` beside the body.
     *
     * Drawn the way the arrow between the colour chips is drawn, and for the
     * same reason: a bent shaft and a head of two strokes is a gesture, and a
     * gesture belongs on a card of rounded boxes better than a ruled line with a
     * filled triangle on it. In the card's own ink, because they are part of
     * what the card says: an arrow in the accent is a second voice on a card
     * that has one thing to tell you.
     *
     * The downward one hangs off the word "this" rather than off the middle of
     * the card, because that word is the one the sentence points at the set
     * with -- which is also why that word is the one set heavier than the line
     * it stands in: the arrow and the weight say the same thing twice, once to
     * the eye that is reading and once to the eye that is not. It is on the last line of the paragraph at the width this app is
     * drawn at, so the arrow has nothing but air to cross; a line of prose under
     * it would be crossed out by it.
     *
     * The upward one leaves the written word at its left and runs across the top
     * of the card to the New set button: mostly sideways, because the distance
     * it has to carry the eye is sideways, and then turned up at the end so that
     * it arrives going straight at the middle of the button's lower edge. A
     * stroke that ended on the slant it travelled would be pointing past the
     * button rather than at it.
     *
     * One curve into one straight line, and the curve ends already upright, so
     * the join between them is no join at all. It was two curves meeting at an
     * angle before, which put a corner in the shaft a few pixels short of the
     * head, and the head stopped reading as a head.
     *
     * The bend is a quarter of a circle of twenty-four, which is most of the
     * stroke: a curve drawn across a run three times its own drop is flat for
     * two thirds of the way and then hooks, however it is drawn, so the stroke
     * starts lower -- out from under the written word rather than beside it --
     * and buys the drop that lets the turn be even. A circle in particular,
     * because an even bend is a constant one, and nothing else about it is worth
     * a reader's attention.
     *
     * It stops nine pixels short of the word it comes from. A stroke that
     * touches what it was written beside is a correction; one that starts a
     * little away from it is an aside.
     *
     * The upright finish is also what gives the two strokes of the head their
     * room: against a shaft still leaning in, the inner one lies along it and
     * disappears.
     *
     * Where it ends is measured rather than chosen: the head is under the middle
     * of the New set button, which is the third button in from the right of a
     * header whose buttons are all a known width. That is the one number here
     * another file can break -- a button added to that row moves it -- and this
     * comment is the whole of the warning.
     *
     * How far up it reaches is not a choice at all. The header is sticky, opaque
     * and above everything in the column, which is what has to happen when the
     * page is scrolled under it; so the head stops two pixels under the header's
     * own bottom edge -- ten short of the button -- because anything drawn
     * higher would simply be painted over while standing still. The ten pixels
     * are air the arrow cannot cross and the eye does not notice.
     */
    /*
     * A stroke that draws itself rather than appearing: the path is told its own
     * length is 1, so one dash of 1 covers it whole whatever its real length,
     * and running the offset from 1 to 0 uncovers it from its first point to its
     * last. See onb-draw in app.css, where the trick and the reason are written
     * out.
     *
     * Every arrow in the strip is drawn this way. Each of them points at
     * something that is not on the card -- the set below, the New set button,
     * the corner of the window, the row of names, the gear in the header -- and
     * an arrow that is simply there is a picture of a direction, while one being
     * drawn is a hand showing you something. Following the line while it is made
     * is most of what carries the eye off the card at all.
     *
     * Which is also why every one of them is written from the thing it comes off
     * towards the thing it points at: the direction it draws in is the direction
     * its `d` is written in, and nothing else decides it.
     *
     * The head is a second stroke, started as the shaft lands rather than with
     * it: a head growing while the shaft grows is a shape swelling, and what is
     * wanted is a line arriving somewhere and then pointing.
     */
    const DRAW = (ms, delay) => `pathLength="1" stroke-dasharray="1" style="animation: onb-draw ${ms}ms ease-out ${delay}ms both;"`;

    /*
     * The written word, which arrives rather than being drawn, and arrives last:
     * the arrow it belongs to has to have got where it is going before the word
     * next to it means anything.
     *
     * A fade although it is written in the same hand as the arrow. Ten strokes
     * growing at once are not handwriting, they are ten strokes growing; ten in
     * sequence are a second animation as long as the rest of the card has, for
     * six letters nobody is waiting to read. See onb-mark in app.css for why
     * anything on this card waits at all. `both` rather than `forwards`, so that
     * what stands there during the wait is the first frame of the animation
     * rather than the finished mark: the keyframes own both ends, and nothing
     * has to be said twice in the style attribute.
     */
    const WORD_IN = 'animation: onb-mark 240ms ease-out 1060ms both;';

    /*
     * The same fade, handed out down a card so that its parts arrive one after
     * another rather than all at once.
     *
     * A card that is a list of things -- four rungs with arrows between them,
     * three rows of legend -- is read in the order it is written, and arriving
     * in that order is the cheapest way of saying so. Landing together, the four
     * colours are a palette; landing left to right, they are a word getting
     * older, which is the whole of what that card has to say.
     *
     * The step is short enough that the run is one movement and not a queue.
     * Sixty in front of all of it, which is less than a blink: it is not a
     * pause, it is the first thing not being already there when the card is.
     */
    const AFTER = (i, step) => `animation: onb-mark 220ms ease-out ${Math.round(60 + i * (step || 90))}ms both;`;

    const POINT_UP = () => `<svg width="70" height="38" viewBox="0 0 70 38"
        fill="none" stroke="${look.body}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true" style="display: block; position: absolute; right: 66px; top: -12px;">
        <path ${DRAW(420, 500)} d="M61 32H48.7A24 24 0 0 1 24.7 8L24.7 6.5" />
        <path ${DRAW(170, 910)} d="M21 13.6 24.7 6.5 28.4 13.6" />
    </svg>`;

    /*
     * And a word in the hand that drew the arrow, under it: what the button it
     * points at is for.
     *
     * Written as strokes rather than set in a typeface. There is no handwriting
     * font to be had here -- the app loads none and is not going to start, and
     * the generic `cursive` family is a different face on every machine and a
     * joke on one of them -- so the six letters are six little paths, drawn on
     * the same round-capped line the arrows are. Six paths are also the whole
     * reason this is allowed to look hand-made: a letter that is slightly wrong
     * is handwriting, while a typeface that is slightly wrong is a bug.
     *
     * Tilted four degrees, which is what makes it read as written next to the
     * arrow rather than printed beside it, and in the same ink as the arrow and
     * the sentence, so that the three are plainly one hand.
     */
    const LABEL = () => `<svg width="46" height="15" viewBox="0 0 62 20" fill="none"
        stroke="${look.body}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true" style="display: block; position: absolute; right: 20px; top: 13px; ${WORD_IN}">
        <g transform="rotate(-4 31 11)">
            <path d="M10 8C6 5.5 2 8 2 11.2 2 14.6 6 16.6 10 14.6" />
            <path d="M14.4 16 15.2 8.4" />
            <path d="M14.8 10.6C16.4 7.8 19 7.6 20.2 9.2" />
            <path d="M22.6 12.6C26 12.2 28.8 11.6 29.8 10.6 30.4 8.8 27.4 7 24.8 8.6 22.2 10.2 21.8 14.6 24.8 15.9 26.8 16.7 28.8 16.1 30.2 14.6" />
            <path d="M40 9.6C38 7.6 34 8.2 33.5 11.4 33 14.7 36 16.9 39.2 15.2" />
            <path d="M40.2 8.6C39.9 11.4 39.8 14 40 15.9 40.1 16.7 41.2 16.6 42 15.7" />
            <path d="M47 5.4C46.4 9 46.1 13 46.5 15.1 46.8 16.5 48.1 16.5 49.1 15.4" />
            <path d="M44 9.4 49.6 8.8" />
            <path d="M52.1 12.6C55.5 12.2 58.3 11.6 59.3 10.6 59.9 8.8 56.9 7 54.3 8.6 51.7 10.2 51.3 14.6 54.3 15.9 56.3 16.7 58.3 16.1 59.7 14.6" />
        </g>
    </svg>`;

    const POINT_DOWN = () => `<svg width="19" height="24" viewBox="0 0 19 24"
        fill="none" stroke="${look.body}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true" style="display: block; position: absolute; left: 50%; margin-left: -9.5px; top: 100%;">
        <path ${DRAW(300, 500)} d="M9.6 2.4c1.9 6.4 1.6 12.8-.6 18.4" />
        <path ${DRAW(150, 790)} d="M4.4 15 9 21.4 13.8 15.4" />
    </svg>`;

    /* ------------------------------------------------------------------ *
     *  The cards
     * ------------------------------------------------------------------ */

    /*
     * The arrow on the width card, pointing out of the card at the corner of the
     * app itself -- the one place in the app nobody finds by looking.
     *
     * It used to be a picture instead: a little box with the mark drawn in its
     * top left and an arrow across it. A drawing of a thing is one more thing to
     * recognise; the mark is fourteen pixels of hairline in the corner of the
     * window, and what the reader needs is not a portrait of it but a direction
     * to look in.
     *
     * So the stroke leaves the card and runs all the way up to it, finishing dead
     * upright three pixels under the mark itself.
     *
     * Which is the one place in the strip that is drawn over the header. The
     * header is sticky and opaque and above the whole column -- it has to be,
     * or the list would scroll across it -- so a stroke reaching the corner has
     * to be told to go over it. What that costs is a moment during a scroll when
     * the stroke is seen crossing the header; it crosses the empty margin to the
     * left of the wordmark, where there is nothing to hide, and the corner's own
     * mark sits higher still at 200 and keeps its place over everything.
     *
     * And it draws itself rather than appearing, as every arrow in the strip
     * now does -- see DRAW. The corner used to pulse for attention until
     * somebody took hold of it; what replaced that pulse is a line being drawn
     * towards it, which says the same thing once instead of for ever.
     *
     * How far left it reaches is the other fixed end of it. The head used to
     * stand a pixel and a half outside the page's own left edge -- an arrow
     * pointing at the corner of the window from outside the window -- so it
     * came back in by four, which leaves its leftmost ink a clear two inside
     * and puts the point nearer the middle of the mark it is about.
     */
    const POINT_CORNER = () => `<svg width="26" height="80" viewBox="0 0 26 80"
        fill="none" stroke="${look.body}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true" style="display: block; position: absolute; left: -8.6px; top: -44.5px; z-index: 7;">
        <path ${DRAW(560, 320)} d="M22 69C17 58 6.5 44 6.5 20L6.5 6" />
        <path ${DRAW(200, 870)} d="M3.2 12.2 6.5 6 9.8 12.2" />
    </svg>`;

    /*
     * The arrow on the last card: from the word Settings in the sentence to the
     * Settings button in the header.
     *
     * One long diagonal across the empty top right of the card, which is the
     * only clear way between those two ends: the word is at the end of the
     * card's one line of prose, the button is at the right-hand end of the
     * header, and what lies between them in a straight line is the heading. So
     * the stroke leaves the line where the line ends, crosses the corner nothing
     * is written in, and straightens up into the button.
     *
     * One bow, and it is an arc of a single circle -- which is what makes a
     * curve this long an even one: the bend is the same at every point of it, so
     * there is no stretch where the stroke is turning and no stretch where it is
     * not. It had a kink in it twice before this. Once it turned out, back and
     * up again inside thirty pixels; once it ran straight along the line between
     * its ends and remembered to turn only at the button, which puts all forty
     * degrees of the turn in the last few pixels, exactly where the head is and
     * where there is least room to read it.
     *
     * Leaving the word almost sideways is the price of that, and it is worth
     * paying twice over: the first stretch runs along the line of type it came
     * off, at the height of the word itself, which is a plainer way of saying
     * "this word" than any amount of pointing at it.
     *
     * Upright at the end, because that is what has it pointing at the button
     * rather than past it; and no higher than a pixel under the header's bottom
     * edge, because the header is opaque and above the whole column. Both are
     * written out at POINT_UP, which is the same arrow at the next button along.
     *
     * Measured from the card's right edge, because that is the edge the header
     * holds it to: the buttons there are right-aligned, so the distance from
     * that edge to the middle of the gear is a fact about the header rather than
     * about how wide the app is. It is the one number here another file can
     * break -- a button added to that row moves it -- and this is the whole of
     * the warning.
     *
     * It starts nine pixels past the end of the sentence rather than over the
     * word, the same nine the New set arrow keeps from the word it comes off.
     * Above the letters themselves the first pixels of the stroke would be
     * crossing out the word they come from, and the air after it is the
     * difference between an aside and a correction.
     */
    const POINT_SETTINGS = () => `<svg width="60" height="68" viewBox="0 0 60 68"
        fill="none" stroke="${look.body}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true" style="display: block; position: absolute; right: 43.4px; top: -10px;">
        <path ${DRAW(560, 320)} d="M2.2 65A62.38 62.38 0 0 0 54.1 3.5" />
        <path ${DRAW(200, 870)} d="M50.4 10.6 54.1 3.5 57.8 10.6" />
    </svg>`;

    /*
     * The press that sends the strip away, drawn on the strip.
     *
     * One word and a hairline box. It is the only thing in here that does
     * something rather than says something, and what it does is make everything
     * around it leave -- a button in the app's accent, or a filled one, would be
     * the loudest thing on a screen whose subject is the shelf below.
     *
     * Upright among a card of italics, which is the rule the two words on the
     * stand-in bubble follow as well: the lean is the app talking about itself,
     * and a control is not talk. Pressed, it is the app doing something, and
     * that is the voice every other button on this screen is set in.
     */
    const HIDE = () => `<button class="onb-hide" type="button" title="Hide the help cards"
        style="display: inline-flex; align-items: center; justify-content: center; height: 25.6px;
        padding: 0 12px; background: transparent; border: 1px solid ${look.softBorder};
        border-radius: 10.2px; font-family: inherit; font-style: normal; font-size: 11.8px;
        font-weight: 600; line-height: 1; color: ${look.softColor}; cursor: pointer;">Hide</button>`;

    /*
     * In the order they are shown, which is the order they come true in.
     *
     * `moment` is when the card has something to say that is on the screen:
     * two of them are always true — what the app is, and what it promises —
     * and the three in between wait for the thing they are about.
     *
     * `only` is the other question, and the width card is the one that has to
     * ask it: the moment can come on a device that has no corner at all. A card
     * can be ahead of its moment and still be worth reading; a card about
     * something that is not on the device is not.
     */
    const CARDS = [
        {
            id: 'start',
            moment: () => true,
            title: 'What is this app about?',
            body: () => text(`A gamified app for learning words. Test it out with <span style="position: relative; display: inline-block; font-weight: 800;">this${POINT_DOWN()}</span> flashcard set, or create your own.`),
            marks: () => `${POINT_UP()}${LABEL()}`
        },
        {
            id: 'colours',
            moment: answered,
            title: 'Words ripen with every repetition',
            body: () => {
                const stage = ramp();

                // Rung, arrow, rung, arrow: the pieces in the order they are
                // drawn, which is also the order they arrive in.
                const ladder = [];

                RUNGS.forEach((s, i) => {
                    if (i) ladder.push(arrow(AFTER(ladder.length)));

                    ladder.push(chip(stage[s].fill, stage[s].ink, AFTER(ladder.length)));
                });

                // More air under the heading than the other cards keep, because
                // what stands under it here is not a sentence but a picture, and
                // a picture butted up against a line of type reads as part of it.
                return `<div style="display: flex; align-items: center; justify-content: space-between; gap: 3.4px; margin-top: 6.8px;">${ladder.join('')}</div>
                    <div style="display: flex; justify-content: space-between; margin-top: 5.1px; ${AFTER(ladder.length)}">${note('new')}${note('learned')}</div>`;
            }
        },
        {
            /*
             * What used to stand under the rule on the colours card.
             *
             * That rule was the admission that the card held two things: above
             * it the ladder, which is one picture read left to right, and below
             * it three rows that are a legend and are read one at a time. A line
             * drawn between them says they do not belong together; two cards say
             * it and cost nothing, since paging is what the strip is for.
             *
             * The three are in the order a word lives them: dropped, then
             * counting down, then asking. The mistake is not a rung of the
             * ladder -- every colour on that card is somewhere a word climbed
             * to, and this is the one it was dropped to -- and the other two are
             * not about colour at all, which is why a legend of colours alone
             * explained the quiet half of the screen and none of the part that
             * waves.
             *
             * All three wear a colour from the middle of the ladder rather than
             * one of their own, so that what is different about a row is the
             * only thing that row is about.
             */
            /*
             * No title. Three rows that each say what they are is a card that
             * has already named itself, and a heading over them would be a
             * fourth line saying it a fourth time.
             */
            id: 'signs',
            moment: answered,
            body: () => {
                const stage = ramp();

                /*
                 * The badge a bubble wears while it waits, copied off the shelf
                 * down to the four pixels it hangs over the corner by. Two hours
                 * because it has to say something, and a round number reads as
                 * an example rather than as whatever this particular word
                 * happens to be waiting.
                 */
                const timer = `<span style="position: absolute; bottom: -5px; right: -4px; background: ${look.timerFill}; color: ${look.onTimer}; font-size: 9.2px; font-weight: 800; line-height: 1; padding: 1.5px 3.8px; border-radius: 10.2px; box-shadow: 0 2px 3.4px rgba(0,0,0,0.18); white-space: nowrap; letter-spacing: -0.2px;">2h</span>`;

                // The hop uses the same keyframes and the same duration the
                // bubbles do, because a demonstration at a tempo of its own is a
                // demonstration of something else.
                /*
                 * The stagger is on the rows and not on what is in them, which
                 * is what leaves the hopping chip its own animation: one element
                 * carrying two would have to declare both in one place, and the
                 * two have nothing to do with each other.
                 *
                 * A longer step than the ladder's, because these are three
                 * sentences and not seven pieces of one picture.
                 */
                return `${row(chip(look.damaged, look.failInk), 'a mistake — three steps back', 0, AFTER(0, 150))}
                    ${row(chip(stage[8].fill, stage[8].ink, 'position: relative;', timer), 'a timer — repeat it later', 10.2, AFTER(1, 150))}
                    ${row(chip(stage[8].fill, stage[8].ink, `animation: bounce ${look.bounce}ms ease-in-out infinite;`), 'a hop — ready to repeat', 10.2, AFTER(2, 150))}`;
            }
        },
        {
            id: 'width',
            moment: played,
            only: mouse,
            title: 'Pull the corner to resize the window',
            body: () => text('Double-click the corner to put the width back.'),
            marks: POINT_CORNER
        },
        {
            /*
             * A bubble off the shelf with every kind of mark on it at once, and
             * the four names under it with their own marks in front of them.
             *
             * It was four rows of legend before -- a mark, then what it means,
             * four times over -- which is a table of the parts with no picture
             * of the thing they are parts of. What a reader has in front of them
             * is a word with a row of dots under it, so that is what is drawn.
             *
             * The names are joined to the dots by repeating the dot rather than
             * by drawing a line to each: four lines from four marks nine pixels
             * apart to four words spread across the card travel as one bundle,
             * however they are bent, and what they cost in height they did not
             * earn in clarity. One arrow saying "and these are them" does that
             * job, and the mark printed in front of each name does the matching.
             *
             * That one arrow hooks round the left of the bubble rather than
             * dropping out of the bottom of it, which is what lets the names sit
             * almost against the bubble: a stroke that travels sideways asks for
             * no height at all, and the card is shorter by the corridor the old
             * one needed.
             *
             * It starts level with the dots and clear of the first one by
             * about the gap between two of them -- closer in, the stroke reads
             * as touching the row rather than as coming off it -- and ends level
             * with the names, pointing at the first of them:
             * both ends stand at the height of the thing they are about, so the
             * stroke reads as carrying one row down to the other. Between them
             * it goes the long way round, outside the bubble's left edge, where
             * there is nothing to cross.
             *
             * The arc is carried out as far as the text's own left edge, which
             * is not about the shape of it: that is the room the last stretch
             * needs to come in level and straight rather than still turning when
             * it arrives. Further out than that is the margin the paging press
             * owns, and a stroke in there would be a stroke somebody is about to
             * click.
             *
             * The air between the head and the first mark is made at the other
             * end instead -- the row of names is indented by the page's own
             * 27.3 -- because the arrow cannot give any of it: shortened, it
             * arrives still turning; moved left, it is in the margin.
             *
             * The far end hangs below the drawing's own box, which is what
             * `overflow: visible` is there for: the names are a row of their own
             * under the svg, and the stroke has to reach into it. It reaches
             * into the empty few pixels to the left of the first mark, so it
             * lands beside the row rather than on it.
             *
             * It is drawn in the accent, which is also what lets it start where
             * it does: coral on white is a line, while the ink this card writes
             * in is white in the dark theme and would not be there at all. The
             * accent is the app's colour for the thing to look at, and of
             * everything on this card the dots are that thing.
             *
             * One word per mark, too. "A repetition that was missed" is the true
             * name and it is four times the width of the thing it names; next to
             * the mark itself, "missed" is as much as needs saying.
             *
             * The marks come from the sprite in index.html, which is where the
             * shelf gets them, so these are the same dots and not a drawing of
             * them. White under them in both places, bubble and legend: the
             * marks are drawn in a near-black to be read on a pale bubble, and
             * white is the one ground that gives all four -- the dark, the red,
             * the small one and the ring -- their full contrast in either theme.
             *
             * The two words in the bubble stand upright while the rest of the
             * card leans. Everything else here is the app talking; those two are
             * a card of the reader's own, quoted, and a quotation set in the
             * voice of the page around it is not a quotation.
             */
            id: 'dots',
            moment: answered,
            title: 'Every review leaves a dot',
            body: () => {
                const stage = ramp()[8];

                const marks = [
                    { id: 'mark-dot-dark', size: 5, at: 43.5, name: 'right' },
                    { id: 'mark-dot-red', size: 5, at: 52.5, name: 'wrong' },
                    { id: 'mark-dot-dark', size: 3, at: 61.5, name: 'missed' },
                    { id: 'mark-ring-dark', size: 5, at: 70.5, name: 'early' }
                ];

                const dot = (m) => `<use href="#${m.id}" x="${m.at - m.size / 2}" y="${29 - m.size / 2}"
                    width="${m.size}" height="${m.size}" />`;

                const named = (m) => `<span style="display: inline-flex; align-items: center; gap: 5.1px;">
                        <span style="display: inline-flex; align-items: center; justify-content: center; width: 14.5px; height: 14.5px; flex: none; background: #ffffff; border-radius: 4.3px;">
                            <svg width="${m.size}" height="${m.size}" viewBox="0 0 10 10" style="display: block; overflow: visible;"><use href="#${m.id}" /></svg>
                        </span>
                        <span style="font-size: 9.7px; font-weight: 600; color: ${look.body};">${m.name}</span>
                    </span>`;

                return `<div style="position: relative;">
                        <svg width="110" height="70" viewBox="0 0 110 70" aria-hidden="true" style="display: block; overflow: visible;">
                            <rect x="14" y="0" width="86" height="52" rx="12" fill="#ffffff" />
                            <text x="57" y="19" text-anchor="middle" font-size="13.3" font-weight="800" font-style="normal" fill="${stage.ink}">hola</text>
                            ${marks.map(dot).join('')}
                            <text x="57" y="46" text-anchor="middle" font-size="13.3" font-weight="600" font-style="normal" fill="${stage.sub}">hello</text>
                            <path ${DRAW(520, 360)} d="M30 29C-8 38 -2 77 14 77" fill="none" stroke="${look.accent}" stroke-width="1.8" stroke-linecap="round" />
                            <path ${DRAW(190, 870)} d="M7.6 73.7 14 77 7.6 80.3" fill="none" stroke="${look.accent}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                        <div style="position: absolute; left: 112px; top: 1px; width: 170px;">${text('Each card tracks how your brain remembers the word.')}</div>
                        <div style="display: flex; align-items: center; gap: 10.2px; margin-left: 27.3px;">${marks.map(named).join('')}</div>
                    </div>`;
            }
        },
        {
            id: 'free',
            moment: () => true,
            title: 'Forever free for early adopters',
            body: () => `${text(PROMISE[0])}<div style="margin-top: 8.5px;">${text(PROMISE[1])}</div>`
        },
        {
            /*
             * The way out, printed on the strip itself.
             *
             * Everything above this card is the app explaining the screen, and
             * what a reader who has had enough of that wants is a button, not
             * directions to one. So the last card is the button, and what
             * stands over it is the one thing the button cannot say by itself:
             * that this is not a door locking behind them. The arrow goes to the
             * panel the switch lives in, and the switch is the mark at the head
             * of every card above -- which is the whole reason that mark is on
             * them.
             *
             * The first sentence is the heading and the second stands under
             * it, which is what the two of them are: one says what the card is
             * for, the other is the condition on it.
             *
             * Which is also the one arrangement the arrow can be drawn in. Run
             * together as a paragraph the two sentences wrapped, and they
             * wrapped between "in" and "Settings" -- so the word the arrow
             * comes from came out at the head of the second line, under the
             * middle of the first, and a stroke leaving it for the header
             * crossed out the line above on the way. Split, the line under the
             * heading is one short line of its own and that word is at the end
             * of it, with the empty corner of the card over it.
             *
             * The button stands in the middle. Under a line of type and flush
             * with its left edge it read as the next line of the paragraph; in
             * the middle of the card it is a thing of its own, which is what it
             * is -- the only thing in the strip that does something rather than
             * saying something.
             *
             * Its moment is always, like the promise card's: a reader is allowed
             * to want the strip gone on the first evening, and nothing has to
             * have happened for that to be true. Which does mean this card
             * brings the strip back once for everybody who had already read it
             * out -- see decide -- and that is the right way round: the one new
             * thing the strip has to say is that it can be sent away.
             */
            id: 'hide',
            moment: () => true,
            title: 'You can hide these tips',
            body: () => `${text(`They’re always available in <span style="font-weight: 800;">Settings</span>.`)}
                <div style="display: flex; justify-content: center; margin-top: 11.9px;">${HIDE()}</div>`,
            marks: POINT_SETTINGS
        }
    ];

    /* ------------------------------------------------------------------ *
     *  Drawing it
     * ------------------------------------------------------------------ */

    /*
     * The mark the strip and the button in the settings share. Not a button
     * here: it is the signature of the thing that button switches, and a round
     * question mark that answers a press with nothing is worse than no mark.
     *
     * At the head of the title, which is where the title can make room for it:
     * the heading is one short line, the mark is the height of it, and the two
     * read as one row. Tried in both corners of the card and brought back from
     * both -- hung over the margin that turns the page it was furniture among
     * furniture, and in the corner of the text it took a bite out of every line
     * that reached that far.
     *
     * Which means a card with no heading has no mark, and that is right: the
     * strip is signed where it speaks, and a card of three legends does not
     * speak.
     */
    const SIGN = () => `<span aria-hidden="true" style="display: inline-flex; align-items: center; justify-content: center; width: 20.5px; height: 20.5px; flex: none; border: 1px solid ${look.softBorder}; border-radius: 50%; font-size: 12.3px; font-weight: 700; line-height: 1; color: ${look.softColor};">?</span>`;

    const STEP = (back) => `<svg width="9" height="15" viewBox="0 0 9 15" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display: block;">
        <path d="${back ? 'M6.6 1.6 1.6 7.5 6.6 13.4' : 'M2.4 1.6 7.4 7.5 2.4 13.4'}" />
    </svg>`;

    /*
     * An arrow at each edge of the card, and where there is nothing to turn to
     * there is no arrow: the first card has only the one on the right, the last
     * only the one on the left.
     *
     * Gone rather than greyed. A mark drawn faint still has to be read before it
     * can be dismissed, and the two of them are side by side with the thing they
     * are the edge of; nothing at all is the one state that costs the eye
     * nothing. Where they stand is fixed, so none of this moves the card.
     *
     * The press is the whole side of the card and not the little chevron drawn
     * in the middle of it: the button runs the card's full height down its own
     * margin, where nothing is written, and the drawing sits in the middle of
     * that. A target thirteen pixels tall is a target to aim at, and nobody
     * reading a card wants to aim at anything.
     *
     * No counter and no row of pips either. The cards below carry dots that mean
     * something, one of these cards is about those dots, and a second meaning
     * for a dot on the same screen is a meaning lost.
     */
    const step = (back, off) => (off ? '' : `<button class="onb-step" data-back="${back ? 1 : 0}"
        title="${back ? 'Previous' : 'Next'}" aria-label="${back ? 'Previous card' : 'Next card'}"
        style="position: absolute; ${back ? 'left' : 'right'}: 4.3px; top: 0; bottom: 0; display: inline-flex;
        align-items: center; justify-content: center; width: 20.5px; padding: 0; background: transparent;
        border: none; color: ${look.softColor}; opacity: 0.75; cursor: pointer;">${STEP(back)}</button>`);

    /*
     * How long the card takes to grow or shrink into the next card's height.
     *
     * Two hundred, which is a little longer than the page turn inside it (180,
     * see onb-turn): the words are already the new card's while the box is
     * still becoming it, and a box that finished first would have waited for
     * them.
     */
    const GROW = 200;

    /*
     * The height of the card, eased from the height the last one had.
     *
     * The cards are different heights -- a legend of three rows is not a
     * sentence and neither is a drawn bubble -- and every page turn moved the
     * whole shelf under the strip by the difference, in one frame. The turn is
     * 180ms of the words sliding; the shelf jumping in the middle of it is the
     * one thing in that movement nobody asked for.
     *
     * Written in the browser's own numbers at both ends -- getComputedStyle
     * gives the height the box actually has, which is the content box here, and
     * reading the old card while its own transition is still running starts the
     * new one from wherever it had got to rather than from where it was going.
     *
     * Clipped while it moves, and only while it moves. A box that is still
     * growing has the new card's full height of content in it already, and
     * without the clip the last lines of it would stand outside the card on the
     * page. Nothing is lost to the clip: everything that hangs off this card --
     * the arrows at the window's corner, at the button, under the word -- is
     * drawn no earlier than 320ms, by which time the clip has been taken off
     * again. See DRAW.
     */
    function settle(card, was) {
        const now = getComputedStyle(card).height;

        if (!was || was === now) return;

        card.style.height = was;
        card.style.overflow = 'hidden';

        // The old height has to be the browser's idea of the current one before
        // the new one is asked for, or there is nothing to move between.
        void card.offsetHeight;

        card.style.transition = `height ${GROW}ms ease-out`;
        card.style.height = now;

        setTimeout(() => {
            card.style.transition = '';
            card.style.height = '';
            card.style.overflow = '';
        }, GROW + 40);
    }

    function paint(strip, cards) {
        const card = cards[place];
        const from = turn;

        // Measured before the card it belongs to is thrown away. Empty on the
        // first paint of a strip, which is a card arriving rather than one card
        // becoming another -- and a card that grew out of nothing on every
        // redraw of the catalog would be a strip that never stood still.
        const standing = strip.querySelector('.onb-card');
        const was = standing ? getComputedStyle(standing).height : '';

        turn = 0;

        mark(card);
        remember(card);

        /*
         * The card's own box is inside the strip rather than being it, because
         * the arrows stand in the padding of the strip and have to be positioned
         * against something that does not move when the card changes height.
         *
         * Side padding of 27.3 on the content: the arrow is 20.5 wide at 4.3
         * from the edge, and prose that ran under it would be prose with an
         * arrow printed on top of it.
         */
        /*
         * The whole card is set in italic -- heading, prose, the little legends
         * and the words on the stand-in bubbles alike.
         *
         * It is the one thing on the screen that is the app talking about
         * itself, and a lean is how a note in the margin has always been told
         * apart from the page it is written on. The strip's colour says the same
         * thing at arm's length; this says it in the sentence.
         */
        strip.innerHTML = `<div class="onb-card" style="position: relative; font-style: italic; background: ${look.cardBg}; border: 1px solid ${look.cardBorder}; border-radius: 15.4px; padding: 13.7px 27.3px;">
                ${card.title ? `<div class="onb-head" style="display: flex; align-items: center; gap: 8.5px; margin-bottom: 8.5px;">
                    ${SIGN()}
                    <span style="font-size: 13.3px; font-weight: 700; line-height: 1.2; color: ${look.heading};">${card.title}</span>
                </div>` : ''}
                <div class="onb-body"${from ? ` style="--onb-from: ${from > 0 ? 10 : -10}px; animation: onb-turn 180ms ease-out;"` : ''}>${card.body()}</div>
                ${card.marks ? card.marks() : ''}
            </div>
            ${step(true, place === 0)}
            ${step(false, place === cards.length - 1)}`;

        settle(strip.querySelector('.onb-card'), was);

        strip.querySelectorAll('.onb-step').forEach(btn => btn.addEventListener('click', () => {
            turn = btn.dataset.back === '1' ? -1 : 1;
            place = Math.min(Math.max(place + turn, 0), cards.length - 1);
            paint(strip, cards);
        }));

        /*
         * And the press that sends the whole strip away, which is on one card of
         * the set -- hence the question before the listener.
         *
         * It goes through the same toggle the switch in the settings goes
         * through, so there is one place where the strip is sent away and one
         * answer written down. What is different about this press is only that
         * the reader is looking at the thing being switched rather than at the
         * switch.
         */
        const away = strip.querySelector('.onb-hide');

        if (away) away.addEventListener('click', () => {
            onboarding.toggle();

            if (redraw) redraw();
        });
    }

    /*
     * Drawn is read, from the moment there is something to see.
     *
     * A card the reader paged past without looking at is a card they were shown,
     * which is all this mark has ever claimed — and a strip standing on the same
     * card for ever because nobody pressed an arrow is the thing it exists to
     * prevent.
     *
     * Before its moment, nothing is written. The colours card read on the first
     * evening is a ladder beside an empty shelf: it was looked at, and it has
     * still not been shown the thing it is about, so it keeps its right to turn
     * up by itself on the day there are colours out there.
     */
    function mark(card) {
        if (read.has(card.id) || !card.moment()) return;

        read.add(card.id);
        save('onboardingRead', Array.from(read));
    }

    /*
     * And where they are, written down as soon as they are there rather than on
     * the way out: there is no way out to hang it on. A popup is closed by a
     * click somewhere else entirely, and the page is simply gone.
     *
     * Only when it changes, because the catalog redraws itself for its own
     * reasons -- a sound muted, a form opened -- and each of those comes through
     * here with the same card standing in the same place.
     */
    function remember(card) {
        if (at === card.id) return;

        at = card.id;
        save('onboardingAt', at);
    }

    // Every card this device can show, which is all of them unless the device
    // has nothing to show -- see `only`. Not "every card that is due": the strip
    // is a booklet and the arrows go through the whole of it.
    function here() {
        return CARDS.filter(card => !card.only || card.only());
    }

    /*
     * Whether the strip is on the screen, and where it opens — the question that
     * is asked once a page. The written answers come first: a reader who
     * switched it off is not shown it because something new turned up, and one
     * who switched it on is shown it with everything read.
     *
     * Where it opens has three answers, in this order.
     *
     * The card the reader was left on, if that card is still unread: it is the
     * page they had open, and nothing it has to say has been said yet. This is
     * the whole of what the memory is for -- six cards are not read in one
     * sitting, and a booklet that falls open at page one every time is one
     * nobody finishes.
     *
     * Otherwise the first unread card whose moment has come, which is the rule
     * the strip is built on: the colours the moment there are colours on the
     * screen, the corner the moment a game has been drawn at some width.
     * Having read the card they stopped on, the reader is done with it, and
     * what is left is whatever the strip is up for today.
     *
     * And failing that, where they were anyway -- a strip standing only because
     * the switch in the settings asked for it has nothing due, and the last card
     * read is still better than the first card written. Nought is for a reader
     * with no page of their own: the first visit, and the press of the switch,
     * which starts the booklet over on purpose (see toggle).
     */
    function decide(cards) {
        if (live !== null) return;

        // The first card with something to say that has not been said: what the
        // strip is here for today. Nought when there is no such card, which is
        // either a strip somebody asked to see again or no strip at all.
        const due = cards.findIndex(card => !read.has(card.id) && card.moment());
        const kept = cards.findIndex(card => card.id === at);

        live = want === false ? false
            : want === true ? cards.length > 0
                : due >= 0;

        place = kept >= 0 && !read.has(cards[kept].id) ? kept
            : due >= 0 ? due
                : Math.max(0, kept);

        turn = 0;
    }

    /* ------------------------------------------------------------------ *
     *  What the catalog uses
     * ------------------------------------------------------------------ */

    // Everything the strip wears, from the catalog's own palette: it is a card
    // in the list and has to be the same card as the sets are. `ramp` and
    // `bounce` are the bubbles' own colour scale and the tempo of their hop,
    // which the colours card is a legend for.
    onboarding.setLook = (value) => { look = value || {}; };

    /*
     * Handed in once per arrival at this screen -- at boot, and again when the
     * browser's Back button serves the catalog out of the bfcache -- which is
     * also the one moment the question below should be asked again. A page
     * restored whole has the same `live` it was frozen with, and a game played
     * in between is exactly what opens the next card.
     */
    onboarding.setSession = (value) => {
        session = value;
        live = null;
    };

    // Handed over once, where the catalog wires the strip up: the hide button
    // on the last card needs the screen drawn again without the strip in it,
    // and that is the catalog's own business.
    onboarding.setRedraw = (fn) => { redraw = fn; };

    onboarding.setSaved = (settings) => {
        want = settings && 'onboarding' in settings ? !!settings.onboarding : null;

        at = (settings && settings.onboardingAt) || null;

        read.clear();
        ((settings && settings.onboardingRead) || []).forEach(id => read.add(id));

        live = null;
    };

    // For the button in the settings, which is a switch and has to show which
    // way it is thrown.
    onboarding.showing = () => {
        decide(here());
        return !!live;
    };

    /*
     * The switch. It answers the question the strip asks once a page, so the
     * catalog has only to draw itself again afterwards.
     *
     * Switching it on puts the strip at its first card rather than at the first
     * unread one: asking for it back is asking for the whole of it, and what a
     * reader most often wants back is the colours, which are early.
     */
    onboarding.toggle = () => {
        want = !onboarding.showing();
        save('onboarding', want);

        live = null;
        decide(here());
        place = 0;

        return want;
    };

    onboarding.promise = () => PROMISE;

    /*
     * Draw the strip, or draw nothing. Between the header and the list, which
     * is where it is called from — see render in catalog.js.
     *
     * Nothing under it. What stands between the strip and the first set is the
     * list's own 6.8, because adjacent margins down a block column collapse to
     * the larger of the two and the list's is the larger — a number written
     * here would be invisible under 6.8 and a gap the cards below do not have
     * over it.
     *
     * Nought in particular rather than merely small, because the catalog pulls
     * this margin negative to slide the new-set form up over the strip, and
     * collapsing is not linear across zero: a margin that starts positive
     * spends the first pixels of that slide being collapsed away instead of
     * moving anything, which is a form growing while nothing under it stirs.
     * See coverStrip in catalog.js.
     */
    onboarding.at = (parent) => {
        const cards = here();

        decide(cards);

        if (!live || cards.length === 0) return null;

        place = Math.min(place, cards.length - 1);

        const strip = $(parent, `<div class="onb-strip" style="position: relative; margin: 6.8px 0 0;"></div>`);

        paint(strip, cards);

        return strip;
    };
}
onboarding();
