// Two typefaces, split by job — the values live in index.css so a swap is one
// edit there plus the <link> in index.html.
//
// FONT_DISPLAY is for the large numeric readouts the frame is read at a
// distance for: the clock, temperatures, kW, percentages. Everything else
// inherits FONT_BODY from <body>, so it rarely needs to be named explicitly.

export const FONT_DISPLAY = "var(--font-display)";
export const FONT_BODY = "var(--font-body)";
