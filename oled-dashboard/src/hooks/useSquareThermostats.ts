import { useDesktop } from "./useDesktop";
import { useDeviceMode } from "../lib/deviceMode";

/**
 * Whether the thermostat tiles (ClimateTiles, ClimateSkeleton) are squares
 * (0.119): on a desktop and on a phone (controller mode), where the user
 * asked for them; the kitchen frame keeps the wide tiles.
 */
export function useSquareThermostats(): boolean {
  const desktop = useDesktop();
  const mode = useDeviceMode();
  return desktop || mode === "controller";
}
