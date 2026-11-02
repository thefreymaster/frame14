import { useEffect, useRef, useState } from "react";
import { Box, Text } from "@chakra-ui/react";
import NumberFlow from "@number-flow/react";
import { Board } from "../components/Board";
import { PageTransition } from "../components/PageTransition";
import { useDesktop } from "../hooks/useDesktop";
import { HERO_SUFFIX_SIZE, HERO_TEXT, HOME_HERO_INSET } from "../lib/hero";

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
      ? "var(--chakra-colors-fg-muted)"
      : isHour
        ? "var(--chakra-colors-border-emphasized)"
        : "var(--chakra-colors-border)";
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

/** In a card (`framed`) the face fits the card; full-screen, 80vmin across. */
function AnalogClock({ framed }: { framed: boolean }) {
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
      css={framed ? { containerType: "size" } : undefined}
    >
      <Box width={framed ? "min(100cqw, 100cqh)" : "80vmin"}>
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {MARKERS}

          {/* Hour hand */}
          <line
            ref={hourRef}
            x1={CX}
            y1={CY}
            x2={CX}
            y2={CY - 52}
            style={{ stroke: "var(--chakra-colors-fg)" }}
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
            style={{ stroke: "var(--chakra-colors-fg)" }}
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
            stroke="var(--chakra-colors-red-solid)"
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
            stroke="var(--chakra-colors-red-solid)"
            strokeWidth={1.2}
            strokeLinecap="round"
          />

          {/* Center dot */}
          <circle
            cx={CX}
            cy={CY}
            r={3.5}
            style={{ fill: "var(--chakra-colors-fg)" }}
          />
          <circle
            cx={CX}
            cy={CY}
            r={1.8}
            fill="var(--chakra-colors-red-solid)"
          />
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

function DigitalClock({ framed }: { framed: boolean }) {
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
    // Full-screen, padded like Home's clock row so the figures come out the
    // same size as Home's (see lib/hero.ts); in a card, the card pads it.
    <Box
      width="100%"
      height="100%"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      px={framed ? undefined : HOME_HERO_INSET}
      css={{ containerType: "inline-size" }}
    >
      <Text {...HERO_TEXT} color="fg">
        <NumberFlow
          digits={{ 2: { max: 2 } }}
          value={hours}
          prefix={hours < 10 ? "0" : ""}
          trend={1}
        />
        :
        <NumberFlow
          digits={{ 2: { max: 2 } }}
          value={minutes}
          prefix={minutes < 10 ? "0" : ""}
          trend={1}
        />
        <Text
          as="span"
          fontSize={HERO_SUFFIX_SIZE}
          fontWeight="medium"
          color="fg.muted"
          ms="3"
        >
          <NumberFlow
            digits={{ 2: { max: 2 } }}
            value={seconds}
            prefix={seconds < 10 ? "0" : ""}
            trend={1}
          />
        </Text>
        <Text
          as="span"
          fontSize={HERO_SUFFIX_SIZE}
          fontWeight="medium"
          color="fg.muted"
          ms="3"
        >
          {ampm}
        </Text>
      </Text>

      <Text textStyle={{ base: "lg", md: "3xl" }} color="fg.muted" mt="6">
        {DAYS[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}
      </Text>
    </Box>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function Clock() {
  const [style, setStyle] = useState<ClockStyle>(loadStyle);
  // A card in the page on a desktop, like Photos and Radar, so it stays clear
  // of the lights strip; full-screen on the frame and phones.
  const framed = useDesktop();

  function toggle() {
    setStyle((prev) => {
      const next = prev === "analog" ? "digital" : "analog";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }

  const face = (
    <PageTransition key={style}>
      {style === "analog" ? (
        <AnalogClock framed={framed} />
      ) : (
        <DigitalClock framed={framed} />
      )}
    </PageTransition>
  );

  // data-page-fill gives the card the page's height (see PageTransition), and
  // the gutter around it matches the cards'. The card keeps the page's own
  // black / white rather than the cards' grey, as the full-screen clock has.
  return framed ? (
    <Box
      data-page-fill=""
      width="100%"
      height="100%"
      p="gutter"
      display="flex"
      flexDirection="column"
      onClick={toggle}
      cursor="pointer"
    >
      <Board fill bg="bg">
        {face}
      </Board>
    </Box>
  ) : (
    <Box
      position="relative"
      width="100%"
      height="100vh"
      overflow="hidden"
      display="flex"
      alignItems="center"
      justifyContent="center"
      onClick={toggle}
      cursor="pointer"
    >
      {face}
    </Box>
  );
}
