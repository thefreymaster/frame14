import { Outlet, useLocation } from "react-router";
import { Box } from "@chakra-ui/react";
import { SocketViewListener } from "./SocketViewListener";
import { PageTransition } from "./PageTransition";
import { PixelShift } from "./PixelShift";
import { LandscapeNav } from "./LandscapeNav";
import { useThemeMode } from "../hooks/useThemeMode";
import { useScreenType } from "../hooks/useScreenType";
import { useReady } from "../hooks/useReady";

export function Layout() {
  useThemeMode();
  useReady();
  const location = useLocation();
  const screenType = useScreenType();
  const isControl = location.pathname === "/control";
  const isLights = location.pathname === "/lights";
  const isBlank = location.pathname === "/blank";
  const showNav = !isBlank;
  const isOled = screenType === "oled";
  const scrollable = isControl || isLights;

  const content = (
    <PageTransition key={location.pathname}>
      <Outlet />
    </PageTransition>
  );

  return (
    <>
      <SocketViewListener />
      {showNav && <LandscapeNav />}
      <Box
        height="100%"
        overflow={scrollable ? "auto" : "hidden"}
        css={
          showNav
            ? {
                "@media (orientation: landscape)": {
                  marginLeft: "56px",
                  width: "calc(100vw - 56px)",
                },
                "@media (orientation: portrait)": {
                  paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
                },
              }
            : undefined
        }
      >
        {scrollable || !isOled ? content : <PixelShift>{content}</PixelShift>}
      </Box>
    </>
  );
}
