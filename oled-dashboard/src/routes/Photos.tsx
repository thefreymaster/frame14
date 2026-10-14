import { useEffect, useState } from "react";
import { Box, IconButton, Spinner, Text } from "@chakra-ui/react";
import {
  IoEyeOutline,
  IoEyeOffOutline,
  IoImagesOutline,
} from "react-icons/io5";
import { PhotoSlide } from "../components/PhotoSlide";
import { PixelShift } from "../components/PixelShift";
import { useAlbumPhotos } from "../hooks/useAlbumPhotos";
import { usePhotosConfig } from "../hooks/usePhotosConfig";
import { useWeather } from "../hooks/useWeather";
import { useRegionLuminance } from "../hooks/useRegionLuminance";
import { socket } from "../lib/socket";
import { useQueryClient } from "@tanstack/react-query";
import { useNavVisible, toggleNavVisible } from "../lib/navVisibility";
import { EmptyState } from "../components/ui/empty-state";
import {
  HERO_SUFFIX_SIZE,
  HERO_TEXT,
  HOME_HERO_INSET,
  PHOTOS_HERO_SIZE,
} from "../lib/hero";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

interface OverlayProps {
  assetId: string | null;
}

function PhotoOverlay({ assetId }: OverlayProps) {
  const [now, setNow] = useState(new Date());
  const { data: weather } = useWeather();

  const thumbUrl = assetId ? `/api/photos/asset/${assetId}/thumbnail` : null;
  const luminance = useRegionLuminance(thumbUrl);

  // While luminance is unknown keep existing color; snap once known
  const color =
    luminance === "light" ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.85)";

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const rawHours = now.getHours();
  const hours = pad(rawHours % 12 || 12);
  const minutes = pad(now.getMinutes());
  const ampm = rawHours < 12 ? "am" : "pm";

  return (
    <PixelShift>
      {/* Inset like Home's clock row and styled like Home's clock, a size
          smaller so the photo shows; see lib/hero.ts. */}
      <Box
        position="absolute"
        top="8"
        left={HOME_HERO_INSET}
        right={HOME_HERO_INSET}
        textAlign="left"
        pointerEvents="none"
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="baseline"
          width="100%"
          css={{ containerType: "inline-size" }}
        >
          <Text
            {...HERO_TEXT}
            fontSize={PHOTOS_HERO_SIZE}
            color={color}
            style={{ transition: "color 1s ease" }}
          >
            {hours}:{minutes}
            <Text
              as="span"
              fontSize={HERO_SUFFIX_SIZE}
              fontWeight="medium"
              color={color}
              ms="2"
              style={{ transition: "color 1s ease" }}
            >
              {ampm}
            </Text>
          </Text>
          {weather && (
            <Text
              {...HERO_TEXT}
              fontSize={PHOTOS_HERO_SIZE}
              color={color}
              style={{ transition: "color 1s ease" }}
            >
              {Math.round(weather.temperature)}°
            </Text>
          )}
        </Box>
      </Box>
    </PixelShift>
  );
}

const SLIDE_INTERVAL_MS = 30_000;

export function Photos() {
  const queryClient = useQueryClient();
  const { data: config, isPending: configPending } = usePhotosConfig();
  const activeAlbumId = config?.defaultAlbumId ?? null;
  const [currentIndex, setCurrentIndex] = useState(0);
  const navVisible = useNavVisible();

  const { data: album, isPending: photosPending } =
    useAlbumPhotos(activeAlbumId);

  // HA fires /api/photos/refresh when input_select.smart_frame_album changes;
  // server broadcasts photos_refresh so all frames reload their album.
  useEffect(() => {
    function onRefresh() {
      queryClient.invalidateQueries({ queryKey: ["photos", "config"] });
      queryClient.invalidateQueries({ queryKey: ["immich", "album"] });
    }
    socket.on("photos_refresh", onRefresh);
    return () => {
      socket.off("photos_refresh", onRefresh);
    };
  }, [queryClient]);

  // Auto-advance slideshow
  useEffect(() => {
    if (!album || album.assets.length === 0) return;
    const id = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % album.assets.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [album]);

  // Reset index when album changes (derived during render, not in an effect).
  const [indexAlbumId, setIndexAlbumId] = useState(activeAlbumId);
  if (indexAlbumId !== activeAlbumId) {
    setIndexAlbumId(activeAlbumId);
    setCurrentIndex(0);
  }

  // Advance to a random photo
  function advancePhoto() {
    if (!album || album.assets.length === 0) return;
    setCurrentIndex((prev) => {
      let next = prev;
      while (next === prev && album.assets.length > 1) {
        next = Math.floor(Math.random() * album.assets.length);
      }
      return next;
    });
  }

  // Jump to a random photo on next_photo socket event
  useEffect(() => {
    socket.on("next_photo", advancePhoto);
    return () => {
      socket.off("next_photo", advancePhoto);
    };
  }, [album]);

  // Right arrow key advances photo in landscape mode
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        advancePhoto();
      }
    }
    const mql = window.matchMedia("(orientation: landscape)");
    if (mql.matches) {
      window.addEventListener("keydown", onKeyDown);
    }
    function onOrientationChange(e: MediaQueryListEvent) {
      if (e.matches) {
        window.addEventListener("keydown", onKeyDown);
      } else {
        window.removeEventListener("keydown", onKeyDown);
      }
    }
    mql.addEventListener("change", onOrientationChange);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      mql.removeEventListener("change", onOrientationChange);
    };
  }, [album]);

  if (configPending) {
    return (
      <Box
        width="100%"
        height="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Spinner size="lg" />
      </Box>
    );
  }

  if (!activeAlbumId) {
    return (
      <Box
        width="100%"
        height="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <EmptyState
          icon={<IoImagesOutline />}
          title="no album configured"
          description="Pick one under Album on the Settings page."
        />
      </Box>
    );
  }

  return (
    <Box
      width="100%"
      height="100vh"
      position="relative"
      overflow="hidden"
      onClick={advancePhoto}
      cursor="pointer"
    >
      {photosPending && (
        <Box
          position="absolute"
          inset={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Spinner size="lg" />
        </Box>
      )}

      {album?.assets.map((asset, i) => (
        <PhotoSlide
          key={asset.id}
          assetId={asset.id}
          visible={i === currentIndex}
        />
      ))}

      <PhotoOverlay assetId={album?.assets[currentIndex]?.id ?? null} />

      <IconButton
        variant="surface"
        size="lg"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          toggleNavVisible();
        }}
        position="fixed"
        bottom="calc(16px + env(safe-area-inset-bottom, 0px))"
        right="calc(16px + env(safe-area-inset-right, 0px))"
        zIndex={200}
        aria-label={navVisible ? "Hide navigation" : "Show navigation"}
      >
        {navVisible ? <IoEyeOffOutline /> : <IoEyeOutline />}
      </IconButton>
    </Box>
  );
}
