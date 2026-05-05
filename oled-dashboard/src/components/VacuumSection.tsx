import { Box, Text, HStack, VStack } from "@chakra-ui/react";
import { TbVacuumCleaner } from "react-icons/tb";
import NumberFlow from "@number-flow/react";
import type { HomeVacuum } from "../hooks/useHomeData";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { Board } from "./Board";

const ACTIVE_STATES = new Set(["cleaning", "returning"]);

const STATE_LABEL: Record<string, string> = {
  cleaning: "Cleaning",
  returning: "Returning",
};

export function VacuumSection({ vacuum }: { vacuum: HomeVacuum[] }) {
  const active = vacuum.filter((v) => ACTIVE_STATES.has(v.state));
  if (active.length === 0) return null;

  return (
    <Board>
      <SectionTitle icon={<TbVacuumCleaner />}>VACUUM</SectionTitle>
      <VStack gap="2vmin" align="stretch" width="100%">
        {active.map((v) => {
          const progress = Math.max(0, Math.min(100, v.progress ?? 0));
          return (
            <Box key={v.entity_id} width="100%">
              <HStack width="100%" justify="space-between" align="baseline">
                <VStack align="flex-start" gap="0.2vmin" flex="1" minW="0">
                  <Text
                    fontSize="3.8vmin"
                    color="var(--theme-fg-dim)"
                    fontWeight="300"
                    overflow="hidden"
                    whiteSpace="nowrap"
                    textOverflow="ellipsis"
                    maxW="45vmin"
                  >
                    {v.name}
                  </Text>
                  <Text
                    fontSize="2.2vmin"
                    color="var(--theme-fg-faint)"
                    letterSpacing="0.08em"
                  >
                    {STATE_LABEL[v.state] ?? v.state}
                  </Text>
                </VStack>
                <Text
                  fontSize="5.5vmin"
                  color="green.500"
                  fontWeight="300"
                  lineHeight="1"
                >
                  <NumberFlow value={progress} />%
                </Text>
              </HStack>
            </Box>
          );
        })}
      </VStack>
    </Board>
  );
}
