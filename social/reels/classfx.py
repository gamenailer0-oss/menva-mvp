"""Sound for the "Madam ki Class" Reels: Madam's voice on top, every visual beat hit with an effect,
and a low bed underneath that ducks whenever she speaks. All effects are synthesised (see sfx.py).

    python3 social/reels/classfx.py '<json>' out.wav
json: {"len": 14.2, "voice": [{"t": 0.2, "file": "a.wav"}], "tick": [[7.0, 11.5]], "events": [{"t": 0.1, "type": "whack"}, ...]}
types: bell, whack, stamp, pop, chalk (dur), scribble, whoosh, riser (ends at t), impact, lock
"""
import json
import sys
import wave

import numpy as np

from sfx import SR, rng, svf_bandpass, impact, whoosh, riser, lock, tick, place, room


def read_wav(path):
    with wave.open(path, 'rb') as w:
        ch, sw, sr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        data = np.frombuffer(w.readframes(n), dtype='<i2' if sw == 2 else '<i4').astype(np.float64)
    data = data.reshape(-1, ch).T / (32768.0 if sw == 2 else 2147483648.0)
    if ch == 1:
        data = np.vstack([data, data])
    if sr != SR:  # simple resample
        x = np.linspace(0, 1, data.shape[1]); xi = np.linspace(0, 1, int(data.shape[1] * SR / sr))
        data = np.vstack([np.interp(xi, x, data[0]), np.interp(xi, x, data[1])])
    return data


def bell():
    """A school hand-bell: inharmonic partials, a fast shimmer, a long-ish ring."""
    n = int(SR * 1.3)
    t = np.arange(n) / SR
    s = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, a, d in ((1180, 1.0, 3.5), (2890, 0.55, 5), (4420, 0.35, 7), (6200, 0.2, 9)))
    s *= 0.75 + 0.25 * np.sin(2 * np.pi * 18 * t)      # the clapper rattling
    return np.stack([s * 0.9, s]) * 0.45


def whack():
    """A wooden ruler slapped on a desk: a sharp crack plus a hollow wood knock."""
    n = int(SR * 0.5)
    t = np.arange(n) / SR
    crack = rng.standard_normal(n) * np.exp(-t * 70)
    crack = crack - np.convolve(crack, np.ones(8) / 8, mode='same')   # keep the bright part
    knock = (np.sin(2 * np.pi * 420 * t) + 0.6 * np.sin(2 * np.pi * 690 * t)) * np.exp(-t * 30)
    body = np.sin(2 * np.pi * 95 * t) * np.exp(-t * 14)
    s = crack * 1.2 + knock * 0.6 + body * 0.7
    return np.stack([s, s])


def stamp():
    n = int(SR * 0.6)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * (70 + 60 * np.exp(-t * 30)) * t) * np.exp(-t * 11) + rng.standard_normal(n) * np.exp(-t * 60) * 0.3
    return np.stack([s, s]) * 0.9


def pop():
    n = int(SR * 0.05)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * (900 - 5000 * t) * t) * np.exp(-t * 90)
    return np.stack([s, s]) * 0.18


def chalk(dur):
    """Chalk on a board: bright noise in short, uneven strokes."""
    n = int(SR * dur)
    x = svf_bandpass(rng.standard_normal(n), np.full(n, 4200.0), q=1.2)
    grains = np.zeros(n)
    at = 0
    while at < n:
        L = int(SR * rng.uniform(0.06, 0.18))
        g = np.hanning(max(8, L)) * rng.uniform(0.5, 1.0)
        grains[at:at + len(g)] += g[: n - at]
        at += L + int(SR * rng.uniform(0.01, 0.05))
    s = x * grains * 1.6
    return np.stack([s * 0.8, s])


def scribble():
    """A red marker circling: a short, squeaky rising stroke."""
    n = int(SR * 0.35)
    p = np.linspace(0, 1, n)
    s = svf_bandpass(rng.standard_normal(n), 1800 + 2500 * p, q=4) * np.sin(np.pi * p) * 1.4
    return np.stack([s, s])


def main():
    tl = json.loads(sys.argv[1])
    n = int(SR * float(tl['len']))
    fx = np.zeros((2, n))
    bed = np.zeros((2, n))
    vox = np.zeros((2, n))

    for v in tl.get('voice', []):
        place(vox, read_wav(v['file']), v['t'], v.get('gain', 1.0))

    for e in tl['events']:
        t, k = e['t'], e['type']
        snd = {'bell': bell, 'whack': whack, 'stamp': stamp, 'pop': pop, 'scribble': scribble, 'lock': lock}.get(k)
        if snd:
            place(fx, snd(), t, e.get('gain', 1.0))
        elif k == 'chalk':
            place(fx, chalk(e['dur']), t, e.get('gain', 0.8))
        elif k == 'whoosh':
            place(fx, whoosh(e.get('dur', 0.5)), t - e.get('dur', 0.5) / 2, e.get('gain', 1.0))
        elif k == 'riser':
            place(fx, riser(e.get('dur', 1.0)), t - e.get('dur', 1.0), e.get('gain', 0.8))
        elif k == 'impact':
            place(fx, impact(e.get('big', 1.0)), t, e.get('gain', 1.0))

    # The exam clock: ticking only while the riddle is on the board.
    for a, b in tl.get('tick', []):
        at, i = a, 0
        while at < b:
            place(bed, tick(i % 2 == 0) * 1.6, at)
            at += 0.5
            i += 1
    # A low drone so there is never dead air.
    t = np.arange(n) / SR
    drone = (0.5 * np.sin(2 * np.pi * 55 * t) + 0.3 * np.sin(2 * np.pi * 82.4 * t)) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.5 * t))
    bed += np.stack([drone, drone]) * 0.05

    # Ducking: everything under Madam drops while she speaks.
    env = np.abs(vox[0])
    win = int(SR * 0.08)
    env = np.convolve(env, np.ones(win) / win, mode='same')
    speaking = np.clip(env / (env.max() + 1e-9) * 8, 0, 1)
    duck = 1 - 0.55 * speaking

    if np.abs(vox).max() > 0:
        vox *= 0.8 / np.abs(vox).max()
    fx = room(fx)
    if np.abs(fx).max() > 0:
        fx *= 0.8 / np.abs(fx).max()
    if np.abs(bed).max() > 0:
        bed *= 0.28 / np.abs(bed).max()
    mix = vox + (fx * (0.45 + 0.55 * duck)) + bed * duck
    mix = np.tanh(mix * 1.3) / np.tanh(1.3)
    fi, fo = int(SR * 0.01), int(SR * 0.25)
    mix[:, :fi] *= np.linspace(0, 1, fi)
    mix[:, -fo:] *= np.linspace(1, 0, fo)
    mix *= 0.95 / max(1e-6, np.abs(mix).max())
    with wave.open(sys.argv[2], 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix.T * 32767).astype('<i2').tobytes())


if __name__ == '__main__':
    main()
