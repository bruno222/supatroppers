// The 1280x768 game frame. Wraps Background + HUD + troppers + children.

import { useRef, type ReactNode } from 'react';
import { STAGE_W, STAGE_H } from '@supatroppers/shared';
import { Background } from './Background';
import { HUD } from './HUD';
import { LiveTroppers } from './LiveTroppers';
import { DummyChoreography } from './DummyChoreography';
import { useFrameClock } from '../sprites/useFrameClock';
import { hasSupabaseConfig } from '../realtime/client';
import { LocalCursor } from '../players/LocalCursor';

export { STAGE_W, STAGE_H };

export function Stage({ children }: { children?: ReactNode }) {
  const connected = hasSupabaseConfig();
  const t = useFrameClock();
  const stageRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={stageRef}
      style={{
        position: 'relative',
        width: STAGE_W,
        height: STAGE_H,
        background: 'linear-gradient(180deg,#DCF5EA 0%,#F4FCF8 62%)',
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,.1),0 8px 24px rgba(0,0,0,.06)',
        imageRendering: 'pixelated',
        cursor: connected ? 'none' : undefined,
      }}
    >
      <Background />
      {connected ? <LiveTroppers /> : <DummyChoreography t={t} />}
      {connected && <LocalCursor stageRef={stageRef} />}
      {children}
      <HUD />
    </div>
  );
}
