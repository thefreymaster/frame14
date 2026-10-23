import { useMediaQuery } from "@chakra-ui/react";
import { getDeviceMode } from "../lib/deviceMode";
import { HOME_FOUR_COLUMN_QUERY } from "../lib/homeLayout";

/**
 * Whether a full-bleed view (Photos, Radar) sits in the page like a card —
 * inside the gutter, with the cards' corners and edge. On a desktop (the
 * four-column screens) it does; on the frame (whatever its orientation) and on
 * phones it stays full-screen.
 */
export function useFramedPage(): boolean {
  const [desktop] = useMediaQuery([HOME_FOUR_COLUMN_QUERY]);
  return desktop && getDeviceMode() !== "frame";
}
