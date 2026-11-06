/* Juego 03 · Burbujas Zen — plástico de burbujas a contrarreloj */
import { TAU, rand, mk, buzz, windowHighlight } from "../util.js";
import { Sound } from "../audio.js";
import { updateParticles, drawParticles, addText } from "./sprites.js";

export const meta = {
  id: "wrap",
  name: "Burbujas Zen",
  short: "Zen",
  tagline: "Plástico de burbujas infinito. 45 segundos para reventar todo.",
  help: "Toca o arrastra el dedo sobre las burbujas. Las verdes valen 5.",
};

const TIME = 45;

export function create(canvas, W, H, host) {
  const ctx = canvas.getContext("2d");
  const dpr = host.dpr;
  const R = 12.5, SX = 29, SY = 25.5;
  const top = 62, bottom = H - 30;
  const P = { list: [] };

  // Pre-render de burbuja intacta, dorada y reventada
  const S = 64, m = S / 2, sr = 26;
  function bubbleSprite(golden) {
    const c = mk(S, S), g = c.getContext("2d");
    // Sombra de contacto sobre la lámina
    const sh = g.createRadialGradient(m + 3, m + 5, sr * 0.6, m + 3, m + 5, sr * 1.15);
    sh.addColorStop(0, "rgba(0,50,90,0.28)");
    sh.addColorStop(1, "rgba(0,50,90,0)");
    g.fillStyle = sh;
    g.fillRect(0, 0, S, S);
    // Domo de plástico
    const dome = g.createRadialGradient(m - 8, m - 9, 2, m, m, sr);
    if (golden) {
      dome.addColorStop(0, "rgba(255,255,240,0.95)");
      dome.addColorStop(0.35, "rgba(214,255,140,0.75)");
      dome.addColorStop(0.85, "rgba(120,220,60,0.7)");
      dome.addColorStop(1, "rgba(60,160,40,0.85)");
    } else {
      dome.addColorStop(0, "rgba(255,255,255,0.85)");
      dome.addColorStop(0.35, "rgba(220,245,255,0.35)");
      dome.addColorStop(0.85, "rgba(160,215,245,0.35)");
      dome.addColorStop(1, "rgba(90,160,210,0.6)");
    }
    g.fillStyle = dome;
    g.beginPath();
    g.arc(m, m, sr, 0, TAU);
    g.fill();
    // Borde soldado de la lámina
    g.strokeStyle = golden ? "rgba(230,255,190,0.9)" : "rgba(255,255,255,0.75)";
    g.lineWidth = 1.6;
    g.stroke();
    g.strokeStyle = "rgba(40,110,170,0.25)";
    g.lineWidth = 1;
    g.beginPath();
    g.arc(m, m, sr - 2, Math.PI * 0.1, Math.PI * 0.9);
    g.stroke();
    windowHighlight(g, m - sr * 0.38, m - sr * 0.4, sr * 0.55, -0.45, 0.95);
    g.strokeStyle = "rgba(255,255,255,0.6)";
    g.lineWidth = 2.4;
    g.lineCap = "round";
    g.beginPath();
    g.arc(m, m, sr * 0.74, Math.PI * 0.12, Math.PI * 0.5);
    g.stroke();
    return c;
  }
  function poppedSprite() {
    const c = mk(S, S), g = c.getContext("2d");
    g.fillStyle = "rgba(200,230,250,0.22)";
    g.beginPath();
    for (let i = 0; i <= 14; i++) {
      const a = (i / 14) * TAU, rr = sr * (0.82 + Math.random() * 0.18);
      i ? g.lineTo(m + Math.cos(a) * rr, m + Math.sin(a) * rr) : g.moveTo(m + Math.cos(a) * rr, m + Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
    g.strokeStyle = "rgba(255,255,255,0.45)";
    g.lineWidth = 1;
    g.stroke();
    // Arrugas del plástico aplastado
    g.strokeStyle = "rgba(60,120,170,0.35)";
    g.lineWidth = 0.8;
    for (let i = 0; i < 6; i++) {
      const a = rand(0, TAU);
      g.beginPath();
      g.moveTo(m + Math.cos(a) * rand(2, 8), m + Math.sin(a) * rand(2, 8));
      g.quadraticCurveTo(m + Math.cos(a + 0.4) * sr * 0.5, m + Math.sin(a + 0.4) * sr * 0.5, m + Math.cos(a) * sr * 0.85, m + Math.sin(a) * sr * 0.85);
      g.stroke();
    }
    g.strokeStyle = "rgba(255,255,255,0.55)";
    g.beginPath();
    g.moveTo(m - 6, m - 2);
    g.lineTo(m + 4, m + 3);
    g.stroke();
    return c;
  }
  const sprIntact = bubbleSprite(false), sprGold = bubbleSprite(true);
  const sprPopped = [poppedSprite(), poppedSprite(), poppedSprite()];

  // Fondo: lámina de plástico sobre una mesa de cristal iluminada
  const bg = (() => {
    const c = mk(W * dpr, H * dpr), g = c.getContext("2d");
    g.scale(dpr, dpr);
    const base = g.createLinearGradient(0, 0, W, H);
    base.addColorStop(0, "#bfeeff");
    base.addColorStop(0.5, "#8fd6ff");
    base.addColorStop(1, "#5fbfee");
    g.fillStyle = base;
    g.fillRect(0, 0, W, H);
    // Bokeh de luces
    for (let i = 0; i < 14; i++) {
      const x = rand(0, W), y = rand(0, H), r = rand(14, 40);
      const bk = g.createRadialGradient(x, y, 0, x, y, r);
      const col = Math.random() < 0.4 ? "198,255,74" : "255,255,255";
      bk.addColorStop(0, `rgba(${col},0.35)`);
      bk.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = bk;
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
    }
    // Brillos diagonales del plástico
    g.save();
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4; i++) {
      const x = rand(-W * 0.2, W);
      const lg = g.createLinearGradient(x, 0, x + 60, 0);
      lg.addColorStop(0, "rgba(255,255,255,0)");
      lg.addColorStop(0.5, "rgba(255,255,255,0.12)");
      lg.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = lg;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.translate(x, 0);
      g.rotate(0.35);
      g.fillRect(0, -H, 60, H * 3);
    }
    g.restore();
    return c;
  })();

  const state = { mode: "playing", time: TIME, score: 0, sheets: 0, slide: 0, popsInRow: 0, lastPop: 0, t: 0 };
  let sheet = [];

  function newSheet() {
    sheet = [];
    const cols = Math.floor((W - 10) / SX);
    const rows = Math.floor((bottom - top) / SY);
    const ox = (W - (cols - 1) * SX - SX / 2) / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        sheet.push({ x: ox + c * SX + (r % 2 ? SX / 2 : 0), y: top + R + r * SY, popped: false, gold: Math.random() < 0.06, anim: 0, v: Math.floor(rand(0, 3)), press: 0 });
      }
    }
    state.slide = 1;
  }

  const hud = () => host.hud({ score: state.score, label: "TIEMPO", value: Math.ceil(state.time), lives: null });

  function popAt(x, y) {
    if (state.mode !== "playing" || state.slide > 0.3) return;
    for (const b of sheet) {
      if (b.popped) continue;
      const dx = x - b.x, dy = y - b.y;
      if (dx * dx + dy * dy < (R + 2) * (R + 2)) pop(b);
    }
  }

  function pop(b) {
    b.popped = true;
    b.anim = 1;
    const now = state.t;
    state.popsInRow = now - state.lastPop < 0.35 ? state.popsInRow + 1 : 1;
    state.lastPop = now;
    const pts = b.gold ? 5 : 1;
    state.score += pts;
    Sound.wrapPop(b.x / W, b.gold);
    buzz(b.gold ? 15 : 6);
    for (let i = 0; i < (b.gold ? 12 : 6); i++) {
      const a = rand(0, TAU), sp = rand(20, 70);
      P.list.push({ kind: "mist", x: b.x + Math.cos(a) * 6, y: b.y + Math.sin(a) * 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, r: rand(0.4, 1), life: rand(0.25, 0.5), max: 0.5 });
    }
    P.list.push({ kind: "ring", x: b.x, y: b.y, r: R * 0.6, life: 0.25, max: 0.25 });
    if (b.gold) {
      addText(P, b.x, b.y - 10, "+5", "#eaffc8", 12);
      for (let i = 0; i < 5; i++) P.list.push({ kind: "spark", x: b.x + rand(-6, 6), y: b.y + rand(-6, 6), s: rand(2, 5), life: 0.4, max: 0.4 });
    }
    if (sheet.every(s => s.popped)) {
      state.sheets++;
      state.score += 10;
      state.time = Math.min(TIME, state.time + 5);
      Sound.arpeggio(true);
      addText(P, W / 2, H / 2, "Hoja completa · +5 s", "#eaffc8", 15);
      setTimeout(newSheet, 450);
    }
    hud();
  }

  function update(dt) {
    state.t += dt;
    state.slide = Math.max(0, state.slide - dt * 2.4);
    updateParticles(P, dt, H + 20);
    for (const b of sheet) { b.anim = Math.max(0, b.anim - dt * 6); }
    if (state.mode !== "playing") return;
    const before = Math.ceil(state.time);
    state.time -= dt;
    if (Math.ceil(state.time) !== before) {
      hud();
      if (state.time <= 5 && state.time > 0) Sound.tick();
    }
    if (state.time <= 0) {
      state.time = 0;
      state.mode = "over";
      hud();
      Sound.arpeggio(false);
      host.over(state.score, `${state.sheets} ${state.sheets === 1 ? "hoja" : "hojas"}`);
    }
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(bg, 0, 0, W, H);
    const off = state.slide > 0 ? Math.pow(state.slide, 2) * W : 0;
    ctx.save();
    ctx.translate(off, 0);
    // Lámina translúcida
    ctx.fillStyle = "rgba(235,250,255,0.22)";
    ctx.fillRect(4, top - 6, W - 8, bottom - top + 8);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.strokeRect(4.5, top - 5.5, W - 9, bottom - top + 7);
    const k = (R * 2) / (sr * 2);
    for (const b of sheet) {
      let spr = b.popped ? sprPopped[b.v] : b.gold ? sprGold : sprIntact;
      let s = S * k;
      if (b.popped && b.anim > 0) {
        // Rebote al aplastarse
        const sc = 1 + Math.sin(b.anim * Math.PI) * 0.18;
        s *= sc;
        ctx.globalAlpha = 1;
        ctx.drawImage(sprIntact, b.x - (S * k * b.anim) / 2, b.y - (S * k * b.anim) / 2, S * k * b.anim, S * k * b.anim);
      }
      if (b.gold && !b.popped) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const glow = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, R * 1.6);
        glow.addColorStop(0, `rgba(198,255,74,${0.25 + Math.sin(state.t * 4 + b.x) * 0.12})`);
        glow.addColorStop(1, "rgba(198,255,74,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(b.x - R * 2, b.y - R * 2, R * 4, R * 4);
        ctx.restore();
      }
      ctx.drawImage(spr, b.x - s / 2, b.y - s / 2, s, s);
    }
    ctx.restore();
    drawParticles(ctx, P, false);
    drawParticles(ctx, P, true);
    if (state.mode === "playing" && state.time <= 5) {
      ctx.fillStyle = `rgba(255,255,255,${0.08 + Math.sin(state.t * 10) * 0.05})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // Entrada: tocar y arrastrar revienta
  let down = false;
  const toLocal = e => { const r = canvas.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
  const onDown = e => { down = true; canvas.setPointerCapture?.(e.pointerId); popAt(...toLocal(e)); };
  const onMove = e => { if (down) popAt(...toLocal(e)); };
  const onUp = () => { down = false; };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);

  newSheet();
  state.slide = 0;
  hud();

  return {
    update, draw,
    key(code, isDown) {
      // Accesible por teclado: Espacio revienta la siguiente burbuja
      if (code === "Space" && isDown) { const b = sheet.find(s => !s.popped); if (b) pop(b); return true; }
      return false;
    },
    release() { down = false; },
    destroy() {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    },
  };
}
