"""Original score for the MENVA brand intro: 120 BPM, D major, warm electric piano groove plus sound design.
Everything is synthesised here (nothing licensed, nothing muted by Instagram).

    python3 social/reels/intro/score.py cues.json out.wav

cues.json: {"len": 24, "bpm": 120, "events": [{"t": 0.5, "type": "pop"}, ...]} (written by make.mjs from the timeline).
Arrangement: bars 1-2 the menu (muffled keys, vinyl), 3-8 the table (drums drop at 4.0 s), 9 the iris (drums out),
10-12 the wordmark (one chord rings out).
"""
import json
import sys
import wave

import numpy as np

SR = 48000
rng = np.random.default_rng(5)
BEAT = 0.5
BAR = 2.0


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# chords per bar (MIDI), D major: Dmaj9, Bm9, Gmaj7, A6sus
DMAJ9 = [50, 57, 61, 64, 66]
BM9 = [47, 54, 57, 61, 62]
GMAJ7 = [43, 50, 54, 59, 62]
A6 = [45, 52, 54, 57, 62]
BARS = [DMAJ9, BM9, GMAJ7, A6, DMAJ9, BM9, GMAJ7, A6, GMAJ7, DMAJ9, DMAJ9, DMAJ9]


def tt(n):
    return np.arange(n) / SR


def place(mix, snd, at, gain=1.0, pan=0.0):
    if snd.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        snd = np.stack([snd * l * 1.414, snd * r * 1.414])
    k = int(round(at * SR))
    if k >= mix.shape[1]:
        return
    if k < 0:
        snd, k = snd[:, -k:], 0
    m = min(snd.shape[1], mix.shape[1] - k)
    mix[:, k:k + m] += snd[:, :m] * gain


def fft_filter(x, lo=None, hi=None):
    """Zero-phase band filter in the frequency domain (soft 1-octave edges)."""
    n = len(x)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    g = np.ones_like(f)
    if lo:
        g *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi:
        g *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * g, n)


# ---------- instruments ----------
def ep(f, dur, vel=0.8, bright=1.0):
    """FM electric piano: carrier + decaying modulator, a little tine on the attack."""
    n = int((dur + 1.6) * SR)
    t = tt(n)
    idx = bright * 1.7 * np.exp(-t * 3.2) + 0.12
    car = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    tine = np.sin(2 * np.pi * f * 14.02 * t) * np.exp(-t * 22) * 0.10 * bright
    env = (1 - np.exp(-t * 400)) * np.exp(-t * 1.25)
    rel = np.where(t > dur, np.exp(-(t - dur) * 9), 1.0)
    trem = 1 + 0.06 * np.sin(2 * np.pi * 4.6 * t)
    return (car + tine) * env * rel * trem * vel


def chord(notes, dur, vel=0.8, bright=1.0, spread=0.012):
    out = np.zeros((2, int((dur + 1.8) * SR)))
    for i, m in enumerate(notes):
        s = ep(hz(m), dur, vel * (0.75 if i == 0 else 1.0), bright)
        place(out, s, i * spread * 0.2, 0.22, pan=(i / (len(notes) - 1) - 0.5) * 0.7)
    return out


def pad(notes, dur, att=0.8):
    """Warm pad: detuned saws, low-passed, slow in and out."""
    n = int(dur * SR)
    t = tt(n)
    out = np.zeros((2, n))
    for i, m in enumerate(notes):
        for c, det in enumerate((-0.07, 0.07)):
            f = hz(m) * 2 ** (det / 12)
            ph = (f * t + rng.random()) % 1.0
            out[c] += (2 * ph - 1) * (0.8 if i else 0.6)
    out = np.stack([fft_filter(out[0], hi=1400), fft_filter(out[1], hi=1400)])
    env = np.minimum(1, t / att) * np.minimum(1, (dur - t) / 1.2).clip(0, 1)
    return out * env * 0.05


def bass(f, dur):
    n = int((dur + 0.3) * SR)
    t = tt(n)
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t) + 0.08 * np.sin(6 * np.pi * f * t)
    env = (1 - np.exp(-t * 220)) * np.exp(-t * 1.6) * np.where(t > dur, np.exp(-(t - dur) * 30), 1.0)
    return np.tanh(s * env * 1.4) * 0.9


def kick(big=1.0):
    n = int(0.5 * SR)
    t = tt(n)
    f = 46 + 110 * np.exp(-t * 32)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)
    click = rng.standard_normal(n) * np.exp(-t * 420) * 0.25
    return np.tanh((body + click) * 1.6 * big) * 0.9


def snap():
    n = int(0.35 * SR)
    t = tt(n)
    noise = fft_filter(rng.standard_normal(n), lo=1400, hi=7000)
    s = noise * (np.exp(-t * 38) + 0.6 * np.exp(-np.maximum(t - 0.011, 0) * 45) * (t > 0.011))
    body = np.sin(2 * np.pi * 210 * t) * np.exp(-t * 30) * 0.4
    return (s * 0.55 + body) * 0.7


def shaker(acc):
    n = int(0.09 * SR)
    t = tt(n)
    s = fft_filter(rng.standard_normal(n), lo=6000) * (1 - np.exp(-t * 900)) * np.exp(-t * 55)
    return s * (0.20 if acc else 0.11)


def hat_open():
    n = int(0.4 * SR)
    t = tt(n)
    return fft_filter(rng.standard_normal(n), lo=7000) * np.exp(-t * 9) * 0.10


# ---------- sound design ----------
def whoosh(dur=0.7, rise=False):
    n = int(dur * SR)
    p = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    # a sweeping band built from three fixed bands crossfaded along the move
    bands = [fft_filter(noise, lo=a, hi=b) for a, b in ((250, 900), (900, 3000), (3000, 9000))]
    a = (1 - p) if not rise else (1 - p) * 0.6
    c = p if rise else np.sin(np.pi * p)
    mid = np.sin(np.pi * p)
    s = bands[0] * a + bands[1] * mid + bands[2] * c * 0.6
    env = np.sin(np.pi * p) ** 1.6 if not rise else p ** 1.8 * (1 - np.exp(-(1 - p) * 40))
    return s * env * 0.9


def impact(big=1.0):
    n = int(1.4 * SR)
    t = tt(n)
    f = 36 + 70 * np.exp(-t * 10)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.0)
    thud = np.sin(2 * np.pi * 150 * t) * np.exp(-t * 26) * 0.4
    crack = fft_filter(rng.standard_normal(n), hi=3000) * np.exp(-t * 70) * 0.3
    return np.tanh((boom + thud + crack) * 1.3) * big


def sizzle(dur=1.6):
    """Hot plate on wood: sparse crackles over a soft hiss, fading out."""
    n = int(dur * SR)
    t = tt(n)
    hiss = fft_filter(rng.standard_normal(n), lo=3500, hi=12000) * 0.08
    pops = np.zeros(n)
    for _ in range(int(140 * dur)):
        k = rng.integers(0, n - 400)
        L = rng.integers(40, 260)
        pops[k:k + L] += rng.standard_normal(L) * np.exp(-np.arange(L) / (L / 4)) * rng.uniform(0.2, 1.0)
    pops = fft_filter(pops, lo=1800)
    env = (1 - np.exp(-t * 60)) * np.exp(-t * 1.6)
    return (hiss + pops * 0.35) * env


def pluck(f, dur=0.7, gain=1.0):
    """Soft marimba for caption landings."""
    n = int(dur * SR)
    t = tt(n)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 7) + 0.35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 26) + 0.12 * np.sin(2 * np.pi * f * 9.8 * t) * np.exp(-t * 60)
    return s * (1 - np.exp(-t * 900)) * gain


def bell(f, dur=3.0):
    n = int(dur * SR)
    t = tt(n)
    mod = np.sin(2 * np.pi * f * 3.5 * t) * 2.2 * np.exp(-t * 2.4)
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 1.5) * (1 - np.exp(-t * 600))


def beep():
    out = np.zeros(int(0.35 * SR))
    for k, (f, at) in enumerate(((1318.5, 0.0), (1760.0, 0.085))):
        n = int(0.16 * SR)
        t = tt(n)
        s = np.sin(2 * np.pi * f * t) * (1 - np.exp(-t * 500)) * np.exp(-t * 18)
        i = int(at * SR)
        out[i:i + n] += s
    return out * 0.5


def click():
    n = int(0.05 * SR)
    t = tt(n)
    return (np.sin(2 * np.pi * 1900 * t) * np.exp(-t * 150) + fft_filter(rng.standard_normal(n), lo=2500) * np.exp(-t * 300) * 0.5) * 0.6


def vinyl(dur):
    n = int(dur * SR)
    bed = fft_filter(rng.standard_normal(n), lo=800, hi=6000) * 0.012
    ticks = np.zeros(n)
    for k in rng.integers(0, n - 50, int(dur * 9)):
        ticks[k:k + 30] += rng.standard_normal(30) * np.exp(-np.arange(30) / 6) * rng.uniform(0.1, 0.5)
    return bed + fft_filter(ticks, lo=1500) * 0.5


def reverb(x, secs=2.2, wet=0.2):
    n = int(secs * SR)
    t = tt(n)
    ir = np.stack([rng.standard_normal(n), rng.standard_normal(n)]) * np.exp(-t * 6.5 / secs)
    ir[:, : int(0.012 * SR)] = 0
    ir = np.stack([fft_filter(ir[0], hi=7000), fft_filter(ir[1], hi=7000)])
    ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
    L = x.shape[1] + n
    N = 1 << int(np.ceil(np.log2(L)))
    y = np.stack([np.fft.irfft(np.fft.rfft(x[c], N) * np.fft.rfft(ir[c], N), N)[: x.shape[1]] for c in range(2)])
    return x + y * wet


def main():
    cues = json.load(open(sys.argv[1]))
    length = float(cues['len'])
    N = int(length * SR)
    music = np.zeros((2, N))
    drums = np.zeros((2, N))
    fx = np.zeros((2, N))

    # keys: muffled in the menu, open once the table appears
    for b, notes in enumerate(BARS):
        t0 = b * BAR
        if t0 >= length:
            break
        if b < 2:
            place(music, chord(notes, 1.8, 0.6, 0.4), t0, 1.25)
        elif b < 8:
            place(music, chord(notes, 0.65, 0.8, 1.0), t0, 1.0)
            place(music, chord(notes, 0.55, 0.62, 0.8), t0 + 0.75, 1.0)
            place(music, chord(notes, 0.4, 0.5, 0.7), t0 + 1.5, 0.9)
        elif b == 8:
            place(music, chord(notes, 1.9, 0.75, 0.7), t0, 1.0)
        elif b == 9:
            place(music, chord(notes + [69], 5.0, 0.8, 0.8), t0 - 0.5 + 0.0, 1.0)   # resolves under the dot's ting
    # bass from the drop
    for b in range(2, 9):
        root = BARS[b][0]
        t0 = b * BAR
        for at, m, d in ((0.0, root, 0.6), (0.75, root, 0.35), (1.5, root + 7, 0.4)):
            place(music, bass(hz(m - 12), d), t0 + at, 0.34)
    place(music, bass(hz(38), 3.5), 17.5, 0.3)
    # under the end card: a pad and two soft stabs keep it warm until the fade
    place(music, pad([50, 57, 61, 64, 66], length - 17.4, att=1.2), 17.4, 1.0)
    for at, v in ((20.0, 0.45), (22.0, 0.35)):
        place(music, chord(DMAJ9 + [69], 1.4, v, 0.5), at, 0.9)

    # drums 4.0-16.0, then a soft kick through the iris
    t = 4.0
    while t < 16.0 - 1e-6:
        beat = round((t - 4.0) / BEAT)
        pos = beat % 4
        if pos in (0, 2):
            place(drums, kick(), t, 0.8)
        if pos in (1, 3):
            place(drums, snap(), t, 0.55)
        for s16 in range(2):
            place(drums, shaker(s16 == 1), t + s16 * BEAT / 2, 1.0, pan=0.35)
        if pos == 3 and (beat // 4) % 2 == 1:
            place(drums, hat_open(), t + BEAT / 2, 1.0, pan=-0.2)
        t += BEAT
    for at in (16.0, 17.0):
        place(drums, kick(0.7), at, 0.55)

    # sidechain: the keys and bass breathe with the kick
    duck = np.ones(N)
    for k in np.arange(4.0, 16.0, 1.0):
        i = int(k * SR)
        m = min(int(0.4 * SR), N - i)
        duck[i:i + m] = np.minimum(duck[i:i + m], 1 - 0.38 * np.exp(-tt(m) * 9))
    music *= duck

    # sound design from the timeline's cues
    def chord_at(t):
        return BARS[min(int(t // BAR), len(BARS) - 1)]

    pop_n = 0
    for e in cues['events']:
        at, kind = e['t'], e['type']
        if kind == 'pop':
            notes = chord_at(at)
            m = notes[[4, 3, 2, 4][pop_n % 4]] + 24
            place(fx, pluck(hz(m), 0.8), at, 0.16, pan=0.1)
            pop_n += 1
        elif kind == 'whooshSoft':
            place(fx, whoosh(0.9), at - 0.1, 0.18)
        elif kind == 'peel':
            place(fx, fft_filter(whoosh(0.45), lo=1200), at, 0.32, pan=0.2)
        elif kind == 'riser':
            d = e.get('len', 1.0)
            place(fx, whoosh(d, rise=True), at, 0.3)
        elif kind == 'drop':
            place(fx, impact(0.8), at, 0.42)
        elif kind == 'phoneIn':
            place(fx, whoosh(0.65), at - 0.05, 0.26, pan=-0.1)
        elif kind == 'beep':
            place(fx, beep(), at, 0.32)
        elif kind == 'ui':
            for i, m in enumerate((86, 90, 93)):
                place(fx, pluck(hz(m), 0.6), at + i * 0.045, 0.07)
        elif kind == 'tap':
            place(fx, click(), at, 0.35)
        elif kind == 'whooshUp':
            place(fx, whoosh(1.0), at, 0.3)
            place(fx, whoosh(0.5, rise=True), at + 0.5, 0.18)
        elif kind == 'land':
            place(fx, impact(1.0), at, 0.55)
            place(fx, sizzle(1.8), at + 0.02, 0.5, pan=0.05)
        elif kind == 'zip':
            place(fx, fft_filter(whoosh(0.6, rise=True), lo=1500), at, 0.22)
        elif kind == 'iris':
            place(fx, whoosh(1.5, rise=True), at, 0.22)
        elif kind == 'ting':
            place(fx, bell(hz(86), 3.2), at, 0.16, pan=-0.05)
            place(fx, bell(hz(93), 3.2), at + 0.01, 0.10, pan=0.05)

    bed = vinyl(length)
    bed_env = np.interp(np.arange(N) / SR, [0, 3.8, 4.2, length], [1.0, 1.0, 0.35, 0.35])
    mix = music * 0.9 + drums * 0.85 + fx
    mix += np.stack([bed, bed]) * bed_env
    mix = reverb(mix, 2.2, 0.16)
    fade = np.interp(np.arange(N) / SR, [0, 0.03, length - 1.6, length], [0, 1, 1, 0])
    mix *= fade
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)
    mix *= 0.89 / max(1e-6, np.abs(mix).max())
    pcm = (mix.T * 32767).astype(np.int16)
    with wave.open(sys.argv[2], 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f'Wrote {sys.argv[2]} ({length:.1f} s)')


if __name__ == '__main__':
    main()
