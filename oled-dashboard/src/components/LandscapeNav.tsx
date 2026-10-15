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
import { NAV_BAR_HEIGHT, NAV_RAIL_WIDTH } from "../lib/navMetrics";
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
  function renderItem(item: NavItem) {
    const isActive = activeView === item.path;
    const Icon = isActive ? item.activeIcon : item.icon;
    return (
      <Tabs.Trigger
        key={item.path}
        value={item.path}
        onClick={() => handleClick(item.path)}
        flexDirection="column"
        justifyContent="center"
        height="auto"
        px="1"
        py="2"
        gap="1"
        // 20px icons on a phone and a little larger wherever the type scale
        // grows, and a neutral grey fill (gray.100 / gray.800) on the
        // selected entry rather than the subtle tab's near-black.
        _icon={{ boxSize: { base: "5", md: "1.375rem" } }}
        _selected={{ bg: { _light: "gray.100", _dark: "gray.800" } }}
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
      {/* Portrait: bottom horizontal bar. Its background runs on through the
          home-indicator inset to the bottom edge, so in an iPhone home-screen
          app the page doesn't show through underneath it; the entries keep to
          the NAV_BAR_HEIGHT above the inset. */}
      <Box
        display={{ base: "block", _landscape: "none" }}
        position="fixed"
        top={`calc(var(--app-height, 100dvh) - ${NAV_BAR_HEIGHT} - env(safe-area-inset-bottom, 0px))`}
        left={0}
        right={0}
        height={`calc(${NAV_BAR_HEIGHT} + env(safe-area-inset-bottom, 0px))`}
        pb="env(safe-area-inset-bottom, 0px)"
        bg="bg"
        borderTopWidth="1px"
        zIndex="sticky"
        px="2"
        transform={hidden ? "translateY(100%)" : "translateY(0)"}
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
          <Tabs.List height="100%" alignItems="center" gap="1">
            {portraitItems.map(renderItem)}
          </Tabs.List>
        </Tabs.Root>
      </Box>

      {/* Landscape: left vertical sidebar */}
      <Box
        display={{ base: "none", _landscape: "block" }}
        position="fixed"
        left={0}
        top={0}
        bottom={0}
        width={NAV_RAIL_WIDTH}
        height="100dvh"
        bg="bg"
        borderRightWidth="1px"
        zIndex="sticky"
        p="2"
        transform={hidden ? "translateX(-100%)" : "translateX(0)"}
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
            {visibleNavItems.map(renderItem)}
            <Spacer />
            {BOTTOM_NAV_ITEMS.map(renderItem)}
          </Tabs.List>
        </Tabs.Root>
      </Box>
    </>
  );
}
