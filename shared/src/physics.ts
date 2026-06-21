import { PLATFORMS, GROUND_TOP, STAGE_W, GATE } from './terrain.js';

export const TROPPER_W = 24;
export const TROPPER_H = 32;
export const WALK_SPEED = 28;   // px/s
export const FALL_SPEED = 240;  // px/s constant (no acceleration)
export const UMBRELLA_FALL_SPEED = 80; // px/s under an open umbrella
export const SPLAT_FALL = 220;  // px of free-fall before splat
export const SPLAT_DUR = 800;   // ms splat animation before eviction
export const DIG_DUR = 4000;    // ms dig action before tropper falls through
export const HOLE_W = 20;       // px width of a dug hole (must match renderer)
export const PLATFORM_H = 30;   // px height of a platform (must match Background)
export const BRIDGE_STEPS = 8;       // bricks placed per stairs ability
export const BRIDGE_BRICK_W = 16;    // px width of one staircase step
export const BRIDGE_BRICK_H = 4;     // px height of one staircase step
export const BRIDGE_STEP_MS = 900;   // ms between consecutive step placements
export const BUILD_DUR = BRIDGE_STEPS * BRIDGE_STEP_MS; // total build duration

// Find the nearest floor surface at-or-below fromY at horizontal center cx.
// Returns Infinity when no surface exists.
export function floorBelow(cx: number, fromY: number): number {
  let best = Infinity;
  if (cx >= 0 && cx <= STAGE_W && GROUND_TOP >= fromY) {
    best = GROUND_TOP;
  }
  for (const p of PLATFORMS) {
    if (cx >= p.left && cx <= p.left + p.width && p.top >= fromY) {
      if (p.top < best) best = p.top;
    }
  }
  return best;
}

// Like floorBelow but skips completed holes — troppers fall through dug tunnels.
export function floorBelowWithHoles(
  cx: number,
  fromY: number,
  holes: ReadonlyArray<{ x: number; y: number }>,
): number {
  let best = Infinity;
  if (cx >= 0 && cx <= STAGE_W && GROUND_TOP >= fromY) {
    best = GROUND_TOP;
  }
  for (const p of PLATFORMS) {
    if (cx >= p.left && cx <= p.left + p.width && p.top >= fromY) {
      const dug = holes.some(
        (h) => Math.abs(h.x - cx) < HOLE_W / 2 && Math.abs(h.y - p.top) < 4,
      );
      if (!dug && p.top < best) best = p.top;
    }
  }
  return best;
}

// floorBelowWithHoles + built staircase bricks. Bricks override holes — a brick
// laid into a dug-out platform still acts as floor.
export function floorBelowAll(
  cx: number,
  fromY: number,
  holes: ReadonlyArray<{ x: number; y: number }>,
  bricks: ReadonlyArray<{ x: number; y: number; w: number }>,
): number {
  let best = floorBelowWithHoles(cx, fromY, holes);
  for (const b of bricks) {
    if (cx >= b.x && cx <= b.x + b.w && b.y >= fromY && b.y < best) {
      best = b.y;
    }
  }
  return best;
}

// Walk-aware floor lookup: lets a tropper step UP by `stepUp` pixels onto a
// brick. Platforms still use the strict `feet - 2` cutoff (no climbing onto
// arbitrary platform edges), so only built bricks become climbable. Used by
// the walk branch so any tropper passing a built staircase walks up it.
export function walkFloor(
  cx: number,
  feet: number,
  holes: ReadonlyArray<{ x: number; y: number }>,
  bricks: ReadonlyArray<{ x: number; y: number; w: number }>,
  stepUp: number,
): number {
  let best = floorBelowWithHoles(cx, feet - 2, holes);
  const brickFromY = feet - stepUp;
  for (const b of bricks) {
    if (cx >= b.x && cx <= b.x + b.w && b.y >= brickFromY && b.y < best) {
      best = b.y;
    }
  }
  return best;
}

// Default step-up window for the walk branch. Sized to climb one brick
// (BRIDGE_BRICK_H) with a couple of pixels of slack.
export const STAIR_STEP_UP = BRIDGE_BRICK_H + 2;

// True when a tropper's bounding box overlaps the Gate.
export function isInGate(lx: number, ly: number): boolean {
  const cx = lx + TROPPER_W / 2;
  const cy = ly + TROPPER_H / 2;
  return (
    cx >= GATE.left &&
    cx <= GATE.left + GATE.width &&
    cy >= GATE.top &&
    cy <= GATE.top + GATE.height
  );
}
