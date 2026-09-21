import { listEnvDiscoveredProviders } from "@/lib/ai-env-providers";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};
