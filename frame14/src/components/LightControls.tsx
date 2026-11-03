import { useRef, useState } from "react";
import { HStack, Icon, IconButton, Stack, Text, VStack, Wrap } from "@chakra-ui/react";
import { IoAdd, IoRemove } from "react-icons/io5";
import { MdLightbulb, MdOutlineLightbulb } from "react-icons/md";
import { callLightService, callService } from "../lib/callService";
import { hvacPalette } from "../lib/hvac";
import {
  brightnessPct,
  COLOR_PRESETS,
  isColor,
  isWarmth,
  kelvinToRgb,
  LIGHT_SCALE,
  lightColor,
  lightFeatures,
  rgba,
  stepBrightness,
  warmthPresets,
  type LightAttrs,
} from "../lib/lightModel";
import { LightSwatch } from "./LightSwatch";
import { Switch } from "./ui/switch";
import { ThermostatDial } from "./ThermostatDial";
import NumberFlow from "@number-flow/react";

/**
 * How long the dial's −/+ buttons wait after the last tap before sending the
 * brightness: a run of taps is one call, as a drag of the arc is (the
 * thermostat's and the fan's STEP_COMMIT_MS).
 */
const STEP_COMMIT_MS = 800;

/**
 * One light's controls, the thermostat's geared to a light (0.141, as the
 * fan's are since 0.140): the ThermostatDial with the brightness on its arc —
 * 0 to 100% by whole percents, dragged or tapped — the readout (the bulb in
 * the light's colour and whether it's on, the percentage, "Brightness") and
 * −/+ buttons in its footer stepping a tenth at a time, sent once the taps
 * stop; the power Switch under the dial; then the white presets (if it does
 * colour temperature) and the colour presets (if it does colour), as before.
 * A brightness of 0 is turn_off, anything else light.turn_on with the
 * percentage (which turns an off light on). The ring and accent are the
 * light's own colour while on, the grey `off` palette otherwise. LightDialog
 * shows them; mount one per light (key it by entity id): the local state
 * follows Home Assistant except for whatever is under a finger right now.
 */
export function LightControls({
  entityId,
  attrs,
  on: isOn,
}: {
  entityId: string;
  attrs: LightAttrs | undefined;
  on: boolean;
}) {
  const features = lightFeatures(attrs);
  const remote = isOn ? (brightnessPct(attrs) ?? 100) : 0;
  const [seen, setSeen] = useState(remote);
  const [pct, setPct] = useState(remote);
  const [optimisticOn, setOptimisticOn] = useState<boolean | null>(null);
  const [dragging, setDragging] = useState(false);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The brightness it last had while on, for the switch to bring back.
  const [lastOn, setLastOn] = useState(remote > 0 ? remote : null);

  // Follow Home Assistant, except for whatever is under a finger right now.
  if (seen !== remote) {
    setSeen(remote);
    setOptimisticOn(null);
    if (remote > 0) setLastOn(remote);
    if (!dragging) setPct(remote);
  }

  // While the arc or the taps move the brightness, the dial reads from the
  // level under the finger: 0 is off, anything else on.
  const on = optimisticOn ?? (dragging ? pct > 0 : isOn);
  const color = lightColor(on, attrs);
  const { accent, ring } = color
    ? { accent: rgba(color), ring: rgba(color) }
    : hvacPalette("off");
  const warmths = features.colorTemp ? warmthPresets(attrs) : [];

  function commit(next: number) {
    if (next === 0) {
      setOptimisticOn(false);
      callService(entityId, "turn_off");
    } else {
      setOptimisticOn(true);
      callLightService(entityId, { brightness_pct: next });
    }
  }

  function cancelStep() {
    if (stepTimerRef.current == null) return;
    clearTimeout(stepTimerRef.current);
    stepTimerRef.current = null;
  }

  /**
   * A −/+ tap: the reading moves at once and the brightness goes out
   * STEP_COMMIT_MS after the last tap. Held as a drag meanwhile, so Home
   * Assistant's echo of the old level doesn't snap the reading back. The send
   * still goes if the dialog closes first.
   */
  function step(direction: 1 | -1) {
    const next = stepBrightness(pct, direction);
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
      // Back to the brightness it had — the dial's, else the one it was last
      // on at — or Home Assistant's own memory of it.
      const restore = pct > 0 ? pct : lastOn;
      if (restore == null) {
        setOptimisticOn(true);
        callService(entityId, "turn_on");
      } else {
        setPct(restore);
        commit(restore);
      }
    }
  }

  return (
    <Stack gap="8">
      <VStack gap="6" align="center" width="100%">
        <ThermostatDial
          width="18rem"
          maxW="100%"
          ring={ring}
          accent={accent}
          live={on}
          value={pct}
          scale={LIGHT_SCALE}
          control={{
            label: "Brightness",
            onChange: setPct,
            onCommit: commit,
            // A drag's release sends its own level; drop the taps' one.
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
                aria-label="Lower the brightness"
                disabled={pct <= LIGHT_SCALE.min}
                onClick={() => step(-1)}
              >
                <IoRemove />
              </IconButton>
              <IconButton
                variant="subtle"
                size="lg"
                aria-label="Raise the brightness"
                disabled={pct >= LIGHT_SCALE.max}
                onClick={() => step(1)}
              >
                <IoAdd />
              </IconButton>
            </HStack>
          }
        >
          <VStack gap="1" align="center">
            <HStack gap="1.5" color={accent} textStyle="xs" fontWeight="semibold">
              <Icon boxSize="1em">
                {on ? <MdLightbulb /> : <MdOutlineLightbulb />}
              </Icon>
              <Text as="span">{on ? "Light on" : "Light off"}</Text>
            </HStack>
            {/* NumberFlow, as the thermostat's (0.149.0). */}
            <Text
              textStyle="6xl"
              fontWeight="light"
              lineHeight="1"
              data-dial-reading
            >
              <NumberFlow value={pct} suffix="%" />
            </Text>
            <Text textStyle="xs" color="fg.muted">
              Brightness
            </Text>
          </VStack>
        </ThermostatDial>

        <Switch
          colorPalette="yellow"
          checked={on}
          onCheckedChange={(e) => setPower(e.checked)}
        >
          {on ? "On" : "Off"}
        </Switch>
      </VStack>

      {warmths.length > 0 && (
        <Stack gap="3">
          <Text textStyle="sm" fontWeight="medium" color="fg.muted">
            White
          </Text>
          <Wrap gap="2">
            {warmths.map((p) => (
              <LightSwatch
                key={p.kelvin}
                rgb={kelvinToRgb(p.kelvin)}
                label={p.label}
                selected={on && isWarmth(attrs, p.kelvin)}
                onPick={() =>
                  callLightService(entityId, { color_temp_kelvin: p.kelvin })
                }
              />
            ))}
          </Wrap>
        </Stack>
      )}

      {features.color && (
        <Stack gap="3">
          <Text textStyle="sm" fontWeight="medium" color="fg.muted">
            Color
          </Text>
          <Wrap gap="2">
            {COLOR_PRESETS.map((p) => (
              <LightSwatch
                key={p.label}
                rgb={p.rgb}
                label={p.label}
                selected={on && isColor(attrs, p.rgb)}
                onPick={() => callLightService(entityId, { rgb_color: p.rgb })}
              />
            ))}
          </Wrap>
        </Stack>
      )}
    </Stack>
  );
}
