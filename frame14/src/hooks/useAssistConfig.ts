import { useQuery } from "@tanstack/react-query";

export interface AssistConfig {
  enabled: boolean;
  error?: "unknown_pipeline" | "ha_unreachable";
  pipelineId?: string;
  name?: string;
  language?: string;
  sttEngine?: string;
  ttsEngine?: string;
  conversationEngine?: string;
  usingPreferred?: boolean;
  speaker?: string | null;
  configuredId?: string;
  available?: { id: string; name: string }[];
}

async function fetchAssistConfig(): Promise<AssistConfig> {
  const res = await fetch("/api/assist/config");
  if (!res.ok) throw new Error(`Assist config fetch failed: ${res.status}`);
  return res.json() as Promise<AssistConfig>;
}

export function useAssistConfig() {
  return useQuery<AssistConfig>({
    queryKey: ["assist-config"],
    queryFn: fetchAssistConfig,
    staleTime: Infinity,
  });
}
