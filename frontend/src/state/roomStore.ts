// Transient view of the world snapshot from the Brain. Selectors keep
// components from re-rendering at 20Hz when only positions change.

import { create } from 'zustand';
import type { PlayerState, Ping, TropperState, HoleDef, BrickDef, Snapshot } from '@supatroppers/shared';

export type RoomState = {
  players: Record<string, PlayerState>;
  pings: Ping[];
  troppers: TropperState[];
  holes: HoleDef[];
  bricks: BrickDef[];
  scores: Record<string, number>;
  phase: Snapshot['phase'];
  timeRemainingMs: number;
  readyPlayerIds: string[];
  hasSnapshot: boolean; // true once the first server snapshot is received
  setSnapshot: (snap: Snapshot) => void;
  addPing: (p: Ping) => void;
  expirePings: (cutoff: number) => void;
  reset: () => void;
};

export const useRoomStore = create<RoomState>((set) => ({
  players: {},
  pings: [],
  troppers: [],
  holes: [],
  bricks: [],
  scores: {},
  phase: 'waiting',
  timeRemainingMs: 240_000,
  readyPlayerIds: [],
  hasSnapshot: false,
  setSnapshot: (snap) => {
    const byId: Record<string, PlayerState> = {};
    for (const p of snap.players) byId[p.playerId] = p;
    set({
      players: byId,
      troppers: snap.troppers,
      holes: snap.holes ?? [],
      bricks: snap.bricks ?? [],
      scores: snap.scores,
      phase: snap.phase,
      timeRemainingMs: snap.timeRemainingMs,
      readyPlayerIds: snap.readyPlayerIds ?? [],
      hasSnapshot: true,
    });
  },
  addPing: (p) => set((s) => ({ pings: [...s.pings, p] })),
  expirePings: (cutoff) =>
    set((s) => {
      const kept = s.pings.filter((p) => p.t >= cutoff);
      return kept.length === s.pings.length ? s : { pings: kept };
    }),
  reset: () => set({
    players: {}, pings: [], troppers: [], holes: [], bricks: [],
    scores: {}, phase: 'waiting', timeRemainingMs: 240_000, readyPlayerIds: [],
  }),
}));
