import { useVacuum, type VacuumMap } from "../hooks/useVacuum";
import { VacuumMapCard } from "./VacuumMapCard";

/**
 * One vacuum's map on /cameras: the live vacuum model (useVacuum) handed to
 * VacuumMapCard, which renders nothing for a vacuum without a map. A
 * component of its own because each vacuum needs its own hook call.
 */
export function VacuumMapPanel({
  entityId,
  maps,
}: {
  entityId: string;
  maps: VacuumMap[];
}) {
  const vacuum = useVacuum(entityId, maps);
  return <VacuumMapCard vacuum={vacuum} title={vacuum.name} />;
}
