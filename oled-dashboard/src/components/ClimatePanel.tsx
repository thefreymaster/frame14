import { Badge, VStack } from "@chakra-ui/react";
import type { ClimateHistoryPoint } from "../hooks/useClimateHistory";
import type { HomeClimate } from "../hooks/useHomeData";
import { climateStatus, hvacPalette, MODE_ICON } from "../lib/hvac";
import { Board } from "./Board";
import { ClimateControls } from "./ClimateControls";
import { ClimateHistoryChart } from "./ClimateHistoryChart";
import { SectionTitle } from "./SectionTitle/SectionTitle";

export interface ClimateDayHistory {
  points: ClimateHistoryPoint[];
  /** Local midnight today and tomorrow, ms. */
  start: number;
  end: number;
}

/**
 * One thermostat's card on /climate: its name under its mode's icon and its
 * status as a Badge in the header ("Heating to 70°" solid in the mode's
 * colour while it runs, "Cool · set 70°" subtle while idle, a grey "Off");
 * then ClimateControls (the dialog's dial, mode and fan speed; the room's
 * humidity rides under the dial's reading) over today's temperature strip.
 */
export function ClimatePanel({
  unit,
  history,
}: {
  unit: HomeClimate;
  history: ClimateDayHistory;
}) {
  const { mode, shown, on, running, status } = climateStatus(unit);
  const { accent, palette } = hvacPalette(shown);
  const ModeIcon = MODE_ICON[shown];
  const liveAction =
    unit.hvacAction === "heating" || unit.hvacAction === "cooling"
      ? unit.hvacAction
      : null;

  return (
    <Board
      title={
        <SectionTitle icon={<ModeIcon />} iconColor={on ? accent : undefined}>
          {unit.name}
        </SectionTitle>
      }
      action={
        <Badge
          colorPalette={on ? palette : "gray"}
          variant={running ? "solid" : "subtle"}
        >
          {status}
        </Badge>
      }
    >
      <VStack gap="6" align="stretch">
        <ClimateControls key={unit.entity_id} unit={unit} />
        <ClimateHistoryChart
          points={history.points}
          start={history.start}
          end={history.end}
          live={{
            temp: unit.currentTemp,
            target:
              mode === "heat" || mode === "cool" ? unit.targetTemp : null,
            action: liveAction,
          }}
          height={{ base: "5rem", md: "6rem" }}
        />
      </VStack>
    </Board>
  );
}
