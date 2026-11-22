export class Typing {
  constructor(element) { this.element = element; }
  async start() {
    this.firstSpeechAt = null;
    this.element.value = '';
    this.element.disabled = false;
    this.onInput = () => { this.firstSpeechAt ??= performance.now(); };
    this.element.addEventListener('input', this.onInput);
  }
  async stop() {
    this.element.disabled = true;
    this.element.removeEventListener('input', this.onInput);
    return { transcript: this.element.value, firstSpeechAt: this.firstSpeechAt };
  }
}
