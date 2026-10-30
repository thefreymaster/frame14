import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Center,
  Flex,
  Skeleton,
  Spacer,
  Text,
  VStack,
} from "@chakra-ui/react";
import { IoVideocamOutline } from "react-icons/io5";
import { MdVideocamOff } from "react-icons/md";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";

// What the picture is doing, as /cameras' CameraCard says it: Live once the
// stream's first frame is up, Offline when it failed, nothing while it
// connects (an MJPEG stream has no stills fallback).
const STATE_BADGE = {
  connecting: null,
  live: { label: "Live", palette: "green" },
  unavailable: { label: "Offline", palette: "red" },
} as const;

/**
 * The printer's camera, live: the server's MJPEG proxy of HA's camera
 * (/api/printer/camera/stream) in a 16:9 well. The <img> holds the stream
 * only while the page is up, which is when HA (and Bambuddy behind it) sends
 * frames. A Skeleton fills the well until the first frame (the <img>'s load
 * event, which an MJPEG stream fires on its first part; the frame covers it
 * either way); a failed stream offers a retry. Titled "Camera" on /printer,
 * with the chamber light's switch as the header's `action`; /cameras names
 * the printer instead, with its icon, and asks for the `badge` the other
 * camera cards there carry (0.127).
 *
 * A phone drops the stream's connection while the app sits in the
 * background, and the <img> neither errors nor recovers — it shows a broken
 * picture until something remounts it. So the card asks for a fresh stream
 * whenever the page becomes visible again, or comes back from the
 * back-forward cache.
 */
export function PrinterCameraCard({
  title = "Camera",
  icon = <IoVideocamOutline />,
  badge = false,
  action,
}: {
  title?: string;
  /** The title's icon: a camera, or the printer's on /cameras. */
  icon?: React.ReactNode;
  /** A Live / Offline badge at the title's right. */
  badge?: boolean;
  action?: React.ReactNode;
}) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const status = badge
    ? STATE_BADGE[failed ? "unavailable" : loaded ? "live" : "connecting"]
    : null;

  // A new <img> (the key), on a new URL: a new request for the stream.
  const reconnect = useCallback(() => {
    setFailed(false);
    setLoaded(false);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible") reconnect();
    }
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) reconnect();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [reconnect]);

  return (
    <Board
      title={
        <Flex align="center" gap="3" width="100%">
          <SectionTitle icon={icon}>{title}</SectionTitle>
          {status && (
            <>
              <Spacer />
              <Badge colorPalette={status.palette}>{status.label}</Badge>
            </>
          )}
        </Flex>
      }
      action={action}
    >
      <Box
        position="relative"
        aspectRatio="16 / 9"
        rounded="sm"
        overflow="hidden"
        bg="black"
      >
        {failed ? (
          <Center position="absolute" inset="0">
            <VStack gap="3" color="gray.400">
              <MdVideocamOff size="2rem" />
              <Text textStyle="sm">Camera unavailable</Text>
              <Button
                size="xs"
                variant="outline"
                colorPalette="gray"
                color="gray.200"
                onClick={reconnect}
              >
                Retry
              </Button>
            </VStack>
          </Center>
        ) : (
          <>
            {!loaded && <Skeleton position="absolute" inset="0" />}
            <img
              key={attempt}
              src={`/api/printer/camera/stream?attempt=${attempt}`}
              alt="The printer's camera"
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </>
        )}
      </Box>
    </Board>
  );
}
