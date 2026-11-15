"""Seen - demo track generator.

Builds a guide demo for the chorus of "Seen": electric piano chords on the
J-pop "royal road" progression (Fmaj7 - G6 - Em7 - Am7), sub bass, lo-fi
drums at 88 BPM, phone-vibration intro and a soft guide melody.

Outputs (next to this script):
  seen-demo-guide.mp3               full demo with guide melody (WAV also written, regenerable)
  seen-demo-instrumental.mp3        same track without the melody (sing over it)
  seen-chorus.mid                   MIDI (chords, bass, melody) for the producer
"""
import os
import struct
import subprocess
import wave

import numpy as np

SR = 44100
BPM = 88
BEAT = 60.0 / BPM
BAR = 4 * BEAT
INTRO_BARS = 4
CHORUS_BARS = 16
OUTRO_BARS = 2
TOTAL_BARS = INTRO_BARS + CHORUS_BARS + OUTRO_BARS
LENGTH = int((TOTAL_BARS * BAR + 3.0) * SR)
OUT = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(247)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


def t2s(beats):
    return int(round(beats * BEAT * SR))


def stereo():
    return np.zeros((LENGTH, 2))


def place(bus, sig, start, pan=0.0):
    s = max(0, start)
    e = min(LENGTH, s + len(sig))
    if e <= s:
        return
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    bus[s:e, 0] += sig[: e - s] * l
    bus[s:e, 1] += sig[: e - s] * r


# ---------------------------------------------------------------- instruments
def epiano(m, dur_beats, vel=0.5, dark=False):
    dur = dur_beats * BEAT
    n = int((dur + 1.2) * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    harm = [(1, 1.0, 1.6), (2, 0.45, 0.7), (3, 0.18, 0.4), (4, 0.10, 0.15), (7, 0.03, 0.05)]
    if dark:
        harm = [(1, 1.0, 1.8), (2, 0.18, 0.8), (3, 0.04, 0.4)]
    sig = np.zeros(n)
    for k, a, tau in harm:
        sig += a * np.sin(2 * np.pi * f * k * t + rng.uniform(0, 6.28)) * np.exp(-t / tau)
    env = np.minimum(1, t / 0.004)
    rel = np.clip(1 - (t - dur) / 0.25, 0, 1)
    trem = 1 + 0.12 * np.sin(2 * np.pi * 4.8 * t)
    return sig * env * rel * trem * vel * 0.22


def bass(m, dur_beats, vel=0.8):
    dur = dur_beats * BEAT
    n = int((dur + 0.3) * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    sig = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    env = np.minimum(1, t / 0.01) * (0.55 + 0.45 * np.exp(-t / 0.35))
    rel = np.clip(1 - (t - dur) / 0.08, 0, 1)
    return np.tanh(1.4 * sig) * env * rel * vel * 0.32


def lead(m, dur_beats, vel=0.6):
    dur = dur_beats * BEAT
    n = int((dur + 0.25) * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.4 * t) * np.clip((t - 0.25) / 0.3, 0, 1)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    sig = np.sin(ph) + 0.12 * np.sin(3 * ph) + 0.05 * np.sin(2 * ph)
    env = np.minimum(1, t / 0.035)
    rel = np.clip(1 - (t - dur) / 0.12, 0, 1)
    return sig * env * rel * vel * 0.22


def onepole_lp(x, a):
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a * (x[i] - acc)
        y[i] = acc
    return y


def kick(vel=1.0):
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 45 + 85 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(ph) * np.exp(-t / 0.22)
    sig[:120] += rng.normal(0, 0.4, 120) * np.linspace(1, 0, 120)
    return np.tanh(1.6 * sig) * vel * 0.55


def snare(vel=1.0):
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    noise = rng.normal(0, 1, n)
    bp = noise - onepole_lp(noise, 0.08)
    bp = onepole_lp(bp, 0.5)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05)
    # clap-style double hit
    env = np.exp(-t / 0.13)
    env[: int(0.012 * SR)] *= 0.6
    return (0.75 * bp * env + 0.35 * tone) * vel * 0.28


def hat(vel=1.0, open_=False):
    n = int((0.25 if open_ else 0.08) * SR)
    t = np.arange(n) / SR
    noise = rng.normal(0, 1, n)
    hp = noise - onepole_lp(noise, 0.35)
    return hp * np.exp(-t / (0.08 if open_ else 0.022)) * vel * 0.075


def vibration(dur=0.38):
    n = int(dur * SR)
    t = np.arange(n) / SR
    buzz = np.sign(np.sin(2 * np.pi * 148 * t)) * 0.5 + np.sin(2 * np.pi * 296 * t) * 0.3
    am = 0.6 + 0.4 * np.sin(2 * np.pi * 24 * t)
    env = np.minimum(1, t / 0.01) * np.clip((dur - t) / 0.02, 0, 1)
    return onepole_lp(buzz * am * env, 0.25) * 0.16


def click():
    n = int(0.02 * SR)
    t = np.arange(n) / SR
    noise = rng.normal(0, 1, n)
    return (noise - onepole_lp(noise, 0.3)) * np.exp(-t / 0.003) * 0.12


# ---------------------------------------------------------------- music data
# J-pop "royal road" progression in C: IV - V - iii - vi
CHORDS = [
    ("Fmaj7", [53, 57, 60, 64], 41),
    ("G6", [55, 59, 62, 64], 43),
    ("Em7", [52, 55, 59, 62], 40),
    ("Am7", [52, 55, 57, 60], 45),
]

# guide melody for the chorus: (beat from chorus start, length in beats, midi, syllable)
MELODY = [
    (0.0, 1.0, 79, "Seen,"), (1.0, 1.0, 76, "seen,"),
    (2.5, 0.5, 74, "it"), (3.0, 0.5, 76, "says"), (3.5, 0.5, 76, "I've"),
    (4.0, 0.5, 79, "been"), (4.5, 2.0, 76, "seen,"),
    (7.0, 0.25, 76, "ki-"), (7.25, 0.25, 76, "do-"), (7.5, 0.5, 74, "ku"),
    (8.0, 0.25, 72, "in"), (8.25, 0.25, 74, "the"), (8.5, 0.5, 76, "cor-"), (9.0, 0.5, 74, "ner"),
    (9.5, 0.25, 72, "like"), (9.75, 0.25, 72, "a"), (10.0, 1.0, 79, "bruise"),
    (11.0, 0.5, 76, "on"), (11.5, 0.5, 74, "the"), (12.0, 2.5, 76, "screen,"),
    (15.5, 0.5, 72, "you"),
    (16.0, 0.5, 74, "read"), (16.5, 0.5, 76, "ev-"), (17.0, 0.5, 76, "ery"), (17.5, 1.0, 79, "word,"),
    (18.5, 0.5, 76, "you"), (19.0, 0.5, 76, "just"), (19.5, 0.5, 79, "won't"),
    (20.0, 0.5, 81, "re-"), (20.5, 2.0, 79, "ply,"),
    (23.0, 0.25, 76, "e-"), (23.25, 0.25, 76, "ven"), (23.5, 0.5, 79, "Fu-"),
    (24.0, 0.5, 76, "ji"), (24.5, 0.5, 74, "shows"), (25.0, 0.5, 72, "its"), (25.5, 0.5, 74, "face"),
    (26.0, 0.5, 76, "to"), (26.5, 0.5, 74, "the"), (27.0, 1.5, 72, "sky..."),
    (29.0, 1.0, 69, "some"), (30.0, 2.0, 72, "days."),
    (32.0, 1.0, 79, "Seen,"), (33.0, 1.0, 76, "seen,"),
    (34.5, 0.5, 74, "so"), (35.0, 0.5, 76, "what"), (35.5, 0.5, 76, "does"),
    (36.0, 0.5, 79, "it"), (36.5, 2.0, 76, "mean"),
    (39.0, 0.5, 72, "when"), (39.5, 0.25, 74, "some-"), (39.75, 0.25, 74, "bo-"),
    (40.0, 0.5, 76, "dy"), (40.5, 1.0, 79, "sees"), (41.5, 0.5, 76, "you"),
    (42.0, 0.5, 74, "and"), (42.5, 1.0, 81, "leaves"), (43.5, 0.5, 79, "you"),
    (44.0, 0.5, 76, "in"), (44.5, 0.5, 74, "be-"), (45.0, 3.0, 72, "tween?"),
    (52.0, 2.0, 79, "(seen...)"), (56.0, 2.0, 76, "(seen...)"), (60.0, 3.0, 72, "(...)"),
]

# ---------------------------------------------------------------- arrange
ep_bus, bass_bus, drum_bus, lead_bus, fx_bus = (stereo() for _ in range(5))

for bar in range(TOTAL_BARS):
    name, voicing, root = CHORDS[bar % 4]
    b0 = bar * 4
    intro = bar < INTRO_BARS
    outro = bar >= INTRO_BARS + CHORUS_BARS
    vel = 0.35 if intro else 0.5
    if outro:
        if bar == TOTAL_BARS - OUTRO_BARS:
            for i, m in enumerate(CHORDS[0][1]):
                place(ep_bus, epiano(m, 7.5, 0.45, dark=True), t2s(b0) + i * 900, pan=-0.3 + 0.2 * i)
        continue
    for i, m in enumerate(voicing):
        pan = -0.35 + 0.23 * i
        place(ep_bus, epiano(m, 2.3, vel, dark=intro), t2s(b0) + i * 260, pan)
        place(ep_bus, epiano(m, 1.4, vel * 0.8, dark=intro), t2s(b0 + 2.5) + i * 180, pan)
    if not intro:
        place(bass_bus, bass(root, 1.4), t2s(b0))
        place(bass_bus, bass(root, 0.9, 0.7), t2s(b0 + 2.5))
        place(bass_bus, bass(root + 12, 0.4, 0.5), t2s(b0 + 3.5))

# drums: chorus only, with the "some days" bar (chorus bar 7) left empty
for cb in range(CHORUS_BARS):
    if cb == 7:
        continue
    b0 = (INTRO_BARS + cb) * 4
    for kb in (0, 1.75, 2.5):
        place(drum_bus, kick(1.0 if kb == 0 else 0.7), t2s(b0 + kb))
    for sb in (1, 3):
        place(drum_bus, snare(), t2s(b0 + sb), pan=0.05)
    for h in range(8):
        swing = 0.07 if h % 2 else 0.0
        place(drum_bus, hat(0.9 if h % 2 == 0 else 0.55, open_=(h == 7)), t2s(b0 + h * 0.5 + swing), pan=0.3)
# soft hats in the last intro bar to lead in
for h in range(8):
    place(drum_bus, hat(0.35), t2s((INTRO_BARS - 1) * 4 + h * 0.5), pan=0.3)

# phone vibration + typing in the intro, vibration again in the outro
place(fx_bus, vibration(), t2s(0.0), pan=-0.1)
place(fx_bus, vibration(), t2s(0.75), pan=-0.1)
for k in range(9):
    place(fx_bus, click(), t2s(4.0) + int(k * 0.13 * SR + rng.uniform(0, 1500)), pan=0.2)
for k in range(5):
    place(fx_bus, click() * 0.7, t2s(6.5) + int(k * 0.09 * SR), pan=0.2)
place(fx_bus, vibration(), t2s((TOTAL_BARS - 1) * 4 + 1), pan=-0.1)

chorus0 = INTRO_BARS * 4
for beat, length, m, _syl in MELODY:
    place(lead_bus, lead(m, length * 0.95), t2s(chorus0 + beat))

# ---------------------------------------------------------------- mix
def reverb_ir(seconds=2.4):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = np.stack([rng.normal(0, 1, n), rng.normal(0, 1, n)], axis=1)
    ir *= np.exp(-t / 0.55)[:, None]
    ir[:, 0] = onepole_lp(ir[:, 0], 0.35)
    ir[:, 1] = onepole_lp(ir[:, 1], 0.35)
    return ir / np.sqrt((ir ** 2).sum(axis=0))


def convolve(x, ir):
    n = len(x) + len(ir) - 1
    size = 1 << (n - 1).bit_length()
    out = np.zeros((len(x), 2))
    for c in range(2):
        y = np.fft.irfft(np.fft.rfft(x[:, c], size) * np.fft.rfft(ir[:, c], size), size)
        out[:, c] = y[: len(x)]
    return out


IR = reverb_ir()
noise_bed = np.stack([onepole_lp(rng.normal(0, 1, LENGTH), 0.02)] * 2, axis=1) * 0.006


def mixdown(with_lead):
    dry = ep_bus * 0.9 + bass_bus + drum_bus * 0.85 + fx_bus
    send = ep_bus * 0.35 + drum_bus * 0.06 + fx_bus * 0.2
    if with_lead:
        dry = dry + lead_bus * 0.85
        send = send + lead_bus * 0.45
    mix = dry + convolve(send, IR) * 0.9 + noise_bed
    mix = np.tanh(mix * 1.15)
    fade = int(2.5 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return mix / np.max(np.abs(mix)) * 0.89


def write_wav(path, data):
    pcm = (np.clip(data, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


for name, with_lead in (("seen-demo-guide", True), ("seen-demo-instrumental", False)):
    wav = os.path.join(OUT, name + ".wav")
    write_wav(wav, mixdown(with_lead))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-b:a", "256k", wav[:-4] + ".mp3"], check=True)


# ---------------------------------------------------------------- MIDI export
def vlq(v):
    out = [v & 0x7F]
    v >>= 7
    while v:
        out.insert(0, (v & 0x7F) | 0x80)
        v >>= 7
    return bytes(out)


def track(events, name):
    """events: list of (tick, bytes)."""
    data = b"\x00\xff\x03" + vlq(len(name)) + name.encode()
    last = 0
    for tick, msg in sorted(events, key=lambda e: (e[0], e[1][0] & 0xF0 != 0x80)):
        data += vlq(tick - last) + msg
        last = tick
    data += b"\x00\xff\x2f\x00"
    return b"MTrk" + struct.pack(">I", len(data)) + data


TPB = 480


def notes(lst, ch):
    ev = []
    for beat, length, m, vel in lst:
        s = int(beat * TPB)
        e = int((beat + length) * TPB)
        ev.append((s, bytes([0x90 | ch, m, vel])))
        ev.append((e, bytes([0x80 | ch, m, 0])))
    return ev


chord_notes, bass_notes = [], []
for cb in range(CHORUS_BARS):
    _n, voicing, root = CHORDS[cb % 4]
    b0 = cb * 4
    for m in voicing:
        chord_notes += [(b0, 2.0, m, 70), (b0 + 2.5, 1.5, m, 60)]
    bass_notes += [(b0, 1.5, root, 90), (b0 + 2.5, 1.0, root, 80), (b0 + 3.5, 0.5, root + 12, 70)]
mel_notes = [(b, l, m, 90) for b, l, m, _s in MELODY]

tempo = b"\x00\xff\x51\x03" + (int(60_000_000 / BPM)).to_bytes(3, "big")
meta = b"MTrk" + struct.pack(">I", len(tempo) + 4) + tempo + b"\x00\xff\x2f\x00"
with open(os.path.join(OUT, "seen-chorus.mid"), "wb") as f:
    f.write(b"MThd" + struct.pack(">HHH", 6, 1, 4, TPB) if False else b"MThd" + struct.pack(">IHHH", 6, 1, 4, TPB))
    f.write(meta)
    f.write(track(notes(chord_notes, 0), "Chords (Rhodes)"))
    f.write(track(notes(bass_notes, 1), "Bass"))
    f.write(track(notes(mel_notes, 2), "Guide melody"))

print("done:", TOTAL_BARS, "bars,", round(TOTAL_BARS * BAR, 1), "s")
