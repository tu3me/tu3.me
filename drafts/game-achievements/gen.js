// Draft: achievements on the tiles of Flashcards, Quiz and Wordcraft, built the
// way the snake's are (app/snake/icon.js): the tile turns into a shield, a ribbon
// carries the record, three prizes stand round it and fill with gold by wins.
// Pure Node, no dependencies:  node gen.js  ->  *.svg and index.html next to it.
// Nothing here touches the app.
const fs = require("fs");
const path = require("path");
const OUT = __dirname;

const NAVY = "#16323f", EDGE = "#c98414", RIM = "#b8780f";
const GOLD = [[0, "#ffe680"], [0.55, "#f6c232"], [1, "#d9921a"]];
const SPARK = "#ffd34d";
const STEPS = [0, 0.3, 0.6, 1];

const SQUARE = (c) => `<rect x="30" y="30" width="340" height="340" rx="113" fill="${c}"/>`;
const SHIELD = (c) => `<path d="M143 30 H257 A113 113 0 0 1 370 143 V226 Q370 316 200 386 Q30 316 30 226 V143 A113 113 0 0 1 143 30 Z" fill="${c}"/>`;
const RIM_PATH = "M143 16 H257 A127 127 0 0 1 384 143 V226 Q384 324 200 396 Q16 324 16 226 V143 A127 127 0 0 1 143 16 Z";
const TAILS = `<g fill="#d9921a" stroke="#8a560a" stroke-width="3" stroke-linejoin="round"><polygon points="75.4,334 14.7,348 31,369 14.7,390 78.6,390"/><polygon points="324.6,334 385.3,348 369,369 385.3,390 321.4,390"/></g><g fill="#7a4a07"><polygon points="60.6,370 81.9,380 81.9,392 60.6,382"/><polygon points="339.4,370 318.1,380 318.1,392 339.4,382"/></g>`;
const BANNER = "M60.6 282 Q200 218 339.4 282 L339.4 382 Q200 318 60.6 382 Z";
const BANNER_LINE = "M72.1 362 Q200 298 327.9 362";

// ---- the games: the glyph of the app's own tile (24-unit box) and the prizes.
// A prize is drawn in its own units, about 100 across, centred on 0,0.
// `shape` is one solid silhouette; `detail(gold)` is what the finished prize adds.
const PRIZES = {
  deck: {
    shape: `<rect x="-34" y="-38" width="50" height="62" rx="9" transform="rotate(14 -9 -7)"/><rect x="-18" y="-24" width="52" height="64" rx="9" transform="rotate(-6 8 8)"/>`,
    detail: () => `<path d="M-6 8 L4 19 L21 -3" fill="none" stroke="${NAVY}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" transform="rotate(-6 8 8)"/>`,
  },
  bolt: {
    shape: `<polygon points="9,-46 -27,6 -3,6 -13,46 28,-14 4,-14" stroke-linejoin="round"/>`,
    detail: () => "",
  },
  bulb: {
    shape: `<circle cx="0" cy="-12" r="29"/><rect x="-14" y="10" width="28" height="22" rx="6"/><rect x="-10" y="30" width="20" height="12" rx="5"/>`,
    detail: () => `<path d="M-9 -2 L-9 -22 Q-9 -30 0 -30" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="5" stroke-linecap="round"/><path d="M-7 22 H7" stroke="${EDGE}" stroke-width="3"/>`,
  },
  target: {
    shape: `<circle cx="0" cy="0" r="42"/>`,
    detail: () => `<circle r="27" fill="none" stroke="${EDGE}" stroke-width="4.5"/><circle r="12" fill="${EDGE}" stroke="none"/>`,
  },
  summit: {
    shape: `<polygon points="-46,40 -12,-14 4,10 18,-8 46,40" stroke-linejoin="round"/><rect x="-14.5" y="-46" width="5" height="36" rx="2"/><polygon points="-10,-46 14,-37 -10,-27"/>`,
    detail: () => `<path d="M-24 16 L-12 -3 M10 20 L18 8" stroke="${EDGE}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
  },
  piece: {
    shape: `<path d="M-30 -26 H-9 C-9 -44 9 -44 9 -26 H30 V-9 C48 -9 48 9 30 9 V30 H-30 Z" stroke-linejoin="round"/>`,
    detail: () => `<path d="M-18 -10 V16" stroke="${EDGE}" stroke-width="3.5" stroke-linecap="round" fill="none" opacity=".0"/>`,
  },
  eye: {
    shape: `<path d="M-48 0 Q0 -46 48 0 Q0 46 -48 0 Z" stroke-linejoin="round"/>`,
    detail: () => `<circle r="17" fill="${NAVY}" stroke="none"/><circle cx="5" cy="-5" r="5.5" fill="#fff" stroke="none"/>`,
  },
  gem: {
    shape: `<polygon points="-30,-30 30,-30 48,-6 0,44 -48,-6" stroke-linejoin="round"/>`,
    detail: () => `<path d="M-48 -6 H48 M-16 -30 L-24 -6 L0 44 L24 -6 L16 -30" fill="none" stroke="${EDGE}" stroke-width="3.5" stroke-linejoin="round"/>`,
  },
};

// frames: the three places round the shield (top, left, right)
const FRAMES = ["translate(200 24) scale(1.4)", "translate(20 196) rotate(-14) scale(1.35)", "translate(380 196) rotate(14) scale(1.35)"];

const GAMES = {
  flashcards: {
    title: "Flashcards", color: "#ef6f5a", no: 73,
    glyph: `<g transform="rotate(-8 12 12)"><path d="M6 9.4V6.6a2 2 0 0 1 2-2h9.4" transform="rotate(16 10.5 6.4)"/><rect x="3" y="8.8" width="17.4" height="11" rx="2.6"/></g>`,
    record: 37, prizes: ["deck", "bolt", "bulb"],
  },
  quiz: {
    title: "Quiz", color: "#d9a520", no: 79, halo: true,
    glyph: `<path d="M2.6 8.2 L5.2 10.8 L9.4 5"/><path d="M12.6 8h8.4"/><path d="M3.2 13.2 L8.8 18.8"/><path d="M8.8 13.2 L3.2 18.8"/><path d="M12.6 16h8.4"/>`,
    record: 26, prizes: ["target", "summit", "bolt"],
  },
  wordcraft: {
    title: "Wordcraft", color: "#9b72d4", no: 85,
    glyph: `<g fill="currentColor" stroke="none"><rect x="1.4" y="8.1" width="5.6" height="7.8" rx="1.4"/><rect x="9.2" y="8.1" width="5.6" height="7.8" rx="1.4"/><rect x="17" y="8.1" width="5.6" height="7.8" rx="1.4" fill-opacity="0.4"/></g>`,
    record: 18, prizes: ["piece", "eye", "gem"],
  },
};

// the states, in the order a set grows through them; `lv` is a level per prize
// (null = never won, 0 = the silhouette, then .3, .6, 1)
const STATES = [
  { key: "plain", cap: "нет достижений", record: 0, lv: [null, null, null] },
  { key: "record", cap: "рекорд серии", lv: [null, null, null] },
  { key: "one", cap: "первая награда", lv: [0, null, null] },
  { key: "first", cap: "по одной победе", lv: [0, 0, 0] },
  { key: "mixed", cap: "2, 3 и 4 победы", lv: [0.3, 0.6, 1] },
  { key: "done", cap: "всё собрано", lv: [1, 1, 1], done: true },
];

function icon(gk, st, dark = true) {
  const g = GAMES[gk];
  const id = (n) => `${gk}-${st.key}-${n}`;
  const record = st.key === "plain" ? 0 : g.record;
  const shield = record > 0 || st.lv.some((l) => l !== null);
  const gold = `url(#${id("gold")})`;
  const spark = dark ? SPARK : "#a86d0c";
  const won = st.lv.map((l, i) => (l === null ? null : { l, p: PRIZES[g.prizes[i]], frame: FRAMES[i], n: i })).filter(Boolean);

  const masks = won.map((w) => `<mask id="${id("m" + w.n)}" maskUnits="userSpaceOnUse" x="-70" y="-70" width="140" height="140"><g fill="#fff">${w.p.shape}</g></mask>`).join("");
  const prizes = won.map((w) => {
    let body;
    if (w.l === 1) {
      // a dark keyline under the gold where the tile is itself amber (Quiz): gold on #d9a520 is lost
      const halo = g.halo ? `<g fill="${NAVY}" stroke="${NAVY}" stroke-width="9" stroke-linejoin="round">${w.p.shape}</g>` : "";
      body = `${halo}<g fill="${gold}" stroke="${EDGE}" stroke-width="3.5" stroke-linejoin="round">${w.p.shape}</g>${w.p.detail()}`;
    } else {
      const top = -55 + 110 * (1 - w.l);
      body = `<g fill="${NAVY}" stroke="${EDGE}" stroke-width="10" stroke-linejoin="round">${w.p.shape}</g><g fill="${NAVY}">${w.p.shape}</g>` +
        (w.l > 0 ? `<g mask="url(#${id("m" + w.n)})"><rect x="-60" y="${top}" width="120" height="${110 - (top + 55)}" fill="${gold}"/></g>` : "");
    }
    return `<g transform="${w.frame}">${body}</g>`;
  }).join("");

  const ribbon = record
    ? `${TAILS}<path d="${BANNER}" fill="${gold}" stroke="#9c650c" stroke-width="5" stroke-linejoin="round"/><path id="${id("curve")}" d="${BANNER_LINE}" fill="none"/><text font-weight="900" font-size="88" fill="#14202b" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif"><textPath href="#${id("curve")}" startOffset="50%">${record}</textPath></text>`
    : "";

  const rim = st.done ? `<path d="${RIM_PATH}" fill="none" stroke="${RIM}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>` : "";
  const sparks = st.done
    ? [
        `<polygon points="13,121 16.9,129.6 26.3,130.7 19.4,137.1 21.2,146.3 13,141.7 4.8,146.3 6.6,137.1 -0.3,130.7 9.1,129.6" fill="${gold}" stroke="${dark ? EDGE : spark}" stroke-width="1.3" stroke-linejoin="round"/>`,
        `<polygon points="378,-16 384.2,-2.5 398.9,-0.8 388,9.3 390.9,23.8 378,16.6 365.1,23.8 368,9.3 357.1,-0.8 371.8,-2.5" fill="${gold}" stroke="${dark ? EDGE : spark}" stroke-width="2" stroke-linejoin="round"/>`,
        `<path d="M394 69 Q396.2 77.8 405 80 Q396.2 82.2 394 91 Q391.8 82.2 383 80 Q391.8 77.8 394 69 Z" fill="${spark}"/>`,
        ...[[392, 140, 4], [25, 208, 4.5], [104, 392, 5], [296, 390, 5], [312, -4, 4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${spark}"/>`),
      ].join("")
    : "";

  // the app's own glyph, white: big in the middle of the plain tile, higher in the shield
  const s = shield ? 6.4 : 7.4, cy = shield ? 148 : 200;
  const glyph = `<g color="#fff" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="translate(200 ${cy}) scale(${s}) translate(-12 -12)">${g.glyph}</g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 500 510" width="500" height="510"><defs><linearGradient id="${id("gold")}" x1="0" y1="0" x2="0" y2="1">${GOLD.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("")}</linearGradient>${masks}</defs>${rim}${shield ? SHIELD(g.color) : SQUARE(g.color)}${glyph}${ribbon}${prizes}${sparks}</svg>`;
}

const RULES = {
  flashcards: [
    ["Лента", "самая длинная серия слов подряд, вспомненных без переворота карточки (идёт через раунды)"],
    ["Колода", "раунд, где все 10 слов вспомнены, не переворачивая карточку — «чистый раунд»"],
    ["Молния", "чистый раунд быстрее 45 секунд — слова знакомы с первого взгляда"],
    ["Лампочка", "чистый раунд из «старых» слов: у каждого ступень 5 и выше, то есть память держится, а не повторена вчера"],
  ],
  quiz: [
    ["Лента", "самая длинная серия верных ответов подряд (идёт через раунды)"],
    ["Мишень", "раунд из 10 ответов без единой ошибки — «чистый раунд»"],
    ["Вершина", "чистый раунд, где в каждом вопросе 5–6 вариантов: верхняя сложность, то есть слова выучены глубоко"],
    ["Молния", "чистый раунд быстрее 45 секунд"],
  ],
  wordcraft: [
    ["Лента", "самая длинная серия слов подряд, собранных верно (идёт через раунды)"],
    ["Деталь пазла", "раунд из 10 слов, собранных без «Проверить» и «Отменить» — с первого раза"],
    ["Глаз", "чистый раунд без озвучки: ни одного нажатия на динамик, слово собрано «на глаз»"],
    ["Самоцвет", "чистый раунд, где у каждого слова на столе чужие кусочки (ступень 5 и выше)"],
  ],
};

let html = `<!doctype html><meta charset="utf-8"><title>Достижения Flashcards, Quiz, Wordcraft</title>
<style>
:root{color-scheme:dark}body{margin:0;padding:24px;background:#12212b;color:#e9eef2;font:15px/1.45 'Segoe UI',Arial,sans-serif}
h1{font-size:22px;margin:0 0 6px}h2{margin:34px 0 4px;font-size:19px}p.s{margin:0 0 14px;opacity:.7}
.row{display:flex;flex-wrap:wrap;gap:6px 10px}figure{margin:0;text-align:center;width:150px}figure svg{width:150px;height:auto;display:block}
figcaption{font-size:13px;opacity:.85;margin-top:2px}b{color:#ffd34d}
table{border-collapse:collapse;margin:10px 0 4px;max-width:760px}td{padding:4px 12px 4px 0;vertical-align:top}td:first-child{white-space:nowrap;font-weight:600;color:#ffd34d}
.small{display:flex;gap:18px;align-items:flex-end;flex-wrap:wrap;margin-top:8px}.small svg{height:auto;display:block}
.light{background:rgb(232,223,208);padding:10px 14px;border-radius:12px;display:inline-flex;gap:18px;align-items:flex-end}
.note{max-width:760px;opacity:.85}
</style>
<h1>Достижения для Flashcards, Quiz и Wordcraft</h1>
<p class="s">Черновики по образцу змейки (финал 61–72). Код приложения не тронут.</p>
<div class="note"><p>Общая схема та же, что у змейки: нет достижений — обычная плитка; первый результат — плитка становится щитом, на нём лента с рекордом; каждая из трёх наград появляется силуэтом (одна победа), наливается золотом на 30 и 60 % (вторая и третья победа) и становится золотой целиком на четвёртой; когда золотыми стали все три — золотая кайма и искры. Ненайденная награда не рисуется вовсе.</p>
<p>У каждой игры свои три награды, но смысл у них общий: <b>чистый раунд</b>, <b>чистый раунд в самых трудных условиях</b> игры и <b>чистый раунд на скорость или без подсказки</b>. Лента — серия подряд. Все цифры — предложение, их легко сдвинуть: как у змейки, ничего не сохраняется, кроме записей журнала.</p></div>`;

let n = 0;
for (const gk of Object.keys(GAMES)) {
  const g = GAMES[gk];
  html += `<h2>${g.title}</h2><table>${RULES[gk].map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</table><div class="row">`;
  STATES.forEach((st, i) => {
    const num = g.no + i;
    fs.writeFileSync(path.join(OUT, `${num}-${gk}-${st.key}.svg`), icon(gk, st));
    html += `<figure>${icon(gk, st)}<figcaption>${num} · ${st.cap}</figcaption></figure>`;
    n++;
  });
  html += `</div>`;
}

// size check: the three finished emblems and the plain tiles at tile size, on dark and on light
const sizes = [56, 80];
html += `<h2>В размер плитки</h2><p class="s">Плитка 50 px в окне и около 80 px в каталоге; слева на тёмном, справа на светлом.</p>`;
for (const dark of [true, false]) {
  html += dark ? `<div class="small">` : `<div class="light" style="margin-top:14px">`;
  for (const gk of Object.keys(GAMES)) for (const key of ["plain", "mixed", "done"]) {
    const st = STATES.find((x) => x.key === key);
    for (const w of sizes) html += icon(gk, st, dark).replace('width="500" height="510"', `width="${w}" height="${Math.round(w * 1.02)}"`);
  }
  html += `</div>`;
}
fs.writeFileSync(path.join(OUT, "index.html"), html);
console.log("wrote", n, "svgs + index.html");
