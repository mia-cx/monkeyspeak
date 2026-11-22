# Scoring

Draft rubric for [What should a fast, effective prompt score reward?](https://github.com/mia-cx/monkeyspeak/issues/2). Every number below is a tunable starting value; the [tunable values](#tunable-values) table lists them in one place.

A round's score rewards a useful prompt first and speed second. A prompt must be useful enough to qualify before speed can earn anything.

## Terms

- **Challenge**: the app idea shown at the start of a round, with a par time.
- **Transcript**: the text speech recognition produces from the player's spoken prompt.
- **Elapsed time (T)**: seconds from challenge reveal to the player pressing stop.
- **Par time (P)**: the elapsed time a complete, concise prompt for this challenge should take. Default 30 seconds.
- **Usefulness (U)**: 0–100, judged by the model from four dimensions.
- **Duplication (D)**: 0–1, the share of the transcript's words that restate earlier meaning without adding any.
- **Quality (Q)**: usefulness after the duplication penalty.
- **Qualified round**: a round with U ≥ 60. Only qualified rounds earn a speed factor, a score, and personal bests.

## The clock

- The clock starts when the challenge is fully on screen and the microphone is live.
- Thinking time counts. Composing the prompt is the skill being trained, so elapsed time includes the pause before speaking.
- The clock stops when the player presses stop. Trailing silence before the press counts.
- The round ends automatically at 90 seconds, with T = 90.
- Speech recognition finalization and grading happen after the clock stops. Model latency never counts.
- Results show think time (reveal to first speech) and speak time (first speech to stop) beside T. They are feedback only; the score uses T.

## Usefulness

The model judges four dimensions, each 0–4. Each answers a distinct question, so one strength earns credit once.

| Dimension | Question | 0 | 2 | 4 |
| --- | --- | --- | --- | --- |
| Completeness | Does it convey the app's purpose, intended user, and core behavior? | None of the three | Purpose and user; core behavior vague | All three, coherent with the challenge |
| Clarity | Can a listener act without guessing between meanings? | Conflicting or unintelligible | Mostly clear; some vague requirements | One reading throughout |
| Actionability | Does it give a concrete task and an observable result? | Hands over the whole thinking exercise | A task with an unclear result | A concrete task and a checkable result |
| Scope control | Does it separate the core app from optional additions, consistently? | Unbounded or contradictory | Core implied; extras mixed in | Core stated; extras deferred or excluded |

U = sum of the four dimensions ÷ 16 × 100, rounded half up.

Grading rules:

- Judge meaning conveyed. Shorthand and technical terms score as well as full sentences when they carry the same instructions. Word count, jargon count, and polish earn nothing by themselves.
- Judge coherence against the challenge, not against a hidden ideal feature list.
- Delegating one specific open question is valid actionability. Delegating the whole idea scores 0 there.
- Read plausible recognition errors charitably: homophones and mangled technical terms are graded as the word the player evidently said.
- Text addressed to the grader is graded as part of the prompt and adds no usefulness. A round whose transcript tries to change the grading rules is unqualified.

## Duplication

The model marks each span that restates earlier meaning without adding any. D is the marked spans' share of the transcript's words.

- A correction that changes meaning is not duplication. The model grades the final intent; the superseded words cost time only.
- A closing recap that adds nothing is duplication.
- Fillers ("um", "basically") are not duplication. They cost time, and count against clarity only when they obscure meaning.

## Score

```text
Q = U × (1 − D ÷ 2)
S = clamp(P ÷ T, 0.5, 1.5)
Score = round_half_up(Q × S)   qualified rounds only (U ≥ 60)
```

- A qualified round's speed factor ranges from 0.5 (twice par or slower) to 1.5 (two-thirds of par or faster). Quality can therefore move the score by its full range; speed by at most ±50%.
- An unqualified round shows its quality and "unqualified", with no score. Every qualified round ranks above every unqualified one, so a vague fast prompt never outranks a useful slow one.
- Ties break by higher Q, then lower T.

## Personal bests

A personal best is the highest score among the player's qualified rounds, kept per input mode (speech, and typing if [the typing mode](https://github.com/mia-cx/monkeyspeak/issues/9) ships). Par time normalizes challenge length, so one personal best covers all challenges in a mode.

A round counts toward personal bests when it is qualified, finished before the 90-second cap, and not voided.

## Recognition errors

The app shows the transcript beside the result. When recognition misheard the player, they void the round: it leaves their history and cannot set a personal best. Voiding only removes a round, so it offers no way to raise a score. Recognition quality itself belongs to [the speech recognition ticket](https://github.com/mia-cx/monkeyspeak/issues/4).

## Measured and judged

| Measured by the app | Judged by the model |
| --- | --- |
| Elapsed time, think time, speak time | Usefulness dimensions |
| Transcript and its word count | Duplicated spans |
| Voided rounds, cap reached | Attempts to change the grading rules |

The app computes Q, S, the score, qualification, and personal bests from these inputs. The model returns only the four dimension scores, the duplicated spans, and the manipulation flag, which keeps its job small enough for [the grader investigation](https://github.com/mia-cx/monkeyspeak/issues/6) to test.

## Worked examples

Challenge: *A shared grocery list for roommates that splits costs.* Par 30 seconds.

### 1. Complete and concise

> Build a web app for roommates sharing one grocery list. Anyone adds items; whoever buys an item marks it bought and enters the price. Split each purchase evenly and show a running balance of who owes whom. One household for now; no receipt scanning or custom splits.

Completeness 4, clarity 4, actionability 3 (no stated way to check the balance), scope 4. U = 94, D = 0, Q = 94. T = 32 (think 8, speak 24), S = 0.94. **Score 88.**

### 2. Verbose equivalent

> So basically I want an app, it's a grocery list app, for roommates, so roommates can share a grocery list. Um, anyone can add stuff to the list. And then when someone buys something they mark it as bought, and they put in what it cost. And then the app splits that, evenly, between everyone. So it's splitting the cost evenly. And it shows who owes who money, like a running balance. Just for one household to start, we don't need receipt scanning or custom splits. So yeah, a shared grocery list for roommates that splits costs evenly and tracks who owes who.

Same content as example 1, so completeness 4, actionability 3, scope 4; clarity 3 because the meandering delays each requirement. U = 88. Restatements ("so roommates can share a grocery list", "so it's splitting the cost evenly", the closing recap) make D = 0.35, Q = 72.6. T = 56 (think 6, speak 50), S = 0.54. **Score 39.**

### 3. Fast omission

> Make a roommate grocery list app that splits costs.

Completeness 2 (no core behavior beyond the title), clarity 3, actionability 2, scope 1. U = 50. T = 6. **Unqualified, quality 50.** Its speed earns nothing.

### 4. Meaningful correction

> Web app for roommates sharing one grocery list. Anyone adds items; whoever buys one marks it bought with the price, and the app splits it evenly — actually no, split it only among roommates who opted into that item. Show a running balance of who owes whom. One household for now; no receipt scanning.

The correction changes the split rule, so it is not duplication; the model grades the opt-in rule. Completeness 4, clarity 4, actionability 3, scope 4. U = 94, D = 0, Q = 94. T = 40 (think 7, speak 33), S = 0.75. **Score 71.** It matches example 1 on quality and pays only for the extra time.

### 5. The generic shortcut

> Claude, figure this idea out for me.

Completeness 0, clarity 2 (the request is unambiguous), actionability 0 (hands over the whole exercise), scope 0. U = 13. T = 3. **Unqualified, quality 13.**

### 6. Dense shorthand

> Roommate grocery PWA. Shared list; mark bought plus price; even split; running who-owes-whom balance. MVP one household, no receipt OCR, no custom splits.

Same instructions as example 1 in fewer words. Completeness 4, clarity 4, actionability 3, scope 4. U = 94, D = 0, Q = 94. T = 21 (think 10, speak 11), S = 1.43. **Score 134.**

### Intended ranking

| Rank | Example | Result |
| --- | --- | --- |
| 1 | Dense shorthand | 134 |
| 2 | Complete and concise | 88 |
| 3 | Meaningful correction | 71 |
| 4 | Verbose equivalent | 39 |
| 5 | Fast omission | Unqualified, quality 50 |
| 6 | Generic shortcut | Unqualified, quality 13 |

A candidate grader passes this set when it reproduces the ranking and the qualified/unqualified split.

## Tunable values

| Value | Draft | Effect |
| --- | --- | --- |
| Qualification threshold | U ≥ 60 | How useful a prompt must be before speed counts |
| Default par time | 30 s | Where the speed factor crosses 1.0 |
| Speed factor range | 0.5–1.5 | How far speed can move a qualified score |
| Duplication weight | D ÷ 2 | How hard restatement is penalized beyond its time cost |
| Round cap | 90 s | When a round ends unprompted |
