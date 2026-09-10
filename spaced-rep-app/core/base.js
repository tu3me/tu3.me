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
    // Where the app is rooted, derived from this file's own URL instead of being
    // written down: game pages sit a level deeper and cannot use a literal path.
    // document.currentScript is still this script while this call runs.
    const ROOT = new URL('../', document.currentScript.src).href;

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
        location.href = ROOT + 'index.html';
    };

    // Only the identifier travels in the URL. The words themselves are read back
    // from the store by the game, so recordRepetition() still resolves the live
    // word inside its own set.
    nav.game = async (game, setId, allowEarly) => {
        await store.save();
        const early = allowEarly ? '&early=1' : '';
        location.href = `${ROOT}${game.page}?set=${encodeURIComponent(setId)}${early}`;
    };

    // Picking an unfinished session back up, as opposed to starting a fresh one
    // on the same set. Only this way in does the game restore its saved state.
    nav.resume = async (game, setId) => {
        await store.save();
        location.href = `${ROOT}${game.page}?set=${encodeURIComponent(setId)}&resume=1`;
    };
}
nav();

/**
 * The light/dark flag: one boolean for the whole app plus the ground it paints.
 * The palettes themselves stay inside the catalog and inside each game.
 */
function theme() {
    let isDark = false;

    theme.isDark = () => isDark;

    // The stylesheet already painted a ground from prefers-color-scheme before
    // any script ran; this overrides it with the player's own choice.
    theme.apply = (value) => {
        isDark = !!value;
        document.body.style.backgroundColor = isDark ? '#0f172a' : '#e8e1ff';
        document.body.style.color = isDark ? '#f8fafc' : '#0f172a';
    };

    theme.set = (value) => {
        theme.apply(value);
        return storage.set('settings', { isDark: isDark });
    };
}
theme();
