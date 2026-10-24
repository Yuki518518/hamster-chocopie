import test from "node:test";
import assert from "node:assert/strict";
import { GardenModel } from "../garden/model.js";
import { GardenRenderer } from "../garden/renderer.js";
import { GardenSound } from "../garden/audio.js";

test("取得リアクション中も実際の移動方向の歩き絵を使い、止まれば正面になる", () => {
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  globalThis.ResizeObserver = class {
    observe() {}
  };
  globalThis.devicePixelRatio = 1;
  const drawn = [],
    scales = [];
  const ctx = new Proxy(
    {
      drawImage: (image) => drawn.push(image.id),
      scale: (x) => scales.push(x),
      measureText: () => ({ width: 60 }),
    },
    { get: (target, name) => target[name] ?? (() => {}) },
  );
  const canvas = {
    getContext: () => ctx,
    getBoundingClientRect: () => ({ width: 400, height: 600 }),
    parentElement: {},
  };
  const assets = Object.fromEntries(
    ["background", "idle", "walk"].map((id) => [
      id,
      { image: { id }, crop: [0, 0, 100, 100] },
    ]),
  );
  const model = new GardenModel();
  model.start();
  const renderer = new GardenRenderer(canvas, assets, (w, h) =>
    model.viewport(w, h),
  );
  renderer.caught({ item: "strawberry", x: 0.5, y: model.catchY, points: 10 });
  model.update(0.016, 1);
  renderer.draw(model, 0);
  assert.equal(drawn.at(-1), "walk");
  assert.equal(scales[0], 1);
  drawn.length = 0;
  scales.length = 0;
  model.update(0.016, -1);
  renderer.draw(model, 0);
  assert.equal(drawn.at(-1), "walk");
  assert.equal(scales[0], -1);
  model.update(0.016, 0);
  renderer.draw(model, 0);
  assert.equal(drawn.at(-1), "idle");
});

test("新しいラウンドではBGMを先頭に戻し、一時停止の再開では戻さない", () => {
  globalThis.window = {};
  globalThis.Audio = class {
    constructor() {
      this.currentTime = 14;
      this.paused = true;
    }
    pause() {
      this.paused = true;
    }
    play() {
      this.paused = false;
      return Promise.resolve();
    }
  };
  const sound = new GardenSound(true);
  sound.play({ restart: true });
  assert.equal(sound.bgm.currentTime, 0);
  sound.bgm.currentTime = 8;
  sound.stop();
  sound.play();
  assert.equal(sound.bgm.currentTime, 8);
  sound.enabled = false;
  sound.play({ restart: true });
  assert.equal(sound.bgm.currentTime, 0);
  assert.equal(sound.bgm.paused, true);
});
