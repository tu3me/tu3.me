// Drafts 109-112: 105 (the chosen place) in both themes, with four inks for the light one.
// Was: 105-108, the handwritten "Updated" fitted into the catalog's real header.
// Metrics are the app's (app/catalog.js, dict-header): padding 6.8, the mark 34.1
// at the left, the two-line wordmark beside it, the buttons at the right; the
// popup is 350 wide and the page edge clips whatever leaves the header.
// So the note lives in the strip over the mark (6.8 of padding + 4.6 of card
// margin = ~11) -- never above it.   node gen4.js -> themes.html
const fs = require("fs"), path = require("path");
const CORAL = "#ef6f5a", NAVY = "#12212b", GOLD = "#ffd65c";
const RINGS = [{ cx: 11.37, eye: 5.61, pupil: 3.2 }, { cx: 23.02, eye: 3.76, pupil: 2.26 }];
const f = (n) => +n.toFixed(2);
const arch = () => RINGS.map((r) => `<path d="M${f(r.cx - r.eye * 0.8)} ${f(16 + r.eye * 0.4)} Q${r.cx} ${f(16 - r.eye * 1.15)} ${f(r.cx + r.eye * 0.8)} ${f(16 + r.eye * 0.4)}" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`).join("");
const open = () => RINGS.map((r) => `<circle cx="${r.cx}" cy="16" r="${f((r.eye + r.pupil) / 2)}" fill="#0f2b3c" stroke="#fff" stroke-width="${f(r.eye - r.pupil)}"/>`).join("");
const smile = `<path class="smile" pathLength="1" d="M13.4 21.9 Q17.7 25.4 22 21.9" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`;
const card = (i) => `<g transform="rotate(-7 16 16)"><rect x="1.95" y="4.34" width="28.09" height="23.31" rx="5.23" fill="${CORAL}"/>${i}</g>`;
const logo = `<svg width="34.1" height="34.1" viewBox="0 0 32 32" style="display:block"><g class="before">${card(open())}</g><g class="after">${card(arch() + smile)}</g></svg>`;


const GROUND = { dark: "#0f2b3c", light: "#e8dfd0" }, INK = { dark: "#eef6f7", light: "#153040" }, BORDER = { dark: "#2a5568", light: "#b9a782" }, MUTED = { dark: "#9bb4c1", light: "#655b4f" };
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return ((Math.max(x, y) + .05) / (Math.min(x, y) + .05)); };
const NOTE = "left:22px;top:3px;font-size:7px;transform:rotate(-6deg)";
const V = [{ n: 114, note: "цвет текста названия: в каждой теме свой (t.ink)", ink: "#153040", inkDark: "#eef6f7" }];
const hdr = (theme, ink) => `<div class="hdr ${theme}"><div class="mark">${logo}</div><span class="word"><span class="t1">SPACED</span><span class="t2">REPETITION</span></span>
<span class="note" style="${NOTE};color:${ink}"><span class="w">Updated</span></span>
<div class="acts"><span class="btn">+ New set</span><span class="btn sq"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg></span></div></div>`;
let rows = "";
for (const v of V) rows += `<section><h2>${v.n} · ${v.note} ${v.ink}</h2><div class="r"><div class="x">${hdr("dark", v.inkDark)}</div><div class="x">${hdr("light", v.ink)}</div></div></section>`;
rows = `<p class="s">Тот же цвет, что у слов SPACED REPETITION: контраст на тёмной ${ratio("#eef6f7", GROUND.dark).toFixed(1)}:1, на светлой ${ratio("#153040", GROUND.light).toFixed(1)}:1.</p>` + rows;
fs.writeFileSync(path.join(__dirname, "themes-ink.html"), `<!doctype html><meta charset="utf-8"><title>Updated цветом названия</title>
<style>
body{margin:0;padding:20px;background:#555;color:#fff;font:15px 'Segoe UI',Arial,sans-serif}
h1{font-size:20px;margin:0 0 4px}p.s{margin:0 0 6px;opacity:.85;max-width:640px}h2{font-size:14px;margin:22px 0 8px;font-weight:600}
.r{display:flex;flex-direction:column;gap:6px}.x{zoom:1.75;width:350px}
.hdr{position:relative;box-sizing:border-box;width:350px;height:47.7px;padding:6.8px;overflow:hidden;display:flex;align-items:center;gap:7.7px}
.hdr.dark{background:${GROUND.dark};color:${INK.dark}}.hdr.light{background:${GROUND.light};color:${INK.light}}
.mark{width:34.1px;height:34.1px;flex:none}.mark svg{overflow:visible}
.mark .before{animation:out .25s .5s both}.mark .after{animation:inn .25s .5s both;opacity:0}.smile{stroke-dasharray:1;animation:draw .4s .7s both}
.word{display:block;line-height:1.06;font-weight:800}.t1{display:block;font-size:15.4px;letter-spacing:.235em}.t2{display:block;font-size:12.4px;font-weight:700;letter-spacing:.075em}
.acts{position:absolute;right:6.8px;top:9.3px;display:flex;gap:6.8px}.btn{height:29px;box-sizing:border-box;padding:0 10.2px;border:1px solid;border-radius:10.2px;font:600 12.8px/27px 'Segoe UI',Arial}.btn.sq{width:29px;padding:0;display:grid;place-items:center}
.dark .btn{border-color:${BORDER.dark};color:${MUTED.dark}}.light .btn{border-color:${BORDER.light};color:${MUTED.light}}
.note{position:absolute;white-space:nowrap;line-height:1;font-family:'Segoe Script','Bradley Hand','Snell Roundhand','Brush Script MT','Comic Sans MS',cursive;transform-origin:left bottom;pointer-events:none}
.note .w{display:block;clip-path:inset(0 100% 0 0);animation:write .7s 1s steps(14,end) both}
@keyframes write{to{clip-path:inset(0 0 0 0)}}@keyframes out{to{opacity:0}}@keyframes inn{to{opacity:1}}@keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
button.go{font:inherit;padding:6px 16px;margin:12px 0 0;border:0;border-radius:8px;background:${GOLD};color:#222;cursor:pointer}
@media (prefers-reduced-motion:reduce){.before,.after,.smile,.w{animation:none}.before{opacity:0}.after{opacity:1}.w{clip-path:none}}
</style>
<h1>«Updated» цветом названия</h1>
<button class="go" onclick="go()">Повторить</button>${rows}
<script>function go(){document.querySelectorAll('.before,.after,.smile,.w').forEach(e=>{e.style.animation='none';e.getBoundingClientRect();e.style.animation=''})}</script>`);
console.log(V.map((v) => v.n + " " + ratio(v.ink, GROUND.light).toFixed(2)).join("; "), "gold dark", ratio(GOLD, GROUND.dark).toFixed(2), "gold light", ratio(GOLD, GROUND.light).toFixed(2));
