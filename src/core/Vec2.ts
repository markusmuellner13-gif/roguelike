export interface Vec2 {
  x: number;
  y: number;
}

export function v2(x = 0, y = 0): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, y: a.y * s };
}

export function len(a: Vec2): number {
  return Math.sqrt(a.x * a.x + a.y * a.y);
}

export function lenSq(a: Vec2): number {
  return a.x * a.x + a.y * a.y;
}

export function normalize(a: Vec2): Vec2 {
  const l = len(a);
  if (l < 1e-6) return { x: 0, y: 0 };
  return { x: a.x / l, y: a.y / l };
}

export function dist(a: Vec2, b: Vec2): number {
  return len(sub(a, b));
}

export function distSq(a: Vec2, b: Vec2): number {
  return lenSq(sub(a, b));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function angleTo(a: Vec2, b: Vec2): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}
