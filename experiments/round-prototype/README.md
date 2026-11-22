# One-round prototype

Disposable experiment for [issue #7](https://github.com/mia-cx/monkeyspeak/issues/7): does a complete think → prompt → feedback round feel useful? This is not production UI or an accepted scoring decision.

## Run

From this directory:

```sh
node serve.mjs
```

Open http://localhost:8766. Node 22 recommended; no install needed. Use `PORT=8000 node serve.mjs` for another port.

Speech downloads model assets from jsDelivr and Hugging Face. Typing works without those downloads. The server sends COOP and COEP `credentialless` headers for multi-threaded WASM; localhost supports microphone access.

Run `node --test` for the six draft worked examples, ranking, empty input, manipulation and eligibility boundaries.

## Play

Choose Speech or Typing, start, and stop when finished. Thinking time counts. The round stops automatically at 90 seconds.

Moonshine Base loads in the background on WASM; Tiny is selectable. Downloads can take a minute. If loading fails or no microphone is available, use Typing.

Think time comes from audio energy, or the first input in Typing. Speak time runs from first input to stop, including pauses.

During a speech round, the app only records audio and tracks first speech. After Stop, it splits the full recording at silences below −45 dB lasting at least 0.5 seconds, then transcribes the segments sequentially. A 12-second safety split and token limit reduce long-audio loops. Transcription and grading latency do not count toward elapsed time.

Personal bests are stored per mode in localStorage under `monkeyspeak-round-prototype-v1`. Voiding restores the best remaining eligible result. Audio stays in memory; the app uploads no recordings or prompts.

## Swap

### Rubric

Edit the tunable values in `rubric.js`. Its pure functions keep full precision until the final half-up score rounding.

### Grader

Replace async `grade({challenge, transcript})` in `grader.js`. Return four 0–4 `dimensions`, `duplicatedSpans` with exclusive character offsets, and a `manipulation` flag.

### Recognizer

The selection line near the top of `app.js` is:

```js
const SpeechRecognizer = Moonshine;
```

Import a replacement and set that line to its class. The constructor receives the selected model key and a progress callback. Expose a `ready` promise, async `start(optionalStream)`, async `stop()` returning `{transcript, firstSpeechAt}`, and async `dispose()` to release model resources when switching recognizers. Use a `performance.now()` timestamp, or null for no speech. Timing and grading remain separate.

For Moonshine, change `defaultModel` in `recognizers/moonshine.js` to select Tiny by default. Model IDs are in the same file.

## What is mocked

The grader uses keyword and repeated-phrase heuristics, not a model. Its grades do not establish recognition or grading accuracy, and unrelated prompts can receive overly generous grades.

Speech recognition is real, local Moonshine inference. The rubric values are an unaccepted draft, kept easy to replace.
