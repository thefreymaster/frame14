import { useState } from "react";
import { Grid } from "@chakra-ui/react";
import { LightControl } from "./LightControl";
import { LightDialog } from "./LightDialog";
import { LIGHT_TILE_COLUMNS, type LightEntry } from "../lib/lightsConfig";

type Props = {
  entries: LightEntry[];
  /** The tiles' grid columns; the viewport's LIGHT_TILE_COLUMNS unless the page says. */
  columns?: typeof LIGHT_TILE_COLUMNS | string;
};

export function LightsSection({ entries, columns = LIGHT_TILE_COLUMNS }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <>
      <Grid gap="3" width="100%" templateColumns={columns}>
        {entries.map((entry) => (
          <LightControl key={entry.entity_id} {...entry} onOpen={setOpenId} />
        ))}
      </Grid>
      <LightDialog entityId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
