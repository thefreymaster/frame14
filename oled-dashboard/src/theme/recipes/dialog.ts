import { defineSlotRecipe } from "@chakra-ui/react";
import { dialogAnatomy } from "@chakra-ui/react/anatomy";

/**
 * The dashboard's three kinds of modal, as variants of Chakra's Dialog.
 *
 * Every one is a Dialog underneath, so Escape, tap-outside, focus trapping and
 * the enter/exit animation come from the library instead of being re-done per
 * modal with a closing flag and a timer.
 */
export const dialogSlotRecipe = defineSlotRecipe({
  slots: dialogAnatomy.keys(),
  variants: {
    // Declared so the default below type-checks; the styles are Chakra's.
    placement: { center: {} },
    variant: {
      /**
       * Detail panels (energy, printer, forecast): a dark sheet over a
       * near-opaque scrim. `--dialog-glow` tints the top of the scrim with the
       * subject's colour — amber for solar, green for the printer.
       */
      panel: {
        backdrop: {
          bg: "radial-gradient(ellipse at 50% 0%, var(--dialog-glow, transparent) 0%, transparent 55%), {colors.scrim}",
        },
        content: {
          bg: "surface.modal",
          color: "fg",
          // Chakra's dialog sets textStyle "sm" (a fixed 1.25rem line); at
          // vmin type sizes that clips descenders.
          lineHeight: "1.5",
          borderRadius: "modal",
          boxShadow: "none",
          p: "6vmin",
          width: "auto",
          minW: "min(70vmin, 92vw)",
          maxW: "min(90vmin, 96vw)",
          gap: "3.5vmin",
        },
        header: { p: "0", flexDirection: "column", gap: "1vmin" },
        body: {
          p: "0",
          display: "flex",
          flexDirection: "column",
          gap: "3.5vmin",
        },
        title: { fontWeight: "300" },
        closeTrigger: { top: "1.4vmin", insetEnd: "1.4vmin" },
      },
      /**
       * Full-bleed controls (thermostat, fan): no sheet at all — the dial floats
       * on a blurred scrim, and the close button sits in the screen's corner.
       */
      immersive: {
        backdrop: {
          bg: "scrim.glass",
          backdropFilter: "blur(22px) saturate(140%)",
        },
        positioner: { p: { base: "4vw", md: "4vmin" } },
        content: {
          bg: "transparent",
          boxShadow: "none",
          lineHeight: "1.5",
          width: "auto",
          maxW: "none",
          alignItems: "center",
          gap: { base: "6vw", md: "4vmin" },
        },
        closeTrigger: {
          position: "fixed",
          top: { base: "4vw", md: "3vmin" },
          insetEnd: { base: "4vw", md: "3vmin" },
        },
      },
      /**
       * The voice session. No blur here: it is expensive on this panel and it
       * lifts the black off true #000.
       */
      overlay: {
        backdrop: { bg: "rgba(0, 0, 0, 0.94)" },
        content: {
          bg: "transparent",
          boxShadow: "none",
          width: "auto",
          maxW: "90vw",
          lineHeight: "1.5",
          alignItems: "center",
          textAlign: "center",
          px: "8vmin",
          gap: "3vmin",
        },
      },
    },
  },
  defaultVariants: {
    placement: "center",
  },
});
