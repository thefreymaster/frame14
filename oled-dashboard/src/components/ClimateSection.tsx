import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { callClimateService, type HvacMode } from "../lib/callService";
import { Box, Text, HStack, VStack } from "@chakra-ui/react";
import {
  IoClose,
  IoFlame,
  IoPowerOutline,
  IoSnow,
  IoThermometerOutline,
} from "react-icons/io5";
import { MdAir } from "react-icons/md";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import type { HomeClimate } from "../hooks/useHomeData";
import { Board } from "./Board";

type ClimateVisualMode = "heat" | "cool" | "fan_only" | "off";

const HVAC_COLOR: Record<string, string> = {
  cool: "blue.400",
  cooling: "blue.400",
  heat: "orange.400",
  heating: "orange.400",
  fan_only: "teal.300",
  fan: "teal.300",
  off: "var(--theme-fg-faint)",
  auto: "green.500",
  unknown: "var(--theme-fg-faint)",
};

const HVAC_RING: Record<string, string> = {
  cool: "rgba(96, 165, 250, 0.85)",
  cooling: "rgba(96, 165, 250, 0.95)",
  heat: "rgba(251, 146, 60, 0.85)",
  heating: "rgba(251, 146, 60, 0.95)",
  fan_only: "rgba(94, 234, 212, 0.85)",
  fan: "rgba(94, 234, 212, 0.85)",
  off: "rgba(255,255,255,0.18)",
  auto: "rgba(34, 197, 94, 0.85)",
  unknown: "rgba(255,255,255,0.18)",
};

const HVAC_GLOW: Record<string, string> = {
  cool: "rgba(96, 165, 250, 0.22)",
  cooling: "rgba(96, 165, 250, 0.3)",
  heat: "rgba(251, 146, 60, 0.22)",
  heating: "rgba(251, 146, 60, 0.32)",
  fan_only: "rgba(94, 234, 212, 0.22)",
  fan: "rgba(94, 234, 212, 0.22)",
  off: "rgba(255,255,255,0.04)",
  auto: "rgba(34, 197, 94, 0.22)",
  unknown: "rgba(255,255,255,0.04)",
};

const HVAC_ACCENT_CSS: Record<string, string> = {
  cool: "rgb(96, 165, 250)",
  cooling: "rgb(96, 165, 250)",
  heat: "rgb(251, 146, 60)",
  heating: "rgb(251, 146, 60)",
  fan_only: "rgb(94, 234, 212)",
  fan: "rgb(94, 234, 212)",
  off: "rgba(255,255,255,0.45)",
  auto: "rgb(34, 197, 94)",
  unknown: "rgba(255,255,255,0.45)",
};

const ACTIVE_HVAC_ACTION: Record<string, ClimateVisualMode> = {
  heating: "heat",
  cooling: "cool",
  fan: "fan_only",
};

const HVAC_MODES: { key: ClimateVisualMode; label: string }[] = [
  { key: "heat", label: "HEAT" },
  { key: "cool", label: "COOL" },
  { key: "fan_only", label: "FAN" },
  { key: "off", label: "OFF" },
];

const THERMOSTAT_EXIT_MS = 260;

const ARC_MIN_TEMP = 60;
const ARC_MAX_TEMP = 85;
const ARC_RADIUS = 44;
const ARC_CENTER = 50;
const ARC_ANGLE_START = (-Math.PI * 5) / 6;
const ARC_ANGLE_END = -Math.PI / 6;
const ARC_ANGLE_SPAN = ARC_ANGLE_END - ARC_ANGLE_START;

function polar(t: number) {
  const angle = ARC_ANGLE_START + t * ARC_ANGLE_SPAN;
  return {
    x: ARC_CENTER + ARC_RADIUS * Math.cos(angle),
    y: ARC_CENTER + ARC_RADIUS * Math.sin(angle),
  };
}

function tFromPoint(px: number, py: number) {
  const dx = px - ARC_CENTER;
  const dy = py - ARC_CENTER;
  if (dy > 0) return px < ARC_CENTER ? 0 : 1;
  const angle = Math.atan2(dy, dx);
  const t = (angle - ARC_ANGLE_START) / ARC_ANGLE_SPAN;
  return Math.max(0, Math.min(1, t));
}

function tToTemp(t: number) {
  return Math.round(ARC_MIN_TEMP + t * (ARC_MAX_TEMP - ARC_MIN_TEMP));
}

function tempToT(v: number) {
  const clamped = Math.max(ARC_MIN_TEMP, Math.min(ARC_MAX_TEMP, v));
  return (clamped - ARC_MIN_TEMP) / (ARC_MAX_TEMP - ARC_MIN_TEMP);
}

function arcPath(t0: number, t1: number) {
  const p0 = polar(t0);
  const p1 = polar(t1);
  return `M ${p0.x} ${p0.y} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${p1.x} ${p1.y}`;
}

function ArcSlider({
  value,
  min,
  max,
  accentCss,
  trackCss,
  onChange,
  onCommit,
  onDragStart,
  onDragEnd,
}: {
  value: number;
  min: number;
  max: number;
  accentCss: string;
  trackCss: string;
  onChange: (temp: number) => void;
  onCommit: (temp: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);
  const currentValueRef = useRef(value);
  useEffect(() => {
    currentValueRef.current = value;
  }, [value]);

  const t = tempToT(value);
  const trackD = arcPath(0, 1);
  const ticks: { temp: number; active: boolean; x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let temp = ARC_MIN_TEMP; temp <= ARC_MAX_TEMP; temp += 1) {
    const tt = tempToT(temp);
    const angle = ARC_ANGLE_START + tt * ARC_ANGLE_SPAN;
    const active = temp === value;
    const rInner = active ? 39.5 : 41.5;
    const rOuter = active ? 47.5 : 45.5;
    ticks.push({
      temp,
      active,
      x1: ARC_CENTER + rInner * Math.cos(angle),
      y1: ARC_CENTER + rInner * Math.sin(angle),
      x2: ARC_CENTER + rOuter * Math.cos(angle),
      y2: ARC_CENTER + rOuter * Math.sin(angle),
    });
  }

  function updateFromEvent(e: React.PointerEvent<SVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const px = ((e.clientX - rect.left) * 100) / rect.width;
    const py = ((e.clientY - rect.top) * 100) / rect.height;
    const newTemp = tToTemp(tFromPoint(px, py));
    const clamped = Math.max(min, Math.min(max, newTemp));
    if (clamped !== currentValueRef.current) {
      currentValueRef.current = clamped;
      onChange(clamped);
    }
  }

  function handlePointerDown(e: React.PointerEvent<SVGElement>) {
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    draggingRef.current = true;
    onDragStart();
    updateFromEvent(e);
  }

  function handlePointerMove(e: React.PointerEvent<SVGElement>) {
    if (!draggingRef.current) return;
    updateFromEvent(e);
  }

  function handlePointerEnd(e: React.PointerEvent<SVGElement>) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    onDragEnd();
    onCommit(currentValueRef.current);
  }

  return (
    <Box position="absolute" inset="0" zIndex={2} pointerEvents="none">
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        style={{ touchAction: "none", overflow: "visible" }}
      >
        {ticks.map((tick) => (
          <line
            key={tick.temp}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={tick.active ? accentCss : trackCss}
            strokeWidth={tick.active ? 1.4 : 0.7}
            strokeLinecap="round"
            opacity={tick.active ? 1 : 0.55}
            pointerEvents="none"
            style={
              tick.active
                ? { filter: `drop-shadow(0 0 1.5px ${accentCss})` }
                : undefined
            }
          />
        ))}
        <path
          d={trackD}
          stroke="rgba(0,0,0,0.001)"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          tabIndex={0}
          style={{ pointerEvents: "stroke", cursor: "pointer" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        />
      </svg>
    </Box>
  );
}

function normalizeClimateMode(
  mode: string | null | undefined,
): ClimateVisualMode {
  if (mode === "heat" || mode === "cool" || mode === "fan_only") return mode;
  return "off";
}

function fmtClimateTemp(temp: number | null | undefined) {
  return temp == null ? null : Math.round(temp);
}

function getClimateAction(
  mode: ClimateVisualMode,
  unit: HomeClimate,
  targetTemp: number,
): ClimateVisualMode | null {
  const liveAction = unit.hvacAction
    ? ACTIVE_HVAC_ACTION[unit.hvacAction.toLowerCase()]
    : null;
  if (liveAction) return liveAction;
  if (mode === "off") return null;
  if (mode === "fan_only") return "fan_only";

  const currentTemp = fmtClimateTemp(unit.currentTemp);
  if (currentTemp == null) return null;
  if (mode === "heat" && currentTemp <= targetTemp - 1) return "heat";
  if (mode === "cool" && currentTemp >= targetTemp + 1) return "cool";
  return null;
}

function ClimateModal({
  unit,
  onClose,
}: {
  unit: HomeClimate;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);
  const [mode, setMode] = useState<ClimateVisualMode>(
    normalizeClimateMode(unit.hvacMode ?? unit.state),
  );
  const [temp, setTemp] = useState(fmtClimateTemp(unit.targetTemp) ?? 72);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsClosing(false);
    setMode(normalizeClimateMode(unit.hvacMode ?? unit.state));
    if (!isDraggingRef.current) {
      setTemp(fmtClimateTemp(unit.targetTemp) ?? 72);
    }
  }, [unit.entity_id, unit.hvacMode, unit.state, unit.targetTemp]);

  function requestClose() {
    if (isClosing) return;
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, THERMOSTAT_EXIT_MS);
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isClosing, onClose]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    },
    [],
  );

  const activeAction = getClimateAction(mode, unit, temp);
  const isOff = mode === "off";
  const isFanOnly = mode === "fan_only";
  const hidesTarget = isOff || isFanOnly;
  const currentTemp = fmtClimateTemp(unit.currentTemp);
  const previousTarget = fmtClimateTemp(unit.targetTemp);
  const displayedTemp = hidesTarget
    ? (currentTemp ?? previousTarget ?? temp)
    : temp;
  const displayLabel = hidesTarget
    ? currentTemp != null
      ? "Indoor temperature"
      : previousTarget != null
        ? "Last target"
        : "Thermostat"
    : "Target temperature";
  const detailLabel = isFanOnly
    ? "Fan circulating air"
    : isOff
      ? previousTarget != null
        ? `Last target ${previousTarget}°`
        : "Choose heat or cool to wake it up"
      : currentTemp != null
        ? `Indoor ${currentTemp}°`
        : "Connected to Home Assistant";
  const statusLabel =
    activeAction === "heat"
      ? "Heating now"
      : activeAction === "cool"
        ? "Cooling now"
        : activeAction === "fan_only"
          ? "Fan running"
          : mode === "heat"
            ? "Heat standby"
            : mode === "cool"
              ? "Cool standby"
              : mode === "fan_only"
                ? "Fan standby"
                : "System off";
  const AccentIcon =
    activeAction === "heat"
      ? IoFlame
      : activeAction === "cool"
        ? IoSnow
        : activeAction === "fan_only"
          ? MdAir
          : mode === "heat"
            ? IoFlame
            : mode === "cool"
              ? IoSnow
              : mode === "fan_only"
                ? MdAir
                : IoPowerOutline;

  function applyMode(newMode: ClimateVisualMode) {
    if (newMode === mode) return;
    setMode(newMode);
    callClimateService(unit.entity_id, "set_hvac_mode", {
      hvac_mode: newMode as HvacMode,
    });
    setTimeout(
      () =>
        void queryClient.invalidateQueries({ queryKey: ["home", "climate"] }),
      2500,
    );
  }

  function commitTemp(newTemp: number) {
    callClimateService(unit.entity_id, "set_temperature", {
      temperature: newTemp,
    });
    setTimeout(
      () =>
        void queryClient.invalidateQueries({ queryKey: ["home", "climate"] }),
      2500,
    );
  }

  const ringKey = activeAction ?? mode;
  const accentColor = HVAC_COLOR[ringKey] ?? "var(--theme-fg-faint)";
  const accentCssColor = HVAC_ACCENT_CSS[ringKey] ?? "rgba(255,255,255,0.45)";
  const ringColor = HVAC_RING[ringKey] ?? "rgba(255,255,255,0.18)";
  const glowColor = HVAC_GLOW[ringKey] ?? "rgba(255,255,255,0.04)";

  return (
    <Box
      position="fixed"
      inset="0"
      zIndex={200}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={{ base: "4vw", md: "4vmin" }}
      bg={`radial-gradient(circle at 50% 50%, ${glowColor} 0%, rgba(0,0,0,0.78) 55%, rgba(0,0,0,0.92) 100%)`}
      backdropFilter="blur(18px) saturate(140%)"
      onClick={requestClose}
      style={{
        opacity: isClosing ? 0 : 1,
        transition: `opacity ${THERMOSTAT_EXIT_MS}ms ease`,
        WebkitBackdropFilter: "blur(18px) saturate(140%)",
      }}
    >
      <Box
        as="button"
        aria-label="Close thermostat controls"
        position="absolute"
        top={{ base: "4vw", md: "3vmin" }}
        right={{ base: "4vw", md: "3vmin" }}
        width={{ base: "12vw", md: "7vmin" }}
        height={{ base: "12vw", md: "7vmin" }}
        borderRadius="full"
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        color="var(--theme-fg-faint)"
        bg="rgba(0,0,0,0.5)"
        border="1px solid rgba(255,255,255,0.12)"
        fontSize={{ base: "5.5vw", md: "3.4vmin" }}
        zIndex={300}
        onClick={(event) => {
          event.stopPropagation();
          requestClose();
        }}
        style={{
          WebkitTapHighlightColor: "transparent",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      >
        <IoClose />
      </Box>
      <VStack
        gap={{ base: "6vw", md: "4vmin" }}
        align="center"
        onClick={(event) => event.stopPropagation()}
        style={{
          transform: isClosing ? "scale(0.92)" : "scale(1)",
          transition: `transform ${THERMOSTAT_EXIT_MS}ms ease`,
        }}
      >
        <Box
          position="relative"
          width={{ base: "min(92vw, 70vh)", md: "min(70vmin, 70vh)" }}
          aspectRatio="1"
        >
          {!hidesTarget && (
            <ArcSlider
              value={temp}
              min={ARC_MIN_TEMP}
              max={ARC_MAX_TEMP}
              accentCss={accentCssColor}
              trackCss={ringColor}
              onChange={setTemp}
              onCommit={commitTemp}
              onDragStart={() => {
                isDraggingRef.current = true;
              }}
              onDragEnd={() => {
                isDraggingRef.current = false;
              }}
            />
          )}

          <Box
            position="relative"
            width="100%"
            height="100%"
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            overflow="hidden"
            bg={`radial-gradient(circle at 50% 50%, ${glowColor} 0%, rgba(0,0,0,0.6) 55%, #000 100%)`}
            boxShadow={`inset 0 0 0 0.5vmin ${ringColor}, inset 0 0 6vmin rgba(0,0,0,0.55), 0 0 8vmin ${ringColor}`}
            style={{
              transition: "box-shadow 400ms ease",
            }}
          >
            {activeAction && (
              <Box
                position="absolute"
                inset="0"
                borderRadius="full"
                pointerEvents="none"
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${ringColor} 0%, ${glowColor} 32%, transparent 65%)`,
                  animation: "thermostatPulse 2.6s ease-in-out infinite",
                  transformOrigin: "center",
                  mixBlendMode: "screen",
                }}
              />
            )}
            <VStack
              gap="0.6vmin"
              align="center"
              justify="center"
              position="relative"
              zIndex={1}
            >
              <Text
                fontSize={{ base: "3.4vw", md: "2.4vmin" }}
                color="var(--theme-fg-faint)"
                fontWeight="500"
                letterSpacing="0.08em"
              >
                {unit.name}
              </Text>
              <HStack
                gap={{ base: "1.4vw", md: "1vmin" }}
                color={accentColor}
                fontSize={{ base: "3vw", md: "2vmin" }}
                fontWeight="600"
                letterSpacing="0.18em"
                textTransform="uppercase"
                opacity={isOff ? 0.55 : 0.95}
              >
                <AccentIcon />
                <Text as="span">{statusLabel}</Text>
              </HStack>
              <Text
                fontSize={{ base: "28vw", md: "22vmin" }}
                fontWeight="100"
                lineHeight="1"
                color="var(--theme-fg)"
                letterSpacing="-0.05em"
              >
                {displayedTemp}°
              </Text>
              <Text
                fontSize={{ base: "2.8vw", md: "1.8vmin" }}
                color="var(--theme-fg-faint)"
                fontWeight="500"
                letterSpacing="0.1em"
                textTransform="uppercase"
              >
                {displayLabel}
              </Text>
              <Text
                fontSize={{ base: "2.6vw", md: "1.6vmin" }}
                color="var(--theme-fg-faint)"
                opacity={0.7}
                mt={{ base: "1vw", md: "0.6vmin" }}
              >
                {detailLabel}
              </Text>
            </VStack>
          </Box>
        </Box>

        {(() => {
          const activeIndex = HVAC_MODES.findIndex((m) => m.key === mode);
          const segCount = HVAC_MODES.length;
          const activeKey = HVAC_MODES[activeIndex]?.key ?? mode;
          const indicatorAccent =
            HVAC_RING[activeKey] ?? "rgba(255,255,255,0.18)";
          const indicatorGlow =
            HVAC_GLOW[activeKey] ?? "rgba(255,255,255,0.04)";
          return (
            <Box
              position="relative"
              bg="rgba(0,0,0,0.55)"
              borderRadius="full"
              border="1px solid rgba(255,255,255,0.08)"
              p="3px"
              width={{ base: "85vw", md: "44vmin" }}
              maxWidth="420px"
            >
              {activeIndex >= 0 && (
                <Box
                  position="absolute"
                  top="3px"
                  bottom="3px"
                  left="3px"
                  width={`calc((100% - 6px) / ${segCount})`}
                  borderRadius="full"
                  pointerEvents="none"
                  bg={`radial-gradient(circle at 50% 35%, ${indicatorGlow} 0%, rgba(0,0,0,0.6) 90%)`}
                  boxShadow={`inset 0 0 0 1px ${indicatorAccent}, 0 0 1.2vmin ${indicatorGlow}`}
                  style={{
                    transform: `translateX(${activeIndex * 100}%)`,
                    transition:
                      "transform 320ms cubic-bezier(0.32, 0.72, 0.2, 1), box-shadow 280ms ease, background 280ms ease",
                  }}
                />
              )}
              <HStack gap="0" position="relative" zIndex={1}>
                {HVAC_MODES.map(({ key, label }) => {
                  const active = mode === key;
                  const ModeIcon =
                    key === "heat"
                      ? IoFlame
                      : key === "cool"
                        ? IoSnow
                        : key === "fan_only"
                          ? MdAir
                          : IoPowerOutline;
                  const btnAccent =
                    HVAC_COLOR[key] ?? "var(--theme-fg-faint)";
                  return (
                    <Box
                      key={key}
                      as="button"
                      flex="1"
                      display="inline-flex"
                      flexDirection="column"
                      alignItems="center"
                      justifyContent="center"
                      gap="2px"
                      py="8px"
                      borderRadius="full"
                      bg="transparent"
                      color={active ? btnAccent : "var(--theme-fg-faint)"}
                      fontSize="22px"
                      onClick={() => applyMode(key)}
                      style={{
                        transition: "color 260ms ease",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      <ModeIcon />
                      <Text
                        fontSize="10px"
                        lineHeight="1"
                        fontWeight="600"
                        letterSpacing="0.12em"
                        opacity={active ? 1 : 0.75}
                      >
                        {label}
                      </Text>
                    </Box>
                  );
                })}
              </HStack>
            </Box>
          );
        })()}
      </VStack>
    </Box>
  );
}

function ClimateCard({
  unit,
  onTap,
}: {
  unit: HomeClimate;
  onTap: () => void;
}) {
  const displayMode = unit.hvacMode ?? unit.state;
  const activeAction =
    unit.hvacAction === "heating"
      ? "heating"
      : unit.hvacAction === "cooling"
        ? "cooling"
        : null;
  const badgeKey = activeAction ?? displayMode ?? "unknown";
  const accentColor = HVAC_COLOR[badgeKey] ?? "var(--theme-fg-faint)";
  const ringColor = HVAC_RING[badgeKey] ?? "rgba(255,255,255,0.18)";
  const glowColor = HVAC_GLOW[badgeKey] ?? "rgba(255,255,255,0.04)";
  const isOff = normalizeClimateMode(displayMode) === "off";
  const isActiveLive = activeAction != null;
  const currentTemp = fmtClimateTemp(unit.currentTemp);
  const targetTemp = fmtClimateTemp(unit.targetTemp);
  const ModeIcon =
    activeAction === "heating" || displayMode === "heat"
      ? IoFlame
      : activeAction === "cooling" || displayMode === "cool"
        ? IoSnow
        : displayMode === "fan_only" || displayMode === "fan"
          ? MdAir
          : IoPowerOutline;
  const showTarget = !isOff && targetTemp != null;
  const subLabel = isOff
    ? "OFF"
    : showTarget
      ? `→ ${targetTemp}°`
      : displayMode === "fan_only" || displayMode === "fan"
        ? "FAN"
        : "";

  return (
    <VStack gap="1vmin" align="center">
      <Box
        position="relative"
        aspectRatio="1"
        width="100%"
        borderRadius="full"
        cursor="pointer"
        display="flex"
        alignItems="center"
        justifyContent="center"
        overflow="hidden"
        bg={`radial-gradient(circle at 50% 50%, ${glowColor} 0%, rgba(0,0,0,0.6) 95%, #000 100%)`}
        boxShadow={`inset 0 0 0 0.5vmin ${ringColor}, inset 0 0 6vmin rgba(0,0,0,0.55)`}
        onClick={onTap}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        {isActiveLive && (
          <Box
            position="absolute"
            inset="0"
            borderRadius="full"
            pointerEvents="none"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${ringColor} 0%, ${glowColor} 32%, transparent 65%)`,
              animation: "thermostatPulse 2.6s ease-in-out infinite",
              transformOrigin: "center",
              mixBlendMode: "screen",
            }}
          />
        )}
        <VStack
          gap="0.4vmin"
          align="center"
          justify="center"
          position="relative"
          zIndex={1}
        >
          <Box
            color={accentColor}
            fontSize="2.6vmin"
            opacity={isOff ? 0.45 : 1}
            lineHeight="1"
            display="inline-flex"
          >
            <ModeIcon />
          </Box>
          <Text
            fontSize="6.6vmin"
            fontWeight="200"
            lineHeight="1"
            color="var(--theme-fg)"
            letterSpacing="-0.04em"
          >
            {currentTemp != null ? `${currentTemp}°` : "—"}
          </Text>
          <Text
            fontSize="1.5vmin"
            color={accentColor}
            fontWeight="600"
            letterSpacing="0.18em"
            textTransform="uppercase"
            opacity={isOff ? 0.55 : 0.95}
            minHeight="1.6vmin"
          >
            {subLabel}
          </Text>
        </VStack>
      </Box>
      <Text
        fontSize="1.8vmin"
        color="var(--theme-fg-faint)"
        fontWeight="500"
        textAlign="center"
        whiteSpace="nowrap"
        overflow="hidden"
        textOverflow="ellipsis"
        maxWidth="100%"
        lineHeight="1.1"
      >
        {unit.name}
      </Text>
    </VStack>
  );
}

export function ClimateSection({ climate }: { climate: HomeClimate[] }) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const selectedUnit =
    climate.find((unit) => unit.entity_id === selectedEntityId) ?? null;

  return (
    <Board
      collapsible
      storageKey="climate"
      title={<SectionTitle icon={<IoThermometerOutline />}>CLIMATE</SectionTitle>}
    >
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fill, minmax(20vmin, 1fr))"
        columnGap="2vmin"
        rowGap="2vmin"
        width="100%"
      >
        {climate.map((unit) => (
          <ClimateCard
            key={unit.entity_id || unit.name}
            unit={unit}
            onTap={() => setSelectedEntityId(unit.entity_id)}
          />
        ))}
      </Box>
      {selectedUnit && (
        <ClimateModal
          unit={selectedUnit}
          onClose={() => setSelectedEntityId(null)}
        />
      )}
    </Board>
  );
}
