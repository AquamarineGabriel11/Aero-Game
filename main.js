/* =========================================================
   Aqua Invaders — edición realista
   Sin dependencias: Canvas 2D + Web Audio API
   ========================================================= */
(() => {
  "use strict";

  // ---------- Utilidades ----------
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const reduceMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0];
  // ---------- Preferencias y récords (solo en este navegador) ----------
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* almacenamiento no disponible */ }
    },
  };
  const prefs = Object.assign({ sound: true, vibe: true, quality: "alta" }, store.get("aerogame.prefs", {}));
  const savePrefs = () => store.set("aerogame.prefs", prefs);

  const buzz = ms => { if (!prefs.vibe) return; try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* sin vibración */ } };

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  // Reflejo de ventana de cuatro paneles (sello Frutiger Aero)
  function windowHighlight(g, x, y, size, rot, alpha) {
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

  // ---------- Reloj del celular ----------
  const clockEl = document.getElementById("clock");
  const tickClock = () => {
    const d = new Date();
    clockEl.textContent = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  };
  tickClock();
  setInterval(tickClock, 15000);

  // ---------- Burbujas decorativas del mundo ----------
  const floaters = document.getElementById("floaters");
  for (let i = 0; i < 16; i++) {
    const s = document.createElement("span");
    const size = rand(12, 48);
    s.style.width = s.style.height = size + "px";
    s.style.left = rand(0, 100) + "%";
    s.style.animationDuration = rand(16, 32) + "s";
    s.style.animationDelay = -rand(0, 32) + "s";
    floaters.appendChild(s);
  }

  // =========================================================
  // Nubes volumétricas procedurales
  // =========================================================
  function makeCloudSprite(w, h) {
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
    // Sombreado: base azulada en sombra, cima iluminada por el sol
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
  const cloudSprites = Array.from({ length: 6 }, () => makeCloudSprite(Math.round(rand(270, 380)), Math.round(rand(120, 170))));

  // =========================================================
  // Mundo de fondo (cielo, sol, montañas, colinas, lago)
  // =========================================================
  const World = (() => {
    const canvas = document.getElementById("sky");
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, dpr = 1, layer = null, hy = 0, ly = 0, sx = 0, sy = 0, t = 0;
    let px = 0, py = 0, tx = 0, ty = 0;
    const clouds = [];
    const glints = [];

    const mountains = x => hy - h * 0.022 - (Math.sin(x * 0.0035 + 1.3) * 0.5 + 0.5) * h * 0.05 - Math.sin(x * 0.013 + 2) * h * 0.012 - Math.sin(x * 0.041) * h * 0.004;
    const backHill = x => h * 0.655 - Math.sin((x / w) * Math.PI * 1.4 + 0.5) * h * 0.055 - Math.sin((x / w) * 9 + 1) * h * 0.008;
    const frontHill = x => h * 0.755 - Math.sin((x / w) * Math.PI + 2.4) * h * 0.07 - Math.sin((x / w) * 5.5 + 0.3) * h * 0.012;

    function curvePath(g, f, bottom) {
      g.beginPath();
      g.moveTo(0, bottom);
      for (let x = 0; x <= w + 8; x += 8) g.lineTo(x, f(x));
      g.lineTo(w + 8, bottom);
      g.closePath();
    }

    function grass(g, f, n, scale, bottom) {
      for (let i = 0; i < n; i++) {
        const x = Math.random() * w;
        const top = f(x);
        const span = Math.max(1, bottom - top);
        const k = Math.pow(Math.random(), 1.5);
        const y = top + k * span;
        const len = (2 + Math.random() * 4) * scale * (0.5 + k);
        const l = 46 + Math.random() * 22 - k * 18;
        g.strokeStyle = `hsla(${92 + Math.random() * 22},72%,${l}%,0.5)`;
        g.lineWidth = 0.8 * scale;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + rand(-1.5, 1.5), y - len);
        g.stroke();
      }
    }

    function renderStatic() {
      layer = mk(Math.ceil(w * dpr), Math.ceil(h * dpr));
      const g = layer.getContext("2d");
      g.scale(dpr, dpr);

      const sky = g.createLinearGradient(0, 0, 0, hy);
      sky.addColorStop(0, "#0a5fd6");
      sky.addColorStop(0.38, "#2d95f4");
      sky.addColorStop(0.75, "#8fd3ff");
      sky.addColorStop(1, "#e4f7ff");
      g.fillStyle = sky;
      g.fillRect(0, 0, w, h);

      const R = Math.max(w, h) * 0.6;
      const sg = g.createRadialGradient(sx, sy, 0, sx, sy, R);
      sg.addColorStop(0, "rgba(255,255,248,1)");
      sg.addColorStop(0.035, "rgba(255,255,240,0.9)");
      sg.addColorStop(0.12, "rgba(255,250,220,0.38)");
      sg.addColorStop(0.4, "rgba(255,255,255,0.08)");
      sg.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = sg;
      g.fillRect(0, 0, w, h);

      // Rayos crepusculares
      g.save();
      g.globalCompositeOperation = "lighter";
      const L = Math.max(w, h) * 1.3;
      for (let i = 0; i < 11; i++) {
        const a = Math.PI * (0.5 + (i / 10) * 0.45) + rand(-0.04, 0.04);
        const sp = rand(0.025, 0.06);
        const gr = g.createRadialGradient(sx, sy, 0, sx, sy, L);
        gr.addColorStop(0, "rgba(255,255,235,0.09)");
        gr.addColorStop(1, "rgba(255,255,235,0)");
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(sx, sy);
        g.lineTo(sx + Math.cos(a - sp) * L, sy + Math.sin(a - sp) * L);
        g.lineTo(sx + Math.cos(a + sp) * L, sy + Math.sin(a + sp) * L);
        g.closePath();
        g.fill();
      }
      g.restore();

      // Montañas lejanas con perspectiva atmosférica
      const mg = g.createLinearGradient(0, hy - h * 0.09, 0, hy);
      mg.addColorStop(0, "#86b9e3");
      mg.addColorStop(1, "#c3e3f6");
      curvePath(g, mountains, ly);
      g.fillStyle = mg;
      g.fill();
      const hz = g.createLinearGradient(0, hy - h * 0.1, 0, hy + h * 0.03);
      hz.addColorStop(0, "rgba(230,248,255,0)");
      hz.addColorStop(1, "rgba(230,248,255,0.6)");
      g.fillStyle = hz;
      g.fillRect(0, hy - h * 0.1, w, h * 0.13);

      // Colina trasera
      const bg = g.createLinearGradient(0, h * 0.58, 0, ly);
      bg.addColorStop(0, "#a6e96c");
      bg.addColorStop(0.5, "#5fbf33");
      bg.addColorStop(1, "#3d9a22");
      curvePath(g, backHill, ly);
      g.fillStyle = bg;
      g.fill();
      grass(g, backHill, Math.round(w * 0.9), 0.6, ly);
      curvePath(g, backHill, ly);
      g.fillStyle = "rgba(205,238,255,0.16)";
      g.fill();

      // Colina delantera
      const fg = g.createLinearGradient(0, h * 0.66, 0, ly);
      fg.addColorStop(0, "#c4f879");
      fg.addColorStop(0.35, "#74d63d");
      fg.addColorStop(1, "#2f8c18");
      curvePath(g, frontHill, h);
      g.fillStyle = fg;
      g.fill();
      grass(g, frontHill, Math.round(w * 2.6), 1, ly);
      // Florecitas
      for (let i = 0; i < Math.round(w * 0.08); i++) {
        const x = Math.random() * w;
        const y = frontHill(x) + Math.random() * (ly - frontHill(x));
        g.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.85)" : "rgba(255,240,120,0.85)";
        g.beginPath();
        g.arc(x, y, rand(0.8, 1.6), 0, TAU);
        g.fill();
      }
      // Borde iluminado por el sol
      g.save();
      g.filter = "blur(2px)";
      g.beginPath();
      for (let x = 0; x <= w + 8; x += 8) x ? g.lineTo(x, frontHill(x) + 1) : g.moveTo(x, frontHill(x) + 1);
      g.strokeStyle = "rgba(240,255,190,0.8)";
      g.lineWidth = 3;
      g.stroke();
      g.restore();
    }

    function initClouds() {
      const sc = clamp(w / 1400, 0.6, 1.2);
      for (let i = 0; i < 9; i++) {
        const d = i % 3;
        clouds.push({
          sp: cloudSprites[i % cloudSprites.length],
          x: rand(-300, w),
          yf: [rand(0.28, 0.4), rand(0.13, 0.3), rand(0.0, 0.18)][d],
          s: [0.42, 0.68, 1.0][d] * sc,
          v: [4, 8, 14][d],
          depth: [0.3, 0.6, 1][d],
        });
      }
      clouds.sort((a, b) => a.depth - b.depth);
    }

    function resize() {
      dpr = prefs.quality === "alta" ? Math.min(window.devicePixelRatio || 1, 1.5) : 0.75;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.ceil(w * dpr);
      canvas.height = Math.ceil(h * dpr);
      hy = h * 0.6;
      ly = h * 0.87;
      sx = w * 0.8;
      sy = h * 0.12;
      renderStatic();
      if (!clouds.length) initClouds();
    }

    function drawLake() {
      const lh = h - ly;
      if (lh <= 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, ly, w, lh);
      ctx.clip();
      ctx.fillStyle = "#1d8fd2";
      ctx.fillRect(0, ly, w, lh);

      // Reflejo del paisaje en franjas onduladas
      const strips = Math.ceil(lh / (prefs.quality === "alta" ? 3 : 7));
      const sh = lh / strips;
      ctx.globalAlpha = 0.62;
      for (let k = 0; k < strips; k++) {
        const d = k * sh;
        const srcY = ly - d - sh;
        if (srcY < 0) break;
        const off = Math.sin(k * 0.55 + t * 1.6) * (1 + k * 0.12) + Math.sin(k * 0.23 - t * 0.9) * 1.5;
        ctx.drawImage(layer, 0, srcY * dpr, layer.width, sh * dpr, off - 4, ly + d, w + 8, sh + 0.7);
      }
      ctx.globalAlpha = 1;

      const dg = ctx.createLinearGradient(0, ly, 0, h);
      dg.addColorStop(0, "rgba(120,210,255,0.22)");
      dg.addColorStop(1, "rgba(0,70,140,0.45)");
      ctx.fillStyle = dg;
      ctx.fillRect(0, ly, w, lh);

      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 30; i++) {
        const f = i / 30;
        const y = ly + Math.pow(f, 1.8) * lh + 1;
        ctx.fillStyle = `rgba(255,255,255,${0.03 + 0.06 * Math.max(0, Math.sin(i * 1.7 + t * 1.3))})`;
        ctx.fillRect(0, y, w, 0.6 + f * 1.5);
      }
      // Camino de luz del sol sobre el agua
      ctx.save();
      ctx.translate(sx, ly);
      ctx.scale(0.3, 1);
      const sp = ctx.createRadialGradient(0, lh * 0.25, 0, 0, lh * 0.25, lh * 1.1);
      sp.addColorStop(0, "rgba(255,255,230,0.35)");
      sp.addColorStop(1, "rgba(255,255,230,0)");
      ctx.fillStyle = sp;
      ctx.fillRect(-lh * 1.2, 0, lh * 2.4, lh);
      ctx.restore();
      // Destellos
      for (const gl of glints) {
        const a = Math.sin((gl.life / gl.max) * Math.PI);
        ctx.fillStyle = `rgba(255,255,255,${a * 0.9})`;
        ctx.fillRect(gl.x - gl.s, gl.y - 0.5, gl.s * 2, 1);
        ctx.fillRect(gl.x - 0.5, gl.y - gl.s * 0.6, 1, gl.s * 1.2);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillRect(0, ly, w, 1.2);
      ctx.restore();
    }

    function drawFlare() {
      const cx = w / 2 + px * w * 0.15, cy = h / 2 + py * h * 0.1;
      const dx = cx - sx, dy = cy - sy, m = Math.min(w, h);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const ghosts = [[0.25, 0.035, "120,220,255", 0.1], [0.45, 0.07, "160,255,120", 0.06], [0.7, 0.022, "255,160,230", 0.12], [1.1, 0.11, "120,200,255", 0.045], [1.38, 0.045, "200,255,160", 0.08]];
      for (const [k, r, c, a] of ghosts) {
        const x = sx + dx * k, y = sy + dy * k, R = r * m;
        const g = ctx.createRadialGradient(x, y, 0, x, y, R);
        g.addColorStop(0, `rgba(${c},${a})`);
        g.addColorStop(0.7, `rgba(${c},${a * 0.6})`);
        g.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, R, 0, TAU);
        ctx.fill();
      }
      const st = ctx.createLinearGradient(sx - m * 0.5, 0, sx + m * 0.5, 0);
      st.addColorStop(0, "rgba(200,240,255,0)");
      st.addColorStop(0.5, "rgba(220,245,255,0.3)");
      st.addColorStop(1, "rgba(200,240,255,0)");
      ctx.fillStyle = st;
      ctx.fillRect(sx - m * 0.5, sy - 1.5, m, 3);
      ctx.restore();
    }

    function draw(dt) {
      t += dt;
      px += (tx - px) * Math.min(1, dt * 3);
      py += (ty - py) * Math.min(1, dt * 3);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(layer, 0, 0, w, h);

      for (const c of clouds) {
        if (!reduceMotion) c.x += c.v * dt;
        const cw = c.sp.width * c.s;
        if (c.x > w + 40) c.x = -cw - 40;
        ctx.globalAlpha = 0.78 + 0.22 * c.depth;
        ctx.drawImage(c.sp, c.x - px * 30 * c.depth, c.yf * h - py * 12 * c.depth, cw, c.sp.height * c.s);
      }
      ctx.globalAlpha = 1;

      if (Math.random() < dt * 30) glints.push({ x: sx + rand(-1, 1) * w * 0.06 * (1 + Math.random() * 2), y: ly + Math.random() * (h - ly), life: 0, max: rand(0.3, 0.8), s: rand(2, 4.5) });
      for (const gl of glints) gl.life += dt;
      for (let i = glints.length - 1; i >= 0; i--) if (glints[i].life >= glints[i].max) glints.splice(i, 1);

      drawLake();
      drawFlare();
    }

    function setPointer(nx, ny) { tx = nx; ty = ny; }

    window.addEventListener("resize", resize);
    resize();
    return { draw, setPointer, refresh: resize };
  })();

  // =========================================================
  // Sprites del juego (pre-renderizados)
  // =========================================================
  const SPR = 72, SR = 32;

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

    // Película de jabón: interferencia de capa fina (iridiscencia)
    const f = mk(SPR, SPR), fg = f.getContext("2d");
    const hues = ["255,80,200", "80,210,255", "255,235,90", "110,255,150", "170,110,255", "255,80,200"];
    const film = (angle, cx, cy, a) => {
      let grd;
      if (fg.createConicGradient) grd = fg.createConicGradient(angle, cx, cy);
      else grd = fg.createLinearGradient(0, 0, SPR, SPR);
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

    // Reflejo del césped en la parte baja
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
    // Efecto Fresnel: bordes más densos
    const fr = g.createRadialGradient(m, m, SR * 0.55, m, m, SR);
    fr.addColorStop(0, "rgba(10,70,60,0)");
    fr.addColorStop(0.85, "rgba(10,80,90,0.35)");
    fr.addColorStop(1, "rgba(5,50,70,0.78)");
    g.fillStyle = fr;
    g.fillRect(0, 0, SPR, SPR);
    // Cáustica: la luz se concentra en el lado opuesto
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

  const bubbleFrames = Array.from({ length: 24 }, (_, i) => bubbleFrame((i / 24) * TAU));
  const crystalSprites = [crystalSprite(false), crystalSprite(true)];
  const filmC = mk(SPR, SPR), filmG = filmC.getContext("2d");

  // =========================================================
  // Audio ASMR modelado (Web Audio)
  // =========================================================
  const W = 240, H = 300;

  const Sound = {
    ctx: null, master: null, send: null, enabled: prefs.sound, white: null, brown: null, lastPlip: 0,

    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { this.enabled = false; return; }
      const c = (this.ctx = new AC());
      this.master = c.createGain();
      this.master.gain.value = this.enabled ? 0.85 : 0;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 3;
      comp.attack.value = 0.003;
      comp.release.value = 0.25;
      this.master.connect(comp);
      comp.connect(c.destination);
      // Reverb por convolución con respuesta al impulso generada
      const verb = c.createConvolver();
      verb.buffer = this.makeIR(2.4);
      this.send = c.createGain();
      const verbOut = c.createGain();
      verbOut.gain.value = 0.6;
      this.send.connect(verb);
      verb.connect(verbOut);
      verbOut.connect(this.master);
      this.white = this.makeNoise(3, false);
      this.brown = this.makeNoise(6, true);
      this.startAmbient();
    },

    makeIR(sec) {
      const c = this.ctx, len = Math.floor(c.sampleRate * sec), buf = c.createBuffer(2, len, c.sampleRate);
      const fade = c.sampleRate * 0.01;
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        let lp = 0;
        for (let i = 0; i < len; i++) {
          const tt = i / len;
          const k = 0.1 + 0.85 * tt; // la cola se oscurece con el tiempo
          lp += (Math.random() * 2 - 1 - lp) * (1 - k);
          d[i] = lp * Math.pow(1 - tt, 2.6) * (i < fade ? i / fade : 1) * (1.6 + tt * 3);
        }
      }
      return buf;
    },

    makeNoise(sec, brown) {
      const c = this.ctx, len = Math.floor(c.sampleRate * sec), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const wv = Math.random() * 2 - 1;
        if (brown) { last = (last + 0.02 * wv) / 1.02; d[i] = last * 3.5; } else d[i] = wv;
      }
      return buf;
    },

    resume() { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); },

    setEnabled(on) {
      this.enabled = on;
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(on ? 0.85 : 0, t, 0.08);
    },

    ok() { return !!this.ctx && this.enabled; },
    panX(x) { return clamp((x / W) * 2 - 1, -1, 1) * 0.75; },

    out(pan = 0, wet = 0.3) {
      const c = this.ctx, g = c.createGain();
      let node = g;
      if (c.createStereoPanner) {
        const p = c.createStereoPanner();
        p.pan.value = clamp(pan, -1, 1);
        g.connect(p);
        node = p;
      }
      node.connect(this.master);
      if (wet > 0) {
        const s = c.createGain();
        s.gain.value = wet;
        node.connect(s);
        s.connect(this.send);
      }
      return g;
    },

    env(param, t, peak, attack, decay) {
      param.setValueAtTime(0.0001, t);
      param.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
      param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    },

    noise(t, dur, dest, { type = "bandpass", freq = 2000, q = 1, peak = 0.2, attack = 0.001, buf } = {}) {
      const c = this.ctx, src = c.createBufferSource();
      src.buffer = buf || this.white;
      const f = c.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = c.createGain();
      this.env(g.gain, t, peak, attack, dur);
      src.connect(f);
      f.connect(g);
      g.connect(dest);
      src.start(t, Math.random() * (src.buffer.duration - dur - 0.2));
      src.stop(t + attack + dur + 0.05);
      return f;
    },

    tone(t, freq, dest, { type = "sine", peak = 0.2, attack = 0.002, decay = 0.1, to = null, glide = 0.05 } = {}) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + glide);
      this.env(g.gain, t, peak, attack, decay);
      o.connect(g);
      g.connect(dest);
      o.start(t);
      o.stop(t + attack + decay + 0.05);
    },

    // Pop de pompa de jabón: chasquido agudo + resonancia que sube + soplo de aire
    pop(x, size = 1) {
      if (!this.ok()) return;
      const t = this.ctx.currentTime, d = this.out(this.panX(x), 0.22);
      this.noise(t, 0.014, d, { type: "highpass", freq: rand(2500, 4000), q: 0.7, peak: 0.35 });
      const f0 = rand(850, 1250) / size;
      this.tone(t + 0.002, f0, d, { peak: 0.22, decay: 0.07, to: f0 * rand(1.3, 1.6), glide: 0.05 });
      this.noise(t, 0.09, d, { type: "lowpass", freq: 900, q: 0.5, peak: 0.07, attack: 0.004 });
    },

    // Rotura de cristal: modos inarmónicos + crujido + esquirlas tintineando
    glass(x, intensity = 1) {
      if (!this.ok()) return;
      const t = this.ctx.currentTime, d = this.out(this.panX(x), 0.6);
      const base = rand(1500, 2300);
      [1, 2.32, 4.25, 6.63, 9.38].forEach((r, i) => this.tone(t, base * r * (1 + rand(-0.008, 0.008)), d, { peak: (0.09 * intensity) / (1 + i * 0.6), attack: 0.001, decay: 1.4 / (1 + i * 0.9) }));
      this.noise(t, 0.07, d, { type: "highpass", freq: 4500, q: 0.7, peak: 0.22 * intensity });
      for (let k = 0; k < 6; k++) this.tone(t + rand(0.06, 0.7), rand(3200, 6500), d, { peak: rand(0.015, 0.04), attack: 0.001, decay: rand(0.08, 0.2) });
    },

    crack(x) {
      if (!this.ok()) return;
      const t = this.ctx.currentTime, d = this.out(this.panX(x), 0.4);
      const base = rand(2000, 2600);
      [1, 2.7, 5.1].forEach((r, i) => this.tone(t, base * r, d, { peak: 0.05 / (1 + i), attack: 0.001, decay: 0.5 / (1 + i) }));
      this.noise(t, 0.02, d, { type: "highpass", freq: 3000, peak: 0.18 });
    },

    squirt(x) {
      if (!this.ok()) return;
      const t = this.ctx.currentTime, d = this.out(this.panX(x), 0.12);
      const f = this.noise(t, 0.1, d, { type: "bandpass", freq: 2400, q: 2.5, peak: 0.08, attack: 0.006 });
      f.frequency.exponentialRampToValueAtTime(900, t + 0.1);
      this.tone(t + 0.01, rand(330, 380), d, { peak: 0.06, decay: 0.08, to: 720, glide: 0.06 });
    },

    // Gota cayendo al agua: la burbuja atrapada resuena y sube de tono
    plip(x, vol = 1) {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      if (t - this.lastPlip < 0.05) return;
      this.lastPlip = t;
      const d = this.out(this.panX(x), 0.35), f = rand(700, 1100);
      this.tone(t, f, d, { peak: 0.05 * vol, decay: 0.07, to: f * rand(1.8, 2.4), glide: 0.035 });
      this.noise(t, 0.03, d, { type: "bandpass", freq: 3000, q: 1, peak: 0.02 * vol });
    },

    hurt(x) {
      if (!this.ok()) return;
      const t = this.ctx.currentTime, d = this.out(this.panX(x), 0.5);
      this.tone(t, 280, d, { peak: 0.22, decay: 0.25, to: 850, glide: 0.08 });
      this.tone(t, 130, d, { peak: 0.3, decay: 0.45, to: 55, glide: 0.4 });
      this.noise(t, 0.35, d, { type: "bandpass", freq: 1300, q: 0.8, peak: 0.14, attack: 0.01 });
    },

    note(freq, t, peak = 0.1, pan = 0) {
      const d = this.out(pan, 0.7);
      this.tone(t, freq, d, { peak, decay: 1.3 });
      this.tone(t, freq * 2.01, d, { peak: peak * 0.3, decay: 0.5 });
      this.tone(t, freq * 3.98, d, { peak: peak * 0.12, decay: 0.18 });
    },

    combo(n, x) {
      if (!this.ok() || n < 2) return;
      this.note(PENTA[Math.min(n - 2, PENTA.length - 1)], this.ctx.currentTime + 0.03, 0.07, this.panX(x));
    },

    arpeggio(up) {
      if (!this.ok()) return;
      const seq = up ? [0, 2, 4, 5, 7, 9] : [7, 5, 4, 2, 0];
      seq.forEach((k, i) => this.note(PENTA[k] * (up ? 1 : 0.5), this.ctx.currentTime + i * 0.1, 0.09, (i / seq.length - 0.5) * 0.8));
    },

    hinge() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime, d = this.out(0, 0.15);
      this.noise(t, 0.012, d, { type: "bandpass", freq: 1800, q: 3, peak: 0.3 });
      this.tone(t, 160, d, { peak: 0.18, decay: 0.06, to: 90, glide: 0.05 });
      this.noise(t + 0.07, 0.01, d, { type: "bandpass", freq: 3200, q: 4, peak: 0.22 });
    },

    click() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime, d = this.out(0, 0.05);
      this.noise(t, 0.006, d, { type: "bandpass", freq: 2600, q: 2, peak: 0.12 });
    },

    // Interfaz: tic de cristal al moverse por el menú
    tick() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime, d = this.out(0, 0.35);
      this.tone(t, rand(2900, 3100), d, { peak: 0.035, attack: 0.001, decay: 0.09 });
      this.tone(t, 6100, d, { peak: 0.012, attack: 0.001, decay: 0.04 });
    },

    // Interfaz: confirmación en dos notas
    confirm() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      this.note(PENTA[4], t, 0.06, -0.2);
      this.note(PENTA[7], t + 0.07, 0.05, 0.2);
    },

    // Transición: soplo de aire filtrado
    whoosh(up = true) {
      if (!this.ok()) return;
      const t = this.ctx.currentTime, d = this.out(0, 0.4);
      const f = this.noise(t, 0.4, d, { type: "bandpass", freq: up ? 500 : 2600, q: 1.2, peak: 0.07, attack: 0.12 });
      f.frequency.exponentialRampToValueAtTime(up ? 2800 : 500, t + 0.45);
    },

    // Tonos DTMF reales del teclado telefónico
    dtmf(k) {
      if (!this.ok()) return;
      const map = { 1: [697, 1209], 2: [697, 1336], 3: [697, 1477], 4: [770, 1209], 5: [770, 1336], 6: [770, 1477], 7: [852, 1209], 8: [852, 1336], 9: [852, 1477], "*": [941, 1209], 0: [941, 1336], "#": [941, 1477] };
      const pair = map[k];
      if (!pair) return;
      const t = this.ctx.currentTime, d = this.out(0, 0.15);
      pair.forEach(f => this.tone(t, f, d, { peak: 0.06, attack: 0.005, decay: 0.16 }));
      this.click();
    },

    startAmbient() {
      const c = this.ctx;
      // Viento suave
      const wind = c.createBufferSource();
      wind.buffer = this.brown;
      wind.loop = true;
      const wf = c.createBiquadFilter();
      wf.type = "lowpass";
      wf.frequency.value = 600;
      wf.Q.value = 0.6;
      const wg = c.createGain();
      wg.gain.value = 0;
      const lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = 0.07;
      lg.gain.value = 320;
      lfo.connect(lg);
      lg.connect(wf.frequency);
      const lfo2 = c.createOscillator(), lg2 = c.createGain();
      lfo2.frequency.value = 0.11;
      lg2.gain.value = 0.05;
      lfo2.connect(lg2);
      lg2.connect(wg.gain);
      wind.connect(wf);
      wf.connect(wg);
      wg.connect(this.out(-0.2, 0.2));
      wind.start();
      lfo.start();
      lfo2.start();
      wg.gain.setTargetAtTime(0.12, c.currentTime, 2);

      // Agua del lago
      const water = c.createBufferSource();
      water.buffer = this.white;
      water.loop = true;
      const bf = c.createBiquadFilter();
      bf.type = "bandpass";
      bf.frequency.value = 900;
      bf.Q.value = 0.8;
      const wag = c.createGain();
      wag.gain.value = 0;
      const l3 = c.createOscillator(), l3g = c.createGain();
      l3.frequency.value = 0.18;
      l3g.gain.value = 0.012;
      l3.connect(l3g);
      l3g.connect(wag.gain);
      water.connect(bf);
      bf.connect(wag);
      wag.connect(this.out(0.3, 0.3));
      water.start();
      l3.start();
      wag.gain.setTargetAtTime(0.018, c.currentTime, 3);

      // Colchón armónico que respira
      const pg = c.createGain();
      pg.gain.value = 0;
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 900;
      const plfo = c.createOscillator(), plg = c.createGain();
      plfo.frequency.value = 0.08;
      plg.gain.value = 350;
      plfo.connect(plg);
      plg.connect(lp.frequency);
      plfo.start();
      [130.81, 196.0, 246.94, 329.63].forEach((f, i) => {
        const o = c.createOscillator(), og = c.createGain();
        o.type = i % 2 ? "triangle" : "sine";
        o.frequency.value = f;
        o.detune.value = rand(-6, 6);
        og.gain.value = 0.05;
        o.connect(og);
        og.connect(lp);
        o.start();
      });
      lp.connect(pg);
      pg.connect(this.out(0, 0.6));
      pg.gain.setTargetAtTime(0.22, c.currentTime, 3);

      // Campanillas de viento lejanas
      const chime = () => {
        if (this.ok() && document.visibilityState === "visible") {
          const n = 1 + Math.floor(Math.random() * 3);
          for (let i = 0; i < n; i++) this.note(PENTA[Math.floor(rand(3, PENTA.length))], this.ctx.currentTime + i * rand(0.15, 0.4), 0.022, rand(-0.8, 0.8));
        }
        setTimeout(chime, rand(5000, 11000));
      };
      setTimeout(chime, 4000);
    },
  };

  // =========================================================
  // Juego
  // =========================================================
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const WATER = H - 16;
  const waveY = (x, t) => WATER + Math.sin(x * 0.08 + t * 2.1) * 1.1 + Math.sin(x * 0.19 - t * 3.3) * 0.5;

  // Fondo de la pantalla del juego
  const screenBg = (() => {
    const c = mk(W * dpr, H * dpr), g = c.getContext("2d");
    g.scale(dpr, dpr);
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#1f86ea");
    sky.addColorStop(0.45, "#63c4ff");
    sky.addColorStop(0.85, "#c9efff");
    sky.addColorStop(1, "#e8fbff");
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    const sg = g.createRadialGradient(W * 0.86, 18, 0, W * 0.86, 18, 140);
    sg.addColorStop(0, "rgba(255,255,245,0.95)");
    sg.addColorStop(0.08, "rgba(255,255,235,0.7)");
    sg.addColorStop(0.35, "rgba(255,255,255,0.15)");
    sg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = sg;
    g.fillRect(0, 0, W, H);
    // Colinas lejanas sobre el horizonte del agua
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

  const miniClouds = Array.from({ length: 5 }, (_, i) => ({
    sp: cloudSprites[i % cloudSprites.length], x: rand(-40, W), y: rand(4, 150), s: rand(0.13, 0.26), v: rand(2, 6),
  })).sort((a, b) => a.s - b.s);

  const ui = {
    score: document.getElementById("score"),
    wave: document.getElementById("wave"),
    lives: document.getElementById("lives"),
    phone: document.getElementById("phone"),
    intro: document.getElementById("intro"),
    enterBtn: document.getElementById("enterBtn"),
    sweep: document.getElementById("sweep"),
    scoreList: document.getElementById("scoreList"),
    bestLabel: document.getElementById("bestLabel"),
    newRecord: document.getElementById("newRecord"),
    finalScore: document.getElementById("finalScore"),
    finalWave: document.getElementById("finalWave"),
    setSound: document.getElementById("setSound"),
    setVibe: document.getElementById("setVibe"),
    setQuality: document.getElementById("setQuality"),
    soundBtn: document.getElementById("soundBtn"),
    pauseBtn: document.getElementById("pauseBtn"),
    fireBtn: document.getElementById("fireBtn"),
  };

  const state = { mode: "intro", score: 0, wave: 1, lives: 3, invuln: 0, time: 0, combo: 0, comboTimer: 0, shake: 0 };
  const player = { x: W / 2, y: WATER - 12, vx: 0, w: 34, maxSpeed: 130, cooldown: 0, rippleT: 0 };
  let shots = [], enemies = [], drops = [], particles = [], ripples = [];
  const fleet = { dir: 1, speed: 10, drop: 0 };
  const input = { left: false, right: false, fire: false };

  function spawnWave(n) {
    enemies = [];
    const cols = 6, rows = Math.min(3 + Math.floor((n - 1) / 2), 5);
    const gapX = 32, gapY = 28, startX = (W - (cols - 1) * gapX) / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const crystal = r === 0 || (n > 2 && r === 1);
        enemies.push({
          x: startX + c * gapX, y: 30 + r * gapY, r: crystal ? 10 : 9.5,
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

  function resetGame() {
    Object.assign(state, { score: 0, wave: 1, lives: 3, invuln: 0, combo: 0, comboTimer: 0 });
    player.x = W / 2;
    player.vx = 0;
    particles = [];
    spawnWave(1);
    updateHud();
  }

  function updateHud() {
    ui.score.textContent = state.score;
    ui.wave.textContent = state.wave;
    [...ui.lives.children].forEach((d, i) => d.classList.toggle("off", i >= state.lives));
  }

  // ---------- Récords ----------
  let scores = store.get("aerogame.scores", []);
  const best = () => (scores[0] ? scores[0].s : 0);
  function addScore(s, w) {
    const isRecord = s > 0 && s > best();
    scores.push({ s, w, d: Date.now() });
    scores.sort((a, b) => b.s - a.s);
    scores = scores.slice(0, 5);
    store.set("aerogame.scores", scores);
    return isRecord;
  }
  function renderScores() {
    ui.bestLabel.textContent = "Récord " + best();
    ui.scoreList.innerHTML = "";
    if (!scores.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = "Aún no hay récords. Juega una partida para estrenar la tabla.";
      ui.scoreList.appendChild(li);
      return;
    }
    const fmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });
    scores.forEach((r, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<small>${i + 1}</small><b>${r.s}</b><small>ola ${r.w} · ${fmt.format(new Date(r.d))}</small>`;
      ui.scoreList.appendChild(li);
    });
  }

  function renderSettings() {
    ui.setSound.textContent = prefs.sound ? "Sí" : "No";
    ui.setVibe.textContent = prefs.vibe ? "Sí" : "No";
    ui.setQuality.textContent = prefs.quality === "alta" ? "Alta" : "Ligera";
    ui.soundBtn.textContent = prefs.sound ? "♪" : "×";
  }

  // ---------- Navegación entre pantallas ----------
  const Nav = {
    panel: null,
    idx: 0,
    show(id, sound = true) {
      const next = id ? document.getElementById("p-" + id) : null;
      const prev = this.panel;
      if (prev && prev !== next) {
        prev.classList.remove("active");
        prev.classList.add("leaving");
        setTimeout(() => prev.classList.remove("leaving"), 550);
      }
      this.panel = next;
      this.idx = 0;
      if (next) {
        next.classList.remove("leaving");
        next.classList.add("active");
        this.focus();
      }
      ui.sweep.classList.remove("run");
      void ui.sweep.offsetWidth;
      ui.sweep.classList.add("run");
      if (sound) Sound.whoosh(!!next);
    },
    opts() { return this.panel ? [...this.panel.querySelectorAll(".opt")] : []; },
    focus() { this.opts().forEach((o, i) => o.classList.toggle("sel", i === this.idx)); },
    move(d) {
      const n = this.opts().length;
      if (!n) return;
      this.idx = (this.idx + d + n) % n;
      this.focus();
      Sound.tick();
    },
    select() { const o = this.opts()[this.idx]; if (o) o.click(); },
    back() { if (this.panel && this.panel.dataset.back) act(this.panel.dataset.back); },
  };

  function act(action) {
    Sound.init();
    Sound.resume();
    switch (action) {
      case "play": Sound.confirm(); startGame(); break;
      case "resume": Sound.confirm(); state.mode = "playing"; Nav.show(null); break;
      case "menu": state.mode = "menu"; renderScores(); Nav.show("menu"); break;
      case "scores": renderScores(); Nav.show("scores"); break;
      case "settings": renderSettings(); Nav.show("settings"); break;
      case "toggle-sound":
        prefs.sound = !prefs.sound;
        Sound.setEnabled(prefs.sound);
        if (prefs.sound) Sound.confirm();
        savePrefs(); renderSettings(); break;
      case "toggle-vibe":
        prefs.vibe = !prefs.vibe; buzz(20); Sound.tick();
        savePrefs(); renderSettings(); break;
      case "toggle-quality":
        prefs.quality = prefs.quality === "alta" ? "ligera" : "alta"; Sound.tick();
        savePrefs(); renderSettings(); World.refresh(); break;
      default: break;
    }
  }

  document.querySelectorAll(".opt").forEach(o => {
    o.addEventListener("click", () => act(o.dataset.action));
    o.addEventListener("pointerenter", e => {
      if (e.pointerType !== "mouse") return;
      const i = Nav.opts().indexOf(o);
      if (i >= 0 && i !== Nav.idx) { Nav.idx = i; Nav.focus(); Sound.tick(); }
    });
  });

  function startGame() {
    resetGame();
    state.mode = "playing";
    Nav.show(null);
  }

  function togglePause() {
    if (state.mode === "playing") {
      state.mode = "paused";
      Nav.show("pause");
    } else if (state.mode === "paused") act("resume");
  }

  // ---------- Entrada ----------
  function enter() {
    if (state.mode !== "intro") return;
    state.mode = "menu";
    Sound.init();
    Sound.resume();
    Sound.whoosh(true);
    ui.intro.classList.add("gone");
    setTimeout(() => { ui.phone.classList.add("open"); Sound.hinge(); }, 350);
    setTimeout(() => { renderScores(); Nav.show("menu"); }, 1100);
    setTimeout(() => ui.intro.remove(), 1200);
  }
  ui.intro.addEventListener("click", enter);

  function fire() {
    if (state.mode !== "playing" || player.cooldown > 0 || shots.length >= 3) return;
    shots.push({ x: player.x, y: player.y - 9, r: 4, vy: -175, wob: rand(0, 6), trail: 0 });
    player.cooldown = 0.3;
    Sound.squirt(player.x);
    for (let i = 0; i < 4; i++) particles.push({ kind: "mist", x: player.x + rand(-2, 2), y: player.y - 9, vx: rand(-25, 25), vy: rand(-60, -20), r: rand(0.5, 1.1), life: rand(0.2, 0.4), max: 0.4 });
  }

  // ---------- Efectos ----------
  function addText(x, y, txt, color = "#ffffff", size = 9) {
    particles.push({ kind: "text", x, y, vy: -22, txt, color, size, life: 0.9, max: 0.9 });
  }

  function popBubble(e, hx, hy) {
    particles.push({ kind: "film", x: e.x, y: e.y, r: e.r, frame: (Math.floor(e.phase * 3) + e.fo) % 24, hx: hx - e.x, hy: hy - e.y, life: 0.09, max: 0.09 });
    for (let i = 0; i < 18; i++) {
      const a = rand(0, TAU), sp = rand(30, 110);
      particles.push({ kind: "mist", x: e.x + Math.cos(a) * e.r, y: e.y + Math.sin(a) * e.r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 10, r: rand(0.4, 1.2), life: rand(0.35, 0.8), max: 0.8 });
    }
    for (let i = 0; i < 3; i++) particles.push({ kind: "daughter", x: e.x + rand(-5, 5), y: e.y + rand(-5, 5), vx: rand(-8, 8), vy: rand(-18, -6), r: rand(1.3, 2.6), ph: rand(0, TAU), fo: Math.floor(rand(0, 24)), life: rand(0.9, 1.8), max: 1.8 });
  }

  function shatter(e) {
    for (let i = 0; i < 14; i++) {
      const a = rand(0, TAU), sp = rand(30, 120), s = rand(1.8, 4.2);
      const pts = [];
      const n = Math.random() < 0.5 ? 3 : 4;
      for (let k = 0; k < n; k++) { const aa = (k / n) * TAU + rand(-0.4, 0.4); pts.push([Math.cos(aa) * s * rand(0.5, 1.2), Math.sin(aa) * s * rand(0.5, 1.2)]); }
      particles.push({ kind: "shard", x: e.x + Math.cos(a) * e.r * 0.5, y: e.y + Math.sin(a) * e.r * 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, rot: rand(0, TAU), vr: rand(-12, 12), seed: rand(0, TAU), pts, life: 2.2, max: 2.2 });
    }
    for (let i = 0; i < 7; i++) particles.push({ kind: "spark", x: e.x + rand(-6, 6), y: e.y + rand(-6, 6), s: rand(3, 6), life: rand(0.25, 0.5), max: 0.5 });
    particles.push({ kind: "ring", x: e.x, y: e.y, r: e.r * 0.8, life: 0.35, max: 0.35 });
  }

  function addRipple(x, strength = 1) {
    ripples.push({ x, r: 1, life: 0, max: 0.9 + strength * 0.5, s: strength });
  }

  // ---------- Actualización ----------
  function update(dt) {
    state.time += dt;
    state.shake = Math.max(0, state.shake - dt * 20);
    for (const c of miniClouds) { c.x += c.v * dt; if (c.x > W + 10) c.x = -c.sp.width * c.s - 10; }

    updateParticles(dt);
    for (const r of ripples) { r.life += dt; r.r += (16 + r.s * 10) * dt; }
    ripples = ripples.filter(r => r.life < r.max);

    // El deslizador flota y deja ondas incluso en el menú
    player.rippleT -= dt;
    if (player.rippleT <= 0) { addRipple(player.x, 0.4); player.rippleT = 0.45; }

    if (state.mode !== "playing") return;

    // Jugador con inercia
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    player.vx += (dir * player.maxSpeed - player.vx) * Math.min(1, dt * 9);
    player.x += player.vx * dt;
    if (player.x < player.w / 2 + 4 || player.x > W - player.w / 2 - 4) player.vx *= -0.3;
    player.x = clamp(player.x, player.w / 2 + 4, W - player.w / 2 - 4);
    player.cooldown = Math.max(0, player.cooldown - dt);
    state.invuln = Math.max(0, state.invuln - dt);
    if (Math.abs(player.vx) > 40 && Math.random() < dt * 40) {
      particles.push({ kind: "mist", x: player.x - Math.sign(player.vx) * 14, y: WATER, vx: -player.vx * 0.3 + rand(-10, 10), vy: rand(-50, -20), r: rand(0.5, 1.1), life: rand(0.25, 0.5), max: 0.5 });
    }
    if (input.fire) fire();

    // Combo
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;

    // Disparos
    for (const s of shots) {
      s.y += s.vy * dt;
      s.wob += dt * 12;
      s.x += Math.sin(s.wob) * 6 * dt;
      s.trail -= dt;
      if (s.trail <= 0) {
        s.trail = 0.05;
        particles.push({ kind: "daughter", x: s.x + rand(-1.5, 1.5), y: s.y + 6, vx: rand(-4, 4), vy: rand(4, 14), r: rand(0.6, 1.2), ph: rand(0, TAU), fo: Math.floor(rand(0, 24)), life: rand(0.3, 0.6), max: 0.6 });
      }
    }
    shots = shots.filter(s => s.y > -10);

    // Flota: deriva lateral y descenso suave
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
      fleet.drop += 8;
      for (const e of enemies) e.x = clamp(e.x, e.r + 4, W - e.r - 4);
    }

    // Colisiones disparo-enemigo
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
            addText(e.x, e.y - 4, mult > 1 ? `+${pts} ×${mult}` : `+${pts}`, crystal ? "#eaffc8" : "#ffffff");
            if (crystal) { shatter(e); Sound.glass(e.x); buzz(18); }
            else { popBubble(e, s.x, s.y); Sound.pop(e.x); buzz(8); }
            Sound.combo(state.combo, e.x);
          } else {
            Sound.crack(e.x);
            for (let i = 0; i < 3; i++) particles.push({ kind: "spark", x: s.x + rand(-3, 3), y: s.y + rand(-3, 3), s: rand(2, 4), life: 0.3, max: 0.3 });
          }
          break;
        }
      }
    }
    enemies = enemies.filter(e => e.hp > 0);

    // Gotas enemigas
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
        Sound.plip(d.x, 0.8);
        for (let i = 0; i < 5; i++) particles.push({ kind: "mist", x: d.x, y: WATER - 1, vx: rand(-25, 25), vy: rand(-70, -30), r: rand(0.5, 1), life: rand(0.25, 0.45), max: 0.45 });
      }
    }
    drops = drops.filter(d => !d.dead);

    if (enemies.some(e => e.y + e.r > player.y - 8)) { state.lives = 0; gameOver(); return; }

    if (!enemies.length) {
      state.wave++;
      state.score += 50;
      Sound.arpeggio(true);
      addText(W / 2, H / 2, `OLA ${state.wave}`, "#eaffc8", 16);
      spawnWave(state.wave);
    }
    updateHud();
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.life -= dt;
      switch (p.kind) {
        case "mist":
          p.vx *= 0.97; p.vy += 170 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.y > WATER + 2) p.life = 0;
          break;
        case "daughter":
          p.ph += dt * 6; p.vx *= 0.98; p.vy -= 6 * dt; p.x += (p.vx + Math.sin(p.ph) * 6) * dt; p.y += p.vy * dt;
          break;
        case "shard":
          p.vx *= 0.985; p.vy += 190 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
          if (p.y >= WATER) { p.life = 0; addRipple(p.x, 0.5); Sound.plip(p.x, 0.5); }
          break;
        case "text": p.y += p.vy * dt; p.vy *= 0.96; break;
        case "ring": p.r += 70 * dt; break;
        default: break;
      }
    }
    particles = particles.filter(p => p.life > 0);
  }

  function hitPlayer() {
    state.lives--;
    state.invuln = 1.6;
    state.shake = 6;
    state.combo = 0;
    for (let i = 0; i < 18; i++) particles.push({ kind: "mist", x: player.x + rand(-8, 8), y: player.y, vx: rand(-60, 60), vy: rand(-90, -20), r: rand(0.6, 1.4), life: rand(0.4, 0.8), max: 0.8 });
    addRipple(player.x, 1.5);
    Sound.hurt(player.x);
    buzz([30, 40, 30]);
    updateHud();
    if (state.lives <= 0) gameOver();
  }

  function gameOver() {
    state.mode = "over";
    updateHud();
    const record = addScore(state.score, state.wave);
    ui.finalScore.textContent = state.score;
    ui.finalWave.textContent = state.wave;
    ui.newRecord.hidden = !record;
    if (record) setTimeout(() => Sound.arpeggio(true), 600);
    else Sound.arpeggio(false);
    Nav.show("over");
  }

  // ---------- Dibujo ----------
  function drawSprite(spr, x, y, r, sx = 1, sy = 1) {
    const k = r / SR, size = SPR * k;
    if (sx === 1 && sy === 1) { ctx.drawImage(spr, x - size / 2, y - size / 2, size, size); return; }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, sy);
    ctx.drawImage(spr, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  function drawEnemy(e) {
    const wob = Math.sin(state.time * 38) * e.squish * 0.2;
    const breathe = e.type === "bubble" ? Math.sin(e.phase) * 0.035 : 0;
    const y = e.y + Math.sin(e.phase * 0.7) * 1.5;
    const spr = e.type === "bubble" ? bubbleFrames[(Math.floor(e.phase * 3) + e.fo) % 24] : crystalSprites[e.hp < 2 ? 1 : 0];
    drawSprite(spr, e.x, y, e.r, 1 + wob + breathe, 1 - wob - breathe);
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
    const t = state.time, w = 34, h = 9;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(bank * 0.16);
    // Casco cromado: refleja cielo arriba, horizonte brillante y césped abajo
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
    // Cúpula de cristal lima
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
    // Luces de navegación
    ctx.globalCompositeOperation = "lighter";
    const blink = 0.5 + 0.5 * Math.sin(t * 5);
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

  function playerVisible() {
    return !(state.invuln > 0 && Math.floor(state.time * 12) % 2 === 0);
  }

  function drawPlayer() {
    if (!playerVisible()) return;
    const bob = Math.sin(state.time * 3) * 1.1;
    const y = player.y + bob;
    // Colchón de aire / chorro de agua bajo el deslizador
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

  function drawShot(s) {
    drawSprite(bubbleFrames[(Math.floor(s.wob * 2)) % 24], s.x, s.y, s.r + Math.sin(s.wob) * 0.4);
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

  function drawParticles(front) {
    for (const p of particles) {
      const a = clamp(p.life / p.max, 0, 1);
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
          drawSprite(bubbleFrames[(Math.floor(p.ph) + p.fo) % 24], p.x, p.y, p.r);
          ctx.globalAlpha = 1;
          break;
        case "film": {
          const prog = 1 - a, k = SR / p.r;
          filmG.globalCompositeOperation = "source-over";
          filmG.clearRect(0, 0, SPR, SPR);
          filmG.drawImage(bubbleFrames[p.frame], 0, 0);
          filmG.globalCompositeOperation = "destination-out";
          filmG.beginPath();
          filmG.arc(SPR / 2 + p.hx * k, SPR / 2 + p.hy * k, prog * SR * 2.3, 0, TAU);
          filmG.fill();
          drawSprite(filmC, p.x, p.y, p.r);
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
          ctx.fillStyle = `rgba(${Math.round(lerp(170, 255, glint))},255,${Math.round(lerp(150, 255, glint))},${0.5 + 0.45 * glint})`;
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
          ctx.font = `italic 700 ${p.size}px "Trebuchet MS", "Segoe UI", sans-serif`;
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
    // Reflejo del deslizador
    if (playerVisible()) {
      ctx.save();
      ctx.globalAlpha = 0.32;
      ctx.translate(0, WATER * 2 + 1);
      ctx.scale(1, -1);
      drawPlayerBody(player.x + Math.sin(t * 4) * 0.8, player.y, player.vx / player.maxSpeed);
      ctx.restore();
    }
    // Ondas concéntricas
    for (const r of ripples) {
      const a = 1 - r.life / r.max;
      ctx.strokeStyle = `rgba(255,255,255,${0.55 * a * Math.min(1, r.s + 0.3)})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.ellipse(r.x, WATER + 2, r.r, r.r * 0.22, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 5; i++) {
      const y = WATER + 4 + i * 2.6;
      const x = ((i * 53 + t * (10 + i * 4)) % (W + 60)) - 30;
      ctx.fillStyle = `rgba(255,255,255,${0.12 - i * 0.015})`;
      ctx.fillRect(x, y, 26 - i * 3, 0.7);
      ctx.fillRect((x + 120) % (W + 60) - 30, y + 1, 18, 0.6);
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
    ctx.drawImage(screenBg, 0, 0, W, H);
    for (const c of miniClouds) ctx.drawImage(c.sp, c.x, c.y, c.sp.width * c.s, c.sp.height * c.s);
    drops.forEach(drawDrop);
    enemies.forEach(drawEnemy);
    shots.forEach(drawShot);
    drawParticles(false);
    drawWater();
    drawPlayer();
    drawParticles(true);
  }

  // ---------- Inclinación 3D del celular ----------
  const tiltEl = document.getElementById("phoneTilt");
  const shadowEl = document.getElementById("phoneShadow");
  const tilt = { rx: 0, ry: 0, trx: 0, try: 0, last: "" };
  window.addEventListener("pointermove", e => {
    if (e.pointerType !== "mouse") return;
    const nx = (e.clientX / window.innerWidth) * 2 - 1, ny = (e.clientY / window.innerHeight) * 2 - 1;
    World.setPointer(nx, ny);
    tilt.trx = -ny * 6;
    tilt.try = nx * 9;
  });
  function updateTilt(dt) {
    if (reduceMotion) return;
    tilt.rx += (tilt.trx - tilt.rx) * Math.min(1, dt * 4);
    tilt.ry += (tilt.try - tilt.ry) * Math.min(1, dt * 4);
    const key = tilt.rx.toFixed(2) + "," + tilt.ry.toFixed(2);
    if (key === tilt.last) return;
    tilt.last = key;
    tiltEl.style.setProperty("--rx", tilt.rx.toFixed(2) + "deg");
    tiltEl.style.setProperty("--ry", tilt.ry.toFixed(2) + "deg");
    tiltEl.style.setProperty("--gx", (50 - tilt.ry * 5).toFixed(1) + "%");
    shadowEl.style.setProperty("--sx", (-tilt.ry * 2).toFixed(1) + "px");
  }

  // ---------- Bucle ----------
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    World.draw(dt);
    draw();
    updateTilt(dt);
    requestAnimationFrame(loop);
  }

  // ---------- Controles ----------
  const keyMap = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", Space: "fire", ArrowUp: "fire", KeyW: "fire" };
  window.addEventListener("keydown", e => {
    if (state.mode === "intro") { if (!e.repeat) enter(); e.preventDefault(); return; }
    if (Nav.panel) {
      if (["ArrowLeft", "ArrowUp", "KeyA", "KeyW"].includes(e.code)) { Nav.move(-1); e.preventDefault(); }
      else if (["ArrowRight", "ArrowDown", "KeyD", "KeyS"].includes(e.code)) { Nav.move(1); e.preventDefault(); }
      else if ((e.code === "Enter" || e.code === "Space") && !e.repeat) { Nav.select(); e.preventDefault(); }
      else if ((e.code === "Escape" || e.code === "KeyP" || e.code === "Backspace") && !e.repeat) Nav.back();
      return;
    }
    if (keyMap[e.code]) { input[keyMap[e.code]] = true; e.preventDefault(); }
    if (!e.repeat && (e.code === "KeyP" || e.code === "Escape")) togglePause();
  });
  window.addEventListener("keyup", e => { if (keyMap[e.code]) input[keyMap[e.code]] = false; });
  window.addEventListener("blur", () => {
    input.left = input.right = input.fire = false;
    if (state.mode === "playing") togglePause();
  });

  function bindHold(el, onDown, onUp) {
    const down = e => {
      e.preventDefault();
      if (state.mode === "intro") { enter(); return; }
      Sound.init(); Sound.resume(); Sound.click();
      el.classList.add("pressed");
      onDown();
    };
    const up = () => { el.classList.remove("pressed"); onUp(); };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointerleave", up);
    el.addEventListener("pointercancel", up);
  }
  document.querySelectorAll(".key.dir").forEach(btn => {
    const side = btn.dataset.dir === "-1" ? "left" : "right";
    bindHold(btn, () => {
      if (Nav.panel) Nav.move(side === "left" ? -1 : 1);
      else input[side] = true;
    }, () => { input[side] = false; });
  });
  bindHold(ui.fireBtn, () => {
    if (Nav.panel) Nav.select();
    else input.fire = true;
  }, () => { input.fire = false; });

  ui.pauseBtn.addEventListener("click", () => {
    if (state.mode === "intro") return;
    Sound.click();
    if (Nav.panel) Nav.back();
    else togglePause();
  });
  ui.soundBtn.addEventListener("click", () => {
    if (state.mode === "intro") return;
    act("toggle-sound");
  });

  // Teclado numérico: tonos DTMF reales
  document.querySelectorAll(".numpad span").forEach(k => {
    k.addEventListener("pointerdown", () => {
      if (state.mode === "intro") { enter(); return; }
      Sound.init();
      Sound.resume();
      Sound.dtmf(k.dataset.k);
      k.classList.add("pressed");
    });
    const up = () => k.classList.remove("pressed");
    k.addEventListener("pointerup", up);
    k.addEventListener("pointerleave", up);
  });

  // Inicio: pantalla de entrada; el celular espera cerrado
  resetGame();
  renderSettings();
  renderScores();
  requestAnimationFrame(loop);
})();
