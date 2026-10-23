import { useState, useEffect } from "react";
import { Box, Spacer, Tabs } from "@chakra-ui/react";
import type { IconType } from "react-icons";
import { useLocation, useNavigate } from "react-router";
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
import { socket } from "../lib/socket";
import { getDeviceMode } from "../lib/deviceMode";
import { useLiveGame } from "../hooks/useLiveGame";
import {
  HEADER_CLEARANCE,
  NAV_BAR_BOTTOM,
  NAV_BAR_CLEARANCE,
  NAV_BAR_HEIGHT,
  NAV_BAR_INSET,
  NAV_RAIL_BOTTOM,
  NAV_RAIL_WIDTH,
  PAGE_GUTTER,
} from "../lib/navMetrics";
import { PiSolarRoof } from "react-icons/pi";

type NavItem = {
  path: string;
  label: string;
  icon: IconType;
  activeIcon: IconType;
  portraitHidden?: boolean;
  frameOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { path: "/home", label: "Home", icon: RiHome5Line, activeIcon: RiHome5Fill },
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
    path: "/radar",
    label: "Radar",
    icon: MdRadar,
    activeIcon: MdRadar,
    portraitHidden: true,
    frameOnly: true,
  },
  // {
  //   path: "/timer",
  //   label: "Timer",
  //   icon: IoTimerOutline,
  //   activeIcon: IoTimer,
  //   portraitHidden: true,
  //   frameOnly: true,
  // },
];

/**
 * Spliced in only while a tracked team is playing — the one nav entry that
 * comes and goes. Deliberately not LOCAL_ONLY: tapping it should move every
 * panel to the game, and "football" is a TRANSIENT_VIEW server-side so it is
 * never remembered as the route to wake up on.
 */
const FOOTBALL_ITEM: NavItem = {
  path: "/football",
  label: "Football",
  icon: IoAmericanFootballOutline,
  activeIcon: IoAmericanFootball,
};

const LOCAL_ONLY_PATHS = new Set(["/control", "/lights", "/radar", "/timer"]);

const BOTTOM_NAV_ITEMS: NavItem[] = [
  {
    path: "/control",
    label: "Settings",
    icon: IoSettingsOutline,
    activeIcon: IoSettings,
  },
];

/** Space between a floating nav's edge and its entries. */
const NAV_PAD = "0.375rem";

/**
 * The selected entry's corner radius: the nav's (the theme's `surface`, the
 * cards' too), less the border and padding between them, so the two corners
 * share a centre — an inner outline offset from the outer one, as a slicer
 * offsets a print's walls. An equal radius would look fatter than the corner
 * around it.
 */
const ENTRY_RADIUS = `calc(var(--chakra-radii-surface) - 1px - ${NAV_PAD})`;

/**
 * The surface both navs share: the cards' colour (gray.800 in dark mode) and
 * corners (the theme's `surface` radius), set apart from a card passing
 * beneath by a border and shadow.
 */
const FLOATING_NAV = {
  position: "fixed",
  bg: { _light: "bg.panel", _dark: "gray.800" },
  borderWidth: "1px",
  borderColor: { _light: "gray.200", _dark: "gray.700" },
  rounded: "surface",
  shadow: "lg",
  zIndex: "sticky",
  p: NAV_PAD,
} as const;

interface LandscapeNavProps {
  hidden?: boolean;
}

export function LandscapeNav({ hidden = false }: LandscapeNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState(location.pathname);
  // Follow route changes (derived during render rather than in an effect).
  const [routePath, setRoutePath] = useState(location.pathname);
  if (routePath !== location.pathname) {
    setRoutePath(location.pathname);
    setActiveView(location.pathname);
  }
  const isFrame = getDeviceMode() === "frame";
  const { games } = useLiveGame();

  useEffect(() => {
    function onChangeView(view: string) {
      setActiveView(`/${view}`);
    }
    socket.on("change_view", onChangeView);
    return () => {
      socket.off("change_view", onChangeView);
    };
  }, []);

  function handleClick(path: string) {
    navigate(path);
    if (isFrame && !LOCAL_ONLY_PATHS.has(path)) {
      socket.emit("change", path.replace("/", ""));
    }
    setActiveView(path);
  }

  // Each nav entry is a Tabs trigger: the selected tab is the view on screen.
  // Navigation happens on click rather than onValueChange, so tapping the tab
  // you are already on still re-sends it to the other frames, as before.
  // Both navs float, and the selected entry is a shade above the nav's
  // gray.800, its corners concentric with the nav's (ENTRY_RADIUS). In the
  // portrait bar entries fill its height, and on a phone the labels drop to
  // xs, Apple Music's small captions, so a sixth entry (game day) still fits
  // inside the inset bar.
  function renderItem(item: NavItem, placement: "bar" | "rail") {
    const isActive = activeView === item.path;
    const Icon = isActive ? item.activeIcon : item.icon;
    const inBar = placement === "bar";
    return (
      <Tabs.Trigger
        key={item.path}
        value={item.path}
        onClick={() => handleClick(item.path)}
        flexDirection="column"
        justifyContent="center"
        height={inBar ? "100%" : "auto"}
        rounded={ENTRY_RADIUS}
        px="1"
        py={inBar ? "0" : "2"}
        gap="1"
        textStyle={inBar ? { base: "xs", md: "sm" } : undefined}
        // 20px icons on a phone and a little larger wherever the type scale
        // grows, and a neutral grey fill (gray.100 / gray.700) on the
        // selected entry rather than the subtle tab's near-black.
        _icon={{ boxSize: { base: "5", md: "1.375rem" } }}
        _selected={{ bg: { _light: "gray.100", _dark: "gray.700" } }}
      >
        <Icon />
        {item.label}
      </Tabs.Trigger>
    );
  }

  const visibleNavItems = [
    ...NAV_ITEMS.filter((i) => isFrame || !i.frameOnly),
    ...(games.length > 0 ? [FOOTBALL_ITEM] : []),
  ];
  const allItems = [...visibleNavItems, ...BOTTOM_NAV_ITEMS];
  const portraitItems = allItems.filter((i) => isFrame || !i.portraitHidden);

  return (
    <>
      {/* Portrait: a floating bar, like Apple Music's tab bar but opaque (no
          glass) and with the cards' corners. It is inset from the sides and
          sits just above the home indicator, and the page scrolls on
          underneath and around it. */}
      <Box
        {...FLOATING_NAV}
        display={{ base: "block", _landscape: "none" }}
        top={`calc(var(--app-height, 100dvh) - ${NAV_BAR_CLEARANCE})`}
        left={`calc(env(safe-area-inset-left, 0px) + ${NAV_BAR_INSET})`}
        right={`calc(env(safe-area-inset-right, 0px) + ${NAV_BAR_INSET})`}
        height={NAV_BAR_HEIGHT}
        // Down past the screen edge, shadow and all.
        transform={
          hidden
            ? `translateY(calc(100% + ${NAV_BAR_BOTTOM} + 1rem))`
            : "translateY(0)"
        }
        transition="transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      >
        <Tabs.Root
          variant="subtle"
          size="sm"
          fitted
          value={activeView}
          activationMode="manual"
          height="100%"
        >
          <Tabs.List height="100%" gap="1">
            {portraitItems.map((item) => renderItem(item, "bar"))}
          </Tabs.List>
        </Tabs.Root>
      </Box>

      {/* Landscape: the same floating surface down the left, on the cards'
          PAGE_GUTTER: its top lines up with the first card's. */}
      <Box
        {...FLOATING_NAV}
        display={{ base: "none", _landscape: "block" }}
        top={`calc(${HEADER_CLEARANCE} + ${PAGE_GUTTER})`}
        left={`calc(env(safe-area-inset-left, 0px) + ${PAGE_GUTTER})`}
        width={NAV_RAIL_WIDTH}
        height={`calc(var(--app-height, 100dvh) - ${HEADER_CLEARANCE} - ${PAGE_GUTTER} - ${NAV_RAIL_BOTTOM})`}
        // Off past the screen edge, shadow and all.
        transform={
          hidden
            ? `translateX(calc(-100% - ${PAGE_GUTTER} - env(safe-area-inset-left, 0px) - 1rem))`
            : "translateX(0)"
        }
        transition="transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      >
        <Tabs.Root
          variant="subtle"
          size="sm"
          orientation="vertical"
          value={activeView}
          activationMode="manual"
          height="100%"
        >
          <Tabs.List width="100%" height="100%" gap="1">
            {visibleNavItems.map((item) => renderItem(item, "rail"))}
            <Spacer />
            {BOTTOM_NAV_ITEMS.map((item) => renderItem(item, "rail"))}
          </Tabs.List>
        </Tabs.Root>
      </Box>
    </>
  );
}
