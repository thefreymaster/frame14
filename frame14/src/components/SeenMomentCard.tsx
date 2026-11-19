import { useState } from "react";
import { Box, Button, Center, Flex, Stack, Text } from "@chakra-ui/react";
import { IoVideocamOutline } from "react-icons/io5";
import { useNavigate } from "react-router";
import { useFeatures } from "../hooks/useFeatures";
import { useNow } from "../hooks/useNow";
import { clipMayCome, type SeenMoment } from "../hooks/useSeen";
import { Board } from "./Board";
import { SegmentedControl } from "./ui/segmented-control";

const FILL = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "contain",
} as const;

type View = "clip" | "photo";

/**
 * What a camera saw when a notification went out (0.178.0): the clip the
 * automation sent once it has it — a GIF, or a video playing as one, muted
 * and looping — over the still from the moment itself, which shows while the
 * clip loads and on its own until it comes (the page polls for it). With both
 * there, Clip / Photo picks: the still is the camera's whole picture, the
 * GIF a smaller one. Then the notification's words, and Watch live for the
 * Cameras page.
 */
export function SeenMomentCard({ moment }: { moment: SeenMoment }) {
  const [view, setView] = useState<View>("clip");
  const features = useFeatures();
  const navigate = useNavigate();
  const now = useNow(5_000);
  const waiting = clipMayCome(moment, now);
  const showClip = moment.clip && (view === "clip" || !moment.still);
  const video = moment.clip?.type.startsWith("video/");

  return (
    <Board>
      <Stack gap="md">
        {moment.still && moment.clip && (
          <SegmentedControl
            size="sm"
            alignSelf="start"
            aria-label="Show"
            items={[
              { value: "clip", label: "Clip" },
              { value: "photo", label: "Photo" },
            ]}
            value={view}
            onValueChange={(e) => setView(e.value as View)}
          />
        )}
        <Box
          position="relative"
          aspectRatio="16 / 9"
          rounded="sm"
          overflow="hidden"
          bg="black"
          data-seen-picture
        >
          {moment.still && (
            <img src={moment.still} alt={`${moment.title}, as the notification went out`} style={FILL} data-seen-still />
          )}
          {showClip &&
            moment.clip &&
            (video ? (
              <video
                src={moment.clip.url}
                poster={moment.still ?? undefined}
                muted
                loop
                autoPlay
                playsInline
                style={FILL}
                data-seen-clip
              />
            ) : (
              <img src={moment.clip.url} alt={`${moment.title}, the clip`} style={FILL} data-seen-clip />
            ))}
          {!moment.still && !moment.clip && (
            <Center position="absolute" inset="0" color="gray.400" textStyle="sm" px="md" textAlign="center">
              {waiting ? "The camera gave no picture; the clip is on its way…" : "The camera gave no picture."}
            </Center>
          )}
        </Box>
        <Flex align="center" gap="md" wrap="wrap">
          <Stack gap="1" flex="1" minW="0">
            {moment.message && <Text>{moment.message}</Text>}
            {waiting && moment.still && (
              <Text textStyle="sm" color="fg.muted" data-seen-waiting>
                The clip is on its way…
              </Text>
            )}
          </Stack>
          {features.cameras && (
            <Button variant="subtle" size="sm" onClick={() => void navigate("/cameras")}>
              <IoVideocamOutline />
              Watch live
            </Button>
          )}
        </Flex>
      </Stack>
    </Board>
  );
}
