"""The soundtrack for "Bhook's Got Latent": dialogue in a small studio, dead silences that are never empty,
a canned laugh that is obviously canned, and one real laugh at the end.

  python mix.py <workdir> [out.wav]      (default out: latent.wav next to this file)

Everything is synthesised here or recorded by voices.py, so nothing is licensed or muted:
  - room: a synthetic small-studio impulse response, per-character mic colour and pan, constant room tone + AC hum
  - laughter: each audience member is a little voice model (glottal pulses through /a/ formants with breath),
    "ha" syllables with falling pitch; 30 to 45 of them, spread in time and space. The FAKE laugh starts in unison,
    is band-limited like an old TV laugh track with hiss, and cuts off hard. The REAL laugh is ragged, full-band, with
    applause (hundreds of filtered noise claps) and a slow natural decay.
  - effects: cough, snore, chair creak, crickets, button click, plate slide, scan beep, score hits, buzzer, ding, sip
  - music: a short talent-show sting on the title and a soft pad under the end card
Reads timeline.json (built by timeline.py) so it lines up with the picture to the sample.
"""
import json, sys, pathlib
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly

HERE = pathlib.Path(__file__).parent
TL = json.loads((HERE / 'timeline.json').read_text())
work = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else HERE / 'latent.wav'
SR = 48000
N = int(TL['dur'] * SR) + SR
mixL, mixR = np.zeros(N), np.zeros(N)
rnd = np.random.default_rng(7)

def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, 'highpass', fs=SR, output='sos'), x)
def lp(x, f, order=2): return sosfilt(butter(order, f, 'lowpass', fs=SR, output='sos'), x)
def env(n, a=0.005, r=0.05):
    e = np.ones(n); ai, ri = max(1, int(a * SR)), max(1, int(r * SR))
    e[:ai] = np.linspace(0, 1, ai); e[-ri:] *= np.linspace(1, 0, ri); return e
def put(x, t, pan=0.0, g=1.0):
    i = int(t * SR); x = np.asarray(x) * g
    if i >= N: return
    x = x[: N - i]; l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    mixL[i:i + len(x)] += x * l * 1.41; mixR[i:i + len(x)] += x * r * 1.41
def db(v): return 10 ** (v / 20)

# ---------- room ----------
def room_ir(rt60=0.45, n_early=14, seed=1):
    r = np.random.default_rng(seed); n = int(rt60 * 1.6 * SR)
    t = np.arange(n) / SR
    tail = r.standard_normal(n) * np.exp(-6.9 * t / rt60); tail = lp(tail, 6500); tail[: int(0.012 * SR)] = 0
    for k in range(n_early):
        d = int((0.004 + r.random() * 0.03) * SR); tail[d] += (r.random() * 0.6 + 0.2) * (1 if r.random() > 0.5 else -1)
    tail /= np.sqrt(np.sum(tail ** 2)); return tail
IR = room_ir(); IR_BIG = room_ir(0.8, 20, 3)
def verb(x, wet=0.15, ir=None):
    w = fftconvolve(x, IR if ir is None else ir)[: len(x) + len(IR)]
    y = np.zeros(len(w)); y[: len(x)] += x * (1 - wet); return y + w * wet * 2.2

# ---------- dialogue ----------
MIC = {  # (highpass, presence gain, lowpass, reverb wet, pan, level dB)
    'fazi':    (90, 0.10, 11000, 0.10, -0.22, -1.0),
    'aunty':   (130, 0.06, 8500, 0.17, 0.30, -2.5),
    'vlog':    (140, 0.08, 9000, 0.17, 0.38, -2.5),
    'pappu':   (100, 0.12, 10500, 0.14, 0.05, -1.5),
    'mehwish': (100, 0.12, 10500, 0.14, 0.05, -1.5),
}
def load(path):
    a, sr = sf.read(path); a = a if a.ndim == 1 else a.mean(1)
    return resample_poly(a, SR, sr) if sr != SR else a
def voice(a, who):
    h, pres, l, wet, pan, lev = MIC[who]
    a = hp(a, h); a = a + bp(a, 2500, 5000) * pres * 4; a = lp(a, l)
    pk = np.max(np.abs(a)) + 1e-9; a = np.tanh(a / pk * 1.6) / np.tanh(1.6) * pk     # gentle mic-pre saturation
    a = a / (np.sqrt(np.mean(a ** 2)) + 1e-9) * 0.075
    return verb(a, wet), pan, db(lev)
for l in TL['lines']:
    a, pan, g = voice(load(l['wav']), l['who']); put(a, l['t0'], pan, g)

# ---------- one voice laughing: glottal pulses -> /a/ formants + breath ----------
FORM = [(800, 80, 1.0), (1200, 90, 0.5), (2500, 120, 0.25), (3500, 200, 0.1)]
def resonator(x, f, bw):
    from scipy.signal import lfilter
    r = np.exp(-np.pi * bw / SR); th = 2 * np.pi * f / SR
    return lfilter([1 - r], [1, -2 * r * np.cos(th), r * r], x)
def laugher(r, f0=200, scale=1.0, n_syll=6, rate=5.2, energy=1.0, chuckle=False):
    syl = 1 / rate; dur = n_syll * syl + 0.35; n = int(dur * SR); src = np.zeros(n); breath = np.zeros(n)
    for k in range(n_syll):
        t0 = k * syl + r.normal(0, 0.012); on = syl * (0.55 if not chuckle else 0.4)
        i0, i1 = int(t0 * SR), int((t0 + on) * SR)
        if i0 < 0 or i1 >= n: continue
        f = f0 * (1.12 - 0.35 * k / n_syll) * (1 + r.normal(0, 0.03))
        ph = np.cumsum(np.full(i1 - i0, f / SR)) % 1.0
        pulse = (ph < 0.6) * np.sin(np.pi * ph / 0.6) ** 2 - 0.25   # Rosenberg-ish glottal pulse
        e = np.sin(np.linspace(0, np.pi, i1 - i0)) ** 0.7 * (1 - 0.55 * k / n_syll)
        src[i0:i1] += pulse * e
        bi0 = max(0, i0 - int(0.03 * SR)); breath[bi0:i1] += r.standard_normal(i1 - bi0) * 0.25 * np.linspace(1, 0.3, i1 - bi0)
    y = np.zeros(n)
    for f, bw, g in FORM: y += resonator(src, f * scale * (1 + r.normal(0, 0.04)), bw * scale) * g
    y += bp(breath, 900 * scale, 4500) * 0.6                                     # aspiration on every "h"
    if r.random() < 0.5:                                                         # an in-breath at the end
        k = int(0.25 * SR); i = n - k - 10; y[i:i + k] += bp(r.standard_normal(k), 1200, 4000) * np.sin(np.linspace(0, np.pi, k)) * 0.12
    return hp(y, 120) / (np.max(np.abs(y)) + 1e-9) * energy

def crowd_laugh(dur, count, spread, seed, real=True):
    r = np.random.default_rng(seed); n = int(dur * SR) + SR; L, Rr = np.zeros(n), np.zeros(n)
    for p in range(count):
        female = r.random() < 0.45
        f0 = r.uniform(210, 330) if female else r.uniform(105, 175); sc = r.uniform(1.08, 1.2) if female else r.uniform(0.92, 1.02)
        t = r.uniform(0, spread) if real else abs(r.normal(0, 0.035))             # canned laughs start together
        tt = t
        while tt < dur - 0.3:
            y = laugher(r, f0, sc, n_syll=int(r.integers(3, 9)), rate=r.uniform(4.2, 6.4), energy=r.uniform(0.4, 1.0), chuckle=r.random() < 0.3)
            pan = r.uniform(-0.9, 0.9); dist = r.uniform(0.4, 1.0)
            i = int(tt * SR); y = y[: n - i]
            L[i:i + len(y)] += y * dist * np.cos((pan + 1) * np.pi / 4); Rr[i:i + len(y)] += y * dist * np.sin((pan + 1) * np.pi / 4)
            tt += len(y) / SR + r.uniform(0.05, 0.5 if real else 0.15)
            if not real and tt > dur * 0.85: break
    return L[: int(dur * SR)], Rr[: int(dur * SR)]
def applause(dur, count=40, seed=5):
    r = np.random.default_rng(seed); n = int(dur * SR); L, Rr = np.zeros(n), np.zeros(n)
    clap_len = int(0.012 * SR)
    for p in range(count):
        rate = r.uniform(3.2, 5.0); t = r.uniform(0, 0.5); pan = r.uniform(-0.9, 0.9); lo = r.uniform(700, 1400)
        while t < dur:
            i = int(t * SR); k = min(clap_len, n - i)
            if k <= 0: break
            c = bp(r.standard_normal(clap_len), lo, lo * 2.6)[:k] * np.exp(-np.arange(k) / (0.0025 * SR)) * r.uniform(0.5, 1)
            L[i:i + k] += c * np.cos((pan + 1) * np.pi / 4); Rr[i:i + k] += c * np.sin((pan + 1) * np.pi / 4)
            t += 1 / rate + r.normal(0, 0.012)
    return L, Rr
def put2(LR, t, g=1.0, fade=None):
    L, Rr = LR; i = int(t * SR); k = min(len(L), N - i)
    e = np.ones(k)
    if fade: e = np.minimum(1, np.linspace(1, 0, k) ** fade[0] * fade[1] + (1 - fade[1]))
    mixL[i:i + k] += L[:k] * g * e; mixR[i:i + k] += Rr[:k] * g * e

def canned(dur, seed):
    L, Rr = crowd_laugh(dur + 0.2, 32, 0.1, seed, real=False)
    L, Rr = (bp(x, 320, 3600, 3) for x in (L, Rr))                                 # TV-speaker band
    wob = 1 + 0.004 * np.sin(2 * np.pi * 0.9 * np.arange(len(L)) / SR)
    hiss = lp(rnd.standard_normal(len(L)), 9000) * 0.015
    L, Rr = L * wob + hiss, Rr * wob + hiss
    k = int(dur * SR); L, Rr = L[:k], Rr[:k]; a = int(0.04 * SR)
    for x in (L, Rr): x[:a] *= np.linspace(0, 1, a); x[-int(0.004 * SR):] *= np.linspace(1, 0, int(0.004 * SR))   # hard cut
    pk = max(np.max(np.abs(L)), np.max(np.abs(Rr))) + 1e-9; return L / pk, Rr / pk

# ---------- room tone that never stops (so silence is "dead", not empty) ----------
tn = np.arange(N) / SR
tone = lp(np.cumsum(rnd.standard_normal(N)) * 0.02, 400) ; tone = hp(tone, 40) * 0.6
hum = sum(np.sin(2 * np.pi * 50 * h * tn) / h for h in (1, 2, 3)) * 0.0025
ac = bp(rnd.standard_normal(N), 200, 2500) * 0.0045
tone = (tone / (np.max(np.abs(tone)) + 1e-9)) * 0.008 + hum + ac
endT = TL['end']; tone[int(endT * SR):] *= np.exp(-np.arange(N - int(endT * SR)) / (0.6 * SR))
mixL += tone; mixR += tone * 0.97

# ---------- effects ----------
def cough(r):
    out = []
    for k in range(2):
        n = int(r.uniform(0.12, 0.2) * SR); x = bp(r.standard_normal(n), 300, 3200) * env(n, 0.004, 0.08) * np.exp(-np.arange(n) / (0.07 * SR))
        f = r.uniform(130, 180); x += np.sin(2 * np.pi * f * np.arange(n) / SR) * 0.25 * np.exp(-np.arange(n) / (0.05 * SR))
        out.append(x); out.append(np.zeros(int(0.09 * SR)))
    return np.concatenate(out) * 0.8
def creak(r, d=0.45):
    n = int(d * SR); x = np.zeros(n); t = 0
    while t < d - 0.01:
        i = int(t * SR); x[i] = r.uniform(0.5, 1); t += 1 / r.uniform(28, 70)
    y = sum(resonator(x, f, 40) for f in (620, 1100, 1750)) * 0.4
    return y * env(n, 0.02, 0.1)
def snore(d=1.3):
    n = int(d * SR); t = np.arange(n) / SR
    buzz = np.sign(np.sin(2 * np.pi * 70 * t)) * 0.3 * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t))
    x = lp(buzz + rnd.standard_normal(n) * 0.4, 700) * np.sin(np.pi * t / d) ** 2
    return x * 0.5
def crickets(d):
    n = int(d * SR); x = np.zeros(n); t = 0.05
    while t < d - 0.1:
        for k in range(3):
            i = int((t + k * 0.03) * SR); m = int(0.016 * SR)
            if i + m < n: x[i:i + m] += np.sin(2 * np.pi * 4600 * np.arange(m) / SR) * np.sin(np.pi * np.arange(m) / m)
        t += 0.38
    return x * 0.18
def click(): n = int(0.05 * SR); return bp(rnd.standard_normal(n), 1500, 6000) * np.exp(-np.arange(n) / (0.004 * SR)) + np.sin(2 * np.pi * 180 * np.arange(n) / SR) * np.exp(-np.arange(n) / (0.01 * SR)) * 0.6
def slide(): n = int(0.55 * SR); x = bp(rnd.standard_normal(n), 300, 2000) * np.sin(np.linspace(0, np.pi, n)) * 0.25; m = int(0.25 * SR); clink = np.sin(2 * np.pi * 2900 * np.arange(m) / SR) * np.exp(-np.arange(m) / (0.05 * SR)) * 0.25; x[-m:] += clink; return x
def beep(): n = int(0.09 * SR); t = np.arange(n) / SR; return (np.sin(2 * np.pi * 1760 * t) + np.sin(2 * np.pi * 2637 * t) * 0.5) * env(n, 0.003, 0.03) * 0.25
def sparkle(): n = int(0.9 * SR); t = np.arange(n) / SR; return sum(np.sin(2 * np.pi * f * t) * np.exp(-(t - d) * 6) * (t >= d) for f, d in ((1568, 0), (2093, 0.08), (2637, 0.16), (3136, 0.24))) * 0.06
def hit(f=220): n = int(0.35 * SR); t = np.arange(n) / SR; return (np.sin(2 * np.pi * f * t) * np.exp(-t * 9) + lp(rnd.standard_normal(n), 900) * np.exp(-t * 30) * 0.6) * 0.35
def buzzer(): n = int(0.75 * SR); t = np.arange(n) / SR; x = (2 * ((110 * t) % 1) - 1) + (2 * ((116 * t) % 1) - 1); return lp(x, 2500) * env(n, 0.01, 0.08) * 0.12
def ding(): n = int(1.6 * SR); t = np.arange(n) / SR; return sum(np.sin(2 * np.pi * f * t) * np.exp(-t * k) * g for f, k, g in ((1318.5, 2.2, 1), (2637, 3.5, 0.4), (3951, 5, 0.15))) * 0.18
def sip(): n = int(0.55 * SR); t = np.arange(n) / SR; x = bp(rnd.standard_normal(n), 500, 3000) * np.sin(np.pi * t / 0.55) ** 3; return x * 0.12
def sting():   # cheesy talent-show brass hit: stacked saws, quick swell, falls off
    n = int(1.5 * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for f in (196, 246.9, 293.7, 392, 493.9):
        x += sum(np.sin(2 * np.pi * f * h * t) / h for h in range(1, 7)) * 0.12
    return lp(x, 3200) * np.minimum(1, t / 0.03) * np.exp(-t * 2.2) * 0.32
def pad(d):
    n = int(d * SR); t = np.arange(n) / SR; x = sum(np.sin(2 * np.pi * f * t + np.sin(2 * np.pi * 0.2 * t)) for f in (130.8, 196, 261.6, 329.6)) * 0.035
    return lp(x, 2000) * np.minimum(1, t / 0.8) * np.minimum(1, (d - t) / 1.2)

r = np.random.default_rng(11)
put(sting(), 0.45, 0, 0.55)
EV = TL['events']
for e in EV:
    t = e['t']; ty = e['type']
    if ty == 'cough': put(verb(cough(r), 0.35, IR_BIG), t, r.uniform(-0.6, 0.6), 0.55)
    elif ty == 'creak': put(verb(creak(r), 0.3), t, 0.45, 0.4)
    elif ty == 'snore': put(verb(snore(), 0.2), t, 0.3, 0.4)
    elif ty == 'cricket': put(verb(crickets(e.get('len', 1.2)), 0.3, IR_BIG), t, -0.3, 0.16)
    elif ty == 'burger': put(slide(), t - 0.25, 0.25, 0.7)
    elif ty == 'haso':
        put(click(), t - 0.05, -0.25, 0.5)
        put2(canned(e['len'], int(t * 10)), t, 0.47)
    elif ty == 'chachaLaugh':
        rr = np.random.default_rng(3); y = np.concatenate([laugher(rr, 120, 0.93, n_syll=1, rate=2.0, energy=0.9), np.zeros(int(0.12 * SR)), laugher(rr, 112, 0.93, n_syll=1, rate=2.0, energy=0.7)])
        put(verb(y, 0.17), t, 0.3, 0.09)
    elif ty == 'score':
        for k in range(3): put(hit(196 if e['v'] != [10, 10, 10] else 330), t + k * 0.32, 0, 0.6)
    elif ty == 'buzzer': put(buzzer(), t, 0, 0.8)
    elif ty == 'ding': put(ding(), t, 0, 0.9)
    elif ty == 'scan': put(beep(), t, 0.05, 0.8)
    elif ty == 'dish': put(sparkle(), t, 0.05, 0.9)
    elif ty == 'gasp':
        L2, R2 = crowd_laugh(1.2, 18, 0.25, 21, real=True); put2((verb(lp(L2, 1800), 0.3)[: len(L2)] * 0.5, verb(lp(R2, 1800), 0.3)[: len(R2)] * 0.5), t, 0.05)
    elif ty == 'realLaugh':
        d = e['len'] + 2.4
        L2, R2 = crowd_laugh(d, 44, 0.7, 31, real=True); A = applause(d, 46)
        dec = np.minimum(1, np.exp(-(np.arange(len(L2)) / SR - e['len']) * 1.4))
        L2, R2 = verb(L2, 0.32, IR_BIG)[: len(L2)] * dec, verb(R2, 0.32, IR_BIG)[: len(R2)] * dec
        pk = max(np.max(np.abs(L2)), np.max(np.abs(R2))) + 1e-9
        put2((L2 / pk, R2 / pk), t, 0.25); put2((A[0] * dec, A[1] * dec), t + 0.35, 0.14)
    elif ty == 'sip': put(sip(), t, -0.22, 0.6)
put(pad(TL['dur'] - endT), endT, 0, 0.9)
put(ding(), endT + 1.0, 0, 0.35)

# ---------- master: loudness to about -14 LUFS, true-peak under -1 dBFS ----------
y = np.stack([mixL, mixR], 1)[: int(TL['dur'] * SR)]
try:
    import pyloudnorm as pyln
    meter = pyln.Meter(SR); lufs = meter.integrated_loudness(y); y = y * db(-14 - lufs)
except Exception as e: print('loudness skipped:', e)
pk = np.max(np.abs(y)); lim = db(-1.0)
if pk > lim * 0.7: y = np.where(np.abs(y) > lim * 0.7, np.sign(y) * (lim * 0.7 + lim * 0.3 * np.tanh((np.abs(y) - lim * 0.7) / (lim * 0.3))), y)   # soft knee, never over -1 dBFS
sf.write(out, y.astype(np.float32), SR)
print(f'wrote {out} ({len(y) / SR:.1f}s)')
