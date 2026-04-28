import { useEffect, useRef, useState } from "react";
import { Box, Text, HStack, VStack, Grid } from "@chakra-ui/react";
import { IoClose } from "react-icons/io5";
import NumberFlow from "@number-flow/react";
import type { HomePrinter } from "../hooks/useHomeData";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { Board } from "./Board";

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
  const [showModal, setShowModal] = useState(false);
  const isActive =
    printer.status === "running" ||
    printer.status === "printing" ||
    printer.status === "pause";

  if (!isActive) return null;

  return (
    <>
      {showModal && (
        <PrinterModal printer={printer} onClose={() => setShowModal(false)} />
      )}
      <Board onClick={() => setShowModal(true)}>
        <SectionTitle>3D PRINTER</SectionTitle>
        <HStack width="100%" justify="space-between" align="baseline">
          <Text
            fontSize="3.8vmin"
            color="var(--theme-fg-dim)"
            fontWeight="300"
            overflow="hidden"
            whiteSpace="nowrap"
            textOverflow="ellipsis"
            maxW="45vmin"
          >
            {printer.taskName ?? "—"}
          </Text>
          <HStack align="baseline" gap="4vmin">
            <Text
              fontSize="5.5vmin"
              color="green.500"
              fontWeight="300"
              lineHeight="1"
            >
              <NumberFlow value={printer.progress} />%
            </Text>
            <Text fontSize="4vmin" color="var(--theme-fg-dim)" fontWeight="300">
              {fmtMins(printer.remainingTime)}
            </Text>
          </HStack>
        </HStack>
      </Board>
    </>
  );
}

const PRINTER_EXIT_MS = 260;

function PrinterModal({
  printer,
  onClose,
}: {
  printer: HomePrinter;
  onClose: () => void;
}) {
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  function requestClose() {
    if (isClosing) return;
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, PRINTER_EXIT_MS);
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isClosing]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  const etaLabel = fmtTime(printer.endTime ?? printer.finishTime);
  const startLabel = fmtTime(printer.startTime);
  const layerPct =
    printer.totalLayers && printer.totalLayers > 0 && printer.currentLayer != null
      ? Math.round((printer.currentLayer / printer.totalLayers) * 100)
      : null;
  const progress = Math.max(0, Math.min(100, printer.progress || 0));
  const stageLabel = printer.currentStage
    ? titleCase(printer.currentStage)
    : titleCase(printer.status);

  return (
    <Box
      className={`printer-modal${isClosing ? " printer-modal--closing" : ""}`}
      position="fixed"
      inset="0"
      zIndex={200}
      display="flex"
      alignItems="center"
      justifyContent="center"
      onClick={requestClose}
    >
      <Box
        className="printer-panel"
        borderRadius="3.5vmin"
        p="6vmin"
        minW="70vmin"
        maxW="92vmin"
        display="flex"
        flexDirection="column"
        gap="3.5vmin"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <Box
          as="button"
          className="printer-close"
          aria-label="Close printer details"
          onClick={requestClose}
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <IoClose />
        </Box>

        <VStack gap="1vmin" align="stretch">
          <Text
            fontSize="2.2vmin"
            letterSpacing="0.16em"
            color="var(--theme-fg-faint)"
          >
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
            <Text
              fontSize="2.2vmin"
              color="var(--theme-fg-faint)"
              overflow="hidden"
              whiteSpace="nowrap"
              textOverflow="ellipsis"
            >
              {printer.gcodeFilename}
            </Text>
          )}
        </VStack>

        <VStack gap="1.5vmin" align="stretch">
          <HStack justify="space-between" align="baseline">
            <Text
              fontSize="11vmin"
              fontWeight="300"
              color="green.400"
              lineHeight="1"
              letterSpacing="-0.04em"
            >
              <NumberFlow value={progress} />%
            </Text>
            <VStack align="flex-end" gap="0.2vmin">
              <Text fontSize="4.5vmin" fontWeight="300" lineHeight="1">
                {fmtMins(printer.remainingTime)}
              </Text>
              <Text
                fontSize="2vmin"
                letterSpacing="0.12em"
                color="var(--theme-fg-faint)"
              >
                REMAINING
              </Text>
            </VStack>
          </HStack>
          <Box
            height="0.9vmin"
            borderRadius="999px"
            bg="rgba(255,255,255,0.08)"
            overflow="hidden"
          >
            <Box
              height="100%"
              width={`${progress}%`}
              bg="green.400"
              transition="width 600ms ease"
            />
          </Box>
          <HStack justify="space-between">
            {startLabel && (
              <Text
                fontSize="2.2vmin"
                color="var(--theme-fg-faint)"
                letterSpacing="0.04em"
              >
                Started {startLabel}
              </Text>
            )}
            {etaLabel && (
              <Text
                fontSize="2.2vmin"
                color="var(--theme-fg-faint)"
                letterSpacing="0.04em"
                ml="auto"
              >
                ETA {etaLabel}
              </Text>
            )}
          </HStack>
        </VStack>

        <Box borderTop="1px solid var(--theme-divider)" pt="3vmin">
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
              value={
                printer.speedProfile ? titleCase(printer.speedProfile) : "—"
              }
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
      </Box>
    </Box>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <VStack align="flex-start" gap="0.4vmin">
      <Text
        fontSize="1.9vmin"
        letterSpacing="0.14em"
        color="var(--theme-fg-faint)"
      >
        {label}
      </Text>
      <Text
        fontSize="3.2vmin"
        fontWeight="300"
        lineHeight="1.1"
        overflow="hidden"
        whiteSpace="nowrap"
        textOverflow="ellipsis"
        maxW="100%"
      >
        {value}
      </Text>
    </VStack>
  );
}
