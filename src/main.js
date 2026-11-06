/* AeroGame — arranque: carga del departamento, entrada, teléfono y bucle principal */
import { Sound } from "./audio.js";
import { createPhone } from "./phone.js";

const $ = id => document.getElementById(id);
const intro = $("intro"), enterBtn = $("enterBtn"), loader = $("loader"), loadText = $("loadText");
const tip = $("hoverTip"), hint = $("roomHint");

// Refracción líquida del fondo: solo donde backdrop-filter acepta filtros SVG (Chromium)
if (window.CSS && CSS.supports("backdrop-filter", "url(#liquid)") && navigator.userAgentData) {
  document.documentElement.classList.add("refract");
}

let room = null;
let state = "loading"; // loading | ready | intro | room | phone

const phone = createPhone({
  onClose() {
    Sound.setDown();
    if (room) room.unfocus(() => { state = "room"; });
    else state = "room";
  },
});

function showTip(text) {
  if (text && state === "room") { tip.textContent = text; tip.hidden = false; }
  else tip.hidden = true;
}

function openPhone() {
  if (state !== "room") return;
  state = "phone";
  tip.hidden = true;
  hint.classList.add("fade");
  Sound.click();
  if (room) room.focusPhone(() => phone.open());
  else phone.open();
}

async function build() {
  // Dejar que la pantalla de carga se pinte antes del trabajo pesado
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  try { await document.fonts?.ready; } catch (e) { /* sin API de fuentes */ }
  try {
    const { createRoom } = await import("./room.js");
    room = createRoom($("room"), {
      onHover: showTip,
      onPhone: openPhone,
      onLamp: on => Sound.toggle(on),
      onTank: () => Sound.bubbles(8, 0.85),
    });
  } catch (err) {
    console.error(err);
    room = null;
    loadText.textContent = "Tu navegador no puede mostrar el departamento en 3D. Puedes jugar igual desde el teléfono.";
  }
  state = "ready";
  intro.classList.add("ready");
  if (room) loader.hidden = true;
  enterBtn.hidden = false;
  enterBtn.focus({ preventScroll: true });
}

function enter() {
  if (state !== "ready") return;
  state = "intro";
  Sound.init();
  Sound.resume();
  Sound.whoosh(true);
  intro.classList.add("gone");
  setTimeout(() => intro.remove(), 1100);
  if (room) {
    room.intro(() => {
      state = "room";
      hint.hidden = false;
      setTimeout(() => hint.classList.add("fade"), 7000);
    });
  } else {
    state = "room";
    openPhone();
  }
}
enterBtn.addEventListener("click", enter);

// Teclado: el teléfono recibe las teclas cuando está abierto
window.addEventListener("keydown", e => {
  if (state === "ready" && (e.code === "Enter" || e.code === "Space")) { e.preventDefault(); enter(); return; }
  if (state === "room" && (e.code === "Enter" || e.code === "Space" || e.code === "KeyT")) { e.preventDefault(); openPhone(); return; }
  if (phone.isOpen && phone.key(e, true)) e.preventDefault();
});
window.addEventListener("keyup", e => { if (phone.isOpen) phone.key(e, false); });
window.addEventListener("blur", () => phone.blur());
document.addEventListener("visibilitychange", () => { if (document.hidden) phone.blur(); });

// Bucle principal
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (room) room.render();
  phone.frame(dt);
  requestAnimationFrame(loop);
}

build().then(() => requestAnimationFrame(loop));
