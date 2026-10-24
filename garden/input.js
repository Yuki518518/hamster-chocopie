export class HoldControls {
  constructor(left, right) {
    this.buttons = [left, right];
    this.pointers = new Map();
    this.keys = new Set();
    this.enabled = false;
    this.buttons.forEach((button, index) => {
      const direction = index ? 1 : -1;
      button.addEventListener("pointerdown", (event) => {
        if (!this.enabled || event.button !== 0) return;
        event.preventDefault();
        this.pointers.set(event.pointerId, direction);
        button.setPointerCapture(event.pointerId);
        this.paint();
      });
      const release = (event) => {
        if (!this.pointers.has(event.pointerId)) return;
        this.pointers.delete(event.pointerId);
        this.paint();
      };
      for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
        button.addEventListener(name, release);
      button.addEventListener("contextmenu", (event) => event.preventDefault());
    });
    window.addEventListener("keydown", (event) => {
      if (
        !this.enabled ||
        !["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(event.code)
      )
        return;
      event.preventDefault();
      this.keys.add(event.code);
      this.paint();
    });
    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
      this.paint();
    });
    window.addEventListener("blur", () => this.reset());
  }
  get axis() {
    if (!this.enabled) return 0;
    const values = [...this.pointers.values()];
    const left =
      values.includes(-1) ||
      this.keys.has("ArrowLeft") ||
      this.keys.has("KeyA");
    const right =
      values.includes(1) ||
      this.keys.has("ArrowRight") ||
      this.keys.has("KeyD");
    return Number(right) - Number(left);
  }
  paint() {
    const values = [...this.pointers.values()];
    this.buttons[0].classList.toggle(
      "held",
      this.enabled &&
        (values.includes(-1) ||
          this.keys.has("ArrowLeft") ||
          this.keys.has("KeyA")),
    );
    this.buttons[1].classList.toggle(
      "held",
      this.enabled &&
        (values.includes(1) ||
          this.keys.has("ArrowRight") ||
          this.keys.has("KeyD")),
    );
  }
  reset() {
    const ids = [...this.pointers.keys()];
    this.pointers.clear();
    this.keys.clear();
    for (const button of this.buttons)
      for (const id of ids) {
        try {
          if (button.hasPointerCapture(id)) button.releasePointerCapture(id);
        } catch {}
      }
    this.paint();
  }
  setEnabled(value) {
    this.enabled = value;
    if (!value) this.reset();
    this.buttons.forEach((button) => {
      button.disabled = !value;
    });
  }
}
