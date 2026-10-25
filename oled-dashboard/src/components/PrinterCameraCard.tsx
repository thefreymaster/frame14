import { useState } from "react";
import { Box, Button, Center, Spinner, Text, VStack } from "@chakra-ui/react";
import { MdVideocamOff } from "react-icons/md";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";

/**
 * The printer's camera, live: the server's MJPEG proxy of HA's camera
 * (/api/printer/camera/stream) in a 16:9 well. The <img> holds the stream
 * only while the page is up, which is when HA (and Bambuddy behind it) sends
 * frames. A spinner shows under it until the first frame covers it; a failed
 * stream offers a retry. Titled "Camera" on /printer; /cameras names the
 * printer instead.
 */
export function PrinterCameraCard({ title = "Camera" }: { title?: string }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  return (
    <Board title={<SectionTitle>{title}</SectionTitle>}>
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
                onClick={() => {
                  setFailed(false);
                  setAttempt((n) => n + 1);
                }}
              >
                Retry
              </Button>
            </VStack>
          </Center>
        ) : (
          <>
            <Center position="absolute" inset="0">
              <Spinner color="gray.400" aria-label="Connecting to the camera" />
            </Center>
            <img
              key={attempt}
              src={`/api/printer/camera/stream?attempt=${attempt}`}
              alt="The printer's camera"
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
