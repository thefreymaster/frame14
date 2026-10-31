/** The add-on version this bundle was built as (vite.config.ts). */
declare const __APP_VERSION__: string;

interface Window {
  /**
   * Fully Kiosk Browser's JavaScript interface, on the page while "Enable
   * JavaScript Interface" is on in Fully's Advanced Web Settings — the calls
   * ScreenListener makes (0.129; brightness 0.131). Absent in any other
   * browser.
   */
  fully?: {
    turnScreenOn(): void;
    turnScreenOff(): void;
    /** 0 to 255. */
    setScreenBrightness?(level: number): void;
    /** 0 to 255, as the screen is now. */
    getScreenBrightness?(): number;
  };
}
