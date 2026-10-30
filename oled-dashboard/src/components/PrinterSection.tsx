import { Badge, Box, HStack, Progress, Stack, Text } from "@chakra-ui/react";
import NumberFlow from "@number-flow/react";
import { useNavigate } from "react-router";
import { usePrinter } from "../hooks/usePrinter";
import { fmtClock, fmtDuration } from "../lib/format";
import { Printer3dOutlineIcon } from "../lib/printerIcons";
import { printerStatus } from "../lib/printerStatus";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";

// The card is up while a job prints or sits paused — the states the header's
// printer icon shows for too (ApplianceIndicators) — and gone otherwise.
const SHOWN = new Set(["running", "printing", "pause"]);

/**
 * The 3D printer's Home card: the /printer page's job card in brief (0.127).
 * The header carries the status ("Printing" green, "Paused" orange, from
 * printerStatus) and the time left, so the card still says how the print is
 * going when it's collapsed. The body has the model's picture and name over
 * the layer and the finish time, the progress as one big figure beside them,
 * and the bar in the status's colour. A tap on the body opens the Printer
 * page, as the weather card opens /weather (0.97): the dialog it used to open
 * listed ha-bambulab's extra sensors and showed dashes for the Bambuddy
 * printer's.
 */
export function PrinterSection() {
  const printer = usePrinter();
  const navigate = useNavigate();
  if (!SHOWN.has(printer.status)) return null;

  const { label, palette } = printerStatus(printer.status);
  const paused = printer.status === "pause";
  const progress = Math.max(0, Math.min(100, printer.progress ?? 0));
  const remaining = printer.remainingMinutes;
  // Paused, the time left stands still and the finish time is anyone's guess.
  const finishes =
    !paused && printer.finishesAt ? fmtClock(printer.finishesAt) : null;
  const layer =
    printer.currentLayer != null && printer.totalLayers != null
      ? `Layer ${printer.currentLayer} of ${printer.totalLayers}`
      : null;
  const detail = [layer, finishes && `finishes ${finishes}`]
    .filter(Boolean)
    .join(" · ");
  const open = () => void navigate("/printer");

  return (
    <Board
      collapsible
      storageKey="printer"
      title={
        <HStack width="100%" gap="3">
          <SectionTitle icon={<Printer3dOutlineIcon />}>3D printer</SectionTitle>
          <Box flex="1" minW="0" />
          <Badge colorPalette={palette}>{label}</Badge>
          {remaining != null && remaining > 0 && (
            <Text textStyle="sm" color="fg.muted" whiteSpace="nowrap">
              {fmtDuration(remaining)} left
            </Text>
          )}
        </HStack>
      }
    >
      <Box
        role="button"
        tabIndex={0}
        aria-label="Open the printer page"
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        }}
        cursor="pointer"
        rounded="sm"
        _focusVisible={{
          outline: "2px solid",
          outlineColor: "colorPalette.focusRing",
          outlineOffset: "2px",
        }}
      >
        <Stack gap="3">
          <HStack gap="4" align="center">
            {printer.coverVersion && (
              <Box
                flexShrink={0}
                boxSize={{ base: "14", md: "16" }}
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
            <Box minW="0" flex="1">
              <Text textStyle="lg" fontWeight="semibold" truncate>
                {printer.taskName ?? "No job loaded"}
              </Text>
              {/* Wraps on a phone's narrow card rather than cutting the
                  finish time short. */}
              {detail && (
                <Text textStyle="sm" color="fg.muted">
                  {detail}
                </Text>
              )}
            </Box>
            <Text
              textStyle="4xl"
              fontWeight="semibold"
              lineHeight="1"
              flexShrink={0}
            >
              <NumberFlow value={Math.round(progress)} />%
            </Text>
          </HStack>
          <Progress.Root value={progress} colorPalette={palette} size="lg">
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        </Stack>
      </Box>
    </Board>
  );
}
