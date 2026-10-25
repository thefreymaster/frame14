import { useState } from "react";
import {
  Badge,
  Box,
  Center,
  Flex,
  HStack,
  Icon,
  IconButton,
  Image,
  Progress,
  Spacer,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  IoMusicalNotesOutline,
  IoPause,
  IoPlay,
  IoPlaySkipBack,
  IoPlaySkipForward,
  IoPowerOutline,
  IoStop,
  IoVolumeMedium,
  IoVolumeMute,
} from "react-icons/io5";
import { useEntity } from "../hooks/useEntity";
import { useNow } from "../hooks/useNow";
import { callMediaService } from "../lib/callService";
import {
  fmtMediaTime,
  mediaModel,
  type MediaPlayerAttrs,
} from "../lib/mediaPlayer";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { NativeSelectField, NativeSelectRoot } from "./ui/native-select";
import { Slider } from "./ui/slider";

/**
 * One media player on /media: a Board titled with its name and its state as
 * a Badge; the artwork beside the title, the artist / series / app and the
 * progress through the media (ticking while it plays); then the transport
 * (previous, play / pause, next, stop, power — each only when the player
 * supports it), the volume as a Slider with a mute button, and a source
 * select. The volume follows Home Assistant except under a finger.
 */
export function MediaPlayerCard({ entityId }: { entityId: string }) {
  const { data } = useEntity<MediaPlayerAttrs>(entityId);
  // A second's tick for the progress bar: only mounted while the page is up.
  const now = useNow(1000);
  const m = mediaModel(entityId, data, now);

  const [seenVolume, setSeenVolume] = useState(m.volume);
  const [volume, setVolume] = useState(m.volume ?? 0);
  const [dragging, setDragging] = useState(false);
  if (seenVolume !== m.volume) {
    setSeenVolume(m.volume);
    if (!dragging && m.volume != null) setVolume(m.volume);
  }

  const transport =
    m.can("PLAY") || m.can("PAUSE") || m.can("NEXT_TRACK") || m.can("STOP");
  const power = m.can("TURN_ON") || m.can("TURN_OFF");
  const progress =
    m.duration != null && m.duration > 0 && m.position != null
      ? (m.position / m.duration) * 100
      : null;

  return (
    <Board
      title={
        <Flex align="center" gap="3" width="100%">
          <SectionTitle>{m.name}</SectionTitle>
          <Spacer />
          <Badge colorPalette={m.palette}>{m.label}</Badge>
        </Flex>
      }
    >
      <Stack gap="4">
        <HStack gap="4" align="start">
          <Box
            boxSize="6rem"
            flexShrink={0}
            rounded="sm"
            overflow="hidden"
            bg="bg.muted"
          >
            {m.artUrl && m.active ? (
              <Image
                src={m.artUrl}
                alt=""
                width="100%"
                height="100%"
                fit="cover"
              />
            ) : (
              <Center height="100%">
                <Icon color="fg.subtle" boxSize="8">
                  <IoMusicalNotesOutline />
                </Icon>
              </Center>
            )}
          </Box>
          <VStack align="start" gap="1" minW="0" flex="1">
            <Text textStyle="lg" fontWeight="medium" lineClamp={2}>
              {m.title ?? (m.on ? "Nothing playing" : "Off")}
            </Text>
            {m.subtitle && (
              <Text color="fg.muted" truncate maxW="100%">
                {m.subtitle}
              </Text>
            )}
            {progress != null && m.duration != null && m.position != null && (
              <Box width="100%" mt="1">
                <Progress.Root value={progress} size="xs" colorPalette="gray">
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
                <HStack
                  justify="space-between"
                  textStyle="xs"
                  color="fg.muted"
                  mt="1"
                >
                  <Text>{fmtMediaTime(m.position)}</Text>
                  <Text>{fmtMediaTime(m.duration)}</Text>
                </HStack>
              </Box>
            )}
          </VStack>
        </HStack>

        {(transport || power) && (
          <HStack justify="center" gap="2">
            {m.can("PREVIOUS_TRACK") && (
              <IconButton
                variant="ghost"
                aria-label="Previous"
                disabled={!m.active}
                onClick={() => callMediaService(entityId, "media_previous_track")}
              >
                <IoPlaySkipBack />
              </IconButton>
            )}
            {(m.can("PLAY") || m.can("PAUSE")) && (
              <IconButton
                variant="solid"
                size="lg"
                aria-label={m.playing ? "Pause" : "Play"}
                disabled={!m.on}
                onClick={() =>
                  callMediaService(
                    entityId,
                    m.playing ? "media_pause" : "media_play",
                  )
                }
              >
                {m.playing ? <IoPause /> : <IoPlay />}
              </IconButton>
            )}
            {m.can("NEXT_TRACK") && (
              <IconButton
                variant="ghost"
                aria-label="Next"
                disabled={!m.active}
                onClick={() => callMediaService(entityId, "media_next_track")}
              >
                <IoPlaySkipForward />
              </IconButton>
            )}
            {m.can("STOP") && (
              <IconButton
                variant="ghost"
                aria-label="Stop"
                disabled={!m.active}
                onClick={() => callMediaService(entityId, "media_stop")}
              >
                <IoStop />
              </IconButton>
            )}
            {power && (
              <IconButton
                variant="ghost"
                colorPalette={m.on ? undefined : "green"}
                aria-label={m.on ? "Turn off" : "Turn on"}
                disabled={m.on ? !m.can("TURN_OFF") : !m.can("TURN_ON")}
                onClick={() =>
                  callMediaService(entityId, m.on ? "turn_off" : "turn_on")
                }
              >
                <IoPowerOutline />
              </IconButton>
            )}
          </HStack>
        )}

        {m.can("VOLUME_SET") && m.volume != null && (
          <HStack gap="3">
            <IconButton
              variant="ghost"
              size="sm"
              aria-label={m.muted ? "Unmute" : "Mute"}
              disabled={!m.can("VOLUME_MUTE") || !m.on}
              onClick={() =>
                callMediaService(entityId, "volume_mute", {
                  is_volume_muted: !m.muted,
                })
              }
            >
              {m.muted ? <IoVolumeMute /> : <IoVolumeMedium />}
            </IconButton>
            <Slider
              flex="1"
              min={0}
              max={100}
              step={1}
              value={[volume]}
              disabled={!m.on}
              aria-label={["Volume"]}
              onValueChange={(d) => {
                setDragging(true);
                setVolume(d.value[0]);
              }}
              onValueChangeEnd={(d) => {
                setDragging(false);
                callMediaService(entityId, "volume_set", {
                  volume_level: d.value[0] / 100,
                });
              }}
            />
            <Text textStyle="sm" minW="3rem" textAlign="end">
              {volume}%
            </Text>
          </HStack>
        )}

        {m.can("SELECT_SOURCE") && m.sources.length > 0 && (
          <NativeSelectRoot size="sm" disabled={!m.on}>
            <NativeSelectField
              aria-label="Source"
              value={m.source ?? ""}
              onChange={(e) => {
                if (e.target.value)
                  callMediaService(entityId, "select_source", {
                    source: e.target.value,
                  });
              }}
            >
              {!m.source && <option value="">Source</option>}
              {m.sources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </NativeSelectField>
          </NativeSelectRoot>
        )}
      </Stack>
    </Board>
  );
}
