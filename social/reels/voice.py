"""Madam's voice: one WAV per line, with Kokoro (open-source TTS, Hindi voices; Urdu and Hindi sound the same
spoken). Lines are written in Devanagari because that is what the Hindi voice reads best.

    KOKORO_DIR=/path/with/kokoro-v1.0.onnx+voices-v1.0.bin python3 social/reels/voice.py '<json>' outdir
json: {"voice": "hf_beta", "speed": 1.12, "lines": [{"id": "l1", "text": "..."}]}
prints {"l1": seconds, ...}. Each line is tightened (silence trimmed), lifted a little in pitch and compressed
so it cuts through like a stern teacher on a phone speaker.
"""
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

cfg = json.loads(sys.argv[1])
out = sys.argv[2]
os.makedirs(out, exist_ok=True)
d = os.environ.get('KOKORO_DIR', '.')
k = Kokoro(os.path.join(d, 'kokoro-v1.0.onnx'), os.path.join(d, 'voices-v1.0.bin'))
ff = subprocess.check_output(['python3', '-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).decode().strip()
res = {}
for line in cfg['lines']:
    s, sr = k.create(line['text'], voice=line.get('voice', cfg.get('voice', 'hf_beta')), speed=line.get('speed', cfg.get('speed', 1.12)), lang='hi')
    raw = os.path.join(out, line['id'] + '.raw.wav')
    sf.write(raw, s, sr)
    dst = os.path.join(out, line['id'] + '.wav')
    pitch = line.get('pitch', 1.04)
    af = (f"silenceremove=start_periods=1:start_threshold=-40dB,areverse,silenceremove=start_periods=1:start_threshold=-40dB,areverse,"
          f"asetrate={int(sr * pitch)},aresample=44100,atempo={1 / pitch:.4f},highpass=f=120,"
          f"acompressor=threshold=-20dB:ratio=4:attack=5:release=60,volume=2")
    subprocess.run([ff, '-y', '-loglevel', 'error', '-i', raw, '-af', af, '-ar', '44100', dst], check=True)
    info = sf.info(dst)
    res[line['id']] = round(info.frames / info.samplerate, 3)
    os.remove(raw)
print(json.dumps(res))
