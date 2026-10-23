import { useMediaQuery } from "@chakra-ui/react";
import { isMobileUserAgent } from "../lib/deviceMode";
import { HOME_FOUR_COLUMN_QUERY } from "../lib/homeLayout";

/**
 * Whether this is a desktop: a four-column screen (HOME_FOUR_COLUMN_QUERY) in
 * a browser that isn't a phone's or Android's. The kitchen frame is an Android
 * tablet (and portrait), so it never counts, whatever its orientation. Device
 * mode doesn't decide it: a desktop browser defaults to frame mode, and the
 * user's Mac runs in it.
 *
 * There, the full-bleed views (Photos, Radar) sit in the page like a card, and
 * the header shows the clock; phones and the frame get neither.
 */
export function useDesktop(): boolean {
  const [desktop] = useMediaQuery([HOME_FOUR_COLUMN_QUERY]);
  return desktop && !isMobileUserAgent();
}
