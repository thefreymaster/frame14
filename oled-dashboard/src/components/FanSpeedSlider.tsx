import { HStack, Icon, Text } from "@chakra-ui/react";
import { Slider } from "./ui/slider";
import { MdAir } from "react-icons/md";

/** Slug-ish HA fan mode name ("wind_free") → display label ("WIND FREE"). */
function fanModeLabel(mode: string) {
  return mode.replace(/[_-]+/g, " ").toUpperCase();
}

/**
 * A Chakra Slider over a climate entity's fan_modes, one step per mode.
 * Dragging updates the label; the service call fires on release
 * (onValueChangeEnd), so a drag sends one command.
 */
export function FanSpeedSlider({
  modes,
  value,
  accent,
  colorPalette,
  disabled = false,
  onChange,
  onCommit,
  onDragStart,
  onDragEnd,
}: {
  modes: string[];
  value: string | null;
  /** CSS colour for the icon and label (the thermostat's mode accent). */
  accent: string;
  /** Chakra palette for the slider itself. */
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
    <HStack
      width="100%"
      gap={{ base: "3vw", md: "1.6vmin" }}
      align="center"
      bg="rgba(0, 0, 0, 0.05)"
      _dark={{ bg: "rgba(0, 0, 0, 0.55)" }}
      boxShadow="inset 0 0 0 1px {colors.chrome.border}"
      borderRadius="full"
      px={{ base: "4vw", md: "2vmin" }}
      py={{ base: "2vw", md: "1.2vmin" }}
      opacity={disabled ? 0.5 : 1}
      transition="opacity 260ms ease"
    >
      <Icon
        color={accent}
        boxSize={{ base: "4.4vw", md: "2.4vmin" }}
        flexShrink={0}
      >
        <MdAir />
      </Icon>
      <Slider
        flex="1"
        minW="0"
        variant="rail"
        size="panel"
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
      <Text
        flexShrink={0}
        minWidth={{ base: "14vw", md: "8vmin" }}
        textAlign="right"
        fontSize={{ base: "2.4vw", md: "1.3vmin" }}
        fontWeight="600"
        letterSpacing="0.12em"
        color={accent}
        whiteSpace="nowrap"
      >
        {fanModeLabel(modes[activeIndex])}
      </Text>
    </HStack>
  );
}
