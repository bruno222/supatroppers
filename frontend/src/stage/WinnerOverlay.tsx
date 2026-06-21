import { PALETTE } from '@supatroppers/shared';
import { useRoomStore } from '../state/roomStore';
import { useSessionStore } from '../state/sessionStore';
import { hasSupabaseConfig } from '../realtime/client';


export function WinnerOverlay({ onPlayAgain }: { onPlayAgain?: () => void }) {
  const phase = useRoomStore((s) => s.phase);
  const players = useRoomStore((s) => s.players);
  const scores = useRoomStore((s) => s.scores);
  const connected = hasSupabaseConfig();

  if (!connected || phase !== 'ended') return null;

  const myPlayerId = useSessionStore.getState().playerId;

  const entries = Object.values(players)
    .map((p) => ({ p, score: scores[p.playerId] ?? 0 }))
    .sort((a, b) => b.score - a.score);

  const winner = entries[0];
  const winnerColor = winner ? PALETTE[winner.p.colorIndex] : null;
  const topScore = winner?.score ?? 0;
  const totalSaved = entries.reduce((sum, e) => sum + e.score, 0);


  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg,#FBFBFA 0%,#F1F8F4 100%)',
        padding: '56px 80px',
        zIndex: 20,
        imageRendering: 'auto',
        overflow: 'hidden',
      }}
    >
      {/* faint grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(0deg,rgba(0,0,0,.018) 0 1px,transparent 1px 40px),repeating-linear-gradient(90deg,rgba(0,0,0,.018) 0 1px,transparent 1px 40px)',
          pointerEvents: 'none',
        }}
      />

      {/* header */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 13,
              color: '#7c7c76',
              letterSpacing: '0.12em',
            }}
          >
            ROUND COMPLETE
          </div>
          <h1
            style={{
              margin: '8px 0 0',
              fontSize: 52,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#1c1c1c',
            }}
          >
            Final standings
          </h1>
        </div>
        <div
          style={{
            textAlign: 'right',
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 13,
            color: '#9a9a9a',
            lineHeight: 1.7,
          }}
        >          
          {totalSaved} troppers saved
        </div>
      </div>

      {/* body */}
      <div style={{ position: 'relative', display: 'flex', gap: 40, marginTop: 40 }}>
        {/* winner spotlight */}
        <div
          style={{
            flex: 'none',
            width: 380,
            background: '#fff',
            border: '1px solid #cfe9dd',
            borderRadius: 18,
            padding: '36px 32px',
            boxShadow: '0 10px 30px rgba(62,207,142,.12)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 12,
              fontWeight: 700,
              color: '#10a266',
              letterSpacing: '0.14em',
            }}
          >
            WINNER
          </div>

          {winner && winnerColor ? (
            <>
              <div
                style={{
                  marginTop: 24,
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  background: winnerColor.main,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(62,207,142,.35)',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 46,
                    background: '#fff',
                    clipPath: 'polygon(0 0,0 80%,28% 60%,46% 100%,60% 92%,42% 56%,74% 56%)',
                  }}
                />
              </div>
              <div style={{ marginTop: 20, fontSize: 30, fontWeight: 800, color: '#1c1c1c' }}>
                {winner.p.name || winnerColor.name}
              </div>
              <div style={{ marginTop: 4, fontSize: 15, color: '#8a8a85', fontWeight: 500 }}>
                saved the most troppers
              </div>
              <div
                style={{
                  marginTop: 22,
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 58,
                    fontWeight: 700,
                    color: '#10a266',
                    lineHeight: 1,
                  }}
                >
                  {topScore}
                </span>
                <span style={{ fontSize: 16, color: '#8a8a85', fontWeight: 600 }}>troppers</span>
              </div>
            </>
          ) : (
            <div style={{ marginTop: 40, fontSize: 18, color: '#8a8a85', fontWeight: 600 }}>
              No troppers saved
            </div>
          )}
        </div>

        {/* ranked list */}
        <div
          style={{
            flex: 1,
            background: '#fff',
            border: '1px solid #e6e6e6',
            borderRadius: 18,
            padding: '14px 22px',
            boxShadow: '0 6px 20px rgba(0,0,0,.05)',
          }}
        >
          {entries.length === 0 ? (
            <div
              style={{
                padding: '40px 0',
                textAlign: 'center',
                fontSize: 14,
                color: '#8a8a85',
              }}
            >
              No players this round
            </div>
          ) : (
            entries.map(({ p, score }, rank) => {
              const col = PALETTE[p.colorIndex];
              const isWinner = rank === 0;
              const pct = topScore > 0 ? Math.round((score / topScore) * 100) : 0;
              const isMe = p.playerId === myPlayerId;
              const isLast = rank === entries.length - 1;
              return (
                <div
                  key={p.playerId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 18,
                    padding: '16px 6px',
                    borderBottom: isLast ? 'none' : '1px solid #f2f2f0',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 18,
                      fontWeight: 700,
                      color: isWinner ? '#10a266' : '#8a8a85',
                      width: 28,
                    }}
                  >
                    {rank + 1}
                  </span>
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: col.main,
                      flex: 'none',
                    }}
                  />
                  <span style={{ fontSize: 17, fontWeight: 700, color: '#1c1c1c', width: 110 }}>
                    {p.name || col.name}
                    {isMe && (
                      <span style={{ fontWeight: 500, color: '#9a9a9a', fontSize: 14 }}> (you)</span>
                    )}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 12,
                      borderRadius: 6,
                      background: '#f2f2f0',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: col.main,
                        borderRadius: 6,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#1c1c1c',
                      width: 34,
                      textAlign: 'right',
                    }}
                  >
                    {score}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* footer */}
      <div
        style={{
          position: 'relative',
          marginTop: 36,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <button
          onClick={onPlayAgain}
          style={{
            height: 52,
            padding: '0 30px',
            background: '#3ECF8E',
            border: 'none',
            borderRadius: 11,
            color: '#04321f',
            fontFamily: "'Plus Jakarta Sans'",
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(62,207,142,.4)',
          }}
        >
          Play again
        </button>
      </div>
    </div>
  );
}
