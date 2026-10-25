import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Center,
  Icon,
  Image,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { MdVideocamOff } from "react-icons/md";
import { CameraVideo } from "./CameraVideo";

/** How often the stills fallback asks for the next frame. */
const STILL_INTERVAL_MS = 5_000;

export type CameraFeedState = "connecting" | "live" | "stills" | "unavailable";

/**
 * One camera's picture in a 16:9 black well, for the Cameras page: the live
 * HLS stream (CameraVideo), and when that won't start, stills one at a time
 * (/api/camera/snapshot, the next STILL_INTERVAL_MS after the last loads or
 * fails — slower than the doorbell card's, since several cameras share the
 * page). A spinner shows until the first picture; with no picture and a
 * failed still it says the camera is unavailable and offers a retry, which
 * starts the live stream over. `onState` reports what is showing.
 */
export function CameraFeed({
  entityId,
  onState,
}: {
  entityId: string;
  onState?: (state: CameraFeedState) => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const [mode, setMode] = useState<"live" | "stills">("live");
  const [tick, setTick] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [stillFailed, setStillFailed] = useState(false);
  const nextTimer = useRef<number | null>(null);

  const state: CameraFeedState =
    mode === "live"
      ? loaded
        ? "live"
        : "connecting"
      : loaded
        ? "stills"
        : stillFailed
          ? "unavailable"
          : "connecting";
  const report = useRef(onState);
  useEffect(() => {
    report.current = onState;
  });
  useEffect(() => {
    report.current?.(state);
  }, [state]);

  // The next still once the current one has loaded or failed.
  const nextStill = useCallback(() => {
    nextTimer.current = window.setTimeout(
      () => setTick((t) => t + 1),
      STILL_INTERVAL_MS,
    );
  }, []);
  useEffect(
    () => () => {
      if (nextTimer.current !== null) window.clearTimeout(nextTimer.current);
    },
    [],
  );

  function retry() {
    if (nextTimer.current !== null) window.clearTimeout(nextTimer.current);
    setMode("live");
    setLoaded(false);
    setStillFailed(false);
    setAttempt((n) => n + 1);
  }

  const unavailable = !loaded && stillFailed;

  return (
    <Box
      position="relative"
      aspectRatio="16 / 9"
      rounded="sm"
      overflow="hidden"
      bg="black"
    >
      {!loaded && !unavailable && (
        <Center position="absolute" inset="0">
          <Spinner color="gray.400" aria-label="Connecting to the camera" />
        </Center>
      )}
      {mode === "live" ? (
        <CameraVideo
          key={attempt}
          entityId={entityId}
          onPlaying={() => setLoaded(true)}
          onFail={() => {
            setMode("stills");
            setLoaded(false);
          }}
        />
      ) : (
        <Image
          key={`${attempt}-${tick}`}
          src={`/api/camera/snapshot?entity=${encodeURIComponent(entityId)}&t=${attempt}-${tick}`}
          // The card's title names the camera; a failed still shows nothing.
          alt=""
          visibility={unavailable ? "hidden" : undefined}
          onLoad={() => {
            setLoaded(true);
            setStillFailed(false);
            nextStill();
          }}
          onError={() => {
            setStillFailed(true);
            nextStill();
          }}
          position="absolute"
          inset="0"
          width="100%"
          height="100%"
          fit="cover"
        />
      )}
      {unavailable && (
        <Center position="absolute" inset="0">
          <VStack gap="3" color="gray.400">
            <Icon boxSize="8">
              <MdVideocamOff />
            </Icon>
            <Text textStyle="sm">Camera unavailable</Text>
            <Button
              size="xs"
              variant="outline"
              colorPalette="gray"
              color="gray.200"
              onClick={retry}
            >
              Retry
            </Button>
          </VStack>
        </Center>
      )}
    </Box>
  );
}
