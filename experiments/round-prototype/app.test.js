import test from 'node:test';
import assert from 'node:assert/strict';
import { Moonshine } from './recognizers/moonshine.js';

test('a model failure cancels speech capture and leaves a playable Typing round', async (t) => {
  const elements = new Map();
  const element = () => ({
    value: '',
    hidden: false,
    disabled: false,
    textContent: '',
    append() {},
    replaceChildren() {},
    addEventListener() {},
    removeEventListener() {},
    focus() {},
  });
  const globals = {
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, element());
        return elements.get(id);
      },
      createElement: element,
    },
    localStorage: { getItem: () => null, setItem() {} },
    AudioContext: class {
      async resume() {}
      createScriptProcessor() {
        return processor;
      }
      createMediaStreamSource() {
        return {
          connect() {
            queueMicrotask(() =>
              processor.onaudioprocess({
                inputBuffer: { getChannelData: () => new Float32Array(1024) },
              }),
            );
          },
          disconnect() {},
        };
      }
      async close() {
        closed = true;
      }
    },
    navigator: {
      mediaDevices: {
        async getUserMedia() {
          return {
            getTracks: () => [
              {
                stop() {
                  released = true;
                },
              },
            ],
          };
        },
      },
    },
    requestAnimationFrame: (callback) => setImmediate(callback),
  };
  let released = false;
  let closed = false;
  const processor = { connect() {}, disconnect() {}, onaudioprocess: null };
  for (const [name, value] of Object.entries(globals)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => {
      if (original) Object.defineProperty(globalThis, name, original);
      else delete globalThis[name];
    });
  }
  let failModel;
  t.mock.method(
    Moonshine.prototype,
    'load',
    () =>
      new Promise((resolve, reject) => {
        failModel = reject;
      }),
  );
  await import('./app.js');
  const get = (id) => elements.get(id);
  get('mode').value = 'speech';
  await get('start').onclick();
  assert.equal(get('stop').hidden, false);
  failModel(new Error('Download failed'));
  await new Promise(setImmediate);
  assert.equal(released, true);
  assert.equal(closed, true);
  assert.equal(processor.onaudioprocess, null);
  assert.equal(get('mode').value, 'typing');
  assert.equal(get('mode').disabled, false);
  assert.equal(get('start').hidden, false);
  assert.equal(get('start').disabled, false);
  assert.equal(get('stop').hidden, true);
  assert.equal(
    get('status').textContent,
    'Speech unavailable. Start a new Typing round.',
  );
  await get('start').onclick();
  get('input').value = 'Build a simple shared list for roommates.';
  await get('stop').onclick();
  assert.equal(get('results').hidden, false);
  assert.equal(get('status').textContent, 'Round complete.');
});
