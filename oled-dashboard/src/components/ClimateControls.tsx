import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { HStack, SegmentGroup, Text, VStack } from "@chakra-ui/react";
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
 * The mode control at its natural size is about 21rem wide (four segments
 * with an icon, a word and the recipe's padding), wider than the inside of a
 * thermostat's card on a desktop with four across (/climate since 0.88.1, a
 * 16–17rem card body on a laptop) or of a phone's thermostat dialog, where it
 * spilled over the card's edges. Measured against the controls' own width
 * (the VStack below is a size container): under MODE_COMPACT_REM the control
 * takes the whole width and its segments share it equally with the padding
 * cut, as an iOS segmented control does; under MODE_TEXT_ONLY_REM, where even
 * that doesn't fit (a desktop window about 1250px wide), the segments keep
 * their words and drop their icons. Wider, it stays content-sized and
 * centred, as it was.
 */
const MODE_COMPACT_REM = 21.5;
const MODE_TEXT_ONLY_REM = 15;
const modeControlCss = {
  maxWidth: "100%",
  [`@container (max-width: ${MODE_COMPACT_REM}rem)`]: {
    width: "100%",
    // The recipe's root is min-width max-content; let it compress instead
    // of overflowing if a font runs wider than this reckons.
    minWidth: 0,
    "& [data-part=item]": {
      flex: "1 1 0",
      minWidth: 0,
      justifyContent: "center",
      paddingInline: "0.375rem",
      gap: "0.25rem",
    },
  },
  [`@container (max-width: ${MODE_TEXT_ONLY_REM}rem)`]: {
    "& [data-part=item] svg": { display: "none" },
  },
} as const;

/**
 * One thermostat's controls: the draggable ThermostatDial (the one hand-drawn
 * control) with its readout, the mode SegmentGroup (Heat / Cool / Fan / Off;
 * modeControlCss fits it to a narrow card) and the fan-speed Slider.
 * ClimateDialog shows them for the Home card's tile and /climate lays them
 * out in each thermostat's card. Mount one per unit (key it by entity id):
 * the local state follows Home Assistant except for whatever is under a
 * finger right now.
 */
export function ClimateControls({ unit }: { unit: HomeClimate }) {
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
  // The room's humidity rides on the detail line when the thermostat reports
  // one — the header of a card or dialog has no room for it on a phone.
  const humidity =
    unit.currentHumidity == null ? null : Math.round(unit.currentHumidity);
  const withHumidity = (label: string) =>
    humidity == null ? label : `${label} · ${humidity}% humidity`;
  const detailLabel = isFanOnly
    ? "Fan circulating air"
    : isOff
      ? previousTarget != null
        ? withHumidity(`Last target ${previousTarget}°`)
        : "Choose heat or cool to wake it up"
      : currentTemp != null
        ? withHumidity(`Indoor ${currentTemp}°`)
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
    // A size container, so the mode control can measure the room it has.
    <VStack gap="6" align="center" width="100%" css={{ containerType: "inline-size" }}>
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
        css={modeControlCss}
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
