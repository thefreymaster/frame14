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
 * starts where the screen is until it is used, and from then on, every
 * LUX_POLL_MS, what the room's light is (`lux_report`, 0.137) off the
 * tablet's light sensor (Fully's getSensorValue, Android's TYPE_LIGHT), for
 * the Screen card's "Adjust to the room" — screen.js sets the level from it.
 * A remote's screen is its own, and a browser without Fully has nothing to
 * call: both do nothing.
 */

/** Android's ambient light sensor: Sensor.TYPE_LIGHT. */
const LIGHT_SENSOR = 5;
/** How often a frame reads the room's light and tells the server. */
export const LUX_POLL_MS = 10_000;

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
      if (Number.isFinite(level))
        socket.emit("brightness_report", Math.round(level));
    }

    // The room's light, now and every LUX_POLL_MS — an older Fully without
    // the call, or a tablet without the sensor, reports nothing.
    let poll: number | undefined;
    if (getDeviceMode() === "frame" && fully?.getSensorValue) {
      const readLux = () => {
        const lux = Number(window.fully?.getSensorValue?.(LIGHT_SENSOR));
        if (Number.isFinite(lux) && lux >= 0)
          socket.emit("lux_report", Math.round(lux));
      };
      readLux();
      poll = window.setInterval(readLux, LUX_POLL_MS);
    }

    return () => {
      socket.off("screen", onScreen);
      socket.off("brightness", onBrightness);
      if (poll !== undefined) clearInterval(poll);
    };
  }, []);

  return null;
}
