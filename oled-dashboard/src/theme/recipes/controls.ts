import { defineSlotRecipe } from "@chakra-ui/react";
import {
  nativeSelectAnatomy,
  switchAnatomy,
  tabsAnatomy,
} from "@chakra-ui/react/anatomy";

/** Switches: lights, the fan's power, the nav toggle on /control. */
export const switchSlotRecipe = defineSlotRecipe({
  slots: switchAnatomy.keys(),
  variants: {
    size: {
      panel: {
        root: {
          "--switch-width": "7vmin",
          "--switch-height": "3.8vmin",
          "--switch-indicator-font-size": "1.6vmin",
          gap: "1.5vmin",
        },
        label: {
          fontSize: "2.2vmin",
          fontWeight: "300",
          lineHeight: "1.3",
          whiteSpace: "nowrap",
        },
      },
      /** The corner pip on a light tile. */
      pip: {
        root: {
          "--switch-width": "4.4vmin",
          "--switch-height": "2.4vmin",
          "--switch-indicator-font-size": "1.2vmin",
        },
      },
    },
    variant: {
      solid: {
        control: {
          bg: "surface.card",
          _checked: {
            bg: "colorPalette.solid",
            boxShadow: "0 0 1vmin {colors.colorPalette.solid/60}",
          },
        },
        thumb: {
          bg: "fg.faint",
          boxShadow: "none",
          _checked: { bg: "colorPalette.contrast" },
        },
      },
    },
  },
});

/** The bottom bar (portrait) and side rail (landscape). */
export const tabsSlotRecipe = defineSlotRecipe({
  slots: tabsAnatomy.keys(),
  variants: {
    variant: {
      nav: {
        root: { "--tabs-height": "auto" },
        list: { width: "100%", height: "100%", gap: "4px" },
        trigger: {
          flex: "1",
          flexDirection: "column",
          justifyContent: "center",
          gap: "2px",
          px: "0",
          py: "6px",
          color: "fg.muted",
          bg: "transparent",
          fontSize: "10px",
          fontWeight: "500",
          lineHeight: "1",
          letterSpacing: "0.01em",
          transition: "color 0.15s, opacity 0.1s",
          WebkitTapHighlightColor: "transparent",
          _active: { opacity: 0.4 },
          _selected: { color: "fg", fontWeight: "600" },
          _icon: { width: "26px", height: "26px" },
          _vertical: {
            flex: "0 0 auto",
            fontSize: "9px",
            _icon: { width: "24px", height: "24px" },
          },
        },
      },
    },
  },
});

/** The album picker on /control. */
export const nativeSelectSlotRecipe = defineSlotRecipe({
  slots: nativeSelectAnatomy.keys(),
  variants: {
    variant: {
      chip: {
        field: {
          bg: "surface.chip",
          color: "fg",
          border: "none",
          borderRadius: "chip",
          fontWeight: "300",
          "& > option, & > optgroup": { bg: "surface.chip", color: "fg" },
        },
        indicator: { color: "fg.faint" },
      },
    },
    size: {
      panel: {
        field: {
          "--select-field-height": "auto",
          fontSize: "2.4vmin",
          px: "chipX",
          py: "chipY",
          pe: "6vmin",
        },
        indicator: {
          insetEnd: "chipX",
          _icon: { width: "2.6vmin", height: "2.6vmin" },
        },
      },
    },
  },
});
