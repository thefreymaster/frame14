import { Badge, HStack, Progress, Stack, Stat } from "@chakra-ui/react";
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
    <Board
      collapsible
      storageKey="vacuum"
      title={<SectionTitle icon={<TbVacuumCleaner />}>Vacuum</SectionTitle>}
    >
      <Stack gap="6">
        {active.map((v) => {
          const progress = Math.max(0, Math.min(100, v.progress ?? 0));
          return (
            <Progress.Root
              key={v.entity_id}
              value={progress}
              colorPalette="green"
              size="lg"
            >
              <HStack justify="space-between" align="end">
                <Stat.Root>
                  <Stat.Label>{v.name}</Stat.Label>
                  <Stat.ValueText>
                    <NumberFlow value={progress} />%
                  </Stat.ValueText>
                </Stat.Root>
                <Badge colorPalette="green">
                  {STATE_LABEL[v.state] ?? v.state}
                </Badge>
              </HStack>
              <Progress.Track mt="3">
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
          );
        })}
      </Stack>
    </Board>
  );
}
