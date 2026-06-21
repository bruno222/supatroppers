// Ported from docs/design-concept/SupaTroppers.dc.html Section 01 (lines 50-120).
// Platforms and doors are driven from shared/terrain — single source of truth.

import { PLATFORMS, DOORS, WALLS, GATE } from '@supatroppers/shared';

export function Background() {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(0deg,rgba(62,207,142,.05) 0 1px,transparent 1px 32px),repeating-linear-gradient(90deg,rgba(62,207,142,.05) 0 1px,transparent 1px 32px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 430,
          top: 80,
          width: 96,
          height: 24,
          background: '#ffffff',
          boxShadow: '-24px 0 0 #fff,24px 0 0 #fff,0 -16px 0 #fff',
          opacity: 0.85,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 160,
          top: 130,
          width: 64,
          height: 16,
          background: '#ffffff',
          boxShadow: '16px 0 0 #fff,-16px 0 0 #fff',
          opacity: 0.7,
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: 1280,
          height: 92,
          background: '#CDEEDD',
          borderTop: '6px solid #46C896',
          boxShadow: 'inset 0 -12px 0 rgba(20,90,60,.12)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: 1280,
          height: 18,
          background: 'repeating-linear-gradient(90deg,rgba(20,90,60,.10) 0 6px,transparent 6px 18px)',
        }}
      />

      {PLATFORMS.map((p, i) => (
        <Platform key={i} left={p.left} top={p.top} width={p.width} />
      ))}

      {DOORS.map((d) => (
        <Door key={d.id} left={d.left} top={d.top} />
      ))}

      {WALLS.map((w, i) => (
        <Wall key={i} left={w.left} top={w.top} width={w.width} height={w.height} />
      ))}

      <Gate />
    </>
  );
}

function Platform({ left, top, width }: { left: number; top: number; width: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height: 30,
        background: '#CDEEDD',
        border: '3px solid #2f8f68',
        borderBottom: 'none',
        boxShadow: 'inset 0 6px 0 #46C896',
      }}
    />
  );
}

function Door({ left, top }: { left: number; top: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: 30,
        height: 32,
        background: '#46C896',
        border: '2px solid #1f4736',
        zIndex: 3,
      }}
    >
      <div style={{ position: 'absolute', left: 4, top: 4, right: 4, bottom: 0, background: '#15281f' }} />
    </div>
  );
}

function Wall({ left, top, width, height }: { left: number; top: number; width: number; height: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        background: '#46C896',
        border: '2px solid #2f8f68',
        zIndex: 3,
      }}
    />
  );
}

function Gate() {
  return (
    <div style={{ position: 'absolute', left: GATE.left, top: GATE.top, width: GATE.width, height: GATE.height, zIndex: 4 }}>
      <div
        style={{
          position: 'absolute',
          inset: -8,
          background: 'radial-gradient(ellipse at center,rgba(62,207,142,.45),transparent 70%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 14,
          width: 83,
          height: 88,
          background: '#1f4736',
          border: '3px solid #1f1f1f',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 11,
          top: 24,
          width: 61,
          height: 78,
          background: 'linear-gradient(180deg,#3ECF8E,#0f9f64)',
          boxShadow: 'inset 0 0 0 3px #163b2c',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 30,
          top: 42,
          width: 24,
          height: 35,
          background: '#eafff5',
          clipPath: 'polygon(54% 0,54% 42%,100% 42%,46% 100%,46% 58%,0 58%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: -2,
          right: 0,
          textAlign: 'center',
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: 8,
          fontWeight: 700,
          color: '#11734b',
          letterSpacing: '0.12em',
        }}
      >
        THE GATE
      </div>
    </div>
  );
}
