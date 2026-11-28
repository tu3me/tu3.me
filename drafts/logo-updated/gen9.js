// Drafts 116-121: content eyes without the smile, in the catalog's header with the
// "Updated" note (105's place, the New set button's colour: 115).
// The eyes are the logo's own two (app/catalog.js, RINGS); each variant only changes
// how they look when pleased.   node gen8.js -> eyes.html + <n>-eyes.svg
const fs = require("fs"), path = require("path");
const CORAL = "#ef6f5a";
const RINGS = [{ cx: 11.37, eye: 5.61, pupil: 3.2 }, { cx: 23.02, eye: 3.76, pupil: 2.26 }];
const f = (n) => +n.toFixed(2);
const G = { dark: "#0f2b3c", light: "#e8dfd0" }, INK = { dark: "#eef6f7", light: "#153040" }, BORDER = { dark: "#2a5568", light: "#b9a782" }, MUTED = { dark: "#9bb4c1", light: "#655b4f" };
const stroke = (d, w) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const each = (fn) => RINGS.map(fn).join("");
const disc = (r, dx = 0, dy = 0) => `<circle cx="${r.cx}" cy="16" r="${f((r.eye + r.pupil) / 2)}" fill="#0f2b3c" stroke="#fff" stroke-width="${f(r.eye - r.pupil)}"/>`;
const open = () => each((r) => disc(r));

const E116 = each((r) => stroke(`M${f(r.cx - r.eye * .8)} ${f(16 + r.eye * .4)} Q${r.cx} ${f(16 - r.eye * 1.15)} ${f(r.cx + r.eye * .8)} ${f(16 + r.eye * .4)}`, 1.8));
// the note: no longer a script -- the app's own sans in italics (or a serif italic), still small,
// and kept 2px clear of the page's top edge
const NOTES = [
  { n: 122, note: "курсив шрифта приложения (Segoe UI), 600", css: "font:italic 600 7px/1 'Segoe UI',system-ui,sans-serif;letter-spacing:.03em;transform:rotate(-4deg);top:2px;left:23px" },
  { n: 123, note: "то же, без наклона строки", css: "font:italic 600 7px/1 'Segoe UI',system-ui,sans-serif;letter-spacing:.03em;top:2px;left:22px" },
  { n: 124, note: "антиква-курсив (Georgia), чуть крупнее", css: "font:italic 400 8px/1 Georgia,'Times New Roman',serif;transform:rotate(-4deg);top:1.5px;left:23px" },
  { n: 125, note: "заглавными, как название, мелко и с разрядкой", css: "font:700 5.4px/1 'Segoe UI',system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;top:2.6px;left:22px" },
];
const card = (i) => `<g transform="rotate(-7 16 16)"><rect x="1.95" y="4.34" width="28.09" height="23.31" rx="5.23" fill="${CORAL}"/>${i}</g>`;
const logo = (e, big) => `<svg width="${big || 34.1}" height="${big || 34.1}" viewBox="0 0 32 32" style="display:block;overflow:visible">${card(e)}</svg>`;
const hdr = (theme, e, v) => `<div class="hdr ${theme}"><div class="mark">${logo(e)}</div><span class="word"><span class="t1">SPACED</span><span class="t2">REPETITION</span></span>
<span class="note" style="${v.css};color:${MUTED[theme]}">Updated</span>
<div class="grip" style="color:${INK[theme]}"><svg width="13.7" height="13.7" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 10.5L10.5 2"/><path d="M2 5.5L5.5 2"/></svg></div>
<div class="acts"><span class="btn">+ New set</span><span class="btn sq"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg></span></div></div>`;

let rows = "";
for (const v of NOTES) rows += `<section><h2>${v.n} · ${v.note}</h2><div class="hs"><div class="x">${hdr("dark", E116, v)}</div><div class="x">${hdr("light", E116, v)}</div></div></section>`;
fs.writeFileSync(path.join(__dirname, "note-fonts.html"), `<!doctype html><meta charset="utf-8"><title>Updated читаемее</title>
<style>
body{margin:0;padding:20px;background:#555;color:#fff;font:15px 'Segoe UI',Arial,sans-serif}
h1{font-size:20px;margin:0 0 4px}p.s{margin:0 0 6px;opacity:.85;max-width:640px}h2{font-size:14px;margin:22px 0 8px;font-weight:600}
.r{display:flex;gap:16px;align-items:center}.hs{display:flex;flex-direction:column;gap:5px}.x{zoom:1;width:350px}.face svg{width:110px;height:110px}
.hdr{position:relative;box-sizing:border-box;width:350px;height:47.7px;padding:6.8px;overflow:hidden;display:flex;align-items:center;gap:7.7px}
.hdr.dark{background:${G.dark};color:${INK.dark}}.hdr.light{background:${G.light};color:${INK.light}}
.mark{width:34.1px;height:34.1px;flex:none}.mark svg{overflow:visible}
.before{animation:out .25s .5s both}.after{animation:inn .25s .5s both;opacity:0}
.word{display:block;line-height:1.06;font-weight:800}.t1{display:block;font-size:15.4px;letter-spacing:.235em}.t2{display:block;font-size:12.4px;font-weight:700;letter-spacing:.075em}
.acts{position:absolute;right:6.8px;top:9.3px;display:flex;gap:6.8px}.btn{height:29px;box-sizing:border-box;padding:0 10.2px;border:1px solid;border-radius:10.2px;font:600 12.8px/27px 'Segoe UI',Arial}.btn.sq{width:29px;padding:0;display:grid;place-items:center}
.dark .btn{border-color:${BORDER.dark};color:${MUTED.dark}}.light .btn{border-color:${BORDER.light};color:${MUTED.light}}
/* the app's own resize corner (core/base.js, .app-grip in core/app.css): 13.7px, ink at .32, in the app's top-left corner */
.grip{position:absolute;left:0;top:0;width:13.7px;line-height:0;opacity:.32;z-index:5}
.note{position:absolute;white-space:nowrap;transform-origin:left bottom;pointer-events:none}
.note .w{display:block;clip-path:inset(0 100% 0 0);animation:write .7s 1s steps(14,end) both}
@keyframes write{to{clip-path:inset(0 0 0 0)}}@keyframes out{to{opacity:0}}@keyframes inn{to{opacity:1}}
button.go{font:inherit;padding:6px 16px;margin:12px 0 0;border:0;border-radius:8px;background:#ffd65c;color:#222;cursor:pointer}
@media (prefers-reduced-motion:reduce){.before,.after,.w{animation:none}.before{opacity:0}.after{opacity:1}.w{clip-path:none}}
</style>
<h1>«Updated» читаемее, ниже от края</h1><p class="s">Глаза 116, без анимации. Надпись цветом кнопки «New set», не ближе 2 px к верхнему краю страницы. В левом верхнем углу — уголок ресайза, как в приложении.</p>
${rows}
`);
console.log("ok");
