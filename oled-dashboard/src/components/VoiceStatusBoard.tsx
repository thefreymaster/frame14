import { Alert, Text, VStack } from "@chakra-ui/react";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { useAssistConfig } from "../hooks/useAssistConfig";
import { micAvailable } from "../lib/voiceRecorder";
import { DataListItem, DataListRoot } from "./ui/data-list";

function Notice({
  status,
  title,
  children,
}: {
  status: "warning" | "error" | "info";
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <Alert.Root status={status}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        {children && <Alert.Description>{children}</Alert.Description>}
      </Alert.Content>
    </Alert.Root>
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
    <Board title={<SectionTitle>Voice</SectionTitle>}>
      <VStack align="stretch" gap="4">
        {isPending && <Text color="fg.muted">Checking…</Text>}

        {!isPending && data?.enabled && (
          <>
            <DataListRoot orientation="horizontal">
              <DataListItem label="Pipeline" value={data.name ?? "—"} />
              <DataListItem
                label="Speech to text"
                value={data.sttEngine ?? "—"}
              />
              <DataListItem
                label="Assistant"
                value={data.conversationEngine ?? "—"}
              />
              <DataListItem label="Voice" value={data.ttsEngine ?? "—"} />
              {data.speaker && (
                <DataListItem label="Also plays on" value={data.speaker} />
              )}
            </DataListRoot>
            {data.usingPreferred && (
              <Text textStyle="sm" color="fg.muted">
                Using Home Assistant's preferred pipeline. Set
                `assist_pipeline_id` in the addon configuration to pin a
                specific one.
              </Text>
            )}
          </>
        )}

        {!isPending && data?.error === "unknown_pipeline" && (
          <Notice
            status="warning"
            title="No pipeline matches the configured id."
          >
            <Text as="span" display="block">
              Configured: {data.configuredId || "(empty)"}
            </Text>
            {!!data.available?.length && (
              <>
                <Text as="span" display="block" mt="2">
                  Available:
                </Text>
                {data.available.map((p) => (
                  <Text as="span" display="block" key={p.id}>
                    {p.name} — {p.id}
                  </Text>
                ))}
              </>
            )}
          </Notice>
        )}

        {!isPending && data?.error === "ha_unreachable" && (
          <Notice
            status="error"
            title="Home Assistant isn't reachable, so voice is unavailable."
          />
        )}

        {!hasMic && (
          <Notice
            status="info"
            title="This device has no microphone available."
          >
            The button needs an https connection and microphone permission.
          </Notice>
        )}
      </VStack>
    </Board>
  );
}
