import { useEffect, useState } from "react";
import { Box, VStack, Text, HStack, Button, Spinner } from "@chakra-ui/react";
import { PhotoSlide } from "../components/PhotoSlide";
import { PixelShift } from "../components/PixelShift";
import { useImmichAlbums } from "../hooks/useImmichAlbums";
import { useAlbumPhotos } from "../hooks/useAlbumPhotos";
import { usePhotosConfig } from "../hooks/usePhotosConfig";
import { useWeather } from "../hooks/useWeather";
import { useRegionLuminance } from "../hooks/useRegionLuminance";
import { socket } from "../lib/socket";

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
        top="5vw"
        left="5vw"
        right="5vw"
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
            fontSize="14vw"
            fontWeight="300"
            letterSpacing="-0.03em"
            color={color}
            lineHeight="0.9"
            style={{ transition: "color 1s ease" }}
          >
            {hours}:{minutes}
            <Text
              as="span"
              fontSize="5.5vw"
              fontWeight="300"
              color={color}
              ml="1.5vw"
              style={{ transition: "color 1s ease" }}
            >
              {ampm}
            </Text>
          </Text>
          {weather && (
            <Text
              fontSize="14vw"
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
  const { data: config } = usePhotosConfig();
  const pinnedAlbumId = config?.defaultAlbumId ?? null;

  // Only fetch albums list when no album is pinned
  const {
    data: albums,
    isPending: albumsPending,
    isError: albumsError,
  } = useImmichAlbums();
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Pinned album takes priority, then user selection, then first album
  const activeAlbumId =
    pinnedAlbumId ?? selectedAlbumId ?? albums?.[0]?.id ?? null;
  const { data: album, isPending: photosPending } =
    useAlbumPhotos(activeAlbumId);

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

  // Jump to a random photo on next_photo socket event
  useEffect(() => {
    function onNextPhoto() {
      if (!album || album.assets.length === 0) return;
      setCurrentIndex((prev) => {
        let next = prev;
        while (next === prev && album.assets.length > 1) {
          next = Math.floor(Math.random() * album.assets.length);
        }
        return next;
      });
    }
    socket.on("next_photo", onNextPhoto);
    return () => {
      socket.off("next_photo", onNextPhoto);
    };
  }, [album]);

  if (!pinnedAlbumId && albumsPending) {
    return (
      <Box
        width="100vw"
        height="100vh"
        bg="black"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Spinner size="lg" color="gray.600" />
      </Box>
    );
  }

  if (!pinnedAlbumId && (albumsError || !albums || albums.length === 0)) {
    return (
      <Box
        width="100vw"
        height="100vh"
        bg="black"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text color="gray.700" fontSize="sm">
          no albums available
        </Text>
      </Box>
    );
  }

  return (
    <Box
      width="100vw"
      height="100vh"
      bg="black"
      position="relative"
      overflow="hidden"
    >
      {photosPending && (
        <Box
          position="absolute"
          inset={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Spinner size="lg" color="gray.600" />
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

      {/* Album picker — only shown when no album is pinned via config */}
      {!pinnedAlbumId && albums && albums.length > 0 && (
        <Box
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          bg="blackAlpha.800"
          p={3}
        >
          <VStack gap={2} align="stretch">
            <Text fontSize="xs" color="gray.600" textAlign="center">
              {album ? `${currentIndex + 1} / ${album.assets.length}` : ""}
            </Text>
            <HStack gap={2} overflowX="auto" justify="center">
              {albums.map((a) => (
                <Button
                  key={a.id}
                  size="xs"
                  variant={a.id === activeAlbumId ? "solid" : "outline"}
                  colorScheme="gray"
                  onClick={() => setSelectedAlbumId(a.id)}
                  flexShrink={0}
                >
                  {a.albumName}
                </Button>
              ))}
            </HStack>
          </VStack>
        </Box>
      )}
    </Box>
  );
}
