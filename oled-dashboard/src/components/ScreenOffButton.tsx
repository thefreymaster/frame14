import { IconButton } from "@chakra-ui/react";
import { IoPowerOutline } from "react-icons/io5";
import { useDeviceMode } from "../lib/deviceMode";
import { setScreen } from "../lib/screen";

/**
 * The power button at the header's right, after the mic, on a frame only
 * (0.130): a tap turns the frames' screen off — the Screen card's switch's
 * call, GET /api/screen/off — so the server's `screen` reaches this frame's
 * ScreenListener, which asks Fully, and every device's card shows it off.
 * Kitchen motion or the schedule's on-time brings it back. A remote's screen
 * is its own, so a remote has no button. The mic's shape (`l2`, xs).
 */
export function ScreenOffButton() {
  const frame = useDeviceMode() === "frame";
  if (!frame) return null;
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
