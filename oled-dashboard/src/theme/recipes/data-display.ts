import { defineRecipe, defineSlotRecipe } from "@chakra-ui/react";
import {
  dataListAnatomy,
  emptyStateAnatomy,
  progressAnatomy,
  statAnatomy,
  statusAnatomy,
  tagAnatomy,
} from "@chakra-ui/react/anatomy";

/**
 * Readouts. Stat carries every label-over-value figure in the app — the
 * modals' grids, the solar and power totals — so its sizes are the
 * dashboard's figure sizes.
 */
export const statSlotRecipe = defineSlotRecipe({
  slots: statAnatomy.keys(),
  variants: {
    size: {
      /** A detail tile in a modal grid. */
      panel: {
        root: { gap: "0.4vmin", flex: "0 1 auto", minW: "0" },
        label: {
          fontSize: "1.9vmin",
          lineHeight: "1.3",
          letterSpacing: "0.14em",
          color: "fg.faint",
        },
        valueText: {
          fontSize: "3.2vmin",
          fontWeight: "300",
          lineHeight: "1.1",
          letterSpacing: "normal",
          maxW: "100%",
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          display: "block",
        },
        valueUnit: { fontSize: "2vmin", color: "fg.faint" },
        helpText: { fontSize: "2vmin", lineHeight: "1.3", color: "fg.faint" },
      },
      /** A headline figure read across the room. */
      display: {
        root: { gap: "0.4vmin", flex: "0 1 auto", minW: "0" },
        label: {
          fontSize: "2.2vmin",
          lineHeight: "1.3",
          letterSpacing: "0.1em",
          color: "fg.faint",
        },
        valueText: {
          fontFamily: "display",
          fontSize: "7vmin",
          fontWeight: "300",
          lineHeight: "1",
          letterSpacing: "normal",
          alignItems: "baseline",
          gap: "1vmin",
        },
        valueUnit: { fontSize: "3vmin", color: "fg.faint" },
        helpText: {
          fontSize: "2.2vmin",
          lineHeight: "1.3",
          color: "fg.faint",
          letterSpacing: "0.1em",
        },
      },
    },
  },
});

/** Bars: print progress, solar coverage, circuits. */
export const progressSlotRecipe = defineSlotRecipe({
  slots: progressAnatomy.keys(),
  // Chakra's root sets textStyle "sm" — a fixed 1.25rem line that clips vmin
  // labels under `truncate`.
  base: { root: { lineHeight: "1.5" } },
  variants: {
    variant: {
      soft: {
        track: { bg: "surface.chip" },
        range: { bg: "colorPalette.solid" },
      },
    },
    size: {
      hair: { track: { h: "0.7vmin" } },
      bar: { track: { h: "0.9vmin" } },
      thick: { track: { h: "1.2vmin" } },
    },
  },
});

/** Rings: the timer face. */
export const progressCircleSlotRecipe = defineSlotRecipe({
  slots: progressAnatomy.keys(),
  variants: {
    size: {
      timer: {
        circle: { "--size": "62vmin", "--thickness": "2.2vmin" },
        valueText: { fontSize: "16vmin" },
      },
      panel: {
        circle: { "--size": "8vmin", "--thickness": "0.8vmin" },
        valueText: { fontSize: "2vmin" },
      },
    },
  },
});

/** Ambient status chips: "Printer idle", the last bird. */
export const tagSlotRecipe = defineSlotRecipe({
  slots: tagAnatomy.keys(),
  variants: {
    variant: {
      chip: {
        root: { bg: "surface.chip", color: "fg.faint" },
      },
    },
    size: {
      panel: {
        root: {
          px: "chipX",
          py: "chipY",
          minH: "0",
          gap: "1vmin",
          borderRadius: "chip",
          "--tag-element-size": "2.2vmin",
          "--tag-element-offset": "0px",
        },
        label: { fontSize: "2.2vmin", fontWeight: "300", lineClamp: "unset" },
      },
    },
  },
});

/** Small live figures in a card header: grid import/export, LIVE. */
export const badgeRecipe = defineRecipe({
  variants: {
    variant: {
      // A tinted pill. Static and on screen for hours, so it is a faint wash
      // and a faint rule, never a solid block.
      glow: {
        bg: "colorPalette.solid/8",
        color: "colorPalette.fg",
        boxShadow: "inset 0 0 0 1px {colors.colorPalette.solid/28}",
      },
    },
    size: {
      panel: {
        fontSize: "1.7vmin",
        letterSpacing: "0.06em",
        px: "1.2vmin",
        py: "0.3vmin",
        gap: "0.5vmin",
        minH: "0",
        borderRadius: "full",
      },
    },
  },
});

/** Read-only diagnostics on /control. */
export const dataListSlotRecipe = defineSlotRecipe({
  slots: dataListAnatomy.keys(),
  variants: {
    size: {
      panel: {
        root: { gap: "1.2vmin" },
        item: {
          fontSize: "2.2vmin",
          width: "100%",
          justifyContent: "space-between",
          gap: "2vmin",
        },
        itemLabel: { color: "fg.faint", flexShrink: 0, minW: "auto" },
        itemValue: {
          color: "fg.dim",
          justifyContent: "flex-end",
          textAlign: "end",
          minW: "0",
          overflowWrap: "anywhere",
        },
      },
    },
  },
});

/** Nothing to show: no game, no album, nothing playing. */
export const emptyStateSlotRecipe = defineSlotRecipe({
  slots: emptyStateAnatomy.keys(),
  variants: {
    size: {
      panel: {
        root: { px: "4vmin", py: "4vmin" },
        content: { gap: "2vmin" },
        indicator: { fontSize: "8vmin", color: "fg.faint", opacity: 0.6 },
        title: {
          fontSize: "3vmin",
          fontWeight: "400",
          color: "fg.faint",
          letterSpacing: "0.1em",
        },
        description: { fontSize: "2.2vmin", color: "fg.faint" },
      },
    },
  },
});

/** Connection dot on /control. */
export const statusSlotRecipe = defineSlotRecipe({
  slots: statusAnatomy.keys(),
  variants: {
    size: {
      panel: {
        root: { gap: "1vmin", fontSize: "1.8vmin", letterSpacing: "0.08em" },
        indicator: {
          width: "1vmin",
          height: "1vmin",
          minW: "6px",
          minH: "6px",
        },
      },
    },
  },
});
