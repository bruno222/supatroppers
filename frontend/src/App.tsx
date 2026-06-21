import { useState, useEffect, useRef } from 'react';
import { Stage, STAGE_W, STAGE_H } from './stage/Stage';
import { Lobby } from './session/Lobby';
import { WinnerOverlay } from './stage/WinnerOverlay';
import { useGameConnection } from './session/useGameConnection';
import { usePlayerInput } from './players/usePlayerInput';
import { RemoteCursors } from './players/RemoteCursors';
import { ClickPings } from './players/ClickPing';
import { useRoomStore } from './state/roomStore';
import { hasSupabaseConfig } from './realtime/client';
import { useWakeup } from './session/useWakeup';
import type { SendInput } from './realtime/useChannels';

const BRAIN_URL = import.meta.env.VITE_BRAIN_URL as string | undefined;

export default function App() {
  const supabaseReady = hasSupabaseConfig();
  const { state: wakeup, attempt: wakeupAttempt } = useWakeup(supabaseReady ? BRAIN_URL : undefined);

  if (supabaseReady && wakeup === 'pending') {
    return <WakingUpScreen attempt={wakeupAttempt} />;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#e7e5df',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        padding: 56,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      {!supabaseReady && <MissingEnvBanner />}
      {supabaseReady ? <Connected /> : <Demo />}
    </div>
  );
}

function Demo() {
  return <Stage />;
}

// Manages screen state. When the game ends we unmount InGame (which drops
// the Supabase channels) and show the final standings standalone. "Play again"
// resets the store and remounts InGame so channels reconnect fresh.
function Connected() {
  const [screen, setScreen] = useState<'playing' | 'final'>('playing');
  const phase = useRoomStore((s) => s.phase);

  useEffect(() => {
    if (phase === 'ended') setScreen('final');
  }, [phase]);

  if (screen === 'final') {
    return (
      <FinalScreen
        onPlayAgain={() => setScreen('playing')}
      />
    );
  }
  return <InGame />;
}

// Owns the Supabase channels. Unmounts when the game ends so channels are
// dropped automatically via the useChannels cleanup.
function InGame() {
  const { ready, send } = useGameConnection();
  const phase = useRoomStore((s) => s.phase);
  const hasSnapshot = useRoomStore((s) => s.hasSnapshot);
  const [joined, setJoined] = useState(false);
  // True once we've seen the server report 'waiting'. Used to distinguish
  // "was in the lobby when the round started" (auto-enter) from "joined
  // mid-game" (must click the Lobby button to enter).
  const seenServerWaitingRef = useRef(false);

  useEffect(() => {
    if (!hasSnapshot) return;
    if (phase === 'waiting') {
      seenServerWaitingRef.current = true;
      setJoined(false);
    }
    if (phase === 'playing' && seenServerWaitingRef.current) {
      setJoined(true);
    }
  }, [phase, hasSnapshot]);

  if (joined) return <GameView send={send} ready={ready} />;
  return <Lobby send={send} onEnterGame={() => setJoined(true)} />;
}

function FinalScreen({ onPlayAgain }: { onPlayAgain: () => void }) {
  return (
    <div
      style={{
        position: 'relative',
        width: STAGE_W,
        height: STAGE_H,
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,.1),0 8px 24px rgba(0,0,0,.06)',
      }}
    >
      <WinnerOverlay onPlayAgain={onPlayAgain} />
    </div>
  );
}

function GameView({ send, ready }: { send: SendInput; ready: boolean }) {
  const [stageEl, setStageEl] = useState<HTMLDivElement | null>(null);
  usePlayerInput(stageEl, send, ready);

  return (
    <div ref={setStageEl}>
      <Stage>
        <ClickPings />
        <RemoteCursors />
      </Stage>
    </div>
  );
}

function WakingUpScreen({ attempt }: { attempt: number }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#e7e5df',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        gap: 8,
        textAlign: 'center',
        padding: 24,
      }}
    >
      <p style={{ fontSize: 20, fontWeight: 600, color: '#3a3632', margin: 0 }}>
        Waking up...
      </p>
      {attempt >= 1 && (
        <p style={{ fontSize: 16, color: '#7a7470', margin: 0 }}>
          He took another nap...
        </p>
      )}
      {attempt >= 2 && (
        <p style={{ fontSize: 14, color: '#9a9490', margin: 0 }}>
          Shouldn't take long...
        </p>
      )}
    </div>
  );
}

function MissingEnvBanner() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        left: 12,
        right: 12,
        background: '#fff8e1',
        border: '1px solid #f0c84e',
        borderRadius: 8,
        padding: '8px 14px',
        fontSize: 13,
        color: '#6a4a00',
        zIndex: 999,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <b>Demo mode:</b> VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing.
      Copy <code>frontend/.env.example</code> to <code>frontend/.env</code> and set both to enable
      multiplayer.
    </div>
  );
}
