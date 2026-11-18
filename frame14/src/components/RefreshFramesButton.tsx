import { IconButton } from "@chakra-ui/react";
import { IoRefreshOutline } from "react-icons/io5";
import { useDeviceMode } from "../lib/deviceMode";
import { socket } from "../lib/socket";
import { toaster } from "./ui/toaster";
import { Tooltip } from "./ui/tooltip";

/**
 * A remote's button to refresh the frames, in the header between the mic and
 * the power button (0.175.0, the user: "If you're running in the remote
 * mode, there should be a icon button in the header to refresh frames"): a
 * tap reloads every frame's page, from wherever the remote is. It is the
 * Display card's "Refresh displays" (Settings), a tap away instead of a tab
 * and a card away — the same `refresh` to the server, which sends `reload`
 * to every other device (SocketViewListener; never back to this one), and a
 * toast, since nothing on a remote changes. A frame has none: its own
 * reload is the connection menu's. The mic's shape (xs, subtle), and like
 * the mic and the power button a tooltip saying what a tap does.
 */
export function RefreshFramesButton() {
  const remote = useDeviceMode() === "controller";
  if (!remote) return null;
  return (
    <Tooltip content="Refresh the frames" showArrow>
      <IconButton
        aria-label="Refresh the frames"
        onClick={() => {
          socket.emit("refresh");
          toaster.create({ title: "Refreshing the frames", type: "info" });
        }}
        variant="subtle"
        size="xs"
      >
        <IoRefreshOutline />
      </IconButton>
    </Tooltip>
  );
}
