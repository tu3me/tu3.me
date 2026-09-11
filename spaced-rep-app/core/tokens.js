/**
 * The one place the app's colours are decided.
 *
 * Every screen still keeps its own palette — the catalog and the three games map
 * these onto their own parts, and nothing here knows what a word bubble or a
 * snake body is. What changed is that they no longer invent colours: before this
 * file there were ninety-odd hex literals across four modules, all drawn from the
 * same grey-blue ramp, which is why the app looked like nothing in particular.
 *
 * The ink carries a violet cast rather than the usual blue-grey. That is what
 * ties the near-black of the dark theme to the lavender of the light one, and
 * the only reason the two read as the same app rather than two skins.
 *
 * The word bubbles are the deliberate exception and stay out of here. Their
 * colours mean something — which stage a word has reached — so they carry their
 * own palette in both themes and must not shift when the theme does.
 */
function tokens() {
    const DARK = {
        ground: '#12101d',       // the page behind everything
        surface: '#1c1a2c',      // cards, dialogs, anything lifted off the ground
        soft: '#272338',         // chips, inputs, tracks — lifted again, quietly
        border: '#332f47',
        ink: '#f0edfa',
        muted: '#a09bbd',

        accent: '#3f7df2',
        onAccent: '#ffffff',

        ok: '#3ddc97',
        okSoft: '#122e20',
        okBorder: '#1e5940',

        err: '#ff8095',
        errSoft: '#33131c',
        errBorder: '#6d2436',

        warm: '#ffc24d'          // the snake's head and the letters it collects
    };

    const LIGHT = {
        ground: '#eae5fa',
        surface: '#ffffff',
        soft: '#f3f0fc',
        border: '#ddd6f1',
        ink: '#191530',
        muted: '#615c80',

        accent: '#2a66e8',
        onAccent: '#ffffff',

        ok: '#0e9f6e',
        okSoft: '#e3f8ee',
        okBorder: '#9ee0c3',

        err: '#d93750',
        errSoft: '#fdeaed',
        errBorder: '#f4b3bd',

        warm: '#dd8500'
    };

    tokens.of = (isDark) => (isDark ? DARK : LIGHT);
}
tokens();
