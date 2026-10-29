import { Box, SimpleGrid, Text } from "@chakra-ui/react";
import { MdOutlineLightbulb } from "react-icons/md";
import { LightsSection } from "../components/LightsSection";
import { Board } from "../components/Board";
import { PageShell } from "../components/PageShell";
import { PageHeader } from "../components/PageHeader";
import { SectionTitle } from "../components/SectionTitle/SectionTitle";
import { LightsSkeleton } from "../components/skeletons/LightsSkeleton";
import {
  buildLightSections,
  LIGHT_TILE_COLUMNS_FLUID,
  sortLightSections,
} from "../lib/lightsConfig";
import { useDesktop } from "../hooks/useDesktop";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { useEntities, useEntitiesAcked } from "../hooks/useEntity";
import { LightsAllOffButton } from "../components/LightsAllOffButton";

// A stable empty list while the config loads: useEntities re-subscribes when
// the array changes identity.
const EMPTY: string[] = [];

// Skeleton tiles before the entity config says how many lights there are.
const DEFAULT_SKELETON_TILES = 6;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function Lights() {
  const { data: entities, isPending: configPending } = useEntitiesConfig();
  // The groups' columns (0.123): three on a desktop, two on a smaller screen
  // from Chakra's lg up (the frame, a tablet, a narrow desktop window), one
  // on a phone. A desktop's third-width groups size their tiles to the group
  // (LIGHT_TILE_COLUMNS_FLUID) rather than the viewport.
  const desktop = useDesktop();
  const tileColumns = desktop ? LIGHT_TILE_COLUMNS_FLUID : undefined;
  const ids = entities?.lights ?? EMPTY;
  const states = useEntities(ids);
  // Alphabetical, by the name each tile shows: Home Assistant's friendly name
  // once its state is in, the id's words until then.
  const nameById = new Map(
    states.map((q) => {
      const name = q.data?.attributes?.friendly_name;
      return [q.data?.entity_id, typeof name === "string" ? name : undefined];
    }),
  );
  const sections = sortLightSections(
    buildLightSections(ids, entities?.rooms),
    (entry) => nameById.get(entry.entity_id) ?? entry.name,
  );
  const onIds = states
    .filter((q) => q.data?.state === "on")
    .map((q) => q.data!.entity_id);

  // Skeleton tiles until every light's state is in. A light Home Assistant
  // doesn't know never gets one, so the server's acks end the wait too.
  const acked = useEntitiesAcked(ids);
  const loading =
    configPending ||
    (ids.length > 0 && !acked && !states.every((q) => q.data));

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

      {configPending ? (
        <Board>
          <LightsSkeleton
            count={DEFAULT_SKELETON_TILES}
            columns={tileColumns}
          />
        </Board>
      ) : (
        // The groups in columns, each row as tall as its tallest group, the
        // shorter ones top-aligned.
        <SimpleGrid
          columns={desktop ? 3 : { base: 1, lg: 2 }}
          gap="gutter"
          width="100%"
          alignItems="start"
        >
          {sections.map((section) => {
            // The "Lights" group is what the page is — labelling its card
            // again would just repeat the page header. Only a group that is
            // the exception on this page (a room, the switches) carries a
            // title of its own.
            const named = section.title !== "Lights";
            return (
              // A section whose entities are all unavailable renders no
              // entries — drop the whole tile rather than leaving an empty
              // header on the page (not while the skeleton stands in for them).
              <Box
                key={section.title}
                minW="0"
                css={
                  loading
                    ? undefined
                    : { "&:not(:has([data-light-entry]))": { display: "none" } }
                }
              >
                <Board
                  collapsible={named}
                  storageKey={`lights-${slugify(section.title)}`}
                  title={
                    named ? (
                      <SectionTitle>{section.title}</SectionTitle>
                    ) : undefined
                  }
                >
                  {loading ? (
                    <LightsSkeleton
                      count={section.entries.length}
                      columns={tileColumns}
                    />
                  ) : (
                    <LightsSection
                      entries={section.entries}
                      columns={tileColumns}
                    />
                  )}
                </Board>
              </Box>
            );
          })}
        </SimpleGrid>
      )}
    </PageShell>
  );
}
