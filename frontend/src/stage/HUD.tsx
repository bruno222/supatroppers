// Ported from docs/design-concept/SupaTroppers.dc.html Section 01 top bar + ability dock.
// Scores are live from roomStore when connected; static placeholders in demo mode.

import { useEffect, useRef } from 'react';
import { PALETTE } from '@supatroppers/shared';
import { useRoomStore } from '../state/roomStore';
import { useSessionStore } from '../state/sessionStore';
import { hasSupabaseConfig } from '../realtime/client';

const STATIC_SCORES = [12, 9, 7, 6, 4, 3];

export function HUD() {
  const players = useRoomStore((s) => s.players);
  const scores = useRoomStore((s) => s.scores);
  const phase = useRoomStore((s) => s.phase);
  const timeRemainingMs = useRoomStore((s) => s.timeRemainingMs);
  const connected = hasSupabaseConfig();

  const onlinePlayers = Object.values(players).filter((p) => p.online && p.colorIndex >= 0);

  function formatTime(ms: number): string {
    const secs = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  }

  const timerDisplay = !connected
    ? '01:30'
    : phase === 'waiting'
    ? '--:--'
    : formatTime(timeRemainingMs);

  const scoreByColor: Record<number, number> = {};
  for (const p of onlinePlayers) scoreByColor[p.colorIndex] = scores[p.playerId] ?? 0;

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 52,
          background: 'rgba(255,255,255,.94)',
          borderBottom: '1px solid #e6e6e6',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          zIndex: 10,
          imageRendering: 'auto',
          gap: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
          <div
            style={{
              width: 22,
              height: 22,
              background: '#1f1f1f',
              borderRadius: 5,
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                margin: 'auto',
                width: 10,
                height: 12,
                background: '#3ECF8E',
                clipPath: 'polygon(54% 0,54% 42%,100% 42%,46% 100%,46% 58%,0 58%)',
              }}
            />
          </div>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#1c1c1c', letterSpacing: '-0.01em' }}>
            SupaTroppers
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              background: '#f4f4f4',
              border: '1px solid #e6e6e6',
              borderRadius: 7,
              padding: '4px 10px',
              marginLeft: 6,
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 14,
                fontWeight: 700,
                color: '#1c1c1c',
                letterSpacing: '0.04em',
              }}
            >
              {timerDisplay}
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 9,
                color: '#9a9a9a',
                letterSpacing: '0.1em',
              }}
            >
              LEFT
            </span>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 18,
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 10,
              fontWeight: 700,
              color: '#9a9a9a',
              letterSpacing: '0.1em',
            }}
          >
            TROPPERS SAVED
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {connected
              ? onlinePlayers
                  .slice()
                  .sort((a, b) => a.colorIndex - b.colorIndex)
                  .map((p) => {
                    const pal = PALETTE[p.colorIndex];
                    const score = scoreByColor[p.colorIndex] ?? 0;
                    return (
                      <div key={p.playerId} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: pal.main, flex: 'none' }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#2c2c28' }}>{p.name}</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: pal.main }}>
                          {score}
                        </span>
                      </div>
                    );
                  })
              : PALETTE.map((p, i) => (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: p.main, flex: 'none' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#2c2c28' }}>{p.name}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: '#1c1c1c' }}>
                      {STATIC_SCORES[i]}
                    </span>
                  </div>
                ))}
          </div>
        </div>
      </div>

      <AbilityDock />
    </>
  );
}

function AbilityDock() {
  const selected = useSessionStore((s) => s.selectedAbility);
  const setSession = useSessionStore((s) => s.set);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  function toggle(ability: 'dig' | 'block' | 'stairs' | 'umbrella') {
    setSession({ selectedAbility: ability });
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '1') toggle('stairs');
      else if (e.key === '2') toggle('dig');
      else if (e.key === '3') toggle('block');
      else if (e.key === '4') toggle('umbrella');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // stable — reads selectedRef instead of closing over selected

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 16,
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 6,
        background: 'rgba(255,255,255,.96)',
        border: '1px solid #e6e6e6',
        borderRadius: 12,
        padding: 8,
        zIndex: 10,
        boxShadow: '0 6px 22px rgba(0,0,0,.1)',
        imageRendering: 'auto',
      }}
    >
      <Ability label="STAIRS"   hotkey="1" selected={selected === 'stairs'}   onClick={() => toggle('stairs')}   glyph={<StairsGlyph />} />
      <Ability label="DIG"      hotkey="2" selected={selected === 'dig'}      onClick={() => toggle('dig')}      glyph={<DigGlyph />} />
      <Ability label="BLOCK"    hotkey="3" selected={selected === 'block'}    onClick={() => toggle('block')}    glyph={<BlockGlyph />} />
      <Ability label="UMBRELLA" hotkey="4" selected={selected === 'umbrella'} onClick={() => toggle('umbrella')} glyph={<UmbrellaGlyph />} />
    </div>
  );
}

function Ability({
  label,
  hotkey,
  selected,
  disabled,
  onClick,
  glyph,
}: {
  label: string;
  hotkey: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  glyph: React.ReactNode;
}) {
  const ring = selected ? '#3ECF8E' : '#ededed';
  const fill = selected ? '#eafaf2' : '#fafafa';
  const text = selected ? '#11734b' : disabled ? '#c4c4c4' : '#6c6c6c';
  const hotkeyColor = selected ? '#9bcdb6' : '#c4c4c4';
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        width: 62,
        height: 60,
        borderRadius: 8,
        background: fill,
        border: `1.5px solid ${ring}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        position: 'relative',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {glyph}
      <span
        style={{
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: 9,
          fontWeight: 700,
          color: text,
        }}
      >
        {label}
      </span>
      <span
        style={{
          position: 'absolute',
          top: 3,
          right: 5,
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: 8,
          color: hotkeyColor,
        }}
      >
        {hotkey}
      </span>
    </div>
  );
}

function DigGlyph() {
  return (
    <div
      style={{
        width: 0,
        height: 0,
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        borderTop: '11px solid #11734b',
      }}
    />
  );
}

function StairsGlyph() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 12 }}>
      <span style={{ width: 4, height: 6, background: '#5c5c5c' }} />
      <span style={{ width: 4, height: 9, background: '#5c5c5c' }} />
      <span style={{ width: 4, height: 12, background: '#5c5c5c' }} />
    </div>
  );
}

function BlockGlyph() {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      <span style={{ width: 4, height: 13, background: '#5c5c5c' }} />
      <span style={{ width: 4, height: 13, background: '#5c5c5c' }} />
    </div>
  );
}

function UmbrellaGlyph() {
  return <div style={{ width: 16, height: 8, background: '#5c5c5c', borderRadius: '8px 8px 0 0' }} />;
}
