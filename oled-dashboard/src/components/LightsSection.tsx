import { Grid } from "@chakra-ui/react";
import { LightControl } from "./LightControl";
import type { LightEntry } from "../lib/lightsConfig";

type Props = {
  entries: LightEntry[];
};

export function LightsSection({ entries }: Props) {
  return (
    <Grid
      gap="3"
      width="100%"
      templateColumns={{
        base: "repeat(4, minmax(0, 1fr))",
        _landscape: "repeat(6, minmax(0, 1fr))",
      }}
    >
      {entries.map((entry) => (
        <LightControl
          key={entry.entity_id}
          entity_id={entry.entity_id}
          name={entry.name}
          Icon={entry.Icon}
        />
      ))}
    </Grid>
  );
}
