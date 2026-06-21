// 600ms expanding ring at the click site. Uses a CSS keyframe rather than
// React state so a burst of pings never throttles the main thread.

import { useEffect } from 'react';
import type { Ping } from '@supatroppers/shared';
import { PALETTE } from '@supatroppers/shared';
import { useRoomStore } from '../state/roomStore';

const PING_TTL_MS = 600;
const KEY = 'sc-click-ping';

export function ClickPings() {
  const pings = useRoomStore((s) => s.pings);
  const expirePings = useRoomStore((s) => s.expirePings);

  // Wake-up timer that sweeps expired pings — runs at 4Hz, cheap.
  useEffect(() => {
    const id = setInterval(() => expirePings(Date.now() - PING_TTL_MS), 250);
    return () => clearInterval(id);
  }, [expirePings]);

  // Dedup pings: server echo + optimistic local can both land. Keep the
  // first per (playerId, t) pair.
  const seen = new Set<string>();
  const unique: Ping[] = [];
  for (const p of pings) {
    const key = `${p.playerId}:${p.t}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(p);
  }

  return (
    <>
      <Keyframes />
      {unique.map((p) => (
        <PingRing key={`${p.playerId}-${p.t}`} ping={p} />
      ))}
    </>
  );
}

function PingRing({ ping }: { ping: Ping }) {
  const color = PALETTE[ping.colorIndex % PALETTE.length].main;
  return (
    <div
      style={{
        position: 'absolute',
        left: ping.x,
        top: ping.y,
        pointerEvents: 'none',
        zIndex: 7,
        width: 0,
        height: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: -4,
          top: -4,
          width: 8,
          height: 8,
          borderRadius: '50%',
          border: `2px solid ${color}`,
          animation: `${KEY} ${PING_TTL_MS}ms ease-out forwards`,
        }}
      />
    </div>
  );
}

function Keyframes() {
  return (
    <style>{`
      @keyframes ${KEY} {
        0% { transform: scale(1); opacity: 0.95; border-width: 2px; }
        100% { transform: scale(7); opacity: 0; border-width: 1px; }
      }
    `}</style>
  );
}
