/**
 * A card of Settings' Display and Device tabs starts out folded to its
 * header (0.173.0, the user: "All settings should be collapsed by default"),
 * its body hidden. A test of what is in one opens it first, as a tap on its
 * header would have: the same record on the device, `board-collapsed:
 * settings-<name>`. tests/setup.ts clears localStorage after each test, so
 * this goes in a `beforeEach`.
 */
export const openSettingsCard = (name: string) =>
  localStorage.setItem(`board-collapsed:settings-${name}`, "0");
