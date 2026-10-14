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
      // Three across on a phone, where four cut the names to a few letters;
      // four on the frame and tablets, six in landscape.
      templateColumns={{
        base: "repeat(3, minmax(0, 1fr))",
        sm: "repeat(4, minmax(0, 1fr))",
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
