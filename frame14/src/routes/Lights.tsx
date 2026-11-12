import { Box, SimpleGrid, Text } from "@chakra-ui/react";
import { MdLightbulb, MdOutlineLightbulb } from "react-icons/md";
import { LightsSection } from "../components/LightsSection";
import { Board } from "../components/Board";
import { PageShell } from "../components/PageShell";
import { PageHeader } from "../components/PageHeader";
import { SectionTitle } from "../components/SectionTitle/SectionTitle";
import { LightsSkeleton } from "../components/skeletons/LightsSkeleton";
import {
  buildLightSections,
  LIGHT_TILE_COLUMNS_CARD,
  LIGHT_TILE_COLUMNS_FLUID,
  displayLightName,
  lightEntry,
  sortLightEntries,
  sortLightSections,
  type LightEntry,
} from "../lib/lightsConfig";
import { useLightFavorites } from "../lib/lightFavorites";
import { useDesktop } from "../hooks/useDesktop";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { useEntities, useEntitiesAcked } from "../hooks/useEntity";
import { LightsAllOffButton } from "../components/LightsAllOffButton";
import { ScenesCard } from "../components/ScenesCard";
import { IoStar, IoToggle, IoToggleOutline } from "react-icons/io5";

// A stable empty list while the config loads: useEntities re-subscribes when
// the array changes identity.
const EMPTY: string[] = [];

// Skeleton tiles before the entity config says how many lights there are.
const DEFAULT_SKELETON_TILES = 6;

// A group's header icon while one of its lights is on: the page header's
// yellow (0.154.0).
const LIT = "yellow.500";

/** A group's header icon, lit (filled) while one of its lights is on. */
function groupIcon(title: string, lit: boolean) {
  if (title === "Switches") return lit ? <IoToggle /> : <IoToggleOutline />;
  return lit ? <MdLightbulb /> : <MdOutlineLightbulb />;
}

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
  const favoriteIds = useLightFavorites();
  // Alphabetical, by the name each tile shows: Home Assistant's friendly name
  // once its state is in, the id's words until then.
  const nameById = new Map(
    states.map((q) => {
      const name = q.data?.attributes?.friendly_name;
      return [q.data?.entity_id, typeof name === "string" ? name : undefined];
    }),
  );
  const labelOf = (entry: LightEntry) =>
    displayLightName(nameById.get(entry.entity_id) ?? entry.name);
  const sections = sortLightSections(
    buildLightSections(ids, entities?.rooms),
    labelOf,
  );
  // This device's favourites (0.153.0, the star in a light's drawer): a card
  // of their own across the top, over the rooms they're also in.
  const favorites = sortLightEntries(
    favoriteIds.filter((id) => ids.includes(id)).map(lightEntry),
    labelOf,
  );
  const onIds = states
    .filter((q) => q.data?.state === "on")
    .map((q) => q.data!.entity_id);
  // A group's lights that are on (0.154.0, the user: "If a light is on the
  // icon should be illuminated, and a turn off room button should be shown
  // in the header like all off button"): its header's icon lit and its own
  // All off, which spares what the page's spares.
  const onIn = (entries: LightEntry[]) =>
    entries.map((e) => e.entity_id).filter((id) => onIds.includes(id));
  const favoritesOn = onIn(favorites);

  // Skeleton tiles until every light's state is in. A light Home Assistant
  // doesn't know never gets one, so the server's acks end the wait too.
  const acked = useEntitiesAcked(ids);
  const loading =
    configPending || (ids.length > 0 && !acked && !states.every((q) => q.data));
  // A group whose entities are all unavailable renders no entries — drop the
  // whole tile rather than leaving an empty header on the page (not while the
  // skeleton stands in for them).
  const hideWhenEmpty = loading
    ? undefined
    : { "&:not(:has([data-light-entry]))": { display: "none" } };

  return (
    <PageShell>
      <PageHeader
        // Lit while a light is on, dim with none — the rooms' rule (0.157.0;
        // an outline in yellow always before).
        icon={onIds.length > 0 ? <MdLightbulb /> : <MdOutlineLightbulb />}
        iconColor={onIds.length > 0 ? LIT : undefined}
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
          {/* The scenes a tap runs (0.165.0), over everything else. */}
          <ScenesCard />
          {(favorites.length > 0 || !loading) && (
            // Across every column: the page's first card on any screen, its
            // tiles as many across as the Home card's. Mounted with none, and
            // hidden then as an empty room is, so the drawer that unstars the
            // last favourite isn't unmounted under the finger.
            <Box gridColumn="1 / -1" minW="0" css={hideWhenEmpty}>
              <Board
                collapsible
                storageKey="lights-favorites"
                title={
                  <SectionTitle
                    icon={<IoStar />}
                    iconColor={favoritesOn.length > 0 ? LIT : undefined}
                  >
                    Favorites
                  </SectionTitle>
                }
                action={
                  favoritesOn.length > 0 && (
                    <LightsAllOffButton
                      entityIds={favoritesOn}
                      label="Turn off Favorites"
                    />
                  )
                }
              >
                {loading ? (
                  <LightsSkeleton
                    count={favorites.length}
                    columns={LIGHT_TILE_COLUMNS_CARD}
                  />
                ) : (
                  <LightsSection
                    entries={favorites}
                    columns={LIGHT_TILE_COLUMNS_CARD}
                  />
                )}
              </Board>
            </Box>
          )}
          {sections.map((section) => {
            // The "Lights" group is what the page is — labelling its card
            // again would just repeat the page header. Only a group that is
            // the exception on this page (a room, the switches) carries a
            // title of its own.
            const named = section.title !== "Lights";
            const on = onIn(section.entries);
            return (
              <Box key={section.title} minW="0" css={hideWhenEmpty}>
                <Board
                  collapsible={named}
                  storageKey={`lights-${slugify(section.title)}`}
                  title={
                    named ? (
                      <SectionTitle
                        icon={groupIcon(section.title, on.length > 0)}
                        iconColor={on.length > 0 ? LIT : undefined}
                      >
                        {section.title}
                      </SectionTitle>
                    ) : undefined
                  }
                  // The untitled group's All off is the page header's.
                  action={
                    named && on.length > 0 ? (
                      <LightsAllOffButton
                        entityIds={on}
                        label={`Turn off ${section.title}`}
                      />
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
