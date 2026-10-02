"""Scores for the MENVA film pack. Everything is synthesised (nothing licensed, nothing Instagram can mute).

    python3 social/reels/films/score.py cues.json out.wav

cues.json: {"len": 12, "preset": "chip", "bpm": 140, "events": [{"t": 1.0, "type": "coin"}, ...]}
A preset is a full arrangement (drums, bass, harmony, lead) in one musical style; cues add the sound design on top.
Shared voices come from ../intro/score.py (EP, kick, snap, pluck, bell, whoosh, impact, sizzle).
"""
import json
import os
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'intro'))
import score as base  # noqa: E402

SR = base.SR
tt, place, fft_filter, hz = base.tt, base.place, base.fft_filter, base.hz
rng = np.random.default_rng(23)


# ---------- oscillators and voices ----------
def env_ad(n, a=0.004, d=0.3):
    t = tt(n)
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(d, 1e-4))


def gate(n, dur, rel=0.04):
    t = tt(n)
    return np.where(t < dur, 1.0, np.exp(-(t - dur) / rel))


def square(f, dur, duty=0.5, vol=1.0, d=0.6):
    n = int((dur + 0.1) * SR)
    t = tt(n)
    s = np.where(((f * t) % 1.0) < duty, 1.0, -1.0)
    return fft_filter(s, hi=9000) * env_ad(n, 0.002, d) * gate(n, dur, 0.02) * vol


def tri(f, dur, vol=1.0, d=1.0):
    n = int((dur + 0.1) * SR)
    t = tt(n)
    s = 2 * np.abs(2 * ((f * t) % 1.0) - 1) - 1
    return s * env_ad(n, 0.003, d) * gate(n, dur, 0.03) * vol


def saw(f, dur, det=0.0, vol=1.0, a=0.005, d=1.5, cut=4000):
    n = int((dur + 0.3) * SR)
    t = tt(n)
    s = sum(2 * ((f * 2 ** (dd / 1200) * t + rng.random()) % 1.0) - 1 for dd in ((-det, det) if det else (0,)))
    return fft_filter(s, hi=cut) * env_ad(n, a, d) * gate(n, dur, 0.12) * vol


def noise_hit(dur, lo=None, hi=None, d=0.05, vol=1.0):
    n = int(dur * SR)
    return fft_filter(rng.standard_normal(n), lo=lo, hi=hi) * env_ad(n, 0.001, d) * vol


def ks(f, dur, bright=0.5, vol=1.0, buzz=0.0):
    """Karplus-Strong plucked string (sitar buzz adds a soft clip in the loop)."""
    n = int(dur * SR)
    p = max(2, int(SR / f))
    buf = rng.uniform(-1, 1, p) * vol
    out = np.empty(n)
    a = 0.5 + bright * 0.49
    for i in range(n):
        x = buf[i % p]
        out[i] = x
        nxt = buf[(i + 1) % p]
        y = a * x + (1 - a) * nxt
        if buzz:
            y = np.tanh(y * (1 + buzz * 3)) / (1 + buzz * 0.6)
        buf[i % p] = y * 0.996
    return out


def piano(f, dur, vol=1.0):
    n = int((dur + 1.2) * SR)
    t = tt(n)
    s = np.zeros(n)
    for k in range(1, 9):
        fk = f * k * np.sqrt(1 + 0.0004 * k * k)
        s += np.sin(2 * np.pi * fk * t) * np.exp(-t * (1.2 + k * 0.9)) / k ** 1.1
    ham = fft_filter(rng.standard_normal(n), lo=800, hi=5000) * np.exp(-t * 90) * 0.06
    return (s + ham) * (1 - np.exp(-t * 600)) * gate(n, dur, 0.25) * vol


def reed(f, dur, vol=1.0):
    """Harmonium-ish reed drone."""
    return saw(f, dur, det=7, vol=vol, a=0.08, d=8, cut=2200)


def taiko(big=1.0):
    n = int(1.1 * SR)
    t = tt(n)
    fr = 58 + 90 * np.exp(-t * 14)
    body = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 4.5)
    skin = fft_filter(rng.standard_normal(n), hi=900) * np.exp(-t * 30) * 0.5
    return np.tanh((body + skin) * 1.5 * big) * 0.9


def dhol(side):
    n = int(0.6 * SR)
    t = tt(n)
    if side == 'dhum':
        fr = 70 + 60 * np.exp(-t * 18)
        return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 6) * 0.95
    crack = fft_filter(rng.standard_normal(n), lo=900, hi=6000) * np.exp(-t * 45)
    ring = np.sin(2 * np.pi * 420 * t) * np.exp(-t * 25) * 0.4
    return (crack * 0.7 + ring) * 0.8


def tabla(kind):
    n = int(0.5 * SR)
    t = tt(n)
    if kind == 'ge':
        fr = 95 + 70 * np.exp(-t * 5) + 25 * np.exp(-t * 2)
        return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 5) * 0.9
    s = sum(np.sin(2 * np.pi * 520 * m * t) * np.exp(-t * (14 + m * 10)) / m for m in (1, 2, 3, 4.2))
    return (s + noise_hit(0.5, lo=2000, d=0.01) * 0.3) * 0.6


def ghungroo():
    n = int(0.35 * SR)
    out = np.zeros(n)
    for _ in range(9):
        k = rng.integers(0, int(0.08 * SR))
        f = rng.uniform(5200, 7800)
        m = n - k
        t = tt(m)
        out[k:] += np.sin(2 * np.pi * f * t) * np.exp(-t * 40) * rng.uniform(0.2, 0.6)
    return out * 0.35


def hat(open_=False, vol=1.0):
    return noise_hit(0.35 if open_ else 0.08, lo=7000, d=0.12 if open_ else 0.018, vol=0.16 * vol)


def clap():
    n = int(0.3 * SR)
    t = tt(n)
    s = np.zeros(n)
    for k in (0, 0.009, 0.018):
        i = int(k * SR)
        s[i:] += fft_filter(rng.standard_normal(n - i), lo=900, hi=5000) * np.exp(-tt(n - i) * 35)
    return s * 0.5


def woodblock(f=900):
    n = int(0.15 * SR)
    t = tt(n)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.7 * t)) * np.exp(-t * 45) * 0.6


def gated_snare():
    s = base.snap()
    n = int(0.45 * SR)
    tail = np.zeros(n)
    tail[: len(s)] += s
    tail += fft_filter(rng.standard_normal(n), lo=600, hi=8000) * 0.18
    g = np.where(tt(n) < 0.22, 1.0, np.exp(-(tt(n) - 0.22) / 0.01))
    return tail * g * 0.9


def wobble(x, depth=0.003, rate=0.8):
    """Tape wow: a slow wandering time warp on a stereo signal."""
    n = x.shape[1]
    t = np.arange(n) / SR
    warp = t + depth * np.sin(2 * np.pi * rate * t) + depth * 0.5 * np.sin(2 * np.pi * rate * 2.7 * t + 1)
    idx = np.clip(warp * SR, 0, n - 1)
    return np.stack([np.interp(idx, np.arange(n), x[c]) for c in range(2)])


def mix(*parts):
    """Sum mono arrays of different lengths."""
    n = max(len(p) for p in parts)
    out = np.zeros(n)
    for p in parts:
        out[: len(p)] += p
    return out


# ---------- sound design (cue types) ----------
def sfx(kind, e):
    if kind == 'pop':
        return base.pluck(hz(e.get('m', 86)), 0.7) * 0.5
    if kind == 'whoosh':
        return base.whoosh(e.get('len', 0.6)) * 0.8
    if kind == 'riser':
        return base.whoosh(e.get('len', 1.0), rise=True) * 0.8
    if kind == 'impact':
        return base.impact(e.get('big', 0.9)) * 0.9
    if kind == 'land':
        n = base.impact(0.8)
        s = base.sizzle(1.4)
        out = np.zeros(max(len(n), len(s)))
        out[: len(n)] += n * 0.8
        out[: len(s)] += s * 0.7
        return out
    if kind == 'beep':
        return base.beep()
    if kind == 'tap':
        return base.click()
    if kind == 'ting':
        return base.bell(hz(e.get('m', 86)), 2.6) * 0.45
    if kind == 'coin':
        a = square(hz(83), 0.07, 0.5, 0.3, 1)
        b = square(hz(88), 0.32, 0.5, 0.3, 0.25)
        out = np.zeros(len(a) + len(b))
        out[: len(a)] += a
        out[int(0.07 * SR): int(0.07 * SR) + len(b)] += b
        return out
    if kind == 'power':
        out = np.zeros(int(0.8 * SR))
        for i, m in enumerate((60, 64, 67, 72, 76, 79, 84)):
            s = square(hz(m + 12), 0.07, 0.25, 0.25, 0.4)
            k = int(i * 0.07 * SR)
            out[k:k + len(s)] += s[: len(out) - k]
        return out
    if kind == 'hit8':
        return mix(noise_hit(0.25, hi=3000, d=0.06, vol=0.9), square(hz(40), 0.15, 0.5, 0.4, 0.1))
    if kind == 'boing':
        n = int(0.6 * SR)
        t = tt(n)
        f = 180 + 260 * np.exp(-t * 6) * (1 + 0.25 * np.sin(2 * np.pi * 18 * t))
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5) * 0.6
    if kind == 'splat':
        n = int(0.5 * SR)
        t = tt(n)
        return (fft_filter(rng.standard_normal(n), hi=1800) * np.exp(-t * 14) + np.sin(2 * np.pi * np.cumsum(140 * np.exp(-t * 4) + 60) / SR) * np.exp(-t * 9) * 0.6) * 0.7
    if kind == 'squelch':
        n = int(0.35 * SR)
        t = tt(n)
        f = 300 + 500 * t / 0.35
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.35) * 0.4 + fft_filter(rng.standard_normal(n), lo=200, hi=1500) * np.exp(-t * 12) * 0.3
    if kind == 'taiko':
        return taiko(e.get('big', 1.0))
    if kind == 'sting':
        return mix(base.whoosh(0.4) * 0.6, base.impact(0.6)[: int(0.5 * SR)] * 0.5)
    if kind == 'rewind':
        n = int(e.get('len', 0.8) * SR)
        t = tt(n)
        f = 900 + 1800 * (t / t[-1])
        tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.12
        return (tone + fft_filter(rng.standard_normal(n), lo=1500, hi=7000) * 0.15) * np.sin(np.pi * t / t[-1])
    if kind == 'type':
        return mix(woodblock(2400) * 0.5, noise_hit(0.15, lo=3000, d=0.008, vol=0.4))
    if kind == 'ding':
        return base.bell(hz(96), 1.2) * 0.3
    if kind == 'scribble':
        n = int(e.get('len', 0.5) * SR)
        t = tt(n)
        am = 0.5 + 0.5 * np.sin(2 * np.pi * 9 * t) ** 2
        return fft_filter(rng.standard_normal(n), lo=2500, hi=8000) * am * 0.22 * np.sin(np.pi * t / t[-1])
    if kind == 'paper':
        n = int(0.4 * SR)
        t = tt(n)
        return fft_filter(rng.standard_normal(n), lo=1200, hi=9000) * np.exp(-t * 9) * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * t)) * 0.35
    if kind == 'flash':
        return mix(base.bell(hz(98), 0.8) * 0.2, noise_hit(0.3, lo=5000, d=0.06, vol=0.2))
    if kind == 'ghungroo':
        return ghungroo()
    if kind == 'dhum':
        return dhol('dhum')
    if kind == 'bubble':
        n = int(0.18 * SR)
        t = tt(n)
        f = 500 + 1600 * (t / t[-1]) ** 2
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14) * 0.45
    if kind == 'gong':
        n = int(2.5 * SR)
        t = tt(n)
        s = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * dd) for f, dd in ((110, 1.2), (161, 1.6), (233, 2.2), (347, 3)))
        return s * 0.25 * (1 - np.exp(-t * 80))
    return None


# ---------- arrangements ----------
def beat_grid(length, bpm, start=0.0, end=None):
    b = 60 / bpm
    t = start
    i = 0
    end = length if end is None else end
    while t < end - 1e-6:
        yield i, t, b
        i += 1
        t += b


def chords_for(progression, t, bar):
    return progression[int(t // bar) % len(progression)]


def arrange(preset, length, bpm, ev):
    N = int(length * SR)
    mus = np.zeros((2, N))
    drm = np.zeros((2, N))
    b = 60 / bpm
    bar = 4 * b
    # where the end card starts: music thins out there (the film sends an 'end' cue)
    end_t = next((e['t'] for e in ev if e['type'] == 'end'), length - 3)
    drop_t = next((e['t'] for e in ev if e['type'] == 'drop'), 0.0)

    if preset == 'toon':          # bouncy pizzicato strings + claps, C major
        prog = [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]]
        for i, t, _ in beat_grid(length, bpm * 2):
            if t >= end_t + 1.0:
                break
            c = chords_for(prog, t, bar)
            m = c[i % 3] + (12 if i % 4 == 3 else 0)
            place(mus, ks(hz(m), 0.35, 0.2, 0.5), t, 0.28, pan=0.3 if i % 2 else -0.3)
            if i % 2 == 0:
                place(mus, ks(hz(c[0] - 24), 0.5, 0.1, 0.8), t, 0.35)
        for i, t, _ in beat_grid(end_t, bpm, drop_t):
            if i % 2 == 0:
                place(drm, base.kick(0.8), t, 0.6)
            else:
                place(drm, clap(), t, 0.5)
            place(drm, hat(), t + b / 2, 0.8, pan=0.3)
        place(mus, base.bell(hz(84), 3.0), end_t + 0.1, 0.12)

    elif preset == 'chip':        # NES-style: pulse lead, triangle bass, noise drums
        prog = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]]
        lead = [69, 72, 76, 74, 72, 69, 67, 69, 72, 74, 76, 79, 76, 74, 72, 74]
        for i, t, _ in beat_grid(end_t, bpm * 2):
            c = chords_for(prog, t, bar)
            place(mus, tri(hz(c[0] - 12), b / 2 * 0.9, 0.55, 0.5), t, 0.5)
            place(mus, square(hz(c[(i // 2) % 3] + 12), b / 4, 0.125, 0.2, 0.2), t, 0.35, pan=-0.2)
            if t >= drop_t:
                place(mus, square(hz(lead[i % 16]), b / 2 * 0.8, 0.25, 0.32, 0.5), t, 0.45, pan=0.15)
        for i, t, _ in beat_grid(end_t, bpm, drop_t):
            place(drm, noise_hit(0.12, hi=2500, d=0.04, vol=0.9) if i % 2 else (square(hz(36), 0.08, 0.5, 0.8, 0.05) + 0), t, 0.5)
            place(drm, noise_hit(0.05, lo=6000, d=0.01, vol=0.5), t + b / 2, 0.4)
        for k, m in enumerate((72, 76, 79, 84)):
            place(mus, square(hz(m), 0.18, 0.25, 0.3, 0.3), end_t + 0.2 + k * 0.12, 0.4)
        place(mus, tri(hz(48), 2.0, 0.6, 2.0), end_t + 0.7, 0.5)

    elif preset == 'clay':        # marimba + woodblocks, cosy F major
        prog = [[53, 57, 60, 64], [58, 62, 65, 69], [60, 64, 67, 70], [53, 57, 60, 65]]
        for i, t, _ in beat_grid(length - 0.5, bpm * 2):
            c = chords_for(prog, t, bar)
            if i % 2 == 0 or i % 8 == 3:
                place(mus, base.pluck(hz(c[(i // 2) % 4] + 12), 0.8), t, 0.22, pan=-0.2)
            if i % 4 == 0:
                place(mus, base.pluck(hz(c[0]), 1.0), t, 0.3)
            if drop_t <= t < end_t:
                place(drm, woodblock(800 if i % 4 == 0 else 1200), t, 0.25 if i % 2 == 0 else 0.12, pan=0.3)
        place(mus, base.chord([53, 60, 65, 69], 2.5, 0.6, 0.5), end_t, 0.7)

    elif preset == 'anime':       # taiko + driving saw stabs, D minor, big
        prog = [[62, 65, 69], [58, 62, 65], [60, 64, 67], [57, 61, 64]]
        for i, t, _ in beat_grid(end_t, bpm):
            c = chords_for(prog, t, bar)
            if t >= drop_t:
                place(drm, base.kick(1.0), t, 0.55)
                if i % 2:
                    place(drm, base.snap(), t, 0.6)
                place(drm, hat(vol=1.3), t + b / 2, 0.6)
                for m in c:
                    place(mus, saw(hz(m), b * 0.45, det=12, vol=0.22, d=0.3, cut=3500), t + (b / 2 if i % 2 else 0), 0.35)
                place(mus, saw(hz(c[0] - 24), b * 0.9, vol=0.5, d=1.0, cut=600), t, 0.5)
            elif i % 2 == 0:
                place(drm, taiko(0.8), t, 0.5)
        place(drm, taiko(1.2), end_t, 0.7)
        place(mus, base.chord([62, 69, 74, 77], 2.5, 0.7, 0.6), end_t, 0.8)

    elif preset == 'vhs':         # cheesy 90s TV jingle: FM keys, cowbell-ish, bass
        prog = [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]]
        for i, t, _ in beat_grid(length - 0.3, bpm):
            c = chords_for(prog, t, bar)
            if i % 4 == 0:
                place(mus, base.chord(c, bar * 0.8, 0.7, 1.4), t, 0.9)
            place(mus, saw(hz(c[0] - 24), b * 0.5, vol=0.5, d=0.4, cut=900), t + (b / 2 if i % 2 else 0), 0.4)
            if t >= drop_t and t < end_t:
                place(drm, base.kick(0.8) if i % 2 == 0 else clap(), t, 0.5)
                place(drm, woodblock(1600), t + b / 2, 0.08, pan=0.4)

    elif preset == 'house':       # four-on-the-floor, offbeat hats, stab chords
        prog = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [55, 59, 62, 64]]
        for i, t, _ in beat_grid(end_t, bpm, drop_t):
            c = chords_for(prog, t, bar)
            place(drm, base.kick(1.0), t, 0.75)
            place(drm, hat(i % 4 == 3, 1.4), t + b / 2, 0.8, pan=0.25)
            if i % 2:
                place(drm, clap(), t, 0.55)
            if i % 4 in (1, 3):
                for m in c:
                    place(mus, saw(hz(m), b * 0.3, det=10, vol=0.2, d=0.2, cut=2600), t + b * 0.5, 0.35)
            place(mus, saw(hz(c[0] - 24), b * 0.4, vol=0.6, d=0.2, cut=500), t + b / 2, 0.5)
        place(mus, base.chord([57, 64, 69, 72], 2.4, 0.7, 0.8), end_t, 0.8)

    elif preset == 'synth':       # synthwave: saw arps, gated snare, pads
        prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
        for i, t, _ in beat_grid(length - 0.4, bpm * 4):
            c = chords_for(prog, t, bar)
            if t < end_t + 1:
                place(mus, saw(hz(c[i % 3] + 12), b / 4 * 0.8, vol=0.18, d=0.15, cut=3000), t, 0.4, pan=0.4 if (i // 2) % 2 else -0.4)
        for i, t, _ in beat_grid(length, bpm / 4):
            c = chords_for(prog, t, bar)
            pad = sum(saw(hz(m), bar, det=9, vol=0.12, a=0.4, d=6, cut=1500) for m in c)
            place(mus, pad, t, 0.6)
            place(mus, saw(hz(c[0] - 24), bar, vol=0.4, d=4, cut=400), t, 0.4)
        for i, t, _ in beat_grid(end_t, bpm, drop_t):
            place(drm, base.kick(0.9), t, 0.6) if i % 2 == 0 else place(drm, gated_snare(), t, 0.55)
            place(drm, hat(), t + b / 2, 0.5)

    elif preset == 'uke':         # light strummed plucks + claps, G major
        prog = [[55, 59, 62, 67], [52, 55, 59, 64], [60, 64, 67, 72], [62, 66, 69, 74]]
        for i, t, _ in beat_grid(length - 0.5, bpm * 2):
            c = chords_for(prog, t, bar)
            if i % 8 in (0, 3, 4, 6):
                for k, m in enumerate(c):
                    place(mus, ks(hz(m), 0.6, 0.6, 0.5), t + k * 0.012, 0.16, pan=-0.2 + k * 0.12)
            if drop_t <= t < end_t and i % 4 == 2:
                place(drm, clap(), t, 0.35)
            if drop_t <= t < end_t and i % 2:
                place(drm, hat(vol=0.6), t, 0.4)
        place(mus, base.bell(hz(79), 2.5), end_t + 0.2, 0.1)

    elif preset == 'paper':       # gentle piano, 3/4 waltz feel
        prog = [[57, 64, 69, 72], [53, 60, 65, 69], [55, 62, 67, 71], [52, 59, 64, 67]]
        b3 = 60 / bpm
        t = 0.0
        i = 0
        while t < length - 0.6:
            c = chords_for(prog, t, b3 * 3)
            if i % 3 == 0:
                place(mus, piano(hz(c[0] - 12), b3 * 2.5), t, 0.35)
            else:
                for m in c[1:]:
                    place(mus, piano(hz(m), b3 * 0.8), t, 0.12)
            if i % 6 == 0:
                place(mus, piano(hz(c[3] + 12), b3 * 2), t + b3 * 0.5, 0.12)
            t += b3
            i += 1

    elif preset == 'rag':         # ragtime upright: oom-pah left hand, syncopated right hand
        prog = [[48, 52, 55, 60], [53, 57, 60, 65], [55, 59, 62, 65], [48, 52, 55, 60]]
        mel = [76, 79, 81, 79, 76, 74, 72, 74, 76, 0, 79, 81, 84, 81, 79, 76]
        for i, t, _ in beat_grid(length - 0.4, bpm * 2):
            c = chords_for(prog, t, bar)
            if i % 2 == 0:
                if (i // 2) % 2 == 0:
                    place(mus, piano(hz(c[0] - 12), b * 0.4), t, 0.4)
                else:
                    for m in c[1:]:
                        place(mus, piano(hz(m), b * 0.35), t, 0.15)
            m = mel[i % 16]
            if m and t < end_t:
                place(mus, piano(hz(m), b * 0.35), t + (0.03 if i % 2 else 0), 0.22)
        n = len(mus[0])
        proj = np.zeros(n)
        for k in np.arange(0, length, 1 / 24):
            j = int(k * SR)
            proj[j:j + 60] += rng.standard_normal(min(60, n - j)) * 0.02
        mus += np.stack([proj, proj]) + np.stack([fft_filter(rng.standard_normal(n), lo=1000, hi=5000) * 0.006] * 2)

    elif preset == 'lofi':        # 84 BPM lofi: EP chords, swung drums, vinyl
        prog = [base.GMAJ7, base.BM9, base.A6, base.DMAJ9]
        for i, t, _ in beat_grid(length - 0.5, bpm / 4):
            place(mus, base.chord(chords_for(prog, t, bar), bar * 0.85, 0.7, 0.6), t, 0.8)
        for i, t, _ in beat_grid(end_t, bpm * 2, drop_t):
            sw = 0.04 if i % 2 else 0
            if i % 8 in (0, 5):
                place(drm, base.kick(0.8), t + sw, 0.6)
            if i % 8 in (2, 6):
                place(drm, base.snap(), t + sw, 0.45)
            place(drm, hat(vol=0.8), t + sw, 0.35, pan=0.3)
        vin = base.vinyl(length)
        mus += np.stack([vin, vin]) * 0.6

    elif preset == 'dhol':        # bhangra chaal on dhol + harmonium drone, A
        for i, t, _ in beat_grid(end_t, bpm * 2, drop_t):
            pat = i % 8
            if pat in (0, 3, 6):
                place(drm, dhol('dhum'), t, 0.6)
            if pat in (2, 4, 7):
                place(drm, dhol('crack'), t, 0.45, pan=0.2)
            if pat % 2 == 1:
                place(drm, ghungroo(), t, 0.5, pan=-0.3)
        for i, t, _ in beat_grid(length - 0.3, bpm / 4):
            place(mus, reed(hz(57), 60 / bpm * 4) + reed(hz(64), 60 / bpm * 4) * 0.7, t, 0.25)
        riff = [69, 72, 74, 76, 74, 72, 69, 67]
        for i, t, _ in beat_grid(end_t, bpm, drop_t):
            place(mus, reed(hz(riff[i % 8]), b * 0.8, 0.5), t, 0.18, pan=0.15)
        place(drm, dhol('dhum'), end_t, 0.8)

    elif preset == 'sitar':       # plucked drone + tabla theka, D
        drone = [50, 57, 62]
        for i, t, _ in beat_grid(length - 0.5, bpm / 2):
            place(mus, ks(hz(drone[i % 3]), 1.6, 0.85, 0.6, buzz=0.4), t, 0.18, pan=-0.3)
        mel = [62, 64, 66, 69, 71, 69, 66, 64]
        for i, t, _ in beat_grid(end_t, bpm / 2, 0.8):
            place(mus, ks(hz(mel[i % 8] + 12), 1.0, 0.9, 0.7, buzz=0.6), t, 0.2, pan=0.2)
        for i, t, _ in beat_grid(end_t, bpm * 2, drop_t):
            pat = i % 8
            if pat in (0, 5):
                place(drm, tabla('ge'), t, 0.5)
            if pat in (2, 3, 6, 7):
                place(drm, tabla('na'), t, 0.32, pan=0.15)
        place(mus, sfx('gong', {}), end_t, 0.5)

    elif preset == 'bubble':      # Y2K bubblegum pop: plucky saws, claps, sub
        prog = [[64, 68, 71], [61, 64, 68], [57, 61, 64], [59, 63, 66]]
        for i, t, _ in beat_grid(end_t, bpm * 2):
            c = chords_for(prog, t, bar)
            place(mus, saw(hz(c[i % 3] + 12), b / 2 * 0.6, det=14, vol=0.18, d=0.12, cut=5000), t, 0.4, pan=0.3 if i % 2 else -0.3)
        for i, t, _ in beat_grid(end_t, bpm, drop_t):
            c = chords_for(prog, t, bar)
            place(drm, base.kick(0.9), t, 0.6)
            if i % 2:
                place(drm, clap(), t, 0.5)
            place(drm, hat(vol=1.2), t + b / 2, 0.5)
            place(mus, np.sin(2 * np.pi * hz(c[0] - 24) * tt(int(b * SR))) * np.exp(-tt(int(b * SR)) * 3) * 0.6, t, 0.6)
        for k, m in enumerate((76, 80, 83, 88)):
            place(mus, sfx('bubble', {}), end_t + k * 0.09, 0.3)
        place(mus, base.bell(hz(88), 2.5), end_t + 0.4, 0.12)

    if preset == 'vhs':
        mus = wobble(mus, 0.004, 0.6)
        n = mus.shape[1]
        mus += np.stack([fft_filter(rng.standard_normal(n), lo=3000) * 0.01] * 2)
    return mus, drm


def main():
    cfg = json.load(open(sys.argv[1]))
    length, preset, bpm = float(cfg['len']), cfg['preset'], float(cfg.get('bpm') or 120)
    ev = cfg['events']
    N = int(length * SR)
    mus, drm = arrange(preset, length, bpm, ev)
    fx = np.zeros((2, N))
    for e in ev:
        s = sfx(e['type'], e)
        if s is not None:
            place(fx, s, e['t'], e.get('g', 0.6), pan=e.get('pan', 0.0))
    mix = mus * 0.85 + drm * 0.85 + fx
    mix = base.reverb(mix, 1.8, 0.14)
    fade = np.interp(np.arange(N) / SR, [0, 0.02, length - 1.2, length], [0, 1, 1, 0])
    mix *= fade
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)
    mix *= 0.89 / max(1e-6, np.abs(mix).max())
    pcm = (mix.T * 32767).astype(np.int16)
    with wave.open(sys.argv[2], 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f'Wrote {sys.argv[2]} ({length:.1f} s, {preset})')


if __name__ == '__main__':
    main()
