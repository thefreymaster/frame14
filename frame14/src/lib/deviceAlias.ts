/**
 * A signed-in device's alias (0.173.0, Settings' Account card; the user:
 * "Allow for the customization of the name of a device found here", then
 * "let us set an alias"): what a row of the people list is called in place
 * of its kind of device — "Office MacBook" where the page could only say
 * Mac. The server keeps it (people.js) and sends it to everyone signed in,
 * "so not just saved to that local device"; nothing of it is kept here.
 */

/** An alias is at most this long (people.js's ALIAS_MAX — access.test.js holds them together). */
export const DEVICE_ALIAS_MAX = 40;

/** What a row is called: its alias, else the kind of device it is. */
export const deviceLabel = (person: { device: string; alias?: string }) =>
  person.alias || person.device;

/** An alias as the server will keep it: trimmed, each run of white space one space. */
export const tidyAlias = (text: string) => text.replace(/\s+/g, " ").trim();
