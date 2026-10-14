import { HStack, Icon, Text } from "@chakra-ui/react";
import { MdAir } from "react-icons/md";
import { Slider } from "./ui/slider";

/** Slug-ish HA fan mode name ("wind_free") → display label ("Wind free"). */
function fanModeLabel(mode: string) {
  const words = mode.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * A Chakra Slider over a climate entity's fan_modes, one step per mode.
 * Dragging updates the label; the service call fires on release
 * (onValueChangeEnd), so a drag sends one command.
 */
export function FanSpeedSlider({
  modes,
  value,
  colorPalette,
  disabled = false,
  onChange,
  onCommit,
  onDragStart,
  onDragEnd,
}: {
  modes: string[];
  value: string | null;
  /** Chakra palette for the slider (the thermostat mode's colour). */
  colorPalette: string;
  disabled?: boolean;
  onChange: (mode: string) => void;
  onCommit: (mode: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  if (modes.length === 0) return null;
  const activeIndex = Math.max(0, modes.indexOf(value ?? ""));
  const single = modes.length === 1;

  return (
    <HStack width="100%" gap="4">
      <Icon color="fg.muted" boxSize="5">
        <MdAir />
      </Icon>
      <Slider
        flex="1"
        colorPalette={colorPalette}
        min={0}
        max={single ? 1 : modes.length - 1}
        step={1}
        value={[activeIndex]}
        disabled={disabled || single}
        aria-label={["Fan speed"]}
        getAriaValueText={(d) => fanModeLabel(modes[d.value] ?? "")}
        onValueChange={(d) => {
          onDragStart();
          const next = modes[d.value[0]];
          if (next && next !== value) onChange(next);
        }}
        onValueChangeEnd={(d) => {
          onDragEnd();
          const next = modes[d.value[0]];
          if (next) onCommit(next);
        }}
        marks={single ? undefined : modes.map((_, i) => i)}
      />
      <Text textStyle="sm" minW="5rem" textAlign="end">
        {fanModeLabel(modes[activeIndex])}
      </Text>
    </HStack>
  );
}
