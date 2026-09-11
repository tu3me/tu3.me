/*
 * The list of game mechanics. This is the only place edited when one is added
 * or removed — the catalog builds its buttons and its "Continue" banner from
 * here, and knows nothing else about any game.
 *
 * Paths are relative to the app root, so they work from any page. The .html
 * suffix is not written here: nav adds it where it is required.
 */
const GAMES = [
    { id: 'cards', title: 'Cards', icon: '🎴', color: '#3f7df2', page: 'cards' },
    { id: 'quiz', title: 'Quiz', icon: '🧩', color: '#e2622e', page: 'quiz' },
    { id: 'snake', title: 'Snake', icon: '🐍', color: '#10a97b', page: 'snake' }
];
