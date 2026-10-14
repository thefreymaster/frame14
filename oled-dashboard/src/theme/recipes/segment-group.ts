import { defineSlotRecipe } from "@chakra-ui/react";
import { segmentGroupAnatomy } from "@chakra-ui/react/anatomy";

/**
 * Segmented controls: theme mode, device mode, the solar chart's toggles, the
 * timer presets and the thermostat's HEAT / COOL / FAN / OFF.
 *
 * The indicator is the selection — it slides between items — so items never
 * need their own selected fill.
 */
export const segmentGroupSlotRecipe = defineSlotRecipe({
  slots: segmentGroupAnatomy.keys(),
  variants: {
    variant: {
      /** A row of chips inside a card. */
      chip: {
        root: {
          "--segment-radius": "radii.chip",
          "--segment-indicator-bg": "colors.surface.on",
          "--segment-indicator-shadow": "none",
          bg: "surface.chip",
          boxShadow: "none",
          gap: "0.6vmin",
          p: "0.6vmin",
          borderRadius: "calc(var(--segment-radius) + 0.6vmin)",
        },
        item: {
          color: "fg.dim",
          fontWeight: "300",
          cursor: "pointer",
          _before: { display: "none" },
          _checked: { color: "fg", fontWeight: "500" },
        },
      },
      /**
       * The thermostat's mode pill. The indicator is an outline in the mode's
       * own colour (`--segment-accent`, set per mode by the caller) and each
       * item lights in its colour (`--item-accent`) when chosen.
       */
      pill: {
        root: {
          "--segment-radius": "radii.full",
          "--segment-indicator-bg": "transparent",
          "--segment-indicator-shadow":
            "inset 0 0 0 1px var(--segment-accent, currentColor)",
          bg: "rgba(0, 0, 0, 0.05)",
          _dark: { bg: "rgba(0, 0, 0, 0.55)" },
          boxShadow: "inset 0 0 0 1px {colors.chrome.border}",
          p: "3px",
        },
        item: {
          flexDirection: "column",
          gap: "2px",
          color: "fg.faint",
          cursor: "pointer",
          transition: "color 260ms ease",
          _before: { display: "none" },
          _checked: { color: "var(--item-accent, {colors.fg})" },
        },
        indicator: {
          transition:
            "left 320ms cubic-bezier(0.32, 0.72, 0.2, 1), width 320ms ease, box-shadow 280ms ease",
        },
      },
    },
    size: {
      panel: {
        item: {
          fontSize: "2.2vmin",
          letterSpacing: "0.02em",
          px: "chipX",
          py: "chipY",
          h: "auto",
          gap: "1vmin",
          whiteSpace: "nowrap",
        },
      },
      compact: {
        item: {
          fontSize: "2vmin",
          letterSpacing: "0.08em",
          px: "2.4vmin",
          py: "0.9vmin",
          h: "auto",
        },
      },
      dial: {
        item: {
          fontSize: "22px",
          py: "8px",
          px: "0",
          h: "auto",
          "& [data-part=item-text]": {
            fontSize: "10px",
            lineHeight: "1",
            fontWeight: "600",
            letterSpacing: "0.12em",
          },
        },
      },
    },
    fitted: {
      true: {
        root: { display: "flex", width: "100%", minW: "0" },
        // Equal shares of a narrow card: let a long label wrap rather than
        // spill into its neighbour.
        item: { flex: "1", minW: "0", whiteSpace: "normal", lineHeight: "1.2" },
      },
    },
  },
  defaultVariants: {
    variant: "chip",
    size: "panel",
  },
});
