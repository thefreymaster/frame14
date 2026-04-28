import { useEffect, useState } from "react";
import { Box, Text, Spinner } from "@chakra-ui/react";
import { PhotoSlide } from "../components/PhotoSlide";
import { PixelShift } from "../components/PixelShift";
import { useAlbumPhotos } from "../hooks/useAlbumPhotos";
import { usePhotosConfig } from "../hooks/usePhotosConfig";
import { useWeather } from "../hooks/useWeather";
import { useRegionLuminance } from "../hooks/useRegionLuminance";
import { socket } from "../lib/socket";
import { useQueryClient } from "@tanstack/react-query";

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
  const ampm = rawHours < 12 ? "AM" : "PM";

  return (
    <PixelShift>
      <Box
        position="absolute"
        top="5vmin"
        left="5vmin"
        right="5vmin"
        textAlign="left"
        pointerEvents="none"
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-end"
          width="100%"
        >
          <Text
            fontSize="14vmin"
            fontWeight="300"
            letterSpacing="-0.03em"
            color={color}
            lineHeight="0.9"
            style={{ transition: "color 1s ease" }}
          >
            {hours}:{minutes}
            <Text
              as="span"
              fontSize="5.5vmin"
              fontWeight="300"
              color={color}
              ml="1.5vmin"
              style={{ transition: "color 1s ease" }}
            >
              {ampm}
            </Text>
          </Text>
          {weather && (
            <Text
              fontSize="14vmin"
              fontWeight="300"
              letterSpacing="-0.03em"
              color={color}
              lineHeight="0.9"
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

  // Reset index when album changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [activeAlbumId]);

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
        bg="var(--theme-bg)"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Spinner size="lg" color="var(--theme-fg-muted)" />
      </Box>
    );
  }

  if (!activeAlbumId) {
    return (
      <Box
        width="100%"
        height="100vh"
        bg="var(--theme-bg)"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text color="var(--theme-fg-faint)" fontSize="sm">
          no album configured
        </Text>
      </Box>
    );
  }

  return (
    <Box
      width="100%"
      height="100vh"
      bg="var(--theme-bg)"
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
          <Spinner size="lg" color="var(--theme-fg-muted)" />
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
    </Box>
  );
}
