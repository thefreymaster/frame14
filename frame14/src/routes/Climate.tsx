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
import { useDesktop } from "../hooks/useDesktop";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { useDeviceMode } from "../lib/deviceMode";
import { isClimateOn } from "../lib/hvac";

/**
 * The thermostats as the Home card shows them (ClimateTiles: a tile each,
 * two or four across as the width allows, a tap opening the thermostat
 * dialog) in one card under the header, which counts the units that are on
 * and carries All off. Since 0.110; a ClimatePanel each (the dial, mode and
 * fan speed open on the page, over today's temperature strip) before. Since
 * 0.120 the tiles are squares on a phone (controller mode: the user liked
 * 0.119's there) and otherwise — a desktop, and the frame since 0.124 — the
 * wide tiles at the `lg` size (larger type and padding, with a wider minimum
 * column: four across in a desktop window, 2x2 on the frame); the Home card
 * keeps the plain tile everywhere. Since 0.127 a desktop (useDesktop: the
 * user's Mac, not the Android frame) takes the `xl` size — the same tile
 * with the temperature a size larger.
 */
export function Climate() {
  const { data: config, isPending } = useEntitiesConfig();
  const { climate, loading } = useClimate();
  const square = useDeviceMode() === "controller";
  const desktop = useDesktop();
  const size = square ? "md" : desktop ? "xl" : "lg";

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
          {loading ? (
            <ClimateSkeleton size={size} square={square} />
          ) : (
            <ClimateTiles climate={climate} size={size} square={square} />
          )}
        </Board>
      )}
    </PageShell>
  );
}
