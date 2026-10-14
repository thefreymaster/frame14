import { useEffect, useState } from "react";
import {
  Box,
  Center,
  HStack,
  IconButton,
  ProgressCircle,
  Text,
} from "@chakra-ui/react";
import NumberFlow from "@number-flow/react";
import {
  IoPlayOutline,
  IoPauseOutline,
  IoRefreshOutline,
} from "react-icons/io5";
import { Board } from "../components/Board";
import { PageShell } from "../components/PageShell";
import { SegmentedControl } from "../components/ui/segmented-control";

const PRESETS = [5, 10, 15, 25, 30];

export function Timer() {
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          setFinished(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!finished) return;
    const id = setTimeout(() => {
      setFinished(false);
      setRemaining(totalSeconds);
    }, 5000);
    return () => clearTimeout(id);
  }, [finished, totalSeconds]);

  function selectPreset(minutes: number) {
    const secs = minutes * 60;
    setTotalSeconds(secs);
    setRemaining(secs);
    setRunning(false);
    setFinished(false);
  }

  function toggle() {
    if (remaining === 0) return;
    setRunning((r) => !r);
    setFinished(false);
  }

  function reset() {
    setRemaining(totalSeconds);
    setRunning(false);
    setFinished(false);
  }

  const progress = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  // Idle uses the neutral face-marker gray rather than fg-faint: the ring is a
  // large static element, so it wants the dimmest token that still reads, and
  // fg-faint is both brighter and noticeably blue at this size.
  const ringColor = finished ? "#c53030" : running ? "fg" : "marker.hour";

  const isPaused = !running && remaining < totalSeconds && remaining > 0;
  const isReady = !running && remaining === totalSeconds && remaining > 0;

  return (
    <PageShell fill>
      <Board fill>
        <Box
          height="100%"
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap="4vmin"
        >
          {/* Ring + time display: a ProgressCircle draining as time runs. */}
          <ProgressCircle.Root
            size="timer"
            value={progress * 100}
            cursor="pointer"
            onClick={toggle}
            _active={{ opacity: 0.7 }}
            transition="opacity 0.1s"
            animation={finished ? "blink 1s ease-in-out infinite" : undefined}
            aria-label="Timer"
          >
            <ProgressCircle.Circle>
              <ProgressCircle.Track stroke="surface.chip" />
              <ProgressCircle.Range
                stroke={ringColor}
                strokeLinecap="round"
                transition={
                  running
                    ? "stroke-dashoffset 1s linear, stroke-dasharray 1s linear, stroke 0.4s ease"
                    : "stroke 0.4s ease"
                }
              />
            </ProgressCircle.Circle>

            {/* Centered time */}
            <Center
              position="absolute"
              inset="0"
              flexDirection="column"
              pointerEvents="none"
            >
              <Text
                fontFamily="display"
                fontSize="16vmin"
                fontWeight="200"
                letterSpacing="-0.02em"
                color={finished ? "#c53030" : "fg"}
                lineHeight="1"
                fontVariantNumeric="tabular-nums"
                whiteSpace="nowrap"
                transition="color 0.4s ease"
              >
                <NumberFlow value={minutes} prefix={minutes < 10 ? "0" : ""} />
                <Text
                  as="span"
                  color={finished ? "#c53030" : "fg.dim"}
                  transition="color 0.4s ease"
                >
                  :
                </Text>
                <NumberFlow value={seconds} prefix={seconds < 10 ? "0" : ""} />
              </Text>

              <Text
                fontSize="2.8vmin"
                color="fg.muted"
                fontWeight="300"
                letterSpacing="0.12em"
                mt="2.5vmin"
                textTransform="uppercase"
                opacity={finished ? 0 : 1}
                transition="opacity 0.3s ease"
              >
                {finished
                  ? "\u00a0"
                  : isPaused
                    ? "paused"
                    : isReady
                      ? "tap to start"
                      : "tap to pause"}
              </Text>
            </Center>
          </ProgressCircle.Root>

          {/* Controls */}
          <HStack gap="2vmin" align="center">
            <IconButton
              variant="chip"
              size="chip"
              onClick={reset}
              aria-label="Reset timer"
              px="3vmin"
              py="2vmin"
              color="fg.muted"
              _icon={{ width: "3.4vmin", height: "3.4vmin" }}
            >
              <IoRefreshOutline />
            </IconButton>
            <IconButton
              variant="chip"
              size="chip"
              onClick={toggle}
              aria-pressed={running}
              aria-label={running ? "Pause timer" : "Start timer"}
              px="4vmin"
              py="2vmin"
              color={remaining === 0 ? "fg.muted" : "fg"}
              _icon={{ width: "5vmin", height: "5vmin" }}
            >
              {running ? <IoPauseOutline /> : <IoPlayOutline />}
            </IconButton>
          </HStack>

          {/* Presets */}
          <SegmentedControl
            items={PRESETS.map((min) => ({
              value: String(min),
              label: `${min}m`,
            }))}
            value={
              PRESETS.includes(totalSeconds / 60)
                ? String(totalSeconds / 60)
                : null
            }
            aria-label="Duration"
            onValueChange={(e) => e.value && selectPreset(Number(e.value))}
          />
        </Box>
      </Board>
    </PageShell>
  );
}
