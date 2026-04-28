import { Box, HStack, Text } from "@chakra-ui/react";
import { MdOutlineLightbulb } from "react-icons/md";
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
      flexDirection="column"
      px="6vmin"
      pt="5vmin"
      pb="3vmin"
    >
      <HStack justify="space-between" align="center" mb="4vmin">
        <HStack gap="2vmin" align="center">
          <Box color="yellow.500" fontSize="5vmin" lineHeight="1">
            <MdOutlineLightbulb />
          </Box>
          <Text
            fontSize="3vmin"
            fontWeight="500"
            letterSpacing="0.14em"
            color="var(--theme-fg-dim)"
          >
            LIGHTS
          </Text>
        </HStack>
      </HStack>

      <Box display="flex" flexDirection="column" gap="min(8vmin, 40px)">
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
