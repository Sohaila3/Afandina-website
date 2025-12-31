// Lightweight RAF-based throttle utility
// Ensures the wrapped function runs at most once per animation frame
export function rafThrottle<T extends (...args: any[]) => void>(fn: T) {
  let scheduled = false;
  let lastArgs: any[] | null = null;

  return function (this: any, ...args: any[]) {
    lastArgs = args;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      // call with latest args and preserved `this`
      fn.apply(this, lastArgs || []);
    });
  } as (...args: Parameters<T>) => void;
}

export default rafThrottle;
