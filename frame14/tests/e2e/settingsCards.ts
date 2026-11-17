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
 * browser as this one — a context a test makes itself too. A test of the
 * default asks for FRESH_DEVICE.
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

/** A browser that has kept nothing: a device opening Frame14 for the first time. */
export const FRESH_DEVICE = { cookies: [], origins: [] };
