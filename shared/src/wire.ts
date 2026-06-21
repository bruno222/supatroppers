// Compact JSON wire codec. The brain-server and frontend keep verbose internal
// types (Snapshot, PlayerState, ...) and only translate at the channel boundary
// via these encode/decode functions. Short keys, numeric enums, integer coords.

import type {
  ApplyAbility,
  BrickDef,
  CursorClick,
  CursorMove,
  HoleDef,
  InputMessage,
  Ping,
  PlayerBye,
  PlayerHeartbeat,
  PlayerHello,
  PlayerState,
  Snapshot,
  TropperAction,
  TropperState,
  WorldMessage,
} from './protocol.js';
import { BRIDGE_BRICK_W } from './physics.js';

// World channel type codes (server → clients).
const W_SNAPSHOT = 1;
const W_PING = 2;

// Input channel type codes (clients → server).
const I_HELLO = 1;
const I_MOVE = 2;
const I_CLICK = 3;
const I_HEARTBEAT = 4;
const I_BYE = 5;
const I_ABILITY = 6;
const I_READY = 7;

// Action enum (TropperAction).
const ACTION_TO_CODE: Record<TropperAction, number> = {
  walk: 0,
  fall: 1,
  splat: 2,
  block: 3,
  dig: 4,
  exit: 5,
  build: 6,
  float: 7,
};
const CODE_TO_ACTION: readonly TropperAction[] = [
  'walk', 'fall', 'splat', 'block', 'dig', 'exit', 'build', 'float',
];

// Phase enum.
type Phase = Snapshot['phase'];
const PHASE_TO_CODE: Record<Phase, number> = { waiting: 0, playing: 1, ended: 2 };
const CODE_TO_PHASE: readonly Phase[] = ['waiting', 'playing', 'ended'];

// Ability enum.
type Ability = ApplyAbility['ability'];
const ABILITY_TO_CODE: Record<Ability, number> = { dig: 0, block: 1, stairs: 2, umbrella: 3 };
const CODE_TO_ABILITY: readonly Ability[] = ['dig', 'block', 'stairs', 'umbrella'];

// ---------------------------------------------------------------------------
// PlayerState <-> wire
// ---------------------------------------------------------------------------

type WirePlayer = {
  p: string;
  n: string;
  c: number;
  x: number;
  y: number;
  o: 0 | 1;
  l: number;
};

function encPlayer(p: PlayerState): WirePlayer {
  return {
    p: p.playerId,
    n: p.name,
    c: p.colorIndex,
    x: Math.round(p.x),
    y: Math.round(p.y),
    o: p.online ? 1 : 0,
    l: p.lastSeen,
  };
}

function decPlayer(w: any): PlayerState | null {
  if (!w || typeof w !== 'object') return null;
  return {
    playerId: String(w.p),
    name: String(w.n),
    colorIndex: Number(w.c) | 0,
    x: Number(w.x),
    y: Number(w.y),
    online: w.o === 1,
    lastSeen: Number(w.l),
  };
}

// ---------------------------------------------------------------------------
// TropperState <-> wire
// ---------------------------------------------------------------------------

type WireTropper = {
  i: string;
  w: string;
  x: number;
  y: number;
  a: number;
  f: 0 | 1;
  m?: number;
  u: 0 | 1;
};

function encTropper(t: TropperState): WireTropper {
  const w: WireTropper = {
    i: t.id,
    w: t.ownerId,
    x: Math.round(t.x),
    y: Math.round(t.y),
    a: ACTION_TO_CODE[t.action],
    f: t.faceLeft ? 1 : 0,
    u: t.hasUmbrella ? 1 : 0,
  };
  // `timer` is only visualized on the client during a dig (hole growth animation).
  // For other actions the brain owns timing; clients never read it. Skip the bytes.
  if (t.action === 'dig') w.m = Math.round(t.timer);
  return w;
}

function decTropper(w: any): TropperState | null {
  if (!w || typeof w !== 'object') return null;
  const action = CODE_TO_ACTION[Number(w.a) | 0];
  if (!action) return null;
  return {
    id: String(w.i),
    ownerId: String(w.w),
    x: Number(w.x),
    y: Number(w.y),
    fallHeight: 0,
    action,
    faceLeft: w.f === 1,
    timer: w.m === undefined ? 0 : Number(w.m),
    hasUmbrella: w.u === 1,
  };
}

// ---------------------------------------------------------------------------
// World messages (server → clients)
// ---------------------------------------------------------------------------

export function encodeWorldMessage(msg: WorldMessage): unknown {
  switch (msg.type) {
    case 'snapshot':
      return {
        k: W_SNAPSHOT,
        t: msg.t,
        P: msg.players.map(encPlayer),
        T: msg.troppers.map(encTropper),
        S: msg.scores,
        h: PHASE_TO_CODE[msg.phase],
        r: Math.round(msg.timeRemainingMs),
        H: msg.holes.map((hole) => ({ x: Math.round(hole.x), y: Math.round(hole.y) })),
        B: msg.bricks.map((b) => ({ x: Math.round(b.x), y: Math.round(b.y) })),
        R: msg.readyPlayerIds,
      };
    case 'ping':
      return {
        k: W_PING,
        p: msg.playerId,
        c: msg.colorIndex,
        x: Math.round(msg.x),
        y: Math.round(msg.y),
        t: msg.t,
      };
  }
}

export function decodeWorldMessage(wire: unknown): WorldMessage | null {
  if (!wire || typeof wire !== 'object') return null;
  const w = wire as Record<string, any>;
  switch (w.k) {
    case W_SNAPSHOT: {
      const phase = CODE_TO_PHASE[Number(w.h) | 0];
      if (!phase) return null;
      const players: PlayerState[] = [];
      const troppers: TropperState[] = [];
      if (Array.isArray(w.P)) {
        for (const wp of w.P) {
          const p = decPlayer(wp);
          if (p) players.push(p);
        }
      }
      if (Array.isArray(w.T)) {
        for (const wt of w.T) {
          const t = decTropper(wt);
          if (t) troppers.push(t);
        }
      }
      const holes: HoleDef[] = [];
      if (Array.isArray(w.H)) {
        for (const wh of w.H) {
          if (wh && typeof wh === 'object') {
            holes.push({ x: Number(wh.x), y: Number(wh.y) });
          }
        }
      }
      const bricks: BrickDef[] = [];
      if (Array.isArray(w.B)) {
        for (const wb of w.B) {
          if (wb && typeof wb === 'object') {
            bricks.push({ x: Number(wb.x), y: Number(wb.y), w: BRIDGE_BRICK_W });
          }
        }
      }
      const readyPlayerIds: string[] = [];
      if (Array.isArray(w.R)) {
        for (const id of w.R) readyPlayerIds.push(String(id));
      }
      const snapshot: Snapshot = {
        type: 'snapshot',
        t: Number(w.t),
        players,
        troppers,
        scores: w.S && typeof w.S === 'object' ? (w.S as Record<string, number>) : {},
        holes,
        bricks,
        phase,
        timeRemainingMs: Number(w.r),
        readyPlayerIds,
      };
      return snapshot;
    }
    case W_PING: {
      const ping: Ping = {
        type: 'ping',
        playerId: String(w.p),
        colorIndex: Number(w.c) | 0,
        x: Number(w.x),
        y: Number(w.y),
        t: Number(w.t),
      };
      return ping;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Input messages (clients → server)
// ---------------------------------------------------------------------------

export function encodeInputMessage(msg: InputMessage): unknown {
  switch (msg.type) {
    case 'player_hello':
      return { k: I_HELLO, p: msg.playerId, n: msg.name, c: msg.preferredColorIndex };
    case 'cursor_move':
      return {
        k: I_MOVE,
        p: msg.playerId,
        x: Math.round(msg.x),
        y: Math.round(msg.y),
        t: msg.t,
      };
    case 'cursor_click':
      return {
        k: I_CLICK,
        p: msg.playerId,
        x: Math.round(msg.x),
        y: Math.round(msg.y),
        t: msg.t,
      };
    case 'player_heartbeat':
      return { k: I_HEARTBEAT, p: msg.playerId, t: msg.t };
    case 'player_bye':
      return { k: I_BYE, p: msg.playerId };
    case 'apply_ability':
      return {
        k: I_ABILITY,
        p: msg.playerId,
        i: msg.tropperId,
        a: ABILITY_TO_CODE[msg.ability],
      };
    case 'player_ready':
      return { k: I_READY, p: msg.playerId };
  }
}

export function decodeInputMessage(wire: unknown): InputMessage | null {
  if (!wire || typeof wire !== 'object') return null;
  const w = wire as Record<string, any>;
  switch (w.k) {
    case I_HELLO: {
      const m: PlayerHello = {
        type: 'player_hello',
        playerId: String(w.p),
        name: String(w.n),
        preferredColorIndex: Number(w.c) | 0,
      };
      return m;
    }
    case I_MOVE: {
      const m: CursorMove = {
        type: 'cursor_move',
        playerId: String(w.p),
        x: Number(w.x),
        y: Number(w.y),
        t: Number(w.t),
      };
      return m;
    }
    case I_CLICK: {
      const m: CursorClick = {
        type: 'cursor_click',
        playerId: String(w.p),
        x: Number(w.x),
        y: Number(w.y),
        t: Number(w.t),
      };
      return m;
    }
    case I_HEARTBEAT: {
      const m: PlayerHeartbeat = {
        type: 'player_heartbeat',
        playerId: String(w.p),
        t: Number(w.t),
      };
      return m;
    }
    case I_BYE: {
      const m: PlayerBye = { type: 'player_bye', playerId: String(w.p) };
      return m;
    }
    case I_ABILITY: {
      const ability = CODE_TO_ABILITY[Number(w.a) | 0];
      if (!ability) return null;
      const m: ApplyAbility = {
        type: 'apply_ability',
        playerId: String(w.p),
        tropperId: String(w.i),
        ability,
      };
      return m;
    }
    case I_READY:
      return { type: 'player_ready', playerId: String(w.p) };
  }
  return null;
}
