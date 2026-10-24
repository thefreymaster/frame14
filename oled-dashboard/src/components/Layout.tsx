import { Outlet, useLocation } from "react-router";
import { Box, HStack } from "@chakra-ui/react";
import { SocketViewListener } from "./SocketViewListener";
import { PageTransition } from "./PageTransition";
import { LandscapeNav } from "./LandscapeNav";
import { DoorbellCard } from "./DoorbellCard";
import { LightStrip } from "./LightStrip";
import { useDesktop } from "../hooks/useDesktop";
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
import { useReleaseSplash } from "../hooks/useReleaseSplash";
import {
  HEADER_CLEARANCE,
  LIGHT_STRIP_CLEARANCE,
  NAV_BAR_CLEARANCE,
  NAV_RAIL_CLEARANCE,
} from "../lib/navMetrics";

// Pages that can run past the screen and scroll (on a remote, every page
// does); the rest are fixed, full-screen views.
const SCROLLING_PATHS = new Set([
  "/control",
  "/lights",
  "/home",
  "/printer",
  "/vacuum",
]);

// Pages that keep the launch splash up until they have data: /home waits for
// its cards (HomeOverview), and "/" is on its way there. Any other page is
// ready once it has mounted.
const SPLASH_HOLDING_PATHS = new Set(["/", "/home"]);

export function Layout() {
  useThemeMode();
  useReady();
  const location = useLocation();
  useReleaseSplash(!SPLASH_HOLDING_PATHS.has(location.pathname));
  const isControl = location.pathname === "/control";
  const isBlank = location.pathname === "/blank";
  const navVisible = useNavVisible();
  const showNav = !isBlank && navVisible;
  const isController = getDeviceMode() === "controller";
  const scrollable = SCROLLING_PATHS.has(location.pathname) || isController;

  const voice = useVoiceAssist();
  const { data: assistConfig } = useAssistConfig();
  // Hidden when there is no microphone, no working pipeline, or the nav is
  // hidden — which keeps /blank black and keeps it off photos and posters.
  const showVoice = showNav && micAvailable() && assistConfig?.enabled === true;
  const voiceTap = voice.state === "idle" ? voice.start : voice.cancel;
  const desktop = useDesktop();

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
      <StatusBanner
        hidden={!showNav}
        voice={
          showVoice && (
            <VoiceAssistButton onTap={voiceTap} state={voice.state} />
          )
        }
      />

      <HStack gap="0" align="stretch">
        <LandscapeNav hidden={!showNav} />
        <Box
          height="var(--app-height, 100dvh)"
          overflow={scrollable ? "auto" : "hidden"}
          pt={showNav ? HEADER_CLEARANCE : 0}
          transition="padding 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
          // Room for the header and the floating nav: the rail on the left in
          // landscape, the bar at the bottom in portrait, and on a desktop the
          // lights strip along the bottom. The page scrolls on under the bar,
          // but its end stops above it.
          minW={{ _landscape: "100vw", _portrait: "100%" }}
          pl={{
            _landscape: showNav ? NAV_RAIL_CLEARANCE : "0px",
          }}
          pb={{
            _portrait: showNav ? NAV_BAR_CLEARANCE : "0px",
            _landscape: showNav && desktop ? LIGHT_STRIP_CLEARANCE : "0px",
          }}
        >
          {content}
        </Box>
      </HStack>

      {!isControl && <DoorbellCard />}

      {desktop && <LightStrip hidden={!showNav} />}

      <VoiceAssistOverlay snapshot={voice} onDismiss={voice.cancel} />
    </>
  );
}
