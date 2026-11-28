// Variant 91: the final snake emblem (66 on dark, 72 on light) with a wavy rim
// that draws itself clockwise from the top. The rim is the drafts' own outline,
// walked by arc length and pushed in and out along its normal by a sine whose
// period divides the length, so the wave closes on itself without a seam.
const fs = require("fs"), path = require("path");
const SRC = path.join(__dirname, "..", "snake-icons");
const OLD = 'M143 16 H257 A127 127 0 0 1 384 143 V232 Q384 340 200 422 Q16 340 16 232 V143 A127 127 0 0 1 143 16 Z';

// the outline as pieces, clockwise from the top middle: [point(t) in 0..1]
const line = (a, b) => (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const arc = (cx, cy, r, a0, a1) => (t) => { const a = (a0 + (a1 - a0) * t) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
const quad = (p0, p1, p2) => (t) => [0, 1].map((i) => (1 - t) ** 2 * p0[i] + 2 * (1 - t) * t * p1[i] + t * t * p2[i]);
const pieces = [
  line([200, 16], [257, 16]), arc(257, 143, 127, -90, 0), line([384, 143], [384, 232]),
  quad([384, 232], [384, 340], [200, 422]), quad([200, 422], [16, 340], [16, 232]),
  line([16, 232], [16, 143]), arc(143, 143, 127, 180, 270), line([143, 16], [200, 16]),
];
// dense samples with cumulative length
const pts = []; let L = 0;
for (const f of pieces) for (let i = 0; i <= 200; i++) {
  const p = f(i / 200), q = pts[pts.length - 1];
  if (q) L += Math.hypot(p[0] - q.p[0], p[1] - q.p[1]);
  pts.push({ p, s: L });
}
function wavy(div, amp, bez) {
const WAVES = Math.round(L / div), A = amp; // ~20 long, ~7 high: small, like a lace edge
const out = [];
for (let k = 0; k < pts.length; k += 2) {
  const { p, s } = pts[k], a = pts[Math.max(k - 1, 0)].p, b = pts[Math.min(k + 1, pts.length - 1)].p;
  let dx = b[0] - a[0], dy = b[1] - a[1]; const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
  const o = A * Math.sin(2 * Math.PI * WAVES * s / L); // clockwise: the outside is to the right of travel
  out.push([p[0] - dy * o, p[1] + dx * o]);
}
const Dpoly = "M" + out.map((q) => q[0].toFixed(1) + " " + q[1].toFixed(1)).join(" L") + " Z";

// The same wave in cubic curves: one per quarter period, the ends and the slopes
// taken from the displaced line itself, so a sine quarter is one smooth piece
// and nothing is guessed. 4 pieces a wave instead of ~26 line segments.
const base = (s) => {
  s = ((s % L) + L) % L;
  let lo = 0, hi = pts.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m].s <= s) lo = m; else hi = m; }
  const u = (s - pts[lo].s) / ((pts[hi].s - pts[lo].s) || 1);
  return [0, 1].map((i) => pts[lo].p[i] + (pts[hi].p[i] - pts[lo].p[i]) * u);
};
const disp = (s) => {
  const p = base(s), a = base(s - 0.5), b = base(s + 0.5);
  let dx = b[0] - a[0], dy = b[1] - a[1]; const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
  const o = A * Math.sin(2 * Math.PI * WAVES * s / L);
  return [p[0] - dy * o, p[1] + dx * o];
};
const N = 4 * WAVES, h = L / N, e = 0.5, f1 = (v) => +v.toFixed(1);
const node = (k) => { const s = k * h, p = disp(s), a = disp(s - e), b = disp(s + e); return { p, t: [(b[0] - a[0]) / (2 * e) * h / 3, (b[1] - a[1]) / (2 * e) * h / 3] }; };
let D = "", cur = node(0);
D += `M${f1(cur.p[0])} ${f1(cur.p[1])}`;
for (let k = 1; k <= N; k++) {
  const nx = k === N ? node(0) : node(k);
  D += `C${f1(cur.p[0] + cur.t[0])} ${f1(cur.p[1] + cur.t[1])} ${f1(nx.p[0] - nx.t[0])} ${f1(nx.p[1] - nx.t[1])} ${f1(nx.p[0])} ${f1(nx.p[1])}`;
  cur = nx;
}
D += "Z";

// how far the curves stray from the 804-point line they replace
const segd = (p, a, b) => { const vx = b[0] - a[0], vy = b[1] - a[1]; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / (vx * vx + vy * vy || 1))); return Math.hypot(p[0] - a[0] - t * vx, p[1] - a[1] - t * vy); };
let dev = 0;
{ const m = D.match(/-?\d+\.?\d*/g).map(Number); let px = m[0], py = m[1];
  for (let i = 2; i + 5 < m.length + 1; i += 6) {
    const [x1, y1, x2, y2, x3, y3] = m.slice(i, i + 6);
    for (let u = 0.1; u < 1; u += 0.1) {
      const q = [0, 1].map((j) => (1 - u) ** 3 * [px, py][j] + 3 * (1 - u) ** 2 * u * [x1, y1][j] + 3 * (1 - u) * u * u * [x2, y2][j] + u ** 3 * [x3, y3][j]);
      let best = 1e9; for (let k = 0; k < out.length; k++) best = Math.min(best, segd(q, out[k], out[(k + 1) % out.length]));
      if (best > dev) { dev = best; var at = q.map(f1); }
    }
    px = x3; py = y3;
  } }
console.log("div", div, "waves", WAVES, "curves", N, "path chars", D.length, "vs", Dpoly.length, "max stray", dev.toFixed(2), "at", String(at));

return { D: bez ? D : Dpoly, WAVES, A, pathChars: (bez ? D : Dpoly).length };
}
const CSS = `<style>@keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}@keyframes pop{0%,70%{opacity:0;transform:scale(.6)}100%{opacity:1;transform:scale(1)}}.rim{stroke-dasharray:1;stroke-dashoffset:0;animation:draw 2.2s cubic-bezier(.45,.05,.35,1) both}@media (prefers-reduced-motion:reduce){.rim{animation:none}}</style>`;
function make(file, w) {
  let s = fs.readFileSync(path.join(SRC, file), "utf8");
  if (!s.includes(OLD)) throw new Error("rim not found in " + file);
  s = s.replace(`<path d="${OLD}" fill="none" stroke="#b8780f" stroke-linecap="round" stroke-linejoin="round" stroke-width="7"/>`,
    `<path d="${OLD}" fill="none" stroke="#b8780f" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"/><path class="rim" pathLength="1" d="${w.D}" fill="none" stroke="#b8780f" stroke-linecap="round" stroke-linejoin="round" stroke-width="${w.sw}"/>`);
  return s.replace(/width="480" height="480"/, 'width="480" height="502"').replace("</defs>", "</defs>" + CSS);
}
const V = [[91, 20, 3.4, 6], [92, 40, 6.8, 6], [93, 40, 6.8, 10], [94, 40, 6.8, 20], [95, 40, 6.8, 20, true], [96, 0, 0, 40, "straight"]];
let rows = "";
for (const [num, div, amp, sw, bez] of V) {
  const w = bez === "straight" ? { D: OLD, WAVES: 0, A: 0, sw, straight: true, pathChars: OLD.length } : Object.assign(wavy(div, amp, bez), { sw });
  const dark = make("ref-d1-v60.svg", w), light = make("ref-d3-v60.svg", w);
  fs.writeFileSync(path.join(__dirname, num + "-wavy-dark.svg"), dark);
  fs.writeFileSync(path.join(__dirname, num + "-wavy-light.svg"), light);
  rows += `<h2 style="font-size:17px;margin:22px 0 4px">${num} · ${w.straight ? "без волны" : "волна: " + w.WAVES + " гребней, высота ±" + w.A}, линия ${w.sw}${bez ? ", кривые Безье (" + w.pathChars + " зн.)" : ", отрезки (" + w.pathChars + " зн.)"}</h2><div class="row"><div>${dark}</div><div class="b l">${light}</div><div class="s">${dark}</div><div class="b l s">${light}</div></div>`;
}
fs.writeFileSync(path.join(__dirname, "index.html"), `<!doctype html><meta charset="utf-8"><title>Волнистая окантовка</title>
<style>body{margin:0;padding:24px;background:#12212b;color:#e9eef2;font:15px 'Segoe UI',Arial,sans-serif}.row{display:flex;gap:24px;flex-wrap:wrap;align-items:flex-end}
.b{padding:10px 16px;border-radius:12px}.l{background:rgb(232,223,208)}svg{width:260px;height:auto;display:block}.s svg{width:90px}
button{font:inherit;padding:6px 14px;margin:12px 0;border-radius:8px;border:0;background:#ffd34d;cursor:pointer}</style>
<h1 style="font-size:20px;margin:0 0 4px">Змейка со всеми наградами, волнистая окантовка</h1>
<p style="margin:0;opacity:.7">Тонкая ровная кайма стоит сразу, по ней по часовой от верхней середины рисуется волнистая, 2,2 с.</p>
<button onclick="go()">Повторить</button>${rows}
<script>function go(){document.querySelectorAll('.rim').forEach(p=>{p.style.animation='none';p.getBoundingClientRect();p.style.animation=''})}</script>`);
