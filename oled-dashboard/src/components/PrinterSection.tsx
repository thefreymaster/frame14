import { useState } from "react";
import {
  Box,
  Grid,
  HStack,
  Progress,
  Stat,
  Text,
  VStack,
} from "@chakra-ui/react";
import { IoPrintOutline } from "react-icons/io5";
import NumberFlow from "@number-flow/react";
import type { HomePrinter } from "../hooks/useHomeData";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { Board } from "./Board";
import { PanelDialog } from "./PanelDialog";

function fmtMins(minutes: number) {
  if (!isFinite(minutes) || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtTime(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = d.getHours() < 12 ? "am" : "pm";
  return `${h}:${m}${ampm}`;
}

function fmtNum(n: number | null, digits = 0): string {
  if (n == null || isNaN(n)) return "—";
  return n.toFixed(digits);
}

function titleCase(s: string): string {
  return s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PrinterSection({ printer }: { printer: HomePrinter }) {
  const [open, setOpen] = useState(false);
  const isActive =
    printer.status === "running" ||
    printer.status === "printing" ||
    printer.status === "pause";

  if (!isActive) return null;

  const cardProgress = Math.max(0, Math.min(100, printer.progress || 0));

  return (
    <>
      <PrinterModal
        printer={printer}
        open={open}
        onClose={() => setOpen(false)}
      />
      <Board
        collapsible
        storageKey="printer"
        title={
          <HStack width="100%" align="center" gap="1.5vmin">
            <SectionTitle icon={<IoPrintOutline />}>3D PRINTER</SectionTitle>
            <Box flex="1" minW="0" />
            <Text textStyle="meta" color="green.500">
              <NumberFlow value={printer.progress} />%
            </Text>
            <Text textStyle="meta" color="fg.dim">
              {fmtMins(printer.remainingTime)}
            </Text>
          </HStack>
        }
      >
        <Box
          role="button"
          aria-label="Show printer detail"
          onClick={() => setOpen(true)}
          cursor="pointer"
          width="100%"
        >
          <HStack width="100%" justify="space-between" align="baseline">
            <Text
              fontSize="3.8vmin"
              color="fg.dim"
              fontWeight="300"
              truncate
              maxW="45vmin"
            >
              {printer.taskName ?? "—"}
            </Text>
            <HStack align="baseline" gap="4vmin">
              <Text
                textStyle="numeral"
                fontSize="5.5vmin"
                letterSpacing="normal"
                color="green.500"
              >
                <NumberFlow value={printer.progress} />%
              </Text>
              <Text fontSize="4vmin" color="fg.dim" fontWeight="300">
                {fmtMins(printer.remainingTime)}
              </Text>
            </HStack>
          </HStack>
          <Progress.Root
            value={cardProgress}
            variant="soft"
            size="hair"
            shape="full"
            colorPalette="green"
            mt="1.5vmin"
            aria-label="Print progress"
          >
            <Progress.Track>
              <Progress.Range transition="width 600ms ease" />
            </Progress.Track>
          </Progress.Root>
        </Box>
      </Board>
    </>
  );
}

function PrinterModal({
  printer,
  open,
  onClose,
}: {
  printer: HomePrinter;
  open: boolean;
  onClose: () => void;
}) {
  const etaLabel = fmtTime(printer.endTime);
  const startLabel = fmtTime(printer.startTime);
  const layerPct =
    printer.totalLayers &&
    printer.totalLayers > 0 &&
    printer.currentLayer != null
      ? Math.round((printer.currentLayer / printer.totalLayers) * 100)
      : null;
  const progress = Math.max(0, Math.min(100, printer.progress || 0));
  const stageLabel = printer.currentStage
    ? titleCase(printer.currentStage)
    : titleCase(printer.status);

  return (
    <PanelDialog
      open={open}
      onClose={onClose}
      label="printer details"
      glow="rgba(34, 197, 94, 0.08)"
    >
      <VStack gap="1vmin" align="stretch" pe="6vmin">
        <Text textStyle="eyebrow" color="fg.faint">
          3D PRINTER · {stageLabel.toUpperCase()}
        </Text>
        <Text
          fontSize="5vmin"
          fontWeight="300"
          letterSpacing="-0.02em"
          lineHeight="1.1"
        >
          {printer.taskName ?? "—"}
        </Text>
        {printer.gcodeFilename && (
          <Text fontSize="2.2vmin" color="fg.faint" truncate>
            {printer.gcodeFilename}
          </Text>
        )}
      </VStack>

      <Progress.Root
        value={progress}
        variant="soft"
        size="bar"
        shape="full"
        colorPalette="green"
      >
        <VStack gap="1.5vmin" align="stretch">
          <HStack justify="space-between" align="baseline">
            <Text textStyle="numeral" fontSize="11vmin" color="green.400">
              <NumberFlow value={progress} />%
            </Text>
            <VStack align="flex-end" gap="0.2vmin">
              <Text fontSize="4.5vmin" fontWeight="300" lineHeight="1">
                {fmtMins(printer.remainingTime)}
              </Text>
              <Progress.Label
                fontSize="2vmin"
                fontWeight="400"
                letterSpacing="0.12em"
                color="fg.faint"
              >
                REMAINING
              </Progress.Label>
            </VStack>
          </HStack>
          <Progress.Track>
            <Progress.Range transition="width 600ms ease" />
          </Progress.Track>
          <HStack justify="space-between">
            {startLabel && (
              <Text fontSize="2.2vmin" color="fg.faint" letterSpacing="0.04em">
                Started {startLabel}
              </Text>
            )}
            {etaLabel && (
              <Text
                fontSize="2.2vmin"
                color="fg.faint"
                letterSpacing="0.04em"
                ml="auto"
              >
                ETA {etaLabel}
              </Text>
            )}
          </HStack>
        </VStack>
      </Progress.Root>

      <Box borderTopWidth="1px" borderColor="divider" pt="3vmin">
        <Grid templateColumns="1fr 1fr" gap="2.5vmin">
          <StatTile
            label="LAYER"
            value={
              printer.currentLayer != null && printer.totalLayers != null
                ? `${printer.currentLayer} / ${printer.totalLayers}${
                    layerPct != null ? ` · ${layerPct}%` : ""
                  }`
                : "—"
            }
          />
          <StatTile
            label="SPEED"
            value={printer.speedProfile ? titleCase(printer.speedProfile) : "—"}
          />
          <StatTile
            label="NOZZLE"
            value={`${fmtNum(printer.nozzleTemp)}° / ${fmtNum(printer.nozzleTarget)}°`}
          />
          <StatTile
            label="BED"
            value={`${fmtNum(printer.bedTemp)}° / ${fmtNum(printer.bedTarget)}°`}
          />
          <StatTile label="FILAMENT" value={printer.activeTray ?? "—"} />
          <StatTile
            label="WEIGHT"
            value={
              printer.printWeight != null
                ? `${fmtNum(printer.printWeight, 1)} g`
                : "—"
            }
          />
          <StatTile
            label="LENGTH"
            value={
              printer.printLength != null
                ? `${fmtNum(printer.printLength, 1)} m`
                : "—"
            }
          />
          <StatTile label="STAGE" value={stageLabel} />
        </Grid>
      </Box>
    </PanelDialog>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Stat.Root size="panel">
      <Stat.Label>{label}</Stat.Label>
      <Stat.ValueText>{value}</Stat.ValueText>
    </Stat.Root>
  );
}
