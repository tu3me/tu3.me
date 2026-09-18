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

    /*
     * The sound switch, on every game page, in the same corner the catalog
     * keeps it: top right.
     *
     * Here rather than in each game because this is the shell a game is drawn
     * inside — the same place page.home and page.save live. What a game keeps
     * to itself is how it answers a tap on a word, not what its header is made
     * of, and three copies of one button is three places to fix a button.
     *
     * The icons are drawn again rather than borrowed from the catalog: the
     * catalog builds its own header and this builds the games', and a shared
     * one would tie the two headers together for the sake of eight lines of
     * path data.
     */
    const SOUND_ICON = (body) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true" style="display: block;">${body}</svg>`;

    const SPEAKER = SOUND_ICON(`
        <path d="M11 5L6 9H2v6h4l5 4V5z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M18.8 5.2a9 9 0 0 1 0 13.6" />`);

    const SPEAKER_OFF = SOUND_ICON(`
        <path d="M11 5L6 9H2v6h4l5 4V5z" />
        <path d="M16 9.5l5 5M21 9.5l-5 5" />`);

    function drawMute(btn) {
        btn.innerHTML = speech.muted() ? SPEAKER_OFF : SPEAKER;
        btn.title = speech.muted() ? 'Sound off' : 'Sound on';
    }

    /*
     * Hung on the end of a game's header, which is why the game passes its own
     * header in and its own colour with it: the three of them paint their
     * chrome differently and none of them should learn the others' palette.
     *
     * The icon is swapped in place rather than by redrawing the screen. A game
     * is mid-session when this is pressed, and a redraw would be a redraw of a
     * board, a card mid-turn or a question already answered.
     */
    page.muteButton = (header, colour) => {
        if (!header) return null;

        // In a group of its own, and the group takes a third of the header the
        // same way the other two do. Three equal shares are what puts the dots
        // in the middle of the header rather than in the middle of whatever was
        // left over — snake carries three controls on its left and would have
        // pushed them nearly forty pixels off centre.
        //
        // The share belongs to the group and not to the button: a button with a
        // third of the header in it is a button you press by aiming at nothing
        // in particular.
        const end = $(header, `<div class="game-header-end" style="display: flex; flex: 1; justify-content: flex-end; align-items: center;"></div>`);

        const btn = $(end, `<button class="game-mute-btn" id="mute-btn" title="Sound" style="display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; flex: none; padding: 0; background: transparent; border: none; color: ${colour}; cursor: pointer;"></button>`);

        drawMute(btn);

        btn.addEventListener('click', () => {
            speech.mute(!speech.muted());
            saveSetting('muted', speech.muted());
            drawMute(btn);
        });

        return btn;
    };

    /*
     * The switch saying that it is the reason nothing was said.
     *
     * Cleared when it ends so the next tap can start it again: an animation
     * already on an element is not restarted by being set to the same value.
     */
    page.pulseMute = () => {
        const btn = document.querySelector('#mute-btn');
        if (!btn) return;

        btn.style.animation = 'mute-pulse 420ms ease-out';
        btn.addEventListener('animationend', () => { btn.style.animation = ''; }, { once: true });
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

    // Where a word ends, which is what a tap on a card lands on: spaces, unless
    // the player asked for the dictionary's answer instead.
    speech.splitByLanguage(settings ? !!settings.splitByLanguage : false);

    // And whether anything is said at all. The switch is in the catalog's
    // header; a game only obeys what it was left at.
    speech.mute(settings ? settings.muted !== false : true);

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
    // Three ways of saying "continue rather than start over":
    //   history state  — this entry already ran a session (reload, back, forward)
    //   ?resume=1      — the catalog's Continue banner, crossing a navigation
    //   no set at all  — the popup's entry point, which carries no query
    const isResume = (history.state && history.state.resume === true)
        || params.get('resume') === '1'
        || !params.has('set');

    if (isResume && saved) module.setState(saved);
    else module.start(setId, allowEarly, saved);

    // Written straight away, before the player has done anything. Until they act
    // nothing else would write this key, and the popup's entry point carries no
    // set to fall back on — a game left untouched would come back as a fresh
    // session over every set. Saved before render() because an empty pool ends
    // the session from inside render, and that must stay ended.
    await page.save();

    // This history entry now stands for a running session. Every way back into it
    // — Forward, a reload, a restore the bfcache declined to serve — continues
    // that session instead of starting over, which is what a player means by
    // returning to a game they were in the middle of.
    //
    // Kept in history state rather than in the address for two reasons. It is
    // per-entry, where a flag in storage would be global and could not tell two
    // history entries over the same set apart; and it leaves the address the
    // plain ?set=N that is worth seeing and sharing.
    //
    // The query parameter is only how the Continue banner says this across a
    // navigation, which history state cannot cross. Consumed here, then taken
    // back out so every game address looks the same.
    const here = new URL(location.href);
    here.searchParams.delete('resume');
    history.replaceState({ resume: true }, '', here);

    // While the popup lives, reopening the icon comes back here. Reset by
    // nav.home(), so "back" is never a trap.
    nav.setEntryPoint(location.pathname.replace(/^\//, ''));

    module.render();
    popupHeight.release();
}
