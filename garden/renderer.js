import { GARDEN as C, ITEMS } from "./config.js?v=20261025-3";

export async function loadAssets() {
  const entries = [
    ["idle", "hamster-idle"],
    ["walk", "hamster-right"],
    ["strawberry", "strawberry"],
    ["chocopie", "chocopie"],
    ["fish", "fish"],
    ["background", "garden-bg"],
  ];
  return Object.fromEntries(
    await Promise.all(
      entries.map(async ([key, file]) => {
        const image = new Image();
        image.src = new URL(`./assets/${file}.webp`, import.meta.url);
        await image.decode();
        let crop = [0, 0, image.naturalWidth, image.naturalHeight];
        if (key !== "background") {
          // Trim transparent padding at draw time; the original PNG stays untouched.
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(image, 0, 0);
          const pixels = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          ).data;
          let x0 = canvas.width,
            y0 = canvas.height,
            x1 = 0,
            y1 = 0;
          for (let y = 0; y < canvas.height; y++)
            for (let x = 0; x < canvas.width; x++) {
              if (pixels[(y * canvas.width + x) * 4 + 3] > 24) {
                x0 = Math.min(x0, x);
                y0 = Math.min(y0, y);
                x1 = Math.max(x1, x);
                y1 = Math.max(y1, y);
              }
            }
          if (x1 > x0 && y1 > y0) crop = [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
        }
        return [key, { image, crop }];
      }),
    ),
  );
}

export class GardenRenderer {
  constructor(canvas, assets, onResize) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.assets = assets;
    this.effects = [];
    this.reaction = null;
    this.reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    this.onResize = onResize;
    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas.parentElement);
  }
  resize() {
    const box = this.canvas.getBoundingClientRect();
    this.W = Math.max(1, box.width);
    this.H = Math.max(1, box.height);
    const dpr = Math.min(devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(this.W * dpr);
    this.canvas.height = Math.round(this.H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.onResize(this.W, this.H);
  }
  sprite(name, x, y, width, angle = 0, flip = false, stretch = 1) {
    const { image, crop } = this.assets[name],
      height = (width * crop[3]) / crop[2];
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    c.scale(flip ? -1 : 1, stretch);
    c.drawImage(image, ...crop, -width / 2, -height / 2, width, height);
    c.restore();
    return height;
  }
  ellipse(x, y, rx, ry, color) {
    const c = this.ctx;
    c.fillStyle = color;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
  }
  heart(x, y, size, color) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.scale(size / 20, size / 20);
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(0, 8);
    c.bezierCurveTo(-22, -5, -9, -20, 0, -9);
    c.bezierCurveTo(9, -20, 22, -5, 0, 8);
    c.fill();
    c.restore();
  }
  star(x, y, radius) {
    const c = this.ctx;
    c.fillStyle = "#d6ad58";
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 - Math.PI / 2,
        r = i % 2 ? radius * 0.28 : radius;
      c.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
    }
    c.closePath();
    c.fill();
  }
  caught(event) {
    this.reaction = { kind: event.item, age: 0 };
    this.effects.push({
      kind: "label",
      x: event.x,
      y: event.y - 0.13,
      age: 0,
      life: C.effectDuration + 0.1,
      points: event.points,
    });
    const count = this.reduced ? 2 : event.item === "chocopie" ? 8 : 5;
    for (let i = 0; i < count; i++)
      this.effects.push({
        kind: event.item,
        x: event.x,
        y: event.y - 0.04,
        vx: (i - (count - 1) / 2) * 17,
        vy: -25 - (i % 3) * 15,
        age: 0,
        life: C.effectDuration,
      });
  }
  update(dt) {
    for (const effect of this.effects) effect.age += dt;
    this.effects = this.effects.filter((e) => e.age < e.life);
    if (this.reaction) {
      this.reaction.age += dt;
      if (this.reaction.age > 0.42) this.reaction = null;
    }
  }
  reset() {
    this.effects = [];
    this.reaction = null;
  }
  draw(game, now) {
    const c = this.ctx,
      W = this.W,
      H = this.H;
    c.clearRect(0, 0, W, H);
    c.drawImage(this.assets.background.image, 0, 0, W, H);
    for (const item of game.items) {
      const size = ITEMS[item.type].size * W,
        x = item.x * W,
        y = item.y * H;
      c.save();
      c.globalAlpha = 0.17;
      c.strokeStyle = item.type === "fish" ? "#78b9d1" : "#ddaaa0";
      c.lineWidth = 2;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(x, y - size * 0.75);
      c.lineTo(x, y - size * 0.95);
      c.stroke();
      if (item.fast) {
        c.beginPath();
        c.moveTo(x - size * 0.19, y - size * 0.9);
        c.lineTo(x - size * 0.19, y - size * 1.3);
        c.stroke();
      }
      c.restore();
      if (item.type === "chocopie") {
        this.star(x - size * 0.63, y - 4, 3 + Math.sin(now * 5) * 0.5);
        this.star(x + size * 0.65, y + 3, 3);
      }
      this.sprite(item.type, x, y, size, this.reduced ? 0 : item.angle);
    }
    const moving = game.state === "PLAYING" && game.direction !== 0;
    const name = moving ? "walk" : "idle";
    const width = game.playerWidth * W,
      asset = this.assets[name];
    const height = (width * asset.crop[3]) / asset.crop[2];
    const bob = this.reduced
      ? 0
      : moving
        ? Math.abs(Math.sin(now * 15)) * 2
        : Math.sin(now * 2.8) * 0.8;
    const reaction =
      this.reaction && !this.reduced
        ? Math.sin((this.reaction.age / 0.42) * Math.PI)
        : 0;
    const x = game.playerX * W,
      feet = H * C.groundY;
    this.ellipse(x, feet + 2, width * 0.4, width * 0.075, "#95755724");
    this.sprite(
      name,
      x,
      feet - height / 2 - bob - reaction * 3,
      width,
      this.reaction?.kind === "fish" ? reaction * -0.07 : 0,
      moving && game.facing < 0,
      1 + reaction * 0.045,
    );
    for (const effect of this.effects) {
      const progress = effect.age / effect.life,
        ex = effect.x * W + (effect.vx || 0) * effect.age,
        ey = effect.y * H + (effect.vy || -30) * effect.age;
      c.save();
      c.globalAlpha = Math.min(1, (1 - progress) * 1.8);
      if (effect.kind === "label") {
        c.font = `bold ${effect.points === 50 ? 21 : 18}px sans-serif`;
        c.textAlign = "center";
        c.fillStyle =
          effect.points < 0
            ? "#628fa5"
            : effect.points === 50
              ? "#ac7d2d"
              : "#cc7f93";
        c.strokeStyle = "#fffaf2";
        c.lineWidth = 4;
        c.lineJoin = "round";
        const text = effect.points > 0 ? `+${effect.points} ♡` : "−50";
        const padding = c.measureText(text).width / 2 + 7;
        const labelX = Math.max(padding, Math.min(W - padding, ex));
        c.strokeText(text, labelX, ey);
        c.fillText(text, labelX, ey);
      } else if (effect.kind === "fish") {
        c.strokeStyle = "#7cbbd5";
        c.lineWidth = 1.3;
        c.beginPath();
        c.arc(ex, ey, 2.5 + progress * 3, 0, Math.PI * 2);
        c.stroke();
      } else if (effect.kind === "chocopie") this.star(ex, ey, 5);
      else this.heart(ex, ey, 5, "#e6a2b4");
      c.restore();
    }
  }
}
