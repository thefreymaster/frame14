import { useDesktop } from "./useDesktop";

/**
 * Whether a modal is a drawer from the bottom here (0.134, the user's ask:
 * "replace dialogs with drawers on mobile that come in from the bottom"; 0.135:
 * "make dialogs into drawers on the frame14 also"): anything but a desktop
 * (useDesktop) — a phone and the frame, the screens that are touched. A
 * desktop keeps centred dialogs. useDesktop settles after the first render,
 * but every modal's Root is mounted long before it opens, so an open modal is
 * always the right kind.
 */
export function useBottomDrawer(): boolean {
  return !useDesktop();
}
