import { useRef, useState } from "react";
import { HStack, IconButton, Text, VStack } from "@chakra-ui/react";
import { IoAdd, IoRemove } from "react-icons/io5";
import type { HomeFan } from "../hooks/useHomeData";
import { callFanService } from "../lib/callService";
import { FAN_SCALE, FAN_STEP, fanSpeedOf, presetLabel, snapFanSpeed } from "../lib/fan";
import { hvacPalette } from "../lib/hvac";
import { FanIcon } from "./FanIcon";
import { Switch } from "./ui/switch";
import { ThermostatDial } from "./ThermostatDial";

/** What Home Assistant last reported — local state re-syncs when it changes. */
function remoteOf(fan: HomeFan) {
  return {
    percentage: fan.percentage,
    state: fan.state,
  };
}

/**
 * How long the dial's −/+ buttons wait after the last tap before sending the
 * speed: a run of taps is one call, as a drag of the arc is (the thermostat's
 * STEP_COMMIT_MS).
 */
const STEP_COMMIT_MS = 800;

/**
 * One fan's controls, the thermostat's geared to a fan (0.140): the
 * ThermostatDial with the speed on its arc — 0 to 100% by quarters, dragged
 * or tapped — the readout (the spinning fan and what it's doing, the speed,
 * "Fan speed") and −/+ buttons in its footer stepping a quarter at a time,
 * sent once the taps stop; then the power Switch. No mode and no
 * temperature: speed is all a fan has. A speed of 0 is turn_off, anything
 * else turn_on with the percentage (it powers on integrations that don't
 * auto-on via set_percentage). FanDialog shows them for the Fans card's
 * tile. Mount one per fan (key it by entity id): the local state follows
 * Home Assistant except for whatever is under a finger right now.
 */
export function FanControls({ fan }: { fan: HomeFan }) {
  const remote = remoteOf(fan);
  const [seen, setSeen] = useState(remote);
  const [pct, setPct] = useState(() => fanSpeedOf(fan));
  const [optimisticOn, setOptimisticOn] = useState<boolean | null>(null);
  const [dragging, setDragging] = useState(false);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Follow Home Assistant, except for whatever is under a finger right now.
  if (seen.percentage !== remote.percentage || seen.state !== remote.state) {
    setSeen(remote);
    setOptimisticOn(null);
    if (!dragging) setPct(fanSpeedOf(fan));
  }

  // While the arc or the taps move the speed, the dial reads from the speed
  // under the finger: 0 is off, anything else running.
  const on = optimisticOn ?? (dragging ? pct > 0 : fan.state === "on");
  const preset = on ? presetLabel(fan.presetMode) : null;
  const statusLabel = on ? (preset ?? "Fan running") : "Fan off";
  const { accent, ring } = hvacPalette(on ? "fan" : "off");

  function commit(next: number) {
    if (next === 0) {
      setOptimisticOn(false);
      callFanService(fan.entity_id, "turn_off");
    } else {
      setOptimisticOn(true);
      callFanService(fan.entity_id, "turn_on", { percentage: next });
    }
  }

  function cancelStep() {
    if (stepTimerRef.current == null) return;
    clearTimeout(stepTimerRef.current);
    stepTimerRef.current = null;
  }

  /**
   * A −/+ tap: the reading moves at once and the speed goes out
   * STEP_COMMIT_MS after the last tap. Held as a drag meanwhile, so Home
   * Assistant's echo of the old speed doesn't snap the reading back. The
   * send still goes if the dialog closes first.
   */
  function stepSpeed(delta: number) {
    const next = snapFanSpeed(pct + delta);
    if (next === pct) return;
    setPct(next);
    setDragging(true);
    cancelStep();
    stepTimerRef.current = setTimeout(() => {
      stepTimerRef.current = null;
      setDragging(false);
      commit(next);
    }, STEP_COMMIT_MS);
  }

  function setPower(next: boolean) {
    cancelStep();
    setDragging(false);
    if (!next) {
      setPct(0);
      commit(0);
    } else {
      // Back to the speed it had — the dial's, else the entity's last — or half.
      const restore = pct > 0 ? pct : snapFanSpeed(fan.percentage ?? 0) || 50;
      setPct(restore);
      commit(restore);
    }
  }

  return (
    <VStack gap="6" align="center" width="100%">
      <ThermostatDial
        width="18rem"
        maxW="100%"
        ring={ring}
        accent={accent}
        live={on}
        value={pct}
        scale={FAN_SCALE}
        control={{
          label: "Fan speed",
          onChange: setPct,
          onCommit: commit,
          // A drag's release sends its own speed; drop the taps' one.
          onDragStart: () => {
            cancelStep();
            setDragging(true);
          },
          onDragEnd: () => setDragging(false),
        }}
        footer={
          <HStack gap="6">
            <IconButton
              variant="subtle"
              size="lg"
              aria-label="Lower the fan speed"
              disabled={pct <= FAN_SCALE.min}
              onClick={() => stepSpeed(-FAN_STEP)}
            >
              <IoRemove />
            </IconButton>
            <IconButton
              variant="subtle"
              size="lg"
              aria-label="Raise the fan speed"
              disabled={pct >= FAN_SCALE.max}
              onClick={() => stepSpeed(FAN_STEP)}
            >
              <IoAdd />
            </IconButton>
          </HStack>
        }
      >
        <VStack gap="1" align="center">
          <HStack gap="1.5" color={accent} textStyle="xs" fontWeight="semibold">
            <FanIcon on={on} percentage={pct} size="1em" color="inherit" />
            <Text as="span">{statusLabel}</Text>
          </HStack>
          <Text textStyle="6xl" fontWeight="light" lineHeight="1">
            {pct}%
          </Text>
          <Text textStyle="xs" color="fg.muted">
            Fan speed
          </Text>
        </VStack>
      </ThermostatDial>

      <Switch
        colorPalette="teal"
        checked={on}
        onCheckedChange={(e) => setPower(e.checked)}
      >
        {on ? "On" : "Off"}
      </Switch>
    </VStack>
  );
}
