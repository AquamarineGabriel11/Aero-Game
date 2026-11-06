/* AeroOS: el sistema del smartphone (inicio, apps, minijuegos, récords y ajustes) */
import { TAU, mk, roundRect, windowHighlight, paintLandscape, prefs, savePrefs, Records, buzz, rand } from "./util.js";
import { Sound } from "./audio.js";
import * as Aqua from "./games/aqua.js";
import * as Glide from "./games/glide.js";
import * as Wrap from "./games/wrap.js";
import { bubbleFrames, crystalSprites, drawSprite } from "./games/sprites.js";

const GAMES = { aqua: Aqua, glide: Glide, wrap: Wrap };
const $ = id => document.getElementById(id);

/* ---------- Iconos de las apps ---------- */
function paintAppIcon(c, kind) {
  const s = c.width, g = c.getContext("2d"), m = s / 2;
  g.clearRect(0, 0, s, s);
  const bgs = {
    aqua: ["#7fdcff", "#1576d8"], glide: ["#bfeeff", "#3a9af0"], wrap: ["#e9ffd0", "#5fc83a"],
    records: ["#fff3b0", "#e8a51a"], settings: ["#f4fbff", "#8aa9bf"],
  };
  const [c0, c1] = bgs[kind];
  const bg = g.createLinearGradient(0, 0, 0, s);
  bg.addColorStop(0, c0);
  bg.addColorStop(1, c1);
  g.fillStyle = bg;
  g.fillRect(0, 0, s, s);
  if (kind === "aqua") {
    const fr = bubbleFrames();
    drawSprite(g, crystalSprites()[0], s * 0.34, s * 0.4, s * 0.17);
    drawSprite(g, fr[3], s * 0.66, s * 0.36, s * 0.15);
    drawSprite(g, fr[9], s * 0.52, s * 0.66, s * 0.12);
    g.fillStyle = "rgba(255,255,255,0.55)";
    g.fillRect(0, s * 0.84, s, s * 0.16);
  } else if (kind === "glide") {
    g.save();
    g.translate(m, m);
    g.rotate(-0.25);
    g.scale(s / 70, s / 70);
    const ch = g.createLinearGradient(0, -5, 0, 5);
    ch.addColorStop(0, "#fff"); ch.addColorStop(0.5, "#a8d8f5"); ch.addColorStop(1, "#3f6f8f");
    g.fillStyle = ch;
    g.beginPath();
    g.moveTo(18, 0); g.bezierCurveTo(14, -6, -8, -7, -16, -2); g.lineTo(-20, -9); g.lineTo(-17, 1); g.bezierCurveTo(-8, 6, 12, 6, 18, 0);
    g.fill();
    g.fillStyle = "#e9f6ff";
    g.beginPath(); g.moveTo(4, 1); g.lineTo(-9, 13); g.lineTo(-2, 13); g.lineTo(11, 2); g.fill();
    g.fillStyle = "rgba(60,200,255,0.9)";
    g.beginPath(); g.ellipse(5, -3, 7, 4, -0.1, Math.PI, 0); g.fill();
    g.restore();
    g.strokeStyle = "#c6ff4a";
    g.lineWidth = s * 0.05;
    g.shadowColor = "#c6ff4a";
    g.shadowBlur = s * 0.08;
    g.beginPath();
    g.ellipse(s * 0.24, m, s * 0.07, s * 0.24, 0, 0, TAU);
    g.stroke();
    g.shadowBlur = 0;
  } else if (kind === "wrap") {
    for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) {
      const x = s * (0.24 + q * 0.26 + (r % 2 ? 0.0 : 0)), y = s * (0.24 + r * 0.26), rr = s * 0.1;
      const gold = r === 1 && q === 1;
      const d = g.createRadialGradient(x - rr * 0.3, y - rr * 0.35, 1, x, y, rr);
      d.addColorStop(0, "rgba(255,255,255,0.95)");
      d.addColorStop(0.5, gold ? "rgba(200,255,120,0.8)" : "rgba(220,250,255,0.5)");
      d.addColorStop(1, gold ? "rgba(80,180,40,0.9)" : "rgba(80,160,210,0.6)");
      g.fillStyle = d;
      g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
      g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 1.5; g.stroke();
    }
  } else if (kind === "records") {
    const tg = g.createLinearGradient(0, s * 0.2, 0, s * 0.8);
    tg.addColorStop(0, "#fffbe0"); tg.addColorStop(0.5, "#ffd23a"); tg.addColorStop(1, "#c98a0a");
    g.fillStyle = tg;
    g.beginPath();
    g.moveTo(s * 0.3, s * 0.22); g.lineTo(s * 0.7, s * 0.22); g.lineTo(s * 0.66, s * 0.48);
    g.quadraticCurveTo(m, s * 0.62, s * 0.34, s * 0.48); g.closePath(); g.fill();
    g.fillRect(s * 0.46, s * 0.55, s * 0.08, s * 0.14);
    roundRect(g, s * 0.32, s * 0.68, s * 0.36, s * 0.1, s * 0.03); g.fill();
    g.strokeStyle = tg; g.lineWidth = s * 0.04;
    g.beginPath(); g.arc(s * 0.3, s * 0.32, s * 0.08, Math.PI * 0.5, Math.PI * 1.5); g.stroke();
    g.beginPath(); g.arc(s * 0.7, s * 0.32, s * 0.08, -Math.PI * 0.5, Math.PI * 0.5); g.stroke();
  } else if (kind === "settings") {
    g.save();
    g.translate(m, m);
    const gg = g.createLinearGradient(0, -s * 0.3, 0, s * 0.3);
    gg.addColorStop(0, "#ffffff"); gg.addColorStop(0.5, "#b8cddb"); gg.addColorStop(1, "#5f7f95");
    g.fillStyle = gg;
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU, r = i % 2 ? s * 0.24 : s * 0.3;
      i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath(); g.fill();
    g.fillStyle = "#29d3ff";
    g.beginPath(); g.arc(0, 0, s * 0.1, 0, TAU); g.fill();
    g.restore();
  }
  windowHighlight(g, s * 0.3, s * 0.22, s * 0.3, -0.4, 0.55);
  const gl = g.createLinearGradient(0, 0, 0, s * 0.5);
  gl.addColorStop(0, "rgba(255,255,255,0.5)");
  gl.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gl;
  g.beginPath();
  g.ellipse(m, 0, s * 0.75, s * 0.45, 0, 0, TAU);
  g.fill();
}

function paintWallpaper(c) {
  const w = c.width, h = c.height, g = c.getContext("2d");
  paintLandscape(g, w, h, { horizon: 0.66, clouds: 5, sun: [0.8, 0.1] });
  const fr = bubbleFrames();
  for (let i = 0; i < 14; i++) drawSprite(g, fr[i % 24], rand(0, w), rand(h * 0.1, h * 0.9), rand(6, 22) * (w / 300));
}

export function createPhone({ onClose }) {
  const ui = $("phoneUI"), device = $("device"), screen = $("screen");
  const home = $("home"), gameView = $("gameView"), recordsView = $("recordsView"), settingsView = $("settingsView");
  const canvas = $("gameCanvas"), sheet = $("sheet");
  let open = false, view = "home", game = null, gameId = null, running = false, ended = false, appOrigin = null;

  // Fondo y iconos
  const wp = $("wallpaper");
  const sizeWallpaper = () => {
    const r = screen.getBoundingClientRect();
    const d = Math.min(window.devicePixelRatio || 1, 2);
    wp.width = Math.max(1, Math.round(r.width * d));
    wp.height = Math.max(1, Math.round(r.height * d));
    paintWallpaper(wp);
  };
  document.querySelectorAll(".app canvas").forEach(c => paintAppIcon(c, c.closest(".app").dataset.app));

  // Reloj y saludo
  const tickClock = () => {
    const d = new Date();
    const hm = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    $("osClock").textContent = hm;
    $("wTime").textContent = hm;
    $("wDate").textContent = new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long" }).format(d);
    const hr = d.getHours();
    $("wGreet").textContent = hr < 6 ? "Buenas noches" : hr < 13 ? "Buenos días" : hr < 20 ? "Buenas tardes" : "Buenas noches";
  };
  tickClock();
  setInterval(tickClock, 15000);

  /* ---------- Vistas ---------- */
  function show(next, origin) {
    const views = { home, game: gameView, records: recordsView, settings: settingsView };
    const el = views[next];
    if (origin) {
      const sr = screen.getBoundingClientRect();
      el.style.setProperty("--ox", origin.x - sr.left + "px");
      el.style.setProperty("--oy", origin.y - sr.top + "px");
    }
    Object.entries(views).forEach(([k, v]) => {
      v.classList.toggle("active", k === next);
      v.classList.toggle("behind", k === "home" && next !== "home");
    });
    view = next;
  }

  function openApp(id, btn) {
    const r = btn.querySelector(".icon").getBoundingClientRect();
    appOrigin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    Sound.confirm();
    buzz(10);
    if (GAMES[id]) {
      gameId = id;
      show("game", appOrigin);
      setTimeout(() => showIntro(id), 220);
    } else if (id === "records") { renderRecords(); show("records", appOrigin); }
    else if (id === "settings") { renderSettings(); show("settings", appOrigin); }
  }

  function goHome() {
    if (view === "home") { close(); return; }
    stopGame();
    hideSheet();
    Sound.whoosh(false, 0.8);
    show("home");
  }

  document.querySelectorAll(".app").forEach(btn => btn.addEventListener("click", () => openApp(btn.dataset.app, btn)));
  $("homeBar").addEventListener("click", goHome);
  document.querySelectorAll("[data-home]").forEach(b => b.addEventListener("click", goHome));
  $("putDown").addEventListener("click", close);

  /* ---------- Hoja de cristal (intro, pausa, fin) ---------- */
  function showSheet(html, actions) {
    sheet.innerHTML = html;
    const row = document.createElement("div");
    row.className = "sheet-actions";
    actions.forEach(([label, fn, primary]) => {
      const b = document.createElement("button");
      b.className = "lg-btn" + (primary ? " primary" : "");
      b.textContent = label;
      b.addEventListener("click", () => { Sound.click(); fn(); });
      row.appendChild(b);
    });
    sheet.appendChild(row);
    sheet.hidden = false;
    requestAnimationFrame(() => sheet.classList.add("in"));
    setTimeout(() => row.querySelector(".primary")?.focus({ preventScroll: true }), 60);
  }
  function hideSheet() {
    sheet.classList.remove("in");
    setTimeout(() => { if (!sheet.classList.contains("in")) sheet.hidden = true; }, 300);
  }

  function showIntro(id) {
    const m = GAMES[id].meta;
    $("hudBar").classList.add("idle");
    drawIdleCanvas(id);
    showSheet(
      `<p class="kicker">AeroGame</p><h2>${m.name}</h2><p>${m.tagline}</p><p class="help">${m.help}</p><p class="best">Récord <b>${Records.best(id)}</b></p>`,
      [["Jugar", () => startGame(), true], ["Salir", goHome]]
    );
  }

  function drawIdleCanvas(id) {
    // Vista previa del juego detrás de la hoja
    stopGame();
    sizeCanvas();
    const W = 240, H = Math.round(240 * canvas.height / canvas.width);
    const preview = GAMES[id].create(canvas, W, H, { dpr: canvas.width / W, hud: () => {}, over: () => {} });
    for (let i = 0; i < 20; i++) preview.update(1 / 60);
    preview.draw();
    preview.destroy();
  }

  function sizeCanvas() {
    const r = canvas.getBoundingClientRect();
    const d = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(r.width * d);
    canvas.height = Math.round(r.height * d);
  }

  /* ---------- Juego ---------- */
  const hudEls = { score: $("hScore"), label: $("hLabel"), value: $("hValue"), lives: $("hLives") };
  function setHud({ score, label, value, lives }) {
    hudEls.score.textContent = score;
    hudEls.label.textContent = label;
    hudEls.value.textContent = value;
    if (lives == null) hudEls.lives.hidden = true;
    else {
      hudEls.lives.hidden = false;
      if (hudEls.lives.children.length !== 3) hudEls.lives.innerHTML = "<i></i><i></i><i></i>";
      [...hudEls.lives.children].forEach((d, i) => d.classList.toggle("off", i >= lives));
    }
  }

  function startGame() {
    stopGame();
    hideSheet();
    sizeCanvas();
    const W = 240, H = Math.round(240 * canvas.height / canvas.width);
    game = GAMES[gameId].create(canvas, W, H, { dpr: canvas.width / W, hud: setHud, over: gameOver });
    running = true;
    ended = false;
    $("hudBar").classList.remove("idle");
    Sound.arpeggio(true);
  }

  function stopGame() {
    running = false;
    ended = false;
    if (game) { game.destroy(); game = null; }
  }

  function pause() {
    if (!game || !running) return;
    running = false;
    game.release();
    Sound.whoosh(false, 0.6);
    showSheet(`<h2>Pausa</h2><p>Respira hondo. Todo te espera.</p>`, [
      ["Continuar", resume, true], ["Reiniciar", startGame], ["Salir", goHome],
    ]);
  }
  function resume() { if (!game || ended) return; hideSheet(); running = true; Sound.confirm(); }

  function gameOver(score, extra) {
    running = false;
    ended = true;
    const record = Records.add(gameId, score, extra);
    if (record) setTimeout(() => Sound.arpeggio(true), 500);
    setTimeout(() => {
      showSheet(
        `<h2>${record ? "¡Nuevo récord!" : "Fin de partida"}</h2>${record ? '<p class="badge">Nuevo récord</p>' : ""}
         <div class="result"><div><small>Puntos</small><b>${score}</b></div><div><small>Partida</small><b class="sm">${extra}</b></div></div>
         <p class="best">Mejor marca <b>${Records.best(gameId)}</b></p>`,
        [["Otra vez", startGame, true], ["Salir", goHome]]
      );
    }, 350);
  }
  $("pauseBtn").addEventListener("click", () => { Sound.click(); running ? pause() : null; });

  /* ---------- Récords ---------- */
  let recTab = "aqua";
  function renderRecords() {
    document.querySelectorAll(".seg button").forEach(b => b.classList.toggle("on", b.dataset.tab === recTab));
    const list = Records.list(recTab), ol = $("recList");
    ol.innerHTML = "";
    if (!list.length) {
      ol.innerHTML = `<li class="empty">Aún no hay récords en ${GAMES[recTab].meta.name}. Juega una partida para estrenar la tabla.</li>`;
      return;
    }
    const fmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });
    list.forEach((r, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="rk">${i + 1}</span><b>${r.s}</b><span class="meta">${r.x || ""} · ${fmt.format(new Date(r.d))}</span>`;
      ol.appendChild(li);
    });
  }
  document.querySelectorAll(".seg button").forEach(b => b.addEventListener("click", () => { recTab = b.dataset.tab; Sound.tick(); renderRecords(); }));

  /* ---------- Ajustes ---------- */
  function renderSettings() {
    $("tSound").checked = prefs.sound;
    $("tVibe").checked = prefs.vibe;
    $("tQuality").checked = prefs.quality === "alta";
  }
  $("tSound").addEventListener("change", e => { prefs.sound = e.target.checked; Sound.setEnabled(prefs.sound); savePrefs(); if (prefs.sound) Sound.confirm(); });
  $("tVibe").addEventListener("change", e => { prefs.vibe = e.target.checked; savePrefs(); buzz(20); Sound.tick(); });
  $("tQuality").addEventListener("change", e => { prefs.quality = e.target.checked ? "alta" : "ligera"; savePrefs(); Sound.tick(); $("qualityNote").hidden = false; });
  $("reloadBtn").addEventListener("click", () => location.reload());

  /* ---------- Abrir y cerrar ---------- */
  function openPhone() {
    if (open) return;
    open = true;
    ui.hidden = false;
    requestAnimationFrame(() => {
      ui.classList.add("open");
      sizeWallpaper();
    });
    show("home");
    Sound.wake();
  }
  function close() {
    if (!open) return;
    stopGame();
    hideSheet();
    open = false;
    ui.classList.remove("open");
    Sound.whoosh(false, 0.8);
    setTimeout(() => { if (!open) ui.hidden = true; }, 500);
    onClose?.();
  }

  window.addEventListener("resize", () => { if (open) { sizeWallpaper(); if (running) pause(); } });

  return {
    open: openPhone,
    close,
    get isOpen() { return open; },
    frame(dt) {
      if (!open || !game) return;
      // En pausa todo se congela; tras el fin de partida las partículas siguen cayendo
      if (running || ended) game.update(dt);
      game.draw();
    },
    key(e, down) {
      if (!open) return false;
      if (down && (e.code === "Escape" || e.code === "Backspace")) {
        if (view === "game" && running) pause();
        else if (view === "game" && !sheet.hidden && game && !ended) resume();
        else goHome();
        return true;
      }
      if (view === "game" && game && running) return game.key(e.code, down);
      if (down && (e.code === "Enter" || e.code === "Space") && !sheet.hidden) {
        sheet.querySelector(".primary")?.click();
        return true;
      }
      return false;
    },
    blur() { if (running) pause(); },
  };
}
