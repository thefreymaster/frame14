/** The add-on version this bundle was built as (vite.config.ts). */
declare const __APP_VERSION__: string;

interface Window {
  /**
   * Fully Kiosk Browser's JavaScript interface, on the page while "Enable
   * JavaScript Interface" is on in Fully's Advanced Web Settings — the two
   * calls ScreenListener makes (0.129). Absent in any other browser.
   */
  fully?: {
    turnScreenOn(): void;
    turnScreenOff(): void;
  };
}
