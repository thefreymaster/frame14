import { useCallback, useEffect, useRef, useState } from "react";
import { keyframes } from "@emotion/react";
import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { useEntity, type HAState } from "../hooks/useEntity";
import { socket } from "../lib/socket";
import { CARD_RADIUS, CHIP_PADDING_X, CHIP_PADDING_Y } from "../lib/surfaces";

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
 */
const SHOW_MS = 30_000;
const SNAPSHOT_INTERVAL_MS = 1_000;

const riseIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(8%) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.25; }
`;

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

  // Fallback path: poll stills when the MJPEG stream will not render.
  useEffect(() => {
    if (!visible || mode !== "snapshot") return;
    const id = window.setInterval(
      () => setTick((t) => t + 1),
      SNAPSHOT_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [visible, mode]);

  if (!visible || !cameraId) return null;

  const src =
    mode === "stream"
      ? `/api/camera/stream?v=${showId}`
      : `/api/camera/snapshot?t=${tick}`;

  const label = camera?.attributes?.friendly_name || "Front Door";

  return (
    <Box
      position="fixed"
      bottom="calc(env(safe-area-inset-bottom, 0px) + 1.5vmin)"
      right="calc(env(safe-area-inset-right, 0px) + 1.5vmin)"
      zIndex={200}
      width="34vmin"
      minWidth="240px"
      maxWidth="90vw"
      bg="var(--theme-surface-1)"
      borderRadius={CARD_RADIUS}
      overflow="hidden"
      boxShadow="0 1.2vmin 3vmin rgba(0, 0, 0, 0.55)"
      animation={`${riseIn} 0.3s ease-out both`}
      cursor="pointer"
      onClick={hide}
    >
      <Box aspectRatio={16 / 9} bg="#000000">
        <img
          key={src}
          src={src}
          alt={label}
          onError={() => setMode("snapshot")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </Box>

      <HStack
        px={CHIP_PADDING_X}
        py={CHIP_PADDING_Y}
        gap="1.4vmin"
        align="center"
      >
        <Box
          width="1.1vmin"
          height="1.1vmin"
          minWidth="7px"
          minHeight="7px"
          borderRadius="full"
          bg="red.500"
          flexShrink="0"
          animation={`${pulse} 1.6s ease-in-out infinite`}
        />
        <VStack align="flex-start" gap="0.2vmin" minW="0">
          <Text
            fontSize="2.6vmin"
            fontWeight="300"
            color="var(--theme-fg-dim)"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
          >
            {label}
          </Text>
          <Text
            fontSize="1.9vmin"
            color="var(--theme-fg-faint)"
            letterSpacing="0.08em"
          >
            PERSON DETECTED
          </Text>
        </VStack>
      </HStack>
    </Box>
  );
}
