import { useState } from "react";
import { Badge, Box, Card, Grid, HStack, Stat } from "@chakra-ui/react";
import type { HomeFan } from "../hooks/useHomeData";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { Board } from "./Board";
import { FanAllOffButton } from "./FanAllOffButton";
import { FanDialog } from "./FanDialog";
import { FanIcon } from "./FanIcon";
import { FanSkeleton } from "./skeletons/FanSkeleton";
import { presetLabel } from "../lib/fan";
import { climateGridCss, hvacPalette, tileRing } from "../lib/hvac";

/**
 * One fan as a Stat tile — the thermostat tiles' layout (ClimateSection's
 * ClimateTile) geared to a fan: the name and the fan icon, spinning at the
 * fan's pace while it runs, then the speed and what it's doing. A fan that's
 * on gets the thermostat's ring in the fan colour (teal, hvacPalette's `fan`,
 * the same as a thermostat in fan mode and this fan's dialog), with the icon
 * and status line in that colour; the status is the preset when the fan has
 * one ("Breeze"), else "On". Off, it is the plain outline card with the speed
 * muted and a grey "Off" Badge. The whole tile is the button that opens the
 * dialog (FanDialog: the thermostat's dial for the speed, since 0.140). Its
 * corners are `sm`, concentric with the fans card around it (0.145.4; the
 * card's own `surface` until then), as every tile in a card — the ring's width
 * rounder while it's on, so the ring's inner edge is `sm` (0.149.0, lib/hvac's
 * tileRing).
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
      // The ring, and the corner that keeps its inner edge `sm` (lib/hvac).
      {...tileRing(on, ring)}
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
