import { useState } from "react";
import { Box, Grid, Icon, Text, VStack } from "@chakra-ui/react";
import {
  IoFlame,
  IoPowerOutline,
  IoSnow,
  IoThermometerOutline,
} from "react-icons/io5";
import { MdAir } from "react-icons/md";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import type { HomeClimate } from "../hooks/useHomeData";
import { Board } from "./Board";
import { ClimateDialog } from "./ClimateDialog";
import { ThermostatDial } from "./ThermostatDial";
import {
  fmtClimateTemp,
  hvacPalette,
  normalizeClimateMode,
  SINGLE_ROW_MIN_PX,
} from "../lib/hvac";

function ClimateCard({
  unit,
  onTap,
}: {
  unit: HomeClimate;
  onTap: () => void;
}) {
  const displayMode = unit.hvacMode ?? unit.state;
  const activeAction =
    unit.hvacAction === "heating"
      ? "heating"
      : unit.hvacAction === "cooling"
        ? "cooling"
        : null;
  const { accent, ring } = hvacPalette(
    activeAction ?? displayMode ?? "unknown",
  );
  const isOff = normalizeClimateMode(displayMode) === "off";
  const currentTemp = fmtClimateTemp(unit.currentTemp);
  const targetTemp = fmtClimateTemp(unit.targetTemp);
  const showTarget = !isOff && targetTemp != null;
  const ModeIcon =
    activeAction === "heating" || displayMode === "heat"
      ? IoFlame
      : activeAction === "cooling" || displayMode === "cool"
        ? IoSnow
        : displayMode === "fan_only" || displayMode === "fan"
          ? MdAir
          : IoPowerOutline;
  const subLabel = isOff
    ? "OFF"
    : showTarget
      ? `→ ${targetTemp}°`
      : displayMode === "fan_only" || displayMode === "fan"
        ? "FAN"
        : "";

  return (
    <VStack gap="1vmin" align="center">
      <ThermostatDial
        as="button"
        aria-label={`${unit.name} thermostat`}
        onClick={onTap}
        width="100%"
        cursor="pointer"
        borderRadius="full"
        ring={ring}
        accent={accent}
        live={activeAction != null}
        target={showTarget ? targetTemp : null}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <VStack gap="0.4vmin" align="center" justify="center">
          <Icon color={accent} boxSize="2.6vmin" opacity={isOff ? 0.45 : 1}>
            <ModeIcon />
          </Icon>
          <Text
            fontFamily="display"
            fontSize="6.6vmin"
            fontWeight="200"
            lineHeight="1"
            color="fg"
            letterSpacing="-0.04em"
          >
            {currentTemp != null ? `${currentTemp}°` : "—"}
          </Text>
          <Text
            fontSize="1.5vmin"
            color={accent}
            fontWeight="600"
            letterSpacing="0.18em"
            textTransform="uppercase"
            opacity={isOff ? 0.55 : 0.95}
            minHeight="1.6vmin"
          >
            {subLabel}
          </Text>
        </VStack>
      </ThermostatDial>
      <Text
        fontSize="1.8vmin"
        color="fg.faint"
        fontWeight="500"
        textAlign="center"
        truncate
        maxWidth="100%"
        lineHeight="1.1"
      >
        {unit.name}
      </Text>
    </VStack>
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
        <Grid
          templateColumns="repeat(auto-fill, minmax(20vmin, 1fr))"
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
