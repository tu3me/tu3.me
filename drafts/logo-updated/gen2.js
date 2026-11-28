// Drafts 101-104: the same content logo (98's face), but the "Updated" is a small
// handwritten note by the logo's head instead of a line under the name.
// The hand is a cursive font here, for the draft; if one is chosen it would be
// drawn as a path, since the app loads no fonts.   node gen2.js -> handwritten.html
const fs = require("fs"), path = require("path");
const CORAL = "#ef6f5a", NAVY = "#12212b", GOLD = "#ffd65c";
const RINGS = [{ cx: 11.37, eye: 5.61, pupil: 3.2 }, { cx: 23.02, eye: 3.76, pupil: 2.26 }];
const f = (n) => +n.toFixed(2);
const arch = () => RINGS.map((r) => `<path d="M${f(r.cx - r.eye * 0.8)} ${f(16 + r.eye * 0.4)} Q${r.cx} ${f(16 - r.eye * 1.15)} ${f(r.cx + r.eye * 0.8)} ${f(16 + r.eye * 0.4)}" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`).join("");
const open = () => RINGS.map((r) => `<circle cx="${r.cx}" cy="16" r="${f((r.eye + r.pupil) / 2)}" fill="#0f2b3c" stroke="#fff" stroke-width="${f(r.eye - r.pupil)}"/>`).join("");
const smile = `<path class="smile" pathLength="1" d="M13.4 21.9 Q17.7 25.4 22 21.9" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`;
const card = (inner) => `<g transform="rotate(-7 16 16)"><rect x="1.95" y="4.34" width="28.09" height="23.31" rx="5.23" fill="${CORAL}"/>${inner}</g>`;
const logo = `<svg width="34.1" height="34.1" viewBox="0 0 32 32" style="display:block;overflow:visible"><g class="before">${card(open())}</g><g class="after" style="position:absolute">${card(arch() + smile)}</g></svg>`;

const V = [
  { n: 101, note: "золотая записка над правым верхним углом карточки", cls: "a" },
  { n: 102, note: "то же, с волнистым подчёркиванием", cls: "b", under: true },
  { n: 103, note: "белая записка, без цвета", cls: "c" },
  { n: 104, note: "золотая, круче наклон, с искоркой", cls: "d", spark: true },
];
const squig = `<svg class="sq" viewBox="0 0 40 5" width="26" height="3.2"><path d="M1 3 Q4 0.5 7 3 T13 3 T19 3 T25 3 T31 3 T38 2.4" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>`;
const sparkSvg = `<svg class="sp" viewBox="-5 -5 10 10" width="6" height="6"><path d="M0 -4.6 Q.9 -.9 4.6 0 Q.9 .9 0 4.6 Q-.9 .9 -4.6 0 Q-.9 -.9 0 -4.6Z" fill="${GOLD}"/></svg>`;
const lock = (v) => `<div class="lock"><div class="lg">${logo}<span class="note ${v.cls}"><span class="w">Updated</span>${v.under ? squig : ""}${v.spark ? sparkSvg : ""}</span></div><span class="word"><span class="t1">SPACED</span><span class="t2">REPETITION</span></span></div>`;

let rows = "";
for (const v of V) rows += `<section><h2>${v.n} · ${v.note}</h2><div class="r">${lock(v)}<div class="big">${lock(v)}</div></div></section>`;
fs.writeFileSync(path.join(__dirname, "handwritten.html"), `<!doctype html><meta charset="utf-8"><title>Updated от руки</title>
<style>
body{margin:0;padding:20px 20px 40px;background:${NAVY};color:#fff;font:15px 'Segoe UI',Arial,sans-serif}
h1{font-size:20px;margin:0 0 4px}p.s{margin:0 0 6px;opacity:.7}h2{font-size:15px;margin:34px 0 14px;font-weight:600}
.r{display:flex;align-items:center;gap:60px;flex-wrap:wrap;padding-top:14px}
.lock{display:flex;align-items:center;gap:7.7px}.lg{position:relative}.big{zoom:3}
.lg svg + svg{position:absolute}
.word{display:block;line-height:1.06;font-weight:800}.t1{display:block;font-size:15.4px;letter-spacing:.235em}.t2{display:block;font-size:12.4px;font-weight:700;letter-spacing:.075em}
.note{position:absolute;left:19px;top:-9px;white-space:nowrap;line-height:1;font:400 9.5px/1 'Segoe Script','Bradley Hand','Snell Roundhand','Brush Script MT','Comic Sans MS',cursive;color:${GOLD};transform:rotate(-11deg);transform-origin:left bottom;pointer-events:none}
.note.c{color:#fff}.note.d{transform:rotate(-17deg);left:20px;top:-11px}
.note .w{display:block;clip-path:inset(0 100% 0 0);animation:write .7s 1s steps(14,end) both}
.note .sq{display:block;margin:0 0 0 1px;opacity:0;animation:fade .3s 1.7s both}
.note .sp{position:absolute;right:-8px;top:-4px;opacity:0;animation:pop .3s 1.8s both}
.before{animation:out .25s .5s both}.after{animation:inn .25s .5s both;opacity:0}.smile{stroke-dasharray:1;animation:draw .4s .7s both}
@keyframes write{to{clip-path:inset(0 0 0 0)}}@keyframes fade{to{opacity:1}}@keyframes pop{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:none}}
@keyframes out{to{opacity:0}}@keyframes inn{to{opacity:1}}@keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
.lg>svg:first-child{position:relative}
button{font:inherit;padding:6px 16px;margin:12px 0 0;border:0;border-radius:8px;background:${GOLD};color:#222;cursor:pointer}
@media (prefers-reduced-motion:reduce){.before,.after,.smile,.note *{animation:none}.before{opacity:0}.after,.note .sq,.note .sp{opacity:1}.note .w{clip-path:none}}
</style>
<h1>«Updated» от руки у головы логотипа</h1>
<p class="s">Слева натуральный размер, справа в 3 раза крупнее. Надпись «пишется» слева направо, когда глаза уже стали довольными.</p>
<button onclick="go()">Повторить</button>${rows}
<script>function go(){document.querySelectorAll('.before,.after,.smile,.w,.sq,.sp').forEach(e=>{e.style.animation='none';e.getBoundingClientRect();e.style.animation=''})}</script>`);
console.log("ok");
