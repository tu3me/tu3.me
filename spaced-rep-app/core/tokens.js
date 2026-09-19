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

    /*
     * Warm paper, which is what the dark theme's deep sea-navy is answered by —
     * the two are complementary rather than one being the other turned inside
     * out. It was a soft grey-green for a while, at a fifth of the mint's
     * saturation, and the trouble with that was not the hue but the company it
     * kept: a desaturated green page under pure white cards reads as something
     * clinical, and every grey thing on it — the bubbles of a word nothing has
     * happened to, the chips, the tracks — joined in. Warmed, the page stops
     * competing and the coral and mint on top of it have somewhere to be bright.
     *
     * Four steps of one ladder, set by luminance rather than by eye, so that
     * each is told from the one above it at a glance: the card at 1.00, the page
     * at 0.75, the chips and tracks at 0.70, the borders at 0.66. The page keeps
     * exactly the distance from the card it always had — 1.32 — so a card still
     * sits on the page rather than in it.
     *
     * The border is held no darker than the green one it replaces, which is not
     * a free choice: snake lays its banner in it and writes collected letters on
     * it in mint, and mint on anything light is about 1.4 whatever the hue. A
     * warmer, deeper border would have made a bad number worse.
     *
     * The ink stays the navy of the other theme's ground. It is the one thing
     * the two share besides the coral and the mint, and navy on cream is a
     * combination older than either of them.
     *
     * muted is set by contrast, not by eye — it is the one neutral that carries
     * text, on the white card and on the page both, and at 6.65 and 5.04 it
     * clears 4.5 on each.
     */
    const LIGHT = {
        ground: '#e8dfd0',
        surface: '#ffffff',
        soft: '#e3d9c8',
        border: '#ddd2bf',
        ink: '#153040',
        muted: '#655b4f',

        accent: '#ef6f5a',
        onAccent: '#ffffff',
        progress: '#56c4a6',
        progressFill: '#1f8469',

        ok: '#56c4a6',
        err: '#ef6f5a'
    };

    tokens.of = (isDark) => (isDark ? DARK : LIGHT);

    /*
     * The bubble ramp: one colour per stage, fifteen of them, the same fifteen
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
     * That hint is doing real work, not decoration. Fifteen steps of hue alone
     * put neighbours a few degrees apart in the middle of the arc, where they
     * stop being tellable apart and the series stops meaning anything; with
     * lightness moving too, any two neighbours differ in two ways at once. It is
     * also the reason the band is a band rather than a single value: flat
     * lightness across fifteen pastel steps reads as one colour with the hue
     * wobbling, not as a series.
     *
     * Generated rather than picked one by one, for the same reason: fifteen
     * colours chosen by eye drift, and the drift always shows up as two
     * neighbours that have quietly become the same colour.
     *
     * The last two were added when the ladder grew, and they are the only
     * steps that move by depth rather than by hue: the same violet, saturated
     * further and lightened less, so the arc ends by deepening instead of
     * going anywhere new.
     *
     * Re-dividing the arc across fifteen is what the sentence above would
     * suggest, and it is wrong here for a measurable reason: the tightest pair
     * on this arc is the first two yellows at dE 5.4, and fitting two more
     * steps between the same ends would take that pair under 5, where two
     * bubbles across a screen stop being different colours.
     *
     * Carrying on round the wheel is what was tried instead, and orchid and
     * magenta were the result — well separated, and wrong anyway. Past about
     * 300 degrees a pale colour reads as pink, pink reads as red, and red in
     * this app is the colour of a word just got wrong. The top of this ramp
     * means the opposite. Coral would be worse still: it is the accent, and
     * the accent is what every warning in the app is drawn in.
     *
     * So the hue stops at 276 and the last two steps get their distance from
     * saturation and lightness instead — 7.9 and 12.7 from their neighbours,
     * wider apart than anything in the middle of the arc, and 20.5 between the
     * violet at 12 and the deepest at 14. They are the two steps that leave
     * the pastel band, which is the point: the end of the ramp is the one
     * place where arriving should look like arriving.
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
        // Stone, and lighter than anything else here on purpose: it is not a
        // step of the arc but the state before it starts, and on the light
        // theme it is also what an untouched segment of the progress bar is
        // painted in — see palette.stepIdle in catalog.js. A seed should be
        // the quietest thing on either screen.
        { fill: '#ebedef', ink: '#4a4f55', sub: '#6d737a' },   // 0  stone — a seed, nothing yet
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
        { fill: '#c6adf1', ink: '#3a2460', sub: '#5e4785' },   // 12 violet
        { fill: '#c7a2f1', ink: '#402460', sub: '#644785' },   // 13 violet, deeper
        { fill: '#cb91f2', ink: '#482460', sub: '#6c4785' }    // 14 violet, deepest — mastered
    ];

    tokens.stages = () => STAGES;
}
tokens();
