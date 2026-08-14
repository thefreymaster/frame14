import { Box } from "@chakra-ui/react";
import { MdOutlineLightbulb } from "react-icons/md";
import { LightsSection } from "../components/LightsSection";
import { Board } from "../components/Board";
import { PageShell } from "../components/PageShell";
import { PageHeader } from "../components/PageHeader";
import { SectionTitle } from "../components/SectionTitle/SectionTitle";
import { buildLightSections } from "../lib/lightsConfig";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function Lights() {
  const { data: entities } = useEntitiesConfig();
  const sections = buildLightSections(entities?.lights ?? []);

  return (
    <PageShell>
      <PageHeader
        icon={<MdOutlineLightbulb />}
        iconColor="yellow.500"
        title="LIGHTS"
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
                named ? (
                  <SectionTitle>{section.title.toUpperCase()}</SectionTitle>
                ) : undefined
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
