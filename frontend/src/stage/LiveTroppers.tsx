// Renders server-authoritative troppers from roomStore.
// Each tropper is tinted with its owner's palette color.

import { useRoomStore } from '../state/roomStore';
import { Tropper } from '../sprites/Tropper';
import { useFrameClock } from '../sprites/useFrameClock';
import type { ActionName } from '../sprites/types';
import { TROPPER_W, TROPPER_H, DIG_DUR, HOLE_W, PLATFORM_H, BRIDGE_BRICK_H } from '@supatroppers/shared';
import type { TropperState, HoleDef, BrickDef } from '@supatroppers/shared';

const HOLE_STYLE = 'linear-gradient(180deg, #1a3d2a 0%, #082010 100%)';

function DiggingHoles({ troppers, holes }: { troppers: TropperState[]; holes: HoleDef[] }) {
  return (
    <>
      {/* Permanent completed holes */}
      {holes.map((hole, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: hole.x - HOLE_W / 2,
            top: hole.y,
            width: HOLE_W,
            height: PLATFORM_H,
            background: HOLE_STYLE,
            zIndex: 2,
          }}
        />
      ))}
      {/* In-progress holes — fixed at platform top, grow downward */}
      {troppers
        .filter((t) => t.action === 'dig')
        .map((trop) => {
          const progress = 1 - trop.timer / DIG_DUR;
          // trop.y has already descended (progress * PLATFORM_H) from the original y.
          // Recover the original platform top: startY + TROPPER_H
          const platformTop = trop.y - progress * PLATFORM_H + TROPPER_H;
          const holeH = Math.round(progress * PLATFORM_H);
          if (holeH <= 0) return null;
          return (
            <div
              key={trop.id}
              style={{
                position: 'absolute',
                left: trop.x + TROPPER_W / 2 - HOLE_W / 2,
                top: platformTop,
                width: HOLE_W,
                height: holeH,
                background: HOLE_STYLE,
                zIndex: 2,
              }}
            />
          );
        })}
    </>
  );
}

function BridgeBricks({ bricks }: { bricks: BrickDef[] }) {
  return (
    <>
      {bricks.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: b.x,
            top: b.y,
            width: b.w,
            height: BRIDGE_BRICK_H,
            background: '#46C896',
            border: '1px solid #2f8f68',
            zIndex: 2,
          }}
        />
      ))}
    </>
  );
}

export function LiveTroppers() {
  const troppers = useRoomStore((s) => s.troppers);
  const players = useRoomStore((s) => s.players);
  const holes = useRoomStore((s) => s.holes);
  const bricks = useRoomStore((s) => s.bricks);
  const t = useFrameClock();

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <DiggingHoles troppers={troppers} holes={holes} />
      <BridgeBricks bricks={bricks} />
      {troppers.map((trop) => {
        const owner = trop.ownerId ? players[trop.ownerId] : undefined;
        const colorIndex = owner ? owner.colorIndex : 0;
        return (
          <Tropper
            key={trop.id}
            x={trop.x}
            y={trop.y}
            action={trop.action as ActionName}
            faceLeft={trop.faceLeft}
            colorIndex={colorIndex}
            t={t}
          />
        );
      })}
    </div>
  );
}
