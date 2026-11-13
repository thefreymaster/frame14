import { Field, HStack, Stack } from "@chakra-ui/react";
import { PHONE_MEDIA } from "../lib/homeLayout";
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
    <HStack gap="2" data-palette-label>
      <PaletteSwatch palette={value} />
      {PALETTES[value].label}
    </HStack>
  ),
}));

// Four palettes with their swatches are wider than a small phone's card at
// the control's own padding (0.166.0, Outlines the fourth): closer together
// there, so the row stays inside the card down to a 360px screen.
const PALETTE_CONTROL_CSS = {
  [PHONE_MEDIA]: {
    "& [data-part=item]": { px: "2" },
    "& [data-palette-label]": { gap: "1.5" },
  },
};

/**
 * A theme's two controls: Theme (Auto · Device · Bright · Dark) over Colors
 * (Gray · Slate · Sand · Outlines). The Display card's for the frames' theme and the
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
          css={PALETTE_CONTROL_CSS}
          onValueChange={(e) => {
            if (isThemePalette(e.value)) onPalette(e.value);
          }}
        />
        {helper && <Field.HelperText>{helper}</Field.HelperText>}
      </Field.Root>
    </Stack>
  );
}
