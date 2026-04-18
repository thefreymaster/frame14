import { Box, Text } from "@chakra-ui/react";
import { LightsSection } from "../components/LightsSection";
import { buildLightSections } from "../lib/lightsConfig";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";

export function Lights() {
  const { data: entities } = useEntitiesConfig();
  const sections = buildLightSections(entities?.lights ?? []);

  return (
    <Box
      width="100%"
      minHeight="100vh"
      bg="var(--theme-bg)"
      display="flex"
      justifyContent="center"
    >
      <Box
        width="100%"
        px="min(8vmin, 40px)"
        py="min(12vmin, 56px)"
        display="flex"
        flexDirection="column"
        gap="min(10vmin, 48px)"
        css={{
          maxWidth: "560px",
          "@media (orientation: landscape)": {
            maxWidth: "960px",
          },
        }}
      >
        <Text
          fontSize="min(5vmin, 28px)"
          color="var(--theme-fg)"
          fontWeight="300"
          letterSpacing="0.02em"
        >
          Lights
        </Text>

        {sections.map((section) => (
          <LightsSection
            key={section.title}
            title={section.title}
            entries={section.entries}
          />
        ))}
      </Box>
    </Box>
  );
}
