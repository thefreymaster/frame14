import { Box, Text } from "@chakra-ui/react";
import { LightControl } from "./LightControl";
import type { LightEntry } from "../lib/lightsConfig";

type Props = {
  title: string;
  entries: LightEntry[];
};

export function LightsSection({ title, entries }: Props) {
  return (
    <Box width="100%">
      <Text
        fontSize="min(2.8vmin, 12px)"
        color="var(--theme-fg-faint)"
        letterSpacing="0.14em"
        textTransform="uppercase"
        mb="min(3vmin, 14px)"
      >
        {title}
      </Text>
      <Box
        display="grid"
        gap="min(2.2vmin, 10px)"
        width="100%"
        css={{
          gridTemplateColumns: "repeat(3, 1fr)",
          "@media (orientation: landscape)": {
            gridTemplateColumns: "repeat(6, 1fr)",
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
    </Box>
  );
}
