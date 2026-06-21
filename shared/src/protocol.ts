// Wire protocol between frontend clients and the Brain Server.
// Versioned in the channel name; bump the suffix on breaking changes.

export const CHANNEL_INPUTS = 'i';
export const CHANNEL_WORLD = 'w';

// --- Client → Brain (on CHANNEL_INPUTS) ---

export type PlayerHello = {
  type: 'player_hello';
  playerId: string;
  name: string;
  preferredColorIndex: number;
};

export type CursorMove = {
  type: 'cursor_move';
  playerId: string;
  x: number;
  y: number;
  t: number;
};

export type CursorClick = {
  type: 'cursor_click';
  playerId: string;
  x: number;
  y: number;
  t: number;
};

export type PlayerHeartbeat = {
  type: 'player_heartbeat';
  playerId: string;
  t: number;
};

export type PlayerBye = {
  type: 'player_bye';
  playerId: string;
};

export type ApplyAbility = {
  type: 'apply_ability';
  playerId: string;
  tropperId: string;
  ability: 'dig' | 'block' | 'stairs' | 'umbrella';
};

export type PlayerReady = {
  type: 'player_ready';
  playerId: string;
};

export type InputMessage = PlayerHello | CursorMove | CursorClick | PlayerHeartbeat | PlayerBye | ApplyAbility | PlayerReady;

// --- Brain → Clients (on CHANNEL_WORLD) ---

export type PlayerState = {
  playerId: string;
  name: string;
  colorIndex: number;
  x: number;
  y: number;
  online: boolean;
  lastSeen: number;
};

// Subset of ActionName used by server-authoritative troppers.
export type TropperAction = 'walk' | 'fall' | 'splat' | 'block' | 'dig' | 'build' | 'float' | 'exit';

export type TropperState = {
  id: string;
  ownerId: string;      // playerId of the door owner, '' for seeded troppers
  x: number;
  y: number;
  fallHeight: number;   // accumulated px fallen — splat threshold check
  action: TropperAction;
  faceLeft: boolean;
  timer: number;        // countdown ms for timed actions (splat, dig, build)
  hasUmbrella: boolean; // one-fall umbrella charge; consumed on landing
};

export type HoleDef = {
  x: number;   // center x of the hole
  y: number;   // top y (= platform surface the tropper stood on)
};

export type BrickDef = {
  x: number;   // top-left x of the staircase step
  y: number;   // top y of the step (walkable surface)
  w: number;   // step width in px
};

export type Snapshot = {
  type: 'snapshot';
  t: number;
  players: PlayerState[];
  troppers: TropperState[];
  scores: Record<string, number>;
  holes: HoleDef[];
  bricks: BrickDef[];
  phase: 'waiting' | 'playing' | 'ended';
  timeRemainingMs: number;
  readyPlayerIds: string[];
};

export type Ping = {
  type: 'ping';
  playerId: string;
  colorIndex: number;
  x: number;
  y: number;
  t: number;
};

export type WorldMessage = Snapshot | Ping;

// --- Broadcast event names (used as the Realtime broadcast `event` field) ---

export const INPUT_EVENT = 'i';
export const WORLD_EVENT = 'w';
