import { keyframes } from "@emotion/react";
import { Box, Center, Grid, Icon, Text } from "@chakra-ui/react";
import { IoFlash, IoHome } from "react-icons/io5";
import { PiSolarRoof } from "react-icons/pi";
import type { HomeEnergy } from "../hooks/useHomeData";
import {
  ENERGY_COLORS,
  ENERGY_VARS,
  GRID_ACTIVE_THRESHOLD,
  fmtW,
  grid,
} from "../lib/energy";

/** One dot spacing, so a loop of the animation looks continuous. */
const DOT_PITCH = 12;

const flowRight = keyframes`
  from { background-position-x: 0; }
  to { background-position-x: ${DOT_PITCH}px; }
`;
const flowLeft = keyframes`
  from { background-position-x: ${DOT_PITCH}px; }
  to { background-position-x: 0; }
`;

/**
 * Where the power is going now, as the house wires it: the panels feed the
 * house, and what it doesn't use goes out through the meter, or the grid
 * makes up what the panels can't. Solar → Home → Grid when exporting,
 * Solar → Home ← Grid when importing. A line with power on it carries dots
 * moving the way it flows, in the flow's colour; an idle line is a hairline.
 */
export function PowerFlow({ energy }: { energy: HomeEnergy }) {
  const { abs, exporting, active } = grid(energy);
  const producing = energy.currentProduction > GRID_ACTIVE_THRESHOLD;
  const gridColor = !active ? null : exporting ? "export" : "import";

  return (
    <Grid
      templateColumns="auto minmax(1rem, 1fr) auto minmax(1rem, 1fr) auto"
      columnGap={{ base: "1.5", md: "3" }}
      rowGap="1"
      alignItems="center"
      justifyItems="center"
    >
      <Node icon={<PiSolarRoof />} color={producing ? "solar" : null} />
      <Wire color={producing ? "solar" : null} direction="right" />
      <Node icon={<IoHome />} color="home" />
      <Wire color={gridColor} direction={exporting ? "right" : "left"} />
      <Node icon={<IoFlash />} color={gridColor} />

      <Value>{fmtW(energy.currentProduction)}</Value>
      <span />
      <Value>{fmtW(energy.currentConsumption)}</Value>
      <span />
      <Value>{active ? fmtW(abs) : "—"}</Value>

      <Label>Solar</Label>
      <span />
      <Label>Home</Label>
      <span />
      <Label>
        {active ? (exporting ? "To grid" : "From grid") : "Grid idle"}
      </Label>
    </Grid>
  );
}

type Flow = keyof typeof ENERGY_COLORS;

function Node({ icon, color }: { icon: React.ReactNode; color: Flow | null }) {
  const c = color ? ENERGY_COLORS[color] : "border";
  return (
    <Center
      boxSize="14"
      rounded="full"
      borderWidth="2px"
      borderColor={c}
      bg={color ? `${c}/12` : undefined}
    >
      <Icon boxSize="6" color={color ? c : "fg.subtle"}>
        {icon}
      </Icon>
    </Center>
  );
}

function Wire({
  color,
  direction,
}: {
  color: Flow | null;
  direction: "left" | "right";
}) {
  if (!color) {
    return (
      <Box
        alignSelf="center"
        width="100%"
        height="1px"
        bg="border"
        aria-hidden
      />
    );
  }
  return (
    <Box
      width="100%"
      height="1.5"
      aria-hidden
      backgroundImage={`radial-gradient(circle, ${ENERGY_VARS[color]} 0 2.5px, transparent 3px)`}
      backgroundSize={`${DOT_PITCH}px 100%`}
      backgroundRepeat="repeat-x"
      animation={`${direction === "right" ? flowRight : flowLeft} 0.6s linear infinite`}
      _motionReduce={{ animation: "none" }}
    />
  );
}

function Value({ children }: { children: React.ReactNode }) {
  return (
    <Text
      textStyle={{ base: "lg", md: "xl" }}
      fontWeight="semibold"
      whiteSpace="nowrap"
      mt="2"
    >
      {children}
    </Text>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text textStyle="sm" color="fg.muted" whiteSpace="nowrap">
      {children}
    </Text>
  );
}
