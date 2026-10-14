import { useEffect, useState } from "react";
import {
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

  const isPaused = !running && remaining < totalSeconds && remaining > 0;
  const isReady = !running && remaining === totalSeconds && remaining > 0;

  return (
    <PageShell fill>
      <Board fill>
        <Center height="100%" flexDirection="column" gap="8">
          {/* Ring + time display: a ProgressCircle draining as time runs. */}
          <ProgressCircle.Root
            value={progress * 100}
            colorPalette={finished ? "red" : "gray"}
            cursor="pointer"
            onClick={toggle}
            animation={finished ? "pulse 1s ease-in-out infinite" : undefined}
            aria-label="Timer"
          >
            <ProgressCircle.Circle
              css={{ "--size": "22rem", "--thickness": "0.75rem" }}
            >
              <ProgressCircle.Track />
              <ProgressCircle.Range
                strokeLinecap="round"
                transitionDuration={running ? "1s" : undefined}
                transitionTimingFunction={running ? "linear" : undefined}
              />
            </ProgressCircle.Circle>

            <Center
              position="absolute"
              inset="0"
              flexDirection="column"
              pointerEvents="none"
            >
              <Text
                textStyle="8xl"
                fontWeight="light"
                lineHeight="1"
                fontVariantNumeric="tabular-nums"
                whiteSpace="nowrap"
                color={finished ? "fg.error" : undefined}
              >
                <NumberFlow value={minutes} prefix={minutes < 10 ? "0" : ""} />
                <Text as="span" color="fg.muted">
                  :
                </Text>
                <NumberFlow value={seconds} prefix={seconds < 10 ? "0" : ""} />
              </Text>
              <Text
                color="fg.muted"
                mt="4"
                visibility={finished ? "hidden" : "visible"}
              >
                {isPaused
                  ? "Paused"
                  : isReady
                    ? "Tap to start"
                    : "Tap to pause"}
              </Text>
            </Center>
          </ProgressCircle.Root>

          {/* Controls */}
          <HStack gap="4">
            <IconButton
              variant="subtle"
              size="2xl"
              rounded="full"
              onClick={reset}
              aria-label="Reset timer"
            >
              <IoRefreshOutline />
            </IconButton>
            <IconButton
              variant="solid"
              size="2xl"
              rounded="full"
              onClick={toggle}
              disabled={remaining === 0}
              aria-pressed={running}
              aria-label={running ? "Pause timer" : "Start timer"}
            >
              {running ? <IoPauseOutline /> : <IoPlayOutline />}
            </IconButton>
          </HStack>

          {/* Presets */}
          <SegmentedControl
            size="lg"
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
        </Center>
      </Board>
    </PageShell>
  );
}
