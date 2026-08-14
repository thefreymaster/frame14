import { Box } from "@chakra-ui/react";
import { LightControl } from "./LightControl";
import { CHIP_GAP } from "../lib/surfaces";
import type { LightEntry } from "../lib/lightsConfig";

type Props = {
  entries: LightEntry[];
};

export function LightsSection({ entries }: Props) {
  return (
    <Box
      display="grid"
      gap={CHIP_GAP}
      width="100%"
      css={{
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        "@media (orientation: landscape)": {
          gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
        },
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
    </Box>
  );
}
