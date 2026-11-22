import test from 'node:test';
import assert from 'node:assert/strict';
import { segmentAudio } from './moonshine.js';

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
