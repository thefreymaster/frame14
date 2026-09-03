import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { useAssistConfig } from "../hooks/useAssistConfig";
import { micAvailable } from "../lib/voiceRecorder";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <HStack width="100%" justify="space-between" gap="2vmin">
      <Text fontSize="2.2vmin" color="var(--theme-fg-faint)">
        {label}
      </Text>
      <Text fontSize="2.2vmin" color="var(--theme-fg-dim)" textAlign="right">
        {value}
      </Text>
    </HStack>
  );
}

/**
 * Read-only voice diagnostics.
 *
 * The pipeline is chosen in the addon's configuration, not here — this exists so
 * a mistyped id or a missing microphone shows up somewhere, instead of the mic
 * button just silently never appearing.
 */
export function VoiceStatusBoard() {
  const { data, isPending } = useAssistConfig();
  const hasMic = micAvailable();

  return (
    <Board title={<SectionTitle>VOICE</SectionTitle>}>
      <VStack align="stretch" gap="1.2vmin">
        {isPending && (
          <Text fontSize="2.2vmin" color="var(--theme-fg-faint)">
            Checking…
          </Text>
        )}

        {!isPending && data?.enabled && (
          <>
            <Row label="Pipeline" value={data.name ?? "—"} />
            <Row label="Speech to text" value={data.sttEngine ?? "—"} />
            <Row label="Assistant" value={data.conversationEngine ?? "—"} />
            <Row label="Voice" value={data.ttsEngine ?? "—"} />
            {data.speaker && <Row label="Also plays on" value={data.speaker} />}
            {data.usingPreferred && (
              <Text fontSize="2vmin" color="var(--theme-fg-faint)" mt="0.6vmin">
                Using Home Assistant's preferred pipeline. Set `assist_pipeline_id`
                in the addon configuration to pin a specific one.
              </Text>
            )}
          </>
        )}

        {!isPending && data?.error === "unknown_pipeline" && (
          <>
            <Text fontSize="2.4vmin" color="var(--theme-fg-dim)">
              No pipeline matches the configured id.
            </Text>
            <Text fontSize="2vmin" color="var(--theme-fg-faint)">
              Configured: {data.configuredId || "(empty)"}
            </Text>
            {!!data.available?.length && (
              <Box mt="0.8vmin">
                <Text fontSize="2vmin" color="var(--theme-fg-faint)" mb="0.4vmin">
                  Available:
                </Text>
                {data.available.map((p) => (
                  <Text key={p.id} fontSize="1.9vmin" color="var(--theme-fg-faint)">
                    {p.name} — {p.id}
                  </Text>
                ))}
              </Box>
            )}
          </>
        )}

        {!isPending && data?.error === "ha_unreachable" && (
          <Text fontSize="2.4vmin" color="var(--theme-fg-dim)">
            Home Assistant isn't reachable, so voice is unavailable.
          </Text>
        )}

        {!hasMic && (
          <Text fontSize="2vmin" color="var(--theme-fg-faint)" mt="0.6vmin">
            This device has no microphone available. The button needs an https
            connection and microphone permission.
          </Text>
        )}
      </VStack>
    </Board>
  );
}
