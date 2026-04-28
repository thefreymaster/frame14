import { Outlet, useLocation } from "react-router";
import { Box, HStack } from "@chakra-ui/react";
import { SocketViewListener } from "./SocketViewListener";
import { PageTransition } from "./PageTransition";
import { LandscapeNav } from "./LandscapeNav";
import { useThemeMode } from "../hooks/useThemeMode";
import { useReady } from "../hooks/useReady";
import { getDeviceMode } from "../lib/deviceMode";

export function Layout() {
  useThemeMode();
  useReady();
  const location = useLocation();
  const isControl = location.pathname === "/control";
  const isLights = location.pathname === "/lights";
  const isBlank = location.pathname === "/blank";
  const showNav = !isBlank;
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
        <LandscapeNav />
        <Box
          height="100dvh"
          overflow={scrollable ? "auto" : "hidden"}
          pt="env(safe-area-inset-top, 0px)"
          css={
            showNav
              ? {
                  "@media (orientation: landscape)": {
                    minW: "calc(100vw - 68px)",
                    paddingLeft: "env(safe-area-inset-left, 0px)",
                  },
                  "@media (orientation: portrait)": {
                    minW: "calc(100%)",
                    paddingBottom:
                      "calc(64px + env(safe-area-inset-bottom, 0px))",
                  },
                }
              : undefined
          }
        >
          {content}
        </Box>
      </HStack>
    </>
  );
}
