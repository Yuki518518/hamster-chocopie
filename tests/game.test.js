import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../js/game.js";
globalThis.requestAnimationFrame = () => 0;
const create = () =>
  new Game(
    { W: 393, H: 758 },
    { reset() {}, enabled: false },
    { play() {}, stop() {}, effect() {} },
    () => {},
    () => 0.5,
  );
test("30秒で新しい投擲を止めて結果に進む", () => {
  const g = create();
  g.start();
  for (let i = 0; i < 1800; i++) g.update(1 / 60);
  assert.ok(g.remaining < 0.001);
  for (let i = 0; i < 120; i++) g.update(1 / 60);
  assert.equal(g.state, "RESULT");
  assert.equal(g.input.enabled, false);
  g.throw(0, -0.4, 0.3, 0);
  assert.equal(g.projectiles.length, 0);
});
test("一時停止と再挑戦で時間とスコアを正しく初期化", () => {
  const g = create();
  g.start();
  g.hit();
  g.update(2);
  g.pause();
  const t = g.remaining;
  g.update(8);
  assert.equal(g.remaining, t);
  g.resume();
  g.update(1);
  assert.equal(g.remaining, t - 1);
  g.start();
  assert.equal(g.score, 0);
  assert.equal(g.remaining, 30);
  assert.equal(g.projectiles.length, 0);
  assert.equal(g.effects.length, 0);
});
test("ハムスターが境界を越えず、投擲が一度だけ10点になる", () => {
  const g = create();
  g.start();
  g.target.want = 0;
  g.target.next = 100;
  g.throw(0, -0.4, 0.25, 0);
  for (let i = 0; i < 120; i++) g.update(1 / 60);
  assert.equal(g.score, 10);
  assert.equal(g.projectiles.length, 0);
  g.start();
  for (let i = 0; i < 1800; i++) {
    g.update(1 / 60);
    assert.ok(Math.abs(g.target.x) <= 0.61);
  }
});
