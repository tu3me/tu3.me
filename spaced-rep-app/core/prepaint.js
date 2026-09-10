/*
 * The only script that runs before the first frame: loaded from <head> without
 * defer, so it executes while <body> is still being parsed.
 *
 * Everything here has to be synchronous, which is the whole reason localStorage
 * appears in a project that otherwise keeps everything in IndexedDB. Both values
 * below decide how the page looks, and both are needed before anything is drawn:
 * an async read would paint one way and then repaint, and in the extension that
 * happens on every single navigation.
 *
 * document.body does not exist yet, so everything is done on documentElement.
 */
(function () {
    const root = document.documentElement;

    try {
        // A mirror of settings.isDark in IndexedDB, which stays the source of
        // truth. If the two ever disagree, theme.apply() corrects this one at
        // boot and the page repaints once — cheaper than never being right.
        const dark = localStorage.getItem('dark');
        if (dark !== null) root.dataset.theme = dark === '1' ? 'dark' : 'light';

        // The phone's status bar takes its colour from this tag, so it has to be
        // right in the first frame like everything else here — otherwise the bar
        // flashes the wrong colour on every navigation.
        //
        // These two values are the only copy of the ground colours outside
        // app.css, and they exist because the stylesheet has not loaded yet at
        // this point. theme.apply() overwrites the tag from --ground once it has,
        // so a mismatch here would correct itself within a frame; keep them in
        // step anyway.
        // Absent means light, because that is what the app settles on: with no
        // stored setting theme.apply() is called with false. Following the system
        // preference here instead would tint the bar dark on a dark phone and
        // then correct it a frame later — the flicker this file exists to avoid.
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = dark === '1' ? '#0f172a' : '#e8e1ff';
        document.head.appendChild(meta);

        // Popup only: on the web the window height is given from outside and
        // there is nothing to reserve.
        //
        // The extension popup takes its height from the document, and the
        // document is built by script after two async reads — so without this
        // the popup collapses to its minimum on every navigation and springs
        // back a moment later. Reserving the height the popup had a moment ago
        // keeps the frame still; bootGame/bootCatalog release it once the real
        // content is laid out.
        if (location.protocol === 'chrome-extension:') {
            // Everything popup-shaped in the stylesheet hangs off this class, and
            // it has to be here rather than in a later script: the height cap it
            // switches on has to hold for the first frame too.
            root.classList.add('in-popup');

            const height = localStorage.getItem('popup-height');
            root.style.setProperty('--boot-height', (height || 480) + 'px');
        }
    } catch (e) {
        // Storage can be switched off entirely. The stylesheet then falls back to
        // prefers-color-scheme and to no reservation, which is merely the old
        // behaviour rather than a broken one.
    }
})();
