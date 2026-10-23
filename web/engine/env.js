// env.js — envelopes as point lists, sampled into Float32Arrays for setValueCurveAtTime.
//
// A point list is [[ms, value, shape?], ...]; `shape` describes the segment ENDING at that point:
//   "lin"   straight line
//   "exp"   geometric (straight in dB / octaves) — natural for amplitude decays and frequencies
//   number  power curve: v0 + (v1-v0) * u^k  (k>1 = slow start, k<1 = fast start)
// Values before the first point hold the first value; after the last, hold the last.

const RES = 4; // samples per ms

function seg(v0, v1, u, shape, floor) {
  if (shape === "exp") {
    const a = Math.max(Math.abs(v0), floor), b = Math.max(Math.abs(v1), floor);
    const s = v0 < 0 || v1 < 0 ? -1 : 1;
    const v = s * a * Math.pow(b / a, u);
    // snap the final approach to a true zero
    if (v1 === 0 && u > 0.98) return v * (1 - u) / 0.02;
    return v;
  }
  if (typeof shape === "number") return v0 + (v1 - v0) * Math.pow(u, shape);
  return v0 + (v1 - v0) * u;
}

export function valueAt(points, ms, defShape, floor = 1e-4) {
  if (ms <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [t1, v1, sh] = points[i];
    const [t0, v0] = points[i - 1];
    if (ms <= t1) {
      const u = t1 > t0 ? (ms - t0) / (t1 - t0) : 1;
      const shape = sh ?? (typeof defShape === "function" ? defShape(v0, v1) : defShape);
      return seg(v0, v1, u, shape, floor);
    }
  }
  return points[points.length - 1][1];
}

// sample a point list over [0, durMs]; map(v) transforms each value (e.g. semitones -> cents)
export function sample(points, durMs, defShape, { floor = 1e-4, map = null } = {}) {
  const n = Math.max(2, Math.ceil(durMs * RES) + 1);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const v = valueAt(points, (i / (n - 1)) * durMs, defShape, floor);
    out[i] = map ? map(v) : v;
  }
  return out;
}

export function checkPoints(points, what) {
  if (!Array.isArray(points) || points.length < 1 || !points.every((p) => Array.isArray(p) && p.length >= 2 && typeof p[0] === "number" && typeof p[1] === "number"))
    throw new Error(`${what}: expected [[ms, value, shape?], ...], got ${JSON.stringify(points)}`);
  for (let i = 1; i < points.length; i++)
    if (points[i][0] < points[i - 1][0]) throw new Error(`${what}: times must be ascending (${JSON.stringify(points)})`);
  return points;
}

// amplitude envelope: shorthand {a, h, d, s, sus, r, curve} or explicit points.
//   a: attack ms (linear rise), h: hold ms at 1, d: decay ms to s (default s=0, "exp" shape),
//   sus: ms held at s, r: release ms to 0. curve: shape for d and r segments.
export function ampPoints(env) {
  if (Array.isArray(env)) return checkPoints(env, "env");
  const e = { a: 2, h: 0, d: 300, s: 0, sus: 0, r: 0, curve: "exp", ...(env || {}) };
  const pts = [[0, 0], [e.a, 1, e.attackCurve ?? "lin"]];
  let t = e.a;
  if (e.h) pts.push([(t += e.h), 1]);
  pts.push([(t += e.d), e.s, e.curve]);
  if (e.s > 0) {
    if (e.sus) pts.push([(t += e.sus), e.s]);
    pts.push([(t += Math.max(e.r, 5)), 0, e.curve]);
  }
  return pts;
}

export const ampShape = (v0, v1) => (v1 >= v0 ? "lin" : "exp");
export const endMs = (points) => points[points.length - 1][0];
