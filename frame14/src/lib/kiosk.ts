/**
 * Whether this page is in Fully Kiosk Browser — the wall's frame — by the
 * JavaScript interface it gives a page (`window.fully`). A link out of the
 * app is no good there: the kiosk has no tabs, and a tap would take the wall
 * away from the dashboard with nothing on screen to bring it back. Read as
 * something is drawn, not as the module loads.
 */
export function isKiosk(): boolean {
  return typeof window !== "undefined" && window.fully != null;
}
