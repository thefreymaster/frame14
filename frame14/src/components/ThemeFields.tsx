import { Field, HStack, Stack } from "@chakra-ui/react";
import type { ThemeChoice, ThemeModePreference } from "../lib/themeMode";
import {
  isThemePalette,
  PALETTES,
  THEME_PALETTES,
  type ThemePalette,
} from "../lib/themePalettes";
import { PaletteSwatch } from "./PaletteSwatch";
import { SegmentedControl } from "./ui/segmented-control";

// Auto follows the daylight window (07:00–19:00), Device the system's light /
// dark setting — each panel its own (lib/themeMode).
const THEME_MODES: { value: ThemeModePreference; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "device", label: "Device" },
  { value: "bright", label: "Bright" },
  { value: "dark", label: "Dark" },
];

// The palettes (lib/themePalettes), each with its swatch.
const PALETTE_ITEMS = THEME_PALETTES.map((value) => ({
  value,
  label: (
    <HStack gap="2">
      <PaletteSwatch palette={value} />
      {PALETTES[value].label}
    </HStack>
  ),
}));

/**
 * A theme's two controls: Theme (Auto · Device · Bright · Dark) over Colors
 * (Gray · Slate · Sand). The Display card's for the frames' theme and the
 * Appearance card's for this device's own (0.148.0); `helper` says whose.
 */
export function ThemeFields({
  value,
  onPreference,
  onPalette,
  helper,
}: {
  value: ThemeChoice;
  onPreference: (pref: ThemeModePreference) => void;
  onPalette: (palette: ThemePalette) => void;
  helper?: string;
}) {
  return (
    <Stack gap="5">
      <Field.Root>
        <Field.Label>Theme</Field.Label>
        <SegmentedControl
          items={THEME_MODES}
          value={value.preference}
          aria-label="Theme"
          onValueChange={(e) => {
            if (e.value) onPreference(e.value as ThemeModePreference);
          }}
        />
      </Field.Root>
      <Field.Root>
        <Field.Label>Colors</Field.Label>
        <SegmentedControl
          items={PALETTE_ITEMS}
          value={value.palette}
          aria-label="Colors"
          onValueChange={(e) => {
            if (isThemePalette(e.value)) onPalette(e.value);
          }}
        />
        {helper && <Field.HelperText>{helper}</Field.HelperText>}
      </Field.Root>
    </Stack>
  );
}
