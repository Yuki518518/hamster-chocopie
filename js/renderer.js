import { project, positionAt } from "./physics.js";
export class Renderer {
  constructor(canvas, assets) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.assets = assets;
    this.W = 400;
    this.H = 650;
    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
  }
  resize() {
    const r = this.canvas.getBoundingClientRect(),
      d = Math.min(window.devicePixelRatio || 1, 3);
    this.W = r.width;
    this.H = r.height;
    this.canvas.width = Math.round(r.width * d);
    this.canvas.height = Math.round(r.height * d);
    this.ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  image(name, x, y, w, h, angle = 0) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    c.drawImage(this.assets[name], -w / 2, -h / 2, w, h);
    c.restore();
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
  render(g, time) {
    const c = this.ctx,
      W = this.W,
      H = this.H;
    c.clearRect(0, 0, W, H);
    c.fillStyle = "#fff9f3";
    c.fillRect(0, 0, W, H);
    // Deliberately quiet stationery details, kept outside the throwing lane.
    for (let i = 0; i < 19; i++) {
      const x = (((i * 83 + 29) % 399) / 400) * W,
        y = (((i * 157 + 64) % 701) / 710) * H;
      this.ellipse(x, y, 1.4, 1.4, "#e4cdbb66");
    }
    this.heart(W * 0.09, H * 0.32, 8, "#f4d4da");
    this.heart(W * 0.91, H * 0.69, 7, "#f4d4da");
    if (g.state === "TITLE" || g.state === "LOADING") {
      this.image("berry", W * 0.11, H * 0.78, 25, 31, -0.2);
      return;
    }
    c.save();
    c.strokeStyle = "#e9d5c3";
    c.lineWidth = 1;
    c.setLineDash([3, 6]);
    c.beginPath();
    c.ellipse(W / 2, H * 0.545, W * 0.38, H * 0.043, 0, 0, Math.PI * 2);
    c.stroke();
    c.restore();
    c.fillStyle = "#b4967e";
    c.font = "10px sans-serif";
    c.textAlign = "center";
    c.fillText("おやつ、ちょうだい ♡", W / 2, H * 0.27);
    this.image("berry", W * 0.09, H * 0.57, 25, 31, -0.2);
    this.image("berry", W * 0.9, H * 0.575, 21, 27, 0.2);
    const t = project(g.target.x, 1, 0, W, H),
      pulse = Math.max(0, g.reaction) / 0.5,
      bounce = Math.sin(pulse * Math.PI) * 0.09;
    this.ellipse(t.x, t.y + 5, W * 0.12, 8, "#a5855b1c");
    const size = Math.min(W * 0.36, H * 0.255) * (1 + bounce),
      bob = Math.sin(time * 4) * 2;
    this.image(
      "hamster",
      t.x,
      t.y - size * 0.46 + bob - pulse * 7,
      size,
      (size * 250) / 240,
      Math.max(-0.04, Math.min(0.04, g.target.v * 0.05)),
    );
    if (g.reaction > 0) {
      this.heart(t.x - size * 0.45, t.y - size * 0.9, 12, "#e99aaa");
      this.heart(t.x + size * 0.5, t.y - size * 0.85, 8, "#efb0c0");
    }
    for (const p of g.projectiles) {
      const q = positionAt(p, p.t),
        s = project(q.x, q.z, q.h, W, H),
        ground = project(q.x, q.z, 0, W, H);
      this.ellipse(ground.x, ground.y, 24 * s.scale, 6 * s.scale, "#69452f18");
      c.save();
      p.trail.forEach((v, i) => {
        c.globalAlpha = (i / Math.max(1, p.trail.length)) * 0.14;
        this.ellipse(v.x, v.y, 8 * s.scale, 8 * s.scale, "#d3a67a");
      });
      c.restore();
      const w = 78 * s.scale;
      this.image("pie", s.x, s.y - 14 * s.scale, w, w * 0.69, p.t * 1.4);
    }
    for (const e of g.effects) {
      const f = e.age / e.life;
      c.save();
      c.globalAlpha = 1 - f;
      if (e.kind === "text") {
        c.textAlign = "center";
        c.font = "bold 23px sans-serif";
        c.fillStyle = "#c7778b";
        c.fillText("+10 ♡", e.x * W, t.y - size - 15 - e.age * 35);
      } else {
        const x = e.x * W + e.vx * e.age,
          y = e.y * H + e.vy * e.age + 30 * e.age * e.age;
        if (e.kind === "heart") this.heart(x, y, e.size, "#e9a0b1");
        else {
          c.fillStyle = "#b98a5c";
          c.fillRect(x, y, e.size / 2, e.size / 2);
        }
      }
      c.restore();
    }
    if (g.state === "PLAYING" && !g.ending) {
      const ready = g.reload <= 0;
      this.ellipse(W / 2, H * 0.86, 47, 10, ready ? "#b18c651e" : "#b18c650c");
      if (ready) {
        let x = W / 2,
          y = H * 0.84;
        if (g.input.active) {
          const a = g.input.active;
          const dx = (a.last.x - a.start.x) * W,
            dy = (a.last.y - a.start.y) * H;
          x += Math.max(-45, Math.min(45, dx * 0.16));
          y += Math.max(-35, Math.min(10, dy * 0.16));
          c.save();
          c.strokeStyle = "#dbb69c";
          c.lineWidth = 2;
          c.setLineDash([3, 7]);
          c.beginPath();
          c.moveTo(x, y - 45);
          c.lineTo(x + dx * 0.35, y - 45 + dy * 0.35);
          c.stroke();
          c.restore();
        }
        this.image("pie", x, y - 9, 92, 63, Math.sin(time * 2) * 0.035);
      }
      c.fillStyle = "#ad8b73";
      c.font = "10px sans-serif";
      c.textAlign = "center";
      c.fillText(
        ready ? "ここから、ぽーんっ！" : "次のおやつを準備中…",
        W / 2,
        H * 0.955,
      );
    }
  }
}
