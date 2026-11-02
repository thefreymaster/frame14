import { TbVacuumCleaner } from "react-icons/tb";
import { Board } from "../components/Board";
import { PageHeader } from "../components/PageHeader";
import { PageShell } from "../components/PageShell";
import { VacuumPanel } from "../components/VacuumPanel";
import { EmptyState } from "../components/ui/empty-state";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { useVacuumMaps, type VacuumMap } from "../hooks/useVacuum";

// Stable empties while the config and the maps load (useEntities re-subscribes
// when an array changes identity).
const NO_VACUUMS: string[] = [];
const NO_MAPS: VacuumMap[] = [];

/** The robot vacuums: one VacuumPanel each. */
export function Vacuum() {
  const { data: config, isPending } = useEntitiesConfig();
  const ids = config?.vacuums ?? NO_VACUUMS;
  const maps = useVacuumMaps();

  return (
    <PageShell>
      <PageHeader icon={<TbVacuumCleaner />} title="Vacuum" />
      {!isPending && ids.length === 0 ? (
        <Board>
          <EmptyState
            icon={<TbVacuumCleaner />}
            title="No vacuum configured"
            description="Add one to vacuum_entities in the add-on's options."
          />
        </Board>
      ) : (
        ids.map((id) => (
          <VacuumPanel key={id} entityId={id} maps={maps.get(id) ?? NO_MAPS} />
        ))
      )}
    </PageShell>
  );
}
