export const models = {
  base: 'onnx-community/moonshine-base-ONNX',
  tiny: 'onnx-community/moonshine-tiny-ONNX',
};
export const defaultModel = 'base';

export function segmentAudio(audio) {
  const segments = [];
  const frameSize = 160;
  let start = null;
  let quiet = 0;

  for (let i = 0; i < audio.length; i += frameSize) {
    const end = Math.min(i + frameSize, audio.length);
    let energy = 0;
    for (let j = i; j < end; j++) energy += audio[j] * audio[j];
    const voiced = 20 * Math.log10(Math.sqrt(energy / (end - i)) + 1e-9) >= -45;

    if (voiced) {
      start ??= Math.max(0, i - 1600);
      quiet = 0;
    } else {
      quiet += end - i;
    }

    if (start !== null && (quiet >= 8000 || end - start >= 16000 * 12)) {
      segments.push(audio.slice(start, end));
      start = null;
    }
  }

  if (start !== null) segments.push(audio.slice(start));
  return segments;
}

export class Moonshine {
  constructor(model = defaultModel, progress = () => {}) {
    this.ready = this.load(model, progress);
  }
  async load(model, progress) {
    const start = performance.now();
    progress('Loading Moonshine ' + model + '…');
    const { pipeline, env } = await import(
      'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1'
    );
    env.allowLocalModels = false;
    env.backends.onnx.wasm.numThreads = Math.min(
      4,
      navigator.hardwareConcurrency || 1,
    );
    this.asr = await pipeline('automatic-speech-recognition', models[model], {
      device: 'wasm',
      dtype: 'q8',
      progress_callback: (p) => {
        if (p.status === 'progress')
          progress(`${p.file}: ${Math.round(p.progress || 0)}%`);
      },
    });
    const message = `Moonshine ${model} ready (WASM), ${Math.round(performance.now() - start)} ms; isolated=${crossOriginIsolated}`;
    progress(message);
    console.log(message);
    return message;
  }
  async start(stream) {
    this.context = new AudioContext({ sampleRate: 16000 });
    const resumed = this.context.resume();
    const microphone =
      stream ||
      navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000 },
      });
    this.firstSpeechAt = null;
    this.chunks = [];
    this.processor = this.context.createScriptProcessor(1024, 1, 1);
    let captureReady;
    let capturing = new Promise((resolve) => {
      captureReady = resolve;
    });
    this.processor.onaudioprocess = (e) => {
      const audio = e.inputBuffer.getChannelData(0);
      this.chunks.push(audio.slice());
      let energy = 0;
      for (const x of audio) energy += x * x;
      const voiced =
        20 * Math.log10(Math.sqrt(energy / audio.length) + 1e-9) >= -45;
      if (voiced) {
        this.firstSpeechAt ??=
          performance.now() - (audio.length / 16000) * 1000;
      }
      captureReady();
    };
    // Warm the graph while microphone permission is pending.
    this.processor.connect(this.context.destination);
    try {
      [this.stream] = await Promise.all([microphone, resumed]);
    } catch (error) {
      this.processor.disconnect();
      await this.context.close();
      throw error;
    }
    this.firstSpeechAt = null;
    this.chunks = [];
    capturing = new Promise((resolve) => {
      captureReady = resolve;
    });
    this.source = this.context.createMediaStreamSource(this.stream);
    this.source.connect(this.processor);
    await capturing;
  }
  async dispose() {
    await this.ready.catch(() => {});
    await this.asr?.dispose();
  }
  async abort() {
    this.processor.onaudioprocess = null;
    this.processor.disconnect();
    this.source.disconnect();
    this.stream.getTracks().forEach((t) => t.stop());
    await this.context.close();
    this.chunks = [];
  }
  async stop() {
    this.processor.onaudioprocess = null;
    this.processor.disconnect();
    this.source.disconnect();
    this.stream.getTracks().forEach((t) => t.stop());
    await this.context.close();
    const audio = new Float32Array(
      this.chunks.reduce((sum, chunk) => sum + chunk.length, 0),
    );
    let offset = 0;
    for (const chunk of this.chunks) {
      audio.set(chunk, offset);
      offset += chunk.length;
    }
    this.chunks = [];
    const parts = [];
    await this.ready;
    for (const segment of segmentAudio(audio)) {
      const result = await this.asr(segment, {
        max_new_tokens: Math.min(
          160,
          Math.max(12, Math.ceil((segment.length / 16000) * 8)),
        ),
      });
      parts.push(result.text.trim());
    }
    return {
      transcript: parts.join(' '),
      firstSpeechAt: this.firstSpeechAt,
    };
  }
}
