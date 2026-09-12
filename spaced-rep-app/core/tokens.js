/**
 * Colours for the sandbox, taken off the reference mock-up.
 *
 * The dark theme is the point of it: a deep sea-navy rather than the usual
 * blue-grey, with surfaces lifted in the same hue instead of towards black. The
 * light theme answers it with warm cream, so the two are complementary rather
 * than one being the other inverted.
 *
 * Two colours carry everything: coral for the thing you press and for what went
 * wrong, mint for progress and for what went right. Both are the same value in
 * either theme — a colour that shifts with the theme is two colours, and these
 * two mean something. Mint doing double duty is deliberate: a filling progress
 * bar and a correct answer mean the same thing to a player.
 *
 * Being mid-light, they belong on fills, borders and rings rather than on text
 * over a light surface, where they drop to about 2:1. Each screen places them
 * accordingly.
 *
 * Each screen still maps these onto its own parts; nothing here knows what a
 * word bubble or a snake body is. The bubbles keep their own stage ramp, since
 * their colour carries meaning and must not follow the theme.
 */
function tokens() {
    const DARK = {
        ground: '#0f2b3c',
        surface: '#1a4154',      // cards, quiz options — lifted in the same hue
        soft: '#16384a',         // tracks, chips, inputs
        border: '#2a5568',
        ink: '#eef6f7',
        muted: '#9bb4c1',

        // The two colours of the app, the same in both themes: one coral, one
        // mint. Deliberately not theme-tuned — a colour that shifts when the
        // theme does is two colours, and these two carry meaning.
        accent: '#ef6f5a',       // coral: the button you press
        onAccent: '#ffffff',
        progress: '#56c4a6',     // mint: progress, and what went right

        // The same mint taken deep enough to be a surface. Light mint carries
        // white text at 2.1:1, which is not readable at any size, let alone on a
        // 10px badge; this is the same hue at 4.6:1. Kept apart from `progress`
        // rather than replacing it, because cards and snake use that one for
        // text on a dark card, where going dark would break them.
        //
        // One value for both themes: it is a filled shape with white on it
        // either way, and it reads on the cream card as well as on the navy one.
        progressFill: '#1f8469',

        // Right and wrong are those same two: mint for what went well, coral for
        // what did not.
        ok: '#56c4a6',
        err: '#ef6f5a'
    };

    const LIGHT = {
        // A soft grey-green: the mint's hue, but at a fifth of its saturation,
        // so it reads as a neutral with a cast rather than as a pale mint. The
        // saturated version was tried and thrown out — at 56% it turns clinical,
        // and the page should be the quietest thing on screen.
        //
        // soft and border keep their old distances from the ground; muted is set
        // by contrast instead, because it is the one that carries text. It sits
        // on the white card and on the ground both, and at 6.06 and 4.59 it now
        // clears 4.5 on each — which the warm muted it replaces never did on the
        // ground (4.08).
        ground: '#d5e3df',
        surface: '#ffffff',
        soft: '#d9e5e2',
        border: '#c3d6d0',
        ink: '#153040',
        muted: '#516761',

        accent: '#ef6f5a',
        onAccent: '#ffffff',
        progress: '#56c4a6',
        progressFill: '#1f8469',

        ok: '#56c4a6',
        err: '#ef6f5a'
    };

    tokens.of = (isDark) => (isDark ? DARK : LIGHT);

    /*
     * The bubble ramp: one colour per stage, thirteen of them, the same thirteen
     * in both themes.
     *
     * A flower coming on. Stone grey while the word is a seed and nothing has
     * happened to it; then it yellows, greens, cools into blue and opens into
     * violet.
     *
     * Pastel the whole way: lightness never leaves the 0.80-0.89 band, so no
     * step along the arc turns vivid. Saturation still rises a little towards
     * the violet end, and lightness drops a little, but only as a hint — enough
     * to help tell two neighbours apart, nowhere near enough to let the late
     * stages shout over the early ones.
     *
     * That hint is doing real work, not decoration. Thirteen steps of hue alone
     * put neighbours a few degrees apart in the middle of the arc, where they
     * stop being tellable apart and the series stops meaning anything; with
     * lightness moving too, any two neighbours differ in two ways at once. It is
     * also the reason the band is a band rather than a single value: flat
     * lightness across thirteen pastel steps reads as one colour with the hue
     * wobbling, not as a series.
     *
     * Generated rather than picked one by one, for the same reason: thirteen
     * colours chosen by eye drift, and the drift always shows up as two
     * neighbours that have quietly become the same colour.
     *
     * Two corrections on top. Hue is spaced for the eye rather than by degrees —
     * yellow and green change fast, blue through violet slowly — and lightness
     * is pulled down across the yellows, which otherwise read brighter than
     * everything around them. The yellow end starts saturated rather than
     * building up from nothing, because a pale yellow at low saturation is a
     * beige and the point of those stages is that the word has begun to ripen.
     *
     * Saturation, incidentally, is not what makes a colour loud here: lightness
     * is. These fills are saturated and still soft, because they are light.
     *
     * Deliberately not theme-aware. A stage means the same thing whichever theme
     * is on, and a word that changed colour when the theme was toggled would be
     * saying otherwise. The fills are pale with dark ink, so in the dark theme
     * each bubble reads as a lit tile on the card rather than as a tinted part
     * of it. `fill` is flat and carries no border — the colour alone is the
     * whole signal.
     */
    const STAGES = [
        { fill: '#e3e5e8', ink: '#4a4f55', sub: '#6d737a' },   // 0  stone — a seed, nothing yet
        { fill: '#fbedc3', ink: '#605024', sub: '#857447' },   // 1  pale yellow
        { fill: '#ebe9bc', ink: '#605e24', sub: '#858347' },   // 2  yellow
        { fill: '#dfebb9', ink: '#526024', sub: '#768547' },   // 3  gold
        { fill: '#d0ecb8', ink: '#406024', sub: '#648547' },   // 4  chartreuse
        { fill: '#c0edb9', ink: '#2c6024', sub: '#508547' },   // 5  lime
        { fill: '#bdefc8', ink: '#246032', sub: '#478556' },   // 6  green
        { fill: '#bff0dc', ink: '#246048', sub: '#47856c' },   // 7  emerald
        { fill: '#bcf0f0', ink: '#246060', sub: '#478585' },   // 8  sea
        { fill: '#b8dff0', ink: '#244e60', sub: '#477285' },   // 9  teal
        { fill: '#b4ccf0', ink: '#243c60', sub: '#476085' },   // 10 blue
        { fill: '#b1b1f0', ink: '#242460', sub: '#474785' },   // 11 indigo
        { fill: '#c6adf1', ink: '#3a2460', sub: '#5e4785' }    // 12 violet — mastered
    ];

    tokens.stages = () => STAGES;
}
tokens();
