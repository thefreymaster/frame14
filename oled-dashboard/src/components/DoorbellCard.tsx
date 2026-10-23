import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Card, Icon, Image, Status, Text, VStack } from "@chakra-ui/react";
import { MdVideocamOff } from "react-icons/md";
import { CloseButton } from "./ui/close-button";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { useEntity, type HAState } from "../hooks/useEntity";
import { socket } from "../lib/socket";
import { useDesktop } from "../hooks/useDesktop";
import { LIGHT_STRIP_CLEARANCE } from "../lib/navMetrics";

/**
 * Front-door card.
 *
 * The person sensor going on is the only trigger: the camera plays for 30s in
 * the bottom-right corner, over whatever the frame is showing, then the card
 * hides itself. The sensor dropping back to off does not cut it short — the
 * point is to see who walked up, which takes longer than the sensor stays on.
 *
 * The feed only exists while the card is up: unmounting the <img> ends the
 * proxied MJPEG request, which is what stops HA generating frames.
 *
 * When the stream won't render it falls back to stills, one at a time: the
 * next is asked for SNAPSHOT_INTERVAL_MS after the last one loads or fails
 * (a failing HA still takes ~5s, and overlapping requests piled up on HA). If
 * no picture has arrived and a still has failed, the box says the camera is
 * unavailable rather than staying black; a frame arriving clears it.
 */
const SHOW_MS = 30_000;
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
  const [mode, setMode] = useState<"stream" | "snapshot">("stream");
  const [tick, setTick] = useState(0);
  // Whether any picture has shown this time, and whether a still has failed.
  const [loaded, setLoaded] = useState(false);
  const [stillFailed, setStillFailed] = useState(false);
  const desktop = useDesktop();

  const hideTimer = useRef<number | null>(null);
  const prevState = useRef<string | undefined>(undefined);

  const hide = useCallback(() => {
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setVisible(false);
  }, []);

  // Rising edge only. A detection while the card is already up restarts the 30s.
  useEffect(() => {
    if (!personId) return;

    function onPerson(state: HAState<NamedAttributes>) {
      const prev = prevState.current;
      prevState.current = state.state;

      if (state.state !== "on" || prev === "on") return;

      setMode("stream");
      setLoaded(false);
      setStillFailed(false);
      setShowId((n) => n + 1);
      setVisible(true);

      if (hideTimer.current !== null) clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => {
        hideTimer.current = null;
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

  const src =
    mode === "stream"
      ? `/api/camera/stream?v=${showId}`
      : `/api/camera/snapshot?t=${tick}`;

  const label = camera?.attributes?.friendly_name || "Front Door";

  return (
    <Card.Root
      position="fixed"
      // Above the lights strip on a desktop.
      bottom={
        desktop
          ? `calc(${LIGHT_STRIP_CLEARANCE} + 1rem)`
          : "calc(env(safe-area-inset-bottom, 0px) + 1rem)"
      }
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
        <Image
          key={src}
          src={src}
          // The card's title names the camera; a failed still shows nothing.
          alt=""
          visibility={!loaded && stillFailed ? "hidden" : undefined}
          onLoad={() => {
            setLoaded(true);
            setStillFailed(false);
            if (mode === "snapshot") nextStill();
          }}
          onError={() => {
            if (mode === "stream") {
              setMode("snapshot");
              return;
            }
            setStillFailed(true);
            nextStill();
          }}
          width="100%"
          height="100%"
          fit="cover"
        />
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
        <Box minW="0">
          <Card.Title truncate>{label}</Card.Title>
          <Card.Description>Person detected</Card.Description>
        </Box>
      </Card.Body>
    </Card.Root>
  );
}
