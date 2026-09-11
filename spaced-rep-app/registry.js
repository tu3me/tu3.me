/*
 * The list of game mechanics. This is the only place edited when one is added
 * or removed — the catalog builds its buttons and its "Continue" banner from
 * here, and knows nothing else about any game.
 *
 * Paths are relative to the app root, so they work from any page. The .html
 * suffix is not written here: nav adds it where it is required.
 */
const GAMES = [
    { id: 'cards', title: 'Cards', icon: '🎴', color: '#2563eb', page: 'cards' },
    { id: 'quiz', title: 'Quiz', icon: '🧩', color: '#0284c7', page: 'quiz' },
    { id: 'snake', title: 'Snake', icon: '🐍', color: '#059669', page: 'snake' }
];
