/* Juego 02 · Aero Glide — planea entre columnas de cristal y cruza los anillos */
import { TAU, rand, clamp, mk, buzz, cloudSprites, windowHighlight } from "../util.js";
import { Sound } from "../audio.js";
import { bubbleFrames, drawSprite, updateParticles, drawParticles, shatterInto, addText } from "./sprites.js";

export const meta = {
  id: "glide",
  name: "Aero Glide",
  short: "Glide",
  tagline: "Planea entre columnas de cristal y cruza cada anillo.",
  help: "Mantén pulsado para subir. Suelta para planear.",
};

export function create(canvas, W, H, host) {
  const ctx = canvas.getContext("2d");
  const dpr = host.dpr;
  const WATER = H - 22;
  const frames = bubbleFrames(), clouds = cloudSprites();

  const sky = (() => {
    const c = mk(W * dpr, H * dpr), g = c.getContext("2d");
    g.scale(dpr, dpr);
    const s = g.createLinearGradient(0, 0, 0, H);
    s.addColorStop(0, "#0d63d8");
    s.addColorStop(0.5, "#4fb3ff");
    s.addColorStop(0.9, "#d4f3ff");
    g.fillStyle = s;
    g.fillRect(0, 0, W, H);
    const sg = g.createRadialGradient(W * 0.8, H * 0.14, 0, W * 0.8, H * 0.14, H * 0.5);
    sg.addColorStop(0, "rgba(255,255,245,1)");
    sg.addColorStop(0.05, "rgba(255,255,235,0.8)");
    sg.addColorStop(0.3, "rgba(255,255,255,0.12)");
    sg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = sg;
    g.fillRect(0, 0, W, H);
    return c;
  })();

  const cloudLayer = Array.from({ length: 7 }, (_, i) => ({ sp: clouds[i % clouds.length], x: rand(0, W * 1.5), y: rand(10, H * 0.55), s: rand(0.15, 0.32), k: rand(0.08, 0.25) }));

  const state = { mode: "ready", time: 0, score: 0, streak: 0, speed: 80, dist: 0, shake: 0, flash: 0 };
  const glider = { x: W * 0.28, y: H * 0.42, vy: 0, rot: 0, alive: true };
  const P = { list: [] };
  let pillars = [], spawnX = W + 40, hold = false, ripples = [];

  const gapFor = () => clamp(132 - state.score * 1.6, 92, 132);

  function spawnPillar(x) {
    const gap = gapFor();
    const margin = 48;
    const cy = rand(margin + gap / 2, WATER - margin - gap / 2);
    pillars.push({ x, w: 34, top: cy - gap / 2, bot: cy + gap / 2, cy, passed: false, lime: Math.random() < 0.35, ringPulse: 0 });
  }

  const hud = () => host.hud({ score: state.score, label: "RACHA", value: state.streak, lives: null });

  function crash() {
    if (!glider.alive) return;
    glider.alive = false;
    state.mode = "over";
    state.shake = 8;
    state.flash = 1;
    shatterInto(P, glider.x, glider.y, 10, [200, 235, 255]);
    Sound.glass(glider.x / W, 1);
    Sound.hurt(glider.x / W);
    buzz([40, 50, 40]);
    setTimeout(() => host.over(state.score, `${Math.floor(state.dist / 40)} m`), 900);
  }

  function press(down) {
    if (down && !hold) {
      if (state.mode === "ready") { state.mode = "playing"; }
      if (state.mode === "playing") Sound.lift(glider.x / W);
    }
    hold = down;
  }

  function update(dt) {
    state.time += dt;
    state.shake = Math.max(0, state.shake - dt * 22);
    state.flash = Math.max(0, state.flash - dt * 2.5);
    updateParticles(P, dt, WATER, p => { ripples.push({ x: p.x, r: 1, life: 0, max: 0.8 }); Sound.plip(p.x / W, 0.4); });
    for (const r of ripples) { r.life += dt; r.r += 22 * dt; r.x -= state.speed * dt * 0.6; }
    ripples = ripples.filter(r => r.life < r.max);

    const sp = state.mode === "over" ? state.speed * 0.25 : state.speed;
    for (const c of cloudLayer) { c.x -= sp * c.k * dt; if (c.x < -c.sp.width * c.s) { c.x = W + rand(0, 60); c.y = rand(10, H * 0.55); } }
    state.dist += sp * dt;

    if (state.mode === "ready") {
      glider.y = H * 0.42 + Math.sin(state.time * 2.2) * 8;
      glider.rot = Math.sin(state.time * 2.2 + 1) * 0.06;
      return;
    }
    if (state.mode === "playing") {
      state.speed = Math.min(80 + state.time * 1.6, 150);
      // Física de planeo: gravedad suave, empuje mientras se mantiene pulsado
      glider.vy += (hold ? -560 : 330) * dt;
      glider.vy = clamp(glider.vy, -190, 230);
      glider.y += glider.vy * dt;
      glider.rot += (clamp(glider.vy / 380, -0.45, 0.55) - glider.rot) * Math.min(1, dt * 8);
      if (glider.y < 14) { glider.y = 14; glider.vy = Math.max(0, glider.vy); }
      if (hold && Math.random() < dt * 30) P.list.push({ kind: "daughter", x: glider.x - 14, y: glider.y + 2, vx: rand(-40, -20), vy: rand(-6, 10), r: rand(0.8, 1.8), ph: rand(0, TAU), fo: Math.floor(rand(0, 24)), life: rand(0.4, 0.8), max: 0.8 });
      if (glider.y > WATER - 4) {
        for (let i = 0; i < 14; i++) P.list.push({ kind: "mist", x: glider.x, y: WATER - 2, vx: rand(-50, 50), vy: rand(-120, -40), r: rand(0.6, 1.4), life: rand(0.4, 0.7), max: 0.7 });
        crash();
      }

      spawnX -= state.speed * dt;
      if (spawnX < W + 40) { spawnPillar(spawnX + 0); spawnX += rand(140, 165); }
    }

    for (const p of pillars) {
      if (state.mode !== "ready") p.x -= sp * dt;
      p.ringPulse = Math.max(0, p.ringPulse - dt * 2);
      if (state.mode === "playing" && glider.alive) {
        const inX = glider.x + 12 > p.x - p.w / 2 && glider.x - 12 < p.x + p.w / 2;
        if (inX && (glider.y - 5 < p.top || glider.y + 5 > p.bot)) crash();
        if (!p.passed && glider.x > p.x) {
          p.passed = true;
          const centered = Math.abs(glider.y - p.cy) < 16;
          state.streak = centered ? state.streak + 1 : 1;
          const pts = centered ? 2 : 1;
          state.score += pts;
          p.ringPulse = 1;
          Sound.ring(Math.min(state.streak, 10), glider.x / W);
          addText(P, p.x + 10, p.cy - 22, centered ? `+${pts} perfecto` : `+${pts}`, centered ? "#eaffc8" : "#ffffff");
          for (let i = 0; i < 8; i++) P.list.push({ kind: "spark", x: p.x + rand(-4, 4), y: p.cy + rand(-24, 24), s: rand(2, 5), life: rand(0.3, 0.5), max: 0.5 });
          buzz(8);
          hud();
        }
      }
    }
    pillars = pillars.filter(p => p.x > -60);
  }

  // ---------- Dibujo ----------
  function hills(offset, base, amp, f, colors, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W + 6; x += 6) {
      const wx = x + offset;
      ctx.lineTo(x, base - Math.sin(wx * f) * amp - Math.sin(wx * f * 2.7 + 1) * amp * 0.3);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, base - amp, 0, WATER);
    colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }

  function pillarSeg(x, y0, y1, w, lime, capTop) {
    const h = y1 - y0;
    if (h <= 0) return;
    ctx.save();
    const r = w / 2;
    ctx.beginPath();
    if (capTop) { ctx.moveTo(x - r, y1); ctx.lineTo(x - r, y0 + r); ctx.arc(x, y0 + r, r, Math.PI, 0); ctx.lineTo(x + r, y1); }
    else { ctx.moveTo(x - r, y0); ctx.lineTo(x - r, y1 - r); ctx.arc(x, y1 - r, r, Math.PI, 0, true); ctx.lineTo(x + r, y0); }
    ctx.closePath();
    const body = ctx.createLinearGradient(x - r, 0, x + r, 0);
    if (lime) {
      body.addColorStop(0, "rgba(60,170,60,0.75)");
      body.addColorStop(0.3, "rgba(200,255,150,0.45)");
      body.addColorStop(0.55, "rgba(240,255,220,0.35)");
      body.addColorStop(1, "rgba(40,140,60,0.8)");
    } else {
      body.addColorStop(0, "rgba(20,110,190,0.75)");
      body.addColorStop(0.3, "rgba(170,235,255,0.45)");
      body.addColorStop(0.55, "rgba(230,250,255,0.35)");
      body.addColorStop(1, "rgba(10,90,170,0.8)");
    }
    ctx.fillStyle = body;
    ctx.fill();
    ctx.clip();
    // Burbujas atrapadas en el cristal
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < h / 22; i++) {
      const by = y0 + ((i * 37 + Math.floor(x)) % Math.max(1, h));
      ctx.beginPath();
      ctx.arc(x + Math.sin(i * 2.3) * r * 0.5, by, 1 + (i % 3) * 0.6, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillRect(x - r * 0.55, y0, 2.2, h);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(x + r * 0.35, y0, 1.2, h);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1;
    ctx.stroke();
    const capY = capTop ? y0 + r : y1 - r;
    windowHighlight(ctx, x - r * 0.25, capY - r * 0.2, r * 0.8, -0.3, 0.85);
  }

  function ringHalf(p, front) {
    const rx = 7, ry = (p.bot - p.top) * 0.42;
    const pulse = p.ringPulse;
    ctx.save();
    ctx.translate(p.x, p.cy);
    ctx.lineWidth = 3 + pulse * 2;
    const col = p.passed ? `rgba(198,255,74,${0.5 + pulse * 0.5})` : "rgba(198,255,74,0.9)";
    ctx.strokeStyle = col;
    ctx.shadowColor = "rgba(198,255,74,0.9)";
    ctx.shadowBlur = 8 + pulse * 10;
    ctx.beginPath();
    if (front) ctx.ellipse(0, 0, rx + pulse * 4, ry + pulse * 6, 0, -Math.PI / 2, Math.PI / 2);
    else ctx.ellipse(0, 0, rx + pulse * 4, ry + pulse * 6, 0, Math.PI / 2, Math.PI * 1.5);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.stroke();
    ctx.restore();
  }

  function drawGlider() {
    if (!glider.alive) return;
    const { x, y, rot } = glider;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    // Ala trasera
    ctx.fillStyle = "rgba(120,170,200,0.9)";
    ctx.beginPath();
    ctx.moveTo(-2, 1);
    ctx.lineTo(-12, 9);
    ctx.lineTo(-7, 9);
    ctx.lineTo(5, 2);
    ctx.closePath();
    ctx.fill();
    // Fuselaje cromado
    const ch = ctx.createLinearGradient(0, -5, 0, 5);
    ch.addColorStop(0, "#ffffff");
    ch.addColorStop(0.3, "#a8d8f5");
    ch.addColorStop(0.5, "#ffffff");
    ch.addColorStop(0.62, "#86b46f");
    ch.addColorStop(1, "#2f4f3a");
    ctx.fillStyle = ch;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.bezierCurveTo(12, -5, -6, -6, -14, -2);
    ctx.lineTo(-18, -7);
    ctx.lineTo(-15, 1);
    ctx.bezierCurveTo(-6, 5, 10, 5, 16, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(20,50,80,0.5)";
    ctx.lineWidth = 0.6;
    ctx.stroke();
    // Cabina de cristal
    const dome = ctx.createRadialGradient(5, -5, 0.5, 4, -3, 7);
    dome.addColorStop(0, "rgba(255,255,255,0.95)");
    dome.addColorStop(0.4, "rgba(120,230,255,0.8)");
    dome.addColorStop(1, "rgba(20,120,200,0.8)");
    ctx.fillStyle = dome;
    ctx.beginPath();
    ctx.ellipse(4, -3, 6, 3.6, -0.1, Math.PI, 0);
    ctx.fill();
    // Ala delantera
    const wg = ctx.createLinearGradient(0, 0, 0, 10);
    wg.addColorStop(0, "#f4fbff");
    wg.addColorStop(1, "#7fa8c4");
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.moveTo(4, 1);
    ctx.lineTo(-8, 11);
    ctx.lineTo(-2, 11);
    ctx.lineTo(10, 2);
    ctx.closePath();
    ctx.fill();
    // Luz de navegación
    ctx.globalCompositeOperation = "lighter";
    const blink = 0.5 + 0.5 * Math.sin(state.time * 6);
    const lg = ctx.createRadialGradient(-17, -6, 0, -17, -6, 5);
    lg.addColorStop(0, `rgba(198,255,74,${blink})`);
    lg.addColorStop(1, "rgba(198,255,74,0)");
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(-17, -6, 5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawWater() {
    const t = state.time, off = state.dist;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) ctx.lineTo(x, WATER + Math.sin((x + off) * 0.07 + t * 2) * 1.2);
    ctx.lineTo(W, H);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, WATER, 0, H);
    g.addColorStop(0, "rgba(170,235,255,0.92)");
    g.addColorStop(0.4, "rgba(50,160,225,0.92)");
    g.addColorStop(1, "rgba(10,80,160,0.96)");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.clip();
    if (glider.alive) {
      const d = WATER - glider.y;
      ctx.globalAlpha = clamp(0.4 - d / 300, 0, 0.4);
      ctx.translate(0, WATER * 2);
      ctx.scale(1, -1);
      drawGlider();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
    }
    for (const r of ripples) {
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - r.life / r.max)})`;
      ctx.beginPath();
      ctx.ellipse(r.x, WATER + 3, r.r, r.r * 0.22, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state.shake > 0) ctx.translate(rand(-1, 1) * state.shake * 0.4, rand(-1, 1) * state.shake * 0.4);
    ctx.drawImage(sky, 0, 0, W, H);
    for (const c of cloudLayer) ctx.drawImage(c.sp, c.x, c.y, c.sp.width * c.s, c.sp.height * c.s);
    hills(state.dist * 0.15, WATER - 30, 10, 0.02, ["#9cc6e8", "#c7e5f7"], 0.9);
    hills(state.dist * 0.35, WATER - 8, 14, 0.028, ["#b6f06f", "#62c934", "#3d9a22"]);
    for (const p of pillars) {
      ringHalf(p, false);
      pillarSeg(p.x, -10, p.top, p.w, p.lime, false);
      pillarSeg(p.x, p.bot, WATER + 4, p.w, p.lime, true);
    }
    drawParticles(ctx, P, false);
    drawGlider();
    for (const p of pillars) ringHalf(p, true);
    drawWater();
    drawParticles(ctx, P, true);
    if (state.mode === "ready") {
      ctx.save();
      ctx.font = 'italic 800 15px "Exo 2", "Trebuchet MS", sans-serif';
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "rgba(0,60,120,0.6)";
      ctx.shadowBlur = 8;
      ctx.globalAlpha = 0.75 + Math.sin(state.time * 4) * 0.25;
      ctx.fillText("Mantén pulsado para despegar", W / 2, H * 0.62);
      ctx.restore();
    }
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${state.flash * 0.5})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  const onDown = e => { press(true); canvas.setPointerCapture?.(e.pointerId); };
  const onUp = () => press(false);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);

  hud();
  return {
    update, draw,
    key(code, down) {
      if (code === "Space" || code === "ArrowUp" || code === "KeyW") { press(down); return true; }
      return false;
    },
    release() { hold = false; },
    destroy() {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    },
  };
}
