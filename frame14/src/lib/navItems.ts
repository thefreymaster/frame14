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
import { GiPumpkinLantern } from "react-icons/gi";
import { LuServer } from "react-icons/lu";
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
  /**
   * Offered on a remote, but out of its nav until turned on in /control: a
   * phone's bar starts as Home, Lights, Climate, Photos and Settings (since
   * 0.109; the devices alone were off before).
   */
  remoteOff?: boolean;
  /** In the nav only while a tracked team is playing (useLiveGame). */
  gameDay?: boolean;
  /** In the nav on Oct 30 and 31 only (useHalloween). */
  halloween?: boolean;
  /** In the nav only while Immich is set up (usePhotosEnabled, 0.145.0). */
  photos?: boolean;
  /**
   * In the nav only while Home Assistant's Unraid integration has a server
   * (useUnraidEnabled, 0.151.0).
   */
  unraid?: boolean;
};

/** Always first in the nav, and always in it. */
export const HOME_PATH = "/home";

/** Always in the nav (it's where the nav is set up), though it can move. */
export const SETTINGS_PATH = "/control";

/**
 * Every nav entry, in the default order (since 0.109: Home, Clock, Lights,
 * Climate, Photos, Energy, Weather, Printer, Vacuum, Cameras, Unraid (0.151.0),
 * Calendar, Football, Halloween (0.128: Oct 30 and 31), Settings — Lights and Climate
 * before Photos, Weather with Energy before the devices; a remote starts with
 * everything from Energy to Halloween off, `remoteOff`). Each device shows the ones for its mode, in the order
 * and with the ones hidden that /control sets for it (lib/navLayout).
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
    path: "/photos",
    label: "Photos",
    icon: IoImagesOutline,
    activeIcon: IoImages,
    frameOnly: true,
    photos: true,
  },
  // A remote's Photos: the album as a grid, to pick what the frames show.
  {
    path: "/album",
    label: "Photos",
    icon: IoImagesOutline,
    activeIcon: IoImages,
    remoteOnly: true,
    photos: true,
  },
  {
    path: "/energy",
    label: "Energy",
    icon: IoFlashOutline,
    activeIcon: IoFlash,
    remoteOff: true,
  },
  // In Radar's old place (RENAMED_PATHS keeps a saved layout's), and on
  // every device, where Radar was the frame's alone.
  {
    path: "/weather",
    label: "Weather",
    icon: IoPartlySunnyOutline,
    activeIcon: IoPartlySunny,
    remoteOff: true,
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
  // The Unraid servers' (0.151.0): only while Home Assistant has one.
  {
    path: "/unraid",
    label: "Unraid",
    icon: LuServer,
    activeIcon: LuServer,
    unraid: true,
    remoteOff: true,
  },
  {
    path: "/calendar",
    label: "Calendar",
    icon: IoCalendarOutline,
    activeIcon: IoCalendar,
    remoteOff: true,
  },
  {
    path: "/football",
    label: "Football",
    icon: IoAmericanFootballOutline,
    activeIcon: IoAmericanFootball,
    gameDay: true,
    remoteOff: true,
  },
  // Oct 30 and 31 only (lib/halloween). Like Football it moves every frame
  // (not local-only) and "halloween" is a TRANSIENT_VIEW server-side, so no
  // frame is woken onto it in November.
  {
    path: "/halloween",
    label: "Halloween",
    icon: GiPumpkinLantern,
    activeIcon: GiPumpkinLantern,
    halloween: true,
    remoteOff: true,
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

/**
 * The most slots the portrait bar has, More included, by device mode: six on
 * the frame (1600px across, room for five entries and More), five on a phone.
 */
export const NAV_BAR_ENTRIES: Record<DeviceMode, number> = {
  frame: 6,
  controller: 5,
};

/**
 * Splits a nav for a portrait bar of `slots` slots: that many entries or
 * fewer all go in it; past that More takes the last slot, so the first
 * `slots - 1` stay and the rest go under More. A phone's five slots hold five;
 * six entries put four in the bar and two under More. The frame's six hold
 * six; seven put five in the bar and two under More.
 */
export function splitForBar(
  items: NavItem[],
  slots: number,
): {
  bar: NavItem[];
  more: NavItem[];
} {
  if (items.length <= slots) return { bar: items, more: [] };
  const keep = slots - 1;
  return { bar: items.slice(0, keep), more: items.slice(keep) };
}
