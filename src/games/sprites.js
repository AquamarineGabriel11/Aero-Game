/* Sprites pre-renderizados compartidos por los minijuegos */
import { TAU, rand, mk, windowHighlight } from "../util.js";

export const SPR = 72, SR = 32;

function bubbleFrame(rot) {
  const c = mk(SPR, SPR), g = c.getContext("2d"), m = SPR / 2;
  const body = g.createRadialGradient(m - 6, m - 8, 2, m, m, SR);
  body.addColorStop(0, "rgba(230,250,255,0.08)");
  body.addColorStop(0.75, "rgba(190,235,255,0.1)");
  body.addColorStop(1, "rgba(230,248,255,0.38)");
  g.fillStyle = body;
  g.beginPath();
  g.arc(m, m, SR, 0, TAU);
  g.fill();

  // Película de jabón: interferencia de capa fina
  const f = mk(SPR, SPR), fg = f.getContext("2d");
  const hues = ["255,80,200", "80,210,255", "255,235,90", "110,255,150", "170,110,255", "255,80,200"];
  const film = (angle, cx, cy, a) => {
    const grd = fg.createConicGradient ? fg.createConicGradient(angle, cx, cy) : fg.createLinearGradient(0, 0, SPR, SPR);
    hues.forEach((hh, i) => grd.addColorStop(i / (hues.length - 1), `rgba(${hh},${a})`));
    return grd;
  };
  fg.fillStyle = film(rot, m + 3, m - 2, 0.6);
  fg.beginPath();
  fg.arc(m, m, SR, 0, TAU);
  fg.fill();
  fg.fillStyle = film(-rot * 1.7 + 1, m - 6, m + 7, 0.32);
  fg.fill();
  fg.globalCompositeOperation = "destination-in";
  const mask = fg.createRadialGradient(m, m, 0, m, m, SR);
  mask.addColorStop(0, "rgba(0,0,0,0.04)");
  mask.addColorStop(0.6, "rgba(0,0,0,0.16)");
  mask.addColorStop(0.9, "rgba(0,0,0,0.92)");
  mask.addColorStop(1, "rgba(0,0,0,0.55)");
  fg.fillStyle = mask;
  fg.fillRect(0, 0, SPR, SPR);
  g.drawImage(f, 0, 0);

  g.save();
  g.beginPath();
  g.arc(m, m, SR - 1, 0, TAU);
  g.clip();
  const gr = g.createLinearGradient(0, m + SR * 0.45, 0, m + SR);
  gr.addColorStop(0, "rgba(140,255,110,0)");
  gr.addColorStop(1, "rgba(140,255,110,0.38)");
  g.fillStyle = gr;
  g.fillRect(0, m, SPR, SR);
  g.restore();

  g.lineWidth = 1.4;
  g.strokeStyle = "rgba(255,255,255,0.82)";
  g.beginPath();
  g.arc(m, m, SR - 0.8, 0, TAU);
  g.stroke();
  windowHighlight(g, m - SR * 0.4, m - SR * 0.42, SR * 0.44, -0.5, 0.92);
  g.strokeStyle = "rgba(255,255,255,0.55)";
  g.lineWidth = 2.2;
  g.lineCap = "round";
  g.beginPath();
  g.arc(m, m, SR * 0.78, Math.PI * 0.15, Math.PI * 0.55);
  g.stroke();
  g.fillStyle = "#fff";
  g.beginPath();
  g.arc(m + SR * 0.45, m + SR * 0.1, 1.6, 0, TAU);
  g.fill();
  return c;
}

function drawCracks(g, m, R) {
  const ox = m + R * 0.12, oy = m - R * 0.06;
  g.lineCap = "round";
  for (let i = 0; i < 7; i++) {
    let a = (i / 7) * TAU + rand(-0.3, 0.3), x = ox, y = oy;
    g.beginPath();
    g.moveTo(x, y);
    for (let s = 0; s < 4; s++) {
      a += rand(-0.4, 0.4);
      const L = R * rand(0.14, 0.27);
      x += Math.cos(a) * L;
      y += Math.sin(a) * L;
      g.lineTo(x, y);
    }
    g.strokeStyle = "rgba(0,60,60,0.35)";
    g.lineWidth = 1.6;
    g.stroke();
    g.strokeStyle = "rgba(255,255,255,0.92)";
    g.lineWidth = 0.9;
    g.stroke();
  }
  g.fillStyle = "rgba(255,255,255,0.95)";
  g.beginPath();
  g.arc(ox, oy, 2.2, 0, TAU);
  g.fill();
}

function crystalSprite(cracked) {
  const c = mk(SPR, SPR), g = c.getContext("2d"), m = SPR / 2;
  g.save();
  g.beginPath();
  g.arc(m, m, SR, 0, TAU);
  g.clip();
  // Refracción: el mundo se ve invertido dentro de la esfera
  const inv = g.createLinearGradient(0, m - SR, 0, m + SR);
  inv.addColorStop(0, "#2f9a1f");
  inv.addColorStop(0.3, "#7fdc45");
  inv.addColorStop(0.45, "#d9ffd0");
  inv.addColorStop(0.5, "#e8fbff");
  inv.addColorStop(0.75, "#6cc8ff");
  inv.addColorStop(1, "#1f7fd8");
  g.fillStyle = inv;
  g.fillRect(0, 0, SPR, SPR);
  g.fillStyle = "rgba(255,255,255,0.75)";
  for (const [x, y, r] of [[m - 10, m + 12, 5], [m - 4, m + 10, 6], [m + 3, m + 13, 4.5], [m + 13, m + 18, 3]]) {
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }
  g.fillStyle = "rgba(150,255,80,0.22)";
  g.fillRect(0, 0, SPR, SPR);
  const fr = g.createRadialGradient(m, m, SR * 0.55, m, m, SR);
  fr.addColorStop(0, "rgba(10,70,60,0)");
  fr.addColorStop(0.85, "rgba(10,80,90,0.35)");
  fr.addColorStop(1, "rgba(5,50,70,0.78)");
  g.fillStyle = fr;
  g.fillRect(0, 0, SPR, SPR);
  g.globalCompositeOperation = "lighter";
  const ca = g.createRadialGradient(m + SR * 0.35, m + SR * 0.5, 0, m + SR * 0.35, m + SR * 0.5, SR * 0.45);
  ca.addColorStop(0, "rgba(255,255,220,0.9)");
  ca.addColorStop(1, "rgba(255,255,200,0)");
  g.fillStyle = ca;
  g.fillRect(0, 0, SPR, SPR);
  g.globalCompositeOperation = "source-over";
  if (cracked) drawCracks(g, m, SR);
  g.restore();
  g.lineWidth = 1.5;
  g.strokeStyle = "rgba(230,255,240,0.92)";
  g.beginPath();
  g.arc(m, m, SR - 0.75, 0, TAU);
  g.stroke();
  windowHighlight(g, m - SR * 0.38, m - SR * 0.44, SR * 0.52, -0.45, 0.95);
  g.fillStyle = "#fff";
  g.beginPath();
  g.arc(m + SR * 0.52, m - SR * 0.2, 1.4, 0, TAU);
  g.fill();
  return c;
}

let _bubbles = null, _crystals = null;
export const bubbleFrames = () => (_bubbles ||= Array.from({ length: 24 }, (_, i) => bubbleFrame((i / 24) * TAU)));
export const crystalSprites = () => (_crystals ||= [crystalSprite(false), crystalSprite(true)]);

/* Dibuja un sprite centrado con radio lógico r */
export function drawSprite(ctx, spr, x, y, r, sx = 1, sy = 1) {
  const k = r / SR, size = SPR * k;
  if (sx === 1 && sy === 1) { ctx.drawImage(spr, x - size / 2, y - size / 2, size, size); return; }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  ctx.drawImage(spr, -size / 2, -size / 2, size, size);
  ctx.restore();
}

/* Partículas compartidas: niebla, burbujas hijas, esquirlas, chispas, anillos, texto flotante */
export function makeParticles() {
  return { list: [] };
}

export function updateParticles(P, dt, floorY, onShardLand) {
  for (const p of P.list) {
    p.life -= dt;
    switch (p.kind) {
      case "mist":
        p.vx *= 0.97; p.vy += 170 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y > floorY + 2) p.life = 0;
        break;
      case "daughter":
        p.ph += dt * 6; p.vx *= 0.98; p.vy -= 6 * dt; p.x += (p.vx + Math.sin(p.ph) * 6) * dt; p.y += p.vy * dt;
        break;
      case "shard":
        p.vx *= 0.985; p.vy += 190 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        if (p.y >= floorY) { p.life = 0; if (onShardLand) onShardLand(p); }
        break;
      case "text": p.y += p.vy * dt; p.vy *= 0.96; break;
      case "ring": p.r += 70 * dt; break;
      default: break;
    }
  }
  P.list = P.list.filter(p => p.life > 0);
}

const filmC = mk(SPR, SPR), filmG = filmC.getContext("2d");

export function drawParticles(ctx, P, front) {
  const frames = bubbleFrames();
  for (const p of P.list) {
    const a = Math.max(0, Math.min(1, p.life / p.max));
    const isFront = p.kind === "spark" || p.kind === "text";
    if (isFront !== front) continue;
    switch (p.kind) {
      case "mist":
        ctx.fillStyle = `rgba(225,248,255,${0.85 * a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
        break;
      case "daughter":
        ctx.globalAlpha = Math.min(1, a * 1.5);
        drawSprite(ctx, frames[(Math.floor(p.ph) + p.fo) % 24], p.x, p.y, p.r);
        ctx.globalAlpha = 1;
        break;
      case "film": {
        const prog = 1 - a, k = SR / p.r;
        filmG.globalCompositeOperation = "source-over";
        filmG.clearRect(0, 0, SPR, SPR);
        filmG.drawImage(frames[p.frame], 0, 0);
        filmG.globalCompositeOperation = "destination-out";
        filmG.beginPath();
        filmG.arc(SPR / 2 + p.hx * k, SPR / 2 + p.hy * k, prog * SR * 2.3, 0, TAU);
        filmG.fill();
        drawSprite(ctx, filmC, p.x, p.y, p.r);
        break;
      }
      case "shard": {
        const glint = Math.max(0, Math.cos(p.rot * 2 + p.seed));
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, a * 2);
        ctx.beginPath();
        p.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        const tint = p.tint || [170, 255, 150];
        ctx.fillStyle = `rgba(${Math.round(tint[0] + (255 - tint[0]) * glint)},${Math.round(tint[1] + (255 - tint[1]) * glint)},${Math.round(tint[2] + (255 - tint[2]) * glint)},${0.5 + 0.45 * glint})`;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
        ctx.restore();
        break;
      }
      case "ring":
        ctx.strokeStyle = `rgba(255,255,255,${a * 0.7})`;
        ctx.lineWidth = 1.2 * a + 0.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.stroke();
        break;
      case "spark": {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const s = p.s * a;
        ctx.fillStyle = `rgba(255,255,240,${a})`;
        ctx.fillRect(p.x - s, p.y - 0.5, s * 2, 1);
        ctx.fillRect(p.x - 0.5, p.y - s, 1, s * 2);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.1, 0, TAU);
        ctx.fill();
        ctx.restore();
        break;
      }
      case "text":
        ctx.save();
        ctx.globalAlpha = Math.min(1, a * 2);
        ctx.font = `italic 800 ${p.size}px "Exo 2", "Trebuchet MS", sans-serif`;
        ctx.textAlign = "center";
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "rgba(5,80,140,0.7)";
        ctx.strokeText(p.txt, p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.fillText(p.txt, p.x, p.y);
        ctx.restore();
        break;
      default: break;
    }
  }
}

export function shatterInto(P, x, y, r, tint) {
  for (let i = 0; i < 14; i++) {
    const a = rand(0, TAU), sp = rand(30, 120), s = rand(1.8, 4.2);
    const pts = [];
    const n = Math.random() < 0.5 ? 3 : 4;
    for (let k = 0; k < n; k++) { const aa = (k / n) * TAU + rand(-0.4, 0.4); pts.push([Math.cos(aa) * s * rand(0.5, 1.2), Math.sin(aa) * s * rand(0.5, 1.2)]); }
    P.list.push({ kind: "shard", x: x + Math.cos(a) * r * 0.5, y: y + Math.sin(a) * r * 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, rot: rand(0, TAU), vr: rand(-12, 12), seed: rand(0, TAU), pts, tint, life: 2.2, max: 2.2 });
  }
  for (let i = 0; i < 7; i++) P.list.push({ kind: "spark", x: x + rand(-6, 6), y: y + rand(-6, 6), s: rand(3, 6), life: rand(0.25, 0.5), max: 0.5 });
  P.list.push({ kind: "ring", x, y, r: r * 0.8, life: 0.35, max: 0.35 });
}

export function addText(P, x, y, txt, color = "#ffffff", size = 10) {
  P.list.push({ kind: "text", x, y, vy: -22, txt, color, size, life: 0.9, max: 0.9 });
}
