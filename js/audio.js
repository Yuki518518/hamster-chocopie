import { CONFIG as C } from "./config.js";
export class Sound {
  constructor(enabled) {
    this.enabled = enabled;
    this.bgm = new Audio(new URL("../assets/audio/bgm.mp3", import.meta.url));
    this.bgm.loop = true;
    this.bgm.preload = "auto";
    this.bgm.volume = C.bgmVolume;
    this.ctx = null;
    this.fade = null;
    this.bgmFailed = false;
    this.bgm.addEventListener("error", () => {
      this.bgmFailed = true;
    });
  }
  unlock() {
    try {
      if (!this.ctx)
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.ctx.resume().catch(() => {});
    } catch {}
  }
  tone(freq, when = 0, length = 0.1, type = "sine", volume = 1, end = freq) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime + when,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + length);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(C.sfxVolume * volume, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + length);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t);
    o.stop(t + length + 0.02);
  }
  effect(name) {
    if (!this.enabled) return;
    const note = (f, w, l, v = 1, end = f) =>
      this.tone(f, w, l, "sine", v, end);
    if (name === "button") note(620, 0, 0.09, 0.6, 850);
    if (name === "throw") note(380, 0, 0.15, 0.8, 900);
    if (name === "hit") {
      note(880, 0, 0.13, 0.7);
      note(1320, 0.08, 0.22, 0.65);
      note(170, 0.1, 0.065, 0.65, 90);
      note(210, 0.18, 0.065, 0.5, 100);
    }
    if (name === "end")
      [523, 659, 784, 1046].forEach((f, i) => note(f, i * 0.11, 0.22, 0.65));
  }
  startFallback() {
    if (!this.active || !this.enabled || this.fallback) return;
    this.fallback = setInterval(() => {
      if (this.ctx && this.enabled) {
        const tune = [523, 659, 784, 659, 587, 698, 880, 784];
        this.tone(
          tune[(this.beat = (this.beat || 0) + 1) % 8],
          0,
          0.18,
          "triangle",
          0.25,
        );
      }
    }, 240);
  }
  play() {
    this.active = true;
    clearInterval(this.fade);
    this.unlock();
    if (!this.enabled) return;
    this.bgm.volume = C.bgmVolume;
    if (!this.bgmFailed)
      this.bgm.play().catch(() => {
        this.bgmFailed = true;
        this.startFallback();
      });
    if (this.bgmFailed) this.startFallback();
  }
  stop(fade = false) {
    this.active = false;
    clearInterval(this.fade);
    clearInterval(this.fallback);
    this.fallback = null;
    if (!fade) {
      this.bgm.pause();
      return;
    }
    const start = this.bgm.volume,
      t = performance.now();
    this.fade = setInterval(() => {
      const f = Math.max(0, 1 - (performance.now() - t) / 450);
      this.bgm.volume = start * f;
      if (!f) {
        clearInterval(this.fade);
        this.bgm.pause();
      }
    }, 25);
  }
  toggle(on, playing) {
    this.enabled = on;
    this.unlock();
    if (!on) this.stop();
    else if (playing) this.play();
  }
}
