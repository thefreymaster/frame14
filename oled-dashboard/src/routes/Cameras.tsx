import { Grid, Text } from "@chakra-ui/react";
import { IoVideocamOutline } from "react-icons/io5";
import { Board } from "../components/Board";
import { CameraCard } from "../components/CameraCard";
import { PageHeader } from "../components/PageHeader";
import { PageShell } from "../components/PageShell";
import { PrinterCameraCard } from "../components/PrinterCameraCard";
import { VacuumMapPanel } from "../components/VacuumMapPanel";
import { EmptyState } from "../components/ui/empty-state";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { usePrinter } from "../hooks/usePrinter";
import { useVacuumMaps, type VacuumMap } from "../hooks/useVacuum";

// Stable empties while the config loads (useEntities re-subscribes when an
// array changes identity).
const NO_IDS: string[] = [];
const NO_MAPS: VacuumMap[] = [];

/** The cards: one across on a phone, two on the frame, more on a desktop. */
const COLUMNS = "repeat(auto-fill, minmax(min(100%, 24rem), 1fr))";

/**
 * Every picture of the house on one page: a CameraCard per configured camera
 * (`camera_entities`, or the doorbell's `camera_entity` with none), the 3D
 * printer's camera while it has one, and each vacuum's map. The header
 * counts the cameras.
 */
export function Cameras() {
  const { data: config, isPending } = useEntitiesConfig();
  const cameras =
    config?.cameras && config.cameras.length > 0
      ? config.cameras
      : config?.camera
        ? [config.camera]
        : NO_IDS;
  const printer = usePrinter();
  const vacuums = config?.vacuums ?? NO_IDS;
  const maps = useVacuumMaps();
  const anything = cameras.length > 0 || printer.hasCamera || vacuums.length > 0;

  return (
    <PageShell>
      <PageHeader
        icon={<IoVideocamOutline />}
        title="Cameras"
        actions={
          cameras.length > 0 && (
            <Text textStyle="sm" color="fg.muted">
              {cameras.length === 1 ? "1 camera" : `${cameras.length} cameras`}
            </Text>
          )
        }
      />

      {!isPending && !anything ? (
        <Board>
          <EmptyState
            icon={<IoVideocamOutline />}
            title="No cameras configured"
            description="Add camera_entities (or camera_entity) in the add-on's options."
          />
        </Board>
      ) : (
        <Grid templateColumns={COLUMNS} gap="gutter" alignItems="start">
          {cameras.map((id) => (
            <CameraCard key={id} entityId={id} />
          ))}
          {printer.configured && printer.hasCamera && (
            <PrinterCameraCard title="3D printer" />
          )}
          {vacuums.map((id) => (
            <VacuumMapPanel key={id} entityId={id} maps={maps.get(id) ?? NO_MAPS} />
          ))}
        </Grid>
      )}
    </PageShell>
  );
}
