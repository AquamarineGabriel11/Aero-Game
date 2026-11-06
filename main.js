/* =========================================================
   Aqua Invaders — minijuego arcade ASMR
   Sin dependencias: Canvas 2D + Web Audio API
   ========================================================= */
(() => {
  "use strict";

  // ---------- Utilidades ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

  // ---------- Burbujas decorativas del mundo ----------
  const floaters = document.getElementById("floaters");
  for (let i = 0; i < 18; i++) {
    const s = document.createElement("span");
    const size = rand(10, 46);
    s.style.width = s.style.height = size + "px";
    s.style.left = rand(0, 100) + "%";
    s.style.animationDuration = rand(14, 30) + "s";
    s.style.animationDelay = -rand(0, 30) + "s";
    floaters.appendChild(s);
  }

  // =========================================================
  // Audio ASMR sintetizado (Web Audio)
  // =========================================================
  const Sound = {
    ctx: null,
    master: null,
    wet: null,
    enabled: true,
    ambient: null,

    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { this.enabled = false; return; }
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;

      // "Reverb" ligera: eco con filtro suave para dar sensación de cristal
      const delay = this.ctx.createDelay(1.0);
      delay.delayTime.value = 0.18;
      const feedback = this.ctx.createGain();
      feedback.gain.value = 0.35;
      const tone = this.ctx.createBiquadFilter();
      tone.type = "lowpass";
      tone.frequency.value = 3200;
      this.wet = this.ctx.createGain();
      this.wet.gain.value = 0.35;

      this.wet.connect(delay);
      delay.connect(tone);
      tone.connect(feedback);
      feedback.connect(delay);
      tone.connect(this.master);
      this.master.connect(this.ctx.destination);

      this.startAmbient();
    },

    resume() {
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    },

    setEnabled(on) {
      this.enabled = on;
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(on ? 0.7 : 0, t, 0.08);
    },

    out(node, wetAmount = 0.5) {
      node.connect(this.master);
      if (wetAmount > 0) {
        const g = this.ctx.createGain();
        g.gain.value = wetAmount;
        node.connect(g);
        g.connect(this.wet);
      }
    },

    // Pop de burbuja suave: seno con caída rápida de tono + chasquido filtrado
    pop(pitch = 1) {
      if (!this.ctx || !this.enabled) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      const f0 = rand(700, 950) * pitch;
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.35, t + 0.09);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.connect(g);
      this.out(g, 0.25);
      osc.start(t);
      osc.stop(t + 0.16);

      // Ráfaga corta de ruido muy filtrado (el "tsk" húmedo)
      const len = Math.floor(this.ctx.sampleRate * 0.05);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = rand(1800, 2600);
      bp.Q.value = 2.5;
      const ng = this.ctx.createGain();
      ng.gain.value = 0.18;
      noise.connect(bp); bp.connect(ng);
      this.out(ng, 0.2);
      noise.start(t);
    },

    // Tintineo de cristal: parciales inarmónicos con decaimiento largo
    chime(count = 1) {
      if (!this.ctx || !this.enabled) return;
      const t0 = this.ctx.currentTime;
      for (let n = 0; n < count; n++) {
        const t = t0 + n * 0.07;
        const base = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
        [1, 2.76, 5.4].forEach((ratio, i) => {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = base * ratio;
          const peak = 0.12 / (i + 1);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2 / (i + 1));
          osc.connect(g);
          this.out(g, 0.8);
          osc.start(t);
          osc.stop(t + 1.3);
        });
      }
    },

    // Disparo: "bloop" acuoso ascendente, muy suave
    shoot() {
      if (!this.ctx || !this.enabled) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1400;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(620, t + 0.12);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.connect(lp); lp.connect(g);
      this.out(g, 0.15);
      osc.start(t);
      osc.stop(t + 0.2);
    },

    // Golpe al jugador: gota grave y amortiguada
    hurt() {
      if (!this.ctx || !this.enabled) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.35);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      osc.connect(g);
      this.out(g, 0.5);
      osc.start(t);
      osc.stop(t + 0.5);
    },

    // Arpegio para ola superada / fin de partida
    arpeggio(up = true) {
      if (!this.ctx || !this.enabled) return;
      const notes = up ? [0, 2, 4, 5, 7] : [7, 5, 3, 1, 0];
      notes.forEach((idx, i) => {
        const t = this.ctx.currentTime + i * 0.11;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = PENTATONIC[idx] * (up ? 1 : 0.5);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.14, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
        osc.connect(g);
        this.out(g, 0.8);
        osc.start(t);
        osc.stop(t + 0.8);
      });
    },

    // Colchón ambiental: acorde suave con respiración lenta
    startAmbient() {
      const g = this.ctx.createGain();
      g.gain.value = 0.0;
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 900;
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = 0.08;
      lfoGain.gain.value = 350;
      lfo.connect(lfoGain); lfoGain.connect(lp.frequency);
      lfo.start();
      [130.81, 196.0, 246.94, 329.63].forEach((f, i) => {
        const o = this.ctx.createOscillator();
        o.type = i % 2 ? "triangle" : "sine";
        o.frequency.value = f;
        o.detune.value = rand(-6, 6);
        const og = this.ctx.createGain();
        og.gain.value = 0.05;
        o.connect(og); og.connect(lp);
        o.start();
      });
      lp.connect(g);
      this.out(g, 0.6);
      g.gain.setTargetAtTime(0.35, this.ctx.currentTime, 3);
      this.ambient = g;
    },
  };

  // =========================================================
  // Juego
  // =========================================================
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = 240, H = 300;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  const ui = {
    score: document.getElementById("score"),
    wave: document.getElementById("wave"),
    lives: document.getElementById("lives"),
    overlay: document.getElementById("overlay"),
    overlayText: document.getElementById("overlayText"),
    startBtn: document.getElementById("startBtn"),
    soundBtn: document.getElementById("soundBtn"),
    pauseBtn: document.getElementById("pauseBtn"),
    fireBtn: document.getElementById("fireBtn"),
  };

  const state = {
    mode: "menu", // menu | playing | paused | over
    score: 0,
    wave: 1,
    lives: 3,
    invuln: 0,
    time: 0,
  };

  const player = { x: W / 2, y: H - 26, w: 34, h: 10, speed: 120, cooldown: 0 };
  let shots = [];
  let enemies = [];
  let drops = [];
  let particles = [];
  let fleet = { dir: 1, speed: 10, stepDown: 0 };
  const input = { left: false, right: false, fire: false };

  const miniClouds = Array.from({ length: 4 }, (_, i) => ({
    x: rand(0, W), y: 20 + i * 45, s: rand(0.5, 1), v: rand(3, 7),
  }));

  function spawnWave(n) {
    enemies = [];
    const cols = 6;
    const rows = Math.min(3 + Math.floor((n - 1) / 2), 5);
    const gapX = 32, gapY = 28;
    const startX = (W - (cols - 1) * gapX) / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const crystal = r === 0 || (n > 2 && r === 1);
        enemies.push({
          x: startX + c * gapX,
          y: 34 + r * gapY,
          r: crystal ? 10 : 9,
          type: crystal ? "crystal" : "bubble",
          hp: crystal ? 2 : 1,
          phase: rand(0, Math.PI * 2),
          hit: 0,
        });
      }
    }
    fleet.dir = 1;
    fleet.speed = 9 + n * 2.5;
    fleet.stepDown = 0;
    drops = [];
    shots = [];
  }

  function resetGame() {
    state.score = 0;
    state.wave = 1;
    state.lives = 3;
    state.invuln = 0;
    player.x = W / 2;
    particles = [];
    spawnWave(1);
    updateHud();
  }

  function updateHud() {
    ui.score.textContent = state.score;
    ui.wave.textContent = state.wave;
    ui.lives.textContent = "💧".repeat(Math.max(state.lives, 0)) || "—";
  }

  function showOverlay(title, text, btn) {
    ui.overlay.querySelector("h1").innerHTML = title;
    ui.overlayText.innerHTML = text;
    ui.startBtn.textContent = btn;
    ui.overlay.classList.remove("hidden");
  }

  function startGame() {
    Sound.init();
    Sound.resume();
    if (state.mode === "paused") {
      state.mode = "playing";
      ui.overlay.classList.add("hidden");
      return;
    }
    resetGame();
    state.mode = "playing";
    ui.overlay.classList.add("hidden");
    Sound.chime(2);
  }

  function togglePause() {
    if (state.mode === "playing") {
      state.mode = "paused";
      showOverlay("Pausa", "Respira hondo. Las burbujas esperan.", "▶ Continuar");
    } else if (state.mode === "paused") {
      startGame();
    }
  }

  function fire() {
    if (state.mode !== "playing" || player.cooldown > 0 || shots.length >= 3) return;
    shots.push({ x: player.x, y: player.y - 8, r: 4, vy: -170, wob: rand(0, 6) });
    player.cooldown = 0.32;
    Sound.shoot();
  }

  function burst(x, y, color, count = 14) {
    // Anillo expansivo
    particles.push({ kind: "ring", x, y, r: 4, life: 0.45, max: 0.45, color });
    // Gotitas y mini burbujas
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(25, 85);
      particles.push({
        kind: Math.random() < 0.5 ? "drop" : "bub",
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r: rand(1, 2.8),
        life: rand(0.5, 1.0),
        max: 1,
        color,
      });
    }
  }

  // ---------- Actualización ----------
  function update(dt) {
    state.time += dt;
    miniClouds.forEach(c => { c.x += c.v * dt; if (c.x > W + 40) c.x = -40; });

    // Partículas siempre se animan (incluso en menú)
    particles = particles.filter(p => {
      p.life -= dt;
      if (p.kind === "ring") p.r += 70 * dt;
      else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy = p.vy * 0.96 + (p.kind === "drop" ? 90 : -25) * dt;
      }
      return p.life > 0;
    });

    if (state.mode !== "playing") return;

    // Jugador
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    player.x = clamp(player.x + dir * player.speed * dt, player.w / 2 + 4, W - player.w / 2 - 4);
    player.cooldown = Math.max(0, player.cooldown - dt);
    state.invuln = Math.max(0, state.invuln - dt);
    if (input.fire) fire();

    // Disparos
    shots.forEach(s => { s.y += s.vy * dt; s.wob += dt * 12; });
    shots = shots.filter(s => s.y > -10);

    // Flota
    let edge = false;
    const vx = fleet.dir * fleet.speed * (1 + (1 - enemies.length / 30) * 1.2);
    enemies.forEach(e => {
      e.x += vx * dt;
      e.phase += dt * 2;
      e.hit = Math.max(0, e.hit - dt);
      if (e.x < e.r + 4 || e.x > W - e.r - 4) edge = true;
    });
    if (edge) {
      fleet.dir *= -1;
      enemies.forEach(e => {
        e.x = clamp(e.x, e.r + 4, W - e.r - 4);
        e.y += 8;
      });
    }

    // Colisiones disparo-enemigo
    for (const s of shots) {
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const dx = s.x - e.x, dy = s.y - e.y;
        if (dx * dx + dy * dy < (s.r + e.r) * (s.r + e.r)) {
          s.y = -100;
          e.hp--;
          e.hit = 0.15;
          if (e.hp <= 0) {
            const crystal = e.type === "crystal";
            state.score += crystal ? 30 : 10;
            burst(e.x, e.y, crystal ? "#b8ff6a" : "#8fe9ff", crystal ? 18 : 12);
            Sound.pop(crystal ? 0.8 : 1.1);
            if (crystal) Sound.chime(2);
            else if (Math.random() < 0.5) Sound.chime(1);
          } else {
            Sound.chime(1);
            burst(e.x, e.y, "#ffffff", 5);
          }
          break;
        }
      }
    }
    enemies = enemies.filter(e => e.hp > 0);

    // Gotas enemigas (lentas y suaves)
    const dropChance = 0.35 + state.wave * 0.15;
    if (enemies.length && Math.random() < dropChance * dt) {
      const shooter = enemies[Math.floor(Math.random() * enemies.length)];
      drops.push({ x: shooter.x, y: shooter.y + shooter.r, vy: 55 + state.wave * 6 });
    }
    drops.forEach(d => { d.y += d.vy * dt; });
    for (const d of drops) {
      if (state.invuln <= 0 &&
          Math.abs(d.x - player.x) < player.w / 2 &&
          Math.abs(d.y - player.y) < 8) {
        d.y = H + 50;
        hitPlayer();
      }
    }
    drops = drops.filter(d => d.y < H + 10);

    // Enemigos alcanzan al jugador
    if (enemies.some(e => e.y + e.r > player.y - 8)) {
      state.lives = 0;
      gameOver();
      return;
    }

    // Ola superada
    if (!enemies.length) {
      state.wave++;
      state.score += 50;
      Sound.arpeggio(true);
      spawnWave(state.wave);
    }
    updateHud();
  }

  function hitPlayer() {
    state.lives--;
    state.invuln = 1.6;
    burst(player.x, player.y, "#ffffff", 16);
    Sound.hurt();
    updateHud();
    if (state.lives <= 0) gameOver();
  }

  function gameOver() {
    state.mode = "over";
    updateHud();
    Sound.arpeggio(false);
    showOverlay("Fin del<br>sueño", `Puntuación: <b>${state.score}</b><br>Ola alcanzada: ${state.wave}`, "↻ Otra vez");
  }

  // ---------- Dibujo ----------
  function drawCloud(x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.arc(14, -6, 15, 0, Math.PI * 2);
    ctx.arc(30, 0, 11, 0, Math.PI * 2);
    ctx.rect(0, 0, 30, 11);
    ctx.fill();
    ctx.restore();
  }

  function drawBubble(e) {
    const wob = Math.sin(e.phase) * 0.6;
    const rx = e.r + wob, ry = e.r - wob;
    const crystal = e.type === "crystal";
    ctx.save();
    ctx.translate(e.x, e.y + Math.sin(e.phase * 0.7) * 1.5);

    const g = ctx.createRadialGradient(-rx * 0.35, -ry * 0.4, 1, 0, 0, rx);
    if (crystal) {
      g.addColorStop(0, "rgba(255,255,255,0.95)");
      g.addColorStop(0.35, "rgba(190,255,120,0.75)");
      g.addColorStop(0.8, "rgba(60,200,120,0.55)");
      g.addColorStop(1, "rgba(20,140,180,0.7)");
    } else {
      g.addColorStop(0, "rgba(255,255,255,0.7)");
      g.addColorStop(0.5, "rgba(200,245,255,0.18)");
      g.addColorStop(0.85, "rgba(120,220,255,0.35)");
      g.addColorStop(1, "rgba(255,255,255,0.85)");
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Borde iridiscente
    ctx.lineWidth = 1;
    ctx.strokeStyle = crystal ? "rgba(255,255,255,0.9)" : "rgba(255,180,255,0.55)";
    ctx.stroke();
    if (!crystal) {
      ctx.strokeStyle = "rgba(140,255,200,0.5)";
      ctx.beginPath();
      ctx.ellipse(0.6, 0.6, rx - 1, ry - 1, 0, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
    } else if (e.hp === 1) {
      // Grieta en el cristal tras el primer impacto
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.moveTo(-3, -6); ctx.lineTo(1, -1); ctx.lineTo(-1, 3); ctx.lineTo(3, 7);
      ctx.stroke();
    }

    // Brillo especular
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.ellipse(-rx * 0.38, -ry * 0.45, rx * 0.28, ry * 0.16, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rx * 0.4, ry * 0.35, 1.2, 0, Math.PI * 2);
    ctx.fill();

    if (e.hit > 0) {
      ctx.fillStyle = `rgba(255,255,255,${e.hit * 4})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPlayer() {
    if (state.invuln > 0 && Math.floor(state.time * 12) % 2 === 0) return;
    const { x, y, w, h } = player;
    ctx.save();
    ctx.translate(x, y);

    // Estela de propulsión de agua
    const pulse = 0.6 + Math.sin(state.time * 18) * 0.25;
    const jet = ctx.createRadialGradient(0, h, 0, 0, h, 16);
    jet.addColorStop(0, `rgba(160,240,255,${pulse})`);
    jet.addColorStop(1, "rgba(160,240,255,0)");
    ctx.fillStyle = jet;
    ctx.beginPath();
    ctx.ellipse(0, h + 2, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cuerpo cromado del deslizador
    const chrome = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    chrome.addColorStop(0, "#ffffff");
    chrome.addColorStop(0.3, "#bcd6e6");
    chrome.addColorStop(0.5, "#f4fbff");
    chrome.addColorStop(0.75, "#6f93ab");
    chrome.addColorStop(1, "#c9e2ef");
    ctx.fillStyle = chrome;
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(40,90,130,0.6)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Cúpula de cristal lima
    const dome = ctx.createRadialGradient(-2, -6, 1, 0, -3, 8);
    dome.addColorStop(0, "rgba(255,255,255,0.95)");
    dome.addColorStop(0.4, "rgba(170,255,90,0.75)");
    dome.addColorStop(1, "rgba(40,190,120,0.65)");
    ctx.fillStyle = dome;
    ctx.beginPath();
    ctx.ellipse(0, -3, 7, 6, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.stroke();

    // Luces laterales
    ctx.fillStyle = "#29d3ff";
    [-11, 11].forEach(dx => {
      ctx.beginPath();
      ctx.arc(dx, 0.5, 1.6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawShot(s) {
    const r = s.r + Math.sin(s.wob) * 0.6;
    const g = ctx.createRadialGradient(s.x - 1.5, s.y - 1.5, 0.5, s.x, s.y, r);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.6, "rgba(170,240,255,0.35)");
    g.addColorStop(1, "rgba(255,255,255,0.9)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();
    // Mini burbujas de estela
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.arc(s.x + Math.sin(s.wob) * 2, s.y + 8, 1.4, 0, Math.PI * 2);
    ctx.arc(s.x - Math.sin(s.wob) * 2, s.y + 13, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDrop(d) {
    ctx.save();
    ctx.translate(d.x, d.y);
    const g = ctx.createLinearGradient(0, -5, 0, 4);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(40,150,220,0.85)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.quadraticCurveTo(3.5, 0, 0, 4);
    ctx.quadraticCurveTo(-3.5, 0, 0, -5);
    ctx.fill();
    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      const a = clamp(p.life / p.max, 0, 1);
      if (p.kind === "ring") {
        ctx.strokeStyle = `rgba(255,255,255,${a})`;
        ctx.lineWidth = 1.5 * a + 0.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === "drop") {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = `rgba(255,255,255,${a * 0.9})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Cielo interno de la pantalla
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#b9ecff");
    sky.addColorStop(0.6, "#6fd0ff");
    sky.addColorStop(1, "#2a9fe0");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    miniClouds.forEach(c => drawCloud(c.x, c.y, c.s));

    // Superficie de agua inferior
    const wy = H - 12;
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(0, wy);
    for (let x = 0; x <= W; x += 6) ctx.lineTo(x, wy + Math.sin(x * 0.08 + state.time * 2) * 1.5);
    ctx.lineTo(W, H); ctx.lineTo(0, H);
    ctx.fill();

    drops.forEach(drawDrop);
    enemies.forEach(drawBubble);
    shots.forEach(drawShot);
    drawPlayer();
    drawParticles();
  }

  // ---------- Bucle ----------
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // ---------- Controles ----------
  const keyMap = {
    ArrowLeft: "left", KeyA: "left",
    ArrowRight: "right", KeyD: "right",
    Space: "fire", ArrowUp: "fire", KeyW: "fire",
  };
  window.addEventListener("keydown", e => {
    if (keyMap[e.code]) {
      input[keyMap[e.code]] = true;
      e.preventDefault();
    }
    if (e.code === "KeyP" || e.code === "Escape") togglePause();
    if ((e.code === "Enter" || e.code === "Space") && state.mode !== "playing") startGame();
  });
  window.addEventListener("keyup", e => {
    if (keyMap[e.code]) input[keyMap[e.code]] = false;
  });
  window.addEventListener("blur", () => {
    input.left = input.right = input.fire = false;
    if (state.mode === "playing") togglePause();
  });

  // Botones táctiles del teclado del celular
  function bindHold(el, onDown, onUp) {
    const down = e => { e.preventDefault(); Sound.init(); Sound.resume(); el.classList.add("pressed"); onDown(); };
    const up = () => { el.classList.remove("pressed"); onUp(); };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointerleave", up);
    el.addEventListener("pointercancel", up);
  }
  document.querySelectorAll(".key.dir").forEach(btn => {
    const side = btn.dataset.dir === "-1" ? "left" : "right";
    bindHold(btn, () => { input[side] = true; }, () => { input[side] = false; });
  });
  bindHold(ui.fireBtn, () => {
    if (state.mode !== "playing" && state.mode !== "paused") startGame();
    input.fire = true;
  }, () => { input.fire = false; });

  ui.startBtn.addEventListener("click", startGame);
  ui.pauseBtn.addEventListener("click", togglePause);
  ui.soundBtn.addEventListener("click", () => {
    Sound.init();
    Sound.resume();
    Sound.setEnabled(!Sound.enabled);
    ui.soundBtn.textContent = Sound.enabled ? "🔊" : "🔇";
    if (Sound.enabled) Sound.chime(1);
  });

  // Teclas numéricas decorativas: tintineo al tocarlas
  document.querySelectorAll(".numpad span").forEach((k, i) => {
    k.addEventListener("pointerdown", () => {
      Sound.init(); Sound.resume();
      Sound.pop(0.9 + (i % 4) * 0.15);
    });
  });

  // Inicio
  resetGame();
  state.mode = "menu";
  requestAnimationFrame(loop);
})();
