// Port of rDummy() from docs/design-concept/SupaTroppers.dc.html:456.
// The DC version draws at 0.5 scale into a 24x32 box. We keep that contract
// so the DUMMIES choreography from the mockup lines up pixel-for-pixel.

import { memo, type CSSProperties } from 'react';
import { PALETTE } from '@supatroppers/shared';
import { ACT } from './actions';
import { recolor } from './recolor';
import type { ActionName, Block } from './types';

type Props = {
  x: number;
  y: number;
  action: ActionName;
  faceLeft?: boolean;
  colorIndex: number;
  t: number;
  scale?: number;
  zIndex?: number;
};

const WRAPPER: CSSProperties = {
  position: 'absolute',
  width: 24,
  height: 32,
  zIndex: 5,
  pointerEvents: 'none',
  filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,.22))',
};

const SPRITE_BOX: CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: 48,
  height: 64,
  transformOrigin: 'top left',
};

function TropperImpl({ x, y, action, faceLeft, colorIndex, t, scale = 0.5, zIndex = 5 }: Props) {
  const pal = PALETTE[colorIndex % PALETTE.length];
  const a = ACT[action];
  const idx = Math.floor(Math.max(0, t) / 1000 * a.fps) % a.frames.length;
  const f = a.frames[idx];
  const blocks: Block[] = recolor(f.b, pal.main, pal.dark);

  const wrapperStyle: CSSProperties = {
    ...WRAPPER,
    left: x,
    top: y,
    zIndex,
    transform: faceLeft ? 'scaleX(-1)' : undefined,
  };

  const spriteStyle: CSSProperties = {
    ...SPRITE_BOX,
    transform: `scale(${scale})${f.rot ? ` rotate(${f.rot}deg)` : ''}`,
  };

  return (
    <div style={wrapperStyle}>
      <div style={spriteStyle}>
        {blocks.map((bl, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: bl[0],
              top: bl[1],
              width: bl[2],
              height: bl[3],
              background: bl[4],
              ...(bl[5] ?? null),
            }}
          />
        ))}
      </div>
    </div>
  );
}

export const Tropper = memo(TropperImpl);
