/**
 * Race a promise against a hard deadline so optional network/DB work
 * cannot block the critical SSR response indefinitely.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  onTimeout: () => T,
  label = "operation",
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[timeout] ${label} exceeded ${ms}ms — using fallback`);
      resolve(onTimeout());
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}
