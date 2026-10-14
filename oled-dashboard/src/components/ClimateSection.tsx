import { useState } from "react";
import { Badge, Box, Card, Grid, HStack, Icon, Stat } from "@chakra-ui/react";
import { IoThermometerOutline } from "react-icons/io5";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import type { HomeClimate } from "../hooks/useHomeData";
import { Board } from "./Board";
import { ClimateDialog } from "./ClimateDialog";
import {
  climateGridCss,
  fmtClimateTemp,
  HVAC_MODES,
  hvacPalette,
  MODE_ICON,
  normalizeClimateMode,
  type ClimateVisualMode,
} from "../lib/hvac";

/** Home Assistant's hvac_action values that mean the unit is running now. */
const RUNNING: Record<string, { mode: ClimateVisualMode; label: string }> = {
  heating: { mode: "heat", label: "Heating" },
  cooling: { mode: "cool", label: "Cooling" },
};

/**
 * One thermostat as a Stat tile: the name and a mode icon, then the room
 * temperature beside a Badge saying what it's doing. The badge is solid while
 * the unit is heating or cooling right now, subtle on standby, and grey when
 * it's off; an off tile also drops to the outline card. The whole tile is the
 * button that opens the dialog.
 */
function ClimateTile({
  unit,
  onTap,
}: {
  unit: HomeClimate;
  onTap: () => void;
}) {
  const mode = normalizeClimateMode(unit.hvacMode ?? unit.state);
  const running = unit.hvacAction ? RUNNING[unit.hvacAction] : undefined;
  const shown = running?.mode ?? mode;
  const isOff = shown === "off";
  const { palette } = hvacPalette(shown);
  const ModeIcon = MODE_ICON[shown];
  const currentTemp = fmtClimateTemp(unit.currentTemp);
  const targetTemp = fmtClimateTemp(unit.targetTemp);
  const label =
    running?.label ?? HVAC_MODES.find((m) => m.key === mode)?.label ?? "Off";
  const target =
    (mode === "heat" || mode === "cool") && targetTemp != null
      ? targetTemp
      : null;
  const reading = currentTemp != null ? `${currentTemp}°` : "—";
  const status = target != null ? `${label} → ${target}°` : label;
  const spoken = target != null ? `${label} to ${target}°` : label;

  return (
    <Card.Root
      asChild
      size="sm"
      variant={isOff ? "outline" : "subtle"}
      cursor="pointer"
      focusVisibleRing="outside"
      _active={{ bg: "bg.emphasized" }}
    >
      <button
        type="button"
        aria-label={`${unit.name}: ${reading}, ${spoken}`}
        onClick={onTap}
      >
        <Card.Body p="3">
          <Stat.Root size="lg">
            {/* A narrow tile (a phone, or four across in landscape) wraps the
                name rather than cutting it off. */}
            <HStack justify="space-between" align="start" gap="2">
              <Stat.Label minW="0" lineClamp="2">
                {unit.name}
              </Stat.Label>
              <Icon color={isOff ? "fg.subtle" : `${palette}.fg`} boxSize="5">
                <ModeIcon />
              </Icon>
            </HStack>
            <HStack justify="space-between" gap="2" wrap="wrap">
              <Stat.ValueText
                lineHeight="1"
                color={isOff ? "fg.muted" : undefined}
              >
                {reading}
              </Stat.ValueText>
              <Badge
                colorPalette={palette}
                variant={running ? "solid" : "subtle"}
              >
                {status}
              </Badge>
            </HStack>
          </Stat.Root>
        </Card.Body>
      </button>
    </Card.Root>
  );
}

export function ClimateSection({ climate }: { climate: HomeClimate[] }) {
  const [open, setOpen] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const selectedUnit =
    climate.find((unit) => unit.entity_id === selectedEntityId) ?? null;

  return (
    <Board
      collapsible
      storageKey="climate"
      title={
        <SectionTitle icon={<IoThermometerOutline />}>Climate</SectionTitle>
      }
    >
      {/* Measure this card, not the viewport.
       *
       * A viewport breakpoint gets the frame wrong: Frame14 is 1600px wide, so
       * it clears Chakra's xl — but the card itself is only the 1.15fr cell of
       * the bento. The container query asks how wide this card actually is,
       * which is right on the frame, on a phone and in a wide desktop window
       * alike. See climateGridCss for the columns. */}
      <Box css={{ containerType: "inline-size" }} width="100%" minW="0">
        <Grid css={climateGridCss(climate.length)} width="100%">
          {climate.map((unit) => (
            <ClimateTile
              key={unit.entity_id || unit.name}
              unit={unit}
              onTap={() => {
                setSelectedEntityId(unit.entity_id);
                setOpen(true);
              }}
            />
          ))}
        </Grid>
      </Box>
      <ClimateDialog
        unit={selectedUnit}
        open={open}
        onClose={() => setOpen(false)}
      />
    </Board>
  );
}
