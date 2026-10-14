import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Dialog,
  HStack,
  Portal,
  SegmentGroup,
  Text,
  VStack,
} from "@chakra-ui/react";
import { IoClose } from "react-icons/io5";
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
 * The thermostat modal: a Dialog in the `immersive` variant — the dial floats
 * on a blurred scrim. The arc is the one hand-drawn control (ThermostatDial);
 * the mode pill is a SegmentGroup and fan speed is a Slider.
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
      variant="immersive"
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content aria-label={`${unit?.name ?? "Thermostat"} controls`}>
            <Dialog.CloseTrigger asChild>
              <CloseButton
                variant="chrome"
                size="chrome"
                aria-label="Close thermostat controls"
                width={{ base: "12vw", md: "7vmin" }}
                height={{ base: "12vw", md: "7vmin" }}
                _icon={{
                  width: { base: "5.5vw", md: "3.4vmin" },
                  height: { base: "5.5vw", md: "3.4vmin" },
                }}
                zIndex={1}
              >
                <IoClose />
              </CloseButton>
            </Dialog.CloseTrigger>
            {unit && <ClimateControls key={unit.entity_id} unit={unit} />}
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
    <>
      <ThermostatDial
        width={{ base: "min(64vw, 44vh)", md: "min(44vmin, 48vh)" }}
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
        <VStack gap="0.6vmin" align="center" justify="center">
          <Dialog.Title
            fontSize={{ base: "2.6vw", md: "1.8vmin" }}
            color="fg.faint"
            fontWeight="500"
            letterSpacing="0.08em"
          >
            {unit.name}
          </Dialog.Title>
          <HStack
            gap={{ base: "1.2vw", md: "0.8vmin" }}
            color={accent}
            fontSize={{ base: "2.2vw", md: "1.5vmin" }}
            fontWeight="600"
            letterSpacing="0.18em"
            textTransform="uppercase"
            opacity={isOff ? 0.55 : 0.95}
          >
            <AccentIcon />
            <Text as="span">{statusLabel}</Text>
          </HStack>
          <Text
            fontFamily="display"
            fontSize={{ base: "19vw", md: "13.5vmin" }}
            fontWeight="100"
            lineHeight="1"
            color="fg"
            letterSpacing="-0.05em"
          >
            {displayedTemp}°
          </Text>
          <Text
            fontSize={{ base: "2.1vw", md: "1.4vmin" }}
            color="fg.faint"
            fontWeight="500"
            letterSpacing="0.1em"
            textTransform="uppercase"
          >
            {displayLabel}
          </Text>
          <Text
            fontSize={{ base: "2vw", md: "1.3vmin" }}
            color="fg.faint"
            opacity={0.7}
            mt={{ base: "1vw", md: "0.6vmin" }}
          >
            {detailLabel}
          </Text>
        </VStack>
      </ThermostatDial>

      {/* The mode pill: a SegmentGroup whose indicator slides between modes,
          outlined in the chosen mode's colour. */}
      <SegmentGroup.Root
        variant="pill"
        size="dial"
        fitted
        value={mode}
        onValueChange={(e) => {
          if (e.value) applyMode(e.value as ClimateVisualMode);
        }}
        width={{ base: "72vw", md: "38vmin" }}
        maxW="380px"
        aria-label="Mode"
        css={{ "--segment-accent": hvacPalette(mode).ring }}
      >
        <SegmentGroup.Indicator />
        {HVAC_MODES.map(({ key, label }) => {
          const ModeIcon = MODE_ICON[key];
          return (
            <SegmentGroup.Item
              key={key}
              value={key}
              css={{ "--item-accent": hvacPalette(key).accent }}
            >
              <ModeIcon />
              <SegmentGroup.ItemText>{label}</SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </SegmentGroup.Item>
          );
        })}
      </SegmentGroup.Root>

      {unit.fanModes.length > 0 && (
        <Box width={{ base: "72vw", md: "38vmin" }} maxWidth="380px">
          <FanSpeedSlider
            modes={unit.fanModes}
            value={fanMode}
            accent={accent}
            colorPalette={palette}
            disabled={isOff}
            onChange={setFanMode}
            onCommit={commitFanMode}
            onDragStart={() => setDraggingFan(true)}
            onDragEnd={() => setDraggingFan(false)}
          />
        </Box>
      )}
    </>
  );
}
