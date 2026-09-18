export type SupabaseErrorLike = {
  message?: unknown;
  error?: unknown;
  code?: unknown;
  status?: unknown;
  statusCode?: unknown;
  httpStatusCode?: unknown;
};

export type SupabaseErrorDetails = {
  code: string;
  message: string;
  upstreamStatus: number | null;
};

function asRecord(value: unknown): SupabaseErrorLike {
  return value && typeof value === "object" ? (value as SupabaseErrorLike) : {};
}

function numericStatus(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export function getSupabaseErrorDetails(error: unknown): SupabaseErrorDetails {
  const source = asRecord(error);
  const nested = asRecord(source.error);
  const code = String(source.code || nested.code || "supabase_error").trim().slice(0, 80);
  const message = String(
    source.message || nested.message || (error instanceof Error ? error.message : "خطای نامشخص از Supabase"),
  )
    .trim()
    .slice(0, 300);
  const upstreamStatus =
    numericStatus(source.status) ||
    numericStatus(source.statusCode) ||
    numericStatus(source.httpStatusCode) ||
    numericStatus(nested.status) ||
    numericStatus(nested.statusCode) ||
    null;
  return { code, message: message || "خطای نامشخص از Supabase", upstreamStatus };
}

export class SupabaseOperationError extends Error {
  readonly operation: string;
  readonly code: string;
  readonly upstreamStatus: number | null;

  constructor(operation: string, error: unknown) {
    const details = getSupabaseErrorDetails(error);
    super(`${operation}: ${details.message}`);
    this.name = "SupabaseOperationError";
    this.operation = operation;
    this.code = details.code;
    this.upstreamStatus = details.upstreamStatus;
  }
}

export function supabaseErrorHttpStatus(error: unknown): number {
  const details = getSupabaseErrorDetails(error);
  if (details.code === "supabase_not_configured") return 503;
  if (details.upstreamStatus === 413 || details.code === "EntityTooLarge") return 413;
  if (details.upstreamStatus === 409 || details.code === "ResourceAlreadyExists") return 409;
  if (details.upstreamStatus === 400 || details.code === "InvalidRequest" || details.code === "InvalidKey") return 400;
  return 502;
}

export function isMissingBucketError(error: unknown): boolean {
  const details = getSupabaseErrorDetails(error);
  return (
    details.upstreamStatus === 404 ||
    /nosuchbucket|bucket.*(not found|does not exist)|not found/i.test(`${details.code} ${details.message}`)
  );
}

export function supabaseErrorPayload(error: unknown, fallback: string) {
  const details = getSupabaseErrorDetails(error);
  const configured = details.code === "supabase_not_configured";
  return {
    ok: false,
    error: configured ? "اتصال Supabase روی سرور تنظیم نشده است." : `${fallback} ${details.message}`.trim(),
    code: details.code,
    ...(details.upstreamStatus ? { upstreamStatus: details.upstreamStatus } : {}),
  };
}
