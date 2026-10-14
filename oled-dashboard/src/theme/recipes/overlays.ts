import { defineRecipe, defineSlotRecipe } from "@chakra-ui/react";
import {
  actionBarAnatomy,
  toastAnatomy,
  tooltipAnatomy,
} from "@chakra-ui/react/anatomy";

/**
 * Loading placeholders. The stock pulse uses a light grey — the one thing an
 * OLED page of pure black must not park on screen — so placeholders breathe
 * in the chip fill instead and follow the bright/dark swap.
 */
export const skeletonRecipe = defineRecipe({
  variants: {
    variant: {
      pulse: {
        background: "surface.chip",
        animationDuration: "var(--duration, 1.6s)",
      },
    },
  },
});

/** Tooltips step up one surface rather than inverting to a white slab. */
export const tooltipSlotRecipe = defineSlotRecipe({
  slots: tooltipAnatomy.keys(),
  base: {
    content: {
      "--tooltip-bg": "colors.surface.on",
      color: "fg",
      fontSize: "clamp(12px, 1.8vmin, 24px)",
      lineHeight: "1.3",
      fontWeight: "400",
      px: "1.4vmin",
      py: "0.8vmin",
      borderRadius: "chip",
      boxShadow: "0 1vmin 3vmin rgba(0, 0, 0, 0.6)",
    },
  },
});

/** Toasts: neutral chips; the type shows in the indicator, not a slab of colour. */
export const toastSlotRecipe = defineSlotRecipe({
  slots: toastAnatomy.keys(),
  base: {
    root: {
      bg: "surface.chip",
      color: "fg",
      gap: "1.4vmin",
      py: "1.8vmin",
      ps: "2vmin",
      pe: "3vmin",
      borderRadius: "card",
      boxShadow: "0 1vmin 4vmin rgba(0, 0, 0, 0.7)",
      "&[data-type=warning], &[data-type=success], &[data-type=error], &[data-type=info]":
        {
          bg: "surface.chip",
          color: "fg",
        },
    },
    title: {
      fontSize: "clamp(14px, 2.2vmin, 28px)",
      lineHeight: "1.3",
      fontWeight: "500",
    },
    description: {
      fontSize: "clamp(12px, 1.9vmin, 24px)",
      lineHeight: "1.4",
      color: "fg.dim",
    },
    indicator: {
      boxSize: "clamp(18px, 2.6vmin, 32px)",
      "[data-type=success] &": { color: "fg.success" },
      "[data-type=error] &": { color: "fg.error" },
      "[data-type=warning] &": { color: "fg.warning" },
      "[data-type=info] &": { color: "fg.info" },
    },
  },
});

/**
 * The bar shown while arranging /home. It clears the portrait nav bar; the
 * landscape rail is at the side, so there it sits on the bottom edge.
 */
export const actionBarSlotRecipe = defineSlotRecipe({
  slots: actionBarAnatomy.keys(),
  base: {
    positioner: {
      "--action-bar-offset": "spacing.gutter",
      zIndex: "95",
    },
    content: {
      bg: "surface.chip",
      borderRadius: "full",
      gap: "clamp(8px, 1.4vmin, 20px)",
      ps: "clamp(16px, 2.6vmin, 36px)",
      pe: "clamp(6px, 1vmin, 14px)",
      py: "clamp(6px, 1vmin, 14px)",
      boxShadow: "0 1vmin 4vmin rgba(0, 0, 0, 0.7)",
    },
  },
  variants: {
    placement: {
      bottom: {
        positioner: {
          bottom: {
            base: "calc(env(safe-area-inset-bottom, 0px) + var(--action-bar-offset))",
            _portrait:
              "calc({sizes.navBar} + env(safe-area-inset-bottom, 0px) + var(--action-bar-offset))",
          },
        },
      },
    },
  },
});
