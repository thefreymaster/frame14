import { useState } from "react";
import {
  Badge,
  Box,
  HStack,
  Progress,
  SimpleGrid,
  Stat,
  Text,
} from "@chakra-ui/react";
import { Printer3dOutlineIcon } from "../lib/printerIcons";
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
          <HStack width="100%" gap="3">
            <SectionTitle icon={<Printer3dOutlineIcon />}>
              3D printer
            </SectionTitle>
            <Box flex="1" minW="0" />
            <Badge colorPalette="green">
              <NumberFlow value={printer.progress} />%
            </Badge>
            <Text textStyle="sm" color="fg.muted">
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
        >
          <Progress.Root value={cardProgress} colorPalette="green" size="lg">
            <HStack justify="space-between" align="baseline" gap="4">
              <Progress.Label textStyle="lg" fontWeight="normal" truncate>
                {printer.taskName ?? "—"}
              </Progress.Label>
              <Text textStyle="3xl" fontWeight="semibold">
                <NumberFlow value={printer.progress} />%
              </Text>
            </HStack>
            <Progress.Track mt="3">
              <Progress.Range />
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
      title={printer.taskName ?? "3D printer"}
    >
      <Box>
        <Badge colorPalette="green">{stageLabel}</Badge>
        {printer.gcodeFilename && (
          <Text textStyle="sm" color="fg.muted" mt="2" truncate>
            {printer.gcodeFilename}
          </Text>
        )}
      </Box>

      <Progress.Root value={progress} colorPalette="green" size="lg">
        <HStack justify="space-between" align="end">
          <Stat.Root>
            <Stat.Label>Progress</Stat.Label>
            <Stat.ValueText>
              <NumberFlow value={progress} />%
            </Stat.ValueText>
          </Stat.Root>
          <Stat.Root alignItems="end">
            <Stat.Label>Remaining</Stat.Label>
            <Stat.ValueText>{fmtMins(printer.remainingTime)}</Stat.ValueText>
          </Stat.Root>
        </HStack>
        <Progress.Track mt="3">
          <Progress.Range />
        </Progress.Track>
        <HStack justify="space-between" mt="2" textStyle="sm" color="fg.muted">
          {startLabel && <Text>Started {startLabel}</Text>}
          {etaLabel && <Text ms="auto">ETA {etaLabel}</Text>}
        </HStack>
      </Progress.Root>

      <Box borderTopWidth="1px" pt="6">
        <SimpleGrid columns={2} gap="6">
          <StatTile
            label="Layer"
            value={
              printer.currentLayer != null && printer.totalLayers != null
                ? `${printer.currentLayer} / ${printer.totalLayers}${
                    layerPct != null ? ` · ${layerPct}%` : ""
                  }`
                : "—"
            }
          />
          <StatTile
            label="Speed"
            value={printer.speedProfile ? titleCase(printer.speedProfile) : "—"}
          />
          <StatTile
            label="Nozzle"
            value={`${fmtNum(printer.nozzleTemp)}° / ${fmtNum(printer.nozzleTarget)}°`}
          />
          <StatTile
            label="Bed"
            value={`${fmtNum(printer.bedTemp)}° / ${fmtNum(printer.bedTarget)}°`}
          />
          <StatTile label="Filament" value={printer.activeTray ?? "—"} />
          <StatTile
            label="Weight"
            value={
              printer.printWeight != null
                ? `${fmtNum(printer.printWeight, 1)} g`
                : "—"
            }
          />
          <StatTile
            label="Length"
            value={
              printer.printLength != null
                ? `${fmtNum(printer.printLength, 1)} m`
                : "—"
            }
          />
          <StatTile label="Stage" value={stageLabel} />
        </SimpleGrid>
      </Box>
    </PanelDialog>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Stat.Root size="sm">
      <Stat.Label>{label}</Stat.Label>
      <Stat.ValueText>{value}</Stat.ValueText>
    </Stat.Root>
  );
}
