import { useMediaQuery } from "@chakra-ui/react";
import { getDeviceMode } from "../lib/deviceMode";
import { HOME_FOUR_COLUMN_QUERY } from "../lib/homeLayout";

/**
 * Whether this is a desktop: a four-column screen (HOME_FOUR_COLUMN_QUERY)
 * that isn't a frame — the frame stays a frame whatever its orientation.
 * There, the full-bleed views (Photos, Radar) sit in the page like a card,
 * and the header shows the clock; phones and the frame get neither.
 */
export function useDesktop(): boolean {
  const [desktop] = useMediaQuery([HOME_FOUR_COLUMN_QUERY]);
  return desktop && getDeviceMode() !== "frame";
}
