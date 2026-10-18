import { CONFIG as C, clamp } from "./config.js";
export function makeThrow(dx, dy, seconds, startX = 0) {
  if (dy > -0.045 || Math.hypot(dx, dy) < 0.065) return null;
  const strength = clamp(
    (-dy * 0.95 + (-dy / Math.max(0.055, seconds)) * 0.12) * C.throwSensitivity,
    0,
    1,
  );
  const vz = C.minDepthSpeed + strength * (C.maxDepthSpeed - C.minDepthSpeed);
  const flight = 1 / vz;
  return {
    x: startX,
    z: 0,
    h: 0,
    vx: clamp(dx / -dy, -1.3, 1.3) * vz * 0.94,
    vz,
    vh: clamp(0.5 * C.gravity * flight + 0.2 / flight, 1.35, 3.2),
    t: 0,
    checked: false,
    done: false,
    trail: [],
  };
}
export function positionAt(p, t) {
  return {
    x: p.x + p.vx * t,
    z: p.vz * t,
    h: p.vh * t - 0.5 * C.gravity * t * t,
  };
}
// A swept test at the target depth uses the target's interpolated arrival position.
export function stepProjectile(p, dt, previousTargetX, targetX) {
  const before = p.t;
  p.t += dt;
  const prev = positionAt(p, before),
    now = positionAt(p, p.t);
  let hit = false;
  if (!p.checked && prev.z < C.targetZ && now.z >= C.targetZ) {
    p.checked = true;
    const crossing = C.targetZ / p.vz,
      at = positionAt(p, crossing),
      f = clamp((crossing - before) / dt, 0, 1);
    const target = previousTargetX + (targetX - previousTargetX) * f;
    hit =
      at.h >= -0.04 && at.h <= 0.72 && Math.abs(at.x - target) <= C.hitRadius;
    if (hit) p.done = true;
  }
  if (now.h < -0.1 || now.z > 1.65 || p.t > 1.8) p.done = true;
  return { hit, position: now };
}
export function project(x, z, h, W, H) {
  const scale = 1 / (1 + z * 0.85);
  return {
    x: W / 2 + x * W * scale,
    y: H * 0.84 - z * H * 0.3 - h * H * 0.2,
    scale,
  };
}
