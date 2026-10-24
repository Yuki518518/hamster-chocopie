import { GARDEN as C } from "./config.js?v=20261025-2";

export class GardenSound {
  constructor(enabled) {
    this.enabled = enabled;
    this.bgm = new Audio(new URL("./assets/candy-day.mp3", import.meta.url));
    this.bgm.preload = "auto";
    this.bgm.loop = true;
    this.bgm.volume = C.bgmVolume;
    this.active = false;
    this.ctx = null;
    this.fade = null;
    this.lastCatch = 0;
  }
  unlock() {
    try {
      this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      this.ctx.resume().catch(() => {});
    } catch {}
  }
  note(
    frequency,
    offset = 0,
    duration = 0.12,
    volume = 1,
    end = frequency,
    type = "sine",
  ) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime + offset,
      oscillator = this.ctx.createOscillator(),
      gain = this.ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, t);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, end),
      t + duration,
    );
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(C.sfxVolume * volume, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    oscillator.connect(gain);
    gain.connect(this.ctx.destination);
    oscillator.start(t);
    oscillator.stop(t + duration + 0.03);
  }
  effect(kind) {
    if (!this.enabled) return;
    this.unlock();
    const now = performance.now();
    if (["strawberry", "chocopie", "fish"].includes(kind)) {
      if (now - this.lastCatch < 70) return;
      this.lastCatch = now;
    }
    if (kind === "button") this.note(620, 0, 0.09, 0.5, 850);
    if (kind === "strawberry") {
      this.note(190, 0, 0.07, 0.95, 90);
      this.note(700, 0.06, 0.12, 0.65, 930);
    }
    if (kind === "chocopie") {
      [659, 880, 1109, 1320].forEach((n, i) =>
        this.note(n, i * 0.075, 0.22, 0.6),
      );
      this.note(180, 0.04, 0.06, 0.7, 80);
    }
    if (kind === "fish") {
      this.note(340, 0, 0.32, 0.65, 130, "triangle");
      this.note(180, 0.22, 0.11, 0.5, 100);
    }
    if (kind === "end")
      [523, 659, 784, 1046].forEach((n, i) =>
        this.note(n, i * 0.11, 0.22, 0.6),
      );
  }
  play({ restart = false } = {}) {
    clearInterval(this.fade);
    this.unlock();
    this.active = true;
    if (restart) {
      this.bgm.pause();
      try {
        this.bgm.currentTime = 0;
      } catch {
        this.bgm.addEventListener(
          "loadedmetadata",
          () => {
            this.bgm.currentTime = 0;
          },
          { once: true },
        );
      }
    }
    if (!this.enabled) return;
    this.bgm.volume = C.bgmVolume;
    this.bgm.play().catch(() => {});
  }
  stop(fade = false) {
    this.active = false;
    clearInterval(this.fade);
    if (!fade) {
      this.bgm.pause();
      return;
    }
    const started = performance.now(),
      volume = this.bgm.volume;
    this.fade = setInterval(() => {
      const f = Math.max(0, 1 - (performance.now() - started) / 400);
      this.bgm.volume = volume * f;
      if (!f) {
        clearInterval(this.fade);
        this.bgm.pause();
      }
    }, 25);
  }
  toggle(value) {
    this.enabled = value;
    if (value && this.active) this.play();
    else if (!value) {
      const wasActive = this.active;
      this.stop();
      this.active = wasActive;
    }
  }
}
