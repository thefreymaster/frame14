import { useState } from "react";
import {
  Badge,
  Box,
  Card,
  Circle,
  Dialog,
  Grid,
  HStack,
  Portal,
  Stat,
  Text,
  VStack,
} from "@chakra-ui/react";
import { PiFanFill } from "react-icons/pi";
import type { HomeFan } from "../hooks/useHomeData";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { Board } from "./Board";
import { FanAllOffButton } from "./FanAllOffButton";
import { FanSkeleton } from "./skeletons/FanSkeleton";
import { CloseButton } from "./ui/close-button";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { callFanService } from "../lib/callService";
import { climateGridCss, hvacPalette } from "../lib/hvac";

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

/** "sleep_mode" → "Sleep mode": a preset as Home Assistant names it, for people. */
function presetLabel(preset: string | null): string | null {
  if (!preset) return null;
  const words = preset.replace(/_/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : null;
}

/**
 * One fan as a Stat tile — the thermostat tiles' layout (ClimateSection's
 * ClimateTile) geared to a fan: the name and the fan icon, spinning at the
 * fan's pace while it runs, then the speed and what it's doing. A fan that's
 * on gets the thermostat's ring in the fan colour (teal, hvacPalette's `fan`,
 * the same as a thermostat in fan mode and this fan's dialog), with the icon
 * and status line in that colour; the status is the preset when the fan has
 * one ("Breeze"), else "On". Off, it is the plain outline card with the speed
 * muted and a grey "Off" Badge. The whole tile is the button that opens the
 * dialog. Its corners are the Card recipe's `surface`, the same as the fans
 * card around it.
 */
function FanTile({ fan, onTap }: { fan: HomeFan; onTap: () => void }) {
  const on = fan.state === "on";
  const { accent, ring, palette } = hvacPalette(on ? "fan" : "off");
  const pct = fan.percentage != null ? Math.round(fan.percentage) : null;
  // A fan that's on without a speed is just on. Off, the speed is 0%
  // whatever the entity still carries (some keep the last speed set).
  const reading = !on ? "0%" : pct == null ? "On" : `${pct}%`;
  const preset = on ? presetLabel(fan.presetMode) : null;
  const status = on ? (preset ?? "On") : "Off";
  const spoken = on ? `${reading}${preset ? `, ${preset}` : ""}` : "off";

  return (
    <Card.Root
      asChild
      size="sm"
      variant="outline"
      colorPalette={palette}
      // The ring is the 1px outline border plus an inset shadow, 0.25rem in
      // all, so a lit tile is exactly the size of an off one.
      borderColor={on ? ring : undefined}
      boxShadow={on ? `inset 0 0 0 calc(0.25rem - 1px) ${ring}` : undefined}
      transition="box-shadow 400ms ease, border-color 400ms ease"
      cursor="pointer"
      focusVisibleRing="outside"
      _active={{ bg: "bg.emphasized" }}
    >
      <button
        type="button"
        aria-label={`${fan.name}: ${spoken}`}
        onClick={onTap}
      >
        <Card.Body p="3">
          <Stat.Root size="lg">
            {/* A narrow tile (a phone, or four across in landscape) wraps the
                name rather than cutting it off. */}
            <HStack justify="space-between" align="start" gap="2">
              <Stat.Label minW="0" lineClamp="2">
                {fan.name}
              </Stat.Label>
              <FanIcon
                on={on}
                percentage={fan.percentage}
                size="1.25rem"
                color={on ? accent : "fg.subtle"}
              />
            </HStack>
            <HStack justify="space-between" gap="2" wrap="wrap">
              <Stat.ValueText
                lineHeight="1"
                color={on ? undefined : "fg.muted"}
              >
                {reading}
              </Stat.ValueText>
              {on ? (
                <Stat.HelpText
                  color={accent}
                  textStyle="xs"
                  fontWeight="semibold"
                >
                  {status}
                </Stat.HelpText>
              ) : (
                <Badge colorPalette="gray">{status}</Badge>
              )}
            </HStack>
          </Stat.Root>
        </Card.Body>
      </button>
    </Card.Root>
  );
}

export function FanSection({
  fan,
  loading = false,
}: {
  fan: HomeFan[];
  /** Fans are configured but none has answered: placeholder buttons. */
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  if (!loading && fan.length === 0) return null;
  const onIds = fan.filter((f) => f.state === "on").map((f) => f.entity_id);
  const onCount = onIds.length;
  const anyOn = onCount > 0;
  const selected = fan.find((f) => f.entity_id === selectedEntityId) ?? null;

  return (
    <Board
      collapsible
      storageKey="fan"
      // The climate card's All off, for fans: there only while one is on.
      action={anyOn ? <FanAllOffButton entityIds={onIds} /> : null}
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
      {/* The thermostat tiles' grid (climateGridCss): columns from this
          card's own width, never a row with one tile left over. */}
      {loading ? (
        <FanSkeleton />
      ) : (
        <Box css={{ containerType: "inline-size" }} width="100%" minW="0">
          <Grid css={climateGridCss(fan.length)} width="100%">
            {fan.map((f) => (
              <FanTile
                key={f.entity_id}
                fan={f}
                onTap={() => {
                  setSelectedEntityId(f.entity_id);
                  setOpen(true);
                }}
              />
            ))}
          </Grid>
        </Box>
      )}
      <FanDialog fan={selected} open={open} onClose={() => setOpen(false)} />
    </Board>
  );
}
