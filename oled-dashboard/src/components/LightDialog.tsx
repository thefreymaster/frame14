import { useState } from "react";
import {
  Circle,
  Dialog,
  HStack,
  Icon,
  Portal,
  Stack,
  Text,
  VStack,
  Wrap,
  chakra,
} from "@chakra-ui/react";
import { MdLightbulb, MdOutlineLightbulb } from "react-icons/md";
import { useEntity } from "../hooks/useEntity";
import { callLightService, callService } from "../lib/callService";
import {
  brightnessPct,
  COLOR_PRESETS,
  isColor,
  isWarmth,
  kelvinToRgb,
  lightColor,
  lightFeatures,
  rgba,
  warmthPresets,
  type LightAttrs,
  type RGB,
} from "../lib/lightModel";
import { CloseButton } from "./ui/close-button";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";

/** One preset as a round swatch of its colour, ringed while it's the light's. */
function Swatch({
  rgb,
  label,
  selected,
  onPick,
}: {
  rgb: RGB;
  label: string;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <VStack gap="1" width="3.5rem">
      <chakra.button
        type="button"
        aria-label={label}
        aria-pressed={selected}
        onClick={onPick}
        width="2.75rem"
        height="2.75rem"
        rounded="full"
        cursor="pointer"
        style={{ background: rgba(rgb) }}
        borderWidth="1px"
        borderColor="border"
        outline={selected ? "2px solid" : undefined}
        outlineColor="fg"
        outlineOffset="2px"
        focusVisibleRing="outside"
      />
      <Text textStyle="xs" color={selected ? "fg" : "fg.muted"}>
        {label}
      </Text>
    </VStack>
  );
}

/**
 * The controls, laid out like the fan's: the bulb in the light's colour, the
 * brightness and a power Switch, beside a vertical brightness Slider that
 * fills in the light's colour and sends on release. Under them, white presets
 * (if it does colour temperature) and colour presets (if it does colour).
 */
function LightControls({
  entityId,
  attrs,
  on,
}: {
  entityId: string;
  attrs: LightAttrs | undefined;
  on: boolean;
}) {
  const features = lightFeatures(attrs);
  const remote = on ? (brightnessPct(attrs) ?? 100) : 0;
  const [seen, setSeen] = useState(remote);
  const [pct, setPct] = useState(remote);
  const [dragging, setDragging] = useState(false);

  if (seen !== remote) {
    setSeen(remote);
    if (!dragging) setPct(remote);
  }

  const color = lightColor(on, attrs);
  const fill = color ?? lightColor(true, undefined)!;
  const warmths = features.colorTemp ? warmthPresets(attrs) : [];

  return (
    <Stack gap="8">
      <HStack gap="8" align="center" justify="center">
        <VStack gap="4" align="center">
          <Circle
            size="10rem"
            bg={color ? rgba(color, 0.2) : "bg.muted"}
            color={color ? rgba(color) : "fg.subtle"}
            transition="background-color 300ms ease, color 300ms ease"
          >
            <Icon boxSize="6rem">
              {on ? <MdLightbulb /> : <MdOutlineLightbulb />}
            </Icon>
          </Circle>
          <Text textStyle="5xl" fontWeight="light" lineHeight="1">
            {on ? pct : 0}
            <Text as="span" textStyle="2xl" color="fg.muted" ms="1">
              %
            </Text>
          </Text>
          <Switch
            colorPalette="yellow"
            checked={on}
            onCheckedChange={(e) =>
              callService(entityId, e.checked ? "turn_on" : "turn_off")
            }
          >
            {on ? "On" : "Off"}
          </Switch>
        </VStack>

        <Slider
          orientation="vertical"
          min={1}
          max={100}
          value={[Math.max(1, pct)]}
          aria-label={["Brightness"]}
          height="16rem"
          marks={[1, 25, 50, 75, 100]}
          // The fill is the light's colour (Chakra's palette solid, swapped
          // for this one slider).
          css={{ "--chakra-colors-color-palette-solid": rgba(fill) }}
          onValueChange={(d) => {
            setDragging(true);
            setPct(d.value[0]);
          }}
          onValueChangeEnd={(d) => {
            setDragging(false);
            setPct(d.value[0]);
            callLightService(entityId, { brightness_pct: d.value[0] });
          }}
        />
      </HStack>

      {warmths.length > 0 && (
        <Stack gap="3">
          <Text textStyle="sm" fontWeight="medium" color="fg.muted">
            White
          </Text>
          <Wrap gap="2">
            {warmths.map((p) => (
              <Swatch
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
              <Swatch
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

/**
 * A dimmable light's controls in a stock Chakra Dialog, opened by press and
 * hold on its tile. Reads the light live, so it follows changes made anywhere.
 */
export function LightDialog({
  entityId,
  onClose,
}: {
  entityId: string | null;
  onClose: () => void;
}) {
  const { data } = useEntity<LightAttrs>(entityId ?? "");
  const attrs = data?.attributes;

  return (
    <Dialog.Root
      open={entityId != null}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement="center"
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{attrs?.friendly_name ?? "Light"}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body pb="8">
              {entityId && (
                <LightControls
                  key={entityId}
                  entityId={entityId}
                  attrs={attrs}
                  on={data?.state === "on"}
                />
              )}
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
