/* Audio ASMR sintetizado en tiempo real (Web Audio API).
   Todas las funciones de efecto reciben la posición horizontal normalizada (0 = izquierda, 1 = derecha). */
import { rand, clamp, PENTA, prefs } from "./util.js";

export const Sound = {
  ctx: null, master: null, send: null, enabled: prefs.sound, white: null, brown: null, lastPlip: 0, roomTone: null,

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
        const k = 0.1 + 0.85 * tt;
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
  pan(nx) { return clamp(nx * 2 - 1, -1, 1) * 0.75; },

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

  /* ---------- Efectos de juego ---------- */

  // Pompa de jabón: chasquido agudo + resonancia ascendente + soplo de aire
  pop(nx = 0.5, size = 1) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime, d = this.out(this.pan(nx), 0.22);
    this.noise(t, 0.014, d, { type: "highpass", freq: rand(2500, 4000), q: 0.7, peak: 0.35 });
    const f0 = rand(850, 1250) / size;
    this.tone(t + 0.002, f0, d, { peak: 0.22, decay: 0.07, to: f0 * rand(1.3, 1.6), glide: 0.05 });
    this.noise(t, 0.09, d, { type: "lowpass", freq: 900, q: 0.5, peak: 0.07, attack: 0.004 });
  },

  // Plástico de burbujas: chasquido seco de aire comprimido
  wrapPop(nx = 0.5, golden = false) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime, d = this.out(this.pan(nx), 0.18);
    this.noise(t, 0.022, d, { type: "bandpass", freq: rand(1400, 2600), q: 0.9, peak: rand(0.45, 0.6) });
    this.noise(t, 0.006, d, { type: "highpass", freq: 5000, q: 0.7, peak: 0.25 });
    this.tone(t, rand(150, 210), d, { peak: 0.22, attack: 0.001, decay: 0.05, to: 80, glide: 0.04 });
    this.noise(t + 0.01, 0.12, d, { type: "lowpass", freq: 1100, q: 0.4, peak: 0.05, attack: 0.01 });
    if (golden) this.note(PENTA[Math.floor(rand(4, PENTA.length))], t + 0.02, 0.06, this.pan(nx));
  },

  // Rotura de cristal: modos inarmónicos + crujido + esquirlas tintineando
  glass(nx = 0.5, intensity = 1) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime, d = this.out(this.pan(nx), 0.6);
    const base = rand(1500, 2300);
    [1, 2.32, 4.25, 6.63, 9.38].forEach((r, i) => this.tone(t, base * r * (1 + rand(-0.008, 0.008)), d, { peak: (0.09 * intensity) / (1 + i * 0.6), attack: 0.001, decay: 1.4 / (1 + i * 0.9) }));
    this.noise(t, 0.07, d, { type: "highpass", freq: 4500, q: 0.7, peak: 0.22 * intensity });
    for (let k = 0; k < 6; k++) this.tone(t + rand(0.06, 0.7), rand(3200, 6500), d, { peak: rand(0.015, 0.04), attack: 0.001, decay: rand(0.08, 0.2) });
  },

  crack(nx = 0.5) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime, d = this.out(this.pan(nx), 0.4);
    const base = rand(2000, 2600);
    [1, 2.7, 5.1].forEach((r, i) => this.tone(t, base * r, d, { peak: 0.05 / (1 + i), attack: 0.001, decay: 0.5 / (1 + i) }));
    this.noise(t, 0.02, d, { type: "highpass", freq: 3000, peak: 0.18 });
  },

  squirt(nx = 0.5) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime, d = this.out(this.pan(nx), 0.12);
    const f = this.noise(t, 0.1, d, { type: "bandpass", freq: 2400, q: 2.5, peak: 0.08, attack: 0.006 });
    f.frequency.exponentialRampToValueAtTime(900, t + 0.1);
    this.tone(t + 0.01, rand(330, 380), d, { peak: 0.06, decay: 0.08, to: 720, glide: 0.06 });
  },

  // Gota cayendo al agua: la burbuja atrapada resuena y sube de tono
  plip(nx = 0.5, vol = 1) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime;
    if (t - this.lastPlip < 0.05) return;
    this.lastPlip = t;
    const d = this.out(this.pan(nx), 0.35), f = rand(700, 1100);
    this.tone(t, f, d, { peak: 0.05 * vol, decay: 0.07, to: f * rand(1.8, 2.4), glide: 0.035 });
    this.noise(t, 0.03, d, { type: "bandpass", freq: 3000, q: 1, peak: 0.02 * vol });
  },

  hurt(nx = 0.5) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime, d = this.out(this.pan(nx), 0.5);
    this.tone(t, 280, d, { peak: 0.22, decay: 0.25, to: 850, glide: 0.08 });
    this.tone(t, 130, d, { peak: 0.3, decay: 0.45, to: 55, glide: 0.4 });
    this.noise(t, 0.35, d, { type: "bandpass", freq: 1300, q: 0.8, peak: 0.14, attack: 0.01 });
  },

  // Impulso del planeador: soplo corto ascendente
  lift(nx = 0.3) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime, d = this.out(this.pan(nx), 0.15);
    const f = this.noise(t, 0.16, d, { type: "bandpass", freq: 600, q: 1.4, peak: 0.07, attack: 0.02 });
    f.frequency.exponentialRampToValueAtTime(1800, t + 0.16);
  },

  ring(n = 1, nx = 0.5) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime;
    const idx = Math.min(n - 1, PENTA.length - 1);
    this.note(PENTA[idx], t, 0.08, this.pan(nx));
    this.note(PENTA[idx] * 1.5, t + 0.05, 0.035, this.pan(nx));
  },

  note(freq, t, peak = 0.1, pan = 0) {
    const d = this.out(pan, 0.7);
    this.tone(t, freq, d, { peak, decay: 1.3 });
    this.tone(t, freq * 2.01, d, { peak: peak * 0.3, decay: 0.5 });
    this.tone(t, freq * 3.98, d, { peak: peak * 0.12, decay: 0.18 });
  },

  combo(n, nx = 0.5) {
    if (!this.ok() || n < 2) return;
    this.note(PENTA[Math.min(n - 2, PENTA.length - 1)], this.ctx.currentTime + 0.03, 0.07, this.pan(nx));
  },

  arpeggio(up = true) {
    if (!this.ok()) return;
    const seq = up ? [0, 2, 4, 5, 7, 9] : [7, 5, 4, 2, 0];
    seq.forEach((k, i) => this.note(PENTA[k] * (up ? 1 : 0.5), this.ctx.currentTime + i * 0.1, 0.09, (i / seq.length - 0.5) * 0.8));
  },

  /* ---------- Interfaz ---------- */

  click() {
    if (!this.ok()) return;
    const t = this.ctx.currentTime, d = this.out(0, 0.05);
    this.noise(t, 0.006, d, { type: "bandpass", freq: 2600, q: 2, peak: 0.12 });
  },

  tick() {
    if (!this.ok()) return;
    const t = this.ctx.currentTime, d = this.out(0, 0.35);
    this.tone(t, rand(2900, 3100), d, { peak: 0.035, attack: 0.001, decay: 0.09 });
    this.tone(t, 6100, d, { peak: 0.012, attack: 0.001, decay: 0.04 });
  },

  confirm() {
    if (!this.ok()) return;
    const t = this.ctx.currentTime;
    this.note(PENTA[4], t, 0.06, -0.2);
    this.note(PENTA[7], t + 0.07, 0.05, 0.2);
  },

  whoosh(up = true, vol = 1) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime, d = this.out(0, 0.4);
    const f = this.noise(t, 0.4, d, { type: "bandpass", freq: up ? 500 : 2600, q: 1.2, peak: 0.07 * vol, attack: 0.12 });
    f.frequency.exponentialRampToValueAtTime(up ? 2800 : 500, t + 0.45);
  },

  // Teléfono: el cristal se ilumina al despertar
  wake() {
    if (!this.ok()) return;
    const t = this.ctx.currentTime;
    [0, 4, 7].forEach((k, i) => this.note(PENTA[k] * 2, t + i * 0.06, 0.04, (i - 1) * 0.3));
    this.whoosh(true, 0.6);
  },

  // Dejar el teléfono sobre la mesa de cristal
  setDown() {
    if (!this.ok()) return;
    const t = this.ctx.currentTime, d = this.out(-0.1, 0.25);
    this.noise(t, 0.01, d, { type: "bandpass", freq: 3500, q: 3, peak: 0.25 });
    this.tone(t, rand(2600, 2900), d, { peak: 0.04, attack: 0.001, decay: 0.35 });
    this.tone(t, 140, d, { peak: 0.1, attack: 0.001, decay: 0.05 });
  },

  // Pecera: burbujeo
  bubbles(n = 6, nx = 0.8) {
    if (!this.ok()) return;
    for (let i = 0; i < n; i++) {
      const t = this.ctx.currentTime + rand(0, 0.6), d = this.out(this.pan(nx), 0.4), f = rand(500, 1300);
      this.tone(t, f, d, { peak: 0.035, decay: 0.06, to: f * rand(1.5, 2.2), glide: 0.04 });
    }
  },

  // Interruptor de lámpara
  toggle(on) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime, d = this.out(0, 0.1);
    this.noise(t, 0.008, d, { type: "bandpass", freq: on ? 3000 : 2200, q: 3, peak: 0.25 });
    this.tone(t, on ? 1800 : 1200, d, { peak: 0.03, decay: 0.05 });
  },

  dtmf(k) {
    if (!this.ok()) return;
    const map = { 1: [697, 1209], 2: [697, 1336], 3: [697, 1477], 4: [770, 1209], 5: [770, 1336], 6: [770, 1477], 7: [852, 1209], 8: [852, 1336], 9: [852, 1477], 0: [941, 1336] };
    const pair = map[k];
    if (!pair) return;
    const t = this.ctx.currentTime, d = this.out(0, 0.15);
    pair.forEach(f => this.tone(t, f, d, { peak: 0.05, attack: 0.005, decay: 0.12 }));
  },

  /* ---------- Ambiente del departamento ---------- */
  startAmbient() {
    const c = this.ctx;
    // Aire acondicionado / viento muy suave
    const wind = c.createBufferSource();
    wind.buffer = this.brown;
    wind.loop = true;
    const wf = c.createBiquadFilter();
    wf.type = "lowpass";
    wf.frequency.value = 500;
    const wg = c.createGain();
    wg.gain.value = 0;
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 0.06;
    lg.gain.value = 250;
    lfo.connect(lg);
    lg.connect(wf.frequency);
    wind.connect(wf);
    wf.connect(wg);
    wg.connect(this.out(-0.2, 0.2));
    wind.start();
    lfo.start();
    wg.gain.setTargetAtTime(0.09, c.currentTime, 2);

    // Filtro de la pecera: agua corriendo
    const water = c.createBufferSource();
    water.buffer = this.white;
    water.loop = true;
    const bf = c.createBiquadFilter();
    bf.type = "bandpass";
    bf.frequency.value = 1100;
    bf.Q.value = 0.9;
    const wag = c.createGain();
    wag.gain.value = 0;
    const l3 = c.createOscillator(), l3g = c.createGain();
    l3.frequency.value = 0.22;
    l3g.gain.value = 0.006;
    l3.connect(l3g);
    l3g.connect(wag.gain);
    water.connect(bf);
    bf.connect(wag);
    wag.connect(this.out(0.6, 0.3));
    water.start();
    l3.start();
    wag.gain.setTargetAtTime(0.014, c.currentTime, 3);

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
    pg.gain.setTargetAtTime(0.2, c.currentTime, 3);

    // Campanillas de viento lejanas
    const chime = () => {
      if (this.ok() && document.visibilityState === "visible") {
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) this.note(PENTA[Math.floor(rand(3, PENTA.length))], this.ctx.currentTime + i * rand(0.15, 0.4), 0.02, rand(-0.8, 0.8));
      }
      setTimeout(chime, rand(6000, 12000));
    };
    setTimeout(chime, 5000);
  },
};
