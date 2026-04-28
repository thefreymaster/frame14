import { Outlet, useLocation } from "react-router";
import { Box, HStack } from "@chakra-ui/react";
import { SocketViewListener } from "./SocketViewListener";
import { PageTransition } from "./PageTransition";
import { LandscapeNav } from "./LandscapeNav";
import { useThemeMode } from "../hooks/useThemeMode";
import { useReady } from "../hooks/useReady";

export function Layout() {
  useThemeMode();
  useReady();
  const location = useLocation();
  const isControl = location.pathname === "/control";
  const isLights = location.pathname === "/lights";
  const isBlank = location.pathname === "/blank";
  const showNav = !isBlank;
  const scrollable = isControl || isLights;

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
          css={
            showNav
              ? {
                  "@media (orientation: landscape)": {
                    minW: "calc(100vw - 68px)",
                  },
                  "@media (orientation: portrait)": {
                    minW: "calc(100%)",
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
