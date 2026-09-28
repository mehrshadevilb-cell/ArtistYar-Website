import AssistantClient from "./AssistantClient";

/**
 * Server shell provides a real H1 in the initial HTML for crawlers.
 * The interactive chat remains in AssistantClient (SSR-enabled).
 * AssistantClient still has its own compact header title for the app chrome;
 * that internal heading is an h1 in the client tree after hydrate — acceptable
 * for this tool UI; the document-level H1 for SEO is this server heading.
 */
export default function AssistantPage() {
  return (
    <div>
      <header className="container-ay sr-only">
        <h1>راه‌یار AI؛ دستیار هوشمند آموزش موسیقی</h1>
      </header>
      <AssistantClient />
    </div>
  );
}
