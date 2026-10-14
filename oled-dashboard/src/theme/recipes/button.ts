import { defineRecipe } from "@chakra-ui/react";

const press = {
  _active: { transform: "scale(0.97)", opacity: 0.85 },
  transitionProperty: "background-color, color, transform, opacity",
  transitionDuration: "fast",
  WebkitTapHighlightColor: "transparent",
} as const;

/**
 * Extra variants and vmin sizes for Button / IconButton / CloseButton.
 *
 * Merged into Chakra's own button recipe, so `solid`, `ghost` and friends keep
 * working; these add the dashboard's surfaces.
 */
export const buttonRecipe = defineRecipe({
  variants: {
    variant: {
      /**
       * The pressable chip: a second elevation step inside a card. Selected is
       * a fill change (`aria-pressed`), never a border — a border on an OLED
       * is a static bright line, and it vanishes on the bright palette.
       */
      chip: {
        bg: "surface.chip",
        color: "fg.dim",
        fontWeight: "300",
        _pressed: { bg: "surface.on", color: "fg", fontWeight: "500" },
        ...press,
      },
      /** A card-level control floating on the page (the mic button). */
      raised: {
        bg: "surface.card",
        color: "fg.faint",
        _pressed: { bg: "surface.on", color: "fg" },
        ...press,
      },
      /** Round chrome on a modal: close, thermostat steps. */
      chrome: {
        bg: "chrome.bg",
        color: "chrome.fg",
        borderColor: "chrome.border",
        borderWidth: "1px",
        _hover: { transform: "scale(1.04)" },
        ...press,
      },
      /** Over a photo or poster, which can be any colour. */
      glass: {
        bg: "rgba(0, 0, 0, 0.4)",
        color: "rgba(255, 255, 255, 0.85)",
        borderColor: "rgba(255, 255, 255, 0.15)",
        borderWidth: "1px",
        backdropFilter: "blur(8px)",
        _active: { opacity: 0.5 },
      },
    },
    size: {
      /** Chip padding — a row control inside a card. */
      chip: {
        h: "auto",
        minW: "0",
        px: "chipX",
        py: "chipY",
        gap: "1vmin",
        fontSize: "2.2vmin",
        borderRadius: "chip",
        _icon: { width: "1.2em", height: "1.2em" },
      },
      /** Square tile — the view grid on /control. */
      tile: {
        h: "auto",
        minW: "0",
        aspectRatio: "1",
        flexDirection: "column",
        gap: "1vmin",
        px: "chipX",
        fontSize: "2.2vmin",
        borderRadius: "card",
        whiteSpace: "normal",
        _icon: { width: "5vmin", height: "5vmin" },
      },
      /** Wall-panel touch target, whatever the screen. */
      fab: {
        w: "clamp(56px, 9vmin, 88px)",
        h: "clamp(56px, 9vmin, 88px)",
        minW: "0",
        borderRadius: "full",
        _icon: {
          width: "clamp(24px, 4vmin, 38px)",
          height: "clamp(24px, 4vmin, 38px)",
        },
      },
      /** A modal's close button. */
      chrome: {
        w: "clamp(2.75rem, 6.5vmin, 3.5rem)",
        h: "clamp(2.75rem, 6.5vmin, 3.5rem)",
        minW: "0",
        borderRadius: "full",
        _icon: {
          width: "clamp(1.25rem, 2.8vmin, 1.75rem)",
          height: "clamp(1.25rem, 2.8vmin, 1.75rem)",
        },
      },
      /** The arranging bar's Reset / Done. */
      toolbar: {
        h: "clamp(40px, 5.6vmin, 72px)",
        minW: "0",
        px: "clamp(16px, 2.6vmin, 36px)",
        fontSize: "clamp(14px, 2vmin, 26px)",
        borderRadius: "full",
        letterSpacing: "0.04em",
      },
    },
  },
});
