import { useMemo } from "react";
import { Box, Grid, Text } from "@chakra-ui/react";
import { IoThermometerOutline } from "react-icons/io5";
import { Board } from "../components/Board";
import { ClimateAllOffButton } from "../components/ClimateAllOffButton";
import { ClimatePanel } from "../components/ClimatePanel";
import { PageHeader } from "../components/PageHeader";
import { PageShell } from "../components/PageShell";
import { EmptyState } from "../components/ui/empty-state";
import { useClimate } from "../hooks/useClimate";
import { useClimateHistory } from "../hooks/useClimateHistory";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { climateColumnsCss, isClimateOn } from "../lib/hvac";

/** Narrowest a thermostat's card gets: the dial plus the card's padding. */
const PANEL_MIN_REM = 20;
/** The page's `gutter` between cards, for the column maths. */
const PANEL_GAP_REM = 1;

/** Local midnight today and tomorrow, until the history says otherwise. */
function todaySpan() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
}

/**
 * The thermostats: a ClimatePanel each, as many across as fit (one, two, or
 * all of them — never a row with one left over, as the Home card's tiles).
 * The header counts the units that are on and carries All off.
 */
export function Climate() {
  const { data: config, isPending } = useEntitiesConfig();
  const { climate } = useClimate();
  const historyQuery = useClimateHistory();
  const fallbackSpan = useMemo(() => todaySpan(), []);

  const configured = (config?.climate?.length ?? 0) > 0;
  const onIds = climate.filter(isClimateOn).map((unit) => unit.entity_id);

  const history = historyQuery.data;
  const span = history
    ? { start: Date.parse(history.start), end: Date.parse(history.end) }
    : fallbackSpan;
  const pointsById = new Map(
    history?.units.map((unit) => [unit.entity_id, unit.points]) ?? [],
  );

  return (
    <PageShell>
      <PageHeader
        icon={<IoThermometerOutline />}
        title="Climate"
        actions={
          onIds.length > 0 && (
            <>
              <Text textStyle="sm" color="fg.muted">
                {onIds.length} on
              </Text>
              <ClimateAllOffButton entityIds={onIds} />
            </>
          )
        }
      />

      {!isPending && !configured ? (
        <Board>
          <EmptyState
            icon={<IoThermometerOutline />}
            title="No thermostat configured"
            description="Add one to climate_entities in the add-on's options."
          />
        </Board>
      ) : (
        // Measured against the page, not the viewport (see ClimateSection).
        <Box css={{ containerType: "inline-size" }} width="100%" minW="0">
          <Grid
            css={climateColumnsCss(climate.length, PANEL_MIN_REM, PANEL_GAP_REM)}
            gap="gutter"
            alignItems="start"
            width="100%"
          >
            {climate.map((unit) => (
              <ClimatePanel
                key={unit.entity_id}
                unit={unit}
                history={{
                  points: pointsById.get(unit.entity_id) ?? [],
                  start: span.start,
                  end: span.end,
                }}
              />
            ))}
          </Grid>
        </Box>
      )}
    </PageShell>
  );
}
