export class SlideControls {
  constructor(left, stop, right) {
    this.buttons = [left, stop, right];
    this.pad = left.parentElement;
    this.pointers = new Map();
    this.keys = new Map();
    this.order = 0;
    this.enabled = false;
    this.touchEvents = "ontouchstart" in window;
    const prevent = (event) => {
      if (event.cancelable) event.preventDefault();
    };
    const clearSelection = () => {
      const selection = window.getSelection?.();
      if (selection && !selection.isCollapsed) selection.removeAllRanges();
    };
    const directionAt = (x, y) => {
      const pad = this.pad.getBoundingClientRect();
      if (
        y < pad.top - 14 ||
        y > pad.bottom + 14 ||
        x < pad.left - 14 ||
        x > pad.right + 14
      )
        return null;
      const position = (x - pad.left) / pad.width;
      return position < 1 / 3 ? -1 : position < 2 / 3 ? 0 : 1;
    };
    const press = (id, x, y) => {
      const direction = directionAt(x, y);
      if (direction === null) return;
      this.pointers.set(id, { direction, order: ++this.order });
      clearSelection();
      this.paint();
    };
    const move = (id, x, y) => {
      const held = this.pointers.get(id);
      if (!held) return;
      const direction = directionAt(x, y) ?? 0;
      if (held.direction !== direction) {
        held.direction = direction;
        held.order = ++this.order;
      }
      this.paint();
    };
    // Safari's touch gestures must be cancelled before they select or magnify text.
    // Mouse and pen use Pointer Events; a touch is never counted twice.
    this.pad.addEventListener(
      "touchstart",
      (event) => {
        if (!this.enabled) return;
        prevent(event);
        for (const touch of event.changedTouches)
          press(`t:${touch.identifier}`, touch.clientX, touch.clientY);
      },
      { passive: false },
    );
    window.addEventListener(
      "touchmove",
      (event) => {
        let handled = false;
        for (const touch of event.changedTouches) {
          const id = `t:${touch.identifier}`;
          if (this.pointers.has(id)) {
            move(id, touch.clientX, touch.clientY);
            handled = true;
          }
        }
        if (handled) prevent(event);
      },
      { passive: false, capture: true },
    );
    const touchEnd = (event) => {
      if (event.type === "touchcancel" && !event.changedTouches.length) {
        if (this.pointers.size) prevent(event);
        this.reset();
        return;
      }
      let handled = false;
      for (const touch of event.changedTouches)
        handled = this.pointers.delete(`t:${touch.identifier}`) || handled;
      if (handled) {
        prevent(event);
        this.paint();
      }
    };
    window.addEventListener("touchend", touchEnd, {
      passive: false,
      capture: true,
    });
    window.addEventListener("touchcancel", touchEnd, {
      passive: false,
      capture: true,
    });
    this.pad.addEventListener("pointerdown", (event) => {
      if (
        !this.enabled ||
        event.button !== 0 ||
        (event.pointerType === "touch" && this.touchEvents)
      )
        return;
      prevent(event);
      press(`p:${event.pointerId}`, event.clientX, event.clientY);
      try {
        this.pad.setPointerCapture(event.pointerId);
      } catch {}
    });
    window.addEventListener(
      "pointermove",
      (event) => {
        const id = `p:${event.pointerId}`;
        if (this.pointers.has(id)) {
          if (event.pointerType === "mouse" && event.buttons === 0) {
            this.pointers.delete(id);
            this.paint();
            return;
          }
          prevent(event);
          move(id, event.clientX, event.clientY);
        }
      },
      { passive: false, capture: true },
    );
    const release = (event) => {
      if (!this.pointers.delete(`p:${event.pointerId}`)) return;
      prevent(event);
      this.paint();
    };
    for (const name of ["pointerup", "pointercancel"])
      window.addEventListener(name, release, { passive: false, capture: true });
    this.pad.addEventListener("lostpointercapture", release);
    for (const name of [
      "contextmenu",
      "selectstart",
      "dragstart",
      "dblclick",
      "gesturestart",
      "gesturechange",
    ])
      this.pad.addEventListener(name, prevent, { passive: false });
    document.addEventListener("selectionchange", () => {
      if (this.pointers.size) clearSelection();
    });
    window.addEventListener("keydown", (event) => {
      const direction = { ArrowLeft: -1, ArrowRight: 1, KeyA: -1, KeyD: 1 }[
        event.code
      ];
      if (!this.enabled || !direction) return;
      prevent(event);
      if (!this.keys.has(event.code))
        this.keys.set(event.code, { direction, order: ++this.order });
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
    let latest = { direction: 0, order: -1 };
    for (const value of [...this.pointers.values(), ...this.keys.values()])
      if (value.order > latest.order) latest = value;
    return latest.direction;
  }
  paint() {
    const axis = this.axis;
    this.buttons.forEach((button, index) => {
      const active = this.enabled && axis === index - 1;
      button.classList.toggle("held", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }
  reset() {
    const ids = [...this.pointers.keys()];
    this.pointers.clear();
    this.keys.clear();
    for (const id of ids)
      if (id.startsWith("p:")) {
        try {
          const pointerId = Number(id.slice(2));
          if (this.pad.hasPointerCapture(pointerId))
            this.pad.releasePointerCapture(pointerId);
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
    this.paint();
  }
}
