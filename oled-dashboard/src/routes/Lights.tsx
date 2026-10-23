import { Box, Text } from "@chakra-ui/react";
import { MdOutlineLightbulb } from "react-icons/md";
import { LightsSection } from "../components/LightsSection";
import { Board } from "../components/Board";
import { PageShell } from "../components/PageShell";
import { PageHeader } from "../components/PageHeader";
import { SectionTitle } from "../components/SectionTitle/SectionTitle";
import { buildLightSections } from "../lib/lightsConfig";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { useEntities } from "../hooks/useEntity";
import { LightsAllOffButton } from "../components/LightsAllOffButton";

// A stable empty list while the config loads: useEntities re-subscribes when
// the array changes identity.
const EMPTY: string[] = [];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function Lights() {
  const { data: entities } = useEntitiesConfig();
  const ids = entities?.lights ?? EMPTY;
  const sections = buildLightSections(ids);
  const states = useEntities(ids);
  const onIds = states
    .filter((q) => q.data?.state === "on")
    .map((q) => q.data!.entity_id);

  return (
    <PageShell>
      <PageHeader
        icon={<MdOutlineLightbulb />}
        iconColor="yellow.500"
        title="Lights"
        actions={
          onIds.length > 0 && (
            <>
              <Text textStyle="sm" color="fg.muted">
                {onIds.length} on
              </Text>
              <LightsAllOffButton entityIds={onIds} />
            </>
          )
        }
      />

      {sections.map((section) => {
        // The "Lights" group is what the page is — labelling its card again
        // would just repeat the page header. Only the switches group, which is
        // the exception on this page, carries a title of its own.
        const named = section.title !== "Lights";
        return (
          // A section whose entities are all unavailable renders no entries —
          // drop the whole tile rather than leaving an empty header on the page.
          <Box
            key={section.title}
            minW="0"
            css={{ "&:not(:has([data-light-entry]))": { display: "none" } }}
          >
            <Board
              collapsible={named}
              storageKey={`lights-${slugify(section.title)}`}
              title={
                named ? <SectionTitle>{section.title}</SectionTitle> : undefined
              }
            >
              <LightsSection entries={section.entries} />
            </Board>
          </Box>
        );
      })}
    </PageShell>
  );
}
