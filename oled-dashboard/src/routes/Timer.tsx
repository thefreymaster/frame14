import { useEffect, useState } from "react";
import { Box, HStack, Text } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import NumberFlow from "@number-flow/react";
import { IoPlayOutline, IoPauseOutline, IoRefreshOutline } from "react-icons/io5";

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

  const ringColor = finished
    ? "#c53030"
    : running
      ? "var(--theme-fg)"
      : "rgba(255,255,255,0.35)";

  const isPaused = !running && remaining < totalSeconds && remaining > 0;
  const isReady = !running && remaining === totalSeconds && remaining > 0;

  return (
    <Box
      width="100%"
      height="100vh"
      bg="var(--theme-bg)"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap="8"
    >
      {/* Ring + time display */}
      <Box
        position="relative"
        width="70vmin"
        height="70vmin"
        cursor="pointer"
        onClick={toggle}
        _active={{ opacity: 0.7 }}
        transition="opacity 0.1s"
        animation={finished ? `${pulse} 1s ease-in-out infinite` : undefined}
      >
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Track */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
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
            {finished ? "\u00a0" : isPaused ? "paused" : isReady ? "tap to start" : "tap to pause"}
          </Text>
        </Box>
      </Box>

      {/* Controls */}
      <HStack gap="8" align="center">
        <Box
          as="button"
          onClick={reset}
          color="var(--theme-fg-muted)"
          _active={{ opacity: 0.4 }}
          display="flex"
          alignItems="center"
          justifyContent="center"
          p="2"
          transition="opacity 0.1s"
        >
          <IoRefreshOutline size={26} />
        </Box>
        <Box
          as="button"
          onClick={toggle}
          color={remaining === 0 ? "var(--theme-fg-muted)" : "var(--theme-fg)"}
          _active={{ opacity: 0.4 }}
          display="flex"
          alignItems="center"
          justifyContent="center"
          p="2"
          transition="opacity 0.1s"
        >
          {running ? <IoPauseOutline size={40} /> : <IoPlayOutline size={40} />}
        </Box>
      </HStack>

      {/* Preset pills */}
      <HStack gap="3">
        {PRESETS.map((min) => {
          const isSelected = totalSeconds === min * 60;
          return (
            <Box
              key={min}
              as="button"
              onClick={() => selectPreset(min)}
              px="4"
              py="1.5"
              borderRadius="full"
              border="1px solid"
              borderColor={isSelected ? "var(--theme-fg)" : "var(--theme-divider)"}
              color={isSelected ? "var(--theme-fg)" : "var(--theme-fg-muted)"}
              fontSize="13px"
              fontWeight={isSelected ? "600" : "400"}
              letterSpacing="0.02em"
              _active={{ opacity: 0.4 }}
              transition="all 0.15s"
              bg="transparent"
            >
              {min}m
            </Box>
          );
        })}
      </HStack>
    </Box>
  );
}
