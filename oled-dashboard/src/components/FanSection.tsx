import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Circle,
  Dialog,
  Grid,
  HStack,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import { PiFanFill } from "react-icons/pi";
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

  return (
    <HStack gap="8" align="center" justify="center">
      <VStack gap="4" align="center">
        <Circle
          size="10rem"
          bg={on ? "teal.subtle" : "bg.muted"}
          color={on ? "teal.fg" : "fg.subtle"}
        >
          <FanIcon on={on} percentage={pct} size="6rem" color="inherit" />
        </Circle>
        <Text textStyle="5xl" fontWeight="light" lineHeight="1">
          {pct}
          <Text as="span" textStyle="2xl" color="fg.muted" ms="1">
            %
          </Text>
        </Text>
        <Switch
          colorPalette="teal"
          checked={on}
          onCheckedChange={(e) => setPower(e.checked)}
        >
          {on ? "On" : "Off"}
        </Switch>
      </VStack>

      <Slider
        orientation="vertical"
        colorPalette="teal"
        min={0}
        max={100}
        step={STEP}
        value={[pct]}
        aria-label={["Fan speed"]}
        height="16rem"
        marks={[0, 25, 50, 75, 100]}
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
      placement="center"
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{fan?.name ?? "Fan"}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body pb="8">
              {fan && <FanControls key={fan.entity_id} fan={fan} />}
            </Dialog.Body>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
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
      variant={on ? "subtle" : "outline"}
      colorPalette={on ? "teal" : "gray"}
      size="lg"
      aria-pressed={on}
      onClick={onTap}
      width="100%"
      justifyContent="space-between"
    >
      <HStack gap="2" minW="0">
        <FanIcon
          on={on}
          percentage={fan.percentage}
          size="1.25rem"
          color="inherit"
        />
        <Text truncate>{fan.name}</Text>
      </HStack>
      <Text>
        {on
          ? fan.percentage != null
            ? `${Math.round(fan.percentage)}%`
            : "On"
          : "Off"}
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
        <HStack width="100%" align="center" gap="3">
          <SectionTitle
            icon={
              <FanIcon
                on={anyOn}
                percentage={null}
                size="1em"
                color="inherit"
              />
            }
          >
            Fans
          </SectionTitle>
          <Box flex="1" minW="0" />
          {anyOn && <Badge colorPalette="teal">{onCount} on</Badge>}
        </HStack>
      }
    >
      {/* Chips wrap into columns so a wide card isn't one fan per band. */}
      <Grid
        templateColumns="repeat(auto-fill, minmax(14rem, 1fr))"
        gap="3"
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
