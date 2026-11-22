# Prototype check

Desktop Chrome over CDP at `http://localhost:29229`; page at `http://localhost:8766`. Played a full Typing round with worked example 1, using browser automation to fill and stop immediately. The resulting speed bonus reflects the automated input, not the example's 32-second timing. Screenshot: `browser-results.png`.

```text
Score 141
Elapsed T 0.1 s · Think 0.0 s · Speak 0.0 s
Usefulness U 94 · Duplication D 0.0% · Quality Q 94.00 · Speed S 1.50
completeness: 4/4
clarity: 4/4
actionability: 3/4
scopeControl: 4/4
Mock grades. Highlighted words repeat earlier content.
```

The panel displayed the full example 1 transcript. No page or console errors were reported. Background model loading completed:

```text
Moonshine base ready (WASM), 3283 ms; isolated=true
ERRORS: []
```

`node --test`:

```text
✔ draft exact worked-example arithmetic (unrounded factors) (0.724825ms)
✔ mock grader preserves six-example ranking and qualification (2.581403ms)
✔ empty input, manipulation, cap, void and speed boundaries (0.25741ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 52.664427
```

Live microphone transcription, Tiny loading, phone layout, and the 90-second automatic stop were not exercised in the browser. The grader is a mock; unrelated prompts can receive overly generous grades.
