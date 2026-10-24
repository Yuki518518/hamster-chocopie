export const GARDEN = Object.freeze({
  duration: 30,
  playerSpeed: 0.72,
  playerSize: 0.17,
  maxPlayerHeight: 0.22,
  groundY: 0.9,
  spawnStart: 0.62,
  spawnEnd: 0.39,
  fallStart: 0.38,
  fallEnd: 0.56,
  effectDuration: 0.65,
  bgmVolume: 0.2,
  sfxVolume: 0.13,
});
export const ITEMS = Object.freeze({
  strawberry: {
    points: 10,
    size: 0.075,
    ratio: 1.1,
    label: "いちご",
    weight: 0.72,
  },
  chocopie: {
    points: 50,
    size: 0.09,
    ratio: 0.65,
    label: "チョコパイ",
    weight: 0.1,
  },
  fish: {
    points: -50,
    size: 0.095,
    ratio: 0.6,
    label: "おさかな",
    weight: 0.18,
  },
});
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
