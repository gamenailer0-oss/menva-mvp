"""Lay the recorded lines out in time and get mouth shapes for each one.

  python timeline.py <workdir> [--rhubarb path/to/rhubarb]

Reads script.json and <workdir>/lines/<id>-<take>.wav (the take named in <workdir>/takes.json, else 0).
Runs Rhubarb Lip Sync (MIT, phonetic recogniser, so it works for Urdu) on every line and writes
timeline.json next to this file: each line's start/end, its mouth cues (absolute seconds) and every event.
The film page and mix.py both read timeline.json, so picture and sound can never drift apart.
"""
import json, sys, pathlib, subprocess
import soundfile as sf

HERE = pathlib.Path(__file__).parent
S = json.loads((HERE / 'script.json').read_text())
work = pathlib.Path(sys.argv[1])
arg = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
rhubarb = arg('--rhubarb', str(work.parent / 'tools/Rhubarb-Lip-Sync-1.14.0-Linux/rhubarb'))
takes = json.loads((work / 'takes.json').read_text()) if (work / 'takes.json').exists() else {}

t, lines, events = 0.6, [], []          # 0.6 s of room tone before the first word
for l in S['lines']:
    f = work / 'lines' / f"{l['id']}-{takes.get(l['id'], 0)}.wav"
    a, sr = sf.read(f)
    # trim leading/trailing near-silence so pauses are exactly what the script says
    import numpy as np
    env = np.abs(a) > 0.01
    i0 = max(0, int(np.argmax(env)) - int(0.03 * sr)); i1 = min(len(a), len(a) - int(np.argmax(env[::-1])) + int(0.06 * sr))
    dur = (i1 - i0) / sr
    cue_json = work / 'lines' / f"{l['id']}.mouth.json"
    trimmed = work / 'lines' / f"{l['id']}.trim.wav"
    sf.write(trimmed, a[i0:i1], sr)
    subprocess.run([rhubarb, '-r', 'phonetic', '-f', 'json', '-q', '--extendedShapes', 'GHX', '-o', str(cue_json), str(trimmed)], check=True)
    mouth = [[round(t + c['start'], 3), c['value']] for c in json.loads(cue_json.read_text())['mouthCues']]
    lines.append({'id': l['id'], 'who': l['who'], 'ro': l['ro'], 't0': round(t, 3), 't1': round(t + dur, 3), 'wav': str(trimmed), 'mouth': mouth})
    for e in l.get('events', []):
        events.append({**e, 't': round(t + dur + e['at'], 3)})
    t += dur + l.get('after', 0.3)
end = round(t, 3)
out = {'lines': lines, 'events': sorted(events, key=lambda e: e['t']), 'end': end, 'dur': round(end + S['end'], 3)}
(HERE / 'timeline.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
print(f"{len(lines)} lines, talk ends {end:.1f}s, film {out['dur']:.1f}s")
