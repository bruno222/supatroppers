// Identity persisted across reloads.
// playerId is generated once on first visit; the Brain reassigns colorIndex
// if the preferred slot is taken (and we store the authoritative result back).

import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PALETTE_SIZE } from '@supatroppers/shared';

export type SessionState = {
  playerId: string;
  name: string;
  preferredColorIndex: number;
  colorIndex: number;
  selectedAbility: 'dig' | 'block' | 'stairs' | 'umbrella' | null;
  set: (patch: Partial<Omit<SessionState, 'set' | 'reset'>>) => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      playerId: nanoid(10),
      name: '',
      preferredColorIndex: Math.floor(Math.random() * PALETTE_SIZE),
      colorIndex: -1,
      selectedAbility: 'stairs' as const,
      set: (patch) => set(patch),
    }),
    {
      name: 'supatroppers.session.v1',
      partialize: (s) => ({
        playerId: s.playerId,
        name: s.name,
        preferredColorIndex: s.preferredColorIndex,
        colorIndex: s.colorIndex,
        // selectedAbility is intentionally excluded — resets on reload
      }),
    }
  )
);
