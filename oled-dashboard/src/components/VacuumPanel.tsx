import { Grid, GridItem } from "@chakra-ui/react";
import { useVacuum, type VacuumMap } from "../hooks/useVacuum";
import { VacuumCareCard } from "./VacuumCareCard";
import { VacuumMapCard } from "./VacuumMapCard";
import { VacuumStatusCard } from "./VacuumStatusCard";

/**
 * One vacuum's cards on /vacuum: its state and controls, its map and its
 * wear parts. Stacked in portrait; in landscape the map takes the left and
 * the other two stack beside it.
 */
export function VacuumPanel({
  entityId,
  maps,
}: {
  entityId: string;
  maps: VacuumMap[];
}) {
  const vacuum = useVacuum(entityId, maps);
  const hasMap = vacuum.maps.length > 0;

  return (
    <Grid
      templateColumns={{
        base: "minmax(0, 1fr)",
        _landscape: "minmax(0, 3fr) minmax(0, 2fr)",
      }}
      templateAreas={{
        base: `"status" "map" "care"`,
        _landscape: hasMap ? `"map status" "map care"` : `"status care"`,
      }}
      templateRows={{ _landscape: hasMap ? "auto 1fr" : "auto" }}
      gap="gutter"
      alignItems="start"
    >
      <GridItem area="status" minW="0">
        <VacuumStatusCard vacuum={vacuum} />
      </GridItem>
      {hasMap && (
        <GridItem area="map" minW="0">
          <VacuumMapCard vacuum={vacuum} />
        </GridItem>
      )}
      <GridItem area="care" minW="0">
        <VacuumCareCard vacuum={vacuum} />
      </GridItem>
    </Grid>
  );
}
