import { useEffect, useState } from "react";
import { Box, IconButton, Spinner, Text } from "@chakra-ui/react";
import { SURFACE_SHADOW } from "../lib/floatingSurface";
import {
  IoEyeOutline,
  IoEyeOffOutline,
  IoImagesOutline,
} from "react-icons/io5";
import { PhotoSlide } from "../components/PhotoSlide";
import { PixelShift } from "../components/PixelShift";
import { useAlbumPhotos, type ImmichAsset } from "../hooks/useAlbumPhotos";
import { usePhotosConfig } from "../hooks/usePhotosConfig";
import { useWeather } from "../hooks/useWeather";
import { useRegionLuminance } from "../hooks/useRegionLuminance";
import { socket } from "../lib/socket";
import { useQueryClient } from "@tanstack/react-query";
import { useNavVisible, toggleNavVisible } from "../lib/navVisibility";
import { useDeviceMode } from "../lib/deviceMode";
import {
  loadPosition,
  onPhotoPicked,
  reportPhotoShown,
  savePosition,
} from "../lib/slideshow";
import { useDesktop } from "../hooks/useDesktop";
import { NAV_BAR_CLEARANCE, PAGE_GUTTER } from "../lib/navMetrics";
import { EmptyState } from "../components/ui/empty-state";
import {
  FRAMED_PHOTOS_HERO_SIZE,
  HERO_SIZE,
  HERO_SUFFIX_SIZE,
  HERO_TEXT,
  HOME_HERO_INSET,
} from "../lib/hero";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

interface OverlayProps {
  assetId: string | null;
  framed: boolean;
}

function PhotoOverlay({ assetId, framed }: OverlayProps) {
  const [now, setNow] = useState(new Date());
  const { data: weather } = useWeather();

  const thumbUrl = assetId ? `/api/photos/asset/${assetId}/thumbnail` : null;
  const luminance = useRegionLuminance(thumbUrl);

  // While luminance is unknown keep existing color; snap once known
  const color =
    luminance === "light" ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.85)";
  const size = framed ? FRAMED_PHOTOS_HERO_SIZE : HERO_SIZE;

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
      {/* Inset like Home's clock row and styled like Home's clock, so the
          figures come out the same size as Home's (smaller framed on a
          desktop); see lib/hero.ts. */}
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
            fontSize={size}
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
              fontSize={size}
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

/** Where the photo with this id is in the album, or the first photo. */
function indexOf(assets: ImmichAsset[], id: string | null): number {
  return Math.max(
    0,
    assets.findIndex((a) => a.id === id),
  );
}

/** The photo after this one, back to the first after the last. */
function nextAfter(assets: ImmichAsset[], id: string | null): string {
  return assets[(indexOf(assets, id) + 1) % assets.length].id;
}

export function Photos() {
  const queryClient = useQueryClient();
  const { data: config, isPending: configPending } = usePhotosConfig();
  const activeAlbumId = config?.defaultAlbumId ?? null;
  const navVisible = useNavVisible();
  const remote = useDeviceMode() === "controller";
  // Framed (a card in the page) on a desktop; full-screen elsewhere.
  const framed = useDesktop();

  const { data: album, isPending: photosPending } =
    useAlbumPhotos(activeAlbumId);

  // The photo on screen, by id, so an album that reloads with photos added or
  // removed stays on it. The album plays in its own order (the server sends
  // Immich's), and picks up from the photo it was last on (lib/slideshow):
  // otherwise leaving the page, or the frame's morning browser restart, would
  // start it over from the first photo every time. Set during render when the
  // album changes, not in an effect.
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [idAlbumId, setIdAlbumId] = useState<string | null>(null);
  if (idAlbumId !== activeAlbumId) {
    setIdAlbumId(activeAlbumId);
    setCurrentId(activeAlbumId ? loadPosition(activeAlbumId) : null);
  }
  const currentIndex = album ? indexOf(album.assets, currentId) : 0;
  const currentAssetId = album?.assets[currentIndex]?.id ?? null;

  useEffect(() => {
    if (activeAlbumId && currentAssetId) {
      savePosition(activeAlbumId, currentAssetId);
    }
  }, [activeAlbumId, currentAssetId]);

  // A photo picked on a remote's grid.
  useEffect(
    () =>
      onPhotoPicked((pick) => {
        if (pick.albumId === activeAlbumId) setCurrentId(pick.assetId);
      }),
    [activeAlbumId],
  );

  // A frame tells the remotes which photo is up, again after a reconnect (the
  // server forgets a dropped socket's photo), and that none is once it leaves.
  useEffect(() => {
    if (remote) return;
    const report = () => reportPhotoShown(currentAssetId);
    report();
    socket.on("connect", report);
    return () => {
      socket.off("connect", report);
    };
  }, [remote, currentAssetId]);

  useEffect(() => {
    if (remote) return;
    return () => reportPhotoShown(null);
  }, [remote]);

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

  // Auto-advance: every photo gets the full interval, one put up by a tap or
  // a remote's pick too.
  useEffect(() => {
    if (!album || album.assets.length === 0) return;
    const id = setTimeout(() => {
      setCurrentId((prev) => nextAfter(album.assets, prev));
    }, SLIDE_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [album, currentAssetId]);

  // On to the next photo (a tap, the next_photo event, the right arrow)
  function advancePhoto() {
    if (!album || album.assets.length === 0) return;
    setCurrentId((prev) => nextAfter(album.assets, prev));
  }

  // Next photo on the next_photo socket event
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

  const slideshow = (
    <Box
      width="100%"
      height={framed ? "100%" : "100vh"}
      position="relative"
      overflow="hidden"
      onClick={advancePhoto}
      cursor="pointer"
      // Framed, it is a card: the cards' corners and edge.
      rounded={framed ? "surface" : undefined}
      borderWidth={framed ? "1px" : undefined}
      borderColor={framed ? "border.surface" : undefined}
      shadow={framed ? SURFACE_SHADOW : undefined}
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

      <PhotoOverlay assetId={currentAssetId} framed={framed} />

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
          // Framed, it moves in by the gutter so it sits inside the card's
          // corner rather than on it.
          bottom={{
            _landscape: framed
              ? `calc(${PAGE_GUTTER} + 16px)`
              : "calc(16px + env(safe-area-inset-bottom, 0px))",
            _portrait: navVisible
              ? `calc(${NAV_BAR_CLEARANCE} + 1rem)`
              : "calc(16px + env(safe-area-inset-bottom, 0px))",
          }}
          right={
            framed
              ? `calc(${PAGE_GUTTER} + 16px)`
              : "calc(16px + env(safe-area-inset-right, 0px))"
          }
          zIndex={200}
          aria-label={navVisible ? "Hide navigation" : "Show navigation"}
        >
          {navVisible ? <IoEyeOffOutline /> : <IoEyeOutline />}
        </IconButton>
      )}
    </Box>
  );

  // On a desktop the slideshow sits in the page like a card, inside the
  // gutter; data-page-fill gives it the page's height even where the layout
  // scrolls (see PageTransition). The frame and phones stay full-screen.
  return framed ? (
    <Box data-page-fill="" width="100%" height="100%" p="gutter">
      {slideshow}
    </Box>
  ) : (
    slideshow
  );
}
