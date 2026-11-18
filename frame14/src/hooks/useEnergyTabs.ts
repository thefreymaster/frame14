import type { IconType } from "react-icons";
import { MdElectricBolt } from "react-icons/md";
import { PiSolarRoof } from "react-icons/pi";
import { useFeatures } from "./useFeatures";

export type EnergyTab = "solar" | "circuits";

/** The energy views' tabs (EnergyPanels): the page's sub-routes, the drawer's own. */
const TABS: { value: EnergyTab; label: string; icon: IconType }[] = [
  { value: "solar", label: "Solar", icon: PiSolarRoof },
  { value: "circuits", label: "Circuits", icon: MdElectricBolt },
];

export const isEnergyTab = (v: string | null | undefined): v is EnergyTab =>
  v === "solar" || v === "circuits";

/**
 * The tabs an install has (lib/features, 0.159.0): Solar with the solar
 * sensors, Circuits with circuits.
 */
export function useEnergyTabs() {
  const features = useFeatures();
  return TABS.filter((t) => features[t.value]);
}
