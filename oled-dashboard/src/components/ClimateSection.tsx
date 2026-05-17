import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { callClimateService, type HvacMode } from "../lib/callService";
import { Box, Text, HStack, VStack } from "@chakra-ui/react";
import {
  IoAdd,
  IoClose,
  IoFlame,
  IoPowerOutline,
  IoRemove,
  IoSnow,
  IoThermometerOutline,
} from "react-icons/io5";
import { MdAir } from "react-icons/md";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import type { HomeClimate } from "../hooks/useHomeData";
import { Board } from "./Board";

type ClimateVisualMode = "heat" | "cool" | "fan_only" | "off";

const HVAC_COLOR: Record<string, string> = {
  cool: "blue.400",
  cooling: "blue.400",
  heat: "orange.400",
  heating: "orange.400",
  fan_only: "teal.300",
  fan: "teal.300",
  off: "var(--theme-fg-faint)",
  auto: "green.500",
  unknown: "var(--theme-fg-faint)",
};

const HVAC_RING: Record<string, string> = {
  cool: "rgba(96, 165, 250, 0.85)",
  cooling: "rgba(96, 165, 250, 0.95)",
  heat: "rgba(251, 146, 60, 0.85)",
  heating: "rgba(251, 146, 60, 0.95)",
  fan_only: "rgba(94, 234, 212, 0.85)",
  fan: "rgba(94, 234, 212, 0.85)",
  off: "rgba(255,255,255,0.18)",
  auto: "rgba(34, 197, 94, 0.85)",
  unknown: "rgba(255,255,255,0.18)",
};

const HVAC_GLOW: Record<string, string> = {
  cool: "rgba(96, 165, 250, 0.22)",
  cooling: "rgba(96, 165, 250, 0.3)",
  heat: "rgba(251, 146, 60, 0.22)",
  heating: "rgba(251, 146, 60, 0.32)",
  fan_only: "rgba(94, 234, 212, 0.22)",
  fan: "rgba(94, 234, 212, 0.22)",
  off: "rgba(255,255,255,0.04)",
  auto: "rgba(34, 197, 94, 0.22)",
  unknown: "rgba(255,255,255,0.04)",
};

const ACTIVE_HVAC_ACTION: Record<string, ClimateVisualMode> = {
  heating: "heat",
  cooling: "cool",
  fan: "fan_only",
};

const HVAC_MODES: { key: ClimateVisualMode; label: string }[] = [
  { key: "heat", label: "HEAT" },
  { key: "cool", label: "COOL" },
  { key: "fan_only", label: "FAN" },
  { key: "off", label: "OFF" },
];

const THERMOSTAT_EXIT_MS = 260;

function normalizeClimateMode(
  mode: string | null | undefined,
): ClimateVisualMode {
  if (mode === "heat" || mode === "cool" || mode === "fan_only") return mode;
  return "off";
}

function fmtClimateTemp(temp: number | null | undefined) {
  return temp == null ? null : Math.round(temp);
}

function getClimateAction(
  mode: ClimateVisualMode,
  unit: HomeClimate,
  targetTemp: number,
): ClimateVisualMode | null {
  const liveAction = unit.hvacAction
    ? ACTIVE_HVAC_ACTION[unit.hvacAction.toLowerCase()]
    : null;
  if (liveAction) return liveAction;
  if (mode === "off") return null;
  if (mode === "fan_only") return "fan_only";

  const currentTemp = fmtClimateTemp(unit.currentTemp);
  if (currentTemp == null) return null;
  if (mode === "heat" && currentTemp <= targetTemp - 1) return "heat";
  if (mode === "cool" && currentTemp >= targetTemp + 1) return "cool";
  return null;
}

function ClimateModal({
  unit,
  onClose,
}: {
  unit: HomeClimate;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mode, setMode] = useState<ClimateVisualMode>(
    normalizeClimateMode(unit.hvacMode ?? unit.state),
  );
  const [temp, setTemp] = useState(fmtClimateTemp(unit.targetTemp) ?? 72);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsClosing(false);
    setMode(normalizeClimateMode(unit.hvacMode ?? unit.state));
    setTemp(fmtClimateTemp(unit.targetTemp) ?? 72);
  }, [unit.entity_id, unit.hvacMode, unit.state, unit.targetTemp]);

  function requestClose() {
    if (isClosing) return;
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, THERMOSTAT_EXIT_MS);
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
  }, [isClosing, onClose]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    },
    [],
  );

  const activeAction = getClimateAction(mode, unit, temp);
  const isOff = mode === "off";
  const isFanOnly = mode === "fan_only";
  const hidesTarget = isOff || isFanOnly;
  const currentTemp = fmtClimateTemp(unit.currentTemp);
  const previousTarget = fmtClimateTemp(unit.targetTemp);
  const displayedTemp = hidesTarget
    ? (currentTemp ?? previousTarget ?? temp)
    : temp;
  const displayLabel = hidesTarget
    ? currentTemp != null
      ? "Indoor temperature"
      : previousTarget != null
        ? "Last target"
        : "Thermostat"
    : "Target temperature";
  const detailLabel = isFanOnly
    ? "Fan circulating air"
    : isOff
      ? previousTarget != null
        ? `Last target ${previousTarget}°`
        : "Choose heat or cool to wake it up"
      : currentTemp != null
        ? `Indoor ${currentTemp}°`
        : "Connected to Home Assistant";
  const statusLabel =
    activeAction === "heat"
      ? "Heating now"
      : activeAction === "cool"
        ? "Cooling now"
        : activeAction === "fan_only"
          ? "Fan running"
          : mode === "heat"
            ? "Heat standby"
            : mode === "cool"
              ? "Cool standby"
              : mode === "fan_only"
                ? "Fan standby"
                : "System off";
  const AccentIcon =
    activeAction === "heat"
      ? IoFlame
      : activeAction === "cool"
        ? IoSnow
        : activeAction === "fan_only"
          ? MdAir
          : mode === "heat"
            ? IoFlame
            : mode === "cool"
              ? IoSnow
              : mode === "fan_only"
                ? MdAir
                : IoPowerOutline;

  function applyMode(newMode: ClimateVisualMode) {
    if (newMode === mode) return;
    setMode(newMode);
    callClimateService(unit.entity_id, "set_hvac_mode", {
      hvac_mode: newMode as HvacMode,
    });
    setTimeout(
      () =>
        void queryClient.invalidateQueries({ queryKey: ["home", "climate"] }),
      2500,
    );
  }

  function adjustTemp(delta: number) {
    const newTemp = Math.min(85, Math.max(60, temp + delta));
    if (newTemp === temp) return;
    setTemp(newTemp);
    callClimateService(unit.entity_id, "set_temperature", {
      temperature: newTemp,
    });
    setTimeout(
      () =>
        void queryClient.invalidateQueries({ queryKey: ["home", "climate"] }),
      2500,
    );
  }

  const ringKey = activeAction ?? mode;
  const accentColor = HVAC_COLOR[ringKey] ?? "var(--theme-fg-faint)";
  const ringColor = HVAC_RING[ringKey] ?? "rgba(255,255,255,0.18)";
  const glowColor = HVAC_GLOW[ringKey] ?? "rgba(255,255,255,0.04)";

  return (
    <Box
      position="fixed"
      inset="0"
      zIndex={200}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p="4vmin"
      bg={`radial-gradient(circle at 50% 50%, ${glowColor} 0%, rgba(0,0,0,0.78) 55%, rgba(0,0,0,0.92) 100%)`}
      backdropFilter="blur(18px) saturate(140%)"
      onClick={requestClose}
      style={{
        opacity: isClosing ? 0 : 1,
        transition: `opacity ${THERMOSTAT_EXIT_MS}ms ease`,
        WebkitBackdropFilter: "blur(18px) saturate(140%)",
      }}
    >
      <Box
        as="button"
        aria-label="Close thermostat controls"
        position="absolute"
        top="3vmin"
        right="3vmin"
        width="7vmin"
        height="7vmin"
        borderRadius="full"
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        color="var(--theme-fg-faint)"
        bg="rgba(0,0,0,0.5)"
        border="1px solid rgba(255,255,255,0.12)"
        fontSize="3.4vmin"
        zIndex={300}
        onClick={(event) => {
          event.stopPropagation();
          requestClose();
        }}
        style={{
          WebkitTapHighlightColor: "transparent",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      >
        <IoClose />
      </Box>
      <VStack
        gap="4vmin"
        align="center"
        onClick={(event) => event.stopPropagation()}
        style={{
          transform: isClosing ? "scale(0.92)" : "scale(1)",
          transition: `transform ${THERMOSTAT_EXIT_MS}ms ease`,
        }}
      >
        <Box position="relative" width="min(70vmin, 70vh)" aspectRatio="1">
          {!hidesTarget && (
            <>
              <Box
                as="button"
                aria-label="Decrease target temperature"
                position="absolute"
                left="6%"
                top="50%"
                width="9vmin"
                height="9vmin"
                borderRadius="full"
                display="inline-flex"
                alignItems="center"
                justifyContent="center"
                color={accentColor}
                bg="rgba(0,0,0,0.45)"
                border="1px solid"
                borderColor={ringColor}
                fontSize="4vmin"
                zIndex={2}
                onClick={(event) => {
                  event.stopPropagation();
                  adjustTemp(-1);
                }}
                style={{
                  transform: "translateY(-50%)",
                  WebkitTapHighlightColor: "transparent",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                }}
              >
                <IoRemove />
              </Box>
              <Box
                as="button"
                aria-label="Increase target temperature"
                position="absolute"
                right="6%"
                top="50%"
                width="9vmin"
                height="9vmin"
                borderRadius="full"
                display="inline-flex"
                alignItems="center"
                justifyContent="center"
                color={accentColor}
                bg="rgba(0,0,0,0.45)"
                border="1px solid"
                borderColor={ringColor}
                fontSize="4vmin"
                zIndex={2}
                onClick={(event) => {
                  event.stopPropagation();
                  adjustTemp(1);
                }}
                style={{
                  transform: "translateY(-50%)",
                  WebkitTapHighlightColor: "transparent",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                }}
              >
                <IoAdd />
              </Box>
            </>
          )}

          <Box
            position="relative"
            width="100%"
            height="100%"
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            overflow="hidden"
            bg={`radial-gradient(circle at 50% 50%, ${glowColor} 0%, rgba(0,0,0,0.6) 55%, #000 100%)`}
            boxShadow={`inset 0 0 0 0.5vmin ${ringColor}, inset 0 0 6vmin rgba(0,0,0,0.55), 0 0 8vmin ${ringColor}`}
            style={{
              transition: "box-shadow 400ms ease",
            }}
          >
            {activeAction && (
              <Box
                position="absolute"
                inset="0"
                borderRadius="full"
                pointerEvents="none"
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${ringColor} 0%, ${glowColor} 32%, transparent 65%)`,
                  animation: "thermostatPulse 2.6s ease-in-out infinite",
                  transformOrigin: "center",
                  mixBlendMode: "screen",
                }}
              />
            )}
            <VStack
              gap="0.6vmin"
              align="center"
              justify="center"
              position="relative"
              zIndex={1}
            >
              <Text
                fontSize="2.4vmin"
                color="var(--theme-fg-faint)"
                fontWeight="500"
                letterSpacing="0.08em"
              >
                {unit.name}
              </Text>
              <HStack
                gap="1vmin"
                color={accentColor}
                fontSize="2vmin"
                fontWeight="600"
                letterSpacing="0.18em"
                textTransform="uppercase"
                opacity={isOff ? 0.55 : 0.95}
              >
                <AccentIcon />
                <Text as="span">{statusLabel}</Text>
              </HStack>
              <Text
                fontSize="22vmin"
                fontWeight="100"
                lineHeight="1"
                color="var(--theme-fg)"
                letterSpacing="-0.05em"
              >
                {displayedTemp}°
              </Text>
              <Text
                fontSize="1.8vmin"
                color="var(--theme-fg-faint)"
                fontWeight="500"
                letterSpacing="0.1em"
                textTransform="uppercase"
              >
                {displayLabel}
              </Text>
              <Text
                fontSize="1.6vmin"
                color="var(--theme-fg-faint)"
                opacity={0.7}
                mt="0.6vmin"
              >
                {detailLabel}
              </Text>
            </VStack>
          </Box>
        </Box>

        <HStack gap="2vmin">
          {HVAC_MODES.map(({ key, label }) => {
            const active = mode === key;
            const ModeIcon =
              key === "heat"
                ? IoFlame
                : key === "cool"
                  ? IoSnow
                  : key === "fan_only"
                    ? MdAir
                    : IoPowerOutline;
            const btnAccent = HVAC_COLOR[key] ?? "var(--theme-fg-faint)";
            const btnRing = HVAC_RING[key] ?? "rgba(255,255,255,0.18)";
            const btnGlow = HVAC_GLOW[key] ?? "rgba(255,255,255,0.04)";

            return (
              <VStack key={key} gap="0.8vmin" align="center">
                <Box
                  as="button"
                  width="9vmin"
                  height="9vmin"
                  borderRadius="full"
                  display="inline-flex"
                  alignItems="center"
                  justifyContent="center"
                  color={active ? btnAccent : "var(--theme-fg-faint)"}
                  bg={
                    active
                      ? `radial-gradient(circle at 50% 35%, ${btnGlow} 0%, rgba(0,0,0,0.6) 80%)`
                      : "rgba(255,255,255,0.02)"
                  }
                  fontSize="3.2vmin"
                  boxShadow={
                    active
                      ? `inset 0 0 0 0.3vmin ${btnRing}, 0 0 2vmin ${btnGlow}`
                      : "inset 0 0 0 1px rgba(255,255,255,0.08)"
                  }
                  onClick={() => applyMode(key)}
                  style={{
                    transition:
                      "box-shadow 220ms ease, color 220ms ease, background 220ms ease",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <ModeIcon />
                </Box>
                <Text
                  fontSize="1.4vmin"
                  color={active ? btnAccent : "var(--theme-fg-faint)"}
                  fontWeight="600"
                  letterSpacing="0.18em"
                  opacity={active ? 1 : 0.7}
                >
                  {label}
                </Text>
              </VStack>
            );
          })}
        </HStack>
      </VStack>
    </Box>
  );
}

function ClimateCard({
  unit,
  onTap,
}: {
  unit: HomeClimate;
  onTap: () => void;
}) {
  const displayMode = unit.hvacMode ?? unit.state;
  const activeAction =
    unit.hvacAction === "heating"
      ? "heating"
      : unit.hvacAction === "cooling"
        ? "cooling"
        : null;
  const badgeKey = activeAction ?? displayMode ?? "unknown";
  const accentColor = HVAC_COLOR[badgeKey] ?? "var(--theme-fg-faint)";
  const ringColor = HVAC_RING[badgeKey] ?? "rgba(255,255,255,0.18)";
  const glowColor = HVAC_GLOW[badgeKey] ?? "rgba(255,255,255,0.04)";
  const isOff = normalizeClimateMode(displayMode) === "off";
  const isActiveLive = activeAction != null;
  const currentTemp = fmtClimateTemp(unit.currentTemp);
  const targetTemp = fmtClimateTemp(unit.targetTemp);
  const ModeIcon =
    activeAction === "heating" || displayMode === "heat"
      ? IoFlame
      : activeAction === "cooling" || displayMode === "cool"
        ? IoSnow
        : displayMode === "fan_only" || displayMode === "fan"
          ? MdAir
          : IoPowerOutline;
  const showTarget = !isOff && targetTemp != null;
  const subLabel = isOff
    ? "OFF"
    : showTarget
      ? `→ ${targetTemp}°`
      : displayMode === "fan_only" || displayMode === "fan"
        ? "FAN"
        : "";

  return (
    <VStack gap="1vmin" align="center">
      <Box
        position="relative"
        aspectRatio="1"
        width="100%"
        borderRadius="full"
        cursor="pointer"
        display="flex"
        alignItems="center"
        justifyContent="center"
        overflow="hidden"
        bg={`radial-gradient(circle at 50% 50%, ${glowColor} 0%, rgba(0,0,0,0.6) 95%, #000 100%)`}
        boxShadow={`inset 0 0 0 0.5vmin ${ringColor}, inset 0 0 6vmin rgba(0,0,0,0.55), 0 0 8vmin ${isActiveLive ? ringColor : glowColor}`}
        onClick={onTap}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        {isActiveLive && (
          <Box
            position="absolute"
            inset="0"
            borderRadius="full"
            pointerEvents="none"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${ringColor} 0%, ${glowColor} 32%, transparent 65%)`,
              animation: "thermostatPulse 2.6s ease-in-out infinite",
              transformOrigin: "center",
              mixBlendMode: "screen",
            }}
          />
        )}
        <VStack
          gap="0.4vmin"
          align="center"
          justify="center"
          position="relative"
          zIndex={1}
        >
          <Box
            color={accentColor}
            fontSize="2.6vmin"
            opacity={isOff ? 0.45 : 1}
            lineHeight="1"
            display="inline-flex"
          >
            <ModeIcon />
          </Box>
          <Text
            fontSize="6.6vmin"
            fontWeight="200"
            lineHeight="1"
            color="var(--theme-fg)"
            letterSpacing="-0.04em"
          >
            {currentTemp != null ? `${currentTemp}°` : "—"}
          </Text>
          <Text
            fontSize="1.5vmin"
            color={accentColor}
            fontWeight="600"
            letterSpacing="0.18em"
            textTransform="uppercase"
            opacity={isOff ? 0.55 : 0.95}
            minHeight="1.6vmin"
          >
            {subLabel}
          </Text>
        </VStack>
      </Box>
      <Text
        fontSize="1.8vmin"
        color="var(--theme-fg-faint)"
        fontWeight="500"
        textAlign="center"
        whiteSpace="nowrap"
        overflow="hidden"
        textOverflow="ellipsis"
        maxWidth="100%"
        lineHeight="1.1"
      >
        {unit.name}
      </Text>
    </VStack>
  );
}

export function ClimateSection({ climate }: { climate: HomeClimate[] }) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const selectedUnit =
    climate.find((unit) => unit.entity_id === selectedEntityId) ?? null;

  return (
    <Board
      collapsible
      storageKey="climate"
      title={<SectionTitle icon={<IoThermometerOutline />}>CLIMATE</SectionTitle>}
    >
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fill, minmax(20vmin, 1fr))"
        columnGap="2vmin"
        rowGap="2vmin"
        width="100%"
      >
        {climate.map((unit) => (
          <ClimateCard
            key={unit.entity_id || unit.name}
            unit={unit}
            onTap={() => setSelectedEntityId(unit.entity_id)}
          />
        ))}
      </Box>
      {selectedUnit && (
        <ClimateModal
          unit={selectedUnit}
          onClose={() => setSelectedEntityId(null)}
        />
      )}
    </Board>
  );
}
