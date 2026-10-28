import { IoThermometerOutline } from "react-icons/io5";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import type { HomeClimate } from "../hooks/useHomeData";
import { Board } from "./Board";
import { ClimateAllOffButton } from "./ClimateAllOffButton";
import { ClimateTiles } from "./ClimateTiles";
import { ClimateSkeleton } from "./skeletons/ClimateSkeleton";
import { isClimateOn } from "../lib/hvac";

/**
 * The Home page's Climate card: a Board holding the thermostats as tiles
 * (ClimateTiles, since 0.110 the tile and its dialog live there, shared with
 * /climate), with All off in its header while any unit is on.
 */
export function ClimateSection({
  climate,
  loading = false,
}: {
  climate: HomeClimate[];
  /** No thermostat has answered yet: placeholder tiles under the real header. */
  loading?: boolean;
}) {
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
      {loading ? <ClimateSkeleton /> : <ClimateTiles climate={climate} />}
    </Board>
  );
}
