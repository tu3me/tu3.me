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
 *   the strip stands on the screen until the reader sends it away, and where
 *     it opens is decided by what they have read and where they left it — see
 *     decide.
 *
 * Which gives the two behaviours the hand and the corner were written for, for
 * free. The colours card is where the strip goes at the moment there is a
 * colour on the screen, which is exactly where the hand used to come in, and
 * the corner card at the moment the corner used to start blinking. For a reader
 * who never presses an arrow the strip advances by itself: the next visit opens
 * on the next card that has something to say.
 *
 * Going away is the one thing it does not do by itself, and it used to. Once
 * every card whose moment had come had been drawn there was nothing left to
 * say, and the strip retired — which is what the hand and the blinking did, and
 * why it was written that way. But those two had no way of being sent away and
 * no way of being brought back; retiring on their own was the only mercy either
 * of them could offer. This has both, the cross on every card and the switch
 * in the settings, and from the moment a reader can say "enough", the
 * app saying it for them is the app taking back a decision it had handed over.
 * So the strip stands until it is sent away, and what the moments decide is
 * only which card it stands on.
 *
 * Reading ahead costs nothing, and that is why the moment governs the read-mark
 * as well. Somebody who pages through the whole thing on the first evening has
 * looked at a ladder of colours with no colours on the screen yet; that is
 * theirs to do, and the card still arrives by itself on the day it means
 * something. What the moments decide is only where the strip opens — never
 * what the reader is allowed to look at, and never whether it is there at all.
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
 * Catalog only: nothing on a game page builds one of these.
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
     * Two of the three mean the same thing on the screen -- the strip stands
     * unless it was sent away -- and they are kept apart anyway, because asking
     * for it back is not the same as never having said anything: a reader who
     * presses the switch gets the booklet from its first card, and one who has
     * never touched it gets the page they were left on. See toggle and decide.
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
     * strip of cards is read a few at a time -- the popup is shut by a
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
     * How to take the strip off the screen, handed in by the catalog -- see
     * onboarding.setSendAway.
     *
     * The cross on every card is the switch in the settings worded the other
     * way round, and what follows a press on it is the catalog's to do: the
     * card flies into the gear the switch lives behind, and the screen is drawn
     * again without the strip. Handed in rather than called for, because the
     * knowing in this pair goes one way -- the catalog owns the screen and
     * tells the strip things, and a strip that reached into the catalog would
     * be the second half of a circle.
     */
    let sendAway = null;

    /*
     * What the app promises the people who are here now. Said in the "All
     * games" dialog as well until 29 October 2026, when the dialog went, with
     * a second line after it -- "More games to help you remember words are
     * coming soon" -- that the card left out: it is about games that are
     * coming, and the game that is coming is a tile on every set's row now.
     *
     * The words are in i18n.js with the rest of what the cards say.
     */

    // Has anything, anywhere, ever been answered. Asked of the words rather than
    // kept as a flag, so it answers itself: the first repetition ever recorded
    // opens the card about colours, and clearing the data closes it again.
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

    /*
     * A bubble standing in for the ones on the cards below, at the size they are
     * drawn there. The whole job of the colours card is recognising the thing
     * outside it, and a swatch shrunk to fit a sentence is a swatch that has to
     * be matched up rather than simply seen.
     */
    /*
     * Except where the word itself does not fit. Four of these and three arrows
     * are measured to the width of the card with a word of four letters in them,
     * and "слово" at that size already pushes the row out of it. Five letters and more
     * give up the side padding and a size, which is the smallest change that keeps
     * four of them on the card, and the one bubble on the screen that is a
     * picture of the others can afford it.
     */
    const chip = (fill, ink, extra) => {
        const word = tr('onbWord');
        const long = word.length > 4;

        return `<span style="display: inline-flex; align-items: center; justify-content: center; background: ${fill}; color: ${ink}; border-radius: 12px; padding: 5.1px ${long ? 4.3 : 8.5}px; font-size: ${long ? 10.8 : 13.3}px; font-weight: 800; line-height: 1.15; ${extra || ''}">${word}</span>`;
    };

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
     * the eye that is reading and once to the eye that is not. It is on the
     * last line of the paragraph at the width this app is drawn at, so the
     * arrow has nothing but air to cross; a line of prose under it would be
     * crossed out by it.
     *
     * It runs past the bottom of the strip and lands on the set itself, a few
     * pixels above its title. Ending at the strip's own edge, which is where it
     * stopped before, left the eye at a gap with the thing being pointed at on
     * the far side of it -- near enough to guess and not pointed at. A stroke
     * that laps onto the card hands the eye over instead, and the gap between
     * the two is the one place on this screen where there is room to do it
     * without crossing anything.
     *
     * Which is also the one mark here that has to be lifted: the set is drawn
     * after the strip and would otherwise be drawn over the end of it. `z-index`
     * on the mark alone, not on the strip, because the strip standing above the
     * list is the strip becoming a thing in front of the cards rather than the
     * first of them.
     *
     * The upward one comes out of a plus in a circle, the plus on the New set
     * button drawn in the hand of the arrow, and goes up into that button in a bow,
     * the owner's call, 4 November 2026. Until then it rose from
     * the word "create", written beside it in strokes: a word nobody could translate,
     * on a card that is otherwise in the reader's language. A sign says the same in
     * all of them.
     *
     * The circle stands a little to the right of the button's middle, and that is what
     * gives the stroke its length and its bend: it leaves the circle on a slant up and
     * to the left and straightens as it goes, arriving all but upright under the middle
     * of the button. Whatever the button says and however wide that makes it, so where
     * they stand is measured on the page -- see aim. The head lies along the last of
     * the shaft, so its two strokes come out uneven against the page, as a hand's do.
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
     * the corner of the window, the row of names -- and
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
    const UP_TIP = 18;
    const UP_SIGN = 20;
    const UP_SIGN_ASIDE = 15;

    const DRAW = (ms, delay) => `pathLength="1" stroke-dasharray="1 2" style="animation: onb-draw ${ms}ms ease-out ${delay}ms both;"`;

    /*
     * A fade, handed out down a card so that its parts arrive one after
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
    const AFTER = (i) => `animation: onb-mark 220ms ease-out ${60 + i * 90}ms both;`;

    /*
     * Every mark drawn by hand on a card -- the arrows and the circle under the
     * first one -- is an `onb-point`, so that the new-set form can put them
     * away when it covers the strip. They are what the form cannot cover: each
     * reaches out of its card, and two stand above the list on purpose. See
     * onb-point in app.css.
     */
    const POINT_UP = () => `<svg width="24" height="25" viewBox="0 0 24 25"
        fill="none" stroke="${look.body}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
        class="onb-point onb-up" aria-hidden="true" style="display: block; position: absolute; right: 58.5px; top: -8.5px;">
        <path ${DRAW(360, 620)} d="M19 23.5C13.5 20 7.5 13 6 3" />
        <path ${DRAW(170, 970)} d="M3.7 9.6 6 3 10.2 8.6" />
    </svg>`;

    /*
     * And what it comes out of: what the button it points at is for.
     *
     * Written rather than constructed. A circle and two ruled lines are an icon, and
     * an icon on this card is a second voice; so the circle is one stroke, not quite
     * round, whose end runs a little past its beginning at the top, where the arrow
     * leaves it, and the two strokes of the plus lean and bend a little.
     *
     * Drawn in the order a hand would, before the arrow: a stroke setting out from
     * nothing is a stroke with nothing to say. In the ink and the line of the arrow and
     * the sentence, so that the three are plainly one hand. It stands level with the
     * heading, to the right of it, where the card has air; aim keeps the heading from
     * reaching it.
     */
    const PLUS_SIGN = () => `<svg width="${UP_SIGN}" height="${UP_SIGN}" viewBox="0 0 20 20"
        fill="none" stroke="${look.body}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
        class="onb-point onb-up-sign" aria-hidden="true" style="display: block; position: absolute; right: 51.5px; top: 13px;">
        <path ${DRAW(300, 120)} d="M12.8 2.9C8.2 .9 2.6 3.6 1.9 9.1 1.2 14.6 5.1 18.7 10.3 18.4 15.4 18.1 18.7 13.6 18.1 8.9 17.6 5 14.2 1.7 8.9 1.9" />
        <path ${DRAW(90, 420)} d="M10.6 5.6C10 8.4 9.6 11.2 9.8 14.7" />
        <path ${DRAW(90, 520)} d="M5.4 10.9C8.2 9.9 11.4 9.5 14.6 9.8" />
    </svg>`;

    const POINT_DOWN = () => `<svg width="19" height="36" viewBox="0 0 19 36"
        fill="none" stroke="${look.body}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
        class="onb-point" aria-hidden="true" style="display: block; position: absolute; left: 50%; margin-left: -9.5px; top: 100%; z-index: 7;">
        <path ${DRAW(500, 500)} d="M9.6 2.4c2.8 9.6 2.4 20.8-.9 31.2" />
        <path ${DRAW(150, 1010)} d="M4.1 27.8 8.7 34.2 13.5 28.2" />
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
        class="onb-point" aria-hidden="true" style="display: block; position: absolute; left: -8.6px; top: -44.5px; z-index: 7;">
        <path ${DRAW(560, 320)} d="M22 69C17 58 6.5 44 6.5 20L6.5 6" />
        <path ${DRAW(200, 870)} d="M3.2 12.2 6.5 6 9.8 12.2" />
    </svg>`;

    /*
     * In the order they are shown, which is the order they come true in.
     *
     * `moment` is when the card has something to say that is on the screen:
     * two of them are always true — what the app is, and what it promises —
     * and the two in between wait for the thing they are about.
     *
     * `only` is the other question, and the width card is the one that has to
     * ask it: the moment can come on a device that has no corner at all. A card
     * can be ahead of its moment and still be worth reading; a card about
     * something that is not on the device is not.
     *
     * What a bubble says besides its colour, and what the dots under the word
     * are, had a card each until 4 November 2026: the menu behind the eye on a
     * set's card names them now, the marks drawn beside their names, and it is
     * there when the reader wants to know (the owner's call).
     */
    const CARDS = [
        {
            id: 'start',
            moment: () => true,
            title: () => tr('onbStartTitle'),
            body: () => text(tr('onbStartBody', { this: `<span class="onb-this" style="position: relative; display: inline-block; font-weight: 800;">${tr('onbThis')}${POINT_DOWN()}</span>` })),
            marks: () => `${POINT_UP()}${PLUS_SIGN()}`
        },
        {
            id: 'colours',
            moment: answered,
            title: () => tr('onbColoursTitle'),
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
                    <div style="display: flex; justify-content: space-between; margin-top: 5.1px; ${AFTER(ladder.length)}">${note(tr('onbNew'))}${note(tr('onbLearned'))}</div>`;
            }
        },
        {
            id: 'width',
            moment: played,
            only: mouse,
            title: () => tr('onbWidthTitle'),
            body: () => text(tr('onbWidthBody')),
            marks: POINT_CORNER
        },
        {
            /*
             * One word of the heading in the mint, and it is the word the card
             * is about: everything else on this card is the condition on it.
             * The strip is the app talking about itself in a quiet voice, so
             * there is nothing else here to compete with a single coloured
             * word.
             *
             * The mint rather than the coral, because the two are not
             * interchangeable here: coral is the colour of the thing to press
             * and of the answer that was wrong, mint of progress and of what
             * went right -- see `ok` in tokens.js. This word is good news and
             * nothing to press, which is the mint's half of that pair.
             *
             * The heading is built rather than written out, for the reason the
             * bodies are: a card that names a colour has to be made when the
             * colours are known, and the strip is handed those -- see setLook.
             */
            id: 'free',
            moment: () => true,
            title: () => tr('onbFreeTitle', { free: `<span style="color: ${look.ok};">${tr('onbFreeWord')}</span>` }),
            body: () => text(tr('onbPromise'))
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
     *
     * A ring of two and an upright glyph, on a card that is otherwise a
     * hairline box full of italics. Both say the same thing: this is a
     * signature and not a word. Drawn in the same hairline as the card's own
     * edge it was furniture among furniture, and leaning with the heading it
     * was the first letter of it.
     *
     * Border-box, so the weight goes inwards: the circle keeps the measure the
     * line of type beside it has, instead of growing by the thickness of its
     * own edge.
     *
     * The ring is the ink the glyph inside it is written in, not the colour the
     * card's own edge is drawn in. Those are two different jobs: the card's edge
     * is there to be found when looked for, and this is meant to be recognised
     * across the screen -- it is the one thing tying the cards to the switch in
     * the settings that takes them away. In the strip's own two colours there is
     * nothing brighter to have: the ramp and the accent belong to the bubbles,
     * and a signature in the accent is a second voice.
     */
    const SIGN = () => `<span aria-hidden="true" style="display: inline-flex; align-items: center; justify-content: center; width: 20.5px; height: 20.5px; flex: none; box-sizing: border-box; border: 2px solid ${look.softColor}; border-radius: 50%; font-style: normal; font-size: 12.3px; font-weight: 700; line-height: 1; color: ${look.softColor};">?</span>`;

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
     */
    const step = (back, off) => (off ? '' : `<button class="onb-step" data-back="${back ? 1 : 0}" data-press="${back ? 'back' : 'next'}"
        title="${tr(back ? 'onbPrev' : 'onbNext')}" aria-label="${tr(back ? 'onbPrevCard' : 'onbNextCard')}"
        style="position: absolute; ${back ? 'left' : 'right'}: 4.3px; top: 0; bottom: 0; display: inline-flex;
        align-items: center; justify-content: center; width: 20.5px; padding: 0; background: transparent;
        border: none; color: ${look.softColor}; opacity: 0.75; cursor: pointer;">${STEP(back)}</button>`);

    /*
     * How many cards there are and which one this is: a dot for each across the
     * top of the card, the owner's call, 4 November 2026. As many as this device
     * shows -- see here -- and the one standing here in the ink, the rest faint.
     *
     * Out of the flow, in the air the card keeps above its heading. Not pressable:
     * the arrows are what turns a card, and a target this small would only be
     * something to miss.
     *
     * That air is 18.8 where the card keeps 13.7 under its text, the owner's call.
     * In the 13.7 the dots stood right on top of the heading: a card a few pixels
     * taller is the price of their having some room under them as well as over.
     *
     * There were none for a while on purpose, because one of these cards was
     * about the dots under a word, and a second meaning for a dot on the same
     * screen was a meaning lost. That card is gone.
     *
     * Their top is level with the top of the cross in the other corner, so that
     * the two stand the same distance from the edge -- the owner's call. The ink
     * of the cross starts 9.25 down: 3.4 to its box, 5.25 to the drawing in the
     * middle of it, and 0.6 to the end of its stroke. One less here, because this
     * is measured inside the card's border and that from outside it.
     */
    const PIP = 4.4;
    const PIP_TOP = 8.25;
    const PIP_ROOM = 18.8;

    const pips = (count, here) => `<div class="onb-pips" role="img" aria-label="${tr('onbCardOf', { n: here + 1, of: count })}" style="position: absolute; top: ${PIP_TOP}px; left: 0; right: 0; display: flex; justify-content: center; gap: 4.3px; pointer-events: none;">
            ${Array.from({ length: count }, (_, i) => `<span style="display: block; width: ${PIP}px; height: ${PIP}px; border-radius: 50%; background: ${look.softColor}; opacity: ${i === here ? 1 : 0.3};"></span>`).join('')}
        </div>`;

    /*
     * The press that sends the strip away, on every card.
     *
     * It was a card of its own until 26 October 2026: the last one, saying the
     * tips could be hidden, with a Hide button under it and an arrow to the
     * gear. A way out at the end of six cards is a way out for whoever reads to
     * the end, and the reader who wants the strip gone is the one who stopped
     * reading -- on the first card as often as anywhere. So every card carries
     * it, in the corner where every panel this reader has ever closed had one.
     *
     * What the old card said in words, the press now shows: the card flies into
     * the gear and the gear swells, and that is where the strip can be had back.
     * See sendAway.
     *
     * In the strip's corner, over the top of the margin the Next press owns,
     * and above it: the chevron there stands in the middle of the card's
     * height, and the corner is the part of that margin nobody is aiming at.
     * The chevrons' ink and their three quarters, because the three of them
     * are the strip's furniture and not what it says.
     */
    const CLOSE = () => `<button class="onb-close" type="button" title="${tr('hideHelp')}" aria-label="${tr('hideHelp')}"
        style="position: absolute; top: 3.4px; right: 3.4px; z-index: 1; display: inline-flex; align-items: center;
        justify-content: center; width: 20.5px; height: 20.5px; padding: 0; background: transparent; border: none;
        color: ${look.softColor}; opacity: 0.75; cursor: pointer;"><svg width="10" height="10" viewBox="0 0 10 10"
        fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"
        style="display: block;"><path d="M1.5 1.5 8.5 8.5M8.5 1.5 1.5 8.5" /></svg></button>`;

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
    /*
     * The two marks that are aimed at something, aimed once the card is on the page.
     *
     * The head of the stroke up to the New set button stands under the middle of the
     * button, and the circle it comes out of a fixed step to the right of that. The word
     * on the button is whatever the language calls it, so that middle is measured. A
     * heading that reaches as far as the circle wraps before it gets there: the room is
     * taken on this card only, and a wrapped heading only moves the sentence down.
     *
     * The stroke down to the set hangs off the one word that points at it, and was
     * written knowing that word ends the paragraph at this width. In another language
     * it can be anywhere in it, and the stroke would cross out the lines below. It
     * starts under the last line instead, under the word: the eye still goes from
     * the heavy word down, and nothing is crossed.
     */
    function aim(strip) {
        const card = strip.querySelector('.onb-card');
        const up = card.querySelector('.onb-up');
        const button = document.getElementById('add-set-btn');

        if (up && button) {
            const middle = appRect(button);
            const centre = appRect(card).right - 1 - (middle.left + middle.width / 2);

            const sign = centre - UP_SIGN_ASIDE - UP_SIGN / 2;

            up.style.right = `${centre - UP_TIP}px`;
            card.querySelector('.onb-up-sign').style.right = `${sign}px`;
            card.querySelector('.onb-head').style.paddingRight = `${sign + UP_SIGN - 27.3 + 4}px`;
        }

        const word = card.querySelector('.onb-this');

        if (word) {
            const drop = appRect(card.querySelector('.onb-body')).bottom - appRect(word).bottom;

            if (drop > 2) word.querySelector('.onb-point').style.top = `calc(100% + ${drop}px)`;
        }
    }

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

    /*
     * A heading, which is a plain string on every card but one.
     *
     * The exception is the card with a coloured word in it, and it is written
     * as a function for the reason every body is: the strip is handed its
     * colours rather than knowing them -- see setLook -- so anything naming one
     * has to be built at the moment of drawing and not at the moment this file
     * is read.
     */
    const heading = (card) => (typeof card.title === 'function' ? card.title() : card.title);

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
        strip.innerHTML = `<div class="onb-card" style="position: relative; font-style: ${tr.italic()}; background: ${look.cardBg}; border: 1px solid ${look.cardBorder}; border-radius: 15.4px; padding: ${PIP_ROOM}px 27.3px 13.7px;">
                ${pips(cards.length, place)}
                ${card.title ? `<div class="onb-head" style="display: flex; align-items: center; gap: 8.5px; margin-bottom: 8.5px;">
                    ${SIGN()}
                    <span style="font-size: 13.3px; font-weight: 700; line-height: 1.2; color: ${look.heading};">${heading(card)}</span>
                </div>` : ''}
                <div class="onb-body"${from ? ` style="--onb-from: ${from > 0 ? 10 : -10}px; animation: onb-turn 180ms ease-out;"` : ''}>${card.body()}</div>
                ${card.marks ? card.marks() : ''}
            </div>
            ${step(true, place === 0)}
            ${step(false, place === cards.length - 1)}
            ${CLOSE()}`;

        aim(strip);
        settle(strip.querySelector('.onb-card'), was);

        strip.querySelectorAll('.onb-step').forEach(btn => btn.addEventListener('click', () => {
            turn = btn.dataset.back === '1' ? -1 : 1;
            place = Math.min(Math.max(place + turn, 0), cards.length - 1);
            paint(strip, cards);
        }));

        /*
         * And the press that sends the whole strip away.
         *
         * It goes through the same toggle the switch in the settings goes
         * through, so there is one place where the strip is sent away and one
         * answer written down. What is different about this press is only that
         * the reader is looking at the thing being switched rather than at the
         * switch -- which is why what follows it shows them where the switch
         * is. See sendAway.
         */
        strip.querySelector('.onb-close').addEventListener('click', () => {
            onboarding.toggle();

            if (sendAway) sendAway(strip);
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

        // Which cards are reached, and in what order, is the onboarding's
        // funnel -- see docs/BACKEND.md.
        track('onb_show', card.id);
    }

    // Every card this device can show, which is all of them unless the device
    // has nothing to show -- see `only`. Not "every card that is due": the strip
    // is a booklet and the arrows go through the whole of it.
    function here() {
        return CARDS.filter(card => !card.only || card.only());
    }

    /*
     * Whether the strip is on the screen, and where it opens — the question that
     * is asked once a page.
     *
     * It is on the screen unless it was sent away. That is the whole of the
     * first half now: the strip used to take itself off once everything due had
     * been read, and the reader is the one who decides that -- see the head of
     * this file, where the two things it replaced are what the old rule was
     * copied from.
     *
     * Where it opens has three answers, in this order.
     *
     * The card the reader was left on, if that card is still unread: it is the
     * page they had open, and nothing it has to say has been said yet. This is
     * the whole of what the memory is for -- the cards are not read in one
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

        live = want !== false && cards.length > 0;

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
    // which the colours card is a legend for, and `ok` is the app's mint, which
    // one word of one heading is written in.
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

    // Handed over once, where the catalog wires the strip up: the cross on a
    // card needs the strip shown into the gear and the screen drawn again
    // without it, and both are the catalog's own business. Called with the
    // strip, which is already switched off by then.
    onboarding.setSendAway = (fn) => { sendAway = fn; };

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

        // Off on the card it was sent away from, which is where the funnel ends.
        track(want ? 'onb_on' : 'onb_off', at);

        live = null;
        decide(here());
        place = 0;

        return want;
    };

    /*
     * The mark itself, for the catalog to send the strip away as: a card sent
     * away shrinks into this mark beside the cross that was pressed, and the
     * mark flies into the gear -- see flyToGear in catalog.js. Asked for here
     * rather than drawn there, because it has to be the mark every heading
     * wears and the switch in the settings is drawn as, and not a copy of it.
     */
    onboarding.sign = () => SIGN();

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
