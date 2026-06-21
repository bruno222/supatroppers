export const STAGE_W = 1280;
export const STAGE_H = 768;
export const GROUND_TOP = 676; // STAGE_H - 92 (floor div height)

export type Platform = { left: number; top: number; width: number };
export type DoorDef = { id: number; left: number; top: number };
export type GateDef = { left: number; top: number; width: number; height: number };
export type WallDef = { left: number; top: number; width: number; height: number };

export const PLATFORMS: Platform[] = [
  { left: 60,   top: 175, width: 300 }, // top-right one
  { left: 770,  top: 150, width: 360 }, // top-left one
  { left: 430,  top: 300, width: 420 },
  { left: 120,  top: 475, width: 380 },
  { left: 740,  top: 560, width: 440 },
];

// Doors sit atop platforms: door.top + DOOR_H == platform.top
export const DOORS: DoorDef[] = [
  { id: 0, left: 120,  top: 143 },
  { id: 1, left: 250,  top: 143 },
  { id: 2, left: 1050,  top: 118 }, // top-right one
  { id: 4, left: 560,  top: 268 },
];

export const DOOR_W = 30;
export const DOOR_H = 32;

// Outer gate bounding box (matches Background.tsx Gate component).
export const GATE: GateDef = { left: 1070, top: 458, width: 83, height: 102 };

// Static walls — block horizontal tropper movement until they climb over with stairs.
// This wall sits on platform 4 (top=560) and is exactly one full staircase tall (8×4=32px).
export const WALLS: WallDef[] = [
  { left: 940,  top: 528, width: 8, height: 32 }, // platform 4 (bottom-right), blocks path to gate
  { left: 778,  top: 118, width: 8, height: 32 }, // platform 1 (top-right), blocks door 2
];
