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
     * The settings of a game, behind a gear at the top right of every game
     * page -- the owner's call, 9 November 2026, in place of the sound switch
     * that stood there. The gear opens a panel hung under it, the way the
     * catalog's does (see renderSettings in catalog.js): the theme and the
     * voice at the head of it, as there, and under them a switch to a line --
     * the sound effects (see sfx.js), and whatever the game adds of its own:
     * what the snake says by itself, and whether the snake and Word search
     * write their letters in capitals.
     *
     * Here rather than in each game because this is the shell a game is drawn
     * inside — the same place page.home and page.save live. What a game keeps
     * to itself is how it answers a tap on a word, not what its header is made
     * of, and five copies of one panel is five places to fix it. A game's own
     * lines are handed in, each with what it is and what pressing it does.
     *
     * The icons are drawn again rather than borrowed from the catalog: the
     * catalog builds its own header and this builds the games', and a shared
     * one would tie the two headers together for the sake of a few lines of
     * path data.
     */
    const ICON = (body) => `<svg width="15.4" height="15.4" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true" style="display: block;">${body}</svg>`;

    const SPEAKER = ICON(`
        <path d="M11 5L6 9H2v6h4l5 4V5z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M18.8 5.2a9 9 0 0 1 0 13.6" />`);

    const SPEAKER_OFF = ICON(`
        <path d="M11 5L6 9H2v6h4l5 4V5z" />
        <path d="M16 9.5l5 5M21 9.5l-5 5" />`);

    // The catalog's six-lobed cog, sun and moon -- see GEAR in catalog.js
    const GEAR = ICON(`
        <path d="M21.60 12.00 C21.60 12.69 20.40 13.54 19.73 14.07 C19.05 14.60 17.89 14.60 17.54 15.20 C17.20 15.80 17.78 16.80 17.66 17.66 C17.53 18.51 17.40 19.97 16.80 20.31 C16.20 20.66 14.87 20.05 14.07 19.73 C13.27 19.41 12.69 18.40 12.00 18.40 C11.31 18.40 10.73 19.41 9.93 19.73 C9.13 20.05 7.80 20.66 7.20 20.31 C6.60 19.97 6.47 18.51 6.34 17.66 C6.22 16.80 6.80 15.80 6.46 15.20 C6.11 14.60 4.95 14.60 4.27 14.07 C3.60 13.54 2.40 12.69 2.40 12.00 C2.40 11.31 3.60 10.46 4.27 9.93 C4.95 9.40 6.11 9.40 6.46 8.80 C6.80 8.20 6.22 7.20 6.34 6.34 C6.47 5.49 6.60 4.03 7.20 3.69 C7.80 3.34 9.13 3.95 9.93 4.27 C10.73 4.59 11.31 5.60 12.00 5.60 C12.69 5.60 13.27 4.59 14.07 4.27 C14.87 3.95 16.20 3.34 16.80 3.69 C17.40 4.03 17.53 5.49 17.66 6.34 C17.78 7.20 17.20 8.20 17.54 8.80 C17.89 9.40 19.05 9.40 19.73 9.93 C20.40 10.46 21.60 11.31 21.60 12.00 Z" />
        <circle cx="12" cy="12" r="3" />`);

    const SUN = ICON(`
        <circle cx="12" cy="12" r="5" />
        <path d="M12 2.6v1.6M12 19.8v1.6M4.2 4.2l1.2 1.2M18.6 18.6l1.2 1.2M2.6 12h1.6M19.8 12h1.6M4.2 19.8l1.2-1.2M18.6 5.4l1.2-1.2" />`);

    const MOON = ICON(`
        <path d="M20.6 14.4A8.7 8.7 0 0 1 9.6 3.4 8.7 8.7 0 1 0 20.6 14.4z" />`);

    /*
     * The settings record, as it was read at boot and as this page has
     * changed it since: what a game asks for its own lines by -- see
     * page.setting -- without a read of its own.
     */
    let settingsRecord = {};

    page.useSettings = (record) => { settingsRecord = record || {}; };

    // A setting of the game's own, or `fallback` where nobody has chosen
    page.setting = (key, fallback) => (key in settingsRecord ? settingsRecord[key] : fallback);

    page.saveSetting = (key, value) => {
        settingsRecord[key] = value;
        return saveSetting(key, value);
    };

    /*
     * A dot of the row along the top of a game: one to a word of the session,
     * and the dot of the word in play grown to hold its stage -- the figure
     * alone, what it is in the tooltip, and only while the dot is waiting for
     * its answer. Once it takes the colour of one, the figure goes. Snake's from
     * 2 November 2026, every game's since the 6th (the owner's calls).
     *
     * Grown rather than scaled, as the dot in play was until it held a figure
     * (scale 1.15): a figure has to be its own size to be read.
     *
     * Asked of the store here rather than handed in, because it is one word's
     * stage and only ever the one in play: the other dots have no use for it.
     *
     * Snake has the numbers and not the drawing: it keeps its dots from frame to
     * frame, for the wave that lives on them. See view.dots there.
     */
    page.DOT = 8;
    page.DOT_NOW = 13;
    page.DOT_GAP = 4.5;
    page.DOT_FIGURE = 8.5;

    page.dotHtml = (cls, bg, current, word, palette, hint) => {
        const size = current ? page.DOT_NOW : page.DOT;
        const waiting = current && bg === palette.dotIdle;
        const ring = current ? `outline: 1px solid ${palette.cursor};` : '';
        const stage = waiting ? spacedRepetitions.getWordStats(word).stage || 0 : '';

        return `<div class="${cls}"${waiting ? ` title="${hint}"` : ''} style="display: flex; align-items: center; justify-content: center; width: ${size}px; height: ${size}px; border-radius: 50%; background: ${bg}; ${ring} color: ${palette.stageInk}; font-size: ${page.DOT_FIGURE}px; font-weight: 800; line-height: 1; overflow: hidden; cursor: default; font-variant-numeric: tabular-nums; transition: all 0.2s; flex-shrink: 0;">${stage}</div>`;
    };

    /*
     * Hung on the end of a game's header, which is why the game passes its own
     * header in and its own colour with it: the games paint their chrome
     * differently and none of them should learn the others' palette. `lines`,
     * the game's own switches, each { name, label, on(), set(value) } -- see
     * page.settingsButton's panel below.
     */
    page.settingsButton = (header, colour, border, lines) => {
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

        const btn = $(end, `<button class="game-settings-btn" id="settings-btn" title="Settings" style="display: inline-flex; align-items: center; justify-content: center; width: 29px; height: 29px; flex: none; padding: 0; background: transparent; border: 1px solid ${border}; border-radius: 10.2px; color: ${colour}; cursor: pointer;">${GEAR}</button>`);

        gameLines = lines || [];
        btn.addEventListener('click', () => (panelOpen() ? closeSettings() : openSettings(btn)));

        return btn;
    };

    let gameLines = [];

    /*
     * The panel. On the page itself and not in the game's container: a game
     * draws itself again whole -- the theme changed under the panel does it --
     * and the panel stays open through that, the way the catalog's does,
     * saying the other theme over a game that is already wearing it.
     */
    const RISE_IN = 160;
    const RISE_OUT = 120;

    let overlay = null;
    let anchor = null;
    let onKey = null;

    const panelOpen = () => !!overlay;

    function colours() {
        const t = tokens.of(theme.isDark());

        return {
            bg: t.surface, ink: t.ink, quiet: t.muted, edge: t.border,
            track: t.border, lit: theme.isDark() ? t.progress : t.progressFill
        };
    }

    // One of the game's switches: its name, and a track with the knob at
    // the end it stands at
    function lineHtml(line, c) {
        const on = !!line.on();

        return `<button class="game-setting" data-press="${line.name}" aria-pressed="${on}" style="display: flex; justify-content: space-between; align-items: center; gap: 10.2px; width: 100%; box-sizing: border-box; margin-top: 5.1px; padding: 6.8px 8.5px; background: transparent; border: 1px solid ${c.edge}; border-radius: 10.2px; font-family: inherit; font-size: 12.8px; font-weight: 600; color: ${c.ink}; text-align: left; cursor: pointer;">
            <span>${line.label}</span>
            <span aria-hidden="true" style="position: relative; display: block; flex: none; width: 29px; height: 17px; border-radius: 8.5px; background: ${on ? c.lit : c.track}; transition: background 0.15s;">
                <span style="position: absolute; top: 2px; left: ${on ? 14 : 2}px; width: 13px; height: 13px; border-radius: 50%; background: #ffffff; transition: left 0.15s;"></span>
            </span>
        </button>`;
    }

    // Every line of the panel: the sound effects first, then the game's own
    function allLines() {
        return [{
            name: 'effects',
            label: 'Sound effects',
            on: () => sfx.on(),
            set: (value) => {
                sfx.enable(value);
                page.saveSetting('effects', value);

                // Heard, switched on: the switch answers in the voice it is for
                if (value) sfx.chime(0);
            }
        }].concat(gameLines);
    }

    function panelHtml() {
        const c = colours();
        const chip = `display: inline-flex; align-items: center; justify-content: center; width: 25.6px; height: 25.6px; flex: none; padding: 0; background: transparent; border: 1px solid ${c.edge}; border-radius: 8.5px; cursor: pointer; color: ${c.quiet};`;

        return `<div class="game-settings-panel" style="position: absolute; box-sizing: border-box; width: 230px; background: ${c.bg}; color: ${c.ink}; border: 1px solid ${c.edge}; border-radius: 15.4px; padding: 13.7px; overflow-y: auto; box-shadow: 0 10.2px 23.9px rgba(0, 0, 0, 0.32);">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10.2px; margin-bottom: 5.1px;">
                <div style="font-size: 14.3px; font-weight: 700;">Settings</div>
                <div style="display: flex; align-items: center; gap: 5.1px; flex: none;">
                    <button class="game-setting" data-press="theme" title="${theme.isDark() ? 'Dark theme' : 'Light theme'}" style="${chip}">${theme.isDark() ? MOON : SUN}</button>
                    <button class="game-voice-btn" title="${speech.muted() ? 'Voice off' : 'Voice on'}" style="${chip}">${speech.muted() ? SPEAKER_OFF : SPEAKER}</button>
                </div>
            </div>
            ${allLines().map(line => lineHtml(line, c)).join('')}
        </div>`;
    }

    // What the panel says, drawn again in place after a press
    function drawPanel() {
        if (!overlay) return;

        const was = overlay.querySelector('.game-settings-panel');
        const scrolled = was ? was.scrollTop : 0;
        if (was) was.remove();

        const panel = $(overlay, panelHtml());
        panel.style.transformOrigin = hangUnder(panel, anchorNow());
        panel.scrollTop = scrolled;

        wirePanel(panel);
        return panel;
    }

    // The gear the panel hangs from, which a game drawn again has replaced
    function anchorNow() {
        const fresh = document.querySelector('.game-settings-btn');
        if (fresh) anchor = fresh;
        return anchor;
    }

    function wirePanel(panel) {
        const lines = allLines();

        panel.querySelectorAll('.game-setting').forEach(el => {
            el.addEventListener('click', () => {
                const name = el.dataset.press;

                if (name === 'theme') return switchTheme();

                const line = lines.find(l => l.name === name);
                if (!line) return;

                const value = !line.on();
                line.set(value);
                track('setting', name, value ? 'on' : 'off', gameId);
                drawPanel();
            });
        });

        // The voice, as the switch in the header was until now: what the press
        // left it at goes to the analytics, and the same tip when what it
        // switched on cannot be heard -- asked about the words of the set
        // being played, in the set's language
        panel.querySelector('.game-voice-btn').addEventListener('click', () => {
            speech.mute(!speech.muted());
            track('sound', speech.muted() ? 'off' : 'on', 'game');
            saveSetting('muted', speech.muted());

            const fresh = drawPanel();
            if (speech.muted()) return;

            const playing = (module && module.getState()) || {};
            const words = store.wordsOf(playing.selectedSetId)
                .map(item => ({ text: item.word.original, lang: item.originalLang }));

            speech.explainSilence(fresh.querySelector('.game-voice-btn'), words, 'game');
        });
    }

    /*
     * The other theme, on the page and on the game, which is drawn again in it
     * -- by the game's own retheme where drawing it again is not simply
     * render (snake's board is mid-move), and by render where it is.
     */
    function switchTheme() {
        const dark = !theme.isDark();

        theme.set(dark);
        track('setting', 'theme', dark ? 'dark' : 'light', gameId);

        if (module.retheme) module.retheme(dark);
        else {
            module.setTheme(dark);
            module.render();
        }

        drawPanel();
    }

    function openSettings(btn) {
        anchor = btn;

        overlay = $(document.body, `<div class="game-settings-overlay" style="position: fixed; top: 0; right: 0; bottom: 0; left: 0; background: rgba(15, 23, 42, 0.55); z-index: 100;"></div>`);

        const panel = drawPanel();

        // Out of the gear: grown from its middle, as the catalog's
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
            overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: RISE_IN, easing: 'ease-out' });
            panel.animate([{ transform: 'scale(0.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: RISE_IN, easing: 'ease-out' });
        }

        // Two ways out besides the gear, which the wash covers: a press on
        // the wash itself, and Escape. A press inside the panel bubbles up to
        // the wash and must not close it
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeSettings();
        });

        onKey = (e) => {
            if (e.key === 'Escape') closeSettings();
        };
        document.addEventListener('keydown', onKey);
    }

    function closeSettings() {
        const was = overlay;
        overlay = null;
        if (!was) return;

        document.removeEventListener('keydown', onKey);

        const panel = was.querySelector('.game-settings-panel');
        was.style.pointerEvents = 'none';

        if (matchMedia('(prefers-reduced-motion: reduce)').matches || !panel) return was.remove();

        panel.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.6)', opacity: 0 }], { duration: RISE_OUT, easing: 'ease-in', fill: 'forwards' });
        was.animate([{ opacity: 1 }, { opacity: 0 }], { duration: RISE_OUT, easing: 'ease-in', fill: 'forwards' })
            .finished.catch(() => null).then(() => was.remove());
    }

    /*
     * Whether this session has been declared over.
     *
     * It exists so that a save arriving after the end cannot undo it. The order
     * of the two is not hypothetical: boot ends a session with nothing due in it
     * from inside render, and then goes on to save what it has just rendered.
     */
    let ended = false;

    /*
     * The run being played, by the moment it was dealt -- the middle part of
     * the `run` mark on every answer it writes, see store.js. Which is what
     * lets the analytics tie answers to the device they were given on: the
     * repetitions do not say, and `run_start` does.
     *
     * Noticed here rather than in each game. Every game says when its run was
     * dealt in the state it saves, and it saves straight after dealing -- see
     * bootGame -- so a moment that is new to this page is a run that has just
     * begun, whichever game it is and however it began: a fresh start, or
     * "again" pressed at the end of the last one.
     *
     * With whether the spaced repetition system is on for the set, on this
     * device: the answers do not say, and with it off an answer ahead of its
     * timer is simply how that person plays.
     */
    let run = null;

    page.resumed = (at) => { run = at || null; };

    function noteRun(state) {
        if (!state || !state.sessionAt || state.sessionAt === run) return;

        run = state.sessionAt;

        const set = store.sets().find(s => s.id === state.selectedSetId);

        track('run_start', gameId, state.selectedSetId, run, (state.sessionPool || []).length, set ? Number(store.viewOf(set).srs) : '');
    }

    // The session blob is private to its game — no other page ever reads this key,
    // so its shape is the game's own business.
    page.save = () => {
        if (ended) return Promise.resolve(false);

        const state = module.getState();
        noteRun(state);

        storage.set('session:' + gameId, state);
        return store.save();
    };

    // The session is over: the catalog must not offer to continue it, and the
    // popup must reopen at the catalog rather than back here.
    //
    // `why` for the analytics: played to the end, or ended by sync.js under a
    // set that changed on another device -- see syncUnder below.
    page.endSession = (why) => {
        ended = true;

        if (run) track('run_end', run, why || 'done');

        nav.setEntryPoint('index.html');
        storage.set('session:' + gameId, null);
        storage.set('active_session', null);
        return store.save();
    };

    /*
     * And going on after all, on the same page: snake's "Grow more" at the
     * end of a session deals a new one over the snake the last left (see
     * growMore in snake.js). Undoes what endSession did, so that the saves
     * land again, the popup reopens here, and the catalog offers to continue
     * it -- with the active session the catalog writes when it starts one
     * (see beginSession in catalog.js), which endSession took away.
     */
    page.reopen = () => {
        ended = false;

        nav.setEntryPoint(location.pathname.replace(/^\//, ''));

        const state = module.getState() || {};
        return storage.set('active_session', { game: gameId, setId: state.selectedSetId, startedAt: Date.now() });
    };

    // Leave, but keep the session — the "Continue" banner will pick it up.
    page.home = () => nav.home();

    page.finish = async () => {
        await page.endSession();
        await nav.home();
    };
}
page();

/*
 * A sync from a game page, and what follows when it replaced a set the game
 * is playing: the run ends, without a word, and the player is back in the
 * catalog.
 *
 * Without a word because it is rare -- the popup was closed in the middle of a
 * game, and the same set was played on another device before it was opened
 * again -- and because there is nothing to choose: the words under the run are
 * not the words the set has any more. Asked while the restored game is still
 * paused, which is when it happens unnoticed; a player who pressed on before the
 * answer came is taken out under their finger, and that is accepted.
 */
async function syncUnder(module) {
    const done = await sync.run();
    if (!done || !done.replaced.length) return;

    const state = module.getState() || {};

    if (!done.replaced.includes(state.selectedSetId)) return;

    await page.endSession('sync');
    await nav.home();
}

/**
 * The boot every game page runs, as its own last line:
 *
 *     bootGame('flashcards', flashcards);
 *
 * MV3 forbids inline scripts, so the call cannot live in the HTML — but the
 * game file is loaded on its own page only, so there is nowhere else it could go.
 */
async function bootGame(id, module) {
    spacedRepetitions();
    storage();
    store();

    await storage.init();

    // Before the first read of anything saved: a 0.2.3 database has to become a
    // 0.2.4 one while nobody is looking at it. A no-op on every other database,
    // and on every run after the first — see migrate.js.
    await migrate.run();

    const settings = await storage.get('settings');

    // The ids first, then the visit they are written on -- see track.js.
    await remote.init();
    await track.start(id, settings);

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

    // And whether anything is said at all. The switch is in the game's
    // settings and in the catalog's; both write the same setting.
    speech.mute(!!(settings && settings.muted));

    // The sound effects, on unless switched off -- see sfx.js -- and the rest
    // of the record kept for the games' own settings (page.setting)
    sfx.enable(!(settings && settings.effects === false));
    page.useSettings(settings);

    await store.load();

    const container = $(`<div class="app-main-content"></div>`);
    module(container);
    page.bind(id, module);

    theme.apply(isDark);
    module.setTheme(isDark);

    // The URL carries the intent — which set, and whether the player chose to
    // play ahead of the timers. The words themselves come from the store.
    const params = new URLSearchParams(location.search);
    const setId = params.get('set');
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

    if (isResume && saved) {
        module.setState(saved);

        // The run carries on rather than begins: no second `run_start` for it.
        page.resumed(saved.sessionAt);
        if (saved.sessionAt) track('run_resume', saved.sessionAt);
    } else if (setId) {
        module.start(setId, allowEarly, saved);
    } else {
        // A bare address and nothing saved: nothing to carry on and no set to
        // start. It began a run over every set until 6 November 2026, when the
        // owner took that mode out: no button had led to it for a long time.
        return nav.home();
    }

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

    /*
     * Written straight away, before the player has done anything: until they act
     * nothing else would write this key, and the popup's entry point carries no
     * set to fall back on, so a game left untouched would have nothing to come
     * back to.
     *
     * After render() and not before, which is the whole point. The pool is built
     * inside render -- and so, in snake, is the board -- so a save taken ahead of
     * it stored a session with no words in it. Nothing was visibly wrong until
     * someone came back to that session: an empty pool is drawn again from
     * scratch, which reshuffles it, so a game entered and left untouched came
     * back as a different word with the letters in different places. Anyone who
     * had pressed a key was fine, because a tick had saved a real snapshot over
     * the empty one.
     *
     * Safe against the other order too: a render that finds nothing due ends the
     * session from inside itself, and a save after that does nothing -- see
     * `ended` above.
     */
    await page.save();

    popupHeight.release();

    // Not awaited: the game is on screen and playable while this is asked.
    syncUnder(module);

    // An installed app brought back from the background is the same page, not
    // a new one, and a set may have moved on elsewhere while it was away.
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) syncUnder(module);
    });
}
