import { useState } from "react";
import { Grid } from "@chakra-ui/react";
import { LightControl } from "./LightControl";
import { LightDialog } from "./LightDialog";
import type { LightEntry } from "../lib/lightsConfig";

type Props = {
  entries: LightEntry[];
};

export function LightsSection({ entries }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <>
      <Grid
        gap="3"
        width="100%"
        // Wide tiles: two across on a phone, three on the frame and tablets,
        // four in landscape.
        templateColumns={{
          base: "repeat(2, minmax(0, 1fr))",
          md: "repeat(3, minmax(0, 1fr))",
          _landscape: "repeat(4, minmax(0, 1fr))",
        }}
      >
        {entries.map((entry) => (
          <LightControl key={entry.entity_id} {...entry} onOpen={setOpenId} />
        ))}
      </Grid>
      <LightDialog entityId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
