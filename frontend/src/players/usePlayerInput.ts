// Mousemove → throttled cursor_move. Clicks fan out cursor_click + optimistic
// ping, unless an ability is selected and the click lands on a tropper — in
// that case apply_ability is sent instead.

import { useEffect, useMemo, useRef } from 'react';
import { TROPPER_W, TROPPER_H } from '@supatroppers/shared';
import { useSessionStore } from '../state/sessionStore';
import { useRoomStore } from '../state/roomStore';
import { throttle } from '../realtime/throttle';
import type { SendInput } from '../realtime/useChannels';

const HIT_RADIUS = 24; // px from tropper center to accept a click

export function usePlayerInput(stage: HTMLElement | null, send: SendInput, enabled: boolean) {
  const sendRef = useRef(send);
  sendRef.current = send;

  const throttledMove = useMemo(
    () =>
      throttle((playerId: string, x: number, y: number) => {
        sendRef.current({ type: 'cursor_move', playerId, x, y, t: Date.now() });
      }, 30),
    []
  );

  useEffect(() => {
    if (!enabled || !stage) return;

    const onMove = (e: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
      const session = useSessionStore.getState();
      throttledMove(session.playerId, x, y);
    };

    const onClick = (e: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

      const session = useSessionStore.getState();
      const t = Date.now();

      // If an ability is active, try to hit a walking tropper (or a falling one for umbrella).
      const ability = session.selectedAbility;
      if (ability) {
        const troppers = useRoomStore.getState().troppers;
        let bestDist = HIT_RADIUS;
        let bestId: string | null = null;
        for (const trop of troppers) {
          if (trop.ownerId !== session.playerId) continue;
          const eligible =
            trop.action === 'walk' || (ability === 'umbrella' && trop.action === 'fall');
          if (!eligible) continue;
          const cx = trop.x + TROPPER_W / 2;
          const cy = trop.y + TROPPER_H / 2;
          const dist = Math.hypot(x - cx, y - cy);
          if (dist < bestDist) { bestDist = dist; bestId = trop.id; }
        }
        if (bestId) {
          sendRef.current({ type: 'apply_ability', playerId: session.playerId, tropperId: bestId, ability });
          return;
        }
      }

      // Normal click → cursor_click + optimistic ping.
      sendRef.current({ type: 'cursor_click', playerId: session.playerId, x, y, t });
      if (session.colorIndex >= 0) {
        const local = { type: 'ping' as const, playerId: session.playerId, colorIndex: session.colorIndex, x, y, t };
        useRoomStore.getState().addPing(local);
      }
    };

    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerdown', onClick);
    return () => {
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerdown', onClick);
    };
  }, [stage, enabled, throttledMove]);
}
