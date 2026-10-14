import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  Grid,
  HStack,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import { PiFanFill } from "react-icons/pi";
import { IoClose } from "react-icons/io5";
import type { HomeFan } from "../hooks/useHomeData";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { Board } from "./Board";
import { CloseButton } from "./ui/close-button";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { callFanService } from "../lib/callService";

const STEP = 25;

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
      animation={
        on ? `fan-spin ${spinDuration(percentage)} linear infinite` : undefined
      }
    >
      <PiFanFill />
    </Box>
  );
}

/** What Home Assistant last reported, as the modal's slider reads it. */
function remoteOf(fan: HomeFan) {
  return {
    percentage: fan.percentage,
    state: fan.state,
  };
}

/**
 * Speed is a vertical Slider in the `fill` variant — a lever that fills from
 * the bottom, snapping to quarters — and power is a Switch. Both send their
 * service call once: the slider on release, the switch on toggle.
 */
function FanControls({ fan }: { fan: HomeFan }) {
  const remote = remoteOf(fan);
  const [seen, setSeen] = useState(remote);
  const [pct, setPct] = useState<number>(
    snap(
      fan.percentage != null ? fan.percentage : fan.state === "on" ? 100 : 0,
    ),
  );
  const [optimisticOn, setOptimisticOn] = useState<boolean | null>(null);
  const [dragging, setDragging] = useState(false);

  if (seen.percentage !== remote.percentage || seen.state !== remote.state) {
    setSeen(remote);
    setOptimisticOn(null);
    if (!dragging) {
      if (fan.percentage != null) setPct(snap(fan.percentage));
      else if (fan.state === "off") setPct(0);
    }
  }

  function commit(next: number) {
    if (next === 0) {
      setOptimisticOn(false);
      callFanService(fan.entity_id, "turn_off");
    } else {
      setOptimisticOn(true);
      // turn_on with percentage works whether the fan is off or on, and
      // powers on integrations that don't auto-on via set_percentage.
      callFanService(fan.entity_id, "turn_on", { percentage: next });
    }
  }

  const on = optimisticOn ?? fan.state === "on";

  function setPower(next: boolean) {
    if (!next) {
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

  const ring = on
    ? "color-mix(in srgb, var(--chakra-colors-hvac-fan) 85%, transparent)"
    : "rgba(255,255,255,0.18)";
  const glow = on
    ? "color-mix(in srgb, var(--chakra-colors-hvac-fan) 22%, transparent)"
    : "rgba(255,255,255,0.04)";

  return (
    <HStack gap={{ base: "6vw", md: "5vmin" }} align="center">
      <VStack gap={{ base: "3vw", md: "2vmin" }} align="center">
        <Dialog.Title
          fontSize={{ base: "3.4vw", md: "2.2vmin" }}
          color="fg.faint"
          fontWeight="500"
          letterSpacing="0.08em"
          textTransform="uppercase"
        >
          {fan.name}
        </Dialog.Title>
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
            size="min(28vw, 18vmin)"
            color={on ? "hvac.fan" : "fg.faint"}
          />
        </Box>
        <Text
          fontSize={{ base: "10vw", md: "7vmin" }}
          fontWeight="100"
          lineHeight="1"
          color="fg"
          letterSpacing="-0.04em"
        >
          {pct}
          <Text
            as="span"
            fontSize={{ base: "4vw", md: "3vmin" }}
            color="fg.faint"
            ml="1vmin"
          >
            %
          </Text>
        </Text>
        <Switch
          size="panel"
          colorPalette="teal"
          checked={on}
          onCheckedChange={(e) => setPower(e.checked)}
          color={on ? "hvac.fan" : "fg.faint"}
          css={{
            "& [data-part=label]": {
              fontSize: { base: "3.4vw", md: "2vmin" },
              fontWeight: "600",
              letterSpacing: "0.14em",
            },
          }}
        >
          {on ? "ON" : "OFF"}
        </Switch>
      </VStack>

      <Slider
        orientation="vertical"
        variant="fill"
        size="lever"
        colorPalette="teal"
        min={0}
        max={100}
        step={STEP}
        value={[pct]}
        aria-label={["Fan speed"]}
        height={{ base: "60vh", md: "50vmin" }}
        maxH="440px"
        onValueChange={(d) => {
          setDragging(true);
          setPct(d.value[0]);
        }}
        onValueChangeEnd={(d) => {
          setDragging(false);
          setPct(d.value[0]);
          commit(d.value[0]);
        }}
      />
    </HStack>
  );
}

function FanDialog({
  fan,
  open,
  onClose,
}: {
  fan: HomeFan | null;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog.Root
      open={open && fan != null}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      variant="immersive"
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content aria-label={`${fan?.name ?? "Fan"} controls`}>
            <Dialog.CloseTrigger asChild>
              <CloseButton
                variant="chrome"
                size="chrome"
                aria-label="Close fan controls"
                width={{ base: "12vw", md: "7vmin" }}
                height={{ base: "12vw", md: "7vmin" }}
                _icon={{
                  width: { base: "5.5vw", md: "3.4vmin" },
                  height: { base: "5.5vw", md: "3.4vmin" },
                }}
                zIndex={1}
              >
                <IoClose />
              </CloseButton>
            </Dialog.CloseTrigger>
            {fan && <FanControls key={fan.entity_id} fan={fan} />}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function FanRow({ fan, onTap }: { fan: HomeFan; onTap: () => void }) {
  const on = fan.state === "on";
  return (
    <Button
      variant="chip"
      size="chip"
      aria-pressed={on}
      onClick={onTap}
      width="100%"
      justifyContent="space-between"
      textAlign="start"
    >
      <HStack gap="1.2vmin" align="center" flex="1" minW="0">
        <FanIcon
          on={on}
          percentage={fan.percentage}
          size="2.6vmin"
          color={on ? "fg.dim" : "fg.faint"}
        />
        <Text
          fontSize="2vmin"
          color={on ? "fg.dim" : "fg.faint"}
          fontWeight="400"
          truncate
          flex="1"
          minW="0"
        >
          {fan.name}
        </Text>
      </HStack>
      <Text
        flexShrink={0}
        color={on ? "hvac.fan" : "fg.faint"}
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
      </Text>
    </Button>
  );
}

export function FanSection({ fan }: { fan: HomeFan[] }) {
  const [open, setOpen] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  if (fan.length === 0) return null;
  const onCount = fan.filter((f) => f.state === "on").length;
  const anyOn = onCount > 0;
  const selected = fan.find((f) => f.entity_id === selectedEntityId) ?? null;

  return (
    <Board
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
                color="fg.dim"
              />
            }
          >
            FANS
          </SectionTitle>
          <Box flex="1" minW="0" />
          {anyOn && (
            <Text textStyle="meta" color="fg.dim">
              {onCount} ON
            </Text>
          )}
        </HStack>
      }
    >
      {/* Chips wrap into columns so a wide card isn't one fan per band. */}
      <Grid
        templateColumns="repeat(auto-fill, minmax(34vmin, 1fr))"
        gap="chipGap"
        width="100%"
      >
        {fan.map((f) => (
          <FanRow
            key={f.entity_id}
            fan={f}
            onTap={() => {
              setSelectedEntityId(f.entity_id);
              setOpen(true);
            }}
          />
        ))}
      </Grid>
      <FanDialog fan={selected} open={open} onClose={() => setOpen(false)} />
    </Board>
  );
}
