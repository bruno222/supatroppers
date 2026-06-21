import { useState, useEffect, useRef } from 'react';
import { PALETTE } from '@supatroppers/shared';
import type { PlayerState } from '@supatroppers/shared';
import { useRoomStore } from '../state/roomStore';
import { useSessionStore } from '../state/sessionStore';
import type { SendInput } from '../realtime/useChannels';

// Ignore cursor position (x/y/lastSeen) when deciding if the player list changed.
// Without this, Lobby re-renders at 20 Hz on every snapshot even when nothing visible changed.
function playersEqual(
  a: Record<string, PlayerState>,
  b: Record<string, PlayerState>,
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const id of aKeys) {
    const pa = a[id], pb = b[id];
    if (!pb) return false;
    if (pa.name !== pb.name || pa.colorIndex !== pb.colorIndex || pa.online !== pb.online) return false;
  }
  return true;
}

function readyIdsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

const READY_TIMEOUT_SECS = 20;
const MAX_PLAYERS = 10; // Must match brain-server/src/index.ts MAX_PLAYERS.

interface Props {
  send: SendInput;
  onEnterGame: () => void;
}

export function Lobby({ send, onEnterGame }: Props) {
  const roomPlayersRaw = useRoomStore((s) => s.players);
  const roomPlayersRef = useRef(roomPlayersRaw);
  if (!playersEqual(roomPlayersRef.current, roomPlayersRaw)) roomPlayersRef.current = roomPlayersRaw;
  const roomPlayers = roomPlayersRef.current;

  const readyPlayerIdsRaw = useRoomStore((s) => s.readyPlayerIds);
  const readyPlayerIdsRef = useRef(readyPlayerIdsRaw);
  if (!readyIdsEqual(readyPlayerIdsRef.current, readyPlayerIdsRaw)) readyPlayerIdsRef.current = readyPlayerIdsRaw;
  const readyPlayerIds = readyPlayerIdsRef.current;
  const phase = useRoomStore((s) => s.phase);
  const playerId = useSessionStore((s) => s.playerId);
  const name = useSessionStore((s) => s.name);
  const session = useSessionStore();

  const [editName, setEditName] = useState(name);
  const [secsLeft, setSecsLeft] = useState(READY_TIMEOUT_SECS);
  const [copied, setCopied] = useState(false);

  // Broadcast name changes to other players with a short debounce.
  // Updating sessionStore triggers useGameConnection to re-send player_hello.
  useEffect(() => {
    const trimmed = editName.trim().slice(0, 24);
    if (!trimmed || trimmed === name) return;
    const id = setTimeout(() => session.set({ name: trimmed }), 400);
    return () => clearTimeout(id);
  }, [editName]); // eslint-disable-line react-hooks/exhaustive-deps

  const myColorIndex = roomPlayers[playerId]?.colorIndex ?? -1;
  const myColor = myColorIndex >= 0 ? PALETTE[myColorIndex]?.main : '#c4c4c4';

  // Always include local player so list is never empty while connecting.
  // Use editName (live typed value) so the list updates in real time.
  const mergedPlayers = { ...roomPlayers };
  const localEntry = {
    playerId,
    name: editName.trim() || name || '…',
    colorIndex: myColorIndex,
    x: 0, y: 0,
    online: true,
    lastSeen: Date.now(),
  };
  mergedPlayers[playerId] = {
    ...(roomPlayers[playerId] ?? localEntry),
    // Always show the live-typed name for the local player
    name: editName.trim() || roomPlayers[playerId]?.name || '…',
  };

  const onlinePlayers = Object.values(mergedPlayers).filter((p) => p.online);
  const hasEnoughPlayers = onlinePlayers.length >= 1;
  const isReady = readyPlayerIds.includes(playerId);
  const isGameRunning = phase === 'playing';
  const isGameEnded = phase === 'ended';
  const waitingSlot = onlinePlayers.length < 2 ? 1 : 0;

  // Server-confirmed online count (excludes local player if not yet registered).
  const serverOnlineCount = Object.values(roomPlayers).filter((p) => p.online).length;
  const isRegisteredPlayer = !!roomPlayers[playerId];
  // Game is full when playing, at capacity, and this player isn't registered yet.
  const isFull = isGameRunning && serverOnlineCount >= MAX_PLAYERS && !isRegisteredPlayer;

  const sendRef = useRef(send);
  sendRef.current = send;
  const playerIdRef = useRef(playerId);
  playerIdRef.current = playerId;

  const hasName = !!editName.trim();

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const hasMultiplePlayers = onlinePlayers.length >= 2;

  // Countdown: only during 'waiting' with 2+ players, not yet ready, and name is set.
  useEffect(() => {
    if (isGameRunning || isGameEnded || !hasMultiplePlayers || isReady || !hasName) return;
    setSecsLeft(READY_TIMEOUT_SECS);
    const id = setInterval(() => {
      setSecsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          sendRef.current({ type: 'player_ready', playerId: playerIdRef.current });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isGameRunning, isGameEnded, hasMultiplePlayers, isReady, hasName]);

  function saveName() {
    const trimmed = editName.trim().slice(0, 24);
    if (trimmed.length > 0) session.set({ name: trimmed });
  }

  function markReady() {
    send({ type: 'player_ready', playerId });
  }

  return (
    <div
      style={{
        position: 'relative',
        width: 1280,
        height: 768,
        background: 'linear-gradient(180deg,#FBFBFA 0%,#F1F8F4 100%)',
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,.1),0 8px 24px rgba(0,0,0,.06)',
        display: 'flex',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* faint grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(0deg,rgba(0,0,0,.018) 0 1px,transparent 1px 40px),' +
            'repeating-linear-gradient(90deg,rgba(0,0,0,.018) 0 1px,transparent 1px 40px)',
        }}
      />

      {/* ── LEFT: hero ── */}
      <div
        style={{
          position: 'relative',
          width: 720,
          padding: '72px 64px 28px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div
            style={{
              width: 40, height: 40,
              background: '#1f1f1f',
              borderRadius: 10,
              position: 'relative',
              flex: 'none',
            }}
          >
            <div
              style={{
                position: 'absolute', inset: 0, margin: 'auto',
                width: 18, height: 22,
                background: '#3ECF8E',
                clipPath: 'polygon(54% 0,54% 42%,100% 42%,46% 100%,46% 58%,0 58%)',
              }}
            />
          </div>
          <span
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 12, color: '#7c7c76', letterSpacing: '0.14em',
            }}
          >
            REALTIME · MULTIPLAYER
          </span>
        </div>

        <h1
          style={{
            margin: '28px 0 0',
            fontSize: 76, lineHeight: 0.96,
            fontWeight: 800, letterSpacing: '-0.03em', color: '#1c1c1c',
          }}
        >
          Supa<span style={{ color: '#10a266' }}>Troppers</span>
        </h1>

        <p
          style={{
            margin: '22px 0 0',
            fontSize: 21, lineHeight: 1.45,
            color: '#52524c', maxWidth: 480, fontWeight: 500,
          }}
        >
          A multiplayer game to move your troppers to the Gate. Most saved wins!
        </p>

        {/* Join card */}
        <div
          style={{
            marginTop: 40, width: 460,
            background: '#fff',
            border: '1px solid #e6e6e6',
            borderRadius: 14,
            padding: '20px 22px',
            boxShadow: '0 6px 20px rgba(0,0,0,.05)',
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 11, color: '#9a9a9a', letterSpacing: '0.08em', marginBottom: 14,
            }}
          >
            YOU'RE IN AS
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Cursor in player's assigned color */}
            <div
              style={{
                width: 17, height: 23,
                background: myColor,
                clipPath: 'polygon(0 0, 0 80%, 28% 60%, 46% 100%, 60% 92%, 42% 56%, 74% 56%)',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.25))',
                flex: 'none',
                transition: 'background 0.3s ease',
              }}
            />
            <input
              autoFocus={!name}
              value={editName}
              onChange={(e) => setEditName(e.target.value.slice(0, 24))}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveName();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder="Your name"
              style={{
                flex: 1,
                fontFamily: "'Plus Jakarta Sans'",
                fontSize: 18, fontWeight: 700, color: '#1c1c1c',
                border: '1px solid #e6e6e6',
                borderRadius: 9, padding: '9px 12px',
                background: '#fafafa', outline: 'none',
              }}
            />
          </div>
        </div>

        {/* ── Action button area ── */}

        {/* Game already running: late-joiner — room available */}
        {isGameRunning && !isFull && (
          <>
            <div
              style={{
                marginTop: 24, width: 460,
                background: '#fff8e1',
                border: '1px solid #f0c84e',
                borderRadius: 11,
                padding: '12px 18px',
                display: 'flex', alignItems: 'center', gap: 10,
                fontSize: 14, fontWeight: 600, color: '#6a4a00',
              }}
            >
              <span style={{ fontSize: 16 }}>⚡</span>
              A game is already in progress — join now!
            </div>
            <button
              onClick={onEnterGame}
              style={{
                marginTop: 12, width: 460, height: 54,
                background: '#3ECF8E', border: 'none', borderRadius: 11,
                color: '#04321f',
                fontFamily: "'Plus Jakarta Sans'",
                fontSize: 17, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(62,207,142,.4)',
              }}
            >
              Jump into the game →
            </button>
          </>
        )}

        {/* Game already running: lobby is full — watch only */}
        {isGameRunning && isFull && (
          <>
            <div
              style={{
                marginTop: 24, width: 460,
                background: '#f4f0ff',
                border: '1px solid #c9b8f0',
                borderRadius: 11,
                padding: '12px 18px',
                display: 'flex', alignItems: 'center', gap: 10,
                fontSize: 14, fontWeight: 600, color: '#4a2d8a',
              }}
            >
              <span style={{ fontSize: 16 }}>👁</span>
              Game is full ({MAX_PLAYERS}/{MAX_PLAYERS} players) — watch only
            </div>
            <button
              onClick={onEnterGame}
              style={{
                marginTop: 12, width: 460, height: 54,
                background: '#7c5cbf', border: 'none', borderRadius: 11,
                color: '#fff',
                fontFamily: "'Plus Jakarta Sans'",
                fontSize: 17, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(124,92,191,.35)',
              }}
            >
              Watch game →
            </button>
          </>
        )}

        {/* Round just ended: waiting for server to reset */}
        {isGameEnded && (
          <div
            style={{
              marginTop: 24, width: 460, height: 54,
              background: '#f4f4f4', border: '1px solid #e0e0e0', borderRadius: 11,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 600, color: '#9a9a9a',
            }}
          >
            Round over — new round starting soon…
          </div>
        )}

        {/* Waiting phase: ready to go */}
        {!isGameRunning && !isGameEnded && hasEnoughPlayers && !isReady && (
          <button
            onClick={markReady}
            disabled={!editName.trim()}
            style={{
              marginTop: 24, width: 460, height: 54,
              background: editName.trim() ? '#3ECF8E' : '#d0d0d0',
              border: 'none', borderRadius: 11,
              color: editName.trim() ? '#04321f' : '#8a8a8a',
              fontFamily: "'Plus Jakarta Sans'",
              fontSize: 17, fontWeight: 700,
              cursor: editName.trim() ? 'pointer' : 'not-allowed',
              boxShadow: editName.trim() ? '0 4px 14px rgba(62,207,142,.4)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
          >
            I'm ready →
            {hasMultiplePlayers && (
              <span
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 12, fontWeight: 500, color: '#04321f', opacity: 0.6,
                }}
              >
                ({secsLeft}s)
              </span>
            )}
          </button>
        )}

        {/* Waiting phase: already clicked ready */}
        {!isGameRunning && !isGameEnded && hasEnoughPlayers && isReady && (
          <div
            style={{
              marginTop: 24, width: 460, height: 54,
              background: '#eafaf2', border: '1px solid #b7e7d1', borderRadius: 11,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontSize: 15, fontWeight: 600, color: '#11734b',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3ECF8E', flex: 'none' }} />
            Waiting for everyone to be ready…
          </div>
        )}

        <div
          style={{
            marginTop: 'auto',
            paddingTop: 32,
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 11, color: '#a3a3a3',
            textAlign: 'center',
            alignSelf: 'center',
            lineHeight: 1.8,
          }}
        >
          built with ❤️ by Bruno Kilian<br />using Supabase Realtime.
          <br /><br />
          <a
            href="http://github.com/bruno222/supatroppers"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#a3a3a3', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
          >
            <svg height="13" viewBox="0 0 16 16" width="13" style={{ display: 'block' }}>
              <path fill="#a3a3a3" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            github
          </a>
        </div>
      </div>

      {/* ── RIGHT: player list panel ── */}
      <div
        style={{
          position: 'relative', flex: 1,
          background: '#fff', borderLeft: '1px solid #ededed',
          padding: '64px 48px',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 22,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: '#1c1c1c' }}>
            {isGameRunning ? 'Now playing' : 'Players'}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#9a9a9a' }}>
            {onlinePlayers.length} / {MAX_PLAYERS}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {onlinePlayers.map((p) => {
            const pColor = p.colorIndex >= 0 ? PALETTE[p.colorIndex]?.main : '#c4c4c4';
            const isMe = p.playerId === playerId;
            const ready = readyPlayerIds.includes(p.playerId);

            return (
              <div
                key={p.playerId}
                style={{
                  display: 'flex', alignItems: 'center', gap: 13,
                  background: isMe ? '#f7fcf9' : '#fafafa',
                  border: `1px solid ${isMe ? '#cfe9dd' : '#ededed'}`,
                  borderRadius: 11, padding: '13px 15px',
                }}
              >
                <span
                  style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: pColor, flex: 'none',
                    transition: 'background 0.3s ease',
                  }}
                />
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: isMe ? 700 : 600,
                    color: isMe ? '#1c1c1c' : '#2c2c28',
                    flex: 1,
                  }}
                >
                  {p.name}
                  {isMe && (
                    <span style={{ fontWeight: 500, color: '#9a9a9a', marginLeft: 6 }}>(you)</span>
                  )}
                </span>
                {isGameRunning ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3ECF8E' }} />
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#10a266' }}>
                      playing
                    </span>
                  </span>
                ) : ready ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3ECF8E' }} />
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#10a266' }}>
                      ready
                    </span>
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#d8b400' }} />
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#a08600' }}>
                      joining…
                    </span>
                  </span>
                )}
              </div>
            );
          })}

          {!isGameRunning && Array.from({ length: waitingSlot }).map((_, i) => (
            <div
              key={`waiting-${i}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 13,
                background: '#fafafa',
                border: '1px dashed #e0e0e0',
                borderRadius: 11, padding: '13px 15px',
              }}
            >
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#e8e8e8', flex: 'none' }} />
              <span style={{ fontSize: 15, fontWeight: 500, color: '#c0c0c0', fontStyle: 'italic', flex: 1 }}>
                invite a friend — they can join mid-game!
              </span>
            </div>
          ))}
        </div>

        {/* Share link: solo in lobby — pinned to bottom of right panel */}
        {!isGameRunning && !isGameEnded && onlinePlayers.length < 2 && (
          <div
            style={{
              marginTop: 'auto',
              background: '#f5f9ff',
              border: '1px solid #d0e3ff',
              borderRadius: 11,
              padding: '12px 16px',
              fontSize: 13, fontWeight: 500, color: '#3a5a9a',
            }}
          >
            <div style={{ marginBottom: 8 }}>
              Want a friend to join? Share this link — they can hop in even mid-game!
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                readOnly
                value={window.location.href}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                style={{
                  flex: 1,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11, color: '#2a4a7a',
                  background: '#eaf1ff', border: '1px solid #c0d4f5',
                  borderRadius: 7, padding: '6px 10px', outline: 'none',
                }}
              />
              <button
                onClick={copyLink}
                style={{
                  padding: '6px 14px',
                  background: copied ? '#3ECF8E' : '#dce8ff',
                  border: 'none', borderRadius: 7,
                  fontFamily: "'Plus Jakarta Sans'",
                  fontSize: 12, fontWeight: 700,
                  color: copied ? '#04321f' : '#2a4a7a',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
