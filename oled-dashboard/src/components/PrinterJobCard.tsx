import {
  Box,
  HStack,
  Progress,
  SimpleGrid,
  Stack,
  Stat,
  Text,
} from "@chakra-ui/react";
import NumberFlow from "@number-flow/react";
import type { PrinterModel } from "../hooks/usePrinter";
import { fmtClock, fmtDuration } from "../lib/format";
import { isPrintActive, printerStatus } from "../lib/printerStatus";
import { Board } from "./Board";
import { PrinterControls } from "./PrinterControls";
import { SectionTitle } from "./SectionTitle/SectionTitle";

/**
 * The print job: the model's thumbnail and name, the progress as a big figure
 * over a bar in the status's colour, then layer, time left and the finish
 * time, and the job's buttons while it runs. The header takes an `action`:
 * the chamber light's switch, when there's no camera card to hold it.
 * A finished or failed job stays up until the next one starts.
 */
export function PrinterJobCard({
  printer,
  action,
}: {
  printer: PrinterModel;
  action?: React.ReactNode;
}) {
  const { palette } = printerStatus(printer.status);
  const active = isPrintActive(printer.status);
  const progress = Math.max(0, Math.min(100, printer.progress ?? 0));
  const remaining = active ? printer.remainingMinutes : null;
  // Paused, the time left stands still and the finish time is anyone's guess.
  const finishes =
    active && printer.status !== "pause" && printer.finishesAt
      ? fmtClock(printer.finishesAt)
      : "—";
  const layers =
    printer.currentLayer != null && printer.totalLayers != null
      ? `${printer.currentLayer} / ${printer.totalLayers}`
      : "—";

  return (
    <Board title={<SectionTitle>Print job</SectionTitle>} action={action}>
      <Stack gap="6">
        <HStack gap="4">
          {printer.coverVersion && (
            <Box
              flexShrink={0}
              boxSize={{ base: "16", md: "20" }}
              rounded="sm"
              bg="bg.muted"
              overflow="hidden"
            >
              <img
                src={`/api/printer/cover?v=${encodeURIComponent(printer.coverVersion)}`}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </Box>
          )}
          <Text textStyle="lg" fontWeight="semibold" truncate minW="0" flex="1">
            {printer.taskName ?? "No job loaded"}
          </Text>
        </HStack>

        <Progress.Root value={progress} colorPalette={palette} size="lg">
          <HStack justify="space-between" align="baseline" gap="4">
            <Text textStyle="5xl" fontWeight="semibold" lineHeight="1">
              <NumberFlow value={Math.round(progress)} />%
            </Text>
            {remaining != null && remaining > 0 && (
              <Text textStyle="lg" color="fg.muted">
                {fmtDuration(remaining)} left
              </Text>
            )}
          </HStack>
          <Progress.Track mt="4">
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>

        <SimpleGrid columns={3} gap="4">
          <Stat.Root size="sm">
            <Stat.Label>Layer</Stat.Label>
            <Stat.ValueText>{layers}</Stat.ValueText>
          </Stat.Root>
          <Stat.Root size="sm">
            <Stat.Label>Remaining</Stat.Label>
            <Stat.ValueText>{fmtDuration(remaining)}</Stat.ValueText>
          </Stat.Root>
          <Stat.Root size="sm">
            <Stat.Label>Finishes</Stat.Label>
            <Stat.ValueText>{finishes}</Stat.ValueText>
          </Stat.Root>
        </SimpleGrid>

        {active && (
          <PrinterControls
            status={printer.status}
            pause={printer.pause}
            resume={printer.resume}
            stop={printer.stop}
          />
        )}
      </Stack>
    </Board>
  );
}
