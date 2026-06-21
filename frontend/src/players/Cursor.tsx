// Remote cursor — the SVG-clip pointer + name chip from the .dc.html
// reference cursors (lines 126-131). The 60ms transform transition is the
// cheap fix for snapshot jitter mentioned in PLAN.md risks #5.

import { memo } from 'react';
import { PALETTE } from '@supatroppers/shared';

type Props = {
  x: number;
  y: number;
  name: string;
  colorIndex: number;
};

function CursorImpl({ x, y, name, colorIndex }: Props) {
  const color = PALETTE[colorIndex % PALETTE.length].main;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        zIndex: 8,
        pointerEvents: 'none',
        transform: `translate(${x}px, ${y}px)`,
        transition: 'transform 60ms linear',
      }}
    >
      <div
        style={{
          width: 17,
          height: 23,
          background: color,
          clipPath: 'polygon(0 0, 0 80%, 28% 60%, 46% 100%, 60% 92%, 42% 56%, 74% 56%)',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.35))',
        }}
      />
      <div
        style={{
          margin: '1px 0 0 13px',
          background: color,
          color: '#06311f',
          fontWeight: 700,
          fontSize: 11,
          padding: '2px 8px',
          borderRadius: 7,
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 6px rgba(0,0,0,.18)',
          display: 'inline-block',
        }}
      >
        {name}
      </div>
    </div>
  );
}

export const Cursor = memo(CursorImpl);
