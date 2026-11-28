// Drafts 97-100: the app's logo after an update -- content, with a small "Updated".
// The logo is the catalog's own (app/catalog.js, logoSvg): a coral card tilted 7
// degrees with two eyes, the left one larger. Its geometry is copied here, not
// imported; nothing in the app is touched.  node gen.js -> 97..100 .svg + index.html
const fs = require("fs"), path = require("path");
const CORAL = "#ef6f5a", INK = "#0f2b3c", NAVY = "#12212b", GOLD = "#ffd65c";
const RINGS = [{ cx: 11.37, eye: 5.61, pupil: 3.2 }, { cx: 23.02, eye: 3.76, pupil: 2.26 }];
const f = (n) => +n.toFixed(2);

const open = () => RINGS.map((r) => `<circle cx="${r.cx}" cy="16" r="${f((r.eye + r.pupil) / 2)}" fill="${INK}" stroke="#fff" stroke-width="${f(r.eye - r.pupil)}"/>`).join("");
// happy eyes: the same eye with the lid pushed up into an arch, the way a
// face looks when it smiles with its eyes shut
const arch = (w = 1.8) => RINGS.map((r) => `<path d="M${f(r.cx - r.eye * 0.8)} ${f(16 + r.eye * 0.4)} Q${r.cx} ${f(16 - r.eye * 1.15)} ${f(r.cx + r.eye * 0.8)} ${f(16 + r.eye * 0.4)}" fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round"/>`).join("");
// open eyes with a glint, looking up: pleased rather than shut
const glint = () => RINGS.map((r) => `<circle cx="${r.cx}" cy="16" r="${f((r.eye + r.pupil) / 2)}" fill="${INK}" stroke="#fff" stroke-width="${f(r.eye - r.pupil)}"/><circle cx="${f(r.cx + r.pupil * 0.35)}" cy="${f(16 - r.pupil * 0.4)}" r="${f(r.pupil * 0.3)}" fill="#fff"/>`).join("");
const smile = (cls = "smile") => `<path class="${cls}" pathLength="1" d="M13.4 21.9 Q17.7 25.4 22 21.9" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`;
const cheeks = `<g fill="#fff" opacity=".3"><ellipse cx="7" cy="22" rx="2.1" ry="1.3"/><ellipse cx="27.3" cy="21.2" rx="1.7" ry="1.1"/></g>`;

// face(eyes, extras) -> the card, 32-grid, as in catalog.js
const card = (inner) => `<g transform="rotate(-7 16 16)"><rect x="1.95" y="4.34" width="28.09" height="23.31" rx="5.23" fill="${CORAL}"/>${inner}</g>`;
const logo = (inner, size = 34.1, cls = "") => `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 32 32" style="display:block;flex-shrink:0">${card(inner)}</svg>`;

const V = [
  { n: 97, note: "прикрытые «улыбающиеся» глаза, без рта; подпись под названием",
    eyes: arch(), mouth: "", cap: "under" },
  { n: 98, note: "улыбающиеся глаза и маленькая улыбка; подпись под названием",
    eyes: arch(), mouth: smile(), cap: "under" },
  { n: 99, note: "глаза открыты, с бликами, и улыбка; подпись под названием",
    eyes: glint(), mouth: smile(), cap: "under" },
  { n: 100, note: "улыбающиеся глаза, улыбка и румянец; подпись плашкой справа",
    eyes: arch(), mouth: smile() + cheeks, cap: "pill" },
];

const WORD = (cap) => `<span class="word"><span class="t1">SPACED</span><span class="t2">REPETITION</span>${cap === "under" ? '<span class="upd">Updated</span>' : ""}</span>`;
const lockup = (v, size) => `<div class="lock cap-${v.cap}" style="--k:${size / 34.1}">${logo(`<g class="before">${open()}</g><g class="after">${v.eyes}${v.mouth}</g>`, 34.1, "lg")}${WORD(v.cap)}${v.cap === "pill" ? '<span class="pill">Updated</span>' : ""}</div>`;

let rows = "";
for (const v of V) {
  fs.writeFileSync(path.join(__dirname, `${v.n}-logo-updated.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="256" height="256">${card(v.eyes + v.mouth)}</svg>`);
  rows += `<section><h2>${v.n} · ${v.note}</h2><div class="r">${lockup(v, 34.1)}<div class="big">${lockup(v, 34.1)}</div></div></section>`;
}
fs.writeFileSync(path.join(__dirname, "index.html"), `<!doctype html><meta charset="utf-8"><title>Логотип после обновления</title>
<style>
body{margin:0;padding:20px;background:${NAVY};color:#fff;font:15px 'Segoe UI',Arial,sans-serif}
h1{font-size:20px;margin:0 0 4px}p.s{margin:0 0 6px;opacity:.7}h2{font-size:15px;margin:22px 0 8px;font-weight:600}
.r{display:flex;align-items:center;gap:44px;flex-wrap:wrap}
.lock{display:flex;align-items:center;gap:7.7px;position:relative}
.big{zoom:3.2}
.word{display:block;line-height:1.06;font-weight:800}.t1{display:block;font-size:15.4px;letter-spacing:.235em}.t2{display:block;font-size:12.4px;font-weight:700;letter-spacing:.075em}
.upd{display:block;font-size:7.6px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:${GOLD};margin-top:1.5px}
.pill{font-size:7.6px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#3a2a00;background:${GOLD};border-radius:99px;padding:2px 6px;margin-left:4px}
/* the change: normal eyes -> content ones, the smile drawn, the caption fading up */
.before{animation:out .25s .5s both}.after{animation:inn .25s .5s both}
.smile{stroke-dasharray:1;animation:draw .4s .7s both}
.upd,.pill{animation:cap .5s 1s both}
@keyframes out{to{opacity:0}}@keyframes inn{from{opacity:0}to{opacity:1}}@keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}@keyframes cap{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
.after{opacity:0}
button{font:inherit;padding:6px 16px;margin:12px 0 0;border:0;border-radius:8px;background:${GOLD};color:#222;cursor:pointer}
@media (prefers-reduced-motion:reduce){.before,.after,.smile,.upd,.pill{animation:none}.before{opacity:0}.after{opacity:1}}
</style>
<h1>Логотип после обновления</h1>
<p class="s">Слева в натуральную величину (как в шапке каталога), справа в 3,2 раза крупнее. Глаза меняются на довольные, рисуется улыбка, появляется «Updated».</p>
<button onclick="go()">Повторить</button>${rows}
<script>function go(){document.querySelectorAll('.before,.after,.smile,.upd,.pill').forEach(e=>{e.style.animation='none';e.getBoundingClientRect();e.style.animation=''})}</script>`);
console.log("ok");
