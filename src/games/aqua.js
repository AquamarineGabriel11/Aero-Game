/* Juego 01 · Aqua Invaders — revienta burbujas y esferas de cristal */
import { TAU, rand, clamp, mk, buzz, cloudSprites, windowHighlight } from "../util.js";
import { Sound } from "../audio.js";
import { bubbleFrames, crystalSprites, drawSprite, updateParticles, drawParticles, shatterInto, addText } from "./sprites.js";

export const meta = {
  id: "aqua",
  name: "Aqua Invaders",
  short: "Aqua",
  tagline: "Revienta las burbujas que bajan del cielo de cristal.",
  help: "Arrastra para moverte. Mientras tocas, dispara solo.",
};

export function create(canvas, W, H, host) {
  const ctx = canvas.getContext("2d");
  const dpr = host.dpr;
  const WATER = H - 16;
  const waveY = (x, t) => WATER + Math.sin(x * 0.08 + t * 2.1) * 1.1 + Math.sin(x * 0.19 - t * 3.3) * 0.5;
  const frames = bubbleFrames(), crystals = crystalSprites(), clouds = cloudSprites();

  const bg = (() => {
    const c = mk(W * dpr, H * dpr), g = c.getContext("2d");
    g.scale(dpr, dpr);
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#1f86ea");
    sky.addColorStop(0.45, "#63c4ff");
    sky.addColorStop(0.85, "#c9efff");
    sky.addColorStop(1, "#e8fbff");
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    const sg = g.createRadialGradient(W * 0.86, 40, 0, W * 0.86, 40, 160);
    sg.addColorStop(0, "rgba(255,255,245,0.95)");
    sg.addColorStop(0.08, "rgba(255,255,235,0.7)");
    sg.addColorStop(0.35, "rgba(255,255,255,0.15)");
    sg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = sg;
    g.fillRect(0, 0, W, H);
    g.beginPath();
    g.moveTo(0, WATER);
    for (let x = 0; x <= W; x += 4) g.lineTo(x, WATER - 9 - Math.sin(x * 0.03 + 1) * 4 - Math.sin(x * 0.09) * 1.5);
    g.lineTo(W, WATER);
    g.closePath();
    const hg = g.createLinearGradient(0, WATER - 16, 0, WATER);
    hg.addColorStop(0, "rgba(120,200,110,0.75)");
    hg.addColorStop(1, "rgba(170,225,190,0.6)");
    g.fillStyle = hg;
    g.fill();
    return c;
  })();

  const miniClouds = Array.from({ length: 6 }, (_, i) => ({
    sp: clouds[i % clouds.length], x: rand(-40, W), y: rand(10, H * 0.5), s: rand(0.13, 0.26), v: rand(2, 6),
  })).sort((a, b) => a.s - b.s);

  const state = { mode: "playing", score: 0, wave: 1, lives: 3, invuln: 0, time: 0, combo: 0, comboTimer: 0, shake: 0 };
  const player = { x: W / 2, y: WATER - 12, vx: 0, w: 34, maxSpeed: 140, cooldown: 0, rippleT: 0 };
  let shots = [], enemies = [], drops = [], ripples = [];
  const P = { list: [] };
  const fleet = { dir: 1, speed: 10, drop: 0 };
  const input = { left: false, right: false, fire: false, touch: false, tx: W / 2 };

  function spawnWave(n) {
    enemies = [];
    const cols = 6, rows = Math.min(3 + Math.floor((n - 1) / 2), 5);
    const gapX = 32, gapY = 28, startX = (W - (cols - 1) * gapX) / 2, startY = Math.max(72, H * 0.15);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const crystal = r === 0 || (n > 2 && r === 1);
        enemies.push({
          x: startX + c * gapX, y: startY + r * gapY, r: crystal ? 10 : 9.5,
          type: crystal ? "crystal" : "bubble", hp: crystal ? 2 : 1,
          phase: rand(0, TAU), fo: Math.floor(rand(0, 24)), squish: 0, hit: 0,
        });
      }
    }
    fleet.dir = 1;
    fleet.speed = 9 + n * 2.5;
    fleet.drop = 0;
    drops = [];
    shots = [];
  }

  const hud = () => host.hud({ score: state.score, label: "OLA", value: state.wave, lives: state.lives });

  function fire() {
    if (player.cooldown > 0 || shots.length >= 3) return;
    shots.push({ x: player.x, y: player.y - 9, r: 4, vy: -185, wob: rand(0, 6), trail: 0 });
    player.cooldown = 0.3;
    Sound.squirt(player.x / W);
    for (let i = 0; i < 4; i++) P.list.push({ kind: "mist", x: player.x + rand(-2, 2), y: player.y - 9, vx: rand(-25, 25), vy: rand(-60, -20), r: rand(0.5, 1.1), life: rand(0.2, 0.4), max: 0.4 });
  }

  function popBubble(e, hx, hy) {
    P.list.push({ kind: "film", x: e.x, y: e.y, r: e.r, frame: (Math.floor(e.phase * 3) + e.fo) % 24, hx: hx - e.x, hy: hy - e.y, life: 0.09, max: 0.09 });
    for (let i = 0; i < 18; i++) {
      const a = rand(0, TAU), sp = rand(30, 110);
      P.list.push({ kind: "mist", x: e.x + Math.cos(a) * e.r, y: e.y + Math.sin(a) * e.r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 10, r: rand(0.4, 1.2), life: rand(0.35, 0.8), max: 0.8 });
    }
    for (let i = 0; i < 3; i++) P.list.push({ kind: "daughter", x: e.x + rand(-5, 5), y: e.y + rand(-5, 5), vx: rand(-8, 8), vy: rand(-18, -6), r: rand(1.3, 2.6), ph: rand(0, TAU), fo: Math.floor(rand(0, 24)), life: rand(0.9, 1.8), max: 1.8 });
  }

  const addRipple = (x, s = 1) => ripples.push({ x, r: 1, life: 0, max: 0.9 + s * 0.5, s });

  function hitPlayer() {
    state.lives--;
    state.invuln = 1.6;
    state.shake = 6;
    state.combo = 0;
    for (let i = 0; i < 18; i++) P.list.push({ kind: "mist", x: player.x + rand(-8, 8), y: player.y, vx: rand(-60, 60), vy: rand(-90, -20), r: rand(0.6, 1.4), life: rand(0.4, 0.8), max: 0.8 });
    addRipple(player.x, 1.5);
    Sound.hurt(player.x / W);
    buzz([30, 40, 30]);
    hud();
    if (state.lives <= 0) end();
  }

  function end() {
    if (state.mode === "over") return;
    state.mode = "over";
    host.over(state.score, `Ola ${state.wave}`);
  }

  function update(dt) {
    state.time += dt;
    state.shake = Math.max(0, state.shake - dt * 20);
    for (const c of miniClouds) { c.x += c.v * dt; if (c.x > W + 10) c.x = -c.sp.width * c.s - 10; }
    updateParticles(P, dt, WATER, p => { addRipple(p.x, 0.5); Sound.plip(p.x / W, 0.5); });
    for (const r of ripples) { r.life += dt; r.r += (16 + r.s * 10) * dt; }
    ripples = ripples.filter(r => r.life < r.max);
    player.rippleT -= dt;
    if (player.rippleT <= 0) { addRipple(player.x, 0.4); player.rippleT = 0.45; }
    if (state.mode !== "playing") return;

    // Movimiento: teclado o arrastre táctil, con inercia
    let dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (input.touch) dir = clamp((input.tx - player.x) / 18, -1, 1);
    player.vx += (dir * player.maxSpeed - player.vx) * Math.min(1, dt * 9);
    player.x += player.vx * dt;
    if (player.x < player.w / 2 + 4 || player.x > W - player.w / 2 - 4) player.vx *= -0.3;
    player.x = clamp(player.x, player.w / 2 + 4, W - player.w / 2 - 4);
    player.cooldown = Math.max(0, player.cooldown - dt);
    state.invuln = Math.max(0, state.invuln - dt);
    if (Math.abs(player.vx) > 40 && Math.random() < dt * 40) {
      P.list.push({ kind: "mist", x: player.x - Math.sign(player.vx) * 14, y: WATER, vx: -player.vx * 0.3 + rand(-10, 10), vy: rand(-50, -20), r: rand(0.5, 1.1), life: rand(0.25, 0.5), max: 0.5 });
    }
    if (input.fire || input.touch) fire();

    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;

    for (const s of shots) {
      s.y += s.vy * dt;
      s.wob += dt * 12;
      s.x += Math.sin(s.wob) * 6 * dt;
      s.trail -= dt;
      if (s.trail <= 0) {
        s.trail = 0.05;
        P.list.push({ kind: "daughter", x: s.x + rand(-1.5, 1.5), y: s.y + 6, vx: rand(-4, 4), vy: rand(4, 14), r: rand(0.6, 1.2), ph: rand(0, TAU), fo: Math.floor(rand(0, 24)), life: rand(0.3, 0.6), max: 0.6 });
      }
    }
    shots = shots.filter(s => s.y > -10);

    let edge = false;
    const vx = fleet.dir * fleet.speed * (1 + (1 - enemies.length / 30) * 1.2);
    const down = Math.min(fleet.drop, 30 * dt);
    fleet.drop -= down;
    for (const e of enemies) {
      e.x += vx * dt;
      e.y += down;
      e.phase += dt * 2;
      e.hit = Math.max(0, e.hit - dt);
      e.squish = Math.max(0, e.squish - dt * 3);
      if (e.x < e.r + 4 || e.x > W - e.r - 4) edge = true;
    }
    if (edge) {
      fleet.dir *= -1;
      fleet.drop += 10;
      for (const e of enemies) e.x = clamp(e.x, e.r + 4, W - e.r - 4);
    }

    for (const s of shots) {
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const dx = s.x - e.x, dy = s.y - e.y;
        if (dx * dx + dy * dy < (s.r + e.r) * (s.r + e.r)) {
          s.y = -100;
          e.hp--;
          e.hit = 0.12;
          e.squish = 1;
          if (e.hp <= 0) {
            const crystal = e.type === "crystal";
            state.combo = state.comboTimer > 0 ? state.combo + 1 : 1;
            state.comboTimer = 1.4;
            const mult = Math.min(state.combo, 8);
            const pts = (crystal ? 30 : 10) * mult;
            state.score += pts;
            addText(P, e.x, e.y - 4, mult > 1 ? `+${pts} ×${mult}` : `+${pts}`, crystal ? "#eaffc8" : "#ffffff");
            if (crystal) { shatterInto(P, e.x, e.y, e.r); Sound.glass(e.x / W); buzz(18); }
            else { popBubble(e, s.x, s.y); Sound.pop(e.x / W); buzz(8); }
            Sound.combo(state.combo, e.x / W);
          } else {
            Sound.crack(e.x / W);
            for (let i = 0; i < 3; i++) P.list.push({ kind: "spark", x: s.x + rand(-3, 3), y: s.y + rand(-3, 3), s: rand(2, 4), life: 0.3, max: 0.3 });
          }
          break;
        }
      }
    }
    enemies = enemies.filter(e => e.hp > 0);

    const dropChance = 0.35 + state.wave * 0.15;
    if (enemies.length && Math.random() < dropChance * dt) {
      const sh = enemies[Math.floor(Math.random() * enemies.length)];
      drops.push({ x: sh.x, y: sh.y + sh.r, vy: 40 + state.wave * 5 });
    }
    for (const d of drops) {
      d.vy = Math.min(d.vy + 50 * dt, 120 + state.wave * 8);
      d.y += d.vy * dt;
      if (state.invuln <= 0 && Math.abs(d.x - player.x) < player.w / 2 && Math.abs(d.y - player.y) < 7) { d.dead = true; hitPlayer(); }
      else if (d.y >= waveY(d.x, state.time)) {
        d.dead = true;
        addRipple(d.x, 0.8);
        Sound.plip(d.x / W, 0.8);
        for (let i = 0; i < 5; i++) P.list.push({ kind: "mist", x: d.x, y: WATER - 1, vx: rand(-25, 25), vy: rand(-70, -30), r: rand(0.5, 1), life: rand(0.25, 0.45), max: 0.45 });
      }
    }
    drops = drops.filter(d => !d.dead);

    if (enemies.some(e => e.y + e.r > player.y - 8)) { state.lives = 0; hud(); end(); return; }

    if (!enemies.length) {
      state.wave++;
      state.score += 50;
      Sound.arpeggio(true);
      addText(P, W / 2, H / 2, `OLA ${state.wave}`, "#eaffc8", 18);
      spawnWave(state.wave);
    }
    hud();
  }

  // ---------- Dibujo ----------
  function drawEnemy(e) {
    const wob = Math.sin(state.time * 38) * e.squish * 0.2;
    const breathe = e.type === "bubble" ? Math.sin(e.phase) * 0.035 : 0;
    const y = e.y + Math.sin(e.phase * 0.7) * 1.5;
    const spr = e.type === "bubble" ? frames[(Math.floor(e.phase * 3) + e.fo) % 24] : crystals[e.hp < 2 ? 1 : 0];
    drawSprite(ctx, spr, e.x, y, e.r, 1 + wob + breathe, 1 - wob - breathe);
    if (e.hit > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(255,255,255,${e.hit * 3})`;
      ctx.beginPath();
      ctx.arc(e.x, y, e.r, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPlayerBody(x, y, bank) {
    const w = 34, h = 9;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(bank * 0.16);
    const ch = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    ch.addColorStop(0, "#f7fdff");
    ch.addColorStop(0.3, "#9fd3f2");
    ch.addColorStop(0.47, "#e9f7ff");
    ch.addColorStop(0.53, "#ffffff");
    ch.addColorStop(0.62, "#86b46f");
    ch.addColorStop(1, "#2f4f3a");
    ctx.fillStyle = ch;
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(20,50,80,0.55)";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.ellipse(-6 + bank * 5, -2.3, 8, 0.9, 0, 0, TAU);
    ctx.fill();
    const dome = ctx.createRadialGradient(-2, -7, 1, 0, -3, 9);
    dome.addColorStop(0, "rgba(255,255,255,0.95)");
    dome.addColorStop(0.4, "rgba(170,255,90,0.75)");
    dome.addColorStop(1, "rgba(30,170,110,0.7)");
    ctx.fillStyle = dome;
    ctx.beginPath();
    ctx.ellipse(0, -3.4, 7.5, 6.5, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 0.6;
    ctx.stroke();
    windowHighlight(ctx, -2.6, -6.4, 4.6, -0.3, 0.9);
    ctx.globalCompositeOperation = "lighter";
    const blink = 0.5 + 0.5 * Math.sin(state.time * 5);
    [[-12, "41,211,255"], [12, "156,255,58"]].forEach(([dx, col], i) => {
      const a = i ? 1 - blink : blink;
      const g = ctx.createRadialGradient(dx, 0.5, 0, dx, 0.5, 4.5);
      g.addColorStop(0, `rgba(${col},${0.9 * a + 0.1})`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(dx, 0.5, 4.5, 0, TAU);
      ctx.fill();
    });
    ctx.restore();
  }

  const playerVisible = () => !(state.invuln > 0 && Math.floor(state.time * 12) % 2 === 0);

  function drawPlayer() {
    if (!playerVisible()) return;
    const y = player.y + Math.sin(state.time * 3) * 1.1;
    const pulse = 0.55 + Math.sin(state.time * 18) * 0.2;
    const jet = ctx.createRadialGradient(player.x, WATER - 1, 0, player.x, WATER - 1, 18);
    jet.addColorStop(0, `rgba(220,250,255,${pulse})`);
    jet.addColorStop(1, "rgba(220,250,255,0)");
    ctx.fillStyle = jet;
    ctx.beginPath();
    ctx.ellipse(player.x, WATER - 1, 18, 5, 0, 0, TAU);
    ctx.fill();
    drawPlayerBody(player.x, y, player.vx / player.maxSpeed);
  }

  function drawDrop(d) {
    const stretch = 1 + d.vy / 160;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.scale(1, stretch);
    const g = ctx.createRadialGradient(-1, 0, 0.3, 0, 1, 4);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.5, "rgba(150,225,255,0.75)");
    g.addColorStop(1, "rgba(30,130,210,0.85)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.bezierCurveTo(2.5, -1.5, 3.6, 1, 3.4, 2);
    ctx.arc(0, 2, 3.4, 0, Math.PI);
    ctx.bezierCurveTo(-3.6, 1, -2.5, -1.5, 0, -5);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.ellipse(-1.2, 1, 0.7, 1.2, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawWater() {
    const t = state.time;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) ctx.lineTo(x, waveY(x, t));
    ctx.lineTo(W, H);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, WATER - 2, 0, H);
    g.addColorStop(0, "rgba(170,235,255,0.88)");
    g.addColorStop(0.35, "rgba(60,170,230,0.9)");
    g.addColorStop(1, "rgba(10,90,170,0.96)");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.clip();
    if (playerVisible()) {
      ctx.save();
      ctx.globalAlpha = 0.32;
      ctx.translate(0, WATER * 2 + 1);
      ctx.scale(1, -1);
      drawPlayerBody(player.x + Math.sin(t * 4) * 0.8, player.y, player.vx / player.maxSpeed);
      ctx.restore();
    }
    for (const r of ripples) {
      const a = 1 - r.life / r.max;
      ctx.strokeStyle = `rgba(255,255,255,${0.55 * a * Math.min(1, r.s + 0.3)})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.ellipse(r.x, WATER + 2, r.r, r.r * 0.22, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath();
    for (let x = 0; x <= W; x += 4) x ? ctx.lineTo(x, waveY(x, t)) : ctx.moveTo(x, waveY(x, t));
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sh = state.shake;
    if (sh > 0) ctx.translate(rand(-sh, sh) * 0.4, rand(-sh, sh) * 0.4);
    ctx.drawImage(bg, 0, 0, W, H);
    for (const c of miniClouds) ctx.drawImage(c.sp, c.x, c.y, c.sp.width * c.s, c.sp.height * c.s);
    drops.forEach(drawDrop);
    enemies.forEach(drawEnemy);
    for (const s of shots) drawSprite(ctx, frames[Math.floor(s.wob * 2) % 24], s.x, s.y, s.r + Math.sin(s.wob) * 0.4);
    drawParticles(ctx, P, false);
    drawWater();
    drawPlayer();
    drawParticles(ctx, P, true);
  }

  // ---------- Entrada ----------
  const toLocal = e => { const r = canvas.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * W; };
  const onDown = e => { input.touch = true; input.tx = toLocal(e); canvas.setPointerCapture?.(e.pointerId); };
  const onMove = e => { if (input.touch) input.tx = toLocal(e); };
  const onUp = () => { input.touch = false; };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);

  const keyMap = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", Space: "fire", ArrowUp: "fire", KeyW: "fire" };

  spawnWave(1);
  hud();

  return {
    update, draw,
    key(code, down) { if (keyMap[code]) { input[keyMap[code]] = down; return true; } return false; },
    release() { input.left = input.right = input.fire = input.touch = false; },
    destroy() {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    },
  };
}
