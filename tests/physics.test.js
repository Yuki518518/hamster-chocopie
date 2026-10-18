import test from "node:test";
import assert from "node:assert/strict";
import { makeThrow, positionAt, stepProjectile } from "../js/physics.js";
test("タップ・下スワイプを投擲にしない", () => {
  assert.equal(makeThrow(0, 0, 0.1), null);
  assert.equal(makeThrow(0, 0.4, 0.2), null);
  assert.equal(makeThrow(0.01, -0.02, 0.1), null);
});
test("強さ、斜め方向、放物線、遠近を維持する", () => {
  const slow = makeThrow(0, -0.15, 0.8),
    fast = makeThrow(0.15, -0.4, 0.2);
  assert.ok(fast.vz > slow.vz);
  assert.ok(positionAt(fast, 0.5).x > 0);
  assert.ok(positionAt(fast, 0.3).h > 0);
  assert.ok(positionAt(fast, 1.8).h < 0);
  assert.ok(fast.vz <= 2.05);
});
test("標的面を大きく飛び越しても命中を一度だけ処理", () => {
  const p = makeThrow(0, -0.4, 0.25);
  assert.equal(stepProjectile(p, 1, 0, 0).hit, true);
  assert.equal(stepProjectile(p, 0.1, 0, 0).hit, false);
});
test("見た目の重なりだけでは手前で命中しない", () => {
  const p = makeThrow(0, -0.4, 0.25);
  assert.equal(stepProjectile(p, 0.1, 0, 0).hit, false);
  assert.equal(p.checked, false);
});
test("到達時の標的位置を使い、横外れ・高さ外れは失敗", () => {
  const p = makeThrow(0, -0.4, 0.25);
  assert.equal(stepProjectile(p, 1, 0, 0.6).hit, false);
  const high = makeThrow(0, -0.4, 0.25);
  high.vh = 8;
  assert.equal(stepProjectile(high, 1, 0, 0).hit, false);
});
test("フレーム速度が異なっても同じ結果", () => {
  for (const fps of [30, 60, 120]) {
    const p = makeThrow(0.08, -0.4, 0.25);
    let hits = 0;
    for (let n = 0; n < fps * 2; n++) {
      if (stepProjectile(p, 1 / fps, 0.14, 0.14).hit) hits++;
    }
    assert.equal(hits, 1);
  }
});
