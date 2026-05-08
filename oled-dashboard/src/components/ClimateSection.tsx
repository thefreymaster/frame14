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
  const isActive = activeAction === mode && !isOff;
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

  return (
    <Box
      className={`thermostat-modal thermostat-modal--${mode}${isClosing ? " thermostat-modal--closing" : ""}`}
      position="fixed"
      inset="0"
      zIndex={200}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p="4vmin"
      onClick={requestClose}
    >
      <Box
        className="thermostat-panel"
        display="flex"
        flexDirection="column"
        alignItems="center"
        gap="3vmin"
        onClick={(event) => event.stopPropagation()}
      >
        <Box
          as="button"
          className="thermostat-close"
          aria-label="Close thermostat controls"
          onClick={requestClose}
        >
          <IoClose />
        </Box>

        <Box
          className={`thermostat-dial thermostat-dial--${mode}${isActive ? " thermostat-dial--active" : ""}`}
        >
          <Box className="thermostat-dial__edge" />
          <Box className="thermostat-dial__weather" />
          <Box className="thermostat-particles" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <Box key={index} as="span" className="thermostat-particle" />
            ))}
          </Box>
          {!hidesTarget && (
            <>
              <Box
                as="button"
                className="thermostat-step thermostat-step--down"
                aria-label="Decrease target temperature"
                onClick={() => adjustTemp(-1)}
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <IoRemove />
              </Box>
              <Box
                as="button"
                className="thermostat-step thermostat-step--up"
                aria-label="Increase target temperature"
                onClick={() => adjustTemp(1)}
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <IoAdd />
              </Box>
            </>
          )}

          <VStack className="thermostat-dial__content" gap="0">
            <Text className="thermostat-room">{unit.name}</Text>
            <HStack className="thermostat-status" gap="1.2vmin">
              <AccentIcon />
              <Text as="span">{statusLabel}</Text>
            </HStack>
            <Text className="thermostat-temp">{displayedTemp}°</Text>
            <Text className="thermostat-temp-label">{displayLabel}</Text>
            <Text className="thermostat-detail">{detailLabel}</Text>
          </VStack>
        </Box>

        <HStack className="thermostat-mode-strip" gap="1.4vmin">
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

            return (
              <Box
                key={key}
                as="button"
                className={`thermostat-mode-button${active ? " thermostat-mode-button--active" : ""}`}
                onClick={() => applyMode(key)}
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <ModeIcon />
                <Text as="span">{label}</Text>
              </Box>
            );
          })}
        </HStack>
      </Box>
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
        bg={`radial-gradient(circle at 50% 32%, ${glowColor} 0%, rgba(0,0,0,0.85) 65%, #000 100%)`}
        boxShadow={`inset 0 0 0 0.35vmin ${ringColor}, inset 0 0 2.5vmin rgba(0,0,0,0.7)${isActiveLive ? `, 0 0 2vmin ${glowColor}` : ""}`}
        onClick={onTap}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <VStack gap="0.4vmin" align="center" justify="center">
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
    <Board>
      <SectionTitle icon={<IoThermometerOutline />}>CLIMATE</SectionTitle>
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
