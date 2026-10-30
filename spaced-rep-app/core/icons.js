/*
 * Games' icons: the place each game's icon.js puts what it says about the
 * game, and the way a page gets those files. Knows no game by name -- each
 * game's own file is <id>/icon.js, and it is found by the id.
 *
 * Here and not in registry.js, which is the list of games and nothing else
 * (the owner's rule, 28 October 2026), and here rather than in the catalog
 * because the catalog is not the only page that may want a game's icon: a
 * game's page can show its own, achievements and growth included, by loading
 * this file and its icon.js -- see `show` below. Only the catalog loads it
 * today.
 *
 * No drawing of any game is shared from here. Each game draws the whole of
 * its tile itself, the plain ones included -- their colour, their square and
 * their drawing in it -- so that a tile is one file's business; until
 * 28 October 2026 the square and the drawing's frame were two functions here
 * that every icon.js was written with (plainTile and gameIcon).
 */

/*
 * Every game's icon.js loaded so far, by the game's id: each file sets its
 * own, `GAME_FACES.snake = {...}`. The catalog lays it onto the game's line of
 * the list, so that it reads `game.title` where it reads `game.pitch` -- see
 * takeFaces in catalog.js.
 *
 *   - `title` is the name under the tile.
 *   - `show(el, tile, log, { actual, animate })` draws the tile's whole face,
 *     the background included, into `el` -- an empty element the size of the
 *     tile, which whoever asks puts where the tile is to be. `tile` is its
 *     side, its corner, the size of a drawing in it and the theme (see
 *     tileSpec in catalog.js), `log` the game's own corner of a set's
 *     achievements (see store.achieve). `actual: false` asks for the plain
 *     tile, the one a set with nothing achieved has; `actual: true` for the
 *     tile as the log has it, and with `animate` the game plays its way there
 *     from whatever `el` holds -- the plain tile, which the catalog asked for
 *     first. The answer is a promise, kept when the face is in its place.
 *
 *     Everything about the face is the game's: what the log comes to, what
 *     the plain tile is, and what happens between the two. Whoever asks knows
 *     only when to ask. The catalog asks for the plain face at once and the
 *     actual one at its turn as it opens (see growTiles in catalog.js), and
 *     for the actual one at once on every other draw. The owner's call,
 *     28 October 2026: the snake shows its record first and then the prizes
 *     won, and another game may grow some other way. A
 *     game that keeps no achievements draws the same tile whatever it is
 *     asked.
 *
 *     Its colour is its own business too, and not said to anybody: one value
 *     for both themes, because a tile that changed colour with the theme
 *     would be two tiles. The drawings are drawn rather than borrowed from the
 *     emoji table -- an emoji is rendered by the platform, so the same tile is
 *     a different picture on Windows, Android and iOS, with colours of its own
 *     that ignore whatever it is painted on -- and the plain ones are strokes
 *     in currentColor on a 24-unit grid, the grid and the 2-unit stroke of the
 *     pencil and shuffle icons in the catalog.
 *
 * And one word about where the game stands, which is not a state the game
 * is in: `soon` says the game is not written yet. There is no page to go to,
 * so its tile, last in every set's row, starts nothing: it is an outline, and
 * a press on it says "Coming soon". It is temporary by nature: it comes off
 * in the commit that adds the game's page. `wordcraft` wore it until exactly
 * that commit.
 *
 * There were two more until 29 October 2026, when every game went on every
 * set's row and the "All games" dialog went: `away`, which kept a game off
 * the row of a set nobody had pinned it to (the snake, and before 26 October
 * a game that did not fit the row's four places), and `fresh`, a "New" plate
 * beside the name in the dialog until the game was first played.
 */
const GAME_FACES = {};

/*
 * The icon.js of each of these games, in parallel, and an answer once each
 * has answered -- loaded or not: what a page does about a game whose file did
 * not come is the page's business. See takeFaces in catalog.js.
 *
 * Loaded rather than listed in the page, so that the id is the whole of what
 * it takes to find a game's icon: the file is found the way the page is.
 */
function loadFaces(ids) {
    const loaded = (id) => new Promise(resolve => {
        const script = document.createElement('script');
        script.src = `${id}/icon.js`;
        script.onload = script.onerror = resolve;
        document.head.appendChild(script);
    });

    return Promise.all(ids.filter(id => !GAME_FACES[id]).map(loaded));
}
