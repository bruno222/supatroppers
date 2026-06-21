import { useEffect, useState } from 'react';
import { PALETTE } from '@supatroppers/shared';
import { useSessionStore } from '../state/sessionStore';
import { useRoomStore } from '../state/roomStore';

export function LocalCursor({ stageRef }: { stageRef: React.RefObject<HTMLElement | null> }) {
  const selfId = useSessionStore((s) => s.playerId);
  const colorIndex = useRoomStore((s) => s.players[selfId]?.colorIndex ?? -1);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    const onLeave = () => setPos(null);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [stageRef]);

  if (!pos) return null;
  const color = colorIndex >= 0 ? PALETTE[colorIndex % PALETTE.length].main : '#aaaaaa';

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        zIndex: 9,
        pointerEvents: 'none',
        transform: `translate(${pos.x}px, ${pos.y}px)`,
      }}
    >
      <div
        style={{
          width: 17,
          height: 23,
          background: color,
          clipPath: 'polygon(0 0, 0 80%, 28% 60%, 46% 100%, 60% 92%, 42% 56%, 74% 56%)',
          filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.4))',
        }}
      />
    </div>
  );
}
