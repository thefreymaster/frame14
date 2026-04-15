import { useEffect, useRef, useState } from "react";
import { Box, Text } from "@chakra-ui/react";
import NumberFlow from "@number-flow/react";
import { PageTransition } from "../components/PageTransition";
import { useWeather } from "../hooks/useWeather";

type ClockStyle = "analog" | "digital";

const STORAGE_KEY = "clockStyle";

function loadStyle(): ClockStyle {
  if (typeof window === "undefined") return "analog";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "digital" ? "digital" : "analog";
}

// ── Analog Clock ──────────────────────────────────────────────────────────────

const CX = 100;
const CY = 100;

function buildMarkers() {
  const markers: React.ReactElement[] = [];
  for (let i = 0; i < 60; i++) {
    const angle = ((i * 6 - 90) * Math.PI) / 180;
    const isHour = i % 5 === 0;
    const isCardinal = i % 15 === 0;
    const outerR = 92;
    const innerR = isCardinal ? 78 : isHour ? 82 : 88;
    const strokeVar = isCardinal
      ? "var(--theme-marker-cardinal)"
      : isHour
        ? "var(--theme-marker-hour)"
        : "var(--theme-marker-minor)";
    const width = isCardinal ? 2.2 : isHour ? 1.4 : 0.6;
    markers.push(
      <line
        key={i}
        x1={CX + Math.cos(angle) * innerR}
        y1={CY + Math.sin(angle) * innerR}
        x2={CX + Math.cos(angle) * outerR}
        y2={CY + Math.sin(angle) * outerR}
        style={{ stroke: strokeVar }}
        strokeWidth={width}
        strokeLinecap="round"
      />,
    );
  }
  return markers;
}

const MARKERS = buildMarkers();

function AnalogClock() {
  const hourRef = useRef<SVGLineElement>(null);
  const minuteRef = useRef<SVGLineElement>(null);
  const secondRef = useRef<SVGLineElement>(null);
  const secondTailRef = useRef<SVGLineElement>(null);

  useEffect(() => {
    let rafId: number;

    const tick = () => {
      const now = new Date();
      const s = now.getSeconds() + now.getMilliseconds() / 1000;
      const m = now.getMinutes() + s / 60;
      const h = (now.getHours() % 12) + m / 60;

      const sRad = ((s * 6 - 90) * Math.PI) / 180;
      const mRad = ((m * 6 - 90) * Math.PI) / 180;
      const hRad = ((h * 30 - 90) * Math.PI) / 180;

      if (hourRef.current) {
        hourRef.current.setAttribute("x2", String(CX + Math.cos(hRad) * 52));
        hourRef.current.setAttribute("y2", String(CY + Math.sin(hRad) * 52));
      }
      if (minuteRef.current) {
        minuteRef.current.setAttribute("x2", String(CX + Math.cos(mRad) * 72));
        minuteRef.current.setAttribute("y2", String(CY + Math.sin(mRad) * 72));
      }
      if (secondRef.current) {
        secondRef.current.setAttribute("x2", String(CX + Math.cos(sRad) * 80));
        secondRef.current.setAttribute("y2", String(CY + Math.sin(sRad) * 80));
      }
      if (secondTailRef.current) {
        secondTailRef.current.setAttribute(
          "x2",
          String(CX - Math.cos(sRad) * 18),
        );
        secondTailRef.current.setAttribute(
          "y2",
          String(CY - Math.sin(sRad) * 18),
        );
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <Box
      width="100%"
      height="100%"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      <Box width="80vmin">
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {MARKERS}

          {/* Hour hand */}
          <line
            ref={hourRef}
            x1={CX}
            y1={CY}
            x2={CX}
            y2={CY - 52}
            style={{ stroke: "var(--theme-fg)" }}
            strokeWidth={3.5}
            strokeLinecap="round"
          />

          {/* Minute hand */}
          <line
            ref={minuteRef}
            x1={CX}
            y1={CY}
            x2={CX}
            y2={CY - 72}
            style={{ stroke: "var(--theme-fg)" }}
            strokeWidth={2}
            strokeLinecap="round"
          />

          {/* Second hand tail */}
          <line
            ref={secondTailRef}
            x1={CX}
            y1={CY}
            x2={CX}
            y2={CY + 18}
            stroke="#c53030"
            strokeWidth={1.2}
            strokeLinecap="round"
          />

          {/* Second hand */}
          <line
            ref={secondRef}
            x1={CX}
            y1={CY}
            x2={CX}
            y2={CY - 80}
            stroke="#c53030"
            strokeWidth={1.2}
            strokeLinecap="round"
          />

          {/* Center dot */}
          <circle cx={CX} cy={CY} r={3.5} style={{ fill: "var(--theme-fg)" }} />
          <circle cx={CX} cy={CY} r={1.8} fill="#c53030" />
        </svg>
      </Box>
    </Box>
  );
}

// ── Digital Clock ─────────────────────────────────────────────────────────────

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function DigitalClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const rawHours = now.getHours();
  const hours = rawHours % 12 || 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const ampm = rawHours < 12 ? "am" : "pm";

  return (
    <Box
      width="100%"
      height="100%"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      <Text
        fontSize="24vmin"
        fontWeight="200"
        letterSpacing="-0.03em"
        color="var(--theme-fg)"
        lineHeight="1"
        fontVariantNumeric="tabular-nums"
      >
        <NumberFlow
          digits={{ 2: { max: 2 } }}
          value={hours}
          prefix={hours < 10 ? "0" : ""}
        />
        :
        <NumberFlow
          digits={{ 2: { max: 2 } }}
          value={minutes}
          prefix={minutes < 10 ? "0" : ""}
        />
        <Text
          as="span"
          fontSize="10vmin"
          fontWeight="200"
          color="var(--theme-fg-dim)"
          ml="1.5vmin"
        >
          <NumberFlow
            digits={{ 2: { max: 2 } }}
            value={seconds}
            prefix={seconds < 10 ? "0" : ""}
          />
        </Text>
        <Text
          as="span"
          fontSize="8vmin"
          fontWeight="300"
          color="var(--theme-fg-dim)"
          ml="2vmin"
        >
          {ampm}
        </Text>
      </Text>

      <Text
        fontSize="4vmin"
        color="var(--theme-fg-muted)"
        fontWeight="300"
        letterSpacing="0.04em"
        mt="3vmin"
      >
        {DAYS[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}
      </Text>
    </Box>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function Clock() {
  const [style, setStyle] = useState<ClockStyle>(loadStyle);
  const { data: weather } = useWeather();

  function toggle() {
    setStyle((prev) => {
      const next = prev === "analog" ? "digital" : "analog";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }

  return (
    <Box
      position="relative"
      width="100%"
      height="100vh"
      bg="var(--theme-bg)"
      overflow="hidden"
      display="flex"
      alignItems="center"
      justifyContent="center"
      onClick={toggle}
      cursor="pointer"
    >
      <PageTransition key={style}>
        {style === "analog" ? <AnalogClock /> : <DigitalClock />}
      </PageTransition>
      {weather?.temperature != null && (
        <Text
          position="absolute"
          bottom="6vmin"
          left="50%"
          transform="translateX(-50%)"
          fontSize="6vmin"
          fontWeight="200"
          color="var(--theme-fg-dim)"
          letterSpacing="-0.02em"
          lineHeight="1"
          fontVariantNumeric="tabular-nums"
          pointerEvents="none"
        >
          <NumberFlow value={Math.round(weather.temperature)} />°
        </Text>
      )}
    </Box>
  );
}
