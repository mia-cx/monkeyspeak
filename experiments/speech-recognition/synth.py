# Builds prompt-like clips with known fillers, repetitions, corrections and pauses.
# Each spoken segment is synthesized separately and joined with exact silences.
# Needs: pip install piper-tts numpy, and the en_US-lessac-medium voice in voices/.
import json, subprocess, wave, numpy as np, os
HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = os.path.join(HERE, "voices", "en_US-lessac-medium.onnx")
OUT = os.path.join(HERE, "audio", "synth")
CLIPS = {
  "s1_correction": ["Build a habit tracker.", ("pause", 1.2), "Um, a habit tracker that, uh, lets people log daily habits.", ("pause", 1.5), "No, wait, weekly habits, and show a streak for each one."],
  "s2_repetition": ["Make a, a recipe app where users, users can save recipes", ("pause", 2.0), "and, like, filter them by ingredients they already have."],
  "s3_long_pause": ["Create a budgeting app for students.", ("pause", 3.0), "It should import bank transactions, group them by category, and warn before rent is due."],
}
SR = 16000
def tts(text):
    raw = subprocess.run(["python3", "-m", "piper", "-m", VOICE, "--output-raw"], input=text.encode(), capture_output=True, check=True).stdout
    a = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
    # piper lessac-medium is 22050 Hz; resample to 16 kHz
    n = int(len(a) * SR / 22050)
    a = np.interp(np.linspace(0, len(a) - 1, n), np.arange(len(a)), a).astype(np.float32)
    # trim to voiced region so segment boundaries are known
    idx = np.where(np.abs(a) > 0.01)[0]
    return a[idx[0]:idx[-1] + 1]
truth = {}
for name, parts in CLIPS.items():
    out, segs, t = [np.zeros(int(0.3 * SR), np.float32)], [], 0.3
    for p in parts:
        if isinstance(p, tuple):
            out.append(np.zeros(int(p[1] * SR), np.float32)); t += p[1]
        else:
            a = tts(p); segs.append({"text": p, "start": round(t, 3), "end": round(t + len(a) / SR, 3)}); out.append(a); t += len(a) / SR
    out.append(np.zeros(int(0.3 * SR), np.float32))
    pcm = (np.concatenate(out) * 32767).astype(np.int16)
    with wave.open(os.path.join(OUT, f"{name}.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    truth[name] = {"ref": " ".join(p for p in parts if isinstance(p, str)), "segments": segs, "duration": round(len(pcm) / SR, 3)}
json.dump(truth, open(os.path.join(OUT, "refs.json"), "w"), indent=1)
print(json.dumps(truth, indent=1))
