import { IconButton } from "@chakra-ui/react";
import { IoPowerOutline } from "react-icons/io5";
import { useDeviceMode } from "../lib/deviceMode";
import { setScreen, useScreen } from "../lib/screen";

/**
 * The power button at the header's right, after the mic (0.130). On a frame
 * a tap turns the frames' screen off — the Screen card's switch's call, GET
 * /api/screen/off — so the server's `screen` reaches this frame's
 * ScreenListener, which asks Fully, and every device's card shows it off.
 * Kitchen motion or the schedule's on-time brings it back. On a remote
 * (0.161) it is a switch for the frames' screen: off while it's on, on while
 * it's off, the icon dimmed while the frames are dark, following the
 * server's `screen_state`. A remote's own screen is its own: its
 * ScreenListener ignores the command. The mic's shape (`l2`, xs).
 */
export function ScreenOffButton() {
  const frame = useDeviceMode() === "frame";
  const on = useScreen().state === "on";
  if (frame) {
    return (
      <IconButton
        aria-label="Turn the screen off"
        onClick={() => void setScreen("off")}
        variant="subtle"
        size="xs"
        rounded="l2"
      >
        <IoPowerOutline />
      </IconButton>
    );
  }
  return (
    <IconButton
      aria-label={on ? "Turn the frame's screen off" : "Turn the frame's screen on"}
      data-state={on ? "on" : "off"}
      onClick={() => void setScreen(on ? "off" : "on")}
      variant="subtle"
      size="xs"
      rounded="l2"
      color={on ? undefined : "fg.subtle"}
    >
      <IoPowerOutline />
    </IconButton>
  );
}
