import { useEffect } from "react";
import { getDeviceMode } from "../lib/deviceMode";
import { socket } from "../lib/socket";

/**
 * Turns this frame's screen on or off when the server says so (`screen`,
 * from GET /api/screen/:state — a Home Assistant automation's), through
 * Fully Kiosk Browser's JavaScript interface: `window.fully`, on the page
 * while "Enable JavaScript Interface" is on in Fully's Advanced Web
 * Settings (0.129). The tablet has to stay awake with the screen dark
 * (Fully's "Prevent Device from Sleep while Screen Off"), or the socket
 * drops and `on` never arrives. A remote's screen is its own, and a
 * browser without Fully has nothing to call: both do nothing.
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
    socket.on("screen", onScreen);
    return () => {
      socket.off("screen", onScreen);
    };
  }, []);

  return null;
}
