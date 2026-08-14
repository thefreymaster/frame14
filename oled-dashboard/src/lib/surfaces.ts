// Geometry for the raised-tile layout.
//
// Cards sit on the page ground with fill (--theme-surface-1) rather than an
// outline; chips are a second elevation step (--theme-surface-2) nested inside
// a card. Colours live in themeMode.ts so they follow the bright/dark swap.
//
// Sizes are vmin so they scale with the panel instead of the browser's rem —
// on a 1600×2400 frame a fixed 16px pad reads as cramped.

export const CARD_RADIUS = "0.8vmin";
export const CARD_PADDING_X = "2.6vmin";
export const CARD_PADDING_Y = "2.4vmin";

/** Modals — a card floating over the page, so one step rounder than a card. */
export const MODAL_RADIUS = "0.9vmin";

export const CHIP_RADIUS = "0.5vmin";
export const CHIP_PADDING_X = "1.6vmin";
export const CHIP_PADDING_Y = "1.2vmin";

/** Gap between cards, and the page's own outer padding. */
export const GRID_GAP = "1.5vmin";

/** Gap between chips nested inside a card. */
export const CHIP_GAP = "1.2vmin";
