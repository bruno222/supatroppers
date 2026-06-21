// Owns the once-per-session player_hello and re-hello on tab refocus.
// Returns the connection status the UI uses to gate the cursor input.

import { useEffect } from 'react';
import { useChannels, type SendInput } from '../realtime/useChannels';
import { useSessionStore } from '../state/sessionStore';

const HEARTBEAT_MS = 1_000;

export function useGameConnection() {
  const { status, send } = useChannels();
  const name = useSessionStore((s) => s.name);
  const playerId = useSessionStore((s) => s.playerId);
  const preferredColorIndex = useSessionStore((s) => s.preferredColorIndex);

  const ready = status === 'ready' && name.length > 0;

  useEffect(() => {
    if (!ready) return;
    sendHello(send, playerId, name, preferredColorIndex);

    const heartbeat = setInterval(() => {
      send({ type: 'player_heartbeat', playerId, t: Date.now() });
    }, HEARTBEAT_MS);

    const onVis = () => {
      if (document.visibilityState === 'visible') {
        sendHello(send, playerId, name, preferredColorIndex);
      }
    };
    const onUnload = () => send({ type: 'player_bye', playerId });
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [ready, send, playerId, name, preferredColorIndex]);

  return { status, send, ready };
}

function sendHello(send: SendInput, playerId: string, name: string, preferredColorIndex: number) {
  send({ type: 'player_hello', playerId, name, preferredColorIndex });
}
