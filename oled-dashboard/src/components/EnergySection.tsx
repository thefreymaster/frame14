import { useEffect, useRef, useState } from "react";
import { Box, Text, HStack, VStack, Grid } from "@chakra-ui/react";
import { PiSolarRoof } from "react-icons/pi";
import { IoClose, IoFlash } from "react-icons/io5";
import type { HomeEnergy } from "../hooks/useHomeData";

function fmtKwh(n: number) {
  return isNaN(n) ? "--" : n.toFixed(0);
}

function fmtW(watts: number): string {
  if (isNaN(watts)) return "--";
  return `${(watts / 1000).toFixed(1)} kW`;
}

const GRID_ACTIVE_THRESHOLD = 5;

export function EnergySection({ energy }: { energy: HomeEnergy }) {
  const [showModal, setShowModal] = useState(false);
  const {
    productionToday,
    consumptionToday,
    currentProduction,
    currentConsumption,
  } = energy;
  const pct =
    consumptionToday > 0 ? (productionToday / consumptionToday) * 100 : 0;
  const pctColor =
    pct >= 100
      ? "green.500"
      : pct >= 50
        ? "yellow.500"
        : "var(--theme-fg-faint)";

  const gridDraw = currentConsumption - currentProduction;
  const gridAbs = Math.abs(gridDraw);
  const isExporting = gridDraw < 0;
  const gridActive = gridAbs > GRID_ACTIVE_THRESHOLD;

  return (
    <>
      {showModal && (
        <EnergyModal energy={energy} onClose={() => setShowModal(false)} />
      )}
      <Box
        width="100%"
        cursor="pointer"
        onClick={() => setShowModal(true)}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <HStack
          align="center"
          gap="1.5vmin"
          mb="1.5vmin"
          pt="1.5vmin"
          width="100%"
        >
          <Text
            fontSize="2.2vmin"
            color="var(--theme-fg-faint)"
            letterSpacing="0.1em"
          >
            ENERGY
          </Text>
          {gridActive && (
            <Box
              display="inline-flex"
              alignItems="center"
              gap="0.6vmin"
              px="1.2vmin"
              py="0.3vmin"
              borderRadius="999px"
              border="1px solid"
              borderColor={
                isExporting ? "rgba(34,197,94,0.28)" : "rgba(249,115,22,0.28)"
              }
              bg={
                isExporting ? "rgba(34,197,94,0.08)" : "rgba(249,115,22,0.08)"
              }
            >
              <Text
                as="span"
                fontSize="1.8vmin"
                color={isExporting ? "green.400" : "orange.400"}
                fontWeight="500"
              >
                {isExporting ? "↑" : "↓"}
              </Text>
              <Text
                as="span"
                fontSize="1.7vmin"
                letterSpacing="0.12em"
                color={isExporting ? "green.400" : "orange.400"}
                fontWeight="500"
              >
                {isExporting ? "EXPORTING" : "IMPORTING"}
              </Text>
            </Box>
          )}
        </HStack>
        <Grid templateColumns="1fr 1fr 1fr" gap="2vmin" width="100%">
          <VStack align="flex-start" gap="0.5vmin">
            <HStack gap="1.2vmin" align="baseline">
              <Box
                color="yellow.500"
                fontSize="3.5vmin"
                lineHeight="1"
                flexShrink={0}
              >
                <PiSolarRoof />
              </Box>
              <Text
                fontSize="5vmin"
                fontWeight="300"
                color="yellow.600"
                lineHeight="1"
                whiteSpace="nowrap"
              >
                {fmtKwh(productionToday)} kWh
              </Text>
            </HStack>
            <Text
              fontSize="2vmin"
              letterSpacing="0.12em"
              color="var(--theme-fg-faint)"
            >
              PRODUCED
            </Text>
          </VStack>

          <VStack align="center" gap="0.5vmin">
            <Text
              fontSize="5vmin"
              fontWeight="400"
              color={pctColor}
              lineHeight="1"
            >
              {Math.round(pct)}%
            </Text>
            <Text
              fontSize="2vmin"
              letterSpacing="0.12em"
              color="var(--theme-fg-faint)"
            >
              SOLAR
            </Text>
          </VStack>

          <VStack align="flex-end" gap="0.5vmin">
            <HStack gap="1.2vmin" align="baseline">
              <Box
                fontSize="3.5vmin"
                lineHeight="1"
                color="var(--theme-fg-dim)"
                flexShrink={0}
              >
                <IoFlash />
              </Box>
              <Text
                fontSize="5vmin"
                fontWeight="300"
                color="var(--theme-fg-dim)"
                lineHeight="1"
                whiteSpace="nowrap"
              >
                {fmtKwh(consumptionToday)} kWh
              </Text>
            </HStack>
            <Text
              fontSize="2vmin"
              letterSpacing="0.12em"
              color="var(--theme-fg-faint)"
              textAlign="right"
            >
              USED
            </Text>
          </VStack>
        </Grid>
      </Box>
    </>
  );
}

const ENERGY_EXIT_MS = 260;

function EnergyModal({
  energy,
  onClose,
}: {
  energy: HomeEnergy;
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
    }, ENERGY_EXIT_MS);
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

  const {
    currentProduction,
    currentConsumption,
    productionToday,
    consumptionToday,
  } = energy;
  const gridDraw = currentConsumption - currentProduction;
  const isExporting = gridDraw < 0;
  const gridAbs = Math.abs(gridDraw);
  const solarActive = currentProduction > 5;
  const gridActive = gridAbs > GRID_ACTIVE_THRESHOLD;
  const pct =
    consumptionToday > 0
      ? Math.round((productionToday / consumptionToday) * 100)
      : 0;
  const pctColor =
    pct >= 100 ? "#22c55e" : pct >= 50 ? "#eab308" : "var(--theme-fg-faint)";

  return (
    <Box
      className={`energy-modal${solarActive ? " energy-modal--solar" : ""}${isClosing ? " energy-modal--closing" : ""}`}
      position="fixed"
      inset="0"
      zIndex={200}
      display="flex"
      alignItems="center"
      justifyContent="center"
      onClick={requestClose}
    >
      <Box
        className="energy-panel"
        borderRadius="3.5vmin"
        p="6vmin"
        minW="70vmin"
        maxW="90vmin"
        display="flex"
        flexDirection="column"
        alignItems="stretch"
        gap="4vmin"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <Box
          as="button"
          className="energy-close"
          aria-label="Close energy panel"
          onClick={requestClose}
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <IoClose />
        </Box>

        <VStack gap="2.5vmin" align="stretch">
          <Text
            fontSize="2.2vmin"
            letterSpacing="0.16em"
            color="var(--theme-fg-faint)"
          >
            NOW
          </Text>

          <HStack gap="2vmin" align="baseline">
            <Box
              color={solarActive ? "yellow.400" : "var(--theme-fg-faint)"}
              fontSize="4.5vmin"
              lineHeight="1"
              flexShrink={0}
            >
              <PiSolarRoof />
            </Box>
            <Text
              fontSize="11vmin"
              fontWeight="300"
              letterSpacing="-0.04em"
              lineHeight="1"
              color={solarActive ? "yellow.300" : "var(--theme-fg-faint)"}
              style={
                solarActive
                  ? { textShadow: "0 0 4vmin rgba(251,191,36,0.5)" }
                  : undefined
              }
            >
              {fmtW(currentProduction)}
            </Text>
            <Text
              fontSize="2.2vmin"
              color="var(--theme-fg-faint)"
              letterSpacing="0.1em"
              pb="1vmin"
            >
              SOLAR
            </Text>
          </HStack>

          <HStack gap="2vmin" align="baseline">
            <Box
              fontSize="4.5vmin"
              lineHeight="1"
              color="var(--theme-fg-dim)"
              flexShrink={0}
            >
              <IoFlash />
            </Box>
            <Text
              fontSize="7.5vmin"
              fontWeight="300"
              letterSpacing="-0.03em"
              lineHeight="1"
            >
              {fmtW(currentConsumption)}
            </Text>
            <Text
              fontSize="2.2vmin"
              color="var(--theme-fg-faint)"
              letterSpacing="0.1em"
              pb="0.5vmin"
            >
              HOME
            </Text>
          </HStack>

          {gridActive ? (
            <Box
              display="inline-flex"
              alignSelf="flex-start"
              alignItems="center"
              gap="1.5vmin"
              px="2.5vmin"
              py="1.2vmin"
              borderRadius="999px"
              border="1px solid"
              borderColor={
                isExporting ? "rgba(34,197,94,0.22)" : "rgba(249,115,22,0.22)"
              }
              bg={
                isExporting ? "rgba(34,197,94,0.07)" : "rgba(249,115,22,0.07)"
              }
            >
              <Text
                fontSize="3.8vmin"
                fontWeight="300"
                color={isExporting ? "green.400" : "orange.400"}
                letterSpacing="-0.01em"
              >
                {isExporting ? "↑" : "↓"} {fmtW(gridAbs)}
              </Text>
              <Text
                fontSize="2vmin"
                letterSpacing="0.12em"
                color={isExporting ? "green.700" : "orange.700"}
              >
                {isExporting ? "EXPORTING" : "IMPORTING"}
              </Text>
            </Box>
          ) : (
            <Text
              fontSize="2.8vmin"
              color="var(--theme-fg-faint)"
              letterSpacing="0.06em"
            >
              Grid idle
            </Text>
          )}
        </VStack>

        <Box borderTop="1px solid var(--theme-divider)" pt="3.5vmin">
          <Text
            fontSize="2.2vmin"
            letterSpacing="0.16em"
            color="var(--theme-fg-faint)"
            mb="2vmin"
          >
            TODAY
          </Text>
          <Grid templateColumns="1fr 1fr 1fr" gap="2vmin">
            <VStack align="flex-start" gap="0.5vmin">
              <Text
                fontSize="5vmin"
                fontWeight="300"
                color="yellow.600"
                lineHeight="1"
              >
                {fmtKwh(productionToday)} kWh
              </Text>
              <Text
                fontSize="2vmin"
                letterSpacing="0.12em"
                color="var(--theme-fg-faint)"
              >
                PRODUCED
              </Text>
            </VStack>
            <VStack align="center" gap="0.5vmin">
              <Text
                fontSize="5vmin"
                fontWeight="400"
                color={pctColor}
                lineHeight="1"
              >
                {pct}%
              </Text>
              <Text
                fontSize="2vmin"
                letterSpacing="0.12em"
                color="var(--theme-fg-faint)"
              >
                SOLAR
              </Text>
            </VStack>
            <VStack align="flex-end" gap="0.5vmin">
              <Text
                fontSize="5vmin"
                fontWeight="300"
                color="var(--theme-fg-dim)"
                lineHeight="1"
              >
                {fmtKwh(consumptionToday)} kWh
              </Text>
              <Text
                fontSize="2vmin"
                letterSpacing="0.12em"
                color="var(--theme-fg-faint)"
              >
                USED
              </Text>
            </VStack>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
}
