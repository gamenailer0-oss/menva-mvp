"""Sound design for the Escape the menu Reels. Everything is synthesised here, so nothing is licensed or muted.

    python3 social/reels/sfx.py '<timeline json>' out.wav

timeline: {"len": 11.5, "events": [{"t": 0.02, "type": "impact"}, {"t": 3.8, "type": "whoosh"}, ...]}
types: impact (landing hit), whoosh (a transition passing), riser (builds up to t), lock (the riddle clicks in),
       suck (the clock stops just before a hit), end (the last tick).
Under it all runs a ticking clock and a slow double heartbeat: the escape-room clock.
"""
import json
import sys
import wave

import numpy as np

SR = 44100
rng = np.random.default_rng(7)


def env_exp(n, rate):
    return np.exp(-np.arange(n) / SR * rate)


def svf_bandpass(x, fc, q=2.0):
    """State-variable band-pass whose centre frequency can change every sample (fc: array)."""
    y = np.zeros_like(x)
    low = band = 0.0
    f = 2 * np.sin(np.pi * np.clip(fc, 20, SR / 6) / SR)
    damp = 1.0 / q
    for i in range(len(x)):
        high = x[i] - low - damp * band
        band += f[i] * high
        low += f[i] * band
        y[i] = band
    return y


def impact(big=1.0):
    n = int(SR * 1.2)
    t = np.arange(n) / SR
    freq = 38 + 80 * np.exp(-t * 9)                     # pitch drops fast: the "boom"
    boom = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * 3.2)
    thud = np.sin(2 * np.pi * 170 * t) * np.exp(-t * 28) * 0.5
    crack = rng.standard_normal(n) * np.exp(-t * 90) * 0.35
    crack = np.convolve(crack, np.ones(6) / 6, mode='same')  # soften the click
    s = (boom + thud + crack) * big
    return np.stack([s, s])


def whoosh(dur=0.7):
    n = int(SR * dur)
    p = np.linspace(0, 1, n)
    fc = 350 * (14 ** np.sin(np.pi * p))               # sweeps up to ~5 kHz and back down
    s = svf_bandpass(rng.standard_normal(n), fc, q=3.0) * np.sin(np.pi * p) ** 2 * 1.1
    pan = p                                               # travels left to right, like the slide
    return np.stack([s * np.cos(pan * np.pi / 2), s * np.sin(pan * np.pi / 2)]) * 0.55


def riser(dur=1.4):
    n = int(SR * dur)
    p = np.linspace(0, 1, n)
    noise = svf_bandpass(rng.standard_normal(n), 700 * (12 ** p), q=1.5) * p ** 2.2 * 0.8
    tone = np.sin(2 * np.pi * np.cumsum(180 * (5 ** p)) / SR) * p ** 3 * 0.25
    s = noise + tone
    return np.stack([s, s])


def lock():
    n = int(SR * 0.35)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for start, amp in ((0.0, 0.8), (0.07, 1.0)):          # two-part latch: click, CLACK
        k = int(start * SR)
        tt = t[: n - k]
        metal = sum(np.sin(2 * np.pi * f * tt) for f in (2300, 3450, 5150)) / 3
        out[k:] += (metal * np.exp(-tt * 55) + rng.standard_normal(n - k) * np.exp(-tt * 160) * 0.4) * amp
    return np.stack([out, out]) * 0.55


def tick(high):
    n = int(SR * 0.06)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * (1650 if high else 1250) * t) * np.exp(-t * 95) + rng.standard_normal(n) * np.exp(-t * 300) * 0.15
    return np.stack([s * (0.9 if high else 0.6), s * (0.6 if high else 0.9)]) * 0.22


def heartbeat():
    n = int(SR * 0.45)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for start, amp in ((0.0, 1.0), (0.22, 0.7)):
        k = int(start * SR)
        tt = t[: n - k]
        s[k:] += np.sin(2 * np.pi * 55 * tt) * np.exp(-tt * 22) * amp
    return np.stack([s, s]) * 0.35


def place(mix, snd, at, gain=1.0):
    k = int(at * SR)
    if k >= mix.shape[1]:
        return
    if k < 0:
        snd, k = snd[:, -k:], 0
    m = min(snd.shape[1], mix.shape[1] - k)
    mix[:, k:k + m] += snd[:, :m] * gain


def room(x, wet=0.18):
    """A small room so the hits don't sound dry: a few feedback delays."""
    y = x.copy()
    for d, g in ((0.029, 0.5), (0.047, 0.4), (0.071, 0.3), (0.113, 0.22)):
        k = int(d * SR)
        tail = np.zeros_like(x)
        tail[:, k:] = x[:, :-k] * g
        y += tail * wet
    return y


def main():
    tl = json.loads(sys.argv[1])
    length = float(tl['len'])
    n = int(SR * length)
    bed = np.zeros((2, n))
    fx = np.zeros((2, n))

    # When the clock stops (a "suck" before a hit), the bed goes quiet for that window.
    silent = [(e['t'], e['t'] + e.get('dur', 0.45)) for e in tl['events'] if e['type'] == 'suck']
    quiet = lambda at: any(a <= at < b for a, b in silent)
    end_at = next((e['t'] for e in tl['events'] if e['type'] == 'end'), length)
    k = 0
    at = 0.25
    while at < end_at:
        if not quiet(at):
            place(bed, tick(k % 2 == 0), at)
        at += 0.5
        k += 1
    at = 0.6
    while at < end_at - 0.3:
        if not quiet(at):
            place(bed, heartbeat(), at)
        at += 1.0

    for e in tl['events']:
        t, kind = e['t'], e['type']
        if kind == 'impact':
            place(fx, impact(e.get('big', 1.0)), t)
        elif kind == 'whoosh':
            d = e.get('dur', 0.7)
            place(fx, whoosh(d), t - d / 2)
        elif kind == 'riser':
            d = e.get('dur', 1.4)
            place(fx, riser(d), t - d)
        elif kind == 'lock':
            place(fx, lock(), t)
        elif kind == 'end':
            place(fx, tick(True) * 2.2, t)
            place(fx, impact(0.35), t + 0.02)

    # A low tension drone under everything, so there is never dead air (it ducks under each hit).
    t = np.arange(n) / SR
    drone = (0.5 * np.sin(2 * np.pi * 55 * t) + 0.3 * np.sin(2 * np.pi * 82.4 * t) + 0.18 * np.sin(2 * np.pi * 110.6 * t)) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.5 * t))
    duck = np.ones(n)
    for e in tl['events']:
        if e['type'] == 'impact':
            k = int(e['t'] * SR)
            m = min(int(SR * 0.6), n - k)
            if m > 0:
                duck[k:k + m] = np.minimum(duck[k:k + m], 0.3 + 0.7 * np.linspace(0, 1, m))
        if e['type'] == 'suck':
            a, b = int(e['t'] * SR), min(n, int((e['t'] + e.get('dur', 0.45)) * SR))
            duck[a:b] = np.minimum(duck[a:b], 0.35)
    bed = bed + np.stack([drone, drone]) * 0.12 * duck
    fx = room(fx)
    # Balance: the clock bed sits well under the hits; the hits are the loudest thing in the Reel.
    bed *= 0.32 / max(1e-6, np.abs(bed).max())
    fx *= 0.85 / max(1e-6, np.abs(fx).max())
    mix = np.tanh((bed + fx) * 1.4) / np.tanh(1.4)   # a soft limiter: loud, never clipping
    fade_in = int(SR * 0.02)
    mix[:, :fade_in] *= np.linspace(0, 1, fade_in)
    fade_out = int(SR * 0.6)
    mix[:, -fade_out:] *= np.linspace(1, 0, fade_out)
    mix *= 0.95 / max(1e-6, np.abs(mix).max())
    pcm = (mix.T * 32767).astype('<i2')
    with wave.open(sys.argv[2], 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    main()
