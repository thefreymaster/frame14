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
    ? "Off"
    : showTarget
      ? `→ ${targetTemp}°`
      : displayMode === "fan_only" || displayMode === "fan"
        ? "Fan"
        : "";

  return (
    <VStack gap="2" align="center">
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
      >
        <VStack gap="1" align="center">
          <Icon color={accent} boxSize="5" opacity={isOff ? 0.5 : 1}>
            <ModeIcon />
          </Icon>
          <Text textStyle="4xl" fontWeight="light" lineHeight="1">
            {currentTemp != null ? `${currentTemp}°` : "—"}
          </Text>
          <Text textStyle="xs" fontWeight="semibold" color={accent} minH="1lh">
            {subLabel}
          </Text>
        </VStack>
      </ThermostatDial>
      <Text
        textStyle="sm"
        color="fg.muted"
        textAlign="center"
        truncate
        maxW="100%"
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
        <SectionTitle icon={<IoThermometerOutline />}>Climate</SectionTitle>
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
          templateColumns="repeat(auto-fill, minmax(9rem, 1fr))"
          css={{
            [`@container (min-width: ${SINGLE_ROW_MIN_PX}px)`]: {
              gridTemplateColumns: `repeat(${climate.length}, minmax(0, 1fr))`,
            },
          }}
          gap="4"
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
