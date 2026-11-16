"use client";

import {
  ChakraProvider,
  createSystem,
  defaultConfig,
  defineConfig,
} from "@chakra-ui/react";
import {
  cardAnatomy,
  progressAnatomy,
  segmentGroupAnatomy,
  tabsAnatomy,
  toastAnatomy,
} from "@chakra-ui/react/anatomy";
import { ColorModeProvider } from "./color-mode";
import { PHONE_MEDIA } from "../../lib/homeLayout";
import { pressable, PRESSING, type Tween } from "../../lib/press";
import {
  PALETTE_STEPS,
  PALETTES,
  THEME_PALETTES,
  type PaletteColors,
} from "../../lib/themePalettes";
import { useThemeMode } from "../../hooks/useThemeMode";

// Every palette but Chakra's own gray, each a condition on <html
// data-palette> (lib/themeMode sets it): `_slate`, `_outlines`,
// `_embossed`.
const TINTS = THEME_PALETTES.filter((p) => p !== "gray");
// The palettes whose cards are an outline and nothing else (Outlines).
const OUTLINED = THEME_PALETTES.filter((p) => PALETTES[p].outlined);
// The palettes whose cards are pressed into the page (Embossed).
const EMBOSSED = THEME_PALETTES.filter((p) => PALETTES[p].embossed);
// A recess, as a shadow: the shade its top edge throws inside it, and the
// light on its lower lip, just outside. In rem, so it is as deep on the
// frame's larger type as on a phone. Its two colours are tokens of their own
// (`emboss.shade` / `emboss.lip`) because they differ by mode, and a palette's
// token value can't nest one (see lib/themePalettes). A card wears the two
// halves as one shadow; a dial wears them apart, either side of its ring
// (the `recess.shade` / `recess.lip` shadows below).
const EMBOSSED_SHADE =
  "inset 0 0.1875rem 0.4375rem {colors.emboss.shade}, inset 0 0 0.0625rem {colors.emboss.shade}";
const EMBOSSED_LIP = "0 0.0625rem 0 {colors.emboss.lip}";
const EMBOSSED_SHADOW = `${EMBOSSED_SHADE}, ${EMBOSSED_LIP}`;
// And its opposite, for what stands up out of a recess — a button, a tile
// that is one (0.171.1, the user: "instead of having the buttons feel
// indented, change them to feel like convexed popping out, so inverted of
// the embossed feel"): the shadow it casts on the floor of the card under
// it, and nothing inside it — it had a bevel too for a version, a line of
// light inside its top edge and one of shade inside its lower one, which
// the user had taken off (0.171.2, of the header's buttons: "Can we get rid
// of the little top and bottom inside shadow").
const RAISED_DROP =
  "0 0.125rem 0.25rem {colors.emboss.cast}, 0 0 0.0625rem {colors.emboss.cast}";

// A shadow of nothing: what `none` is, where `none` can't be written — as
// one layer of a longer shadow.
const NO_SHADOW = "0 0 0 0 transparent";

/** A shadow only the palettes that press things in have. */
function embossedOnly(shadow: string, otherwise = "none") {
  return {
    value: {
      base: otherwise,
      ...Object.fromEntries(EMBOSSED.map((p) => [`_${p}`, shadow])),
    },
  };
}

// What a button animates besides its press (lib/press): Chakra's `common`
// transition, at its `moderate` pace, as the recipe had it.
const BUTTON_TWEENS: Tween[] = [
  "background-color",
  "border-color",
  "color",
  "fill",
  "stroke",
  "opacity",
  "box-shadow",
  "translate",
  "transform",
].map((property) => [property, "{durations.moderate}"] as const);

// A button with no face of its own (ghost, plain) has no top edge to shade:
// held down it goes in without the shadow — and nothing to stand up, where
// buttons do (Embossed).
const UNSHADED = { _after: { display: "none" }, boxShadow: "none" };

// A tab and a segment of a segmented control go in under a finger too: a
// word, or an icon over one, with nothing round it to shade.
const UNFACED_PRESS = pressable("button", { shade: false });

/**
 * One neutral as a token per palette: Chakra's value as the base, each tint's
 * under its condition.
 */
function paletteToken(pick: (colors: PaletteColors) => string) {
  return {
    value: {
      base: pick(PALETTES.gray),
      ...Object.fromEntries(TINTS.map((p) => [`_${p}`, pick(PALETTES[p])])),
    },
  };
}

/**
 * Chakra's stock system with a few additions.
 *
 * Buttons and segmented controls have a tile's corner: `sm`, the inner
 * radius of the tiles in a card — a thermostat's, a light's — not the card's
 * own (0.169.1, the user: "it should've been the inner radius, like on the
 * thermostats"; 0.169.0 had given them the cards' `surface` radius, and they
 * were fully rounded before that, pills and circles). It is on the button
 * recipe, which also drives IconButton and CloseButton, and on a segmented
 * control's track and indicator. The value is Chakra's own for both (`l2`);
 * it is named here as the tiles name it, so the two are one.
 * Buttons go in under a finger (0.170.0, lib/press's `pressable`): smaller
 * while held, shaded along the top edge by the `press` shadow, and sprung
 * back when let go. A ghost button, which has no fill until a pointer is over
 * it — and a touch never is — takes its hover fill while held instead of the
 * shade. Tabs (the navs' entries among them) and a segmented control's
 * segments go in the same way, unshaded. In Embossed, where the cards are
 * pressed into the page, a button with a face stands up out of its card
 * (0.171.1, the `raised` shadow: what it casts on the card) and, held, is
 * pushed in — the cards' recess, in place of the `press` shade.
 * Progress bars stay pills (0.138.1, the user's ask): the `full` shape for
 * the track, and the range rounded with it, so the fill ends round rather
 * than cut square by the track's clip — and the logo's blue (0.139, "matching
 * the logo"): the `brand` palette below, the app icon's #18a0ff, the recipe's
 * default colorPalette, so a task's progress is blue everywhere (the print
 * job's, the install's, a circuit's) unless a card says otherwise (a battery,
 * a wear part, where the colour is the warning).
 *
 * Cards have the `bg.surface` colour (#1C1C1E in dark mode), `surface`
 * corners (0.75rem) and a 1px `border.surface` edge, both floating navs' too;
 * the corners replace the Card recipe's `l3`. Tiles inside a card set Chakra's
 * smaller `sm` themselves, so none is rounder than its card (the thermostat
 * tiles excepted).
 *
 * Dialog and drawer backdrops (a phone's and the frame's modals since 0.134 /
 * 0.135, see components/Modal) dim the page behind them and nothing more:
 * their 4px blur (2px for a day in 0.135) went in 0.135.1 — the frame's
 * browser recomputed the full-screen backdrop-filter on every frame of a
 * drawer's slide, and the user chose speed over it.
 *
 * Toasts are outlined, not solid (0.125, the user's ask): every type keeps the
 * panel face and `fg` text, with a 1px border in its colour — green, red,
 * orange — where Chakra fills the whole toast with it; the snippet
 * (ui/toaster.tsx) colours the indicator to match.
 *
 * The neutrals come in palettes (lib/themePalettes, the user's ask: "a slate
 * mode that is blue grays and another you make up" — that other, Sand, went
 * again in 0.169.0): Chakra's gray, Slate,
 * Outlines (0.166.0: gray, its cards and navs drawn by their edge
 * alone — the page's colour, and the `surface` shadow none) and Embossed
 * (0.168.0: gray, its cards and navs pressed into the page — the `surface`
 * shadow an inner one, EMBOSSED_SHADOW). The gray scale
 * is redefined as semantic tokens whose base is Chakra's own value and whose
 * `_slate` / `_outlines` / `_embossed` conditions (`<html
 * data-palette>`) are the palette's, so everything Chakra builds on gray — bg, fg, border, the
 * gray colorPalette — and every `gray.N` here follows; `neutral.paper` (the
 * light page, where Chakra has white), `neutral.ink` (the dark page and the
 * light text, Chakra's black) and `neutral.card` (the dark cards, #1C1C1E in
 * gray) carry what isn't on the scale. In the gray palette every value is
 * Chakra's but the paper, a soft gray under the white cards (0.164.0).
 *
 * Spacing has a named `xs` (0.25rem, 4px at the base size), `sm` (0.5rem) and
 * `md` (1rem), and `gutter`, the page's padding around the cards and the gap
 * between them — the same, always: md, or sm on a phone (the `phone`
 * condition, PHONE_MEDIA: the one-column screens).
 */
const system = createSystem(
  defaultConfig,
  defineConfig({
    conditions: {
      phone: PHONE_MEDIA,
      ...Object.fromEntries(TINTS.map((p) => [p, `[data-palette=${p}] &`])),
    },
    theme: {
      tokens: {
        spacing: {
          xs: { value: "0.25rem" },
          sm: { value: "0.5rem" },
          md: { value: "1rem" },
        },
        radii: { surface: { value: "0.75rem" } },
      },
      semanticTokens: {
        colors: {
          // The palette's neutrals (see above).
          gray: Object.fromEntries(
            PALETTE_STEPS.map((step) => [
              step,
              paletteToken((c) => c.scale[step]),
            ]),
          ),
          neutral: {
            paper: paletteToken((c) => c.paper),
            ink: paletteToken((c) => c.ink),
            card: paletteToken((c) => c.card),
          },
          // A recess's shade and the light on its lip (EMBOSSED_SHADOW): black
          // and white at what each mode can show — a white card takes little
          // shade, a charcoal page gives back little light.
          emboss: {
            shade: {
              value: { _light: "{colors.blackAlpha.400}", _dark: "{colors.blackAlpha.900}" },
            },
            lip: {
              value: { _light: "{colors.white}", _dark: "{colors.whiteAlpha.200}" },
            },
            // The shadow a raised button casts: lighter than a recess's,
            // which falls inside a card — this falls on the card's floor,
            // and by day a white one shows every bit of it.
            cast: {
              value: { _light: "{colors.blackAlpha.300}", _dark: "{colors.blackAlpha.800}" },
            },
            // The face of whatever stands up where buttons do (Embossed):
            // the header's own buttons' colour, the gray palette's `subtle`
            // (0.171.2, the user: "All buttons should be the same style and
            // color as the header buttons. I like those the best"). `tile`
            // for a tile, whose face is the panel's in every other palette;
            // `face` for what has none of its own there — an outline button,
            // a lit light's tile under its colour.
            tile: {
              value: {
                base: "{colors.bg.panel}",
                ...Object.fromEntries(
                  EMBOSSED.map((p) => [`_${p}`, "{colors.gray.subtle}"]),
                ),
              },
            },
            face: {
              value: {
                base: "transparent",
                ...Object.fromEntries(
                  EMBOSSED.map((p) => [`_${p}`, "{colors.gray.subtle}"]),
                ),
              },
            },
          },
          // The logo's blue as a palette: `colorPalette="brand"`.
          brand: {
            solid: { value: "#18a0ff" },
            contrast: { value: "white" },
            fg: { value: { _light: "#0b78d4", _dark: "#5bb8ff" } },
            subtle: { value: "rgba(24, 160, 255, 0.14)" },
            muted: { value: "rgba(24, 160, 255, 0.28)" },
            emphasized: { value: "rgba(24, 160, 255, 0.45)" },
            focusRing: { value: "#18a0ff" },
          },
          bg: {
            // The page: the palette's paper / ink, where Chakra has white /
            // black.
            DEFAULT: {
              value: {
                _light: "{colors.neutral.paper}",
                _dark: "{colors.neutral.ink}",
              },
            },
            // The colour of every card and both floating navs: in dark mode
            // iOS's grouped-cell grey, #1C1C1E (UIKit's
            // secondarySystemGroupedBackground, the Settings app's groups on
            // black; the user's pick in 0.71, replacing #23242b), Chakra's own
            // panel white in light mode. Another palette's card in dark mode
            // (`neutral.card`).
            surface: {
              value: {
                _light: "{colors.bg.panel}",
                _dark: "{colors.neutral.card}",
              },
            },
          },
          // The text: Chakra's black in light mode, the palette's ink.
          fg: {
            DEFAULT: {
              value: {
                _light: "{colors.neutral.ink}",
                _dark: "{colors.gray.50}",
              },
            },
          },
          border: {
            // The 1px edge every card and both floating navs share.
            surface: {
              value: {
                _light: "{colors.gray.200}",
                _dark: "{colors.gray.700}",
              },
            },
          },
        },
        shadows: {
          // The shade under every card and both floating navs (lib/
          // floatingSurface's SURFACE_SHADOW): Chakra's `lg`, none in a
          // palette that draws them by their outline alone, and the recess
          // in one that presses them into the page.
          surface: {
            value: {
              base: "{shadows.lg}",
              ...Object.fromEntries(OUTLINED.map((p) => [`_${p}`, "none"])),
              ...Object.fromEntries(
                EMBOSSED.map((p) => [`_${p}`, EMBOSSED_SHADOW]),
              ),
            },
          },
          // That recess's halves on their own (lib/floatingSurface's
          // RECESS_SHADE / RECESS_LIP), for a box with a rim wider than a
          // card's edge — a dial's ring: the shade goes inside the rim, the
          // lip outside it. None where nothing is pressed in.
          // The whole recess, and its lip as one layer of a longer shadow
          // (`edge`: a shadow of nothing where the others are `none`), are
          // what a raised button and tile wear while they are held down.
          recess: {
            DEFAULT: embossedOnly(EMBOSSED_SHADOW),
            shade: embossedOnly(EMBOSSED_SHADE),
            lip: embossedOnly(EMBOSSED_LIP),
            edge: embossedOnly(EMBOSSED_LIP, NO_SHADOW),
          },
          // What stands up out of a recess (lib/floatingSurface) casts a
          // shadow on it: the button recipe below wears it, and a tile's
          // own box. `edge` is the same as one layer of a longer shadow,
          // after a tile's ring: a shadow of nothing where the other is
          // `none`. None of it outside Embossed.
          raised: {
            DEFAULT: embossedOnly(RAISED_DROP),
            edge: embossedOnly(RAISED_DROP, NO_SHADOW),
          },
          // The shade inside the top edge of anything held down (lib/press):
          // a recess's, a little shallower. Not where buttons stand up
          // (Embossed): there a held button wears the recess itself.
          press: {
            value: {
              base: "inset 0 0.125rem 0.3125rem {colors.emboss.shade}",
              ...Object.fromEntries(EMBOSSED.map((p) => [`_${p}`, "none"])),
            },
          },
        },
        spacing: {
          gutter: { value: { base: "{spacing.md}", _phone: "{spacing.sm}" } },
        },
        // The outline of a tile or an outline button: none where buttons
        // stand up (Embossed), as the header's own have none — "Let's get
        // rid of the borders actually" (0.171.2).
        borderWidths: {
          edge: {
            value: {
              base: "1px",
              ...Object.fromEntries(EMBOSSED.map((p) => [`_${p}`, "0px"])),
            },
          },
        },
      },
      recipes: {
        button: {
          base: {
            borderRadius: "sm",
            // Standing up out of its card where the cards are pressed in
            // (Embossed: the `raised` shadow, none elsewhere) — through a
            // variable, so that held down it goes from pushed out to pushed
            // in, as a real button does ("When pressed it would go from
            // pushing out to pushing in like a real button"): the cards'
            // own recess. A variant with a shadow of its own (surface, whose
            // edge it is) keeps that.
            boxShadow: "var(--button-shadow, {shadows.raised})",
            ...pressable("button", {
              also: BUTTON_TWEENS,
              held: { "--button-shadow": "shadows.recess" },
            }),
          },
          variants: {
            variant: {
              ghost: {
                ...UNSHADED,
                [`&[${PRESSING}]`]: { bg: "colorPalette.subtle" },
              },
              plain: UNSHADED,
              // An outline button is its outline on its card's colour: where
              // buttons stand up (Embossed) it is as the header's are — their
              // colour, and no outline — and as the recipe has it in every
              // other palette.
              outline: { bg: "emboss.face", borderWidth: "edge" },
            },
          },
        },
      },
      slotRecipes: {
        card: {
          slots: cardAnatomy.keys(),
          base: { root: { borderRadius: "surface" } },
        },
        segmentGroup: {
          slots: segmentGroupAnatomy.keys(),
          base: {
            root: { "--segment-radius": "radii.sm" },
            item: UNFACED_PRESS,
          },
        },
        // Both navs' entries are tabs too.
        tabs: {
          slots: tabsAnatomy.keys(),
          base: { trigger: UNFACED_PRESS },
        },
        progress: {
          slots: progressAnatomy.keys(),
          base: {
            root: { colorPalette: "brand" },
            range: { borderRadius: "full" },
          },
          defaultVariants: { shape: "full" },
        },
        toast: {
          slots: toastAnatomy.keys(),
          base: {
            root: {
              borderWidth: "1px",
              borderColor: "border",
              boxShadow: "lg",
              ...Object.fromEntries(
                (
                  [
                    ["warning", "orange"],
                    ["success", "green"],
                    ["error", "red"],
                  ] as const
                ).map(([type, palette]) => [
                  `&[data-type=${type}]`,
                  {
                    bg: "bg.panel",
                    color: "fg",
                    borderColor: `${palette}.solid`,
                    "--toast-trigger-bg": "colors.bg.muted",
                    "--toast-border-color": "colors.border",
                  },
                ]),
              ),
            },
          },
        },
      },
    },
  }),
);

/**
 * The dashboard's Auto / Device / Bright / Dark preference (lib/themeMode.ts —
 * the daylight window, the system's setting and the socket sync) picks
 * Chakra's own light or dark mode; the palette is on <html> (see above).
 * next-themes leaves `color-scheme` to lib/themeMode: its plain `light` let
 * Android's WebView darken a Bright page (0.163.2).
 */
export function Provider({ children }: { children: React.ReactNode }) {
  const { effectiveMode } = useThemeMode();
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider
        forcedTheme={effectiveMode === "bright" ? "light" : "dark"}
        enableColorScheme={false}
      >
        {children}
      </ColorModeProvider>
    </ChakraProvider>
  );
}
