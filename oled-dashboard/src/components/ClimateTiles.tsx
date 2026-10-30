import { useState } from "react";
import { Badge, Box, Card, Grid, HStack, Icon, Stat } from "@chakra-ui/react";
import type { HomeClimate } from "../hooks/useHomeData";
import { ClimateDialog } from "./ClimateDialog";
import {
  climateGridCss,
  climateStatus,
  fmtClimateTemp,
  hvacPalette,
  MODE_ICON,
  TILE_MIN_LG_REM,
} from "../lib/hvac";

/**
 * How big a tile's type is: `lg` is /climate on the frame (0.120, a desktop's
 * then), `xl` /climate on a desktop (0.127): the lg tile with the reading a
 * size larger, 7xl.
 */
export type ClimateTileSize = "md" | "lg" | "xl";

/**
 * One thermostat as a Stat tile: the name and a mode icon, then the room
 * temperature and what it's doing. `square` (0.120, /climate on a phone: the
 * user liked 0.119's squares there) makes it a square with the name row
 * along the top and the reading along the bottom, the middle open; `size`
 * lg (/climate on a desktop) is the same tile with larger type and more
 * padding, so a row of four fills its card. A unit that's on gets the dialog's ring: a
 * 0.25rem border in its mode's colour (orange heat, blue cool, teal fan, from
 * hvacPalette, so the tile and the dial it opens match), with the icon and
 * status line in that colour. The status says whether it's running now
 * ("Heating to 70°", with the icon pulsing) or idle ("Heat · set 70°"). An off
 * unit is the plain outline card with a grey "Off" Badge. The whole tile is
 * the button that opens the dialog. Its corners are the Card recipe's
 * `surface`, the same as the climate card around it.
 */
export function ClimateTile({
  unit,
  onTap,
  size = "md",
  square = false,
}: {
  unit: HomeClimate;
  onTap: () => void;
  size?: ClimateTileSize;
  square?: boolean;
}) {
  const lg = size !== "md";
  const xl = size === "xl";
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
      aspectRatio={square ? "1" : undefined}
    >
      <button
        type="button"
        aria-label={`${unit.name}: ${reading}, ${spoken}`}
        onClick={onTap}
      >
        <Card.Body p={lg ? "5" : "3"}>
          {/* The body is a flex column filling the card, so a square tile
              can push its reading to the bottom. */}
          <Stat.Root
            size="lg"
            flex="1"
            justifyContent={square ? "space-between" : undefined}
          >
            {/* A narrow tile (a phone, or four across in landscape) wraps the
                name rather than cutting it off. */}
            <HStack justify="space-between" align="start" gap="2">
              <Stat.Label
                minW="0"
                lineClamp="2"
                textStyle={lg ? "lg" : undefined}
              >
                {unit.name}
              </Stat.Label>
              <Icon
                color={on ? accent : "fg.subtle"}
                boxSize={lg ? "7" : "5"}
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
                textStyle={xl ? "7xl" : lg ? "6xl" : undefined}
                color={on ? undefined : "fg.muted"}
              >
                {reading}
              </Stat.ValueText>
              {on ? (
                <Stat.HelpText
                  color={accent}
                  textStyle={lg ? "md" : "xs"}
                  fontWeight="semibold"
                >
                  {status}
                </Stat.HelpText>
              ) : (
                <Badge colorPalette="gray" size={lg ? "lg" : undefined}>
                  {status}
                </Badge>
              )}
            </HStack>
          </Stat.Root>
        </Card.Body>
      </button>
    </Card.Root>
  );
}

/**
 * The thermostats as tiles, as many across as the width allows, each opening
 * ClimateDialog: the Home card's body, and /climate's since 0.110 (it laid
 * out a ClimatePanel each before), which passes the tile's `size` and
 * `square` (0.120: squares on a phone, lg type on a desktop; the Home card
 * and the frame take the plain tile). Measured against the card it is in, not
 * the viewport: a viewport breakpoint gets the frame wrong — Frame14 is
 * 1600px wide, so it clears Chakra's xl, but the Home card is only the 1.15fr
 * cell of the bento. The container query asks how wide the card actually is,
 * which is right on the frame, on a phone and in a wide desktop window alike.
 * See climateGridCss for the columns.
 */
export function ClimateTiles({
  climate,
  size,
  square,
}: {
  climate: HomeClimate[];
  size?: ClimateTileSize;
  square?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const selectedUnit =
    climate.find((unit) => unit.entity_id === selectedEntityId) ?? null;

  return (
    <>
      <Box css={{ containerType: "inline-size" }} width="100%" minW="0">
        <Grid
          css={climateGridCss(
            climate.length,
            size && size !== "md" ? TILE_MIN_LG_REM : undefined,
          )}
          width="100%"
        >
          {climate.map((unit) => (
            <ClimateTile
              key={unit.entity_id || unit.name}
              unit={unit}
              size={size}
              square={square}
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
    </>
  );
}
