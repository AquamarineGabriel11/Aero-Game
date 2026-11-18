"""Seen - full-length demo instrumental (v2, "10/10" arrangement).

88 BPM, C major. Section map:
  Intro 2 | Verse1 8 | Pre1 4 | Chorus 8 | Post 4 | Verse2 8 | Pre2 4 | Chorus 8 | Post 4 |
  Verse3 (shower) 8 | Bridge 8 | Pre-final 4 | Final chorus 8 | Post 4 | Outro 4

Outputs next to this script:
  seen-full-guide.mp3         instrumental + guide melody on the choruses
  seen-full-instrumental.mp3  instrumental only (record your a cappella over this)
  seen-full.mid               chords / bass / guide melody for the producer
  seen-full-sections.txt      timestamps of every section
"""
import os
import struct
import subprocess
import wave

import numpy as np

SR = 44100
BPM = 88
BEAT = 60.0 / BPM
OUT = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(247)

# ------------------------------------------------------------------ harmony
V = {  # name: (voicing, bass)
    "Am9": ([55, 59, 60, 64], 45), "Fmaj7": ([53, 57, 60, 64], 41),
    "Cmaj7": ([52, 55, 59, 60], 48), "G6": ([55, 59, 62, 64], 43),
    "Dm9": ([53, 57, 60, 64], 38), "Em7": ([52, 55, 59, 62], 40),
    "G": ([55, 59, 62, 67], 43), "Am7": ([52, 55, 57, 60], 45),
    "Dm7": ([53, 57, 60, 62], 38),
}
CH = ["Fmaj7", "G6", "Em7", "Am7"]
VS = ["Am9", "Fmaj7", "Cmaj7", "G6"]
PR = ["Dm9", "Em7", "Fmaj7", "G"]
BR = ["Fmaj7", "Em7", "Dm7", "Cmaj7"]

SECTIONS = [  # name, bars, progression
    ("Intro", 2, ["Fmaj7", "G6"]),
    ("Verse 1", 8, VS), ("Pre-Chorus 1", 4, PR), ("Chorus", 8, CH), ("Post-Chorus", 4, CH),
    ("Verse 2", 8, VS), ("Pre-Chorus 2", 4, PR), ("Chorus", 8, CH), ("Post-Chorus", 4, CH),
    ("Verse 3 (shower)", 8, VS), ("Bridge", 8, BR), ("Pre-Final", 4, ["Fmaj7", "G6"]),
    ("Final Chorus", 8, CH), ("Post-Chorus", 4, CH), ("Outro", 4, ["Fmaj7", "Fmaj7"]),
]
TOTAL_BARS = sum(s[1] for s in SECTIONS)
LENGTH = int((TOTAL_BARS * 4 * BEAT + 4.0) * SR)

# chorus guide melody (beat, length, midi) for an 8-bar chorus:
# "Seen, seen, you left me on seen" x2 / "you watch it all, you never reply" / "seen, seen, you left me on seen"
def _seen_line(o, end_note):
    return [(o + 0, 1, 79), (o + 1, 1, 76), (o + 2.5, .5, 74), (o + 3, .5, 76), (o + 3.5, .5, 76),
            (o + 4, .5, 79), (o + 4.5, 2.5, end_note)]


CHORUS_MEL = (_seen_line(0, 76) + _seen_line(8, 74) +
              [(16, .5, 72), (16.5, .5, 74), (17, .5, 76), (17.5, 1.5, 79), (19, .5, 76), (19.5, .5, 79),
               (20, .5, 81), (20.5, .5, 79), (21, 2, 76)] +
              _seen_line(24, 72))

# post-chorus chant (4 bars): "kidoku, kidoku / kidoku mushi / read it and leave it / kidoku, kidoku"
def _kidoku(o, end_note):
    return [(o, .25, 76), (o + .25, .25, 76), (o + .5, .5, 74), (o + 1, .25, 76), (o + 1.25, .25, 76), (o + 1.5, 1, end_note)]


POST_MEL = (_kidoku(0, 74) +
            [(4, .25, 76), (4.25, .25, 76), (4.5, .5, 74), (5, .5, 72), (5.5, 1.5, 69)] +
            [(8, .5, 72), (8.5, .5, 74), (9, .5, 76), (9.5, .5, 74), (10, 1.5, 72)] +
            _kidoku(12, 72))


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


def b2s(beats):
    return int(round(beats * BEAT * SR))


def stereo():
    return np.zeros((LENGTH, 2))


def place(bus, sig, start, pan=0.0, gain=1.0):
    s = max(0, start)
    e = min(LENGTH, s + len(sig))
    if e <= s:
        return
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    bus[s:e, 0] += sig[: e - s] * l * gain
    bus[s:e, 1] += sig[: e - s] * r * gain


def lp(x, a):
    """one-pole low-pass, vectorised in chunks via scan (python loop, fine for our sizes)."""
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a * (x[i] - acc)
        y[i] = acc
    return y


def lp_fast(x, a):
    """approximate one-pole low-pass for long signals using FFT-domain filtering."""
    n = len(x)
    size = 1 << (n - 1).bit_length()
    f = np.fft.rfftfreq(size, 1 / SR)
    fc = -np.log(1 - a) * SR / (2 * np.pi)
    h = 1 / (1 + 1j * f / fc)
    return np.fft.irfft(np.fft.rfft(x, size) * h, size)[:n]


# ------------------------------------------------------------------ instruments
def epiano(m, dur_beats, vel=0.5, dark=False):
    dur = dur_beats * BEAT
    n = int((dur + 1.4) * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    harm = [(1, 1.0, 1.7), (2, 0.42, 0.7), (3, 0.16, 0.35), (4, 0.08, 0.15), (7, 0.025, 0.05)]
    if dark:
        harm = [(1, 1.0, 1.9), (2, 0.16, 0.8), (3, 0.04, 0.4)]
    sig = sum(a * np.sin(2 * np.pi * f * k * t + rng.uniform(0, 6.28)) * np.exp(-t / tau) for k, a, tau in harm)
    env = np.minimum(1, t / 0.004) * np.clip(1 - (t - dur) / 0.3, 0, 1)
    return sig * env * (1 + 0.1 * np.sin(2 * np.pi * 4.6 * t)) * vel * 0.2


def pad(m, dur_beats, vel=0.5):
    dur = dur_beats * BEAT
    n = int((dur + 1.5) * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    sig = np.zeros(n)
    for det in (-0.12, 0.0, 0.11):
        ff = f * 2 ** (det / 12)
        for k, a in ((1, 1), (2, .35), (3, .15), (4, .07)):
            sig += a * np.sin(2 * np.pi * ff * k * t + rng.uniform(0, 6.28))
    env = np.clip(t / 0.9, 0, 1) * np.clip(1 - (t - dur) / 1.4, 0, 1)
    return sig * env * vel * 0.035


def bass(m, dur_beats, vel=0.8):
    dur = dur_beats * BEAT
    n = int((dur + 0.3) * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    sig = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    env = np.minimum(1, t / 0.012) * (0.55 + 0.45 * np.exp(-t / 0.4)) * np.clip(1 - (t - dur) / 0.08, 0, 1)
    return np.tanh(1.4 * sig) * env * vel * 0.3


def lead(m, dur_beats, vel=0.6):
    dur = dur_beats * BEAT
    n = int((dur + 0.25) * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.4 * t) * np.clip((t - 0.25) / 0.3, 0, 1)
    ph = 2 * np.pi * np.cumsum(mtof(m) * vib) / SR
    sig = np.sin(ph) + 0.12 * np.sin(3 * ph) + 0.05 * np.sin(2 * ph)
    env = np.minimum(1, t / 0.035) * np.clip(1 - (t - dur) / 0.12, 0, 1)
    return sig * env * vel * 0.2


def bell(m, vel=0.4):
    n = int(2.5 * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    sig = np.sin(2 * np.pi * f * t) * np.exp(-t / 1.1) + 0.3 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.4)
    return sig * np.minimum(1, t / 0.003) * vel * 0.12


def kick(vel=1.0):
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(45 + 80 * np.exp(-t / 0.035)) / SR
    sig = np.sin(ph) * np.exp(-t / 0.22)
    return np.tanh(1.5 * sig) * vel * 0.5


def snare(vel=1.0):
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    nz = rng.normal(0, 1, n)
    bp = lp(nz - lp(nz, 0.08), 0.45)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05)
    return (0.7 * bp * np.exp(-t / 0.13) + 0.3 * tone) * vel * 0.26


def rim(vel=1.0):
    n = int(0.08 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1700 * t) * 0.6 + rng.normal(0, .3, n)) * np.exp(-t / 0.012) * vel * 0.12


def hat(vel=1.0, open_=False):
    n = int((0.25 if open_ else 0.08) * SR)
    t = np.arange(n) / SR
    nz = rng.normal(0, 1, n)
    return (nz - lp(nz, 0.35)) * np.exp(-t / (0.08 if open_ else 0.022)) * vel * 0.07


def vibration(dur=0.38):
    n = int(dur * SR)
    t = np.arange(n) / SR
    buzz = np.sign(np.sin(2 * np.pi * 148 * t)) * 0.5 + np.sin(2 * np.pi * 296 * t) * 0.3
    env = np.minimum(1, t / 0.01) * np.clip((dur - t) / 0.02, 0, 1) * (0.6 + 0.4 * np.sin(2 * np.pi * 24 * t))
    return lp(buzz * env, 0.25) * 0.15


def click():
    n = int(0.02 * SR)
    nz = rng.normal(0, 1, n)
    return (nz - lp(nz, 0.3)) * np.exp(-np.arange(n) / SR / 0.003) * 0.11


def tama_beep(count=2):
    out = []
    for _ in range(count):
        n = int(0.07 * SR)
        t = np.arange(n) / SR
        out.append(np.sign(np.sin(2 * np.pi * 2350 * t)) * np.clip(1 - t / 0.07, 0, 1) * 0.035)
        out.append(np.zeros(int(0.06 * SR)))
    return np.concatenate(out)


def noise_bed(seconds, a, gain, am_rate=0.0, am_depth=0.0):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    x = lp_fast(rng.normal(0, 1, n), a)
    x /= np.max(np.abs(x)) + 1e-9
    am = 1 + am_depth * np.sin(2 * np.pi * am_rate * t + rng.uniform(0, 6.28))
    fade = np.clip(t / 1.5, 0, 1) * np.clip((seconds - t) / 1.5, 0, 1)
    return x * am * fade * gain


# ------------------------------------------------------------------ arrangement
ep, bs, dr, ld, pd, fx = (stereo() for _ in range(6))
section_starts = []
bar = 0
for name, nbars, prog in SECTIONS:
    b0 = bar * 4
    section_starts.append((name, b0 * BEAT))
    for k in range(nbars):
        chord = prog[k % len(prog)]
        voicing, root = V[chord]
        bb = (bar + k) * 4
        sec = name.split(" (")[0]
        dark = sec in ("Intro", "Pre-Final", "Outro", "Verse 3")
        vel = {"Intro": .32, "Verse 1": .42, "Verse 2": .44, "Verse 3": .38, "Bridge": .30,
               "Pre-Final": .30, "Outro": .3}.get(sec, .5)
        # electric piano
        for i, m in enumerate(voicing):
            pan = -0.35 + 0.23 * i
            if sec in ("Outro",) and k > 0:
                continue
            if sec in ("Bridge",):
                continue
            place(ep, epiano(m, 2.3 if sec != "Outro" else 7.5, vel, dark), b2s(bb) + i * 260, pan)
            if sec not in ("Intro", "Pre-Final", "Outro"):
                place(ep, epiano(m, 1.4, vel * .8, dark), b2s(bb + 2.5) + i * 180, pan)
        # pads: pre-choruses, choruses, bridge, final
        if sec in ("Pre-Chorus 1", "Pre-Chorus 2", "Chorus", "Post-Chorus", "Bridge", "Final Chorus", "Pre-Final"):
            pv = {"Bridge": .9, "Pre-Final": .5}.get(sec, .55)
            if sec.startswith("Pre-Chorus"):
                pv = 0.3 + 0.12 * k
            for i, m in enumerate(voicing):
                place(pd, pad(m + 12 if sec == "Bridge" else m, 4.0, pv), b2s(bb), -0.5 + 0.33 * i)
        # bass
        if sec not in ("Intro", "Bridge", "Pre-Final", "Outro"):
            bv = 0.55 if sec.startswith("Verse 1") else 0.8
            place(bs, bass(root, 1.4, bv), b2s(bb))
            place(bs, bass(root, 0.9, bv * .85), b2s(bb + 2.5))
            if sec in ("Chorus", "Final Chorus", "Post-Chorus"):
                place(bs, bass(root + 12, 0.4, .5), b2s(bb + 3.5))
        if sec == "Bridge":
            place(bs, bass(root, 3.6, .45), b2s(bb))
            for j, m in enumerate((voicing[-1] + 12, voicing[-2] + 12)):
                place(fx, bell(m, .35), b2s(bb + 1 + j * 1.5), 0.4 - j * 0.8)
        # drums
        chorus_bar = k
        if sec in ("Chorus", "Final Chorus", "Post-Chorus"):
            if False:
                pass
            else:
                g = 0.85 if sec == "Final Chorus" else 1.0
                for kb in (0, 1.75, 2.5):
                    place(dr, kick((1.0 if kb == 0 else .7) * g), b2s(bb + kb))
                for sb in (1, 3):
                    place(dr, snare(g), b2s(bb + sb), 0.05)
                for h in range(8):
                    place(dr, hat((.9 if h % 2 == 0 else .55) * g, h == 7), b2s(bb + h * .5 + (.07 if h % 2 else 0)), .3)
        elif sec == "Verse 2":
            place(dr, kick(.6), b2s(bb))
            place(dr, kick(.45), b2s(bb + 2.5))
            for sb in (1, 3):
                place(dr, rim(.9), b2s(bb + sb), -0.1)
            for h in range(8):
                place(dr, hat(.45 if h % 2 == 0 else .3), b2s(bb + h * .5 + (.07 if h % 2 else 0)), .3)
        elif sec.startswith("Pre-Chorus"):
            for h in range(8 if k < 3 else 16):
                step = .5 if k < 3 else .25
                place(dr, hat(.35 + .1 * k), b2s(bb + h * step), .3)
        elif sec == "Verse 3":
            for h in range(4):
                place(dr, hat(.25), b2s(bb + h + .5), .3)
    # section-level sound design
    sec = name.split(" (")[0]
    s0 = b2s(b0)
    secsec = nbars * 4 * BEAT
    if sec == "Intro":
        place(fx, vibration(), s0, -0.1)
        place(fx, vibration(), s0 + b2s(0.75), -0.1)
        # phone typing: only here, at the very start
        for j in range(8):
            place(fx, click(), s0 + b2s(1.6) + int(j * .13 * SR + rng.uniform(0, 1500)), .2)
        for j in range(5):
            place(fx, click() * .7, s0 + b2s(3.0) + int(j * .08 * SR), .2)
        place(ld, lead(79, 1.5, .45), s0 + b2s(4))
        place(ld, lead(76, 2.0, .4), s0 + b2s(6))
    if sec == "Verse 2":
        for k in (0, 2, 5, 7):
            place(fx, tama_beep(2), s0 + b2s(k * 4 + 3.5), .45)
    if sec == "Pre-Chorus 2":
        place(fx, noise_bed(secsec, 0.004, .05, 0.5, .3), s0, 0)
        for j in range(int(secsec / 0.55)):  # train clacks
            place(fx, rim(.25), s0 + int(j * .55 * SR) + (int(.12 * SR) if j % 2 else 0), .6)
    if sec == "Verse 3":
        place(fx, noise_bed(secsec, 0.12, .016), s0, 0)
    if sec == "Bridge":
        place(fx, noise_bed(secsec, 0.01, .07, 0.08, .6), s0, -0.2)
    if sec == "Outro":
        place(fx, vibration(), s0 + b2s(1), -0.1)
        place(fx, tama_beep(3), s0 + b2s(5.5), .45)
    if sec == "Post-Chorus":
        for beat, length, m in POST_MEL:
            place(ld, lead(m, length * .95), s0 + b2s(beat))
    if sec in ("Chorus", "Final Chorus"):
        for beat, length, m in CHORUS_MEL:
            place(ld, lead(m, length * .95), s0 + b2s(beat))
    bar += nbars

# ------------------------------------------------------------------ processing
def tape_wow(x, depth_ms=2.2):
    n = len(x)
    t = np.arange(n) / SR
    d = (depth_ms / 1000 * SR) * (0.5 + 0.35 * np.sin(2 * np.pi * 0.55 * t) + 0.15 * np.sin(2 * np.pi * 6.1 * t))
    idx = np.arange(n) - d
    out = np.empty_like(x)
    for c in range(2):
        out[:, c] = np.interp(idx, np.arange(n), x[:, c])
    return out


def reverb_ir(seconds=2.6):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = np.stack([rng.normal(0, 1, n), rng.normal(0, 1, n)], 1) * np.exp(-t / 0.6)[:, None]
    ir[:, 0], ir[:, 1] = lp(ir[:, 0], .33), lp(ir[:, 1], .33)
    return ir / np.sqrt((ir ** 2).sum(0))


def convolve(x, ir, block=1 << 17):
    n, m = len(x), len(ir)
    size = 1 << (block + m - 1).bit_length()
    H = [np.fft.rfft(ir[:, c], size) for c in range(2)]
    out = np.zeros((n + m, 2))
    for s in range(0, n, block):
        seg = x[s:s + block]
        for c in range(2):
            y = np.fft.irfft(np.fft.rfft(seg[:, c], size) * H[c], size)[: len(seg) + m - 1]
            out[s:s + len(y), c] += y
    return out[:n]


ep = tape_wow(ep)
IR = reverb_ir()
crackle = np.zeros((LENGTH, 2))
pops = rng.integers(0, LENGTH - 50, int(LENGTH / SR * 1.5))
for p in pops:
    crackle[p:p + 30, :] += rng.normal(0, 0.05, (30, 1)) * np.exp(-np.arange(30) / 6)[:, None]
crackle += np.stack([lp_fast(rng.normal(0, 1, LENGTH), 0.03)] * 2, 1) * 0.004


def mixdown(with_lead):
    dry = ep * .9 + bs + dr * .85 + pd + fx
    send = ep * .35 + pd * .5 + dr * .05 + fx * .25
    if with_lead:
        dry = dry + ld * .85
        send = send + ld * .45
    mix = dry + convolve(send, IR) * .9 + crackle
    mix = np.tanh(mix * 1.1)
    fade = int(3 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return mix / np.max(np.abs(mix)) * .89


def write_mp3(name, data):
    wav = os.path.join(OUT, name + ".wav")
    pcm = (np.clip(data, -1, 1) * 32767).astype("<i2")
    with wave.open(wav, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-b:a", "256k",
                    os.path.join(OUT, name + ".mp3")], check=True)
    os.remove(wav)


write_mp3("seen-full-guide", mixdown(True))
write_mp3("seen-full-instrumental", mixdown(False))

with open(os.path.join(OUT, "seen-full-sections.txt"), "w") as f:
    f.write(f"Seen - full demo map ({BPM} BPM, C major)\n\n")
    for name, sec in section_starts:
        f.write(f"{int(sec // 60)}:{int(sec % 60):02d}  {name}\n")
    tot = TOTAL_BARS * 4 * BEAT
    f.write(f"{int(tot // 60)}:{int(tot % 60):02d}  end\n")


# ------------------------------------------------------------------ MIDI
def vlq(v):
    out = [v & 0x7F]
    v >>= 7
    while v:
        out.insert(0, (v & 0x7F) | 0x80)
        v >>= 7
    return bytes(out)


def track(events, name):
    data = b"\x00\xff\x03" + vlq(len(name)) + name.encode()
    last = 0
    for tick, msg in sorted(events, key=lambda e: (e[0], e[1][0] & 0xF0 != 0x80)):
        data += vlq(tick - last) + msg
        last = tick
    return b"MTrk" + struct.pack(">I", len(data) + 4) + data + b"\x00\xff\x2f\x00"


TPB = 480
chords, basses, mel = [], [], []
bar = 0
for name, nbars, prog in SECTIONS:
    for k in range(nbars):
        voicing, root = V[prog[k % len(prog)]]
        b0 = (bar + k) * 4
        chords += [(b0, 4, m, 70) for m in voicing]
        basses.append((b0, 3.5, root, 85))
    if name in ("Chorus", "Final Chorus"):
        mel += [(bar * 4 + b, l, m, 90) for b, l, m in CHORUS_MEL]
    if name == "Post-Chorus":
        mel += [(bar * 4 + b, l, m, 90) for b, l, m in POST_MEL]
    bar += nbars


def notes(lst, ch):
    ev = []
    for b, l, m, v in lst:
        ev += [(int(b * TPB), bytes([0x90 | ch, m, v])), (int((b + l) * TPB), bytes([0x80 | ch, m, 0]))]
    return ev


tempo = b"\x00\xff\x51\x03" + int(60_000_000 / BPM).to_bytes(3, "big")
with open(os.path.join(OUT, "seen-full.mid"), "wb") as f:
    f.write(b"MThd" + struct.pack(">IHHH", 6, 1, 4, TPB))
    f.write(b"MTrk" + struct.pack(">I", len(tempo) + 4) + tempo + b"\x00\xff\x2f\x00")
    f.write(track(notes(chords, 0), "Chords (Rhodes)"))
    f.write(track(notes(basses, 1), "Bass"))
    f.write(track(notes(mel, 2), "Guide melody (chorus)"))

print("done:", TOTAL_BARS, "bars,", round(TOTAL_BARS * 4 * BEAT, 1), "s")
