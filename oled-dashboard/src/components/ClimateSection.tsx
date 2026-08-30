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
import { FanSpeedSlider } from "./FanSpeedSlider";
import { useColorModeValue } from "./ui/color-mode";

type ClimateVisualMode = "heat" | "cool" | "fan_only" | "off";

// Per-mode hue as bare RGB channels: [dark mode, bright mode].
// Bright mode uses darker shades so they read against a white background.
const HVAC_RGB: Record<string, [string, string]> = {
  cool: ["96, 165, 250", "29, 78, 216"],
  cooling: ["96, 165, 250", "29, 78, 216"],
  heat: ["249, 115, 22", "194, 65, 12"],
  heating: ["249, 115, 22", "194, 65, 12"],
  fan_only: ["94, 234, 212", "13, 148, 136"],
  fan: ["94, 234, 212", "13, 148, 136"],
  auto: ["34, 197, 94", "21, 128, 61"],
};

const LIVE_HVAC_KEYS = new Set(["heating", "cooling", "fan"]);

type HvacPalette = { accent: string; ring: string };

/** Accent + ring colors for an hvac key, resolved for the active theme. */
function useHvacPalette(): (key: string) => HvacPalette {
  const isDark = useColorModeValue(false, true);
  return (key: string) => {
    const rgb = HVAC_RGB[key]?.[isDark ? 0 : 1];
    if (!rgb) {
      return {
        accent: "var(--theme-fg-faint)",
        ring: "var(--theme-fg-faint)",
      };
    }
    const ringAlpha = LIVE_HVAC_KEYS.has(key) ? 1 : isDark ? 0.85 : 0.9;
    return { accent: `rgb(${rgb})`, ring: `rgba(${rgb}, ${ringAlpha})` };
  };
}

/** Neutral surfaces (scrim, chrome, hairlines) for the active theme. */
function useNeutrals() {
  // Translucent — the page behind stays visible through the backdrop blur.
  const scrim = useColorModeValue("rgba(255,255,255,0.35)", "rgba(0,0,0,0.4)");
  const chrome = useColorModeValue("rgba(255,255,255,0.8)", "rgba(0,0,0,0.5)");
  const track = useColorModeValue("rgba(0,0,0,0.05)", "rgba(0,0,0,0.55)");
  const hairline = useColorModeValue(
    "rgba(0,0,0,0.12)",
    "rgba(255,255,255,0.16)",
  );
  return { scrim, chrome, track, hairline };
}

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

type TickLine = {
  temp: number;
  active: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

function buildTicks(activeTemp: number | null | undefined): TickLine[] {
  const lines: TickLine[] = [];
  for (let temp = ARC_MIN_TEMP; temp <= ARC_MAX_TEMP; temp += 1) {
    const tt = tempToT(temp);
    const angle = ARC_ANGLE_START + tt * ARC_ANGLE_SPAN;
    const active = temp === activeTemp;
    const rInner = active ? 35 : 37;
    const rOuter = active ? 43 : 41;
    lines.push({
      temp,
      active,
      x1: ARC_CENTER + rInner * Math.cos(angle),
      y1: ARC_CENTER + rInner * Math.sin(angle),
      x2: ARC_CENTER + rOuter * Math.cos(angle),
      y2: ARC_CENTER + rOuter * Math.sin(angle),
    });
  }
  return lines;
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

  const trackD = arcPath(0, 1);
  const ticks = buildTicks(value);

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
  const palette = useHvacPalette();
  const neutrals = useNeutrals();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);
  const isFanDraggingRef = useRef(false);
  const [mode, setMode] = useState<ClimateVisualMode>(
    normalizeClimateMode(unit.hvacMode ?? unit.state),
  );
  const [temp, setTemp] = useState(fmtClimateTemp(unit.targetTemp) ?? 72);
  const [fanMode, setFanMode] = useState<string | null>(unit.fanMode);
  const [isClosing, setIsClosing] = useState(false);
  const isClosingRef = useRef(false);

  // Only a switch to a different thermostat re-opens a modal that is closing.
  useEffect(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    isClosingRef.current = false;
    setIsClosing(false);
  }, [unit.entity_id]);

  // Incoming HA state must never resurrect a modal mid-exit.
  useEffect(() => {
    if (isClosingRef.current) return;
    setMode(normalizeClimateMode(unit.hvacMode ?? unit.state));
    if (!isDraggingRef.current) {
      setTemp(fmtClimateTemp(unit.targetTemp) ?? 72);
    }
    if (!isFanDraggingRef.current) {
      setFanMode(unit.fanMode);
    }
  }, [
    unit.entity_id,
    unit.hvacMode,
    unit.state,
    unit.targetTemp,
    unit.fanMode,
  ]);

  function requestClose() {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
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

  function commitFanMode(newFanMode: string) {
    if (newFanMode === unit.fanMode) return;
    callClimateService(unit.entity_id, "set_fan_mode", {
      fan_mode: newFanMode,
    });
    setTimeout(
      () =>
        void queryClient.invalidateQueries({ queryKey: ["home", "climate"] }),
      2500,
    );
  }

  const ringKey = activeAction ?? mode;
  const { accent: accentCssColor, ring: ringColor } = palette(ringKey);
  const accentColor = accentCssColor;

  // Staggered enter on mount, matching exit once closing starts.
  const anim = (
    inName: string,
    outName: string,
    { ms = 380, delay = 0 }: { ms?: number; delay?: number } = {},
  ) =>
    isClosing
      ? `${outName} ${THERMOSTAT_EXIT_MS}ms ease forwards`
      : `${inName} ${ms}ms cubic-bezier(0.32, 0.72, 0.2, 1) ${delay}ms both`;

  return (
    <Box
      position="fixed"
      inset="0"
      zIndex={200}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={{ base: "4vw", md: "4vmin" }}
      bg={neutrals.scrim}
      backdropFilter="blur(22px) saturate(140%)"
      onClick={requestClose}
      style={{
        animation: anim("thermostatModalFadeIn", "thermostatModalFadeOut", {
          ms: 240,
        }),
        WebkitBackdropFilter: "blur(22px) saturate(140%)",
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
        bg={neutrals.chrome}
        border={`1px solid ${neutrals.hairline}`}
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
          animation: anim("thermostatControlIn", "thermostatControlOut", {
            ms: 300,
            delay: 140,
          }),
        }}
      >
        <IoClose />
      </Box>
      <VStack
        gap={{ base: "6vw", md: "4vmin" }}
        align="center"
        onClick={(event) => event.stopPropagation()}
      >
        <Box
          position="relative"
          width={{ base: "min(64vw, 44vh)", md: "min(44vmin, 48vh)" }}
          aspectRatio="1"
          style={{
            animation: anim("thermostatDialIn", "thermostatDialOut", {
              ms: 420,
            }),
          }}
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
            bg="var(--theme-bg)"
            boxShadow={`inset 0 0 0 0.4vmin ${ringColor}`}
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
                boxShadow={`inset 0 0 0 0.4vmin ${accentCssColor}`}
                style={{
                  animation: "thermostatFlatPulse 2.6s ease-in-out infinite",
                }}
              />
            )}
            <VStack
              gap="0.6vmin"
              align="center"
              justify="center"
              position="relative"
              zIndex={1}
              style={{
                animation: anim("thermostatControlIn", "thermostatControlOut", {
                  ms: 320,
                  delay: 120,
                }),
              }}
            >
              <Text
                fontSize={{ base: "2.6vw", md: "1.8vmin" }}
                color="var(--theme-fg-faint)"
                fontWeight="500"
                letterSpacing="0.08em"
              >
                {unit.name}
              </Text>
              <HStack
                gap={{ base: "1.2vw", md: "0.8vmin" }}
                color={accentColor}
                fontSize={{ base: "2.2vw", md: "1.5vmin" }}
                fontWeight="600"
                letterSpacing="0.18em"
                textTransform="uppercase"
                opacity={isOff ? 0.55 : 0.95}
              >
                <AccentIcon />
                <Text as="span">{statusLabel}</Text>
              </HStack>
              <Text
                fontSize={{ base: "19vw", md: "13.5vmin" }}
                fontWeight="100"
                lineHeight="1"
                color="var(--theme-fg)"
                letterSpacing="-0.05em"
              >
                {displayedTemp}°
              </Text>
              <Text
                fontSize={{ base: "2.1vw", md: "1.4vmin" }}
                color="var(--theme-fg-faint)"
                fontWeight="500"
                letterSpacing="0.1em"
                textTransform="uppercase"
              >
                {displayLabel}
              </Text>
              <Text
                fontSize={{ base: "2vw", md: "1.3vmin" }}
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
          const indicatorAccent = palette(activeKey).ring;
          return (
            <Box
              position="relative"
              bg={neutrals.track}
              borderRadius="full"
              border={`1px solid ${neutrals.hairline}`}
              p="3px"
              width={{ base: "72vw", md: "38vmin" }}
              maxWidth="380px"
              style={{
                animation: anim("thermostatFooterIn", "thermostatFooterOut", {
                  ms: 380,
                  delay: 90,
                }),
              }}
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
                  bg="transparent"
                  boxShadow={`inset 0 0 0 1px ${indicatorAccent}`}
                  style={{
                    transform: `translateX(${activeIndex * 100}%)`,
                    transition:
                      "transform 320ms cubic-bezier(0.32, 0.72, 0.2, 1), box-shadow 280ms ease",
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
                  const btnAccent = palette(key).accent;
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

        {unit.fanModes.length > 0 && (
          <Box
            width={{ base: "72vw", md: "38vmin" }}
            maxWidth="380px"
            style={{
              animation: anim("thermostatFooterIn", "thermostatFooterOut", {
                ms: 380,
                delay: 140,
              }),
            }}
          >
            <FanSpeedSlider
              modes={unit.fanModes}
              value={fanMode}
              accent={accentCssColor}
              trackCss={neutrals.track}
              hairline={neutrals.hairline}
              disabled={isOff}
              onChange={setFanMode}
              onCommit={commitFanMode}
              onDragStart={() => {
                isFanDraggingRef.current = true;
              }}
              onDragEnd={() => {
                isFanDraggingRef.current = false;
              }}
            />
          </Box>
        )}
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
  const palette = useHvacPalette();
  const displayMode = unit.hvacMode ?? unit.state;
  const activeAction =
    unit.hvacAction === "heating"
      ? "heating"
      : unit.hvacAction === "cooling"
        ? "cooling"
        : null;
  const badgeKey = activeAction ?? displayMode ?? "unknown";
  const { accent: accentCssColor, ring: ringColor } = palette(badgeKey);
  const accentColor = accentCssColor;
  const isOff = normalizeClimateMode(displayMode) === "off";
  const isActiveLive = activeAction != null;
  const currentTemp = fmtClimateTemp(unit.currentTemp);
  const targetTemp = fmtClimateTemp(unit.targetTemp);
  const showTickArc = !isOff && targetTemp != null;
  const tickArc = showTickArc ? buildTicks(targetTemp) : null;
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
        bg="var(--theme-bg)"
        boxShadow={`inset 0 0 0 0.4vmin ${ringColor}`}
        onClick={onTap}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        {isActiveLive && (
          <Box
            position="absolute"
            inset="0"
            borderRadius="full"
            pointerEvents="none"
            boxShadow={`inset 0 0 0 0.4vmin ${accentCssColor}`}
            style={{
              animation: "thermostatFlatPulse 2.6s ease-in-out infinite",
            }}
          />
        )}
        {tickArc && (
          <Box position="absolute" inset="0" pointerEvents="none">
            <svg
              viewBox="0 0 100 100"
              width="100%"
              height="100%"
              style={{ overflow: "visible" }}
            >
              {tickArc.map((tick) => (
                <line
                  key={tick.temp}
                  x1={tick.x1}
                  y1={tick.y1}
                  x2={tick.x2}
                  y2={tick.y2}
                  stroke={tick.active ? accentCssColor : ringColor}
                  strokeWidth={tick.active ? 1.4 : 0.7}
                  strokeLinecap="round"
                  opacity={tick.active ? 1 : 0.55}
                  style={
                    tick.active
                      ? { filter: `drop-shadow(0 0 1.5px ${accentCssColor})` }
                      : undefined
                  }
                />
              ))}
            </svg>
          </Box>
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
            className="display-numeral"
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

/**
 * Card width at which every thermostat fits on one row. Below it the dials
 * wrap — four units read as 2x2 on the frame and on a phone.
 */
export const SINGLE_ROW_MIN_PX = 900;

export function ClimateSection({
  climate,
  span,
}: {
  climate: HomeClimate[];
  span?: 1 | 2;
}) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const selectedUnit =
    climate.find((unit) => unit.entity_id === selectedEntityId) ?? null;

  return (
    <Board
      span={span}
      collapsible
      storageKey="climate"
      title={
        <SectionTitle icon={<IoThermometerOutline />}>CLIMATE</SectionTitle>
      }
    >
      {/* Measure this card, not the viewport.
       *
       * A viewport breakpoint gets the frame wrong: Frame14 is 1600px wide, so
       * it clears Chakra's xl and took the one-row track — but the card itself
       * is only the 1.15fr cell of the bento, so four dials landed in a row
       * squeezed against the top of a half-empty card. The container query asks
       * how wide this card actually is, which is right on the frame, on a phone
       * and in a wide desktop window alike. */}
      <Box css={{ containerType: "inline-size" }} width="100%" minW="0">
        <Box
          display="grid"
          gridTemplateColumns="repeat(auto-fill, minmax(20vmin, 1fr))"
          css={{
            [`@container (min-width: ${SINGLE_ROW_MIN_PX}px)`]: {
              gridTemplateColumns: `repeat(${climate.length}, minmax(0, 1fr))`,
            },
          }}
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
