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
    // Every page of the app sits at the root — index.html next to cards.html and
    // the rest — so a bare relative path resolves identically from all of them.
    // Only the scripts live in folders, and nothing navigates to a script.

    // The files are always .html. What differs is what the server will accept:
    // GitHub Pages resolves /cards to cards.html and / to index.html, while the
    // extension serves by exact path and does neither. So the web gets the tidy
    // address and the extension keeps the suffix — nobody sees a URL there anyway.
    const inExtension = location.protocol === 'chrome-extension:';
    const PAGE_EXT = inExtension ? '.html' : '';
    const HOME = inExtension ? 'index.html' : './';

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
        location.href = HOME;
    };

    // Only the identifier travels in the URL. The words themselves are read back
    // from the store by the game, so recordRepetition() still resolves the live
    // word inside its own set.
    nav.game = async (game, setId, allowEarly) => {
        await store.save();
        const early = allowEarly ? '&early=1' : '';
        location.href = `${game.page}${PAGE_EXT}?set=${encodeURIComponent(setId)}${early}`;
    };

    // Picking an unfinished session back up, as opposed to starting a fresh one
    // on the same set. Only this way in does the game restore its saved state.
    nav.resume = async (game, setId) => {
        await store.save();
        location.href = `${game.page}${PAGE_EXT}?set=${encodeURIComponent(setId)}&resume=1`;
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

    // The attribute is what the stylesheet keys off. The localStorage copy exists
    // only so prepaint.js can read it synchronously on the next page — IndexedDB
    // remains the source of truth, and refreshing the mirror here is what keeps a
    // stale cache from surviving more than one frame.
    theme.apply = (value) => {
        isDark = !!value;
        document.documentElement.dataset.theme = isDark ? 'dark' : 'light';

        try {
            const mirror = isDark ? '1' : '0';
            if (localStorage.getItem('dark') !== mirror) localStorage.setItem('dark', mirror);
        } catch (e) { }
    };

    theme.set = (value) => {
        theme.apply(value);
        return storage.set('settings', { isDark: isDark });
    };
}
theme();

/**
 * Keeps the extension popup from collapsing on every navigation.
 *
 * The popup takes its height from the document, and the document is built by
 * script after two async reads. prepaint.js reserves the height the popup had a
 * moment ago; this releases the reservation once the content is really laid out,
 * and remembers whatever height the popup settles at for next time.
 */
function popupHeight() {
    const inPopup = location.protocol === 'chrome-extension:';
    let timer = null;

    // innerHeight, not scrollHeight: it is the popup's actual height, already
    // capped by Chrome at 600. Storing the content height instead would reserve
    // a tall catalog's 900px on a short game page and leave dead space below it.
    function remember() {
        clearTimeout(timer);
        timer = setTimeout(() => {
            try { localStorage.setItem('popup-height', window.innerHeight); } catch (e) { }
        }, 200);
    }

    // Two frames: the first lets the just-appended content into the layout, the
    // second measures a settled page rather than one mid-reflow.
    popupHeight.release = () => {
        if (!inPopup) return;
        requestAnimationFrame(() => requestAnimationFrame(() => {
            document.documentElement.style.setProperty('--boot-height', '0px');
            remember();
        }));
    };

    // In the popup a window resize *is* Chrome resizing the popup, so this
    // measures exactly the thing being stored — including the changes that happen
    // mid-session, such as a quiz question with more options than the last.
    if (inPopup) window.addEventListener('resize', remember);
}
popupHeight();
