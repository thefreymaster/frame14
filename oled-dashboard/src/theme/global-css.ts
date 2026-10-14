import { defineGlobalStyles } from "@chakra-ui/react";

export const globalCss = defineGlobalStyles({
  "html, body, #root": {
    width: "100%",
    height: "100%",
    bg: "bg",
    color: "fg",
    fontFamily: "body",
    overflow: "hidden",
  },
  // iOS PWA: force a viewport recalc on first load so env(safe-area-inset-*)
  // and 100dvh report correctly. Without it, fixed bottom elements render at
  // the wrong offset until the device is rotated.
  html: {
    minHeight: "calc(100% + env(safe-area-inset-top))",
  },
  // A display, not a document.
  body: {
    userSelect: "none",
    WebkitUserSelect: "none",
  },
  // Every animated numeral (clock, temperature, timer, print progress) renders
  // through NumberFlow's custom element, so this one rule covers all of them.
  "number-flow-react": {
    fontFamily: "display",
  },

  // ── Home layout (HomeBoard) ───────────────────────────────────────────────
  //
  // Structural rules across HomeZone / HomeCardSlot / HomeCardFace, so they
  // live here rather than on any one component. A card that rendered nothing
  // — or only an empty box, like a status strip with no chips — takes no room
  // and no gap, and a zone or column pair left with nothing visible goes too.
  // Decided by CSS because only the DOM knows: each card chooses whether to
  // show from its own subscriptions.
  ".home-card, .home-card-body": {
    display: "flex",
    flexDirection: "column",
    minWidth: "0",
  },
  [[
    ".home-card:not([data-editing]):not(:has(> .home-card-body > :not(:empty)))",
    ".home-zone:not([data-editing]):not(:has(> .home-card > .home-card-body > :not(:empty)))",
    ".home-columns:not([data-editing]):not(:has(.home-card-body > :not(:empty)))",
  ].join(", ")]: {
    // Global styles sit in Chakra's `base` layer, below the zones' own style
    // props, so hiding has to insist.
    display: "none !important",
  },
  // Columns end where their cards do. Stretching a short card to meet a tall
  // column beside it would light a slab of empty surface — the burn-in case.

  // Arranging. Card contents go inert, so a drag never also taps a card.
  // (The board's and zones' own arranging styles are props on HomeBoard /
  // HomeZone; these are the plain-div card wrappers dnd-kit drives.)
  ".home-card[data-editing]": {
    position: "relative",
    cursor: "grab",
    touchAction: "manipulation",
    borderRadius: "card",
  },
  ".home-card[data-editing] > .home-card-body": {
    pointerEvents: "none",
    opacity: 0.8,
  },
  ".home-card[data-dragging]": {
    opacity: 0.25,
  },
  ".home-card-lifted": {
    cursor: "grabbing",
    boxShadow: "0 2vmin 6vmin rgba(0, 0, 0, 0.75)",
  },
  ".home-card-lifted[data-editing] > .home-card-body": {
    opacity: 1,
  },
  // The stand-in for a hidden card shows only while the card body is empty.
  ".home-card-body:has(> :not(:empty)) + .home-card-placeholder": {
    display: "none !important",
  },
});
