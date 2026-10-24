import test from "node:test";
import assert from "node:assert/strict";
import { GardenModel } from "../garden/model.js";
const item = (game, type, x = game.playerX) => ({
  type,
  x,
  y: game.catchY - 0.01,
  speed: 1,
  angle: 0,
  spin: 0,
  checked: false,
  caught: false,
});
test("押している間だけ移動し、離すとその位置で停止する", () => {
  const game = new GardenModel();
  game.start();
  game.update(0.2, 1);
  assert.ok(game.playerX > 0.5);
  const x = game.playerX;
  game.update(0.2, 0);
  assert.equal(game.playerX, x);
  game.update(0.2, -1);
  assert.ok(game.playerX < x);
});
test("小さなキャラが左右の端まで動いて画面に残る", () => {
  const game = new GardenModel();
  game.start();
  for (let n = 0; n < 300; n++) game.update(1 / 60, 1);
  assert.equal(game.playerX, game.maxX);
  assert.ok(game.maxX - game.minX > 0.77);
  for (let n = 0; n < 300; n++) game.update(1 / 60, -1);
  assert.equal(game.playerX, game.minX);
});
test("いちご+10、パイ+50、魚−50。負の得点も維持し二重加算しない", () => {
  const game = new GardenModel();
  game.start();
  for (const [type, score] of [
    ["strawberry", 10],
    ["chocopie", 60],
    ["fish", 10],
    ["fish", -40],
  ]) {
    game.items = [item(game, type)];
    game.update(0.05, 0);
    assert.equal(game.score, score);
    game.update(0.05, 0);
    assert.equal(game.score, score);
  }
  assert.deepEqual(game.counts, { strawberry: 1, chocopie: 1, fish: 2 });
});
test("端へ取りに行く必要があり、横に外れた物は得点にならない", () => {
  const game = new GardenModel();
  game.start();
  game.items = [item(game, "strawberry", 0.85)];
  game.update(0.1, 0);
  assert.equal(game.score, 0);
});
test("高速で食べる位置を飛び越えても到達時の位置で判定", () => {
  const game = new GardenModel();
  game.start();
  game.items = [item(game, "chocopie")];
  game.update(0.2, 0);
  assert.equal(game.score, 50);
  game.items = [item(game, "strawberry", game.playerX + 0.14)];
  game.update(0.2, 1);
  assert.equal(game.score, 50);
});
test("一時停止・30秒終了・再挑戦で時間と入力と得点が正しく切り替わる", () => {
  const game = new GardenModel(() => 0.5);
  game.start();
  game.items = [item(game, "strawberry")];
  game.update(0.05, 0);
  game.pause();
  const time = game.remaining,
    x = game.playerX;
  game.update(3, 1);
  assert.equal(game.remaining, time);
  assert.equal(game.playerX, x);
  game.resume();
  for (let n = 0; n < 2000; n++) game.update(1 / 60, 0);
  assert.equal(game.state, "RESULT");
  assert.equal(game.remaining, 0);
  const score = game.score;
  game.update(1, 1);
  assert.equal(game.score, score);
  game.start();
  assert.equal(game.score, 0);
  assert.equal(game.remaining, 30);
  assert.equal(game.playerX, 0.5);
  assert.equal(game.items.length, 0);
});
test("30・60・120fpsでも同じ移動距離と衝突得点", () => {
  for (const fps of [30, 60, 120]) {
    const game = new GardenModel();
    game.start();
    game.items = [item(game, "strawberry")];
    for (let n = 0; n < fps / 2; n++) game.update(1 / fps, 0);
    assert.equal(game.score, 10);
    for (let n = 0; n < fps / 2; n++) game.update(1 / fps, 1);
    assert.ok(Math.abs(game.playerX - 0.86) < 1e-8);
  }
});

test("いちごとパイだけ横の取りやすさを広げ、魚の判定は変えない", () => {
  for (const [type, score] of [
    ["strawberry", 10],
    ["chocopie", 50],
    ["fish", 0],
  ]) {
    const game = new GardenModel();
    game.start();
    game.items = [item(game, type, game.playerX + 0.095)];
    game.update(0.05, 0);
    assert.equal(game.score, score);
  }
});

test("食べ物は体に重なる短い猶予でも取れるが、魚の判定面は延ばさない", () => {
  for (const [type, score] of [
    ["strawberry", 10],
    ["chocopie", 50],
    ["fish", 0],
  ]) {
    const game = new GardenModel();
    game.start();
    game.playerX = 0.4;
    const food = item(game, type, 0.52);
    food.y = game.catchY + 0.01;
    food.speed = 0.2;
    game.items = [food];
    game.update(0.15, 1);
    assert.equal(game.score, score);
    game.update(0.2, 1);
    assert.equal(game.score, score);
  }
});

test("難易度ごとに落下速度・速い物の割合・魚の割合が段階的に増える", () => {
  const samples = [];
  for (const level of ["gentle", "peppy", "storm"]) {
    let seed = 73;
    const game = new GardenModel(() => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    });
    game.start(level);
    for (let i = 0; i < 4000; i++) game.spawn();
    samples.push({
      speed:
        game.items.reduce((sum, value) => sum + value.speed, 0) /
        game.items.length,
      fast: game.items.filter((i) => i.fast).length,
      fish: game.items.filter((i) => i.type === "fish").length,
    });
  }
  for (let i = 1; i < samples.length; i++) {
    assert.ok(samples[i].speed > samples[i - 1].speed);
    assert.ok(samples[i].fast > samples[i - 1].fast);
    assert.ok(samples[i].fish > samples[i - 1].fish);
  }
});

test("リトライは選んだ難易度を保ち、不明な値はのんびりに戻す", () => {
  const game = new GardenModel();
  game.start("storm");
  game.start();
  assert.equal(game.level, "storm");
  game.start("missing");
  assert.equal(game.level, "gentle");
});
