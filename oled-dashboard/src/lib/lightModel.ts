// What a light entity can do and what it looks like right now, shared by the
// Lights tiles and the light dialog. Colours here are data (the light's own
// colour), like team colours: they are not Chakra tokens.

export type RGB = [number, number, number];

export type LightAttrs = {
  friendly_name?: string;
  /** 0–255; null while the light is off. */
  brightness?: number | null;
  color_mode?: string | null;
  supported_color_modes?: string[];
  /** Home Assistant fills this in every colour mode, white temperatures too. */
  rgb_color?: RGB | null;
  color_temp_kelvin?: number | null;
  min_color_temp_kelvin?: number;
  max_color_temp_kelvin?: number;
};

const COLOR_MODES = new Set(["hs", "xy", "rgb", "rgbw", "rgbww"]);

/**
 * What the light supports, from its supported_color_modes. Any mode but
 * `onoff` means it dims; switches and plain on/off lights support nothing.
 */
export function lightFeatures(a: LightAttrs | undefined) {
  const modes = a?.supported_color_modes ?? [];
  return {
    brightness: modes.some((m) => m !== "onoff"),
    colorTemp: modes.includes("color_temp"),
    color: modes.some((m) => COLOR_MODES.has(m)),
  };
}

/** Brightness as 1–100, or null when the light doesn't report one. */
export function brightnessPct(a: LightAttrs | undefined): number | null {
  if (a?.brightness == null) return null;
  return Math.max(1, Math.round((a.brightness / 255) * 100));
}

/** The colour an on light without one of its own (a switch, a plain bulb) shows. */
export const DEFAULT_ON_COLOR: RGB = [255, 196, 0];

/** The light's current colour while on, or null while off. */
export function lightColor(on: boolean, a: LightAttrs | undefined): RGB | null {
  if (!on) return null;
  return a?.rgb_color ?? DEFAULT_ON_COLOR;
}

export function rgba([r, g, b]: RGB, alpha = 1): string {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Black or white, whichever reads on top of the colour. */
export function inkOn([r, g, b]: RGB): string {
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.5 ? "black" : "white";
}

/** Approximate colour of a white temperature, for its swatch. */
export function kelvinToRgb(kelvin: number): RGB {
  const t = kelvin / 100;
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g =
    t <= 66
      ? 99.4708025861 * Math.log(t) - 161.1195681661
      : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b =
    t >= 66
      ? 255
      : t <= 19
        ? 0
        : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [clamp(r), clamp(g), clamp(b)];
}

export const WARMTH_PRESETS: { kelvin: number; label: string }[] = [
  { kelvin: 2200, label: "Candle" },
  { kelvin: 2700, label: "Warm" },
  { kelvin: 4000, label: "Neutral" },
  { kelvin: 6500, label: "Daylight" },
];

/** The white presets a light can reach, inside its own temperature range. */
export function warmthPresets(a: LightAttrs | undefined) {
  const min = a?.min_color_temp_kelvin ?? 2000;
  const max = a?.max_color_temp_kelvin ?? 6500;
  return WARMTH_PRESETS.filter((p) => p.kelvin >= min && p.kelvin <= max);
}

export const COLOR_PRESETS: { rgb: RGB; label: string }[] = [
  { rgb: [255, 59, 48], label: "Red" },
  { rgb: [255, 149, 0], label: "Orange" },
  { rgb: [255, 204, 0], label: "Yellow" },
  { rgb: [52, 199, 89], label: "Green" },
  { rgb: [50, 173, 230], label: "Cyan" },
  { rgb: [0, 122, 255], label: "Blue" },
  { rgb: [175, 82, 222], label: "Purple" },
  { rgb: [255, 45, 85], label: "Pink" },
];

/** Whether the light is showing this white preset now. */
export function isWarmth(a: LightAttrs | undefined, kelvin: number): boolean {
  return (
    a?.color_mode === "color_temp" &&
    a.color_temp_kelvin != null &&
    Math.abs(a.color_temp_kelvin - kelvin) < 150
  );
}

/**
 * Whether the light is showing (roughly) this colour now. Home Assistant hands
 * back the colour after its own conversion, so it rarely matches exactly.
 */
export function isColor(a: LightAttrs | undefined, rgb: RGB): boolean {
  if (!a?.color_mode || !COLOR_MODES.has(a.color_mode) || !a.rgb_color) {
    return false;
  }
  const [r, g, b] = a.rgb_color;
  return Math.hypot(r - rgb[0], g - rgb[1], b - rgb[2]) < 60;
}
