import { APP_URL } from "./ports";

/**
 * Settings' cards that fold — every card of the Display and Device tabs —
 * by the name each is kept under on a device (`board-collapsed:settings-…`).
 */
export const SETTINGS_CARDS = [
  "display",
  "screen",
  "album",
  "account",
  "appearance",
  "notifications",
  "software",
  "navigation",
  "voice",
] as const;

/**
 * A browser that has opened every one of them. They start out folded
 * (0.173.0, the user: "All settings should be collapsed by default"), and
 * the suite is of what is in the cards: playwright.config starts every
 * browser as one of these (SUITE_DEVICE) — a context a test makes itself
 * too. A test of the default asks for FRESH_DEVICE.
 */
export const SETTINGS_OPEN = {
  cookies: [],
  origins: [
    {
      origin: APP_URL,
      localStorage: SETTINGS_CARDS.map((name) => ({
        name: `board-collapsed:settings-${name}`,
        value: "0",
      })),
    },
  ],
};

/**
 * The suite's browsers: ones that have opened every Settings card, and that
 * chose Gray — the frames' palette as a frame last heard it, and a remote's
 * own. Gray was the default until 0.176.0 (the user: "Make embossed theme
 * the default theme going forward"), and the suite is of the pages as Gray
 * draws them; what Embossed does is embossed.spec's, which wears it. The
 * server the suite runs against has Gray saved for the frames too
 * (tests/e2e/seed.mjs). A test of the default asks for FRESH_DEVICE.
 */
export const SUITE_DEVICE = {
  cookies: [],
  origins: [
    {
      origin: APP_URL,
      localStorage: [
        ...SETTINGS_OPEN.origins[0].localStorage,
        { name: "theme-palette", value: "gray" },
        { name: "local-theme-palette", value: "gray" },
      ],
    },
  ],
};

/** A browser that has kept nothing: a device opening Frame14 for the first time. */
export const FRESH_DEVICE = { cookies: [], origins: [] };
