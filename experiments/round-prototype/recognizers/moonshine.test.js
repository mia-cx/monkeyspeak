import test from 'node:test';
import assert from 'node:assert/strict';
import { Moonshine, segmentAudio } from './moonshine.js';

test('recorded audio keeps opening and closing utterances across pauses and safety splits', () => {
  const audio = new Float32Array(16000 * 16);
  audio.fill(0.1, 4800, 16000);
  audio.fill(0.2, 32000);
  const segments = segmentAudio(audio);

  assert.equal(segments.length, 3);
  assert.ok(segments[0].includes(Math.fround(0.1)));
  assert.ok(segments[1].includes(Math.fround(0.2)));
  assert.ok(segments[2].includes(Math.fround(0.2)));
  assert.ok(segments.every((segment) => segment.length <= 16000 * 12));
  assert.deepEqual(segmentAudio(new Float32Array()), []);
  assert.deepEqual(segmentAudio(new Float32Array(16000)), []);
});

test('speech start waits for captured samples before allowing challenge reveal', async (t) => {
  const processor = { connect() {} };
  const originalAudioContext = globalThis.AudioContext;
  t.after(() => {
    if (originalAudioContext) globalThis.AudioContext = originalAudioContext;
    else delete globalThis.AudioContext;
  });
  globalThis.AudioContext = class {
    async resume() {}
    createMediaStreamSource() {
      return { connect() {} };
    }
    createScriptProcessor() {
      return processor;
    }
  };
  const recognizer = Object.create(Moonshine.prototype);
  recognizer.ready = Promise.resolve();
  let started = false;
  const starting = recognizer.start({}).then(() => {
    started = true;
  });
  await new Promise(setImmediate);
  assert.equal(started, false);
  const samples = new Float32Array(1024);
  processor.onaudioprocess({ inputBuffer: { getChannelData: () => samples } });
  await new Promise(setImmediate);
  assert.equal(started, false);
  processor.onaudioprocess({ inputBuffer: { getChannelData: () => samples } });
  await starting;
  assert.equal(started, true);
  assert.equal(recognizer.chunks[0].length, 1024);
});
