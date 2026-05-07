import { Outlet, useLocation } from "react-router";
import { Box, HStack } from "@chakra-ui/react";
import { SocketViewListener } from "./SocketViewListener";
import { PageTransition } from "./PageTransition";
import { LandscapeNav } from "./LandscapeNav";
import { useThemeMode } from "../hooks/useThemeMode";
import { useReady } from "../hooks/useReady";
import { getDeviceMode } from "../lib/deviceMode";
import { useNavVisible } from "../lib/navVisibility";

export function Layout() {
  useThemeMode();
  useReady();
  const location = useLocation();
  const isControl = location.pathname === "/control";
  const isLights = location.pathname === "/lights";
  const isBlank = location.pathname === "/blank";
  const navVisible = useNavVisible();
  const showNav = !isBlank && navVisible;
  const isController = getDeviceMode() === "controller";
  const scrollable = isControl || isLights || isController;

  const content = (
    <PageTransition key={location.pathname}>
      <Outlet />
    </PageTransition>
  );

  return (
    <>
      <SocketViewListener />

      <HStack gap="0" align="stretch">
        <LandscapeNav hidden={!showNav} />
        <Box
          height="var(--app-height, 100dvh)"
          overflow={scrollable ? "auto" : "hidden"}
          pt={showNav ? "env(safe-area-inset-top, 0px)" : 0}
          transition="padding 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
          css={{
            "@media (orientation: landscape)": {
              minWidth: "100vw",
              paddingLeft: showNav
                ? "calc(68px + env(safe-area-inset-left, 0px))"
                : "0px",
            },
            "@media (orientation: portrait)": {
              minWidth: "100%",
              paddingBottom: showNav
                ? "calc(64px + env(safe-area-inset-bottom, 0px))"
                : "0px",
            },
          }}
        >
          {content}
        </Box>
      </HStack>
    </>
  );
}
