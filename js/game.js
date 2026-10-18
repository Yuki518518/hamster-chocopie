import { CONFIG as C, clamp } from "./config.js";
import { makeThrow, stepProjectile, project, positionAt } from "./physics.js";
export class Game {
  constructor(renderer, input, sound, onChange, rng = Math.random) {
    Object.assign(this, {
      renderer,
      input,
      sound,
      onChange,
      rng,
      state: "TITLE",
      score: 0,
      remaining: C.duration,
      elapsed: 0,
      target: { x: 0, v: 0, want: 0.28, next: 1, pause: 0 },
      projectiles: [],
      effects: [],
      reaction: 0,
      reload: 0,
      ending: false,
    });
    this.last = 0;
    requestAnimationFrame((t) => this.frame(t));
  }
  start() {
    this.input.reset();
    Object.assign(this, {
      state: "PLAYING",
      score: 0,
      remaining: C.duration,
      elapsed: 0,
      target: { x: 0, v: 0, want: 0.28, next: 1, pause: 0 },
      projectiles: [],
      effects: [],
      reaction: 0,
      reload: 0,
      ending: false,
      settle: 0,
    });
    this.input.enabled = true;
    this.sound.play();
    this.sound.effect("button");
    this.last = performance.now();
    this.onChange();
  }
  pause() {
    if (this.state !== "PLAYING" || this.ending) return;
    this.state = "PAUSED";
    this.input.enabled = false;
    this.input.reset();
    this.sound.stop();
    this.onChange();
  }
  resume() {
    if (this.state !== "PAUSED") return;
    this.state = "PLAYING";
    this.last = performance.now();
    this.input.enabled = true;
    this.sound.play();
    this.onChange();
  }
  home() {
    this.state = "TITLE";
    this.input.enabled = false;
    this.input.reset();
    this.projectiles = [];
    this.effects = [];
    this.sound.stop();
    this.onChange();
  }
  throw(dx, dy, seconds, startX) {
    if (this.state !== "PLAYING" || this.ending || this.reload > 0) return;
    const p = makeThrow(dx, dy, seconds, startX);
    if (!p) return;
    this.projectiles.push(p);
    this.reload = C.reload;
    this.sound.effect("throw");
  }
  hit() {
    this.score += C.points;
    this.reaction = 0.5;
    this.sound.effect("hit");
    const p = project(this.target.x, 1, 0, 1, 1);
    this.effects.push({
      kind: "text",
      x: p.x,
      y: p.y,
      age: 0,
      life: C.effectDuration,
    });
    for (let i = 0; i < 10; i++)
      this.effects.push({
        kind: i % 3 ? "heart" : "crumb",
        x: p.x,
        y: p.y - 0.14,
        vx: (this.rng() - 0.5) * 130,
        vy: -30 - this.rng() * 80,
        size: 5 + this.rng() * 7,
        age: 0,
        life: C.effectDuration,
      });
    this.onChange();
  }
  update(dt) {
    if (this.state !== "PLAYING") return;
    const playDt = this.ending ? 0 : Math.min(dt, this.remaining);
    this.elapsed += playDt;
    this.remaining = Math.max(0, this.remaining - playDt);
    const prevX = this.target.x,
      t = this.target;
    t.next -= dt;
    t.pause = Math.max(0, t.pause - dt);
    if (t.next <= 0) {
      t.next = C.changeMin + this.rng() * (C.changeMax - C.changeMin);
      const speed =
        this.rng() < 0.16
          ? C.fastSpeed
          : C.minSpeed + this.rng() * (C.maxSpeed - C.minSpeed);
      t.want = (this.rng() < 0.45 ? -1 : 1) * speed;
      if (this.rng() < 0.23)
        t.pause = C.pauseMin + this.rng() * (C.pauseMax - C.pauseMin);
    }
    if (t.x > 0.59) t.want = -Math.abs(t.want);
    if (t.x < -0.59) t.want = Math.abs(t.want);
    t.v += ((t.pause > 0 ? 0 : t.want) - t.v) * Math.min(1, dt * 8);
    t.x = clamp(t.x + t.v * dt, -0.61, 0.61);
    this.reload = Math.max(0, this.reload - dt);
    this.reaction = Math.max(0, this.reaction - dt);
    for (const p of this.projectiles) {
      const r = stepProjectile(p, dt, prevX, t.x);
      if (r.hit) this.hit();
      const s = project(
        r.position.x,
        r.position.z,
        r.position.h,
        this.renderer.W,
        this.renderer.H,
      );
      p.trail.push(s);
      if (p.trail.length > 7) p.trail.shift();
    }
    this.projectiles = this.projectiles.filter((p) => !p.done);
    this.effects.forEach((e) => (e.age += dt));
    this.effects = this.effects.filter((e) => e.age < e.life);
    if (this.remaining === 0 && !this.ending) {
      this.ending = true;
      this.input.enabled = false;
      this.input.reset();
      this.sound.stop(true);
      this.onChange();
    }
    if (this.ending) {
      this.settle += dt;
      if (
        (this.projectiles.length === 0 && this.settle >= 0.65) ||
        this.settle > 1.9
      ) {
        this.state = "RESULT";
        this.sound.effect("end");
        this.onChange();
      }
    }
  }
  frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.update(dt);
    this.renderer.render(this, now / 1000);
    if (this.state === "PLAYING") this.onChange(true);
    requestAnimationFrame((t) => this.frame(t));
  }
}
