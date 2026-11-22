# One-round prototype

Disposable experiment supporting [issue #7](https://github.com/mia-cx/monkeyspeak/issues/7): does a complete think → prompt → feedback round feel useful? This is not production UI or an accepted scoring decision.

From this directory, run `node serve.mjs`, then open http://localhost:8766. Node 22 recommended. No install is needed to play. Internet access is needed for the speech model's first load; Typing works without it. Localhost supports microphone access. Use `PORT=8000 node serve.mjs` for another port.

Choose Speech or Typing, start, and stop when finished. The clock includes thinking and stops at 90 seconds. Speech loads Moonshine Base in the background on WASM; Tiny is selectable. Model downloads can take a minute. No microphone or a failed download leaves Typing available. Silence below −45 dB for at least 0.5 seconds splits utterances; a 12-second safety split and token limit reduce long-audio loops. Think time comes from audio energy (typing: first input), not recognition output. Speak time is the interval from first input to stop, including pauses. Audio stays in memory and is discarded after recognition.

`rubric.js` contains every draft tunable and pure scoring functions. Factors retain full precision until the final half-up score rounding. `grader.js` is an async mock: replace `grade({challenge, transcript})` with a real grader returning four 0–4 dimensions, exclusive character-offset `duplicatedSpans`, and `manipulation`. Keyword and repeated-phrase heuristics are deliberately crude; they do not establish recognition or grading accuracy.

`recognizers/moonshine.js` exports `defaultModel` (one line to select Tiny) and the model IDs. Swap the `Moonshine` import in `app.js` for another recognizer with async `start(optionalStream)` and `stop()` returning `{transcript, firstSpeechAt}`; the timestamp uses `performance.now()`, or null for no speech. Timing and grading remain separate. The server sends COOP and COEP `credentialless` for CDN-loaded multi-threaded WASM.

Personal bests are stored per mode in localStorage under `monkeyspeak-round-prototype-v1`. Voiding a round restores the best remaining eligible result. Nothing is uploaded by the app; model assets come from jsDelivr and Hugging Face.

Run `node --test` for the six draft worked examples, ranking, empty input, manipulation and eligibility boundaries. `npm install` installs only the optional Playwright browser-check dependency.
