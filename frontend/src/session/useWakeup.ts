import { useState, useEffect } from 'react';

const MAX_TRIES = 4;
const TIMEOUT_MS = 5_000;

export type WakeupState = 'pending' | 'awake' | 'failed';

export function useWakeup(brainUrl: string | undefined): { state: WakeupState; attempt: number } {
  const [state, setState] = useState<WakeupState>(brainUrl ? 'pending' : 'awake');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!brainUrl) return;
    let cancelled = false;

    async function wake() {
      for (let i = 0; i < MAX_TRIES; i++) {
        if (cancelled) return;
        setAttempt(i);        
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
          const res = await fetch(`${brainUrl}/wakeup-bro`, { signal: controller.signal });
          clearTimeout(timer);
          if (res.ok) {
            if (!cancelled) setState('awake');
            return;
          }
        } catch {
          // timeout or network error — retry
        }
      }
      if (!cancelled) setState('failed');
    }

    wake();
    return () => { cancelled = true; };
  }, [brainUrl]);

  return { state, attempt };
}
