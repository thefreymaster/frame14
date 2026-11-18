import { IconButton } from "@chakra-ui/react";
import { IoMoonOutline, IoSunnyOutline } from "react-icons/io5";
import { useThemeMode } from "../hooks/useThemeMode";
import { Tooltip } from "./ui/tooltip";

/**
 * The header's switch between bright and dark (0.176.0, the user: "Add a
 * bright mode/dark mode toggle icon button to the header"), before the power
 * button: a tap puts the theme in the mode it isn't in now — the sun while
 * it is dark, the moon while it is bright, each what a tap brings. It sets
 * the worn theme's Theme (Settings) to Bright or Dark outright, so one that
 * was following the clock (Auto) or the system (Device) stops following
 * until that is picked again in Settings. Whose theme: this device's own on
 * a remote (the Device tab's, never sent), the frames' on a frame — every
 * frame's, through the server, as the Display card's is.
 *
 * The mic's shape (xs, subtle), and like the header's other buttons a
 * tooltip saying what a tap does. On a phone too crowded for every button it
 * is the one that goes (lib/headerFit): Settings still has the theme.
 */
export function ThemeToggleButton() {
  const { effectiveMode, own, setFramesPreference, setLocalPreference } =
    useThemeMode();
  const dark = effectiveMode === "dark";
  const label = dark ? "Switch to bright mode" : "Switch to dark mode";
  return (
    <Tooltip content={label} showArrow>
      <IconButton
        aria-label={label}
        onClick={() =>
          (own ? setLocalPreference : setFramesPreference)(
            dark ? "bright" : "dark",
          )
        }
        variant="subtle"
        size="xs"
        data-header-theme={effectiveMode}
      >
        {dark ? <IoSunnyOutline /> : <IoMoonOutline />}
      </IconButton>
    </Tooltip>
  );
}
