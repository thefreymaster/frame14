import { useEffect, useState } from "react";
import { Box, HStack, Text } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import NumberFlow from "@number-flow/react";
import {
  IoPlayOutline,
  IoPauseOutline,
  IoRefreshOutline,
} from "react-icons/io5";
import { Board } from "../components/Board";
import { PageShell } from "../components/PageShell";
import { ControlButton } from "../components/ControlButton";

const PRESETS = [5, 10, 15, 25, 30];
const R = 88;
const CX = 100;
const CY = 100;
const CIRCUMFERENCE = 2 * Math.PI * R;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

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
  const offset = CIRCUMFERENCE * (1 - progress);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  // Idle uses the neutral face-marker gray rather than fg-faint: the ring is a
  // large static element, so it wants the dimmest token that still reads, and
  // fg-faint is both brighter and noticeably blue at this size.
  const ringColor = finished
    ? "#c53030"
    : running
      ? "var(--theme-fg)"
      : "var(--theme-marker-hour)";

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
          {/* Ring + time display */}
          <Box
            position="relative"
            width="62vmin"
            height="62vmin"
            cursor="pointer"
            onClick={toggle}
            _active={{ opacity: 0.7 }}
            transition="opacity 0.1s"
            animation={
              finished ? `${pulse} 1s ease-in-out infinite` : undefined
            }
          >
            <svg viewBox="0 0 200 200" width="100%" height="100%">
              {/* Track */}
              <circle
                cx={CX}
                cy={CY}
                r={R}
                fill="none"
                stroke="var(--theme-surface-2)"
                strokeWidth={7}
              />
              {/* Progress arc */}
              <circle
                cx={CX}
                cy={CY}
                r={R}
                fill="none"
                stroke={ringColor}
                strokeWidth={7}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${CX} ${CY})`}
                style={{
                  transition: running
                    ? "stroke-dashoffset 1s linear, stroke 0.4s ease"
                    : "stroke 0.4s ease",
                }}
              />
            </svg>

            {/* Centered time */}
            <Box
              position="absolute"
              inset="0"
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              pointerEvents="none"
            >
              <Text
                className="display-numeral"
                fontSize="16vmin"
                fontWeight="200"
                letterSpacing="-0.02em"
                color={finished ? "#c53030" : "var(--theme-fg)"}
                lineHeight="1"
                fontVariantNumeric="tabular-nums"
                style={{ transition: "color 0.4s ease" }}
              >
                <NumberFlow value={minutes} prefix={minutes < 10 ? "0" : ""} />
                <Text
                  as="span"
                  color={finished ? "#c53030" : "var(--theme-fg-dim)"}
                  style={{ transition: "color 0.4s ease" }}
                >
                  :
                </Text>
                <NumberFlow value={seconds} prefix={seconds < 10 ? "0" : ""} />
              </Text>

              <Text
                fontSize="2.8vmin"
                color="var(--theme-fg-muted)"
                fontWeight="300"
                letterSpacing="0.12em"
                mt="2.5vmin"
                textTransform="uppercase"
                opacity={finished ? 0 : 1}
                style={{ transition: "opacity 0.3s ease" }}
              >
                {finished
                  ? "\u00a0"
                  : isPaused
                    ? "paused"
                    : isReady
                      ? "tap to start"
                      : "tap to pause"}
              </Text>
            </Box>
          </Box>

          {/* Controls */}
          <HStack gap="2vmin" align="center">
            <ControlButton
              onClick={reset}
              label="Reset timer"
              px="3vmin"
              py="2vmin"
            >
              <Box
                fontSize="3.4vmin"
                display="flex"
                color="var(--theme-fg-muted)"
              >
                <IoRefreshOutline />
              </Box>
            </ControlButton>
            <ControlButton
              onClick={toggle}
              active={running}
              label={running ? "Pause timer" : "Start timer"}
              px="4vmin"
              py="2vmin"
            >
              <Box
                fontSize="5vmin"
                display="flex"
                color={
                  remaining === 0 ? "var(--theme-fg-muted)" : "var(--theme-fg)"
                }
              >
                {running ? <IoPauseOutline /> : <IoPlayOutline />}
              </Box>
            </ControlButton>
          </HStack>

          {/* Preset pills */}
          <HStack gap="1.2vmin">
            {PRESETS.map((min) => (
              <ControlButton
                key={min}
                active={totalSeconds === min * 60}
                onClick={() => selectPreset(min)}
                px="3vmin"
                py="1.2vmin"
              >
                <Text
                  fontSize="2.2vmin"
                  fontWeight={totalSeconds === min * 60 ? "600" : "400"}
                  letterSpacing="0.02em"
                >
                  {min}m
                </Text>
              </ControlButton>
            ))}
          </HStack>
        </Box>
      </Board>
    </PageShell>
  );
}
