import { useState, useEffect } from "react";
import { Box, HStack, VStack, Spacer, Flex, Text } from "@chakra-ui/react";
import type { IconType } from "react-icons";
import { useLocation, useNavigate } from "react-router";
import {
  IoTimeOutline,
  IoTime,
  IoImagesOutline,
  IoImages,
  IoSettingsOutline,
  IoSettings,
} from "react-icons/io5";

import {
  RiHome5Line,
  RiHome5Fill,
  RiLightbulbLine,
  RiLightbulbFill,
} from "react-icons/ri";
import { MdRadar } from "react-icons/md";
import { socket } from "../lib/socket";
import { getDeviceMode } from "../lib/deviceMode";
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

const LOCAL_ONLY_PATHS = new Set(["/control", "/lights", "/radar", "/timer"]);

const BOTTOM_NAV_ITEMS: NavItem[] = [
  {
    path: "/control",
    label: "Settings",
    icon: IoSettingsOutline,
    activeIcon: IoSettings,
  },
];

export function LandscapeNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState(location.pathname);
  const isFrame = getDeviceMode() === "frame";

  useEffect(() => {
    setActiveView(location.pathname);
  }, [location.pathname]);

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

  function renderItem(item: NavItem) {
    const isActive = activeView === item.path;
    const Icon = isActive ? item.activeIcon : item.icon;
    return (
      <Box
        key={item.path}
        as="button"
        onClick={() => handleClick(item.path)}
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap="2px"
        flex="1"
        height="100%"
        bg="transparent"
        color={isActive ? "var(--theme-fg)" : "var(--theme-fg-muted)"}
        _active={{ opacity: 0.4 }}
        transition="color 0.15s, opacity 0.1s"
      >
        <Icon size={26} />
        <Text
          fontSize="10px"
          lineHeight="1"
          fontWeight={isActive ? "600" : "500"}
          letterSpacing="0.01em"
        >
          {item.label}
        </Text>
      </Box>
    );
  }

  function renderItemVertical(item: NavItem) {
    const isActive = activeView === item.path;
    const Icon = isActive ? item.activeIcon : item.icon;
    return (
      <Box
        key={item.path}
        as="button"
        onClick={() => handleClick(item.path)}
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap="2px"
        width="100%"
        py="6px"
        bg="transparent"
        color={isActive ? "var(--theme-fg)" : "var(--theme-fg-muted)"}
        _active={{ opacity: 0.4 }}
        transition="color 0.15s, opacity 0.1s"
      >
        <Icon size={24} />
        <Text
          fontSize="9px"
          lineHeight="1"
          fontWeight={isActive ? "600" : "500"}
          letterSpacing="0.01em"
        >
          {item.label}
        </Text>
      </Box>
    );
  }

  const visibleNavItems = NAV_ITEMS.filter((i) => isFrame || !i.frameOnly);
  const allItems = [...visibleNavItems, ...BOTTOM_NAV_ITEMS];
  const portraitItems = allItems.filter((i) => isFrame || !i.portraitHidden);

  return (
    <>
      {/* Portrait: bottom horizontal bar */}
      <Box
        css={{
          display: "block",
          "@media (orientation: landscape)": { display: "none" },
        }}
        position="fixed"
        bottom={0}
        left={0}
        right={0}
        height="calc(64px + env(safe-area-inset-bottom, 0px) / 2)"
        pb="calc(env(safe-area-inset-bottom, 0px) / 2)"
        bg="var(--theme-bg)"
        borderTop="1px solid"
        borderColor="var(--theme-divider)"
        zIndex={100}
      >
        <HStack gap="0" align="stretch" height="64px" px="4px">
          {portraitItems.map(renderItem)}
        </HStack>
      </Box>

      {/* Landscape: left vertical sidebar */}
      <Box
        css={{
          display: "none",
          "@media (orientation: landscape)": { display: "block" },
        }}
        // position="fixed"
        left={0}
        top={0}
        bottom={0}
        width="68px"
        bg="var(--theme-bg)"
        borderRight="1px solid"
        borderColor="var(--theme-divider)"
        zIndex={100}
        height="100dvh"
      >
        <Flex direction="column" align="stretch" height="100%" py="12px">
          <VStack gap="4px" align="stretch">
            {visibleNavItems.map(renderItemVertical)}
          </VStack>
          <Spacer />
          <VStack gap="4px" align="stretch">
            {BOTTOM_NAV_ITEMS.map(renderItemVertical)}
          </VStack>
        </Flex>
      </Box>
    </>
  );
}
