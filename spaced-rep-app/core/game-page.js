/*
 * Everything a game page needs that is not the game itself: the boot sequence
 * and the small façade the game calls back into. Nothing here knows how any
 * particular mechanic works — it drives the same handful of calls for all of them.
 *
 * Loaded only on game pages; the catalog has no use for it.
 */

/**
 * What a game reaches for when it wants to save or to leave.
 */
function page() {
    let gameId = null;
    let module = null;

    page.bind = (id, gameModule) => {
        gameId = id;
        module = gameModule;
    };

    // The session blob is private to its game — no other page ever reads this key,
    // so its shape is the game's own business.
    page.save = () => {
        storage.set('session:' + gameId, module.getState());
        return store.save();
    };

    // The session is over: the catalog must not offer to continue it, and the
    // popup must reopen at the catalog rather than back here.
    page.endSession = () => {
        nav.setEntryPoint('index.html');
        storage.set('session:' + gameId, null);
        storage.set('active_session', null);
        return store.save();
    };

    // Leave, but keep the session — the "Continue" banner will pick it up.
    page.home = () => nav.home();

    page.finish = async () => {
        await page.endSession();
        await nav.home();
    };
}
page();

/**
 * The boot every game page runs, as its own last line:
 *
 *     bootGame('cards', cards);
 *
 * MV3 forbids inline scripts, so the call cannot live in the HTML — but the
 * game file is loaded on its own page only, so there is nowhere else it could go.
 */
async function bootGame(id, module) {
    spacedRepetitions();
    storage();
    store();

    await storage.init();

    const settings = await storage.get('settings');
    const isDark = !!(settings && settings.isDark);

    await store.load();

    const container = $(`<div class="app-main-content"></div>`);
    module(container);
    page.bind(id, module);

    theme.apply(isDark);
    module.setTheme(isDark);

    // The URL carries the intent — which set, and whether the player chose to
    // play ahead of the timers. The words themselves come from the store.
    const params = new URLSearchParams(location.search);
    const setId = params.get('set') || 'all';
    const allowEarly = params.get('early') === '1';

    // The previous session is handed over even on a fresh start, so a game can
    // carry its own settings across. Nothing forces it to look.
    const saved = await storage.get('session:' + id);

    // Two arrivals mean "carry on" rather than "start over": the Continue banner,
    // which says so outright, and a bare URL with no instructions at all. The
    // second is how the popup comes back after being closed — its entry point is
    // just the page path, with no query to carry the set.
    const isResume = params.get('resume') === '1' || !params.has('set');

    if (isResume && saved) module.setState(saved);
    else module.start(setId, allowEarly, saved);

    // Written straight away, before the player has done anything. Until they act
    // nothing else would write this key, and the popup's entry point carries no
    // set to fall back on — a game left untouched would come back as a fresh
    // session over every set. Saved before render() because an empty pool ends
    // the session from inside render, and that must stay ended.
    await page.save();

    // From here on the address itself says a session is running. Every way back
    // into this history entry — Forward, a reload, a restore the bfcache declined
    // to serve — then continues it instead of starting over, which is what the
    // player means by returning to a game they were in the middle of.
    //
    // Only this entry is rewritten. The catalog always navigates to a fresh URL
    // without resume, so starting a new session over the same set still does.
    if (!isResume) {
        const here = new URL(location.href);
        here.searchParams.set('resume', '1');
        history.replaceState(null, '', here);
    }

    // While the popup lives, reopening the icon comes back here. Reset by
    // nav.home(), so "back" is never a trap.
    nav.setEntryPoint(location.pathname.replace(/^\//, ''));

    module.render();
    popupHeight.release();
}
