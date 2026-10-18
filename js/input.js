export class SwipeInput {
  constructor(canvas, onThrow, onHint) {
    this.canvas = canvas;
    this.onThrow = onThrow;
    this.onHint = onHint;
    this.active = null;
    this.enabled = false;
    canvas.addEventListener("pointerdown", (e) => this.down(e));
    canvas.addEventListener("pointermove", (e) => this.move(e));
    canvas.addEventListener("pointerup", (e) => this.up(e));
    canvas.addEventListener("pointercancel", (e) => this.cancel(e));
    canvas.addEventListener("lostpointercapture", (e) => this.cancel(e));
  }
  point(e) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width,
      y: (e.clientY - r.top) / r.height,
      t: e.timeStamp,
    };
  }
  down(e) {
    if (!this.enabled || this.active || !e.isPrimary || e.button !== 0) return;
    const p = this.point(e);
    if (Math.abs(p.x - 0.5) > 0.22 || p.y < 0.69 || p.y > 0.98) {
      this.onHint();
      return;
    }
    e.preventDefault();
    this.active = { id: e.pointerId, start: p, last: p };
    this.canvas.setPointerCapture(e.pointerId);
  }
  move(e) {
    if (this.active?.id !== e.pointerId) return;
    e.preventDefault();
    this.active.last = this.point(e);
  }
  up(e) {
    if (this.active?.id !== e.pointerId) return;
    e.preventDefault();
    const a = this.active,
      p = this.point(e);
    this.active = null;
    this.canvas.releasePointerCapture(e.pointerId);
    if (this.enabled)
      this.onThrow(
        p.x - a.start.x,
        p.y - a.start.y,
        Math.max(0.01, (p.t - a.start.t) / 1000),
        a.start.x - 0.5,
      );
  }
  cancel(e) {
    if (this.active?.id === e.pointerId) this.active = null;
  }
  reset() {
    if (this.active) {
      try {
        this.canvas.releasePointerCapture(this.active.id);
      } catch {}
      this.active = null;
    }
  }
}
