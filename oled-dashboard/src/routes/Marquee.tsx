import { useEffect } from "react";
import { Box, IconButton } from "@chakra-ui/react";
import { IoEyeOutline, IoEyeOffOutline, IoFilmOutline } from "react-icons/io5";
import { MarqueeArt } from "../components/MarqueeArt";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { useEntity } from "../hooks/useEntity";
import { artUrl, isActive, isMovie, type PlexAttrs } from "../lib/plexMedia";
import {
  getNavVisible,
  setNavVisibleLocal,
  toggleNavVisible,
  useNavVisible,
} from "../lib/navVisibility";
import { useDeviceMode } from "../lib/deviceMode";
import { EmptyState } from "../components/ui/empty-state";
import { NAV_BAR_CLEARANCE } from "../lib/navMetrics";

export function Marquee() {
  const { data: entities } = useEntitiesConfig();
  const entityId = entities?.mediaPlayer ?? "";
  const { data: media } = useEntity<PlexAttrs>(entityId);
  const navVisible = useNavVisible();
  const remote = useDeviceMode() === "controller";

  // Full-screen by default; restore whatever the nav was doing on the way out.
  useEffect(() => {
    const previous = getNavVisible();
    setNavVisibleLocal(false);
    return () => setNavVisibleLocal(previous);
  }, []);

  const state = media?.state;
  const attrs = media?.attributes;
  // Movies only, matching the watcher that routes the frame here: an episode or
  // live TV plays on without the poster wall following it.
  const showing = isActive(state);
  const src = showing && isMovie(attrs) ? artUrl(attrs) : null;
  const empty = !entityId
    ? "no media player configured"
    : showing
      ? "movies only"
      : "nothing playing";

  return (
    <Box
      width="100%"
      height="100%"
      minHeight="100vh"
      position="relative"
      overflow="hidden"
    >
      {src ? (
        <MarqueeArt src={src} />
      ) : (
        <EmptyState
          position="absolute"
          inset={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
          icon={<IoFilmOutline />}
          title={empty}
        />
      )}

      {/* The eye hides the nav on the frames; a remote's nav stays up, so
          it has no eye. */}
      {!remote && (
        <IconButton
          variant="surface"
          size="lg"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            toggleNavVisible();
          }}
          position="fixed"
          // In portrait it rides above the floating nav bar while that is up.
          bottom={{
            _landscape: "calc(16px + env(safe-area-inset-bottom, 0px))",
            _portrait: navVisible
              ? `calc(${NAV_BAR_CLEARANCE} + 1rem)`
              : "calc(16px + env(safe-area-inset-bottom, 0px))",
          }}
          right="calc(16px + env(safe-area-inset-right, 0px))"
          zIndex={200}
          aria-label={navVisible ? "Hide navigation" : "Show navigation"}
        >
          {navVisible ? <IoEyeOffOutline /> : <IoEyeOutline />}
        </IconButton>
      )}
    </Box>
  );
}
