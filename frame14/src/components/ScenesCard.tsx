import { Box, Grid } from "@chakra-ui/react";
import { MdOutlinePalette } from "react-icons/md";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { useEntities, useEntitiesAcked } from "../hooks/useEntity";
import { LIGHT_TILE_COLUMNS_CARD } from "../lib/lightsConfig";
import { sceneAvailable, type SceneAttrs } from "../lib/scenes";
import { Board } from "./Board";
import { SceneTile } from "./SceneTile";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { ScenesSkeleton } from "./skeletons/ScenesSkeleton";

// A stable empty list while the config loads: useEntities re-subscribes when
// the array changes identity.
const EMPTY: string[] = [];

/**
 * The Lights page's first card (0.165.0, the user's ask: the dashboard
 * button that runs their movie-mode automation, "on the Lights page only"):
 * the scenes, scripts and automations `scene_entities` names, in that order,
 * each a tile a tap runs (SceneTile), as many across as the Favorites card's.
 * It spans the page's columns as Favorites does. Skeleton tiles until the
 * states are in (or the server has answered for one Home Assistant doesn't
 * have); with none configured, or none Home Assistant has, there is no card.
 */
export function ScenesCard() {
  const { data: config } = useEntitiesConfig();
  const ids = config?.scenes ?? EMPTY;
  const states = useEntities<SceneAttrs>(ids);
  const acked = useEntitiesAcked(ids);
  if (ids.length === 0) return null;

  const loading = !acked && !states.every((q) => q.data);
  const any = states.some((q) => sceneAvailable(q.data?.state));
  if (!loading && !any) return null;

  return (
    <Box gridColumn="1 / -1" minW="0">
      <Board
        collapsible
        storageKey="lights-scenes"
        // A palette, Home Assistant's own icon for scenes (0.165.1; sparkles
        // before, which read as an AI badge).
        title={<SectionTitle icon={<MdOutlinePalette />}>Scenes</SectionTitle>}
      >
        {loading ? (
          <ScenesSkeleton count={ids.length} />
        ) : (
          <Grid gap="3" width="100%" templateColumns={LIGHT_TILE_COLUMNS_CARD}>
            {ids.map((id) => (
              <SceneTile key={id} entityId={id} />
            ))}
          </Grid>
        )}
      </Board>
    </Box>
  );
}
