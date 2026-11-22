import { config, evaluate, duplication, pbEligible } from './rubric.js';
import { grade } from './grader.js';
import { Typing } from './recognizers/typing.js';
import { Moonshine, defaultModel } from './recognizers/moonshine.js';

const SpeechRecognizer = Moonshine;

const $ = (id) => document.getElementById(id);
const ideas = [
  'A shared grocery list for roommates that splits costs.',
  'A study planner for students preparing for exams.',
  'A reading tracker for friends sharing book recommendations.',
  'A simple interval timer for runners.',
  'A chore rota for a household.',
].map((text) => ({ text, par: config.defaultPar }));
let challenge;
let recognizer;
let speech;
let speechLoadError;
let started;
let interval;
let round;
let mode;
let busy = false;
const storageKey = 'monkeyspeak-round-prototype-v1';
let history;
try {
  history = JSON.parse(localStorage.getItem(storageKey) || '[]');
  if (!Array.isArray(history)) history = [];
} catch {
  history = [];
}

function best() {
  const scores = history
    .filter((r) => r.mode === $('mode').value && pbEligible(r))
    .sort((a, b) => b.score - a.score || b.Q - a.Q || a.T - b.T);
  $('best').textContent = `PB · ${$('mode').value}: ${scores[0]?.score ?? '—'}`;
}

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(history));
  } catch {
    $('status').textContent =
      'Browser storage unavailable; bests last for this visit.';
  }
  best();
}

function load() {
  speechLoadError = null;
  const previous = speech;
  const candidate = new SpeechRecognizer($('model').value, (message) =>
    queueMicrotask(() => {
      if (speech === candidate) $('load').textContent = message;
    }),
  );
  speech = candidate;
  if (previous) {
    previous.dispose().catch((error) => {
      console.error('Could not dispose previous recognizer:', error);
    });
  }
  candidate.ready.catch(async (error) => {
    if (speech !== candidate) return;
    speechLoadError = error;
    $('load').textContent =
      `Speech unavailable: ${error.message}. Typing is ready.`;
    $('mode').value = 'typing';
    updateMode();
    if (recognizer === candidate && interval) {
      busy = true;
      try {
        await abortSpeechRound(candidate);
      } finally {
        busy = false;
      }
    }
  });
}

async function abortSpeechRound(candidate) {
  clearInterval(interval);
  interval = null;
  await candidate.abort();
  round = null;
  $('stop').hidden = true;
  $('results').hidden = true;
  $('after').hidden = true;
  $('start').hidden = false;
  $('start').disabled = false;
  $('mode').disabled = false;
  $('model').disabled = false;
  $('status').textContent = 'Speech unavailable. Start a new Typing round.';
}

function updateMode() {
  $('input').hidden = $('mode').value !== 'typing';
  best();
}
$('model').value = defaultModel;
$('model').onchange = load;
$('mode').onchange = updateMode;

function randomIdea() {
  const pool = ideas.filter((i) => i !== challenge);
  return pool[Math.floor(Math.random() * pool.length)];
}

async function start(same = false) {
  if (busy) return;
  busy = true;
  $('start').disabled = true;
  $('retry').disabled = true;
  $('next').disabled = true;
  $('mode').disabled = true;
  $('model').disabled = true;
  $('status').textContent =
    $('mode').value === 'speech' ? 'Starting mic…' : 'Preparing input…';
  try {
    mode = $('mode').value;
    recognizer = mode === 'typing' ? new Typing($('input')) : speech;
    await recognizer.start();
    if (mode === 'speech' && speechLoadError) {
      await abortSpeechRound(recognizer);
      return;
    }
    if (!same || !challenge) challenge = randomIdea();
    $('idea').textContent = challenge.text;
    $('par').textContent =
      `Par ${challenge.par} s · Describe the core, the behavior, and what can wait.`;
    $('results').hidden = true;
    $('after').hidden = true;
    $('start').hidden = true;
    $('stop').hidden = false;
    $('status').textContent =
      mode === 'speech'
        ? 'Listening. Stop when your prompt is complete.'
        : 'Type your prompt. Stop when complete.';
    started = performance.now();
    $('timer').textContent = '0.0 s';
    if (mode === 'typing') $('input').focus();
    interval = setInterval(() => {
      const elapsed = Math.min(
        config.roundCap,
        (performance.now() - started) / 1000,
      );
      $('timer').textContent = elapsed.toFixed(1) + ' s';
      if (elapsed >= config.roundCap) stop();
    }, 50);
  } catch (error) {
    $('status').textContent =
      `Microphone unavailable: ${error.message}. Choose Typing and start again.`;
    $('mode').value = 'typing';
    updateMode();
    $('mode').disabled = false;
    $('model').disabled = false;
  } finally {
    busy = false;
    $('start').disabled = false;
    $('retry').disabled = false;
    $('next').disabled = false;
  }
}

async function stop() {
  if (busy || !interval) return;
  busy = true;
  const T = Math.min(config.roundCap, (performance.now() - started) / 1000);
  clearInterval(interval);
  interval = null;
  $('stop').hidden = true;
  $('timer').textContent = T.toFixed(1) + ' s';
  $('status').textContent = mode === 'speech' ? 'Transcribing…' : 'Grading…';
  await new Promise(requestAnimationFrame);
  try {
    const { transcript, firstSpeechAt } = await recognizer.stop();
    $('status').textContent = 'Grading…';
    const judged = await grade({ challenge: challenge.text, transcript });
    const D = duplication(transcript, judged.duplicatedSpans);
    const result = evaluate({ ...judged, D, T, P: challenge.par });
    const think =
      firstSpeechAt === null
        ? T
        : Math.max(0, Math.min(T, (firstSpeechAt - started) / 1000));
    round = { ...result, mode, voided: false };
    history.push(round);
    save();
    $('results').replaceChildren();
    const heading = document.createElement('h2');
    heading.textContent = result.qualified
      ? `Score ${result.score}`
      : `Unqualified, quality ${result.Q.toFixed(1)}`;
    $('results').append(heading);
    const metrics = document.createElement('p');
    metrics.textContent = `Elapsed T ${T.toFixed(1)} s · Think ${think.toFixed(1)} s · Speak ${(T - think).toFixed(1)} s\nUsefulness U ${result.U} · Duplication D ${(D * 100).toFixed(1)}% · Quality Q ${result.Q.toFixed(2)} · Speed S ${result.S?.toFixed(2) ?? '—'}`;
    $('results').append(metrics);
    for (const [name, value] of Object.entries(judged.dimensions)) {
      const p = document.createElement('div');
      p.textContent = `${name}: ${value}/4`;
      $('results').append(p);
    }
    const note = document.createElement('p');
    note.textContent = judged.manipulation
      ? 'Grading manipulation detected; unqualified.'
      : T >= config.roundCap
        ? 'Cap reached; not eligible for a personal best.'
        : 'Mock grades. Highlighted words repeat earlier content.';
    $('results').append(note);
    const p = document.createElement('p');
    p.className = 'transcript';
    const bounds = [
      ...new Set([
        0,
        transcript.length,
        ...judged.duplicatedSpans.flatMap((s) => [s.start, s.end]),
      ]),
    ].sort((a, b) => a - b);
    for (let i = 0; i < bounds.length - 1; i++) {
      const text = transcript.slice(bounds[i], bounds[i + 1]);
      const node = document.createElement(
        judged.duplicatedSpans.some(
          (s) => bounds[i] >= s.start && bounds[i] < s.end,
        )
          ? 'mark'
          : 'span',
      );
      node.textContent = text;
      p.append(node);
    }
    if (!transcript) p.textContent = '(No input captured.)';
    $('results').append(p);
    $('results').hidden = false;
    $('void').disabled = false;
    $('status').textContent = 'Round complete.';
  } catch (error) {
    round = null;
    $('results').hidden = true;
    $('status').textContent =
      `Recognition failed; no score saved. ${error.message}. Retry or choose Typing.`;
    $('void').disabled = true;
  } finally {
    $('after').hidden = false;
    $('mode').disabled = false;
    $('model').disabled = false;
    busy = false;
  }
}
$('start').onclick = () => start();
$('retry').onclick = () => start(true);
$('next').onclick = () => start();
$('stop').onclick = stop;
$('void').onclick = () => {
  if (round) {
    round.voided = true;
    save();
    $('status').textContent =
      'Round voided. Personal best restored from non-voided rounds.';
    $('void').disabled = true;
  }
};
load();
updateMode();
