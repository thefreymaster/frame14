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
} from "react-icons/io5";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import type { HomeClimate } from "../hooks/useHomeData";

type ClimateVisualMode = "heat" | "cool" | "off";

const HVAC_COLOR: Record<string, string> = {
  cool: "blue.400",
  cooling: "blue.400",
  heat: "orange.400",
  heating: "orange.400",
  off: "var(--theme-fg-faint)",
  auto: "green.500",
  unknown: "var(--theme-fg-faint)",
};

const HVAC_BADGE_BG: Record<string, string> = {
  cool: "rgba(96, 165, 250, 0.12)",
  cooling: "rgba(96, 165, 250, 0.12)",
  heat: "rgba(251, 146, 60, 0.12)",
  heating: "rgba(251, 146, 60, 0.12)",
  off: "rgba(255,255,255,0.05)",
  auto: "rgba(34, 197, 94, 0.12)",
  unknown: "rgba(255,255,255,0.05)",
};

const ACTIVE_HVAC_ACTION: Record<string, ClimateVisualMode> = {
  heating: "heat",
  cooling: "cool",
};

const HVAC_MODES: { key: ClimateVisualMode; label: string }[] = [
  { key: "heat", label: "HEAT" },
  { key: "cool", label: "COOL" },
  { key: "off", label: "OFF" },
];

const THERMOSTAT_EXIT_MS = 260;

function normalizeClimateMode(
  mode: string | null | undefined,
): ClimateVisualMode {
  if (mode === "heat" || mode === "cool") return mode;
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
  const isActive = activeAction === mode && !isOff;
  const currentTemp = fmtClimateTemp(unit.currentTemp);
  const previousTarget = fmtClimateTemp(unit.targetTemp);
  const displayedTemp = isOff ? (currentTemp ?? previousTarget ?? temp) : temp;
  const displayLabel = isOff
    ? currentTemp != null
      ? "Indoor temperature"
      : previousTarget != null
        ? "Last target"
        : "Thermostat"
    : "Target temperature";
  const detailLabel = isOff
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
        : mode === "heat"
          ? "Heat standby"
          : mode === "cool"
            ? "Cool standby"
            : "System off";
  const AccentIcon =
    activeAction === "heat"
      ? IoFlame
      : activeAction === "cool"
        ? IoSnow
        : mode === "heat"
          ? IoFlame
          : mode === "cool"
            ? IoSnow
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
          {!isOff && (
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

function ClimateRow({ unit, onTap }: { unit: HomeClimate; onTap: () => void }) {
  const displayMode = unit.hvacMode ?? unit.state;
  const activeAction =
    unit.hvacAction === "heating"
      ? "heating"
      : unit.hvacAction === "cooling"
        ? "cooling"
        : null;
  const badgeKey = activeAction ?? displayMode ?? "unknown";
  const statusLabel = badgeKey;
  const badgeColor = HVAC_COLOR[badgeKey] ?? "var(--theme-fg-faint)";
  const badgeBg = HVAC_BADGE_BG[badgeKey] ?? "rgba(255,255,255,0.05)";
  const isOff = normalizeClimateMode(displayMode) === "off";
  const currentTemp = fmtClimateTemp(unit.currentTemp);
  const targetTemp = fmtClimateTemp(unit.targetTemp);

  return (
    <Box
      display="grid"
      gridTemplateColumns="1fr auto 1fr"
      alignItems="center"
      width="100%"
      cursor="pointer"
      py="0.8vmin"
      onClick={onTap}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <Text
        fontSize="3.4vmin"
        color="var(--theme-fg-dim)"
        fontWeight="400"
      >
        {unit.name}
      </Text>

      <Box
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        px="1.8vmin"
        py="0.4vmin"
        borderRadius="full"
        fontSize="2.6vmin"
        fontWeight="500"
        letterSpacing="0.1em"
        color={badgeColor}
        bg={badgeBg}
        minW="14vmin"
        textAlign="center"
        textTransform="uppercase"
      >
        {statusLabel}
      </Box>

      {currentTemp != null ? (
        <HStack align="baseline" gap="1vmin" justify="flex-end">
          <Text fontSize="3.4vmin" fontWeight="300" lineHeight="1">
            {currentTemp}°
          </Text>
          {!isOff && targetTemp != null && (
            <Text fontSize="3.4vmin" color="var(--theme-fg-faint)">
              → {targetTemp}°
            </Text>
          )}
        </HStack>
      ) : (
        <Box />
      )}
    </Box>
  );
}

export function ClimateSection({ climate }: { climate: HomeClimate[] }) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const selectedUnit =
    climate.find((unit) => unit.entity_id === selectedEntityId) ?? null;

  return (
    <Box width="100%">
      <SectionTitle>CLIMATE</SectionTitle>
      <VStack gap="0" align="stretch" width="100%">
        {climate.map((unit) => (
          <ClimateRow
            key={unit.entity_id || unit.name}
            unit={unit}
            onTap={() => setSelectedEntityId(unit.entity_id)}
          />
        ))}
      </VStack>
      {selectedUnit && (
        <ClimateModal
          unit={selectedUnit}
          onClose={() => setSelectedEntityId(null)}
        />
      )}
    </Box>
  );
}
