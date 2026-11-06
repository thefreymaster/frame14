import { useLayoutEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router";
import { Box, HStack } from "@chakra-ui/react";
import { SocketViewListener } from "./SocketViewListener";
import { ScreenListener } from "./ScreenListener";
import { PageTransition } from "./PageTransition";
import { LandscapeNav } from "./LandscapeNav";
import { DoorbellCard } from "./DoorbellCard";
import { useDesktop } from "../hooks/useDesktop";
import { StatusBanner } from "./StatusBanner";
import { VoiceAssistButton } from "./VoiceAssistButton";
import { VoiceAssistOverlay } from "./VoiceAssistOverlay";
import { ScreenOffButton } from "./ScreenOffButton";
import { useReady } from "../hooks/useReady";
import { useVoiceAssist } from "../hooks/useVoiceAssist";
import { useAssistConfig } from "../hooks/useAssistConfig";
import { getDeviceMode } from "../lib/deviceMode";
import { micAvailable } from "../lib/voiceRecorder";
import { useNavVisible } from "../lib/navVisibility";
import { useHomeArranging } from "../lib/homeArranging";
import { useReleaseSplash } from "../hooks/useReleaseSplash";
import { useScrolledFromTop } from "../hooks/useScrolledFromTop";
import { pageOf } from "../lib/pagePath";
import {
  HEADER_CLEARANCE,
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
  // Dozens of containers (0.151.0).
  "/unraid",
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
  useReady();
  const location = useLocation();
  // The page, without its tab (lib/pagePath, 0.138): a tab is a sub-route.
  const page = pageOf(location.pathname);
  useReleaseSplash(!SPLASH_HOLDING_PATHS.has(page));
  const isControl = page === "/control";
  const isBlank = page === "/blank";
  const navVisible = useNavVisible();
  const showNav = !isBlank && navVisible;
  // While /home is being arranged the header and the navs are veiled and
  // inert (ArrangingVeil): Done is the way out, not a tap on a nav entry.
  const arranging = useHomeArranging();
  const isController = getDeviceMode() === "controller";
  const desktop = useDesktop();
  const scrollable =
    SCROLLING_PATHS.has(page) ||
    isController ||
    (desktop && DESKTOP_SCROLLING_PATHS.has(page));
  // A scrolling page in Safari on an iPhone (main.tsx marks html before the
  // first render; read here, not at module load, which is before that): the
  // Box grows with the page and the document scrolls (since 0.117.1), so
  // Safari's bar shrinks as it moves and the content runs on under it, as on
  // any site. The fixed views keep their height there too.
  const documentScrolls =
    scrollable && "safariBar" in document.documentElement.dataset;

  const voice = useVoiceAssist();
  const { data: assistConfig } = useAssistConfig();
  // Hidden when there is no microphone, no working pipeline, or the nav is
  // hidden — which keeps /blank black and keeps it off photos and posters.
  const showVoice = showNav && micAvailable() && assistConfig?.enabled === true;
  const voiceTap = voice.state === "idle" ? voice.start : voice.cancel;
  // The page scrolls inside the Box below, not the document. The header
  // draws its bottom edge while the page has scrolled under it.
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrolled = useScrolledFromTop(scrollRef, page);
  // A new page starts at the top (since 0.111). The scroll position is the
  // Box's (the document's, where that scrolls), which outlives the page: a
  // long page scrolled down and a nav tap left the next page scrolled too,
  // unless it was short enough to clamp. Before paint, so the new page never
  // shows scrolled; the page alone, so a tab change within it (its sub-route
  // since 0.138, `?tab=` before) keeps its place — and, keyed the same, its
  // entrance doesn't play again.
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [page]);

  const content = (
    <PageTransition key={page} grow={scrollable}>
      <Outlet />
    </PageTransition>
  );

  return (
    <>
      <SocketViewListener />
      <ScreenListener />

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
        // The power button decides for itself: a frame's turns the screen
        // off (0.130), a remote's switches the frames' screen (0.161).
        screen={<ScreenOffButton />}
      />

      <HStack gap="0" align="stretch">
        <LandscapeNav hidden={!showNav} veiled={arranging} />
        <Box
          ref={scrollRef}
          // The scroller, the app's height tall — or, where the document
          // scrolls, as tall as the page and at least the screen.
          height={documentScrolls ? "auto" : "var(--app-height, 100dvh)"}
          minHeight={documentScrolls ? "var(--app-height, 100dvh)" : undefined}
          overflow={
            documentScrolls ? "visible" : scrollable ? "auto" : "hidden"
          }
          pt={showNav ? HEADER_CLEARANCE : 0}
          transition="padding 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
          // Room for the header and the floating nav: the rail on the left in
          // landscape, the bar at the bottom in portrait. The page scrolls
          // on under the bar, but its end stops above it.
          minW={{ _landscape: "100vw", _portrait: "100%" }}
          pl={{
            _landscape: showNav ? NAV_RAIL_CLEARANCE : "0px",
          }}
          pb={{
            _portrait: showNav ? NAV_BAR_CLEARANCE : "0px",
            _landscape: "0px",
          }}
        >
          {content}
        </Box>
      </HStack>

      {!isControl && <DoorbellCard />}

      <VoiceAssistOverlay snapshot={voice} onDismiss={voice.cancel} />
    </>
  );
}
