import type { IconType } from "react-icons";
import {
  IoTimeOutline,
  IoTime,
  IoImagesOutline,
  IoImages,
  IoSettingsOutline,
  IoSettings,
  IoAmericanFootballOutline,
  IoAmericanFootball,
} from "react-icons/io5";
import {
  RiHome5Line,
  RiHome5Fill,
  RiLightbulbLine,
  RiLightbulbFill,
} from "react-icons/ri";
import { MdRadar, MdElectricBolt } from "react-icons/md";
import { PiSolarRoof } from "react-icons/pi";
import { TbVacuumCleaner } from "react-icons/tb";
import type { DeviceMode } from "./deviceMode";
import { Printer3dIcon, Printer3dOutlineIcon } from "./printerIcons";

export type NavItem = {
  path: string;
  label: string;
  icon: IconType;
  activeIcon: IconType;
  /** Only on frame-mode devices: the frame and desktop browsers. */
  frameOnly?: boolean;
  /** Only on remotes. */
  remoteOnly?: boolean;
  /** Offered on a remote, but out of its nav until turned on in /control. */
  remoteOff?: boolean;
  /** In the nav only while a tracked team is playing (useLiveGame). */
  gameDay?: boolean;
};

/** Always first in the nav, and always in it. */
export const HOME_PATH = "/home";

/** Always in the nav (it's where the nav is set up), though it can move. */
export const SETTINGS_PATH = "/control";

/**
 * Every nav entry, in the default order. Each device shows the ones for its
 * mode, in the order and with the ones hidden that /control sets for it
 * (lib/navLayout).
 */
export const NAV_ITEMS: NavItem[] = [
  {
    path: HOME_PATH,
    label: "Home",
    icon: RiHome5Line,
    activeIcon: RiHome5Fill,
  },
  {
    path: "/clock",
    label: "Clock",
    icon: IoTimeOutline,
    activeIcon: IoTime,
    frameOnly: true,
  },
  {
    path: "/photos",
    label: "Photos",
    icon: IoImagesOutline,
    activeIcon: IoImages,
    frameOnly: true,
  },
  // A remote's Photos: the album as a grid, to pick what the frames show.
  {
    path: "/album",
    label: "Photos",
    icon: IoImagesOutline,
    activeIcon: IoImages,
    remoteOnly: true,
  },
  {
    path: "/lights",
    label: "Lights",
    icon: RiLightbulbLine,
    activeIcon: RiLightbulbFill,
  },
  {
    path: "/solar",
    label: "Solar",
    icon: PiSolarRoof,
    activeIcon: PiSolarRoof,
  },
  {
    path: "/power",
    label: "Power",
    icon: MdElectricBolt,
    activeIcon: MdElectricBolt,
  },
  {
    path: "/printer",
    label: "Printer",
    icon: Printer3dOutlineIcon,
    activeIcon: Printer3dIcon,
    remoteOff: true,
  },
  {
    path: "/vacuum",
    label: "Vacuum",
    icon: TbVacuumCleaner,
    activeIcon: TbVacuumCleaner,
    remoteOff: true,
  },
  {
    path: "/radar",
    label: "Radar",
    icon: MdRadar,
    activeIcon: MdRadar,
    frameOnly: true,
  },
  // Comes and goes with the game. Deliberately not local-only: tapping it
  // should move every panel to the game, and "football" is a TRANSIENT_VIEW
  // server-side so it is never remembered as the route to wake up on.
  {
    path: "/football",
    label: "Football",
    icon: IoAmericanFootballOutline,
    activeIcon: IoAmericanFootball,
    gameDay: true,
  },
  {
    path: SETTINGS_PATH,
    label: "Settings",
    icon: IoSettingsOutline,
    activeIcon: IoSettings,
  },
];

export const NAV_ITEM_BY_PATH = new Map(NAV_ITEMS.map((i) => [i.path, i]));

/** The entries a device in this mode can have in its nav. */
export function navItemsFor(mode: DeviceMode): NavItem[] {
  return NAV_ITEMS.filter((i) =>
    mode === "frame" ? !i.remoteOnly : !i.frameOnly,
  );
}

/** The most entries the portrait bar holds; past that it adds More. */
export const NAV_BAR_ENTRIES = 5;

/**
 * Splits a nav for the portrait bar: five entries or fewer all go in it;
 * past that the first five do, and the rest go under More.
 */
export function splitForBar(items: NavItem[]): {
  bar: NavItem[];
  more: NavItem[];
} {
  if (items.length <= NAV_BAR_ENTRIES) return { bar: items, more: [] };
  return {
    bar: items.slice(0, NAV_BAR_ENTRIES),
    more: items.slice(NAV_BAR_ENTRIES),
  };
}
