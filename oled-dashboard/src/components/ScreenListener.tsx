import { useEffect } from "react";
import { getDeviceMode } from "../lib/deviceMode";
import { socket } from "../lib/socket";

/**
 * Turns this frame's screen on or off, and sets its brightness, when the
 * server says so (`screen`, from GET /api/screen/:state — a Home Assistant
 * automation's, the Screen card's or the header's power button's; and
 * `brightness`, from GET /api/screen/brightness/:level — the card's slider's
 * or the dark hours', 0.131), through Fully Kiosk Browser's JavaScript
 * interface: `window.fully`, on the page while "Enable JavaScript
 * Interface" is on in Fully's Advanced Web Settings (0.129). The tablet has
 * to stay awake with the screen dark (Fully's "Prevent Device from Sleep
 * while Screen Off"), or the socket drops and `on` never arrives. On
 * arrival a frame tells the server what its brightness is, so the slider
 * starts where the screen is until it is used. A remote's screen is its
 * own, and a browser without Fully has nothing to call: both do nothing.
 */
export function ScreenListener() {
  useEffect(() => {
    function onScreen(state: string) {
      if (getDeviceMode() === "controller") return;
      const fully = window.fully;
      if (!fully) return;
      if (state === "on") fully.turnScreenOn();
      else if (state === "off") fully.turnScreenOff();
    }
    function onBrightness(level: unknown) {
      if (getDeviceMode() === "controller") return;
      if (typeof level !== "number") return;
      window.fully?.setScreenBrightness?.(level);
    }
    socket.on("screen", onScreen);
    socket.on("brightness", onBrightness);

    const fully = window.fully;
    if (getDeviceMode() === "frame" && fully?.getScreenBrightness) {
      const level = Number(fully.getScreenBrightness());
      if (Number.isFinite(level)) socket.emit("brightness_report", Math.round(level));
    }

    return () => {
      socket.off("screen", onScreen);
      socket.off("brightness", onBrightness);
    };
  }, []);

  return null;
}
