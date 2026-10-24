import {
  GARDEN as C,
  ITEMS,
  LEVELS,
  validLevel,
  clamp,
} from "./config.js?v=20261025-2";

export class GardenModel {
  constructor(random = Math.random) {
    this.random = random;
    this.state = "TITLE";
    this.level = "gentle";
    this.viewport(400, 600);
    this.reset();
  }
  reset() {
    this.score = 0;
    this.remaining = C.duration;
    this.elapsed = 0;
    this.playerX = 0.5;
    this.direction = 0;
    this.facing = 1;
    this.items = [];
    this.events = [];
    this.counts = { strawberry: 0, chocopie: 0, fish: 0 };
    this.nextSpawn = 0.35;
    this.nextPie = 5.5;
    this.lastLane = -1;
  }
  viewport(width, height) {
    this.playerWidth = Math.min(
      C.playerSize,
      (height / width) * C.maxPlayerHeight,
    );
    this.catchY = C.groundY - ((this.playerWidth * width) / height) * 0.52;
    this.minX = this.playerWidth / 2 + 0.025;
    this.maxX = 1 - this.minX;
    if (this.playerX != null)
      this.playerX = clamp(this.playerX, this.minX, this.maxX);
  }
  start(level = this.level) {
    this.level = validLevel(level);
    this.reset();
    this.state = "PLAYING";
  }
  pause() {
    if (this.state === "PLAYING") {
      this.state = "PAUSED";
      this.direction = 0;
    }
  }
  resume() {
    if (this.state === "PAUSED") this.state = "PLAYING";
  }
  home() {
    this.state = "TITLE";
    this.direction = 0;
    this.items = [];
    this.events = [];
  }
  spawn(forceType) {
    const profile = LEVELS[this.level];
    const roll = this.random();
    const type =
      forceType ||
      (roll < 0.9 - profile.fishChance
        ? "strawberry"
        : roll < 0.9
          ? "fish"
          : "chocopie");
    let lane = Math.floor(this.random() * 7);
    if (lane === this.lastLane)
      lane = (lane + 2 + Math.floor(this.random() * 4)) % 7;
    this.lastLane = lane;
    const progress = this.elapsed / C.duration;
    const fast = this.random() < profile.fastChance;
    const multiplier = fast
      ? profile.fastMin + this.random() * (profile.fastMax - profile.fastMin)
      : 0.94 + this.random() * 0.12;
    this.items.push({
      type,
      x: clamp(
        0.1 + (lane * 0.8) / 6 + (this.random() - 0.5) * 0.045,
        0.08,
        0.92,
      ),
      y: -0.065,
      speed:
        (profile.fallStart + progress * (profile.fallEnd - profile.fallStart)) *
        multiplier,
      fast,
      angle: (this.random() - 0.5) * 0.25,
      spin: (this.random() - 0.5) * 0.6,
      checked: false,
      caught: false,
    });
  }
  update(delta, axis = 0) {
    if (this.state !== "PLAYING") return;
    const dt = Math.min(Math.max(delta, 0), this.remaining);
    if (!dt) return;
    const oldX = this.playerX;
    this.playerX = clamp(
      oldX + clamp(axis, -1, 1) * C.playerSpeed * dt,
      this.minX,
      this.maxX,
    );
    this.direction = Math.sign(this.playerX - oldX);
    if (this.direction) this.facing = this.direction;
    this.remaining = Math.max(0, this.remaining - dt);
    if (this.remaining < 1e-8) this.remaining = 0;
    this.elapsed = C.duration - this.remaining;
    // Interpolate both bodies at the instant an item crosses the eating line.
    for (const item of this.items) {
      const before = item.y;
      item.y += item.speed * dt;
      item.angle += item.spin * dt;
      const food = item.type !== "fish";
      const top = this.catchY - (food ? C.foodCatchBefore : 0);
      const bottom = this.catchY + (food ? C.foodCatchAfter : 0);
      if (!item.checked && before <= bottom && item.y >= top) {
        const entered = clamp((top - before) / (item.y - before), 0, 1);
        const exited = clamp((bottom - before) / (item.y - before), 0, 1);
        const from = oldX + (this.playerX - oldX) * entered - item.x;
        const to = oldX + (this.playerX - oldX) * exited - item.x;
        const radius =
          this.playerWidth * 0.36 +
          ITEMS[item.type].size * 0.25 +
          (food ? C.foodHitBonus : 0);
        if (Math.min(from, to) <= radius && Math.max(from, to) >= -radius) {
          item.caught = true;
          this.score += ITEMS[item.type].points;
          this.counts[item.type]++;
          this.events.push({
            type: "catch",
            item: item.type,
            x: item.x,
            y: this.catchY,
            points: ITEMS[item.type].points,
          });
        }
      }
      if (item.y > bottom) item.checked = true;
    }
    this.items = this.items.filter((item) => !item.caught && item.y < 1.1);
    this.nextSpawn -= dt;
    if (this.remaining > 1.5 && this.nextSpawn <= 0) {
      const special = this.elapsed >= this.nextPie;
      if (special) this.nextPie += 8.5;
      this.spawn(special ? "chocopie" : undefined);
      this.nextSpawn +=
        LEVELS[this.level].spawnStart +
        ((LEVELS[this.level].spawnEnd - LEVELS[this.level].spawnStart) *
          this.elapsed) /
          C.duration;
    }
    if (!this.remaining) {
      this.state = "RESULT";
      this.direction = 0;
      this.events.push({ type: "end" });
    }
  }
  drainEvents() {
    return this.events.splice(0);
  }
}
