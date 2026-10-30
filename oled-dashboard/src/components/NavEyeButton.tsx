import { IconButton } from "@chakra-ui/react";
import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";
import { useDeviceMode } from "../lib/deviceMode";
import { NAV_BAR_CLEARANCE } from "../lib/navMetrics";
import { toggleNavVisible, useNavVisible } from "../lib/navVisibility";

/**
 * The eye in a full-bleed page's bottom right corner: it hides the nav on
 * the frames and brings it back — the one /marquee and /photos draw inline,
 * for the Halloween page. A remote's nav never hides, so it has no eye.
 */
export function NavEyeButton() {
  const navVisible = useNavVisible();
  const remote = useDeviceMode() === "controller";
  if (remote) return null;
  return (
    <IconButton
      variant="surface"
      size="lg"
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        toggleNavVisible();
      }}
      position="fixed"
      // In portrait it rides above the floating nav bar while that is up.
      bottom={{
        _landscape: "calc(16px + env(safe-area-inset-bottom, 0px))",
        _portrait: navVisible
          ? `calc(${NAV_BAR_CLEARANCE} + 1rem)`
          : "calc(16px + env(safe-area-inset-bottom, 0px))",
      }}
      right="calc(16px + env(safe-area-inset-right, 0px))"
      zIndex={200}
      aria-label={navVisible ? "Hide navigation" : "Show navigation"}
    >
      {navVisible ? <IoEyeOffOutline /> : <IoEyeOutline />}
    </IconButton>
  );
}
