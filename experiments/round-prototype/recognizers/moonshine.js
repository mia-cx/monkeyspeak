export const models = {
  base: 'onnx-community/moonshine-base-ONNX',
  tiny: 'onnx-community/moonshine-tiny-ONNX',
};
export const defaultModel = 'base';
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
    await this.ready;
    this.stream =
      stream ||
      (await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000 },
      }));
    this.context = new AudioContext({ sampleRate: 16000 });
    await this.context.resume();
    this.firstSpeechAt = null;
    this.parts = [];
    this.samples = [];
    this.quiet = 0;
    this.active = false;
    this.error = null;
    this.queue = Promise.resolve();
    this.source = this.context.createMediaStreamSource(this.stream);
    this.processor = this.context.createScriptProcessor(1024, 1, 1);
    this.processor.onaudioprocess = (e) => {
      const audio = e.inputBuffer.getChannelData(0);
      let energy = 0;
      for (const x of audio) energy += x * x;
      const voiced =
        20 * Math.log10(Math.sqrt(energy / audio.length) + 1e-9) >= -45;
      if (voiced) {
        this.firstSpeechAt ??=
          performance.now() - (audio.length / 16000) * 1000;
        this.active = true;
        this.quiet = 0;
      } else this.quiet += audio.length;
      if (this.active) this.samples.push(...audio);
      if (
        this.active &&
        (this.quiet >= 8000 || this.samples.length >= 16000 * 12)
      )
        this.flush();
    };
    this.source.connect(this.processor);
    this.processor.connect(this.context.destination);
  }
  flush() {
    if (!this.samples.length) return;
    const audio = Float32Array.from(this.samples);
    this.samples = [];
    this.active = false;
    this.queue = this.queue
      .then(async () => {
        const result = await this.asr(audio, {
          max_new_tokens: Math.min(
            160,
            Math.max(12, Math.ceil((audio.length / 16000) * 8)),
          ),
        });
        this.parts.push(result.text.trim());
      })
      .catch((e) => {
        this.error = e;
      });
  }
  async stop() {
    this.processor.disconnect();
    this.source.disconnect();
    this.stream.getTracks().forEach((t) => t.stop());
    await this.context.close();
    this.flush();
    await this.queue;
    if (this.error) throw this.error;
    return {
      transcript: this.parts.join(' '),
      firstSpeechAt: this.firstSpeechAt,
    };
  }
}
