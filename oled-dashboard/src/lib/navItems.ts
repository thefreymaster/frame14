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
  IoFlashOutline,
  IoFlash,
  IoThermometerOutline,
  IoThermometer,
  IoPartlySunnyOutline,
  IoPartlySunny,
  IoCalendarOutline,
  IoCalendar,
  IoVideocamOutline,
  IoVideocam,
} from "react-icons/io5";
import {
  RiHome5Line,
  RiHome5Fill,
  RiLightbulbLine,
  RiLightbulbFill,
} from "react-icons/ri";
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
    path: "/climate",
    label: "Climate",
    icon: IoThermometerOutline,
    activeIcon: IoThermometer,
  },
  {
    path: "/energy",
    label: "Energy",
    icon: IoFlashOutline,
    activeIcon: IoFlash,
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
    path: "/cameras",
    label: "Cameras",
    icon: IoVideocamOutline,
    activeIcon: IoVideocam,
    remoteOff: true,
  },
  // In Radar's old place (RENAMED_PATHS keeps a saved layout's), and on
  // every device, where Radar was the frame's alone.
  {
    path: "/weather",
    label: "Weather",
    icon: IoPartlySunnyOutline,
    activeIcon: IoPartlySunny,
  },
  {
    path: "/calendar",
    label: "Calendar",
    icon: IoCalendarOutline,
    activeIcon: IoCalendar,
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

/**
 * Paths entries used to have, so a saved layout (lib/navLayout) keeps their
 * place: Solar and Power became the Energy page in 0.75, Radar the Weather
 * page's tab in 0.80.
 */
export const RENAMED_PATHS: Record<string, string> = {
  "/solar": "/energy",
  "/power": "/energy",
  "/radar": "/weather",
};

/** The entries a device in this mode can have in its nav. */
export function navItemsFor(mode: DeviceMode): NavItem[] {
  return NAV_ITEMS.filter((i) =>
    mode === "frame" ? !i.remoteOnly : !i.frameOnly,
  );
}

/** The most slots the portrait bar has, More included. */
export const NAV_BAR_ENTRIES = 5;

/**
 * Splits a nav for the portrait bar: five entries or fewer all go in it;
 * past that More takes the fifth slot, so the first four stay and the rest
 * go under More (six entries: four in the bar, two under More).
 */
export function splitForBar(items: NavItem[]): {
  bar: NavItem[];
  more: NavItem[];
} {
  if (items.length <= NAV_BAR_ENTRIES) return { bar: items, more: [] };
  const keep = NAV_BAR_ENTRIES - 1;
  return { bar: items.slice(0, keep), more: items.slice(keep) };
}
