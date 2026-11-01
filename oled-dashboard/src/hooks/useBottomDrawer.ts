import { useMediaQuery } from "@chakra-ui/react";
import { HOME_ONE_COLUMN_QUERY } from "../lib/homeLayout";

/**
 * Whether a modal is a drawer from the bottom here (0.134, the user's ask:
 * "replace dialogs with drawers on mobile that come in from the bottom"): a
 * phone, the one-column screens (the theme's `phone` condition). The frame
 * and a desktop keep centred dialogs. Measured on mount (`ssr: false`), so a
 * modal's first frame is already the right kind.
 */
export function useBottomDrawer(): boolean {
  const [phone] = useMediaQuery([HOME_ONE_COLUMN_QUERY], { ssr: false });
  return phone;
}
