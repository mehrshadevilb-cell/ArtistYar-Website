export type AnalyticsEvent =
  | "page_view"
  | "service_view"
  | "order_start"
  | "order_complete"
  | "contact_click";

export interface AnalyticsPayload {
  event: AnalyticsEvent;
  path?: string;
  service?: string;
  metadata?: Record<string, string | number | boolean>;
}

export function createAnalyticsEvent(
  payload: AnalyticsPayload,
): AnalyticsPayload {
  return {
    ...payload,
    metadata: {
      timestamp: Date.now(),
      ...(payload.metadata ?? {}),
    },
  };
}
