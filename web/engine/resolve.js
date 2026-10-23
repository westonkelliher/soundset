// resolve.js — per-seed randomization of a patch.
//   {"rand": [min, max]}   uniform number            (seed 0 -> midpoint)
//   {"rand": [min, max], "int": true}                 (rounded)
//   {"pick": [a, b, ...]}  one of the values          (seed 0 -> first)
// Seed 0 is the canonical "center" render; seeds 1..N are the baked variations.
import { mulberry32 } from "./util.js";

export function resolve(patch, seed = 0) {
  const rng = seed === 0 ? null : mulberry32(seed * 7919 + 17);
  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      if (Array.isArray(v.rand) && Object.keys(v).every((k) => k === "rand" || k === "int")) {
        const [lo, hi] = v.rand;
        if (typeof lo !== "number" || typeof hi !== "number") throw new Error(`rand needs two numbers, got ${JSON.stringify(v.rand)} (use pick for notes/strings)`);
        let x = rng ? lo + (hi - lo) * rng() : (lo + hi) / 2;
        return v.int ? Math.round(x) : x;
      }
      if (Array.isArray(v.pick) && Object.keys(v).length === 1) return walk(rng ? v.pick[Math.floor(rng() * v.pick.length)] : v.pick[0]);
      const o = {};
      for (const k of Object.keys(v)) o[k] = walk(v[k]);
      return o;
    }
    return v;
  };
  return walk(patch);
}
