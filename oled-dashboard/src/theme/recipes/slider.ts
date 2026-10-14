import { defineSlotRecipe } from "@chakra-ui/react";
import { sliderAnatomy } from "@chakra-ui/react/anatomy";

/**
 * Sliders: the thermostat's fan speed (discrete fan modes) and the fan
 * modal's vertical speed bar. Both commit on release (onValueChangeEnd), so a
 * drag sends one service call.
 */
export const sliderSlotRecipe = defineSlotRecipe({
  slots: sliderAnatomy.keys(),
  variants: {
    variant: {
      /** A thin rail with a glowing thumb in the colour palette. */
      rail: {
        track: { bg: "surface.chip" },
        range: { bg: "colorPalette.solid" },
        thumb: {
          bg: "colorPalette.solid",
          boxShadow: "0 0 1.4vmin {colors.colorPalette.solid/60}",
          _disabled: { bg: "fg.faint", boxShadow: "none" },
        },
        markerIndicator: { bg: "fg.faint" },
        marker: { color: "fg.faint" },
      },
      /**
       * A wide bar that fills from the bottom, like a lever. The thumb is only
       * a grip line — the fill is the reading.
       */
      fill: {
        track: {
          bg: "rgba(0, 0, 0, 0.08)",
          _dark: { bg: "rgba(255, 255, 255, 0.12)" },
          borderRadius: "full",
        },
        range: {
          bg: "linear-gradient(0deg, {colors.colorPalette.solid/40} 0%, {colors.colorPalette.solid} 100%)",
          boxShadow: "0 0 4vmin {colors.colorPalette.solid/20}",
        },
        thumb: {
          bg: "fg",
          opacity: 0.85,
          borderRadius: "full",
          boxShadow: "none",
        },
      },
    },
    size: {
      panel: {
        root: {
          "--slider-thumb-size": "2.4vmin",
          "--slider-track-size": "0.8vmin",
          "--slider-marker-center": "1.6vmin",
          "--slider-marker-size": "0.8vmin",
          "--slider-marker-inset": "1.6vmin",
        },
        marker: {
          fontSize: "1.3vmin",
          letterSpacing: "0.12em",
          fontWeight: "600",
        },
      },
      lever: {
        root: {
          "--slider-thumb-size": "6vmin",
          "--slider-track-size": "10vmin",
        },
        thumb: { height: "0.6vmin" },
      },
    },
  },
});
