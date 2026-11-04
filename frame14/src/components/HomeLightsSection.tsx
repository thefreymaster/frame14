import { useState } from "react";
import { Flex, Grid, Text } from "@chakra-ui/react";
import { MdOutlineLightbulb } from "react-icons/md";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { useEntities } from "../hooks/useEntity";
import { useLightFavorites } from "../lib/lightFavorites";
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

const isAvailable = (state: string | undefined) =>
  state != null && state !== "unavailable" && state !== "unknown";

/**
 * /home's Lights card: this device's favourite lights (0.153.0, the user's
 * ask: "Those favorites should be what is displayed in the lights card
 * instead of on lights" — the star in a light's drawer, lib/lightFavorites),
 * on or off; and on a device with none starred, every configured light and
 * switch that is on right now (0.143, "a currently on lights card"). Either
 * way as the Lights page's tiles (LightControl: a tap turns it off or on, a
 * swipe across a dimmable one sets its brightness, a hold opens its drawer),
 * alphabetical by the name each shows, with the count of those on beside the
 * title and the page's All off for them as the header's action. With nothing
 * to show — no light on, or every favourite unavailable — it renders nothing
 * and the board leaves it off the page: without favourites a light turned
 * off leaves the card once Home Assistant reports it, and the last one takes
 * the card with it.
 *
 * The one tile kept is the light whose drawer is open: it stays while the
 * drawer is up, off, unstarred or not, so the drawer isn't pulled out from
 * under the finger that turned the light off with its switch (it was the
 * last light on, say, and the card would unmount it mid-animation). The
 * drawer closed, the tile goes as any other.
 *
 * The tiles are the Lights page's own, so a hold on one is the tile's (its
 * drawer), not the board's: the tile marks it `data-long-press` and
 * HomeBoard's hold leaves it alone. The card's header, and any other card,
 * still starts arranging.
 */
export function HomeLightsSection() {
  const { data: entities } = useEntitiesConfig();
  const ids = entities?.lights ?? EMPTY;
  const states = useEntities<LightAttrs>(ids);
  const favorites = useLightFavorites();
  const [openId, setOpenId] = useState<string | null>(null);

  const stateById = new Map(
    states.map((q) => [q.data?.entity_id, q.data] as const),
  );
  // The favourites the config still has; none, and the card is the lights
  // that are on.
  const starred = favorites.filter((id) => ids.includes(id));
  const onIds = (starred.length > 0 ? starred : ids).filter(
    (id) => stateById.get(id)?.state === "on",
  );
  const baseIds =
    starred.length > 0
      ? starred.filter((id) => isAvailable(stateById.get(id)?.state))
      : onIds;
  const shownIds =
    openId !== null && !baseIds.includes(openId) ? [...baseIds, openId] : baseIds;
  if (shownIds.length === 0) return null;

  // Alphabetical by the name each tile shows, as the page: Home Assistant's
  // friendly name (the word Lights dropped), the id's words until it's in.
  const entries = sortLightEntries(shownIds.map(lightEntry), (entry) =>
    displayLightName(
      stateById.get(entry.entity_id)?.attributes?.friendly_name ?? entry.name,
    ),
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
      // nothing when only spared lights are on), for the card's lights.
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
