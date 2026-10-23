import { Outlet, useLocation } from "react-router";
import { Box, HStack } from "@chakra-ui/react";
import { SocketViewListener } from "./SocketViewListener";
import { PageTransition } from "./PageTransition";
import { LandscapeNav } from "./LandscapeNav";
import { DoorbellCard } from "./DoorbellCard";
import { StatusBanner } from "./StatusBanner";
import { VoiceAssistButton } from "./VoiceAssistButton";
import { VoiceAssistOverlay } from "./VoiceAssistOverlay";
import { useThemeMode } from "../hooks/useThemeMode";
import { useReady } from "../hooks/useReady";
import { useVoiceAssist } from "../hooks/useVoiceAssist";
import { useAssistConfig } from "../hooks/useAssistConfig";
import { getDeviceMode } from "../lib/deviceMode";
import { micAvailable } from "../lib/voiceRecorder";
import { useNavVisible } from "../lib/navVisibility";
import {
  HEADER_CLEARANCE,
  NAV_BAR_CLEARANCE,
  NAV_RAIL_CLEARANCE,
} from "../lib/navMetrics";

export function Layout() {
  useThemeMode();
  useReady();
  const location = useLocation();
  const isControl = location.pathname === "/control";
  const isLights = location.pathname === "/lights";
  const isBlank = location.pathname === "/blank";
  const isHome = location.pathname === "/home";
  const navVisible = useNavVisible();
  const showNav = !isBlank && navVisible;
  const isController = getDeviceMode() === "controller";
  const scrollable = isControl || isLights || isHome || isController;

  const voice = useVoiceAssist();
  const { data: assistConfig } = useAssistConfig();
  // Hidden when there is no microphone, no working pipeline, or the nav is
  // hidden — which keeps /blank black and keeps it off photos and posters.
  const showVoice = showNav && micAvailable() && assistConfig?.enabled === true;

  const content = (
    <PageTransition key={location.pathname} grow={scrollable}>
      <Outlet />
    </PageTransition>
  );

  return (
    <>
      <SocketViewListener />

      {/* On every view while the nav is up. It also masks the status-bar
          inset in an iPhone home-screen app. */}
      <StatusBanner hidden={!showNav} />

      <HStack gap="0" align="stretch">
        <LandscapeNav hidden={!showNav} />
        <Box
          height="var(--app-height, 100dvh)"
          overflow={scrollable ? "auto" : "hidden"}
          pt={showNav ? HEADER_CLEARANCE : 0}
          transition="padding 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
          // Room for the header and the floating nav: the rail on the left in
          // landscape, the bar at the bottom in portrait. The page scrolls on
          // under the bar, but its end stops above it.
          minW={{ _landscape: "100vw", _portrait: "100%" }}
          pl={{
            _landscape: showNav ? NAV_RAIL_CLEARANCE : "0px",
          }}
          pb={{
            _portrait: showNav
              ? NAV_BAR_CLEARANCE
              : "0px",
          }}
        >
          {content}
        </Box>
      </HStack>

      {!isControl && <DoorbellCard />}

      {showVoice && (
        <VoiceAssistButton
          onTap={voice.state === "idle" ? voice.start : voice.cancel}
          state={voice.state}
          navVisible={showNav}
        />
      )}

      <VoiceAssistOverlay snapshot={voice} onDismiss={voice.cancel} />
    </>
  );
}
