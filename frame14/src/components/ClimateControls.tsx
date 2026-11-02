import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { HStack, IconButton, SegmentGroup, Text, VStack } from "@chakra-ui/react";
import { IoAdd, IoRemove } from "react-icons/io5";
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
 * How long the dial's −/+ buttons wait after the last tap before sending the
 * target: a run of taps is one set_temperature, as a drag of the arc is.
 */
const STEP_COMMIT_MS = 800;

/** How long a fan mode sent is held for Home Assistant to report it back. */
const FAN_ECHO_MS = 10_000;

/**
 * One thermostat's controls: the draggable ThermostatDial (the one hand-drawn
 * control) with its readout and −/+ buttons, the mode SegmentGroup (Heat /
 * Cool / Fan / Off; modeControlCss fits it to a narrow card) and the
 * fan-speed Slider.
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
  // A fan mode sent and not yet reported back (0.144.1): Home Assistant's
  // echo of an older one — the step before's, landing after the next step
  // went — mustn't snap the slider back meanwhile. Cleared when the mode
  // comes back, or given up after FAN_ECHO_MS.
  const [sentFan, setSentFan] = useState<string | null>(null);
  const [draggingTemp, setDraggingTemp] = useState(false);
  const [draggingFan, setDraggingFan] = useState(false);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Follow Home Assistant, except for whatever is under a finger right now,
  // or sent and not yet reported.
  if (
    seen.mode !== remote.mode ||
    seen.temp !== remote.temp ||
    seen.fanMode !== remote.fanMode
  ) {
    setSeen(remote);
    setMode(remote.mode);
    if (!draggingTemp) setTemp(remote.temp);
    if (!draggingFan && sentFan == null) setFanMode(remote.fanMode);
  }
  if (sentFan != null && remote.fanMode === sentFan) setSentFan(null);

  // Give the mode up if it never comes back: the slider follows Home
  // Assistant again.
  const remoteFanMode = remote.fanMode;
  useEffect(() => {
    if (sentFan == null) return;
    const timer = setTimeout(() => {
      setSentFan(null);
      setFanMode(remoteFanMode);
    }, FAN_ECHO_MS);
    return () => clearTimeout(timer);
  }, [sentFan, remoteFanMode]);

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

  function cancelStep() {
    if (stepTimerRef.current == null) return;
    clearTimeout(stepTimerRef.current);
    stepTimerRef.current = null;
  }

  /**
   * A −/+ tap: the reading moves at once and the target goes out
   * STEP_COMMIT_MS after the last tap. Held as a drag meanwhile, so Home
   * Assistant's echo of the old target doesn't snap the reading back. The
   * send still goes if the dialog closes first.
   */
  function stepTemp(delta: number) {
    const next = Math.max(ARC_MIN_TEMP, Math.min(ARC_MAX_TEMP, temp + delta));
    if (next === temp) return;
    setTemp(next);
    setDraggingTemp(true);
    cancelStep();
    stepTimerRef.current = setTimeout(() => {
      stepTimerRef.current = null;
      setDraggingTemp(false);
      commitTemp(next);
    }, STEP_COMMIT_MS);
  }

  function commitFanMode(newFanMode: string) {
    // Against the mode last sent, while one is out: a step back to Home
    // Assistant's old mode is a change it has yet to hear of.
    if (newFanMode === (sentFan ?? unit.fanMode)) return;
    setSentFan(newFanMode);
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
        value={hidesTarget ? null : temp}
        control={
          hidesTarget
            ? undefined
            : {
                label: "Target temperature",
                onChange: setTemp,
                onCommit: commitTemp,
                // A drag's release sends its own target; drop the taps' one.
                onDragStart: () => {
                  cancelStep();
                  setDraggingTemp(true);
                },
                onDragEnd: () => setDraggingTemp(false),
              }
        }
        footer={
          hidesTarget ? undefined : (
            <HStack gap="6">
              <IconButton
                variant="subtle"
                size="lg"
                aria-label="Lower the target temperature"
                disabled={temp <= ARC_MIN_TEMP}
                onClick={() => stepTemp(-1)}
              >
                <IoRemove />
              </IconButton>
              <IconButton
                variant="subtle"
                size="lg"
                aria-label="Raise the target temperature"
                disabled={temp >= ARC_MAX_TEMP}
                onClick={() => stepTemp(1)}
              >
                <IoAdd />
              </IconButton>
            </HStack>
          )
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
