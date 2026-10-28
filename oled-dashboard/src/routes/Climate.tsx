import { Text } from "@chakra-ui/react";
import { IoThermometerOutline } from "react-icons/io5";
import { Board } from "../components/Board";
import { ClimateAllOffButton } from "../components/ClimateAllOffButton";
import { ClimateTiles } from "../components/ClimateTiles";
import { PageHeader } from "../components/PageHeader";
import { PageShell } from "../components/PageShell";
import { ClimateSkeleton } from "../components/skeletons/ClimateSkeleton";
import { EmptyState } from "../components/ui/empty-state";
import { useClimate } from "../hooks/useClimate";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { isClimateOn } from "../lib/hvac";

/**
 * The thermostats as the Home card shows them (ClimateTiles: a tile each,
 * two or four across as the width allows, a tap opening the thermostat
 * dialog) in one card under the header, which counts the units that are on
 * and carries All off. Since 0.110; a ClimatePanel each (the dial, mode and
 * fan speed open on the page, over today's temperature strip) before.
 */
export function Climate() {
  const { data: config, isPending } = useEntitiesConfig();
  const { climate, loading } = useClimate();

  const configured = (config?.climate?.length ?? 0) > 0;
  const onIds = climate.filter(isClimateOn).map((unit) => unit.entity_id);

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
        // The "Climate" group is what the page is — labelling its card again
        // would just repeat the page header (as /lights).
        <Board>
          {loading ? <ClimateSkeleton /> : <ClimateTiles climate={climate} />}
        </Board>
      )}
    </PageShell>
  );
}
