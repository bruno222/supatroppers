// Selector-driven so we only re-render on the player roster diff, not on
// every snapshot field change.

import { useRoomStore } from '../state/roomStore';
import { useSessionStore } from '../state/sessionStore';
import { Cursor } from './Cursor';

export function RemoteCursors() {
  const players = useRoomStore((s) => s.players);
  const selfId = useSessionStore((s) => s.playerId);
  return (
    <>
      {Object.values(players).map((p) => {
        if (p.playerId === selfId) return null;
        if (!p.online) return null;
        return (
          <Cursor key={p.playerId} x={p.x} y={p.y} name={p.name} colorIndex={p.colorIndex} />
        );
      })}
    </>
  );
}
