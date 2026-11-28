/*
 * The extension's background service worker. It does what happens at the edges
 * of the product's life, where no page of the app is open: opens the welcome
 * page on the first install, tells the analytics about installs and updates,
 * and points Chrome at the farewell page for the uninstall.
 *
 * Not to be confused with web/sw.js — that one is the offline cache of the
 * site, registered by the page itself, and it never ships here. This file is
 * the opposite: an MV3 worker that exists only in the extension package, and
 * build.sh strips it back out of the web build.
 *
 * chrome.tabs.create() needs no "tabs" permission. That permission only opens
 * up reading url/title/favIconUrl of tabs, which nothing here does — so the
 * manifest keeps asking for unlimitedStorage and nothing else.
 *
 * The three core files are the pages' own, loaded as they are: the database,
 * the server and the analytics' queue. A worker has no window and no document,
 * and those three need neither for what is asked of them here — track.js skips
 * its page listeners where there is no window.
 */
importScripts('core/storage.js', 'core/remote.js', 'core/track.js');

const WELCOME = 'https://spacerepeat.app/';
const FAREWELL = 'https://spacerepeat.app/uninstall/';

// The database and the ids, once per wake of the worker.
let ready = null;

function boot() {
    if (!ready) {
        ready = (async () => {
            storage();
            await storage.init();
            await remote.init();
        })();
    }
    return ready;
}

/*
 * Where Chrome sends someone the moment the extension is removed. It opens the
 * tab itself, after the extension is already gone — so there is no code of
 * ours left running at that point, and nothing to do here but hand over an
 * address that already works.
 *
 * The address carries this device's id, its version and which server it talks
 * to, after a # so that it never reaches a server: the farewell page reads it,
 * takes it out of the address before its own counter sees the address, and
 * reports the departure to our analytics under the device it belongs to --
 * which is the only way the last visits of somebody who left can be read as
 * the last visits of somebody who left. See uninstall-page/index.html.
 *
 * Set at the top level, bare first and then with the id once the database has
 * answered: the worker is woken for all sorts of reasons and the URL has to be
 * set on every wake, and a database that fails to open must still leave the
 * page reachable.
 *
 * The page carries a one-question Google form. Per the bootcamp lesson 5.1 some
 * 5-15% of leavers answer it, and that is the only moment anyone explains why
 * they left — the store gives no such signal at all.
 */
chrome.runtime.setUninstallURL(FAREWELL);

async function farewell() {
    await boot();

    const meta = remote.meta();
    if (!meta || !meta.device) return;

    const about = new URLSearchParams({ d: meta.device, v: remote.version() });
    if (!remote.live()) about.set('t', '1');

    chrome.runtime.setUninstallURL(FAREWELL + '#' + about.toString());
}

farewell();

/*
 * An install or an update, for the analytics, sent from here because here is
 * where it is heard: an install whose popup is never opened is otherwise not
 * in the data at all, and the store's count of installs cannot be held against
 * the number of devices that went on to open the app.
 */
async function report(details) {
    await boot();
    await track.report('install', details.reason, details.previousVersion || '');
    await farewell();
}

chrome.runtime.onInstalled.addListener((details) => {
    const reasons = chrome.runtime.OnInstalledReason;

    // Updates of the extension, of the browser and of a shared module all
    // arrive through this same listener. Greeting someone who has been using
    // the app for months every time Chrome updates itself is the reason the
    // reason is checked rather than assumed.
    if (details.reason === reasons.INSTALL) {
        // Once per installation. Reloading an unpacked extension is an update
        // to the same version, not an install -- measured: the reload came to
        // the analytics as install|update|0.2.6 -- so only loading it afresh
        // opens this tab during development.
        chrome.tabs.create({ url: WELCOME });
    }

    // The browser's own updates are not ours to count.
    if (details.reason === reasons.INSTALL || details.reason === reasons.UPDATE) report(details);
});
