/** Client-side request timeout helper for admin AI fetches. */
export function withTimeout(parent?: AbortSignal, ms = 25000): {
  signal: AbortSignal;
  clear: () => void;
  didTimeout: () => boolean;
} {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ms);
  const onAbort = () => controller.abort();
  if (parent) {
    if (parent.aborted) controller.abort();
    else parent.addEventListener("abort", onAbort, { once: true });
  }
  return {
    signal: controller.signal,
    clear: () => {
      clearTimeout(timer);
      if (parent) parent.removeEventListener("abort", onAbort);
    },
    didTimeout: () => timedOut,
  };
}

export function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}
