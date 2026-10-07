"""Record every line of script.json with an open-source TTS model, on CPU.

  python voices.py <workdir> [--engine kokoro|parler|chatterbox] [--only id,id] [--takes 3]

Writes <workdir>/lines/<id>-<take>.wav (mono, 24 kHz). Never clones a real voice: Kokoro uses its stock voices,
Parler builds each voice from the text description in script.json, Chatterbox is fed a Parler take as its reference.
Kokoro model files: <workdir>/../tts/kokoro-v1.0.onnx + voices-v1.0.bin (GitHub release, Apache 2.0).
"""
import json, os, sys, pathlib
import numpy as np, soundfile as sf

HERE = pathlib.Path(__file__).parent
S = json.loads((HERE / 'script.json').read_text())
work = pathlib.Path(sys.argv[1]); (work / 'lines').mkdir(parents=True, exist_ok=True)
arg = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
engine = arg('--engine', 'kokoro'); takes = int(arg('--takes', '1'))
only = set(arg('--only', '').split(',')) - {''}
lines = [l for l in S['lines'] if not only or l['id'] in only]
SR = 24000

def save(l, k, a, sr):
    a = np.asarray(a, dtype=np.float32).squeeze()
    if sr != SR:
        from scipy.signal import resample_poly
        a = resample_poly(a, SR, sr).astype(np.float32)
    sf.write(work / 'lines' / f"{l['id']}-{k}.wav", a, SR)
    print(engine, l['id'], k, f'{len(a) / SR:.2f}s', flush=True)

if engine == 'kokoro':
    from kokoro_onnx import Kokoro
    tts = pathlib.Path(arg('--models', str(work.parent / 'tts')))
    K = Kokoro(str(tts / 'kokoro-v1.0.onnx'), str(tts / 'voices-v1.0.bin'))
    for l in lines:
        v, speed = S['cast'][l['who']]['kokoro']
        for k in range(takes):
            a, sr = K.create(l['hi'], voice=v, speed=speed * (1 + 0.04 * (k - takes // 2)), lang='hi')
            save(l, k, a, sr)

elif engine == 'parler':   # ai4bharat/indic-parler-tts, Apache 2.0, Urdu script in, voice from a description
    import torch
    from parler_tts import ParlerTTSForConditionalGeneration
    from transformers import AutoTokenizer
    torch.set_num_threads(os.cpu_count())
    name = 'ai4bharat/indic-parler-tts'
    model = ParlerTTSForConditionalGeneration.from_pretrained(name).eval()
    tok, dtok = AutoTokenizer.from_pretrained(name), AutoTokenizer.from_pretrained(model.config.text_encoder._name_or_path)
    for l in lines:
        desc = S['cast'][l['who']]['parler']
        for k in range(takes):
            torch.manual_seed(1000 + k)
            d, p = dtok(desc, return_tensors='pt'), tok(l.get(arg('--script', 'ur'), l['ur']), return_tensors='pt')
            with torch.no_grad():
                a = model.generate(input_ids=d.input_ids, attention_mask=d.attention_mask, prompt_input_ids=p.input_ids,
                                   prompt_attention_mask=p.attention_mask, do_sample=True, temperature=0.9)
            save(l, k, a.cpu().numpy(), model.config.sampling_rate)

elif engine == 'chatterbox':   # Resemble AI Chatterbox Multilingual, MIT; reference = our own Parler take of that character
    import torch
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    torch.set_num_threads(os.cpu_count())
    m = ChatterboxMultilingualTTS.from_pretrained(device='cpu')
    refs = pathlib.Path(arg('--refs', str(work / 'refs')))
    for l in lines:
        ref = refs / f"{l['who']}.wav"
        for k in range(takes):
            torch.manual_seed(2000 + k)
            a = m.generate(l['hi'], language_id='hi', audio_prompt_path=str(ref) if ref.exists() else None,
                           exaggeration=0.35 if l['who'] == 'fazi' else 0.6, cfg_weight=0.4)
            save(l, k, a.cpu().numpy(), m.sr)
else:
    sys.exit('unknown engine ' + engine)
