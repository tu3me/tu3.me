/*
 * The list of games: the id of each and the line said about it, in the order
 * the catalog shows them, and nothing else. This is the one place edited when
 * a game is added or removed -- the catalog builds its tiles from here and
 * knows no game of its own accord.
 *
 * Everything else about a game is the game's own: its name, its colour, its
 * tile and what the tile does with what was achieved on a set. It lives in the
 * game's folder, in icon.js, and the id is all it takes to find it -- `snake`
 * is snake/icon.js, the page snake.html and the game snake/snake.js. What such
 * a file says and how a page gets it is core/icons.js; nothing of it is here,
 * the functions the icon files are written with included. Asked for
 * by the owner on 28 October 2026, when the tiles began to grow achievements:
 * a tile that turns into an emblem of what was won is a picture each game
 * draws by its own rules, and a list that held one of those would be a list
 * that knew every game's rules. Until then the name, the colour, the drawing
 * and a few words about the game's place stood here beside the id.
 *
 * `pitch` stays, and is the one thing the list says about a game: the line the
 * dialog of all games prints beside the name. Every game has one, because
 * every game is in that dialog, and it is a sentence for the catalog to show
 * rather than a part of the game -- the game never says it.
 *
 * Paths are relative to the app root, so they work from any page. The .html
 * suffix is not written anywhere: nav adds it where it is required.
 */
const GAMES = [
    {
        id: 'flashcards',
        pitch: 'Classic spaced-repetition cards for fast, effortless active recall.'
    },
    {
        id: 'quiz',
        pitch: 'Adaptive multiple-choice drills that get harder as your vocabulary grows.'
    },
    {
        id: 'wordcraft',
        pitch: 'Break words into fragments and piece them back together — getting harder with every level.'
    },
    {
        id: 'snake',

        // What it is good for, in the words somebody would use to recommend it
        // rather than to describe it: the mechanics are obvious from the name,
        // and the reason to open a snake game inside a vocabulary app is not.
        pitch: 'Turn boring screen time into quick vocab review.'
    },
    {
        id: 'search',
        pitch: 'Mental repetition while searching for hidden words wires them straight into your memory.'
    }
];

