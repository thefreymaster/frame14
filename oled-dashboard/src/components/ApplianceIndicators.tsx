import { HStack, Icon } from "@chakra-ui/react";
import { Tooltip } from "./ui/tooltip";
import {
  TbWashMachine,
  TbWashTumbleDry,
  TbBowlSpoon,
  TbVacuumCleaner,
} from "react-icons/tb";
import type { IconType } from "react-icons";
import { useEntities, useEntity } from "../hooks/useEntity";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { printerEntityIds } from "../lib/printerEntities";
import { HEADER_ICON_SIZE } from "../lib/navMetrics";

function PrinterNozzleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <rect x="9" y="2" width="6" height="3" rx="0.5" />
      <path d="M5 6h14v4l-5 6h-4l-5-6z" />
      <path d="M11 16h2v3l-1 1-1-1z" />
      <path d="M3 20h2v2H3zm16 0h2v2h-2zM3 20h18v1.2H3z" />
    </svg>
  );
}

const APPLIANCES: { id: string; Icon: IconType; label: string }[] = [
  {
    id: "binary_sensor.cloths_washer_clothes_washer_running",
    Icon: TbWashMachine,
    label: "washer",
  },
  {
    id: "binary_sensor.drier_dryer_running",
    Icon: TbWashTumbleDry,
    label: "dryer",
  },
  {
    id: "binary_sensor.dishwasher_running",
    Icon: TbBowlSpoon,
    label: "dishwasher",
  },
];

const PRINTER_ACTIVE_STATES = new Set(["running", "printing", "pause"]);
// The same states that give a vacuum its card on /home (VacuumSection).
const VACUUM_LABELS: Record<string, string> = {
  cleaning: "Vacuum cleaning",
  returning: "Vacuum returning to the dock",
};
const NO_VACUUMS: string[] = [];

/**
 * The header's running appliances, in green: the washer, dryer and
 * dishwasher, the 3D printer while it prints (or is paused mid-print) and
 * each vacuum while it cleans or heads back to its dock. Idle, they show
 * nothing.
 */
export function ApplianceIndicators() {
  const queries = useEntities(APPLIANCES.map((a) => a.id));
  const running = APPLIANCES.filter((_, i) => queries[i].data?.state === "on");
  const entitiesQuery = useEntitiesConfig();
  const printer = useEntity(
    printerEntityIds(entitiesQuery.data?.printer).status,
  );
  const printerActive = PRINTER_ACTIVE_STATES.has(
    printer.data?.state?.toLowerCase() ?? "",
  );
  const vacuumIds = entitiesQuery.data?.vacuums ?? NO_VACUUMS;
  const vacuumQueries = useEntities(vacuumIds);
  const vacuums = vacuumIds
    .map((id, i) => ({
      id,
      label: VACUUM_LABELS[vacuumQueries[i]?.data?.state ?? ""],
    }))
    .filter((v) => v.label);

  if (running.length === 0 && !printerActive && vacuums.length === 0)
    return null;

  return (
    <HStack gap="3" align="center">
      {running.map(({ id, Icon: ApplianceIcon, label }) => (
        <Tooltip
          key={id}
          content={`${label[0].toUpperCase()}${label.slice(1)} running`}
        >
          <Icon
            boxSize={HEADER_ICON_SIZE}
            color="fg.success"
            aria-label={`${label} running`}
          >
            <ApplianceIcon />
          </Icon>
        </Tooltip>
      ))}
      {printerActive && (
        <Tooltip content="3D printer running">
          <Icon
            boxSize={HEADER_ICON_SIZE}
            color="fg.success"
            aria-label="3d printer running"
          >
            <PrinterNozzleIcon />
          </Icon>
        </Tooltip>
      )}
      {vacuums.map(({ id, label }) => (
        <Tooltip key={id} content={label}>
          <Icon
            boxSize={HEADER_ICON_SIZE}
            color="fg.success"
            aria-label={label}
          >
            <TbVacuumCleaner />
          </Icon>
        </Tooltip>
      ))}
    </HStack>
  );
}
