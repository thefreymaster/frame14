import { useEffect } from "react";
import { Box, Text } from "@chakra-ui/react";
import { IoEyeOutline, IoEyeOffOutline } from "react-icons/io5";
import { MarqueeArt } from "../components/MarqueeArt";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { useEntity } from "../hooks/useEntity";
import { artUrl, isActive, type PlexAttrs } from "../lib/plexMedia";
import {
  getNavVisible,
  setNavVisibleLocal,
  toggleNavVisible,
  useNavVisible,
} from "../lib/navVisibility";

export function Marquee() {
  const { data: entities } = useEntitiesConfig();
  const entityId = entities?.mediaPlayer ?? "";
  const { data: media } = useEntity<PlexAttrs>(entityId);
  const navVisible = useNavVisible();

  // Full-screen by default; restore whatever the nav was doing on the way out.
  useEffect(() => {
    const previous = getNavVisible();
    setNavVisibleLocal(false);
    return () => setNavVisibleLocal(previous);
  }, []);

  const state = media?.state;
  const src = isActive(state) ? artUrl(media?.attributes) : null;

  return (
    <Box
      width="100%"
      height="100%"
      minHeight="100vh"
      bg="var(--theme-bg)"
      position="relative"
      overflow="hidden"
    >
      {src ? (
        <MarqueeArt src={src} />
      ) : (
        <Box
          position="absolute"
          inset={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Text color="var(--theme-fg-faint)" fontSize="sm">
            {entityId ? "nothing playing" : "no media player configured"}
          </Text>
        </Box>
      )}

      <Box
        as="button"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          toggleNavVisible();
        }}
        position="fixed"
        bottom="calc(16px + env(safe-area-inset-bottom, 0px))"
        right="calc(16px + env(safe-area-inset-right, 0px))"
        width="44px"
        height="44px"
        borderRadius="full"
        bg="rgba(0,0,0,0.4)"
        color="rgba(255,255,255,0.85)"
        display="flex"
        alignItems="center"
        justifyContent="center"
        backdropFilter="blur(8px)"
        border="1px solid rgba(255,255,255,0.15)"
        _active={{ opacity: 0.5 }}
        zIndex={200}
        aria-label={navVisible ? "Hide navigation" : "Show navigation"}
      >
        {navVisible ? (
          <IoEyeOffOutline size={20} />
        ) : (
          <IoEyeOutline size={20} />
        )}
      </Box>
    </Box>
  );
}
