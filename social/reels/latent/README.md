# Bhook's Got Latent (claymation, about 67 s)

An original parody of a roast talent show. Invented cast: Fazi (deadpan host), Nusrat Aunty, Chacha, Vlogger Bhai, Pappu and Mehwish. No real show name, people or voices.

## Pipeline
Each step reads the one before it, so a voice change re-times the mouths, the shots and the mix together.

| Step | File | Output |
|---|---|---|
| Script | `script.json` | lines (Roman Urdu, Devanagari, Urdu), pauses, events |
| Voices | `voices.py <work> --engine kokoro\|parler\|chatterbox` | `<work>/lines/<id>-<take>.wav` |
| Timing + lip sync | `timeline.py <work>` (Rhubarb Lip Sync 1.14, phonetic) | `timeline.json` |
| Sound | `mix.py <work> <out.wav>` | dialogue, room, laughs, applause, effects, -14 LUFS |
| Picture | `../films/latent.html` (three.js, 12 drawings/s) | read by the film engine |
| Render | `node ../films/engine.mjs latent --audio <out.wav>` | `../out/film-latent.mp4` + cover |

Pick a different take for a line with `<work>/takes.json`, e.g. `{"rota": 2}`.

## Tools (all open source, installed outside the repo)
- Kokoro 82M (Apache 2.0): model files from the kokoro-onnx GitHub release; `pip install kokoro-onnx`.
- Indic Parler-TTS (Apache 2.0) and Chatterbox Multilingual (MIT): need `huggingface.co`, `*.huggingface.co` and `*.hf.co` allowed in the environment's network settings. Install them in separate venvs (their pins conflict).
- Rhubarb Lip Sync (MIT): Linux release zip from GitHub.

## Swapping to the more natural voices
```
python voices.py <work> --engine parler --takes 3     # Urdu script, each voice from its text description
python voices.py <work> --engine chatterbox --takes 3 # Hindi model, reference = our own Parler take in <work>/refs/<who>.wav
# listen, write <work>/takes.json, then:
python timeline.py <work> && python mix.py <work> <work>/latent.wav
node ../films/engine.mjs latent --audio <work>/latent.wav
```
Never feed Chatterbox a recording of a real person.
