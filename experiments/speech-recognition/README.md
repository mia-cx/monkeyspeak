# Speech recognition in the browser

Research for [issue 4](https://github.com/mia-cx/monkeyspeak/issues/4): which local browser speech recognition suits short spoken prompting rounds on desktop and phones. This directory is a standalone experiment and is not part of the app.

## Recommendation

Try **Moonshine Base** (`onnx-community/moonshine-base-ONNX`, MIT, 67 MB) through Transformers.js on the WASM backend, with **Moonshine Tiny** (32 MB) as the fallback for low-memory phones. Cut the recording into utterances at pauses with a voice activity detector before recognition, and measure every timing from the recorded audio, not from the transcript.

It was the only small, permissively licensed model here that kept most fillers and repetitions on real conversational speech (18 of 24 fillers, 14 of 18 repetitions), with the lowest error rate of the permissive models and well under real time on CPU. Whisper models normalise fillers away unless prompted, and even prompted they keep fewer than half. The Web Speech API is not an option for phones: on-device mode is desktop-only, and the cloud mode dropped every filler.

## Comparison

Measured on the 14 real conversational clips (AMI) and 3 synthetic prompt clips described under [Procedure](#procedure). Node CPU unless marked browser.

| Candidate | Licence | Download | Peak memory | Speed (RTF) | Error rate (AMI) | Fillers kept | Repetitions kept | Timestamps |
|---|---|---|---|---|---|---|---|---|
| Moonshine Tiny | MIT | 32 MB | 515 MB | 0.032 (browser 0.034) | 0.177 | 19/24 | 15/18 | none |
| **Moonshine Base** | MIT | 67 MB | 588 MB | 0.054 (browser 0.056) | **0.169** | **18/24** | **14/18** | none |
| Whisper tiny.en | MIT | 44 MB | 666 MB | 0.065 (browser 0.111) | 0.266 | 1/24 | 8/18 | segment, word |
| Whisper base.en | MIT | 80 MB | 841 MB | 0.111 (browser 0.177) | 0.237 | 2/24 | 6/18 | segment, word |
| Whisper base.en, filler prompt | MIT | 80 MB | 890 MB | 0.104 | 0.175 | 11/24 | 11/18 | segment, word |
| Whisper small.en | MIT | 252 MB | 1.4 GB | 0.202 | 0.232 | 2/24 | 4/18 | segment, word |
| Whisper small.en, filler prompt | MIT | 252 MB | 1.4 GB | 0.244 | 0.161 | 10/24 | 11/18 | segment, word |
| Whisper large-v3-turbo (q4) | MIT | 762 MB | 2.8 GB | 0.658 | 0.248 | 2/24 | 3/18 | segment, word |
| CrisperWhisper 2.0 turbo (q4) | non-commercial research | 1.0 GB | 2.5 GB | 0.551 | 0.132 | 20/24 | 19/18 | word (claimed) |
| Parakeet CTC 0.6B (int8) | CC BY 4.0 | 613 MB | 955 MB | 0.048 | 0.398 | 2/24 | 10/18 | none in pipeline |
| Wav2Vec2 base 960h | Apache 2.0 | 95 MB | 741 MB | 0.046 | 0.659 | 2/24 | 5/18 | none in pipeline |
| Web Speech API, cloud (Chrome) | browser service | none | n/a | streaming | 0.263 | 0/24 | 10/18 | per result only |
| Web Speech API, on-device (Chrome) | browser service | language pack | unknown | unknown | not measured | unknown | unknown | per result only |

RTF is processing time divided by audio length, so 0.05 means a 10 second answer takes half a second. Error rate is word error rate against the verbatim AMI reference after lowercasing, removing punctuation and mapping filler spellings (`umm`, `[UM]`) to one form. "Repetitions kept" counts immediate one- and two-word repeats in the output; it can exceed the reference when a model stutters (`a- a- a-`). Peak memory is the Node process; the browser tab peaked at 692 to 877 MB for the four models run there.

CrisperWhisper is the most verbatim model tested, but its licence rules it out for a product and it is too large for phones. It remains useful as a reference transcriber for building test sets.

## What each finding rests on

### Measured here

- **Device:** cloud VM, Intel Xeon, 8 vCPU, 32 GB RAM, no GPU, Ubuntu Linux. Node 22.11 with Transformers.js 4.3.2 and onnxruntime-node 1.30 (CPU). Browser runs in Chrome for Testing 156.0.8078.47 on the same VM, onnxruntime-web WASM, 8 threads, cross-origin isolated.
- **Moonshine breaks on long audio.** Fed a 93 second round in one piece, Moonshine looped and repeated earlier sentences (error rate 1.97 base, 1.89 tiny). Split at pauses of 0.5 s or more with a simple energy detector, the same audio scored 0.242 (base) and 0.26 (tiny) and took 3.6 s and 1.9 s in total. Whisper base.en with 30 s chunking handled the whole round (0.196). Moonshine therefore needs utterance segmentation, which the game wants anyway for pause measurement. See `results/node-long.jsonl`.
- **Whisper cleans speech.** Without a prompt, every Whisper size dropped almost all fillers from real speech and many repetitions (`all these all these um things are are nicked` became `all these things that are nicked`). A prompt written in disfluent style raised base.en from 2 to 11 fillers kept. Whisper tiny.en also hallucinated a looped `That's it. That's it. That's it.` on one clip.
- **Synthetic clips are too easy.** Every model except Wav2Vec2 and Parakeet transcribed the clean synthetic clips almost perfectly, fillers included. Only the real AMI speech separated the candidates.
- **Pauses come from audio, not text.** An energy detector on the waveform found every synthetic pause to within 0.01 s (1.19 for 1.2, 1.51 for 1.5, 2.00, 3.00). Whisper word timestamps (`whisper-base.en_timestamped`) placed segment starts 0.08 to 0.22 s late, measured the pauses at 0.9 to 3.18 s against the true 1.2 to 3.0 s, and reported one 0.7 s pause that was not there. See `results/node-pauses.jsonl` and `results/node-timestamps.jsonl`.
- **Web Speech on-device mode exists but did not install here.** Chrome 156 reported `SpeechRecognition` unprefixed, `processLocally`, and `available({ langs: ["en-US"], processLocally: true })` as `downloadable`. `install()` started a download that stayed at `downloading` for more than 30 minutes and never settled, and recognition with `processLocally = true` failed with `language-not-supported`. This may be specific to Chrome for Testing on a VM.
- **Web Speech cloud mode drops fillers.** With `processLocally = false`, the same Chrome sent all 17 clips to Google's service (fed through `start(MediaStreamTrack)`, no microphone). It kept 0 of 24 fillers and 10 of 18 repetitions, with an error rate of 0.263 on AMI; `Um, a habit tracker` came back as `on a habit tracker`. Final results arrived only when recognition was stopped. Full output: `results/browser-webspeech-cloud.json`, scored with `node score-webspeech.mjs results/browser-webspeech-cloud.json`.
- **No WebGPU numbers.** The VM has no GPU, so WebGPU returned no adapter. Once the WebGPU backend failed, the same page could not fall back to WASM; the harness opens a fresh page per run.

### Documentation claims, not verified here

- **Web Speech on-device support is desktop only.** MDN's compatibility data (BCD 8.1.10) lists `processLocally`, `available()` and `install()` in Chrome and Edge 139 and Firefox 160 on desktop, and not in Chrome for Android, Firefox for Android, Safari, iOS Safari or Samsung Internet ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally), [Chrome status](https://chromestatus.com/feature/6090916291674112)). Without `processLocally`, the [specification](https://webaudio.github.io/web-speech-api/) lets the browser send audio to a server. Mozilla and WebKit standards positions on on-device recognition are positive.
- **Web Speech timestamps are per result.** The specification gives each result `speechStartTime` and `speechEndTime`, not word times; word-level timestamps are a Chrome proposal ([Chrome status](https://chromestatus.com/feature/5811907077472256)).
- **WebGPU on phones.** BCD lists WebGPU in Chrome for Android 121, Safari and iOS Safari 26, and Samsung Internet 25, and not in Firefox for Android. On Linux desktop Chrome it lists only Intel Gen12+ GPUs.
- **Whisper word timestamps** need a model exported with alignment heads (the `_timestamped` ONNX exports) ([Transformers.js](https://github.com/huggingface/transformers.js)).
- **Moonshine** is designed for short, variable-length audio on edge devices; its streaming variants are MIT-licensed but not supported by the Transformers.js speech pipeline today ([Moonshine streaming tiny](https://huggingface.co/moonshine-ai/moonshine-streaming-tiny)).
- **CrisperWhisper** claims verbatim transcription with `[UM]`, `[UH]` and `[laughter]` tags and word timings, under a non-commercial research licence ([model card](https://huggingface.co/nyralabs/CrisperWhisper2.0_small), [ONNX export](https://huggingface.co/Masterx/CrisperWhisper2.0-turbo-ONNX), [docs](https://github.com/nyrahealth/CrisperWhisper/blob/main/DOCS.md)).

### Unknown

- Speed, memory and stability on real phones. No phone was available. The probe page is ready for it (see below); the open questions are WASM speed on a mid-range Android phone, iOS Safari's tab memory limit with a 67 MB model, and WebGPU on phones.
- Moonshine word timestamps. The pipeline returns text only.
- How Moonshine treats self-corrections in real speech. The synthetic correction (`No, wait, weekly habits`) survived, but real corrections were not separately labelled.
- On-device Web Speech output once a language pack installs, and its behaviour on fillers.
- Accents, noisy rooms and phone microphones. The AMI clips are headset recordings from one meeting corpus.

## Recognition errors versus speaker performance

Recognition errors are measured against a human reference on fixed clips, as in this directory. Speaker performance is measured on the speaker's own round. Keeping them apart needs three rules:

1. Keep the original audio for every round, so a disputed score can be rechecked.
2. Take timing from the audio: time to first word, total speaking time, pause count and length, and speech rate (words from the transcript over voiced time from the audio). A transcript has no pauses, and model timestamps drift by tenths of a second and invent gaps.
3. Treat transcript-based counts as estimates bounded by the model's measured retention. With Moonshine Base keeping about 75% of fillers and 78% of repetitions, a filler count is a lower bound. Duplication and usefulness grading can use the transcript, but a repetition the model invented (a hallucinated loop) must not count against the speaker; segmenting at pauses and capping output length per second of audio prevent the loops seen here.

## Procedure

Requires Node 22 and npm. Audio is included; `synth.py` regenerates the synthetic clips with [Piper](https://github.com/rhasspy/piper) (`pip install piper-tts numpy`, voice `en_US-lessac-medium` in `voices/`).

```sh
npm install
node bench.mjs moonshine-base      # one candidate per process; writes results/node-<name>.json
node long.mjs onnx-community/moonshine-base-ONNX   # 93 s round, whole vs. split at pauses
node timestamps.mjs                # Whisper word timestamps vs. known pauses
node pauses.mjs                    # pauses from the audio alone
```

`node bench.mjs` with no argument lists the candidates. Models download from Hugging Face on first use.

### Browser and phones

```sh
npm run build:web
npm run serve                      # http://localhost:8765/web/
```

The page runs a chosen model on WASM or WebGPU over the bundled clips, records 10 s from the microphone and transcribes it, and checks Web Speech support. It reports load time, first inference, RTF and transcripts, and stores everything in `window.probeResult`. Open the page on a phone through any HTTPS tunnel; the server sends the cross-origin isolation headers that multi-threaded WASM needs. `web/drive.mjs` and `web/webspeech.mjs` drive the page in a desktop Chrome over the DevTools protocol (`node web/drive.mjs http://localhost:9222 moonshine-base@wasm`).

### Test audio

- `audio/ami/`: 14 clips of 4 to 10 s from the [AMI Meeting Corpus](https://groups.inf.ed.ac.uk/ami/corpus/) individual headset test split (CC BY 4.0), via the [Hugging Face dataset](https://huggingface.co/datasets/edinburghcstr/ami), chosen for fillers and repetitions. `refs.json` holds the verbatim reference transcripts.
- `audio/synth/`: 3 synthetic prompt answers with known fillers, repetitions, a correction and exact pauses of 1.2 to 3 s. `refs.json` holds the text and segment times.
