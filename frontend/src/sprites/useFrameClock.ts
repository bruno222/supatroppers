import { useEffect, useState } from 'react';

// Single rAF clock for the whole app. Returns the milliseconds elapsed since
// mount, throttled to ~30fps to match the .dc.html cadence (setState every
// 32ms) — sprite animations look identical and we save a lot of re-renders.
//
// Call this ONCE at the app root and pass `t` down as a prop. Calling it
// inside a leaf component means every leaf gets its own clock and re-renders
// independently — that's the perf trap the .dc.html avoids by hoisting.
export function useFrameClock(stepMs = 32): number {
  const [t, setT] = useState(0);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const start = performance.now();
    const loop = (now: number) => {
      if (now - last >= stepMs) {
        last = now;
        // Guard against tiny negatives: rAF's `now` is vsync time, which can
        // be slightly before the `performance.now()` we captured at mount.
        setT(Math.max(0, now - start));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [stepMs]);

  return t;
}
