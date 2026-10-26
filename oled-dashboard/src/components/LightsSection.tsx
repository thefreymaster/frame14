import { useState } from "react";
import { Grid } from "@chakra-ui/react";
import { LightControl } from "./LightControl";
import { LightDialog } from "./LightDialog";
import { LIGHT_TILE_COLUMNS, type LightEntry } from "../lib/lightsConfig";

type Props = {
  entries: LightEntry[];
};

export function LightsSection({ entries }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <>
      <Grid gap="3" width="100%" templateColumns={LIGHT_TILE_COLUMNS}>
        {entries.map((entry) => (
          <LightControl key={entry.entity_id} {...entry} onOpen={setOpenId} />
        ))}
      </Grid>
      <LightDialog entityId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
