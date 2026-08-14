import { useEffect, useRef, useState } from "react";
import { Box, Text, HStack, VStack } from "@chakra-ui/react";
import { PiFanFill } from "react-icons/pi";
import { IoClose, IoPowerOutline } from "react-icons/io5";
import type { HomeFan } from "../hooks/useHomeData";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { Board } from "./Board";
import { callFanService } from "../lib/callService";
import { CHIP_GAP, CHIP_PADDING_X, CHIP_PADDING_Y, CHIP_RADIUS } from "../lib/surfaces";

const FAN_EXIT_MS = 240;
const STEP = 25;
const STEPS = [0, 25, 50, 75, 100] as const;

function snap(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n / STEP) * STEP));
}

function spinDuration(percentage: number | null): string {
  const pct = Math.max(25, Math.min(100, percentage ?? 100));
  // 100% → 3.0s/rev, 25% → 8.25s/rev
  const seconds = 9.0 - (pct / 100) * 6.0;
  return `${seconds.toFixed(2)}s`;
}

function FanIcon({
  on,
  percentage,
  size,
  color,
}: {
  on: boolean;
  percentage: number | null;
  size: string;
  color: string;
}) {
  return (
    <Box
      fontSize={size}
      color={color}
      lineHeight="1"
      display="inline-flex"
      style={
        on
          ? { animation: `fanSpin ${spinDuration(percentage)} linear infinite` }
          : undefined
      }
    >
      <PiFanFill />
    </Box>
  );
}

function FanModal({ fan, onClose }: { fan: HomeFan; onClose: () => void }) {
  const isDraggingRef = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pct, setPct] = useState<number>(
    snap(
      fan.percentage != null
        ? fan.percentage
        : fan.state === "on"
          ? 100
          : 0,
    ),
  );
  const [optimisticOn, setOptimisticOn] = useState<boolean | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    setOptimisticOn(null);
    if (isDraggingRef.current) return;
    if (fan.percentage != null) setPct(snap(fan.percentage));
    else if (fan.state === "off") setPct(0);
  }, [fan.percentage, fan.state]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  function requestClose() {
    if (isClosing) return;
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, FAN_EXIT_MS);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pctFromEvent(clientY: number): number {
    const track = trackRef.current;
    if (!track) return pct;
    const rect = track.getBoundingClientRect();
    if (rect.height === 0) return pct;
    const t = 1 - (clientY - rect.top) / rect.height;
    return snap(t * 100);
  }

  function commit(newPct: number) {
    if (newPct === 0) {
      setOptimisticOn(false);
      callFanService(fan.entity_id, "turn_off");
    } else {
      setOptimisticOn(true);
      // turn_on with percentage works whether fan is currently off or on,
      // and powers on integrations that don't auto-on via set_percentage.
      callFanService(fan.entity_id, "turn_on", { percentage: newPct });
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    isDraggingRef.current = true;
    setPct(pctFromEvent(e.clientY));
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return;
    setPct(pctFromEvent(e.clientY));
  }

  function handlePointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const next = pctFromEvent(e.clientY);
    setPct(next);
    commit(next);
  }

  function togglePower() {
    const currentlyOn = optimisticOn ?? fan.state === "on";
    if (currentlyOn) {
      setOptimisticOn(false);
      setPct(0);
      callFanService(fan.entity_id, "turn_off");
    } else {
      const restore = pct > 0 ? pct : 50;
      setOptimisticOn(true);
      setPct(restore);
      callFanService(fan.entity_id, "turn_on", { percentage: restore });
    }
  }

  const on = optimisticOn ?? fan.state === "on";
  const accent = "rgb(94, 234, 212)";
  const ring = on ? "rgba(94, 234, 212, 0.85)" : "rgba(255,255,255,0.18)";
  const glow = on ? "rgba(94, 234, 212, 0.22)" : "rgba(255,255,255,0.04)";

  return (
    <Box
      position="fixed"
      inset="0"
      zIndex={200}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={{ base: "4vw", md: "4vmin" }}
      bg={`radial-gradient(circle at 50% 50%, ${glow} 0%, rgba(0,0,0,0.78) 55%, rgba(0,0,0,0.92) 100%)`}
      backdropFilter="blur(18px) saturate(140%)"
      onClick={requestClose}
      style={{
        opacity: isClosing ? 0 : 1,
        transition: `opacity ${FAN_EXIT_MS}ms ease`,
        WebkitBackdropFilter: "blur(18px) saturate(140%)",
      }}
    >
      <Box
        as="button"
        aria-label="Close fan controls"
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

      <HStack
        gap={{ base: "6vw", md: "5vmin" }}
        align="center"
        onClick={(event) => event.stopPropagation()}
        style={{
          transform: isClosing ? "scale(0.94)" : "scale(1)",
          transition: `transform ${FAN_EXIT_MS}ms ease`,
        }}
      >
        <VStack gap={{ base: "3vw", md: "2vmin" }} align="center">
          <Text
            fontSize={{ base: "3.4vw", md: "2.2vmin" }}
            color="var(--theme-fg-faint)"
            fontWeight="500"
            letterSpacing="0.08em"
            textTransform="uppercase"
          >
            {fan.name}
          </Text>
          <Box
            position="relative"
            width={{ base: "44vw", md: "32vmin" }}
            aspectRatio="1"
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg={`radial-gradient(circle at 50% 50%, ${glow} 0%, rgba(0,0,0,0.6) 55%, #000 100%)`}
            boxShadow={`inset 0 0 0 0.5vmin ${ring}, inset 0 0 6vmin rgba(0,0,0,0.55), 0 0 8vmin ${ring}`}
          >
            <FanIcon
              on={on}
              percentage={pct}
              size={"min(28vw, 18vmin)"}
              color={on ? accent : "var(--theme-fg-faint)"}
            />
          </Box>
          <Text
            fontSize={{ base: "10vw", md: "7vmin" }}
            fontWeight="100"
            lineHeight="1"
            color="var(--theme-fg)"
            letterSpacing="-0.04em"
          >
            {pct}
            <Text
              as="span"
              fontSize={{ base: "4vw", md: "3vmin" }}
              color="var(--theme-fg-faint)"
              ml="1vmin"
            >
              %
            </Text>
          </Text>
          <Box
            as="button"
            onClick={togglePower}
            display="inline-flex"
            alignItems="center"
            gap="1vmin"
            px={{ base: "5vw", md: "3vmin" }}
            py={{ base: "2.5vw", md: "1.4vmin" }}
            borderRadius="full"
            bg="rgba(0,0,0,0.55)"
            border={`1px solid ${on ? accent : "rgba(255,255,255,0.12)"}`}
            color={on ? accent : "var(--theme-fg-faint)"}
            fontSize={{ base: "3.4vw", md: "2vmin" }}
            fontWeight="600"
            letterSpacing="0.14em"
            style={{
              WebkitTapHighlightColor: "transparent",
              transition: "color 220ms ease, border-color 220ms ease",
            }}
          >
            <IoPowerOutline />
            <Text as="span">{on ? "ON" : "OFF"}</Text>
          </Box>
        </VStack>

          <Box
            ref={trackRef}
            position="relative"
            width={{ base: "16vw", md: "10vmin" }}
            height={{ base: "60vh", md: "50vmin" }}
            maxHeight="440px"
            borderRadius="full"
            bg="rgba(255,255,255,0.06)"
            border="1px solid rgba(255,255,255,0.1)"
            overflow="hidden"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            style={{
              touchAction: "none",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <Box
              position="absolute"
              left="0"
              right="0"
              bottom="0"
              height={`${pct}%`}
              bg={`linear-gradient(180deg, ${accent} 0%, rgba(94,234,212,0.4) 100%)`}
              style={{
                transition: isDraggingRef.current
                  ? "none"
                  : "height 200ms ease",
                boxShadow: `0 0 4vmin ${glow}`,
              }}
              pointerEvents="none"
            />
            {STEPS.slice(1, -1).map((step) => (
              <Box
                key={step}
                position="absolute"
                left="20%"
                right="20%"
                bottom={`${step}%`}
                height="1px"
                bg="rgba(255,255,255,0.15)"
                pointerEvents="none"
              />
            ))}
          </Box>
      </HStack>
    </Box>
  );
}

function FanRow({ fan, onTap }: { fan: HomeFan; onTap: () => void }) {
  const on = fan.state === "on";
  return (
    <HStack
      as="button"
      width="100%"
      minW="0"
      justify="space-between"
      align="center"
      onClick={onTap}
      bg={on ? "var(--theme-surface-2-on)" : "var(--theme-surface-2)"}
      px={CHIP_PADDING_X}
      py={CHIP_PADDING_Y}
      borderRadius={CHIP_RADIUS}
      style={{ WebkitTapHighlightColor: "transparent", textAlign: "left" }}
    >
      <HStack gap="1.2vmin" align="center" flex="1" minW="0">
        <FanIcon
          on={on}
          percentage={fan.percentage}
          size="2.6vmin"
          color={on ? "var(--theme-fg-dim)" : "var(--theme-fg-faint)"}
        />
        <Text
          fontSize="2vmin"
          color={on ? "var(--theme-fg-dim)" : "var(--theme-fg-faint)"}
          fontWeight="400"
          overflow="hidden"
          whiteSpace="nowrap"
          textOverflow="ellipsis"
          flex="1"
          minW="0"
        >
          {fan.name}
        </Text>
      </HStack>
      {/* The chip supplies the surface now, so the value is plain text. */}
      <Box
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
        color={on ? "rgb(94, 234, 212)" : "var(--theme-fg-faint)"}
        fontSize="1.8vmin"
        fontWeight="600"
        letterSpacing="0.06em"
        lineHeight="1"
      >
        {on
          ? fan.percentage != null
            ? `${Math.round(fan.percentage)}%`
            : "ON"
          : "OFF"}
      </Box>
    </HStack>
  );
}

export function FanSection({ fan, span }: { fan: HomeFan[]; span?: 1 | 2 }) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  if (fan.length === 0) return null;
  const onCount = fan.filter((f) => f.state === "on").length;
  const anyOn = onCount > 0;
  const selected = fan.find((f) => f.entity_id === selectedEntityId) ?? null;

  return (
    <Board
      span={span}
      collapsible
      storageKey="fan"
      title={
        <HStack width="100%" align="center" gap="1.5vmin">
          <SectionTitle
            icon={
              <FanIcon
                on={anyOn}
                percentage={null}
                size="2vmin"
                color="var(--theme-fg-dim)"
              />
            }
          >
            FANS
          </SectionTitle>
          <Box flex="1" minW="0" />
          {anyOn && (
            <Text
              fontSize="1.8vmin"
              color="var(--theme-fg-dim)"
              letterSpacing="0.06em"
              fontWeight="500"
            >
              {onCount} ON
            </Text>
          )}
        </HStack>
      }
    >
      {/* Chips wrap into columns so a wide card isn't one fan per band. */}
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fill, minmax(34vmin, 1fr))"
        gap={CHIP_GAP}
        width="100%"
      >
        {fan.map((f) => (
          <FanRow
            key={f.entity_id}
            fan={f}
            onTap={() => setSelectedEntityId(f.entity_id)}
          />
        ))}
      </Box>
      {selected && (
        <FanModal
          fan={selected}
          onClose={() => setSelectedEntityId(null)}
        />
      )}
    </Board>
  );
}
