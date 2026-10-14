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
 * temperature and what it's doing. A unit that's on fills the whole tile with
 * its mode's solid colour (orange heat, blue cool, teal fan) and every word on
 * it takes the palette's contrast colour; the status line says whether it's
 * running now ("Heating to 70°", with the icon pulsing) or idle ("Heat · set
 * 70°"). An off unit is the plain outline card with a grey "Off" Badge. The
 * whole tile is the button that opens the dialog.
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
  const on = shown !== "off";
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
  const status =
    target == null
      ? label
      : running
        ? `${label} to ${target}°`
        : `${label} · set ${target}°`;
  const spoken =
    target == null
      ? label
      : running
        ? `${label} to ${target}°`
        : `${label}, set to ${target}°`;

  return (
    <Card.Root
      asChild
      size="sm"
      variant={on ? "subtle" : "outline"}
      colorPalette={palette}
      bg={on ? "colorPalette.solid" : undefined}
      color={on ? "colorPalette.contrast" : undefined}
      borderRadius="sm"
      cursor="pointer"
      focusVisibleRing="outside"
      _active={{ bg: on ? "colorPalette.solid/80" : "bg.emphasized" }}
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
              <Stat.Label
                minW="0"
                lineClamp="2"
                color={on ? "inherit" : undefined}
              >
                {unit.name}
              </Stat.Label>
              <Icon
                color={on ? "inherit" : "fg.subtle"}
                boxSize="5"
                animation={
                  running ? "pulse 2s ease-in-out infinite" : undefined
                }
              >
                <ModeIcon />
              </Icon>
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
                  color="inherit"
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
