// Trailing throttle pinned to wall-clock — drops bursty calls, keeps the
// most recent payload. Used to cap cursor_move at 30 Hz without React state.

export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  hz: number
): (...args: Args) => void {
  const interval = 1000 / hz;
  let last = 0;
  let pendingArgs: Args | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (!pendingArgs) return;
    last = performance.now();
    const args = pendingArgs;
    pendingArgs = null;
    timer = null;
    fn(...args);
  };

  return (...args: Args) => {
    const now = performance.now();
    const wait = interval - (now - last);
    if (wait <= 0) {
      last = now;
      fn(...args);
      return;
    }
    pendingArgs = args;
    if (!timer) timer = setTimeout(flush, wait);
  };
}
