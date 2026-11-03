import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Card,
  Icon,
  IconButton,
  Image,
  Status,
  Text,
  VStack,
} from "@chakra-ui/react";
import { MdFullscreen, MdVideocamOff } from "react-icons/md";
import { CloseButton } from "./ui/close-button";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { useEntity, type HAState } from "../hooks/useEntity";
import { socket } from "../lib/socket";
import { CameraDialog } from "./CameraDialog";
import { CameraFeed } from "./CameraFeed";
import { CameraVideo } from "./CameraVideo";
import { IoVideocamOutline } from "react-icons/io5";

/**
 * Front-door card.
 *
 * The person sensor going on is the only trigger: the camera plays for 30s in
 * the bottom-right corner, over whatever the frame is showing, then the card
 * hides itself. The sensor dropping back to off does not cut it short — the
 * point is to see who walked up, which takes longer than the sensor stays on.
 *
 * The picture is Home Assistant's live HLS stream (CameraVideo), which only
 * exists while the card is up: unmounting the video stops its requests. (HA's
 * MJPEG stream is built from stills, which an RTSP-only Generic camera
 * doesn't have, so it isn't used.)
 *
 * When the live stream won't start it falls back to stills, one at a time: the
 * next is asked for SNAPSHOT_INTERVAL_MS after the last one loads or fails
 * (a failing HA still takes ~5s, and overlapping requests piled up on HA). If
 * no picture has arrived and a still has failed, the box says the camera is
 * unavailable rather than staying black; a frame arriving clears it.
 *
 * The button at the right of its row puts the camera full screen (0.144,
 * the user's ask: the pop-up "should also allow full screen"): the Cameras
 * page's CameraDialog, with the lights of the camera's room in its header,
 * in place of the card — the card sits above every dialog, so it can't stay
 * while one is up — and the 30s doesn't run out under it. Closing the full
 * screen dismisses the card: whoever was at the door has been seen.
 */
const SHOW_MS = 30_000;
const NO_LIGHTS: string[] = [];
const SNAPSHOT_INTERVAL_MS = 1_000;

interface NamedAttributes {
  friendly_name?: string | null;
}

export function DoorbellCard() {
  const { data: entities } = useEntitiesConfig();
  const personId = entities?.person ?? "";
  const cameraId = entities?.camera ?? "";

  // useEntity holds the socket room for both entities; the trigger below reads
  // the person sensor straight off the socket so the edge is handled in a
  // callback rather than by reacting to rendered state.
  useEntity<NamedAttributes>(personId);
  const { data: camera } = useEntity<NamedAttributes>(cameraId);

  const [visible, setVisible] = useState(false);
  // Each showing gets its own id so the browser opens a fresh stream request
  // instead of reusing the finished one from the last detection.
  const [showId, setShowId] = useState(0);
  const [mode, setMode] = useState<"live" | "snapshot">("live");
  const [tick, setTick] = useState(0);
  // Whether any picture has shown this time, and whether a still has failed.
  const [loaded, setLoaded] = useState(false);
  const [stillFailed, setStillFailed] = useState(false);
  // Full screen (CameraDialog) in place of the card; the ref is for the
  // hide timer, which must not take the card down under it.
  const [full, setFull] = useState(false);
  const fullRef = useRef(false);

  const hideTimer = useRef<number | null>(null);
  const prevState = useRef<string | undefined>(undefined);

  const clearHideTimer = () => {
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const hide = useCallback(() => {
    clearHideTimer();
    fullRef.current = false;
    setFull(false);
    setVisible(false);
  }, []);

  const showFull = () => {
    clearHideTimer();
    fullRef.current = true;
    setFull(true);
  };

  // Rising edge only. A detection while the card is already up restarts the 30s.
  useEffect(() => {
    if (!personId) return;

    function onPerson(state: HAState<NamedAttributes>) {
      const prev = prevState.current;
      prevState.current = state.state;

      if (state.state !== "on" || prev === "on") return;

      setMode("live");
      setLoaded(false);
      setStillFailed(false);
      setShowId((n) => n + 1);
      setVisible(true);

      if (hideTimer.current !== null) clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => {
        hideTimer.current = null;
        // Not while someone is watching it full screen.
        if (fullRef.current) return;
        setVisible(false);
      }, SHOW_MS);
    }

    socket.on(personId, onPerson);
    return () => {
      socket.off(personId, onPerson);
    };
  }, [personId]);

  useEffect(
    () => () => {
      if (hideTimer.current !== null) clearTimeout(hideTimer.current);
    },
    [],
  );

  // Fallback path: the next still once the current one has loaded or failed.
  const nextStill = useCallback(() => {
    window.setTimeout(() => setTick((t) => t + 1), SNAPSHOT_INTERVAL_MS);
  }, []);

  if (!visible || !cameraId) return null;

  const label = camera?.attributes?.friendly_name || "Front Door";

  if (full) {
    // The lights of the camera's room, as the Cameras page has them.
    const lights =
      entities?.rooms?.find((room) => room.cameras?.includes(cameraId))
        ?.lights ?? NO_LIGHTS;
    return (
      <CameraDialog open onClose={hide} title={label} lights={lights}>
        <CameraFeed entityId={cameraId} fill />
      </CameraDialog>
    );
  }

  return (
    <Card.Root
      position="fixed"
      bottom="calc(env(safe-area-inset-bottom, 0px) + 1rem)"
      right="calc(env(safe-area-inset-right, 0px) + 1rem)"
      // Above any open dialog: someone at the door outranks a modal.
      zIndex="toast"
      width="22rem"
      maxWidth="90vw"
      overflow="hidden"
      variant="elevated"
      // The 1px edge every card and the navs share.
      borderWidth="1px"
      borderColor="border.surface"
      animationName="slide-from-bottom, fade-in"
      animationDuration="moderate"
      cursor="pointer"
      onClick={hide}
    >
      <Box aspectRatio={16 / 9} bg="black" position="relative">
        <CloseButton
          aria-label="Dismiss"
          position="absolute"
          top="2"
          right="2"
          zIndex={1}
          size="sm"
          variant="solid"
          rounded="full"
          onClick={(e) => {
            e.stopPropagation();
            hide();
          }}
        />
        {mode === "live" ? (
          <CameraVideo
            key={showId}
            onPlaying={() => setLoaded(true)}
            onFail={() => setMode("snapshot")}
          />
        ) : (
          <Image
            key={tick}
            src={`/api/camera/snapshot?t=${tick}`}
            // The card's title names the camera; a failed still shows nothing.
            alt=""
            visibility={!loaded && stillFailed ? "hidden" : undefined}
            onLoad={() => {
              setLoaded(true);
              setStillFailed(false);
              nextStill();
            }}
            onError={() => {
              setStillFailed(true);
              nextStill();
            }}
            width="100%"
            height="100%"
            fit="cover"
          />
        )}
        {!loaded && stillFailed && (
          <VStack
            position="absolute"
            inset="0"
            justify="center"
            gap="2"
            color="whiteAlpha.700"
            pointerEvents="none"
          >
            <Icon boxSize="8">
              <MdVideocamOff />
            </Icon>
            <Text textStyle="sm">Camera unavailable</Text>
          </VStack>
        )}
      </Box>

      <Card.Body flexDirection="row" alignItems="center" gap="3" py="3">
        <Status.Root colorPalette="red">
          <Status.Indicator animation="pulse 1.6s ease-in-out infinite" />
        </Status.Root>
        <Icon color="fg.muted" boxSize="5" flexShrink={0}>
          <IoVideocamOutline />
        </Icon>
        <Box minW="0">
          <Card.Title truncate>{label}</Card.Title>
          <Card.Description>Person detected</Card.Description>
        </Box>
        <IconButton
          aria-label="Full screen"
          variant="subtle"
          size="xs"
          rounded="l2"
          ms="auto"
          flexShrink={0}
          onClick={(e) => {
            // A tap on the card dismisses it; this one doesn't.
            e.stopPropagation();
            showFull();
          }}
        >
          <MdFullscreen />
        </IconButton>
      </Card.Body>
    </Card.Root>
  );
}
