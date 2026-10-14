import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  HStack,
  Portal,
  SegmentGroup,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { HomeClimate } from "../hooks/useHomeData";
import { callClimateService, type HvacMode } from "../lib/callService";
import {
  fmtClimateTemp,
  getClimateAction,
  HVAC_MODES,
  hvacPalette,
  MODE_ICON,
  normalizeClimateMode,
  type ClimateVisualMode,
} from "../lib/hvac";
import { ARC_MAX_TEMP, ARC_MIN_TEMP } from "../lib/thermostatArc";
import { FanSpeedSlider } from "./FanSpeedSlider";
import { ThermostatDial } from "./ThermostatDial";
import { CloseButton } from "./ui/close-button";

/** What Home Assistant last reported — local state re-syncs when it changes. */
function remoteOf(unit: HomeClimate) {
  return {
    id: unit.entity_id,
    mode: normalizeClimateMode(unit.hvacMode ?? unit.state),
    temp: fmtClimateTemp(unit.targetTemp) ?? 72,
    fanMode: unit.fanMode,
  };
}

/**
 * The thermostat modal: a stock Chakra Dialog. The arc is the one hand-drawn
 * control (ThermostatDial); the mode selector is a SegmentGroup and fan speed
 * is a Slider.
 */
export function ClimateDialog({
  unit,
  open,
  onClose,
}: {
  unit: HomeClimate | null;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog.Root
      open={open && unit != null}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement="center"
      size="md"
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{unit?.name ?? "Thermostat"}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {unit && <ClimateControls key={unit.entity_id} unit={unit} />}
            </Dialog.Body>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function ClimateControls({ unit }: { unit: HomeClimate }) {
  const queryClient = useQueryClient();
  const remote = remoteOf(unit);
  const [seen, setSeen] = useState(remote);
  const [mode, setMode] = useState<ClimateVisualMode>(remote.mode);
  const [temp, setTemp] = useState(remote.temp);
  const [fanMode, setFanMode] = useState<string | null>(remote.fanMode);
  const [draggingTemp, setDraggingTemp] = useState(false);
  const [draggingFan, setDraggingFan] = useState(false);

  // Follow Home Assistant, except for whatever is under a finger right now.
  if (
    seen.mode !== remote.mode ||
    seen.temp !== remote.temp ||
    seen.fanMode !== remote.fanMode
  ) {
    setSeen(remote);
    setMode(remote.mode);
    if (!draggingTemp) setTemp(remote.temp);
    if (!draggingFan) setFanMode(remote.fanMode);
  }

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
  const AccentIcon = MODE_ICON[activeAction ?? mode];

  function refreshSoon() {
    setTimeout(
      () =>
        void queryClient.invalidateQueries({ queryKey: ["home", "climate"] }),
      2500,
    );
  }

  function applyMode(newMode: ClimateVisualMode) {
    if (newMode === mode) return;
    setMode(newMode);
    callClimateService(unit.entity_id, "set_hvac_mode", {
      hvac_mode: newMode as HvacMode,
    });
    refreshSoon();
  }

  function commitTemp(newTemp: number) {
    callClimateService(unit.entity_id, "set_temperature", {
      temperature: newTemp,
    });
    refreshSoon();
  }

  function commitFanMode(newFanMode: string) {
    if (newFanMode === unit.fanMode) return;
    callClimateService(unit.entity_id, "set_fan_mode", {
      fan_mode: newFanMode,
    });
    refreshSoon();
  }

  const { accent, ring, palette } = hvacPalette(activeAction ?? mode);

  return (
    <VStack gap="6" align="center">
      <ThermostatDial
        width="18rem"
        maxW="100%"
        ring={ring}
        accent={accent}
        live={activeAction != null}
        target={hidesTarget ? null : temp}
        control={
          hidesTarget
            ? undefined
            : {
                min: ARC_MIN_TEMP,
                max: ARC_MAX_TEMP,
                onChange: setTemp,
                onCommit: commitTemp,
                onDragStart: () => setDraggingTemp(true),
                onDragEnd: () => setDraggingTemp(false),
              }
        }
      >
        <VStack gap="1" align="center">
          <HStack gap="1.5" color={accent} textStyle="xs" fontWeight="semibold">
            <AccentIcon />
            <Text as="span">{statusLabel}</Text>
          </HStack>
          <Text textStyle="6xl" fontWeight="light" lineHeight="1">
            {displayedTemp}°
          </Text>
          <Text textStyle="xs" color="fg.muted">
            {displayLabel}
          </Text>
          <Text textStyle="xs" color="fg.subtle">
            {detailLabel}
          </Text>
        </VStack>
      </ThermostatDial>

      <SegmentGroup.Root
        value={mode}
        onValueChange={(e) => {
          if (e.value) applyMode(e.value as ClimateVisualMode);
        }}
        aria-label="Mode"
      >
        <SegmentGroup.Indicator />
        {HVAC_MODES.map(({ key, label }) => {
          const ModeIcon = MODE_ICON[key];
          return (
            <SegmentGroup.Item key={key} value={key}>
              <ModeIcon />
              <SegmentGroup.ItemText>{label}</SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </SegmentGroup.Item>
          );
        })}
      </SegmentGroup.Root>

      {unit.fanModes.length > 0 && (
        <FanSpeedSlider
          modes={unit.fanModes}
          value={fanMode}
          colorPalette={palette}
          disabled={isOff}
          onChange={setFanMode}
          onCommit={commitFanMode}
          onDragStart={() => setDraggingFan(true)}
          onDragEnd={() => setDraggingFan(false)}
        />
      )}
    </VStack>
  );
}
