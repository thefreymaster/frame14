import { useState } from "react";
import { Badge, Box, Card, Grid, HStack, Icon, Stat } from "@chakra-ui/react";
import { IoThermometerOutline } from "react-icons/io5";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import type { HomeClimate } from "../hooks/useHomeData";
import { Board } from "./Board";
import { ClimateAllOffButton } from "./ClimateAllOffButton";
import { ClimateDialog } from "./ClimateDialog";
import { ClimateSkeleton } from "./skeletons/ClimateSkeleton";
import {
  climateGridCss,
  climateStatus,
  fmtClimateTemp,
  hvacPalette,
  isClimateOn,
  MODE_ICON,
} from "../lib/hvac";

/**
 * One thermostat as a Stat tile: the name and a mode icon, then the room
 * temperature and what it's doing. A unit that's on gets the dialog's ring: a
 * 0.25rem border in its mode's colour (orange heat, blue cool, teal fan, from
 * hvacPalette, so the tile and the dial it opens match), with the icon and
 * status line in that colour. The status says whether it's running now
 * ("Heating to 70°", with the icon pulsing) or idle ("Heat · set 70°"). An off
 * unit is the plain outline card with a grey "Off" Badge. The whole tile is
 * the button that opens the dialog. Its corners are the Card recipe's
 * `surface`, the same as the climate card around it.
 */
function ClimateTile({
  unit,
  onTap,
}: {
  unit: HomeClimate;
  onTap: () => void;
}) {
  const { shown, on, running, status, spoken } = climateStatus(unit);
  const { accent, ring, palette } = hvacPalette(shown);
  const ModeIcon = MODE_ICON[shown];
  const currentTemp = fmtClimateTemp(unit.currentTemp);
  const reading = currentTemp != null ? `${currentTemp}°` : "—";

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
              <Icon
                color={on ? accent : "fg.subtle"}
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

export function ClimateSection({
  climate,
  loading = false,
}: {
  climate: HomeClimate[];
  /** No thermostat has answered yet: placeholder tiles under the real header. */
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const selectedUnit =
    climate.find((unit) => unit.entity_id === selectedEntityId) ?? null;
  const onIds = climate.filter(isClimateOn).map((unit) => unit.entity_id);

  return (
    <Board
      collapsible
      storageKey="climate"
      title={
        <SectionTitle icon={<IoThermometerOutline />}>Climate</SectionTitle>
      }
      action={
        onIds.length > 0 ? <ClimateAllOffButton entityIds={onIds} /> : null
      }
    >
      {/* Measure this card, not the viewport.
       *
       * A viewport breakpoint gets the frame wrong: Frame14 is 1600px wide, so
       * it clears Chakra's xl — but the card itself is only the 1.15fr cell of
       * the bento. The container query asks how wide this card actually is,
       * which is right on the frame, on a phone and in a wide desktop window
       * alike. See climateGridCss for the columns. */}
      {loading ? (
        <ClimateSkeleton />
      ) : (
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
      )}
      <ClimateDialog
        unit={selectedUnit}
        open={open}
        onClose={() => setOpen(false)}
      />
    </Board>
  );
}
