import { defineSemanticTokens, defineTokens } from "@chakra-ui/react";

/**
 * Geometry and type for a 1600x2400 wall panel.
 *
 * Chakra's own scale is rem, which on this panel reads as a phone UI shrunk
 * onto a poster. Everything the dashboard draws is sized in vmin instead, so it
 * scales with the short edge of whatever it is shown on — 1vmin is 16px on the
 * frame. These tokens are the shared measures; recipes (./recipes) size the
 * library components with them.
 */
export const tokens = defineTokens({
  fonts: {
    // The platform's own UI stack — nothing is fetched, so the frame paints
    // text on its first frame even with no internet.
    body: {
      value:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif',
    },
    heading: { value: "{fonts.body}" },
    // The large numeric readouts (clock, temperatures, kW, percentages). The
    // same stack today; give it its own face to bring back a second voice
    // without touching a component.
    display: { value: "{fonts.body}" },
  },
  radii: {
    /** Cards sitting on the page ground. */
    card: { value: "0.8vmin" },
    /** Chips nested inside a card — one step tighter. */
    chip: { value: "0.5vmin" },
    /** Modals float over the page, so one step rounder than a card. */
    modal: { value: "0.9vmin" },
  },
  spacing: {
    /** Gap between cards, and the page's own outer padding. */
    gutter: { value: "1.5vmin" },
    cardX: { value: "2.6vmin" },
    cardY: { value: "2.4vmin" },
    /** Space under a card's header row, before its content. */
    headerGap: { value: "1.2vmin" },
    chipX: { value: "1.6vmin" },
    chipY: { value: "1.2vmin" },
    /** Gap between chips nested inside a card. */
    chipGap: { value: "1.2vmin" },
  },
  sizes: {
    /** Width of the landscape nav rail. */
    navRail: { value: "68px" },
    /** Height of the portrait nav bar. */
    navBar: { value: "64px" },
  },
});

/**
 * The palette. `_dark` is the OLED palette; the base (`_light`) values are the
 * bright mode, a true inverse. lib/themeMode.ts decides which one is live by
 * toggling the `dark` class on <html> — auto / bright / dark — so every token
 * here, and every Chakra component, follows it without a re-render.
 */
export const semanticTokens = defineSemanticTokens({
  colors: {
    bg: {
      // The page ground never lifts: pure black on the OLED.
      DEFAULT: { value: { _light: "#FFFFFF", _dark: "#000000" } },
      // Chakra's components reach for these; map them onto the elevation
      // ladder below so library parts sit at the same luminance as ours.
      subtle: { value: "{colors.surface.card}" },
      muted: { value: "{colors.surface.chip}" },
      emphasized: { value: { _light: "#DDE3E7", _dark: "#33333A" } },
      panel: { value: "{colors.surface.card}" },
    },
    // Elevation is fill, not outline. A 1px #ffffff24 border is a static line
    // at ~14% luminance; a fill is a field at ~10%, so this is the dimmer option
    // for burn-in as well as the better-looking one. Levels are pitched for a
    // cheap tablet panel: each step is roughly double the previous fill.
    surface: {
      card: { value: { _light: "#F4F6F7", _dark: "#1A1A1F" } },
      chip: { value: { _light: "#EAEFF1", _dark: "#26262C" } },
      /** A chip that is "on" — selected, running, the soonest forecast. */
      on: { value: { _light: "#D8EFEA", _dark: "#2B3B37" } },
      /** The detail modals' panel. */
      modal: { value: { _light: "#F5F7FA", _dark: "#0A0A0A" } },
    },
    fg: {
      DEFAULT: { value: { _light: "#1A202C", _dark: "#FFFFFF" } },
      dim: { value: { _light: "#2D3748", _dark: "#CBD5E0" } },
      muted: { value: { _light: "#4A5568", _dark: "#A0AEC0" } },
      faint: { value: { _light: "#718096", _dark: "#718096" } },
      subtle: { value: "{colors.fg.faint}" },
    },
    border: {
      DEFAULT: { value: "{colors.divider}" },
    },
    divider: { value: { _light: "#CBD5E0", _dark: "#2D3240" } },
    // "This thing is on" — a lit light. Amber only reads on black, so the
    // bright palette darkens it or the icon vanishes into the card.
    accent: {
      warm: { value: { _light: "#B45309", _dark: "#FFC857" } },
    },
    // Analog clock face.
    marker: {
      cardinal: { value: { _light: "#2D3748", _dark: "#8A8A8A" } },
      hour: { value: { _light: "#718096", _dark: "#5E5E5E" } },
      minor: { value: { _light: "#CBD5E0", _dark: "#333333" } },
    },
    // Thermostat modes. Bright mode uses darker shades so they read on white.
    hvac: {
      heat: {
        value: { _light: "{colors.orange.700}", _dark: "{colors.orange.500}" },
      },
      cool: {
        value: { _light: "{colors.blue.700}", _dark: "{colors.blue.400}" },
      },
      fan: {
        value: { _light: "{colors.teal.600}", _dark: "{colors.teal.300}" },
      },
      auto: {
        value: { _light: "{colors.green.700}", _dark: "{colors.green.500}" },
      },
      off: { value: "{colors.fg.faint}" },
    },
    // Behind the detail modals: near-opaque, so the page doesn't compete.
    scrim: {
      DEFAULT: {
        value: {
          _light: "rgba(230, 235, 242, 0.96)",
          _dark: "rgba(2, 5, 10, 0.95)",
        },
      },
      // Translucent — the page stays visible through the backdrop blur.
      glass: {
        value: {
          _light: "rgba(255, 255, 255, 0.35)",
          _dark: "rgba(0, 0, 0, 0.4)",
        },
      },
    },
    // Floating round controls: modal close buttons, thermostat chrome.
    chrome: {
      bg: {
        value: {
          _light: "rgba(255, 255, 255, 0.96)",
          _dark: "rgba(14, 18, 24, 0.96)",
        },
      },
      fg: {
        value: {
          _light: "rgba(0, 0, 0, 0.78)",
          _dark: "rgba(255, 255, 255, 0.85)",
        },
      },
      border: {
        value: {
          _light: "rgba(0, 0, 0, 0.12)",
          _dark: "rgba(255, 255, 255, 0.12)",
        },
      },
    },
    // A colour palette for "on" — usable as colorPalette="warm" like any of
    // Chakra's own.
    warm: {
      solid: { value: "{colors.accent.warm}" },
      contrast: { value: { _light: "#FFFFFF", _dark: "#1A1A1F" } },
      fg: { value: "{colors.accent.warm}" },
      muted: {
        value: {
          _light: "rgba(180, 83, 9, 0.18)",
          _dark: "rgba(255, 200, 87, 0.18)",
        },
      },
      subtle: {
        value: {
          _light: "rgba(180, 83, 9, 0.1)",
          _dark: "rgba(255, 200, 87, 0.1)",
        },
      },
      emphasized: {
        value: {
          _light: "rgba(180, 83, 9, 0.28)",
          _dark: "rgba(255, 200, 87, 0.28)",
        },
      },
      focusRing: { value: "{colors.accent.warm}" },
    },
  },
});
