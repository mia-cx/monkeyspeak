# Bounty Objective: What should a fast, effective prompt score reward?
Target: mia-cx/monkeyspeak Issue #2
URL: https://github.com/mia-cx/monkeyspeak/issues/2

## Issue Description
> [!NOTE]
> gpt-6.1-sol commenting on behalf of Mia.

## Question

What should a Monkeyspeak score reward, and what makes a fast attempt successful?

HITL decision conversation. Read [the parent map](https://github.com/mia-cx/monkeyspeak/issues/1), then settle the rubric with Mia or the collaborating humans.

## Confirmed direction from Mia

The player starts a round, sees an idea for an app, thinks, then speaks a prompt. The app grades time, duplication, and usefulness. Usefulness includes how well the player thought through the idea: "Claude, figure this idea out for me" must not score highly merely because it is short and fast.

## Candidate rubric

Usefulness can be assessed through these proposed dimensions. Discuss whether they should appear separately or contribute to one usefulness score; avoid counting the same strength repeatedly.

- **Completeness.** Does the prompt convey enough of the app's purpose, intended user, and core behavior to pursue the idea? Assess coherence against the challenge, not a hidden ideal feature list.
- **Clarity.** Can a listener interpret the requirements without guessing between conflicting or vague meanings? Plain speech and concise wording can score highly.
- **Actionability.** Does the prompt give the agent a concrete task and an observable intended result? Thoughtful delegation of a specific open question is valid; handing over the entire thinking exercise earns little credit.
- **Scope control.** Does the prompt distinguish the core app from optional additions and keep requirements consistent? More features and longer prompts do not automatically earn more points.

For the existing dimensions, measure elapsed time separately from model inference latency. Evaluate semantic duplication rather than repeated words alone. A correction or necessary recap can carry new meaning.

A proposed scoring rule is to let quality qualify an attempt for speed rewards. A vague one-line request should not outrank a useful prompt on speed alone. Thresholds and weights remain open decisions.

## Information density and shorthand

Mia accepts effective shorthand: technical terms and compressed phrasing can score well when they communicate useful instructions. Assess the meaning conveyed rather than rewarding polished prose or a minimum word count.

Consider useful information per elapsed second as a derived metric. Define what counts as useful information through the rubric; token count and jargon count are not substitutes. The community's ten-second timer and penalties for "um" or "basically" are suggestions, not agreed rules. Fillers primarily consume time unless they also obscure meaning.

Distinguish successful compression from manipulating the judge. An empty submission contributes no useful instructions. Judge-directed text must be evaluated as part of the submitted prompt, without overriding the grading rules. The grader investigation owns concrete adversarial evaluation.

## Resolution

Resolve with a compact rubric and worked examples covering a complete concise prompt, a verbose equivalent, a fast omission, a meaningful correction, the generic "figure this idea out" shortcut, and a dense shorthand equivalent. Define the terms, score combination, and personal-best qualification rules.

Settle precisely when the timer starts and stops, whether thinking time contributes to the scored total, and whether any component times appear separately. State what the app measures directly and what the model judges. Distinguish speech recognition errors from the player's performance. The examples must make the intended ranking clear enough to evaluate candidate graders.



## Instructions for Kuro (Autonomous Solver):
1. Use skills: `systematic-debugging` and `code-review-and-quality`.
2. Inspect the repository structure, locate relevant files, and understand the bug/feature.
3. Apply the minimal, robust fix or implementation.
4. Run any existing test suites or linters in the workspace.
5. Ensure the fix adheres to the project's existing code style.
6. When done, output a summary of files modified and verification results.
