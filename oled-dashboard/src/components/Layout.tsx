import { Outlet, useLocation } from "react-router";
import { Box, HStack } from "@chakra-ui/react";
import { SocketViewListener } from "./SocketViewListener";
import { PageTransition } from "./PageTransition";
import { LandscapeNav } from "./LandscapeNav";
import { DoorbellCard } from "./DoorbellCard";
import { VoiceAssistButton } from "./VoiceAssistButton";
import { VoiceAssistOverlay } from "./VoiceAssistOverlay";
import { useThemeMode } from "../hooks/useThemeMode";
import { useReady } from "../hooks/useReady";
import { useVoiceAssist } from "../hooks/useVoiceAssist";
import { useAssistConfig } from "../hooks/useAssistConfig";
import { getDeviceMode } from "../lib/deviceMode";
import { micAvailable } from "../lib/voiceRecorder";
import { useNavVisible } from "../lib/navVisibility";
import { NAV_BAR_CLEARANCE, NAV_RAIL_WIDTH } from "../lib/navMetrics";

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

      {/* Behind the status bar. The page's top padding clears it at rest, but
          in an iPhone home-screen app (black-translucent status bar) content
          scrolled up would show through under the clock and notch; this strip
          masks it. Zero height everywhere else. */}
      {showNav && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          height="env(safe-area-inset-top, 0px)"
          bg="bg"
          zIndex="sticky"
          pointerEvents="none"
        />
      )}

      <HStack gap="0" align="stretch">
        <LandscapeNav hidden={!showNav} />
        <Box
          height="var(--app-height, 100dvh)"
          overflow={scrollable ? "auto" : "hidden"}
          pt={showNav ? "env(safe-area-inset-top, 0px)" : 0}
          transition="padding 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
          // Room for the nav: a rail on the left in landscape, the floating bar
          // in portrait. The page scrolls on under the bar, but its end stops
          // above it.
          minW={{ _landscape: "100vw", _portrait: "100%" }}
          pl={{
            _landscape: showNav
              ? `calc(${NAV_RAIL_WIDTH} + env(safe-area-inset-left, 0px))`
              : "0px",
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
