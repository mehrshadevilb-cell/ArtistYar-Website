import AssistantClient from "./AssistantClient";

/**
 * Server page shell so the Assistant H1 is present in the initial HTML for crawlers.
 * Interactive chat stays in the client component (SSR-enabled, not ssr:false).
 */
export default function AssistantPage() {
  return <AssistantClient />;
}
