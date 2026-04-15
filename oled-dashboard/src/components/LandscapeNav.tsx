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
import { RiHome5Line, RiHome5Fill } from "react-icons/ri";
import { socket } from "../lib/socket";

type NavItem = {
  path: string;
  label: string;
  icon: IconType;
  activeIcon: IconType;
};

const NAV_ITEMS: NavItem[] = [
  { path: "/home", label: "Home", icon: RiHome5Line, activeIcon: RiHome5Fill },
  { path: "/clock", label: "Clock", icon: IoTimeOutline, activeIcon: IoTime },
  {
    path: "/photos",
    label: "Photos",
    icon: IoImagesOutline,
    activeIcon: IoImages,
  },
];

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
    if (path !== "/control") {
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

  const allItems = [...NAV_ITEMS, ...BOTTOM_NAV_ITEMS];

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
        height="calc(64px + env(safe-area-inset-bottom, 0px))"
        pb="env(safe-area-inset-bottom, 0px)"
        bg="var(--theme-bg)"
        borderTop="1px solid"
        borderColor="var(--theme-divider)"
        zIndex={100}
      >
        <HStack gap="0" align="stretch" height="64px" px="4px">
          {allItems.map(renderItem)}
        </HStack>
      </Box>

      {/* Landscape: left vertical sidebar */}
      <Box
        css={{
          display: "none",
          "@media (orientation: landscape)": { display: "block" },
        }}
        position="fixed"
        left={0}
        top={0}
        bottom={0}
        width="68px"
        bg="var(--theme-bg)"
        borderRight="1px solid"
        borderColor="var(--theme-divider)"
        zIndex={100}
      >
        <Flex direction="column" align="stretch" height="100%" py="12px">
          <Spacer />
          <VStack gap="4px" align="stretch">
            {NAV_ITEMS.map(renderItemVertical)}
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
