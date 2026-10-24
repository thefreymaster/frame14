import {
  Badge,
  Flex,
  HStack,
  Progress,
  Spacer,
  Stack,
  Text,
} from "@chakra-ui/react";
import type { VacuumModel, VacuumPart } from "../hooks/useVacuum";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";

// Under a tenth of its life left: soon.
const SOON = 0.1;

function partState(part: VacuumPart): "due" | "soon" | "ok" {
  if (part.hoursLeft <= 0) return "due";
  return part.hoursLeft / part.lifeHours <= SOON ? "soon" : "ok";
}

const PALETTE = { due: "red", soon: "orange", ok: "green" } as const;

function fmtHours(h: number): string {
  const abs = Math.abs(h);
  return abs >= 1 ? `${Math.round(abs)}h` : `${Math.round(abs * 60)}m`;
}

/**
 * The vacuum's wear parts (brushes, filter, sensors): hours of use left on
 * each against Roborock's interval, as a bar that goes orange in the last
 * tenth and red, full, once the part is overdue. The header sums it up.
 */
export function VacuumCareCard({ vacuum }: { vacuum: VacuumModel }) {
  if (vacuum.parts.length === 0) return null;
  const states = vacuum.parts.map(partState);
  const due = states.filter((s) => s === "due").length;
  const soon = states.filter((s) => s === "soon").length;
  const summary = due
    ? { text: `${due} due`, palette: "red" }
    : soon
      ? { text: `${soon} soon`, palette: "orange" }
      : { text: "All good", palette: "green" };

  return (
    <Board
      title={
        <Flex align="center" gap="3" width="100%">
          <SectionTitle>Maintenance</SectionTitle>
          <Spacer />
          <Badge colorPalette={summary.palette}>{summary.text}</Badge>
        </Flex>
      }
    >
      <Stack gap="4">
        {vacuum.parts.map((part, i) => {
          const state = states[i];
          const left = Math.max(
            0,
            Math.min(1, part.hoursLeft / part.lifeHours),
          );
          return (
            <Progress.Root
              key={part.key}
              value={state === "due" ? 100 : left * 100}
              colorPalette={PALETTE[state]}
              size="sm"
            >
              <HStack justify="space-between" gap="3">
                <Progress.Label fontWeight="medium">
                  {part.label}
                </Progress.Label>
                <Text
                  textStyle="sm"
                  color={state === "due" ? "fg.error" : "fg.muted"}
                >
                  {state === "due"
                    ? `${fmtHours(part.hoursLeft)} overdue`
                    : `${fmtHours(part.hoursLeft)} left`}
                </Text>
              </HStack>
              <Progress.Track mt="2">
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
          );
        })}
        {due > 0 && (
          <Text textStyle="sm" color="fg.muted">
            Clean or replace, then reset it in the Roborock app.
          </Text>
        )}
      </Stack>
    </Board>
  );
}
