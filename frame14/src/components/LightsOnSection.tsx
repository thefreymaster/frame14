import { useState } from "react";
import { Flex, Grid, Text } from "@chakra-ui/react";
import { MdOutlineLightbulb } from "react-icons/md";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { useEntities } from "../hooks/useEntity";
import type { LightAttrs } from "../lib/lightModel";
import {
  displayLightName,
  LIGHT_TILE_COLUMNS_CARD,
  lightEntry,
  sortLightEntries,
} from "../lib/lightsConfig";
import { Board } from "./Board";
import { LightControl } from "./LightControl";
import { LightDialog } from "./LightDialog";
import { LightsAllOffButton } from "./LightsAllOffButton";
import { SectionTitle } from "./SectionTitle/SectionTitle";

// A stable empty list while the config loads: useEntities re-subscribes when
// the array changes identity.
const EMPTY: string[] = [];

/**
 * /home's Lights card (0.143, the user's ask: "a currently on lights card"):
 * every configured light and switch that is on right now, as the Lights
 * page's tiles (LightControl: a tap turns it off, a swipe across a dimmable
 * one sets its brightness, a hold opens its drawer), alphabetical by the
 * name each shows, with the count beside the title and the page's All off as
 * the header's action. An active-only card, like the printer's and the
 * vacuum's: with no light on it renders nothing and the board leaves it off
 * the page — a light turned off leaves the card once Home Assistant reports
 * it, and the last one takes the card with it.
 *
 * The one tile kept is the light whose drawer is open: it stays while the
 * drawer is up, off or not, so the drawer isn't pulled out from under the
 * finger that turned the light off with its switch (it was the last light
 * on, say, and the card would unmount it mid-animation). The drawer closed,
 * the tile goes as any other.
 *
 * The tiles are the Lights page's own, so a hold on a dimmable one is the
 * tile's (its drawer), not the board's: the tile marks it `data-long-press`
 * and HomeBoard's hold leaves it alone. The card's header, and any other
 * card, still starts arranging.
 */
export function LightsOnSection() {
  const { data: entities } = useEntitiesConfig();
  const ids = entities?.lights ?? EMPTY;
  const states = useEntities<LightAttrs>(ids);
  const [openId, setOpenId] = useState<string | null>(null);

  const onIds = states
    .filter((q) => q.data?.state === "on")
    .map((q) => q.data!.entity_id);
  const shownIds =
    openId !== null && !onIds.includes(openId) ? [...onIds, openId] : onIds;
  if (shownIds.length === 0) return null;

  // Alphabetical by the name each tile shows, as the page: Home Assistant's
  // friendly name (the word Lights dropped), the id's words until it's in.
  const nameById = new Map(
    states.map((q) => [q.data?.entity_id, q.data?.attributes?.friendly_name]),
  );
  const entries = sortLightEntries(shownIds.map(lightEntry), (entry) =>
    displayLightName(nameById.get(entry.entity_id) ?? entry.name),
  );

  return (
    <Board
      collapsible
      storageKey="lights"
      title={
        // The count wraps under the title when the card is too narrow for
        // both, like the Climate card's range.
        <Flex align="center" gap="3" rowGap="1" wrap="wrap" width="100%">
          <SectionTitle icon={<MdOutlineLightbulb />}>Lights</SectionTitle>
          {onIds.length > 0 && (
            <Text textStyle="sm" color="fg.muted" ms="auto">
              {onIds.length} on
            </Text>
          )}
        </Flex>
      }
      // The page's All off (it spares the kid's hatch light, and renders
      // nothing when only spared lights are on).
      action={onIds.length > 0 ? <LightsAllOffButton entityIds={onIds} /> : null}
    >
      <Grid gap="3" width="100%" templateColumns={LIGHT_TILE_COLUMNS_CARD}>
        {entries.map((entry) => (
          <LightControl key={entry.entity_id} {...entry} onOpen={setOpenId} />
        ))}
      </Grid>
      <LightDialog entityId={openId} onClose={() => setOpenId(null)} />
    </Board>
  );
}
