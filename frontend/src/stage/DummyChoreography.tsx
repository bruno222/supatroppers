// Ported from DUMMIES() + rDummyAt() in docs/design-concept/SupaTroppers.dc.html:457.
// 11 troppers looping through choreographed segments — covers all 10 actions
// plus a few walkers, mirroring the original animatic exactly.

import { Tropper } from '../sprites/Tropper';
import type { ActionName } from '../sprites/types';

type Segment = {
  a: ActionName;
  d: 'l' | 'r';
  f: [number, number];
  t: [number, number];
  du: number;
};

type Dummy = {
  colorIndex: number;
  s: Segment[];
  stairs?: boolean;
  sb?: [number, number];
};

// Color slugs in the original. Map to PALETTE indexes 0..5.
const C = { mira: 0, juno: 1, kato: 2, lin: 3, bex: 4, tup: 5 } as const;

const DUMMIES: Dummy[] = [
  {
    colorIndex: C.mira,
    s: [
      { a: 'walk', d: 'r', f: [80, 143], t: [320, 143], du: 5500 },
      { a: 'idle', d: 'r', f: [320, 143], t: [320, 143], du: 800 },
      { a: 'walk', d: 'l', f: [320, 143], t: [80, 143], du: 5500 },
      { a: 'idle', d: 'l', f: [80, 143], t: [80, 143], du: 800 },
    ],
  },
  {
    colorIndex: C.juno,
    s: [
      { a: 'walk', d: 'r', f: [1040, 118], t: [1180, 118], du: 3000 },
      { a: 'fall', d: 'r', f: [1185, 118], t: [1185, 644], du: 2200 },
      { a: 'splat', d: 'r', f: [1185, 644], t: [1185, 644], du: 750 },
      { a: 'idle', d: 'r', f: [-200, -200], t: [-200, -200], du: 1500 },
    ],
  },
  {
    colorIndex: C.kato,
    s: [
      { a: 'float', d: 'r', f: [900, 80], t: [900, 528], du: 5000 },
      { a: 'idle', d: 'r', f: [900, 528], t: [900, 528], du: 1500 },
    ],
  },
  {
    colorIndex: C.lin,
    s: [{ a: 'dig', d: 'r', f: [760, 313], t: [760, 313], du: 6000 }],
  },
  {
    colorIndex: C.bex,
    s: [{ a: 'bash', d: 'r', f: [940, 118], t: [940, 118], du: 5000 }],
  },
  {
    colorIndex: C.tup,
    stairs: true,
    sb: [440, 521],
    s: [
      { a: 'build', d: 'r', f: [440, 493], t: [520, 449], du: 5000 },
      { a: 'walk', d: 'r', f: [520, 449], t: [548, 449], du: 600 },
      { a: 'fall', d: 'r', f: [548, 449], t: [548, 644], du: 1500 },
      { a: 'splat', d: 'r', f: [548, 644], t: [548, 644], du: 750 },
      { a: 'idle', d: 'r', f: [-200, -200], t: [-200, -200], du: 1500 },
    ],
  },
  {
    colorIndex: C.mira,
    s: [
      { a: 'walk', d: 'r', f: [750, 528], t: [880, 528], du: 4500 },
      { a: 'exit', d: 'r', f: [880, 528], t: [880, 528], du: 1600 },
      { a: 'idle', d: 'r', f: [-200, -200], t: [-200, -200], du: 600 },
    ],
  },
  {
    colorIndex: C.lin,
    s: [{ a: 'block', d: 'r', f: [450, 644], t: [450, 644], du: 5000 }],
  },
  {
    colorIndex: C.tup,
    s: [{ a: 'idle', d: 'r', f: [380, 493], t: [380, 493], du: 5000 }],
  },
  {
    colorIndex: C.kato,
    s: [
      { a: 'walk', d: 'r', f: [60, 644], t: [422, 644], du: 5500 },
      { a: 'idle', d: 'r', f: [422, 644], t: [422, 644], du: 600 },
      { a: 'walk', d: 'l', f: [422, 644], t: [60, 644], du: 5500 },
      { a: 'idle', d: 'l', f: [60, 644], t: [60, 644], du: 600 },
    ],
  },
  {
    colorIndex: C.juno,
    s: [
      { a: 'walk', d: 'r', f: [460, 313], t: [720, 313], du: 4000 },
      { a: 'idle', d: 'r', f: [720, 313], t: [720, 313], du: 500 },
      { a: 'walk', d: 'l', f: [720, 313], t: [460, 313], du: 4000 },
      { a: 'idle', d: 'l', f: [460, 313], t: [460, 313], du: 500 },
    ],
  },
];

function tween(d: Dummy, t: number) {
  const total = d.s.reduce((acc, seg) => acc + seg.du, 0);
  let elapsed = t % total;
  let cur = d.s[0];
  let segIdx = 0;
  for (let j = 0; j < d.s.length; j++) {
    const seg = d.s[j];
    if (elapsed < seg.du) {
      cur = seg;
      segIdx = j;
      break;
    }
    elapsed -= seg.du;
  }
  const k = cur.du > 0 ? elapsed / cur.du : 0;
  const x = cur.f[0] + (cur.t[0] - cur.f[0]) * k;
  const y = cur.f[1] + (cur.t[1] - cur.f[1]) * k;
  return { x, y, action: cur.a, faceLeft: cur.d === 'l', segIdx, k };
}

export function DummyChoreography({ t }: { t: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {DUMMIES.map((d, i) => {
        const { x, y, action, faceLeft, segIdx, k } = tween(d, t);
        return (
          <div key={i}>
            <Tropper x={x} y={y} action={action} faceLeft={faceLeft} colorIndex={d.colorIndex} t={t} />
            {d.stairs && d.sb && <Stairs sb={d.sb} segIdx={segIdx} k={k} />}
          </div>
        );
      })}
    </div>
  );
}

function Stairs({ sb, segIdx, k }: { sb: [number, number]; segIdx: number; k: number }) {
  const showBricks = segIdx === 0 ? Math.floor(k * 6) : 6;
  const [bx, by] = sb;
  const bricks = [];
  for (let b = 0; b < showBricks; b++) {
    bricks.push(
      <div
        key={b}
        style={{
          position: 'absolute',
          left: bx + b * 16,
          top: by - b * 8,
          width: 16,
          height: 4,
          background: '#d8b27a',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.4),inset 0 -1px 0 rgba(0,0,0,.2)',
          zIndex: 4,
        }}
      />
    );
  }
  return <>{bricks}</>;
}
