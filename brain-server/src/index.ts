import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import {
  CHANNEL_INPUTS,
  CHANNEL_WORLD,
  INPUT_EVENT,
  WORLD_EVENT,
  PALETTE_SIZE,
  DOORS,
  DOOR_W,
  STAGE_W,
  WALLS,
  floorBelowAll,
  walkFloor,
  STAIR_STEP_UP,
  isInGate,
  TROPPER_W,
  TROPPER_H,
  GROUND_TOP,
  PLATFORM_H,
  WALK_SPEED,
  FALL_SPEED,
  UMBRELLA_FALL_SPEED,
  SPLAT_FALL,
  SPLAT_DUR,
  DIG_DUR,
  BRIDGE_STEPS,
  BRIDGE_BRICK_W,
  BRIDGE_BRICK_H,
  BRIDGE_STEP_MS,
  BUILD_DUR,
  type InputMessage,
  type PlayerState,
  type TropperState,
  type HoleDef,
  type BrickDef,
  type Ping,
  type Snapshot,
  type WorldMessage,
  encodeWorldMessage,
  decodeInputMessage,
} from '@supatroppers/shared';


const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const PORT = Number(process.env.PORT ?? 8080);

const startedAt = Date.now();

process.on('uncaughtException', (err) => {
  console.error('[brain] UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[brain] UNHANDLED REJECTION:', reason);
});
process.on('SIGTERM', () => {
  console.log('[brain] SIGTERM received — shutting down');
  process.exit(0);
});
process.on('SIGINT', () => {
  console.log('[brain] SIGINT received — shutting down');
  process.exit(0);
});

const TICK_MS = 50;                 // 20 Hz snapshot rate
const OFFLINE_MS = 2_000;          // mark player offline after this silence
const EVICT_MS = 3_000;            // drop player from roster entirely
const SPAWN_INTERVAL_MS = 3_000;   // one tropper per player per batch
const ROUND_MS = 240_000;          // round length
const MAX_TROPPERS = 60;
const LOBBY_AUTO_READY_MS = 20_000; // auto-ready players after this long in lobby
const MAX_PLAYERS = 10; // change at Lobby.tsx as well

// ---------------------------------------------------------------------------
// In-memory authoritative state — single global room.
// ---------------------------------------------------------------------------

const players = new Map<string, PlayerState>();
const troppers = new Map<string, TropperState>();
const scores: Record<string, number> = {};
const holes: HoleDef[] = [];
const bricks: BrickDef[] = [];
const digStartY = new Map<string, number>(); // tropperId → y when dig began
type BuildState = { stepsRemaining: number; nextStepInMs: number; dir: -1 | 1; baseX: number; baseY: number };
const buildState = new Map<string, BuildState>();

// Tracks which players have clicked "I'm ready" in the lobby.
const readySet = new Set<string>();
// Tracks when each player entered the lobby (for auto-ready timeout).
const lobbyEnteredAt = new Map<string, number>();

let phase: Snapshot['phase'] = 'waiting';
let timeRemainingMs = ROUND_MS;
let spawnTimer = SPAWN_INTERVAL_MS;
let endedAt: number | null = null;

let lastTickAt = Date.now();
let lastHeartbeatLog = Date.now();
const HEARTBEAT_LOG_INTERVAL_MS = 60_000;

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function resetGame() {
  phase = 'waiting';
  timeRemainingMs = ROUND_MS;
  spawnTimer = SPAWN_INTERVAL_MS;
  endedAt = null;
  troppers.clear();
  holes.length = 0;
  bricks.length = 0;
  digStartY.clear();
  buildState.clear();
  readySet.clear();
  lobbyEnteredAt.clear();
  // Re-populate lobbyEnteredAt for still-online players so auto-ready timers restart.
  const now = Date.now();
  for (const p of players.values()) {
    if (p.online) lobbyEnteredAt.set(p.playerId, now);
  }
  for (const pid of Object.keys(scores)) scores[pid] = 0;
  console.log('[brain] game reset');
}

// ---------------------------------------------------------------------------
// Color assignment
// ---------------------------------------------------------------------------

function assignColorIndex(preferred: number): number {
  const used = new Set<number>();
  for (const p of players.values()) if (p.online) used.add(p.colorIndex);
  const start = Math.max(0, Math.floor(preferred)) % PALETTE_SIZE;
  for (let i = 0; i < PALETTE_SIZE; i++) {
    const idx = (start + i) % PALETTE_SIZE;
    if (!used.has(idx)) return idx;
  }
  return start;
}

// ---------------------------------------------------------------------------
// Tropper spawning
// ---------------------------------------------------------------------------

function spawnTropper(doorId: number, ownerId: string) {
  if (troppers.size >= MAX_TROPPERS) return;
  const door = DOORS[doorId];
  if (!door) return;
  const id = genId();
  troppers.set(id, {
    id,
    ownerId,
    x: door.left + Math.floor((DOOR_W - TROPPER_W) / 2),
    y: door.top, // feet == platform.top (door.top + DOOR_H == platform.top)
    fallHeight: 0,
    action: 'walk',
    faceLeft: door.left > STAGE_W / 2,
    timer: 0,
    hasUmbrella: false,
  });
}

// Each cycle: shuffle all doors, pair one to each online player in order.
// With N players and 5 doors the pairing wraps modulo, so every player
// always gets exactly one tropper and no two players share a door in
// cycles where N ≤ 5.
function batchSpawn() {
  const online = [...players.values()].filter((p) => p.online);
  if (online.length === 0) return;
  const doorIds = shuffle(DOORS.map((_, i) => i));
  for (let i = 0; i < online.length; i++) {
    spawnTropper(doorIds[i % doorIds.length], online[i].playerId);
  }
}

// Seed unowned troppers for the demo when no players are connected.
function seedTroppers() {
  for (let i = 0; i < DOORS.length; i++) spawnTropper(i, '');
  spawnTropper(0, '');
}

// ---------------------------------------------------------------------------
// Physics step — called once per tick per tropper
// ---------------------------------------------------------------------------

function stepTropper(trop: TropperState, dt: number) {
  if (trop.action === 'exit') return;

  if (trop.action === 'splat') {
    trop.timer -= dt;
    if (trop.timer <= 0) trop.action = 'exit';
    return;
  }

  if (trop.action === 'dig') {
    const startY = digStartY.get(trop.id) ?? trop.y;
    trop.timer -= dt;
    const progress = 1 - Math.max(0, trop.timer) / DIG_DUR;
    trop.y = startY + progress * PLATFORM_H;
    if (trop.timer <= 0) {
      holes.push({ x: trop.x + TROPPER_W / 2, y: startY + TROPPER_H });
      digStartY.delete(trop.id);
      // Ensure we're past the platform bottom so floorBelowAll skips it.
      trop.y = startY + PLATFORM_H + 3;
      if (trop.hasUmbrella) {
        trop.action = 'float';
        trop.hasUmbrella = false;
      } else {
        trop.action = 'fall';
      }
      trop.fallHeight = 0;
    }
    return;
  }

  if (trop.action === 'build') {
    const state = buildState.get(trop.id);
    if (!state) { trop.action = 'walk'; return; }
    state.nextStepInMs -= dt;
    trop.timer = Math.max(0, trop.timer - dt);
    if (state.nextStepInMs <= 0 && state.stepsRemaining > 0) {
      const idxPlaced = BRIDGE_STEPS - state.stepsRemaining;
      const bx = state.baseX + state.dir * BRIDGE_BRICK_W * idxPlaced;
      const by = state.baseY - BRIDGE_BRICK_H * (idxPlaced + 1);
      if (bx < 0 || bx + BRIDGE_BRICK_W > STAGE_W) {
        // Hit a world edge — abort build, turn around.
        buildState.delete(trop.id);
        trop.faceLeft = !trop.faceLeft;
        trop.action = 'walk';
        return;
      }
      bricks.push({ x: bx, y: by, w: BRIDGE_BRICK_W });
      // Tropper steps onto the new brick.
      trop.x = bx + (BRIDGE_BRICK_W - TROPPER_W) / 2;
      trop.y = by - TROPPER_H;
      state.stepsRemaining--;
      state.nextStepInMs += BRIDGE_STEP_MS;
      if (state.stepsRemaining <= 0) {
        buildState.delete(trop.id);
        trop.action = 'walk';
      }
    }
    return;
  }

  if (trop.action === 'block') return;

  const cx = trop.x + TROPPER_W / 2;
  const feet = trop.y + TROPPER_H;

  if (trop.action === 'fall' || trop.action === 'float') {
    const speed = trop.action === 'float' ? UMBRELLA_FALL_SPEED : FALL_SPEED;
    const fallDy = speed * dt / 1000;
    const floor = floorBelowAll(cx, feet - 2, holes, bricks);
    if (floor <= feet + fallDy) {
      trop.y = floor - TROPPER_H;
      const wasFloat = trop.action === 'float';
      if (!wasFloat && trop.fallHeight > SPLAT_FALL) {
        trop.action = 'splat';
        trop.timer = SPLAT_DUR;
        trop.fallHeight = 0;
      } else {
        trop.action = 'walk';
        trop.fallHeight = 0;
        if (wasFloat) trop.hasUmbrella = false; // one-fall umbrella consumed on landing
      }
    } else {
      trop.y += fallDy;
      trop.fallHeight += fallDy;
    }
    return;
  }

  // Walking
  if (isInGate(trop.x, trop.y)) {
    if (trop.ownerId) scores[trop.ownerId] = (scores[trop.ownerId] ?? 0) + 1;
    trop.action = 'exit';
    return;
  }

  const dir = trop.faceLeft ? -1 : 1;
  const dx = dir * WALK_SPEED * dt / 1000;
  const newX = trop.x + dx;
  const newCx = newX + TROPPER_W / 2;

  // Reverse at world edges.
  if (newX < 0 || newX + TROPPER_W > STAGE_W) {
    trop.faceLeft = !trop.faceLeft;
    return;
  }

  // Check for blocker troppers.
  for (const other of troppers.values()) {
    if (other.id === trop.id || other.action !== 'block') continue;
    const myFeet = trop.y + TROPPER_H;
    const otherFeet = other.y + TROPPER_H;
    if (Math.abs(myFeet - otherFeet) > 8) continue;
    const dist = (other.x + TROPPER_W / 2) - cx;
    const inRange = Math.abs(dist) < TROPPER_W + 4;
    if (inRange && ((!trop.faceLeft && dist > 0) || (trop.faceLeft && dist < 0))) {
      trop.faceLeft = !trop.faceLeft;
      return;
    }
  }

  // Check static walls. A tropper at platform level (feet=560) is blocked; one
  // who has climbed the full staircase (feet=528 = wall.top) clears it cleanly.
  for (const wall of WALLS) {
    if (
      newX + TROPPER_W > wall.left &&
      newX < wall.left + wall.width &&
      feet > wall.top &&
      trop.y < wall.top + wall.height
    ) {
      trop.faceLeft = !trop.faceLeft;
      return;
    }
  }

  // Check floor at new position. walkFloor allows a small step-up onto
  // built bricks so troppers passing a staircase actually climb it.
  const floorAtNew = walkFloor(newCx, feet, holes, bricks, STAIR_STEP_UP);
  if (floorAtNew === Infinity || floorAtNew > feet + 8) {
    trop.x = newX;
    trop.action = trop.hasUmbrella ? 'float' : 'fall';
    trop.fallHeight = 0;
    if (trop.action === 'float') trop.hasUmbrella = false;
  } else {
    trop.x = newX;
    trop.y = floorAtNew - TROPPER_H;
  }
}

// ---------------------------------------------------------------------------
// Realtime broadcasting
// ---------------------------------------------------------------------------

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[brain] SUPABASE_URL / SUPABASE_ANON_KEY not set — running /health only.');
}

let worldChannel: RealtimeChannel | null = null;
let worldReady = false;

function broadcastWorld(msg: WorldMessage) {
  if (!worldChannel || !worldReady) return;
  worldChannel.send({ type: 'broadcast', event: WORLD_EVENT, payload: encodeWorldMessage(msg) });
}

// ---------------------------------------------------------------------------
// Input handling
// ---------------------------------------------------------------------------

function handleInput(msg: InputMessage) {
  const now = Date.now();
  switch (msg.type) {
    case 'player_hello': {
      const existing = players.get(msg.playerId);
      // During a live round, reject new registrations once the cap is reached.
      // Late-joiners beyond MAX_PLAYERS will receive snapshots (spectate) but
      // won't be added to the players map, so no troppers spawn for them.
      if (phase === 'playing' && !existing && players.size >= MAX_PLAYERS) {
        console.log(`[brain] player_hello rejected (cap reached): ${msg.playerId} "${msg.name}"`);
        return;
      }
      const colorIndex = existing?.colorIndex ?? assignColorIndex(msg.preferredColorIndex);
      const next: PlayerState = {
        playerId: msg.playerId,
        name: msg.name.slice(0, 24) || 'anon',
        colorIndex,
        x: existing?.x ?? 0,
        y: existing?.y ?? 0,
        online: true,
        lastSeen: now,
      };
      players.set(msg.playerId, next);
      if (scores[msg.playerId] === undefined) scores[msg.playerId] = 0;
      if (!lobbyEnteredAt.has(msg.playerId) && phase === 'waiting') {
        lobbyEnteredAt.set(msg.playerId, now);
      }
      if (!existing) console.log(`[brain] player joined: ${msg.playerId} "${next.name}" (total: ${players.size})`);
      return;
    }
    case 'player_bye': {
      const leaving = players.get(msg.playerId);
      players.delete(msg.playerId);
      readySet.delete(msg.playerId);
      lobbyEnteredAt.delete(msg.playerId);
      if (leaving) console.log(`[brain] player left (bye): ${msg.playerId} "${leaving.name}" (total: ${players.size})`);
      return;
    }
    case 'player_ready': {
      if (phase === 'waiting') readySet.add(msg.playerId);
      return;
    }
    case 'cursor_move': {
      const p = players.get(msg.playerId);
      if (!p) return;
      p.x = msg.x;
      p.y = msg.y;
      p.online = true;
      p.lastSeen = now;
      return;
    }
    case 'cursor_click': {
      const p = players.get(msg.playerId);
      if (!p) return;
      p.x = msg.x;
      p.y = msg.y;
      p.online = true;
      p.lastSeen = now;
      if (phase === 'ended') return; // no pings while results are showing
      const ping: Ping = {
        type: 'ping',
        playerId: p.playerId,
        colorIndex: p.colorIndex,
        x: msg.x,
        y: msg.y,
        t: now,
      };
      broadcastWorld(ping);
      return;
    }
    case 'player_heartbeat': {
      const p = players.get(msg.playerId);
      if (!p) return;
      p.online = true;
      p.lastSeen = now;
      return;
    }
    case 'apply_ability': {
      const trop = troppers.get(msg.tropperId);
      if (!trop) return;
      // Umbrella is the only ability that can apply mid-fall.
      const isUmbrella = msg.ability === 'umbrella';
      if (!isUmbrella && trop.action !== 'walk') return;
      if (isUmbrella && trop.action !== 'walk' && trop.action !== 'fall') return;
      if (msg.ability === 'dig') {
        if (trop.y + TROPPER_H >= GROUND_TOP - 2) return; // can't dig the ground floor
        digStartY.set(trop.id, trop.y);
        trop.action = 'dig';
        trop.timer = DIG_DUR;
      } else if (msg.ability === 'block') {
        trop.action = 'block';
      } else if (msg.ability === 'stairs') {
        // Reject if there isn't headroom for the full staircase.
        if (trop.y - BRIDGE_STEPS * BRIDGE_BRICK_H < 0) return;
        buildState.set(trop.id, {
          stepsRemaining: BRIDGE_STEPS,
          nextStepInMs: BRIDGE_STEP_MS,
          dir: trop.faceLeft ? -1 : 1,
          baseX: trop.x,
          baseY: trop.y + TROPPER_H,
        });
        trop.action = 'build';
        trop.timer = BUILD_DUR;
      } else if (msg.ability === 'umbrella') {
        if (trop.hasUmbrella) return; // already armed
        if (trop.action === 'fall') {
          // Open the umbrella mid-air — consume immediately.
          trop.action = 'float';
        } else {
          // Arm for the next fall.
          trop.hasUmbrella = true;
        }
      }
      // Broadcast a ping at the tropper center so every client sees who was targeted.
      const pinger = players.get(msg.playerId);
      if (pinger) {
        broadcastWorld({
          type: 'ping',
          playerId: pinger.playerId,
          colorIndex: pinger.colorIndex,
          x: trop.x + TROPPER_W / 2,
          y: trop.y + TROPPER_H / 2,
          t: now,
        });
      }
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Main tick: physics → sweep → spawn → broadcast
// ---------------------------------------------------------------------------

function sweepAndTick() {
  const now = Date.now();
  const dt = now - lastTickAt;
  lastTickAt = now;

  // Warn if tick is lagging badly.
  if (dt > TICK_MS * 5) {
    console.warn(`[brain] slow tick: ${dt}ms (expected ~${TICK_MS}ms)`);
  }

  // Sweep stale players.
  for (const [id, p] of players) {
    const age = now - p.lastSeen;
    if (age > EVICT_MS) {
      console.log(`[brain] player evicted (timeout): ${id} "${p.name}" (silent for ${age}ms)`);
      players.delete(id);
      readySet.delete(id);
      lobbyEnteredAt.delete(id);
      continue;
    }
    if (age > OFFLINE_MS) p.online = false;
  }

  // Phase transitions.
  const onlinePlayers = [...players.values()].filter((p) => p.online);
  const onlineCount = onlinePlayers.length;

  // Auto-ready players who have been in the lobby for too long (only with 2+ players).
  if (phase === 'waiting' && onlineCount >= 2) {
    for (const [pid, enteredAt] of lobbyEnteredAt) {
      if (now - enteredAt >= LOBBY_AUTO_READY_MS) readySet.add(pid);
    }
  }
  if (phase === 'waiting' && onlineCount >= 1) {
    const allReady = onlinePlayers.every((p) => readySet.has(p.playerId));
    if (allReady) {
      phase = 'playing';
      troppers.clear(); // discard demo troppers
      readySet.clear();
      lobbyEnteredAt.clear();
      spawnTimer = 1_000; // first batch after 1s
      console.log('[brain] round started');
    }
  }
  if (phase === 'playing') {
    timeRemainingMs -= dt;
    if (timeRemainingMs <= 0) {
      timeRemainingMs = 0;
      phase = 'ended';
      endedAt = now;
      troppers.clear();
      console.log('[brain] round ended');
    }
  }
  // Auto-reset 30 seconds after the round ends so a new round can start.
  if (phase === 'ended' && endedAt !== null && now - endedAt >= 30_000) {
    resetGame();
  }

  // Batch spawn and physics only while playing.
  if (phase === 'playing') {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      batchSpawn();
      spawnTimer = SPAWN_INTERVAL_MS;
    }
    for (const trop of troppers.values()) stepTropper(trop, dt);
    for (const [id, trop] of troppers) {
      if (trop.action === 'exit') {
        troppers.delete(id);
        digStartY.delete(id);
        buildState.delete(id);
      }
    }
  }

  // Demo re-seed while waiting with no players connected.
  if (troppers.size === 0 && phase === 'waiting' && players.size === 0) {
    seedTroppers();
  }

  // Periodic heartbeat log.
  if (now - lastHeartbeatLog >= HEARTBEAT_LOG_INTERVAL_MS) {
    lastHeartbeatLog = now;
    const uptimeS = Math.floor((now - startedAt) / 1000);
    const onlineCount = [...players.values()].filter((p) => p.online).length;
    console.log(
      `[brain] heartbeat — uptime: ${uptimeS}s | phase: ${phase} | players: ${players.size} (${onlineCount} online) | troppers: ${troppers.size} | holes: ${holes.length} | bricks: ${bricks.length} | realtime: ${worldChannel?.state ?? 'disabled'}`
    );
  }

  const snapshot: Snapshot = {
    type: 'snapshot',
    t: now,
    players: [...players.values()],
    troppers: [...troppers.values()],
    scores,
    holes: [...holes],
    bricks: [...bricks],
    phase,
    timeRemainingMs,
    readyPlayerIds: [...readySet],
  };
  broadcastWorld(snapshot);
}

// ---------------------------------------------------------------------------
// Realtime setup
// ---------------------------------------------------------------------------

async function startRealtime() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { params: { eventsPerSecond: 50 } },
  });

  worldChannel = supabase.channel(CHANNEL_WORLD, { config: { broadcast: { self: false } } });
  worldChannel.subscribe((status) => {
    console.log('[brain] world:', status);
    worldReady = status === 'SUBSCRIBED';
  });

  const inputs = supabase.channel(CHANNEL_INPUTS);
  inputs.on('broadcast', { event: INPUT_EVENT }, (payload) => {
    const msg = decodeInputMessage(payload.payload);
    if (!msg) return;
    try {
      handleInput(msg);
    } catch (err) {
      console.error('[brain] handleInput error:', err);
    }
  });
  inputs.subscribe((status) => console.log('[brain] inputs:', status));

  seedTroppers();
  setInterval(() => {
    try {
      sweepAndTick();
    } catch (err) {
      console.error('[brain] sweepAndTick threw:', err);
    }
  }, TICK_MS);
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

const app = new Hono();
app.use('*', cors());
app.get('/wakeup-bro', (c) => c.json({ status: 'awake' }));
app.get('/health', (c) => {
  const now = Date.now();
  return c.json({
    ok: true,
    t: now,
    uptimeSeconds: Math.floor((now - startedAt) / 1000),
    players: players.size,
    troppers: troppers.size,
    phase,
    realtime: worldChannel?.state ?? 'disabled',
  });
});

serve({ fetch: app.fetch, port: PORT });
console.log(`[brain] /health listening on :${PORT}`);
startRealtime();
