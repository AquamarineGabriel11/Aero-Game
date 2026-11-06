/* El departamento: escena 3D Y2K / Frutiger Aero con Three.js (PBR, transmisión, reflejos y bloom) */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { TAU, rand, clamp, lerp, easeInOut, mk, roundRect, windowHighlight, paintLandscape, cloudSprites, prefs, reduceMotion } from "./util.js";

const RW = 8, RD = 7, RH = 3.1;            // dimensiones del departamento (m)
const X0 = -RW / 2, X1 = RW / 2, Z0 = -RD / 2, Z1 = RD / 2;

/* ================= Texturas pintadas en canvas ================= */

function tex(canvas, { srgb = true, repeat = null } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.anisotropy = 8;
  return t;
}

function paintSkyCeiling() {
  const w = 1600, h = 1440, c = mk(w, h), g = c.getContext("2d");
  const base = g.createRadialGradient(w * 0.55, h * 0.5, 0, w * 0.55, h * 0.5, w * 0.8);
  base.addColorStop(0, "#6cc0ff");
  base.addColorStop(0.55, "#2f8cf0");
  base.addColorStop(1, "#1556c8");
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  const cs = cloudSprites();
  for (let i = 0; i < 26; i++) {
    const s = rand(0.6, 1.5);
    const sp = cs[i % cs.length];
    g.save();
    g.globalAlpha = rand(0.75, 1);
    g.translate(rand(-100, w), rand(-60, h));
    g.rotate(rand(-0.4, 0.4));
    g.drawImage(sp, 0, 0, sp.width * s, sp.height * s);
    g.restore();
  }
  return c;
}

function paintNoise(w, h, base, spread, alpha = 1) {
  const c = mk(w, h), g = c.getContext("2d");
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  const img = g.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * spread;
    d[i] = clamp(d[i] + n, 0, 255);
    d[i + 1] = clamp(d[i + 1] + n * 1.2, 0, 255);
    d[i + 2] = clamp(d[i + 2] + n * 0.6, 0, 255);
    d[i + 3] = 255 * alpha;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/* Iconos Aero brillantes para los paneles de cristal de la pared */
function paintIcon(type, size = 256) {
  const c = mk(size, size), g = c.getContext("2d"), s = size, m = s / 2;
  // Fondo de cristal del panel
  const bg = g.createLinearGradient(0, 0, 0, s);
  bg.addColorStop(0, "rgba(210,245,255,0.95)");
  bg.addColorStop(1, "rgba(120,205,250,0.9)");
  roundRect(g, 4, 4, s - 8, s - 8, s * 0.14);
  g.fillStyle = bg;
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = "rgba(255,255,255,0.95)";
  g.stroke();
  const glossy = (path, c0, c1) => {
    const gr = g.createLinearGradient(0, s * 0.2, 0, s * 0.8);
    gr.addColorStop(0, c0);
    gr.addColorStop(1, c1);
    g.fillStyle = gr;
    path();
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = "rgba(255,255,255,0.9)";
    g.stroke();
  };
  g.save();
  g.shadowColor = "rgba(0,60,120,0.35)";
  g.shadowBlur = 12;
  g.shadowOffsetY = 6;
  switch (type) {
    case "home":
      glossy(() => { g.beginPath(); g.moveTo(m, s * 0.2); g.lineTo(s * 0.8, s * 0.48); g.lineTo(s * 0.72, s * 0.48); g.lineTo(s * 0.72, s * 0.78); g.lineTo(s * 0.28, s * 0.78); g.lineTo(s * 0.28, s * 0.48); g.lineTo(s * 0.2, s * 0.48); g.closePath(); }, "#ffffff", "#9fc8e8");
      g.shadowColor = "transparent";
      g.fillStyle = "#1d6fd6";
      g.fillRect(s * 0.44, s * 0.58, s * 0.12, s * 0.2);
      break;
    case "back":
      glossy(() => { g.beginPath(); g.moveTo(s * 0.18, m); g.lineTo(s * 0.48, s * 0.24); g.lineTo(s * 0.48, s * 0.4); g.lineTo(s * 0.82, s * 0.4); g.lineTo(s * 0.82, s * 0.6); g.lineTo(s * 0.48, s * 0.6); g.lineTo(s * 0.48, s * 0.76); g.closePath(); }, "#c6ff6a", "#3fae1a");
      break;
    case "refresh":
      g.lineWidth = s * 0.1;
      g.lineCap = "round";
      const rg = g.createLinearGradient(0, s * 0.2, 0, s * 0.8);
      rg.addColorStop(0, "#7fd0ff");
      rg.addColorStop(1, "#1560c8");
      g.strokeStyle = rg;
      g.beginPath();
      g.arc(m, m, s * 0.25, -0.3, Math.PI * 1.55);
      g.stroke();
      g.fillStyle = "#1560c8";
      g.beginPath();
      g.moveTo(s * 0.78, s * 0.28);
      g.lineTo(s * 0.8, s * 0.52);
      g.lineTo(s * 0.58, s * 0.44);
      g.closePath();
      g.fill();
      break;
    case "globe": {
      const gg = g.createRadialGradient(m - s * 0.1, m - s * 0.12, s * 0.04, m, m, s * 0.3);
      gg.addColorStop(0, "#bfefff");
      gg.addColorStop(0.5, "#2f8ff0");
      gg.addColorStop(1, "#0c4fb0");
      g.fillStyle = gg;
      g.beginPath();
      g.arc(m, m, s * 0.3, 0, TAU);
      g.fill();
      g.shadowColor = "transparent";
      g.fillStyle = "#5fd04a";
      [[m - s * 0.1, m - s * 0.08, s * 0.1], [m + s * 0.08, m + s * 0.06, s * 0.08], [m - s * 0.02, m + s * 0.16, s * 0.05]].forEach(([x, y, r]) => { g.beginPath(); g.ellipse(x, y, r, r * 0.7, 0.4, 0, TAU); g.fill(); });
      g.strokeStyle = "rgba(255,255,255,0.6)";
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(m, m, s * 0.3, s * 0.11, 0, 0, TAU);
      g.moveTo(m, m - s * 0.3);
      g.ellipse(m, m, s * 0.12, s * 0.3, 0, -Math.PI / 2, Math.PI * 1.5);
      g.stroke();
      break;
    }
    case "folder":
      glossy(() => { roundRect(g, s * 0.2, s * 0.3, s * 0.6, s * 0.44, s * 0.05); }, "#ffe680", "#f0b020");
      break;
    case "mail":
      glossy(() => { roundRect(g, s * 0.2, s * 0.3, s * 0.6, s * 0.4, s * 0.04); }, "#ffffff", "#b8d4ea");
      g.shadowColor = "transparent";
      g.strokeStyle = "#5f8fb8";
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(s * 0.22, s * 0.32);
      g.lineTo(m, s * 0.52);
      g.lineTo(s * 0.78, s * 0.32);
      g.stroke();
      break;
    default: break;
  }
  g.restore();
  // Brillo de cristal superior
  g.save();
  roundRect(g, 4, 4, s - 8, s - 8, s * 0.14);
  g.clip();
  const sh = g.createLinearGradient(0, 0, 0, s * 0.5);
  sh.addColorStop(0, "rgba(255,255,255,0.55)");
  sh.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = sh;
  g.beginPath();
  g.ellipse(m, -s * 0.05, s * 0.7, s * 0.42, 0, 0, TAU);
  g.fill();
  g.restore();
  return c;
}

function paintWordPanel() {
  const w = 300, h = 720, c = mk(w, h), g = c.getContext("2d");
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#1f74e0");
  bg.addColorStop(1, "#0a3fa8");
  roundRect(g, 0, 0, w, h, 30);
  g.fillStyle = bg;
  g.fill();
  const gl = g.createLinearGradient(0, 0, w, 0);
  gl.addColorStop(0, "rgba(255,255,255,0.25)");
  gl.addColorStop(0.5, "rgba(255,255,255,0)");
  g.fillStyle = gl;
  g.fill();
  // globo
  g.strokeStyle = "rgba(255,255,255,0.95)";
  g.lineWidth = 5;
  g.beginPath();
  g.arc(w / 2, 120, 46, 0, TAU);
  g.ellipse(w / 2, 120, 46, 18, 0, 0, TAU);
  g.moveTo(w / 2, 74);
  g.ellipse(w / 2, 120, 20, 46, 0, -Math.PI / 2, Math.PI * 1.5);
  g.stroke();
  g.fillStyle = "#fff";
  g.font = 'italic 600 40px "Exo 2", "Trebuchet MS", sans-serif';
  g.textAlign = "left";
  ["Buscar", "Explorar", "Conectar", "Crear", "Soñar"].forEach((t, i) => g.fillText(t, 46, 250 + i * 86));
  return c;
}

function paintMonitor() {
  const w = 512, h = 400, c = mk(w, h), g = c.getContext("2d");
  paintLandscape(g, w, h, { horizon: 0.6, clouds: 5 });
  // Ventana de explorador al estilo 2005
  g.save();
  g.shadowColor = "rgba(0,40,90,0.4)";
  g.shadowBlur = 16;
  roundRect(g, 60, 50, 300, 210, 12);
  g.fillStyle = "rgba(235,248,255,0.92)";
  g.fill();
  g.restore();
  const bar = g.createLinearGradient(0, 50, 0, 84);
  bar.addColorStop(0, "#6cc4ff");
  bar.addColorStop(1, "#1f74e0");
  g.fillStyle = bar;
  roundRect(g, 60, 50, 300, 34, 12);
  g.fill();
  g.fillStyle = "#fff";
  g.font = 'italic 700 18px "Exo 2", sans-serif';
  g.fillText("AeroNet", 76, 74);
  [["#ffcc4a", 300], ["#7fdc45", 322], ["#ff6a6a", 344]].forEach(([col, x]) => { g.fillStyle = col; g.beginPath(); g.arc(x, 67, 7, 0, TAU); g.fill(); });
  g.fillStyle = "#2f8ff0";
  g.font = '600 15px "Exo 2", sans-serif';
  ["Inicio", "Favoritos", "Buscar", "Descargas"].forEach((t, i) => g.fillText(t, 84, 120 + i * 32));
  windowHighlight(g, 300, 160, 60, -0.2, 0.5);
  // barra de tareas
  const tb = g.createLinearGradient(0, h - 34, 0, h);
  tb.addColorStop(0, "#3a8ff0");
  tb.addColorStop(1, "#164fb8");
  g.fillStyle = tb;
  g.fillRect(0, h - 34, w, 34);
  const st = g.createLinearGradient(0, h - 34, 0, h);
  st.addColorStop(0, "#8fe04a");
  st.addColorStop(1, "#3a9a1a");
  g.fillStyle = st;
  roundRect(g, 0, h - 34, 110, 34, 14);
  g.fill();
  g.fillStyle = "#fff";
  g.font = 'italic 800 18px "Exo 2", sans-serif';
  g.fillText("inicio", 26, h - 11);
  return c;
}

/* Pantalla del smartphone sobre la mesa (en reposo) */
function paintPhoneScreen(c) {
  const w = c.width, h = c.height, g = c.getContext("2d");
  g.clearRect(0, 0, w, h);
  paintLandscape(g, w, h, { horizon: 0.62, clouds: 3, grass: false, sun: [0.75, 0.12] });
  g.fillStyle = "rgba(0,30,70,0.18)";
  g.fillRect(0, 0, w, h);
  const d = new Date();
  g.fillStyle = "#fff";
  g.textAlign = "center";
  g.shadowColor = "rgba(0,50,110,0.6)";
  g.shadowBlur = 10;
  g.font = `italic 800 ${w * 0.26}px "Exo 2", "Trebuchet MS", sans-serif`;
  g.fillText(String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"), w / 2, h * 0.3);
  g.font = `600 ${w * 0.065}px "Exo 2", sans-serif`;
  g.fillText("AeroOS · toca para jugar", w / 2, h * 0.36);
  // fila de apps
  const cols = ["#29d3ff", "#9cff3a", "#7fdcff"];
  cols.forEach((col, i) => {
    const x = w * (0.22 + i * 0.28), y = h * 0.78, r = w * 0.1;
    const gr = g.createLinearGradient(0, y - r, 0, y + r);
    gr.addColorStop(0, "#ffffff");
    gr.addColorStop(0.5, col);
    gr.addColorStop(1, col);
    g.fillStyle = gr;
    roundRect(g, x - r, y - r, r * 2, r * 2, r * 0.45);
    g.fill();
  });
  g.shadowBlur = 0;
  g.fillStyle = "rgba(255,255,255,0.8)";
  roundRect(g, w * 0.35, h * 0.95, w * 0.3, h * 0.008, 3);
  g.fill();
}

/* ================= Escena ================= */

export function createRoom(container, hooks = {}) {
  const hi = prefs.quality === "alta";
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, hi ? 1.75 : 1));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = hi;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#7fc8ff");
  const camera = new THREE.PerspectiveCamera(52, container.clientWidth / container.clientHeight, 0.03, 60);

  const interactive = [];   // { mesh, kind, label }
  const animators = [];     // funciones (t, dt) por frame

  /* ---------- Materiales ---------- */
  const M = {
    wall: new THREE.MeshPhysicalMaterial({ color: "#e4eef6", roughness: 0.5, clearcoat: 0.45, clearcoatRoughness: 0.25 }),
    chrome: new THREE.MeshStandardMaterial({ color: "#eef6fb", metalness: 1, roughness: 0.12 }),
    brushed: new THREE.MeshStandardMaterial({ color: "#d8e4ec", metalness: 1, roughness: 0.32 }),
    blueBand: new THREE.MeshPhysicalMaterial({ color: "#1f5fd6", roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 }),
    whiteGloss: new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 }),
    lime: new THREE.MeshPhysicalMaterial({ color: "#8fe23a", roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.04 }),
    glass: new THREE.MeshPhysicalMaterial({ color: "#d8f6ff", metalness: 0, roughness: 0.03, transmission: 1, thickness: 0.04, ior: 1.5, attenuationColor: new THREE.Color("#7fe0ff"), attenuationDistance: 0.6, specularIntensity: 1 }),
    glassThin: new THREE.MeshPhysicalMaterial({ color: "#e6fbff", roughness: 0.02, transparent: true, opacity: 0.07, envMapIntensity: 0.7, depthWrite: false }),
    neonCyan: new THREE.MeshStandardMaterial({ color: "#000000", emissive: "#3ff0ff", emissiveIntensity: 3.2, toneMapped: false }),
    neonLime: new THREE.MeshStandardMaterial({ color: "#000000", emissive: "#a8ff3a", emissiveIntensity: 2.6, toneMapped: false }),
    leaf: new THREE.MeshStandardMaterial({ color: "#3fae3a", roughness: 0.45, side: THREE.DoubleSide }),
  };

  /* ---------- Estructura del departamento ---------- */
  const add = (mesh, { cast = true, receive = true } = {}) => { mesh.castShadow = cast && hi; mesh.receiveShadow = receive && hi; scene.add(mesh); return mesh; };

  // Techo de cielo pintado (sin iluminar, brilla como un mural retroiluminado)
  const ceilTex = tex(paintSkyCeiling());
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), new THREE.MeshBasicMaterial({ map: ceilTex, color: new THREE.Color(0.95, 0.95, 0.95) }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = RH;
  scene.add(ceiling);

  // Pared trasera con ventana redondeada
  const WX = 1.35, WY = 1.6, WW = 2.7, WH = 1.6, WR = 0.36;
  const wallShape = new THREE.Shape();
  wallShape.moveTo(X0, 0); wallShape.lineTo(X1, 0); wallShape.lineTo(X1, RH); wallShape.lineTo(X0, RH); wallShape.closePath();
  const hole = new THREE.Path();
  const rr = (p, x, y, w, h, r) => { p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r); p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h); p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r); p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y); };
  rr(hole, WX - WW / 2, WY - WH / 2, WW, WH, WR);
  wallShape.holes.push(hole);
  const back = add(new THREE.Mesh(new THREE.ShapeGeometry(wallShape, 24), M.wall), { cast: false });
  back.position.z = Z0;

  const wallL = add(new THREE.Mesh(new THREE.PlaneGeometry(RD, RH), M.wall), { cast: false });
  wallL.rotation.y = Math.PI / 2; wallL.position.set(X0, RH / 2, 0);
  const wallR = add(new THREE.Mesh(new THREE.PlaneGeometry(RD, RH), M.wall), { cast: false });
  wallR.rotation.y = -Math.PI / 2; wallR.position.set(X1, RH / 2, 0);
  const wallF = add(new THREE.Mesh(new THREE.PlaneGeometry(RW, RH), M.wall), { cast: false });
  wallF.rotation.y = Math.PI; wallF.position.set(0, RH / 2, Z1);

  // Marco cromado de la ventana
  const frameShape = new THREE.Shape();
  rr(frameShape, WX - WW / 2 - 0.09, WY - WH / 2 - 0.09, WW + 0.18, WH + 0.18, WR + 0.08);
  const frameHole = new THREE.Path();
  rr(frameHole, WX - WW / 2, WY - WH / 2, WW, WH, WR);
  frameShape.holes.push(frameHole);
  const winFrame = add(new THREE.Mesh(new THREE.ExtrudeGeometry(frameShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 4, curveSegments: 24 }), M.chrome));
  winFrame.position.z = Z0 - 0.02;
  // Cristal de la ventana y paisaje exterior
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(WW, WH), M.glassThin);
  pane.position.set(WX, WY, Z0 + 0.01);
  scene.add(pane);
  const outC = mk(2048, 1024);
  paintLandscape(outC.getContext("2d"), 2048, 1024, { horizon: 0.58, clouds: 9, sun: [0.62, 0.14] });
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), new THREE.MeshBasicMaterial({ map: tex(outC), color: new THREE.Color(1, 1, 1), fog: false }));
  outside.position.set(WX, 1.9, Z0 - 4);
  scene.add(outside);

  // Banda azul superior con moldura cromada y neón de cornisa
  const band = (len, pos, rotY) => {
    const b = add(new THREE.Mesh(new THREE.BoxGeometry(len, 0.3, 0.05), M.blueBand), { cast: false });
    b.position.copy(pos); b.rotation.y = rotY;
    const mold = add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 16), M.chrome), { cast: false });
    mold.rotation.z = Math.PI / 2;
    const holder = new THREE.Group();
    holder.position.copy(pos); holder.rotation.y = rotY;
    scene.remove(mold);
    mold.position.set(0, -0.17, 0.03);
    holder.add(mold);
    const neon = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, len, 8), M.neonCyan);
    neon.rotation.z = Math.PI / 2;
    neon.position.set(0, 0.29, 0.09);
    holder.add(neon);
    scene.add(holder);
  };
  band(RW, new THREE.Vector3(0, RH - 0.3, Z0 + 0.03), 0);
  band(RD, new THREE.Vector3(X0 + 0.03, RH - 0.3, 0), Math.PI / 2);
  band(RD, new THREE.Vector3(X1 - 0.03, RH - 0.3, 0), -Math.PI / 2);
  band(RW, new THREE.Vector3(0, RH - 0.3, Z1 - 0.03), Math.PI);
  // Zócalo cromado
  [[RW, new THREE.Vector3(0, 0.05, Z0 + 0.02), 0], [RD, new THREE.Vector3(X0 + 0.02, 0.05, 0), Math.PI / 2], [RD, new THREE.Vector3(X1 - 0.02, 0.05, 0), -Math.PI / 2]].forEach(([len, p, r]) => {
    const s = add(new THREE.Mesh(new THREE.BoxGeometry(len, 0.1, 0.03), M.brushed), { cast: false });
    s.position.copy(p); s.rotation.y = r;
  });

  // Focos empotrados del techo
  for (const [x, z] of [[-2.6, -2.0], [0, -2.0], [2.6, -2.0], [-2.6, 1], [0, 1.2], [2.6, 1]]) {
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.07, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3), toneMapped: false }));
    d.rotation.x = Math.PI / 2; d.position.set(x, RH - 0.005, z);
    scene.add(d);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.095, 24), M.chrome);
    ring.rotation.x = Math.PI / 2; ring.position.set(x, RH - 0.006, z);
    scene.add(ring);
  }

  /* ---------- Suelo azul brillante con reflejo real ---------- */
  let reflector = null;
  if (hi) {
    reflector = new Reflector(new THREE.PlaneGeometry(RW, RD), {
      textureWidth: Math.floor(container.clientWidth * 0.6),
      textureHeight: Math.floor(container.clientHeight * 0.6),
      color: 0x9aa8b8,
      clipBias: 0.003,
    });
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.y = 0;
    scene.add(reflector);
  }
  const floorMat = new THREE.MeshPhysicalMaterial({
    color: "#1d62d6", roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06,
    transparent: hi, opacity: hi ? 0.8 : 1,
  });
  const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), floorMat), { cast: false });
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.002;

  // Camino de césped serpenteante con piedras cromadas
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.9, 0, Z1 + 0.2), new THREE.Vector3(0.1, 0, 2.6), new THREE.Vector3(1.0, 0, 1.0),
    new THREE.Vector3(0.1, 0, -0.6), new THREE.Vector3(-1.2, 0, -1.7),
  ]);
  const ptsL = [], ptsR = [];
  const N = 80;
  for (let i = 0; i <= N; i++) {
    const t = i / N, p = path.getPointAt(t), tg = path.getTangentAt(t);
    const nx = -tg.z, nz = tg.x;
    const wid = 0.62 + Math.sin(t * 9) * 0.08 + (1 - t) * 0.1;
    ptsL.push(new THREE.Vector2(p.x + nx * wid, -(p.z + nz * wid)));
    ptsR.push(new THREE.Vector2(p.x - nx * wid, -(p.z - nz * wid)));
  }
  const carpetShape = new THREE.Shape([...ptsL, ...ptsR.reverse()]);
  const carpetTex = tex(paintNoise(256, 256, "#6cc83a", 70), { repeat: [3, 3] });
  const carpet = add(new THREE.Mesh(new THREE.ExtrudeGeometry(carpetShape, { depth: 0.025, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.02, bevelSegments: 2 }), new THREE.MeshStandardMaterial({ map: carpetTex, color: "#ffffff", roughness: 1 })), { cast: false });
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.y = 0.004;
  [0.16, 0.42, 0.68].forEach(t => {
    const p = path.getPointAt(t);
    const st = add(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.27, 0.02, 40), M.brushed), { cast: false });
    st.position.set(p.x, 0.04, p.z);
    st.scale.set(1, 1, 0.75);
  });

  /* ---------- Escritorio de cristal en forma de riñón ---------- */
  const deskPos = new THREE.Vector3(-1.1, 0.74, -2.55);
  const kidney = new THREE.Shape();
  kidney.moveTo(-1.1, -0.2);
  kidney.bezierCurveTo(-1.2, 0.35, -0.5, 0.5, 0, 0.42);
  kidney.bezierCurveTo(0.6, 0.34, 1.25, 0.5, 1.15, 0.0);
  kidney.bezierCurveTo(1.1, -0.45, 0.6, -0.55, 0.25, -0.4);
  kidney.bezierCurveTo(0.0, -0.3, -0.2, -0.3, -0.45, -0.45);
  kidney.bezierCurveTo(-0.85, -0.6, -1.05, -0.5, -1.1, -0.2);
  const deskTop = add(new THREE.Mesh(new THREE.ExtrudeGeometry(kidney, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 4, curveSegments: 32 }), M.glass), { cast: false });
  deskTop.rotation.x = -Math.PI / 2;
  deskTop.position.copy(deskPos);
  for (const [x, z] of [[-0.85, 0.2], [0.9, 0.1], [0.1, -0.15]]) {
    const leg = add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, deskPos.y, 24), M.chrome));
    leg.position.set(deskPos.x + x, deskPos.y / 2, deskPos.z - z);
  }
  // Cajonera cromada
  const drawers = add(new THREE.Mesh(new RoundedBoxGeometry(0.45, 0.62, 0.5, 4, 0.05), M.brushed));
  drawers.position.set(deskPos.x - 0.6, 0.32, deskPos.z - 0.05);
  for (let i = 0; i < 3; i++) {
    const h = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.14, 4, 8), M.chrome));
    h.rotation.z = Math.PI / 2;
    h.position.set(deskPos.x - 0.6, 0.15 + i * 0.19, deskPos.z + 0.21);
  }
  // Luz lima bajo el escritorio
  const underGlow = new THREE.PointLight("#a8ff3a", 0.6, 1.6, 2);
  underGlow.position.set(deskPos.x + 0.3, 0.12, deskPos.z);
  scene.add(underGlow);

  // Monitor translúcido
  const mon = new THREE.Group();
  const shell = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.46, 0.42, 6, 0.09), new THREE.MeshPhysicalMaterial({ color: "#57c8ff", roughness: 0.12, transmission: 0.75, thickness: 0.3, ior: 1.45, attenuationColor: new THREE.Color("#1fa0e8"), attenuationDistance: 0.4, clearcoat: 1 }));
  shell.castShadow = hi;
  mon.add(shell);
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.4, 0.02, 4, 0.03), M.whiteGloss);
  bezel.position.z = 0.205;
  mon.add(bezel);
  const monScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.32), new THREE.MeshStandardMaterial({ color: "#000", emissive: "#ffffff", emissiveMap: tex(paintMonitor()), emissiveIntensity: 1.1, roughness: 0.15 }));
  monScreen.position.z = 0.217;
  mon.add(monScreen);
  const monStand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, 0.08, 24), M.whiteGloss);
  monStand.position.y = -0.27;
  mon.add(monStand);
  mon.position.set(deskPos.x - 0.25, deskPos.y + 0.36, deskPos.z - 0.12);
  mon.rotation.y = 0.32;
  scene.add(mon);
  const kb = add(new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.02, 0.14, 3, 0.008), M.whiteGloss));
  kb.position.set(deskPos.x - 0.05, deskPos.y + 0.06, deskPos.z + 0.22);
  kb.rotation.y = 0.3;
  const mouse = add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 24, 16), new THREE.MeshPhysicalMaterial({ color: "#57c8ff", transmission: 0.6, roughness: 0.1, thickness: 0.05 })));
  mouse.scale.set(1, 0.45, 1.4);
  mouse.position.set(deskPos.x + 0.3, deskPos.y + 0.065, deskPos.z + 0.1);
  // Altavoces esféricos
  for (const dx of [-0.62, 0.15]) {
    const sp = add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 32, 24), M.whiteGloss));
    sp.position.set(deskPos.x + dx, deskPos.y + 0.13, deskPos.z - 0.18);
    const cone = new THREE.Mesh(new THREE.CircleGeometry(0.045, 24), new THREE.MeshPhysicalMaterial({ color: "#2f8ff0", roughness: 0.2, clearcoat: 1 }));
    cone.position.set(0, 0, 0.069);
    sp.add(cone);
    sp.rotation.y = 0.35;
  }

  /* ---------- El smartphone ---------- */
  const phonePos = new THREE.Vector3(deskPos.x + 0.62, deskPos.y + 0.06, deskPos.z + 0.3);
  const phone = new THREE.Group();
  const phoneBody = new THREE.Mesh(new RoundedBoxGeometry(0.082, 0.011, 0.17, 6, 0.0055), new THREE.MeshPhysicalMaterial({ color: "#7fe6ff", roughness: 0.08, transmission: 0.55, thickness: 0.02, ior: 1.5, clearcoat: 1, attenuationColor: new THREE.Color("#18b4ee"), attenuationDistance: 0.05 }));
  phoneBody.castShadow = hi;
  phone.add(phoneBody);
  const rim = new THREE.Mesh(new RoundedBoxGeometry(0.084, 0.006, 0.172, 6, 0.003), M.chrome);
  phone.add(rim);
  const phoneCanvas = mk(300, 620);
  paintPhoneScreen(phoneCanvas);
  const phoneTex = tex(phoneCanvas);
  const screenMat = new THREE.MeshStandardMaterial({ color: "#000", emissive: "#ffffff", emissiveMap: phoneTex, emissiveIntensity: 1.25, roughness: 0.05 });
  const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.074, 0.158), screenMat);
  phoneScreen.rotation.x = -Math.PI / 2;
  phoneScreen.position.y = 0.0058;
  phone.add(phoneScreen);
  // Halo de notificación sobre el cristal
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.115, 0.16, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 3.2, 3.6), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -0.004;
  phone.add(halo);
  const phoneHit = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.32), new THREE.MeshBasicMaterial({ visible: false }));
  phone.add(phoneHit);
  phone.position.copy(phonePos);
  phone.rotation.y = -0.35;
  scene.add(phone);
  interactive.push({ mesh: phoneHit, kind: "phone", label: "Tu teléfono · tócalo para jugar" });

  // Burbuja de notificación flotando sobre el teléfono
  const tagC = mk(256, 256);
  {
    const g = tagC.getContext("2d"), m = 128;
    const body = g.createRadialGradient(m - 30, m - 34, 8, m, m, 104);
    body.addColorStop(0, "rgba(255,255,255,0.95)");
    body.addColorStop(0.45, "rgba(120,225,255,0.75)");
    body.addColorStop(1, "rgba(20,130,220,0.85)");
    g.fillStyle = body;
    g.beginPath(); g.arc(m, m, 100, 0, TAU); g.fill();
    g.lineWidth = 6; g.strokeStyle = "rgba(255,255,255,0.95)"; g.stroke();
    g.fillStyle = "#ffffff";
    roundRect(g, m - 30, m - 52, 60, 104, 14); g.fill();
    g.fillStyle = "#1f86ea";
    roundRect(g, m - 22, m - 40, 44, 74, 6); g.fill();
    g.fillStyle = "#b6ff3a";
    g.beginPath(); g.moveTo(m - 8, m - 18); g.lineTo(m + 12, m - 3); g.lineTo(m - 8, m + 12); g.closePath(); g.fill();
    windowHighlight(g, m - 46, m - 52, 52, -0.5, 0.8);
    g.fillStyle = "#b6ff3a";
    g.beginPath(); g.arc(m + 70, m - 70, 26, 0, TAU); g.fill();
    g.lineWidth = 5; g.strokeStyle = "#fff"; g.stroke();
    g.fillStyle = "#1a5a00"; g.font = "800 32px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("3", m + 70, m - 68);
  }
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(tagC), transparent: true, toneMapped: false, depthWrite: false }));
  tag.scale.set(0.17, 0.17, 1);
  tag.position.copy(phonePos).add(new THREE.Vector3(0, 0.2, 0));
  scene.add(tag);
  interactive.push({ mesh: tag, kind: "phone", label: "Tu teléfono · tócalo para jugar" });
  const phoneState = { hover: 0, lift: 0 };
  setInterval(() => { paintPhoneScreen(phoneCanvas); phoneTex.needsUpdate = true; }, 30000);

  /* ---------- Silla huevo ---------- */
  const chair = new THREE.Group();
  const shellGeo = new THREE.SphereGeometry(0.5, 48, 32, Math.PI * 0.25, Math.PI * 1.5, 0.15, Math.PI * 0.62);
  const chairOut = new THREE.Mesh(shellGeo, new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.15, clearcoat: 1, side: THREE.FrontSide }));
  const chairIn = new THREE.Mesh(shellGeo, new THREE.MeshPhysicalMaterial({ color: "#9be84a", roughness: 0.5, sheen: 1, sheenColor: new THREE.Color("#e6ffc0"), side: THREE.BackSide }));
  chairIn.scale.setScalar(0.97);
  chairOut.castShadow = hi;
  chair.add(chairOut, chairIn);
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.08, 40), chairIn.material);
  seat.position.y = -0.18;
  chair.add(seat);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 16), M.chrome);
  stem.position.y = -0.42;
  chair.add(stem);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.03, 40), M.chrome);
  base.position.y = -0.62;
  base.receiveShadow = hi;
  chair.add(base);
  chair.position.set(deskPos.x - 0.35, 0.64, deskPos.z + 0.95);
  chair.rotation.y = Math.PI * 1.05;
  scene.add(chair);

  /* ---------- Lámparas de globo colgantes ---------- */
  const lamps = [];
  [[deskPos.x - 0.62, 2.15, deskPos.z + 0.38], [deskPos.x, 1.95, deskPos.z + 0.12], [deskPos.x + 0.6, 2.25, deskPos.z + 0.5]].forEach(([x, y, z], i) => {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, RH - y, 6), M.chrome);
    cord.position.set(x, (RH + y) / 2, z);
    scene.add(cord);
    const mat = new THREE.MeshPhysicalMaterial({ color: "#ffffff", emissive: "#dff6ff", emissiveIntensity: 1.1, roughness: 0.35, transmission: 0.25, thickness: 0.2, clearcoat: 1 });
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.15, 40, 30), mat);
    globe.position.set(x, y, z);
    scene.add(globe);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.05, 20), M.chrome);
    cap.position.set(x, y + 0.16, z);
    scene.add(cap);
    const light = new THREE.PointLight("#e9f8ff", 1.1, 4.5, 2);
    light.position.set(x, y - 0.05, z);
    scene.add(light);
    const lamp = { globe, light, mat, on: true, k: 1 };
    lamps.push(lamp);
    interactive.push({ mesh: globe, kind: "lamp", label: "Lámpara · toca para encender o apagar", ref: lamp });
  });

  /* ---------- Pecera ---------- */
  const tankPos = new THREE.Vector3(X1 - 0.42, 0, -1.75);
  const cab = add(new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.72, 1.9, 6, 0.06), M.brushed));
  cab.position.set(tankPos.x, 0.36, tankPos.z);
  const cabStrip = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.02, 1.7), M.neonCyan);
  cabStrip.position.set(tankPos.x - 0.315, 0.66, tankPos.z);
  scene.add(cabStrip);
  const tankH = 0.78, tankY = 0.72 + tankH / 2;
  const water = new THREE.Mesh(new THREE.BoxGeometry(0.54, tankH - 0.1, 1.8), new THREE.MeshPhysicalMaterial({
    color: "#9feeff", roughness: 0.12, transmission: 1, thickness: 0.5, ior: 1.33,
    attenuationColor: new THREE.Color("#22b4e8"), attenuationDistance: 0.9, emissive: "#0a78b0", emissiveIntensity: 0.35,
  }));
  water.position.set(tankPos.x, tankY - 0.04, tankPos.z);
  scene.add(water);
  const tankGlass = new THREE.Mesh(new RoundedBoxGeometry(0.6, tankH, 1.86, 4, 0.025), M.glassThin);
  tankGlass.position.set(tankPos.x, tankY, tankPos.z);
  scene.add(tankGlass);
  const lid = add(new THREE.Mesh(new RoundedBoxGeometry(0.64, 0.05, 1.9, 4, 0.02), M.brushed));
  lid.position.set(tankPos.x, 0.72 + tankH + 0.02, tankPos.z);
  const sand = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 1.76), new THREE.MeshStandardMaterial({ color: "#e8f4ff", roughness: 0.9 }));
  sand.position.set(tankPos.x, 0.76, tankPos.z);
  scene.add(sand);
  const tankLight = new THREE.PointLight("#5fe8ff", 2.2, 3, 2);
  tankLight.position.set(tankPos.x - 0.2, tankY + 0.2, tankPos.z);
  scene.add(tankLight);
  interactive.push({ mesh: water, kind: "tank", label: "Pecera · toca el cristal" });

  // Plantas acuáticas que se mecen
  const weedMat = new THREE.MeshStandardMaterial({ color: "#5fe04a", emissive: "#2fa020", emissiveIntensity: 0.5, roughness: 0.5, side: THREE.DoubleSide });
  const weeds = [];
  for (let i = 0; i < 12; i++) {
    const h = rand(0.25, 0.55);
    const geo = new THREE.PlaneGeometry(0.035, h, 1, 8);
    geo.translate(0, h / 2, 0);
    const wd = new THREE.Mesh(geo, weedMat);
    wd.position.set(tankPos.x + rand(-0.18, 0.18), 0.79, tankPos.z + rand(-0.8, 0.8));
    wd.rotation.y = rand(0, TAU);
    wd.userData.ph = rand(0, TAU);
    scene.add(wd);
    weeds.push(wd);
  }
  // Peces
  const fishCols = ["#ff8a3a", "#a8ff3a", "#3ff0ff", "#ffd23a", "#ff6ad0"];
  const fishes = [];
  for (let i = 0; i < 7; i++) {
    const f = new THREE.Group();
    const mat = new THREE.MeshPhysicalMaterial({ color: fishCols[i % fishCols.length], roughness: 0.25, clearcoat: 1, emissive: fishCols[i % fishCols.length], emissiveIntensity: 0.25 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), mat);
    body.scale.set(1.6, 0.9, 0.55);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.04, 3), mat);
    tail.rotation.z = Math.PI / 2;
    tail.position.x = -0.06;
    f.add(body, tail);
    f.userData = { ph: rand(0, TAU), sp: rand(0.25, 0.5), y: rand(0.88, 1.35), z: rand(-0.7, 0.7), x: rand(-0.15, 0.15), tail };
    scene.add(f);
    fishes.push(f);
  }
  // Burbujas del aireador
  const bubGeo = new THREE.SphereGeometry(0.008, 8, 6);
  const bubMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.8, 2), transparent: true, opacity: 0.7, toneMapped: false });
  const tankBubbles = new THREE.InstancedMesh(bubGeo, bubMat, 40);
  const bubData = Array.from({ length: 40 }, () => ({ y: rand(0.8, 1.42), x: rand(-0.05, 0.05), z: rand(-0.05, 0.05), sp: rand(0.12, 0.3), ph: rand(0, TAU), col: Math.random() < 0.5 ? -0.6 : 0.55 }));
  scene.add(tankBubbles);
  const dummy = new THREE.Object3D();
  let tankBurst = 0;

  /* ---------- Banco lima y planta ---------- */
  const benchBase = add(new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.32, 2.0, 5, 0.08), M.brushed));
  benchBase.position.set(X1 - 0.35, 0.16, 1.6);
  for (let i = 0; i < 3; i++) {
    const cu = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.36, 8, 24), M.lime));
    cu.rotation.x = Math.PI / 2;
    cu.position.set(X1 - 0.36, 0.48, 1.0 + i * 0.62);
    cu.scale.set(1, 1, 0.7);
  }
  const back3 = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 1.75, 8, 24), M.lime));
  back3.rotation.x = Math.PI / 2;
  back3.position.set(X1 - 0.12, 0.85, 1.6);

  function plant(x, z, s = 1) {
    const pot = add(new THREE.Mesh(new THREE.CylinderGeometry(0.24 * s, 0.2 * s, 0.5 * s, 32), M.chrome));
    pot.position.set(x, 0.25 * s, z);
    const soil = new THREE.Mesh(new THREE.CircleGeometry(0.22 * s, 24), new THREE.MeshStandardMaterial({ color: "#3a2a1a" }));
    soil.rotation.x = -Math.PI / 2;
    soil.position.set(x, 0.49 * s, z);
    scene.add(soil);
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0);
    leafShape.bezierCurveTo(0.09, 0.12, 0.08, 0.32, 0, 0.42);
    leafShape.bezierCurveTo(-0.08, 0.32, -0.09, 0.12, 0, 0);
    const leafGeo = new THREE.ShapeGeometry(leafShape, 8);
    const pos = leafGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setZ(i, -y * y * 0.9 + Math.abs(pos.getX(i)) * 0.3); }
    leafGeo.computeVertexNormals();
    const n = 34;
    const leaves = new THREE.InstancedMesh(leafGeo, M.leaf, n);
    leaves.castShadow = hi;
    for (let i = 0; i < n; i++) {
      dummy.position.set(x + rand(-0.05, 0.05) * s, 0.48 * s + rand(0, 0.5) * s, z + rand(-0.05, 0.05) * s);
      dummy.rotation.set(rand(-1.0, -0.2), rand(0, TAU), 0, "YXZ");
      dummy.scale.setScalar(rand(0.8, 1.4) * s);
      dummy.updateMatrix();
      leaves.setMatrixAt(i, dummy.matrix);
      leaves.setColorAt(i, new THREE.Color().setHSL(rand(0.27, 0.33), rand(0.55, 0.75), rand(0.32, 0.5)));
    }
    scene.add(leaves);
  }
  plant(X0 + 0.5, Z0 + 0.5, 1.3);
  plant(X1 - 0.45, 2.75, 1.2);
  plant(deskPos.x + 1.0, Z0 + 0.35, 1.0);

  /* ---------- Paneles de cristal con iconos (pared izquierda) ---------- */
  const panelGeo = new RoundedBoxGeometry(0.62, 0.52, 0.04, 4, 0.05);
  const icons = [["home", -1.6, 2.1], ["back", -1.6, 1.4], ["refresh", -0.8, 2.1], ["globe", -0.8, 1.4]];
  icons.forEach(([type, z, y]) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(panelGeo, new THREE.MeshPhysicalMaterial({ color: "#bfefff", roughness: 0.05, transmission: 0.4, thickness: 0.04, clearcoat: 1 }));
    g.add(body);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.46), new THREE.MeshStandardMaterial({ map: tex(paintIcon(type)), transparent: true, roughness: 0.15, emissive: "#ffffff", emissiveMap: tex(paintIcon(type)), emissiveIntensity: 0.25 }));
    face.position.z = 0.022;
    g.add(face);
    for (const [sx, sy] of [[-0.26, 0.21], [0.26, 0.21], [-0.26, -0.21], [0.26, -0.21]]) {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.08, 16), M.chrome);
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(sx, sy, -0.01);
      g.add(bolt);
    }
    g.position.set(X0 + 0.07, y, z);
    g.rotation.y = Math.PI / 2;
    scene.add(g);
  });
  // Panel de palabras
  const words = new THREE.Mesh(new RoundedBoxGeometry(0.5, 1.2, 0.05, 4, 0.06), [
    M.brushed, M.brushed, M.brushed, M.brushed,
    new THREE.MeshStandardMaterial({ map: tex(paintWordPanel()), roughness: 0.2, emissive: "#ffffff", emissiveMap: tex(paintWordPanel()), emissiveIntensity: 0.35 }),
    M.brushed,
  ]);
  words.position.set(X0 + 0.06, 1.65, 0.4);
  words.rotation.y = Math.PI / 2;
  scene.add(words);

  // Barra de navegación cromada sobre la ventana
  const navBar = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 1.5, 8, 24), M.chrome), { cast: false });
  navBar.rotation.z = Math.PI / 2;
  navBar.position.set(WX, WY + WH / 2 + 0.3, Z0 + 0.12);
  navBar.scale.set(1, 1, 0.5);
  ["back", "refresh", "home", "globe"].forEach((type, i) => {
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.095, 40), new THREE.MeshStandardMaterial({ map: tex(paintIcon(type, 128)), roughness: 0.15, emissive: "#ffffff", emissiveMap: tex(paintIcon(type, 128)), emissiveIntensity: 0.3 }));
    b.position.set(WX - 0.6 + i * 0.4, WY + WH / 2 + 0.3, Z0 + 0.19);
    scene.add(b);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 12, 40), M.chrome);
    ring.position.copy(b.position);
    scene.add(ring);
  });

  // Puntos LED verdes en el zócalo
  for (let i = 0; i < 12; i++) {
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.01), M.neonLime);
    led.position.set(X0 + 0.45 + i * 0.64, 0.05, Z0 + 0.04);
    scene.add(led);
  }

  /* ---------- Pompas de jabón flotando en el aire ---------- */
  const soapMat = new THREE.MeshPhysicalMaterial({
    color: "#ffffff", roughness: 0, metalness: 0, transmission: 1, thickness: 0.002, ior: 1.05,
    iridescence: 1, iridescenceIOR: 1.33, iridescenceThicknessRange: [120, 900],
    transparent: true, opacity: 1, specularIntensity: 0.8, envMapIntensity: 0.8,
  });
  const soapGeo = new THREE.SphereGeometry(1, 40, 28);
  const soaps = [];
  for (let i = 0; i < (hi ? 18 : 9); i++) {
    const s = new THREE.Mesh(soapGeo, soapMat);
    const r = rand(0.03, 0.08);
    s.scale.setScalar(r);
    s.userData = { base: new THREE.Vector3(rand(-3.2, 3.2), rand(1.1, 2.6), rand(-3.0, 0.2)), ph: rand(0, TAU), sp: rand(0.15, 0.35), r };
    scene.add(s);
    soaps.push(s);
  }

  /* ---------- Iluminación ---------- */
  scene.add(new THREE.HemisphereLight("#cfeaff", "#5fae3f", 0.42));
  const sun = new THREE.DirectionalLight("#fff4e0", 1.8);
  sun.position.set(3.2, 4.6, -3.6);
  sun.target.position.set(-0.8, 0, -0.5);
  scene.add(sun, sun.target);
  if (hi) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -6; sun.shadow.camera.right = 6;
    sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6;
    sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 14;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    sun.shadow.radius = 4;
  }
  const windowFill = new THREE.PointLight("#dff3ff", 1.5, 6, 1.6);
  windowFill.position.set(WX, WY, Z0 + 0.8);
  scene.add(windowFill);
  const roomFill = new THREE.PointLight("#bfe6ff", 0.9, 8, 1.4);
  roomFill.position.set(0.5, 2.6, 1.5);
  scene.add(roomFill);

  // Mapa de entorno a partir del propio departamento: los cromados reflejan el techo de cielo
  const pmrem = new THREE.PMREMGenerator(renderer);
  if (reflector) reflector.visible = false;
  soaps.forEach(s => (s.visible = false));
  const envRT = pmrem.fromScene(scene, 0.035, 0.05, 30);
  scene.environment = envRT.texture;
  if (reflector) reflector.visible = true;
  soaps.forEach(s => (s.visible = true));
  pmrem.dispose();

  /* ---------- Post-procesado: bloom para neones y luces ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), hi ? 0.5 : 0.4, 0.5, 0.96);
  if (!hi) bloom.resolution.set(container.clientWidth / 2, container.clientHeight / 2);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ================= Cámara ================= */
  const VIEW = { pos: new THREE.Vector3(0.55, 1.45, 0.15), target: new THREE.Vector3(-0.95, 0.84, -2.35) };
  const INTRO = { pos: new THREE.Vector3(1.9, 1.8, 3.1), target: new THREE.Vector3(-0.2, 1.2, -2.2) };
  const camState = {
    mode: "intro", pos: INTRO.pos.clone(), target: INTRO.target.clone(),
    yaw: 0, pitch: 0, tYaw: 0, tPitch: 0, px: 0, py: 0, tween: null,
  };
  camera.position.copy(camState.pos);
  camera.lookAt(camState.target);

  function tweenCam(toPos, toTarget, dur, done) {
    camState.tween = { fromPos: camState.pos.clone(), fromTarget: camState.target.clone(), toPos, toTarget, t: 0, dur: reduceMotion ? 0.01 : dur, done };
  }

  function focusPhonePose() {
    const p = phone.position.clone();
    const out = new THREE.Vector3(0.05, 0.36, 0.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), phone.rotation.y);
    return { pos: p.clone().add(out), target: p.clone().add(new THREE.Vector3(0, 0.02, 0)) };
  }

  /* ================= Interacción ================= */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered = null, pointer = null, dragging = false, enabled = true;
  const el = renderer.domElement;

  function pick(e) {
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(interactive.map(i => i.mesh), false);
    return hits.length ? interactive.find(i => i.mesh === hits[0].object) : null;
  }

  el.addEventListener("pointerdown", e => {
    if (!enabled || camState.mode !== "room") return;
    pointer = { x: e.clientX, y: e.clientY, yaw: camState.tYaw, pitch: camState.tPitch };
    dragging = false;
    el.setPointerCapture?.(e.pointerId);
  });
  el.addEventListener("pointermove", e => {
    const r = el.getBoundingClientRect();
    camState.px = ((e.clientX - r.left) / r.width) * 2 - 1;
    camState.py = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (!enabled || camState.mode !== "room") return;
    if (pointer) {
      const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) dragging = true;
      if (dragging) {
        camState.tYaw = clamp(pointer.yaw + dx * 0.004, -0.75, 0.75);
        camState.tPitch = clamp(pointer.pitch + dy * 0.003, -0.32, 0.3);
      }
      return;
    }
    const h = pick(e);
    if (h !== hovered) {
      hovered = h;
      el.style.cursor = h ? "pointer" : "grab";
      hooks.onHover?.(h ? h.label : null);
    }
  });
  el.addEventListener("pointerup", e => {
    if (!enabled || camState.mode !== "room") { pointer = null; return; }
    const wasDrag = dragging;
    pointer = null;
    dragging = false;
    if (wasDrag) return;
    const h = pick(e);
    if (!h) return;
    if (h.kind === "phone") hooks.onPhone?.();
    else if (h.kind === "lamp") { h.ref.on = !h.ref.on; hooks.onLamp?.(h.ref.on); }
    else if (h.kind === "tank") { tankBurst = 1.2; fishes.forEach(f => (f.userData.scare = 1)); hooks.onTank?.(); }
  });
  el.addEventListener("pointerleave", () => { if (hovered) { hovered = null; hooks.onHover?.(null); } });
  el.style.cursor = "grab";

  /* ================= Bucle ================= */
  const clock = new THREE.Clock();
  let t = 0, frame = 0, lowPower = false;

  function update(dt) {
    t += dt;
    // Cámara
    if (camState.tween) {
      const tw = camState.tween;
      tw.t += dt / tw.dur;
      const k = easeInOut(Math.min(1, tw.t));
      camState.pos.lerpVectors(tw.fromPos, tw.toPos, k);
      camState.target.lerpVectors(tw.fromTarget, tw.toTarget, k);
      if (tw.t >= 1) { camState.tween = null; tw.done?.(); }
    }
    const roomMode = camState.mode === "room";
    camState.yaw += (camState.tYaw - camState.yaw) * Math.min(1, dt * 5);
    camState.pitch += (camState.tPitch - camState.pitch) * Math.min(1, dt * 5);
    const par = roomMode && !reduceMotion ? 1 : 0;
    const look = camState.target.clone().sub(camState.pos);
    look.applyAxisAngle(new THREE.Vector3(0, 1, 0), -(camState.yaw + camState.px * 0.06 * par));
    const side = new THREE.Vector3().crossVectors(look, new THREE.Vector3(0, 1, 0)).normalize();
    look.applyAxisAngle(side, -(camState.pitch + camState.py * 0.04 * par));
    const breathe = roomMode && !reduceMotion ? Math.sin(t * 0.8) * 0.006 : 0;
    camera.position.copy(camState.pos).add(new THREE.Vector3(0, breathe, 0));
    camera.lookAt(camera.position.clone().add(look));

    // Teléfono: halo que respira, brillo al pasar el ratón
    phoneState.hover += ((hovered && hovered.kind === "phone" ? 1 : 0) - phoneState.hover) * Math.min(1, dt * 8);
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
    halo.material.opacity = camState.mode === "room" ? 0.25 + pulse * 0.35 + phoneState.hover * 0.4 : 0;
    halo.scale.setScalar(1 + pulse * 0.08 + phoneState.hover * 0.1);
    screenMat.emissiveIntensity = 1.1 + phoneState.hover * 0.6;
    phone.position.y = phonePos.y + phoneState.lift * 0.03 + phoneState.hover * 0.006;
    const tagOn = camState.mode === "room" ? 1 : 0;
    tag.material.opacity += (tagOn - tag.material.opacity) * Math.min(1, dt * 6);
    tag.position.y = phonePos.y + 0.22 + Math.sin(t * 2.2) * 0.018 + phoneState.hover * 0.02;
    tag.scale.setScalar(0.17 * (1 + phoneState.hover * 0.15));

    // Lámparas
    for (const l of lamps) {
      l.k += ((l.on ? 1 : 0) - l.k) * Math.min(1, dt * 10);
      l.light.intensity = 1.1 * l.k;
      l.mat.emissiveIntensity = 0.05 + 1.1 * l.k * (hovered && hovered.ref === l ? 1.25 : 1);
    }

    // Pecera
    tankBurst = Math.max(0, tankBurst - dt);
    for (const w of weeds) {
      w.rotation.z = Math.sin(t * 1.2 + w.userData.ph) * 0.12;
      w.rotation.x = Math.cos(t * 0.9 + w.userData.ph) * 0.08;
    }
    for (const f of fishes) {
      const u = f.userData;
      u.scare = Math.max(0, (u.scare || 0) - dt * 0.8);
      const sp = u.sp * (1 + u.scare * 3);
      u.ph += dt * sp;
      const z = Math.sin(u.ph) * 0.75;
      const dz = Math.cos(u.ph);
      f.position.set(tankPos.x + u.x + Math.sin(u.ph * 2.3) * 0.05, u.y + Math.sin(u.ph * 1.7) * 0.05, tankPos.z + z * (0.9 + u.z * 0.1));
      f.rotation.y = dz > 0 ? -Math.PI / 2 : Math.PI / 2;
      u.tail.rotation.y = Math.sin(t * 12 * (1 + u.scare)) * 0.5;
    }
    bubData.forEach((b, i) => {
      b.y += b.sp * dt * (1 + tankBurst * 3);
      if (b.y > 1.42) b.y = 0.8;
      dummy.position.set(tankPos.x + b.x + Math.sin(t * 3 + b.ph) * 0.01, b.y, tankPos.z + b.col + b.z);
      dummy.scale.setScalar(1 + Math.sin(b.ph) * 0.4);
      dummy.updateMatrix();
      tankBubbles.setMatrixAt(i, dummy.matrix);
    });
    tankBubbles.instanceMatrix.needsUpdate = true;

    // Pompas de jabón
    for (const s of soaps) {
      const u = s.userData;
      u.ph += dt * u.sp;
      s.position.set(u.base.x + Math.sin(u.ph) * 0.4, u.base.y + Math.sin(u.ph * 1.3) * 0.25, u.base.z + Math.cos(u.ph * 0.8) * 0.4);
      s.rotation.y += dt * 0.3;
    }
  }

  function render() {
    const dt = Math.min(0.05, clock.getDelta());
    update(dt);
    frame++;
    // Con el teléfono abierto, el departamento se dibuja a menor frecuencia para liberar la GPU al juego
    if (lowPower && frame % 3 !== 0) return;
    composer.render(dt);
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    if (reflector) reflector.getRenderTarget().setSize(Math.floor(w * 0.6), Math.floor(h * 0.6));
  }
  window.addEventListener("resize", resize);

  // Compilar sombreadores antes de mostrar nada (evita tirones al entrar)
  renderer.compile(scene, camera);
  composer.render(0.016);

  return {
    render,
    intro(done) {
      camState.mode = "intro";
      tweenCam(VIEW.pos.clone(), VIEW.target.clone(), 3.4, () => { camState.mode = "room"; done?.(); });
    },
    focusPhone(done) {
      camState.mode = "focus";
      hovered = null;
      hooks.onHover?.(null);
      const f = focusPhonePose();
      camState.tYaw = camState.tPitch = 0;
      phoneState.lift = 1;
      tweenCam(f.pos, f.target, 1.1, () => { lowPower = true; done?.(); });
    },
    unfocus(done) {
      lowPower = false;
      phoneState.lift = 0;
      tweenCam(VIEW.pos.clone(), VIEW.target.clone(), 1.1, () => { camState.mode = "room"; done?.(); });
    },
    setEnabled(v) { enabled = v; },
    get mode() { return camState.mode; },
  };
}
