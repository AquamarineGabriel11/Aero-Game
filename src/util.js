/* Utilidades compartidas: matemáticas, canvas, preferencias y sprites */

export const TAU = Math.PI * 2;
export const rand = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = t => 1 - Math.pow(1 - t, 3);
export const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0];
export const reduceMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

export function mk(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/* Reflejo de ventana de cuatro paneles: el sello visual de Frutiger Aero */
export function windowHighlight(g, x, y, size, rot, alpha) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(1, 0.72);
  const s = size / 2, gap = size * 0.08;
  const grd = g.createLinearGradient(0, -s, 0, s);
  grd.addColorStop(0, `rgba(255,255,255,${alpha})`);
  grd.addColorStop(1, `rgba(255,255,255,${alpha * 0.22})`);
  g.fillStyle = grd;
  for (const [ix, iy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    roundRect(g, ix < 0 ? -s : gap / 2, iy < 0 ? -s : gap / 2, s - gap / 2, s - gap / 2, size * 0.09);
    g.fill();
  }
  g.restore();
}

/* ---------- Preferencias y récords (solo en este navegador) ---------- */
export const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* almacenamiento no disponible */ }
  },
};

export const prefs = Object.assign({ sound: true, vibe: true, quality: "alta" }, store.get("aerogame.prefs", {}));
export const savePrefs = () => store.set("aerogame.prefs", prefs);

export function buzz(ms) {
  if (!prefs.vibe) return;
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* sin vibración */ }
}

export const Records = {
  list(id) { return store.get("aerogame.scores." + id, []); },
  best(id) { const l = this.list(id); return l[0] ? l[0].s : 0; },
  add(id, s, extra = "") {
    const isRecord = s > 0 && s > this.best(id);
    const l = this.list(id);
    l.push({ s, x: extra, d: Date.now() });
    l.sort((a, b) => b.s - a.s);
    store.set("aerogame.scores." + id, l.slice(0, 5));
    return isRecord;
  },
};

/* ---------- Nubes volumétricas procedurales ---------- */
export function makeCloudSprite(w, h) {
  const c = mk(w, h), g = c.getContext("2d");
  const base = h * 0.74;
  const n = Math.floor(rand(7, 11));
  const puffs = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const edge = Math.sin(t * Math.PI);
    const r = lerp(h * 0.15, h * 0.33, edge) * rand(0.85, 1.15);
    puffs.push({ x: lerp(w * 0.2, w * 0.8, t) + rand(-10, 10), y: base - r * 0.5 - edge * h * 0.12 * rand(0.6, 1.3), r });
  }
  for (let i = 0; i < 7; i++) puffs.push({ x: rand(w * 0.22, w * 0.78), y: base - rand(0, h * 0.07), r: rand(h * 0.1, h * 0.16) });
  for (const p of puffs) {
    const rg = g.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.35, p.r * 0.1, p.x, p.y, p.r);
    rg.addColorStop(0, "rgba(255,255,255,1)");
    rg.addColorStop(0.72, "rgba(255,255,255,0.96)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = rg;
    g.beginPath();
    g.arc(p.x, p.y, p.r, 0, TAU);
    g.fill();
  }
  g.globalCompositeOperation = "source-atop";
  const sh = g.createLinearGradient(0, h * 0.12, 0, base + 6);
  sh.addColorStop(0, "rgba(255,255,255,0)");
  sh.addColorStop(0.55, "rgba(222,236,250,0.3)");
  sh.addColorStop(1, "rgba(140,178,215,0.8)");
  g.fillStyle = sh;
  g.fillRect(0, 0, w, h);
  const rim = g.createRadialGradient(w * 0.78, 0, 0, w * 0.78, 0, w * 0.6);
  rim.addColorStop(0, "rgba(255,252,232,0.65)");
  rim.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = rim;
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = "source-over";
  const out = mk(w, h), og = out.getContext("2d");
  og.filter = "blur(1.6px)";
  og.drawImage(c, 0, 0);
  return out;
}

let _clouds = null;
export function cloudSprites() {
  if (!_clouds) _clouds = Array.from({ length: 6 }, () => makeCloudSprite(Math.round(rand(270, 380)), Math.round(rand(120, 170))));
  return _clouds;
}

/* Paisaje "colinas verdes bajo cielo azul" pintado en un canvas (ventana, fondo de pantalla) */
export function paintLandscape(g, w, h, { horizon = 0.62, sun = [0.78, 0.16], clouds = 7, grass = true } = {}) {
  const hy = h * horizon;
  const sky = g.createLinearGradient(0, 0, 0, hy);
  sky.addColorStop(0, "#0a5fd6");
  sky.addColorStop(0.4, "#2d95f4");
  sky.addColorStop(0.8, "#8fd3ff");
  sky.addColorStop(1, "#e4f7ff");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  const sx = w * sun[0], sy = h * sun[1], R = Math.max(w, h) * 0.55;
  const sg = g.createRadialGradient(sx, sy, 0, sx, sy, R);
  sg.addColorStop(0, "rgba(255,255,248,1)");
  sg.addColorStop(0.04, "rgba(255,255,240,0.9)");
  sg.addColorStop(0.14, "rgba(255,250,220,0.35)");
  sg.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = sg;
  g.fillRect(0, 0, w, h);
  const cs = cloudSprites();
  for (let i = 0; i < clouds; i++) {
    const s = rand(0.25, 0.7) * (w / 900);
    const c = cs[i % cs.length];
    g.globalAlpha = rand(0.85, 1);
    g.drawImage(c, rand(-0.1, 0.9) * w, rand(0.02, 0.42) * hy, c.width * s, c.height * s);
  }
  g.globalAlpha = 1;
  const hill = (base, amp, f, ph, colors) => {
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w + 8; x += 6) g.lineTo(x, h * base - Math.sin((x / w) * Math.PI * f + ph) * h * amp);
    g.lineTo(w, h);
    g.closePath();
    const gr = g.createLinearGradient(0, h * (base - amp), 0, h);
    colors.forEach((col, i) => gr.addColorStop(i / (colors.length - 1), col));
    g.fillStyle = gr;
    g.fill();
  };
  hill(horizon + 0.01, 0.04, 2.2, 1.2, ["#9cc6e8", "#c7e5f7"]);
  hill(horizon + 0.07, 0.07, 1.3, 0.5, ["#a6e96c", "#5fbf33", "#3d9a22"]);
  hill(horizon + 0.17, 0.09, 1.0, 2.4, ["#c4f879", "#74d63d", "#2f8c18"]);
  if (grass) {
    for (let i = 0; i < w * 1.2; i++) {
      const x = Math.random() * w, y = h * (horizon + 0.2) + Math.random() * h * (1 - horizon - 0.2);
      g.strokeStyle = `hsla(${92 + Math.random() * 22},70%,${40 + Math.random() * 25}%,0.5)`;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + rand(-1.5, 1.5), y - rand(2, 6));
      g.stroke();
    }
  }
}
