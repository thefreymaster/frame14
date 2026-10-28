import { useRef } from "react";
import { Outlet, useLocation } from "react-router";
import { Box, HStack } from "@chakra-ui/react";
import { SocketViewListener } from "./SocketViewListener";
import { PageTransition } from "./PageTransition";
import { LandscapeNav } from "./LandscapeNav";
import { DoorbellCard } from "./DoorbellCard";
// The lights strip is off for now (0.91): the user isn't sold on it. Its code
// stays (LightStrip, LightStripItem, lib/lightStripVisibility, the Display
// switch on /control); uncomment the lines marked "lights strip" to bring it
// back.
// import { LightStrip } from "./LightStrip";
import { useDesktop } from "../hooks/useDesktop";
import { StatusBanner } from "./StatusBanner";
import { SystemFooter } from "./SystemFooter";
import { VoiceAssistButton } from "./VoiceAssistButton";
import { VoiceAssistOverlay } from "./VoiceAssistOverlay";
import { useThemeMode } from "../hooks/useThemeMode";
import { useReady } from "../hooks/useReady";
import { useVoiceAssist } from "../hooks/useVoiceAssist";
import { useAssistConfig } from "../hooks/useAssistConfig";
import { getDeviceMode } from "../lib/deviceMode";
import { micAvailable } from "../lib/voiceRecorder";
import { useNavVisible } from "../lib/navVisibility";
import { useHomeArranging } from "../lib/homeArranging";
// import { useLightStripShown } from "../lib/lightStripVisibility"; // lights strip
import { useReleaseSplash } from "../hooks/useReleaseSplash";
import { useScrolledFromTop } from "../hooks/useScrolledFromTop";
import {
  FOOTER_CLEARANCE,
  HEADER_CLEARANCE,
  // LIGHT_STRIP_CLEARANCE, // lights strip
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
// Pages that scroll on a desktop only: /weather lays its cards out in full
// there (the frame keeps its fixed, tabbed form), and /energy's Solar tab —
// the Today card over the month chart — is taller than a landscape screen,
// where the portrait frame has the height for it.
const DESKTOP_SCROLLING_PATHS = new Set(["/weather", "/energy"]);

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
  // While /home is being arranged the header and the navs are veiled and
  // inert (ArrangingVeil): Done is the way out, not a tap on a nav entry.
  const arranging = useHomeArranging();
  const isController = getDeviceMode() === "controller";
  const desktop = useDesktop();
  const scrollable =
    SCROLLING_PATHS.has(location.pathname) ||
    isController ||
    (desktop && DESKTOP_SCROLLING_PATHS.has(location.pathname));

  const voice = useVoiceAssist();
  const { data: assistConfig } = useAssistConfig();
  // Hidden when there is no microphone, no working pipeline, or the nav is
  // hidden — which keeps /blank black and keeps it off photos and posters.
  const showVoice = showNav && micAvailable() && assistConfig?.enabled === true;
  const voiceTap = voice.state === "idle" ? voice.start : voice.cancel;
  // The lights strip is a desktop's, and this device's Display switch can put
  // it away: it slides off like the nav and the page takes the room.
  // const lightStripShown = useLightStripShown(); // lights strip
  // const showLightStrip = showNav && lightStripShown; // lights strip
  // The system footer is a desktop's too (since 0.102), along the bottom
  // where the strip was; it comes and goes with the nav.
  const showFooter = desktop && showNav;
  // The page scrolls inside the Box below, not the document. The header
  // draws its bottom edge while the page has scrolled under it.
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrolled = useScrolledFromTop(scrollRef, location.pathname);

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
        veiled={arranging}
        scrolled={scrolled}
        voice={
          showVoice && (
            <VoiceAssistButton onTap={voiceTap} state={voice.state} />
          )
        }
      />

      <HStack gap="0" align="stretch">
        <LandscapeNav
          hidden={!showNav}
          veiled={arranging}
          aboveFooter={showFooter}
        />
        <Box
          ref={scrollRef}
          height="var(--app-height, 100dvh)"
          overflow={scrollable ? "auto" : "hidden"}
          pt={showNav ? HEADER_CLEARANCE : 0}
          transition="padding 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
          // Room for the header and the floating nav: the rail on the left in
          // landscape, the bar at the bottom in portrait (and, while it was
          // on, a desktop's lights strip along the bottom). The page scrolls
          // on under the bar, but its end stops above it.
          minW={{ _landscape: "100vw", _portrait: "100%" }}
          pl={{
            _landscape: showNav ? NAV_RAIL_CLEARANCE : "0px",
          }}
          pb={{
            _portrait: showNav ? NAV_BAR_CLEARANCE : "0px",
            // lights strip:
            // _landscape: showLightStrip && desktop ? LIGHT_STRIP_CLEARANCE : "0px",
            _landscape: showFooter ? FOOTER_CLEARANCE : "0px",
          }}
        >
          {content}
        </Box>
      </HStack>

      {!isControl && <DoorbellCard />}

      {/* {desktop && <LightStrip hidden={!showLightStrip} />} */}

      {desktop && <SystemFooter hidden={!showFooter} veiled={arranging} />}

      <VoiceAssistOverlay snapshot={voice} onDismiss={voice.cancel} />
    </>
  );
}
