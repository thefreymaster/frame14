import { HStack, Box } from "@chakra-ui/react";
import {
  TbWashMachine,
  TbWashTumbleDry,
  TbBowlSpoon,
} from "react-icons/tb";
import type { IconType } from "react-icons";
import { useEntities, useEntity } from "../hooks/useEntity";

function PrinterNozzleIcon() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
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

const PRINTER_STATUS_ID = "sensor.a1_03919c442700723_print_status";
const PRINTER_ACTIVE_STATES = new Set(["running", "printing", "pause"]);

export function ApplianceIndicators() {
  const queries = useEntities(APPLIANCES.map((a) => a.id));
  const running = APPLIANCES.filter((_, i) => queries[i].data?.state === "on");
  const printer = useEntity(PRINTER_STATUS_ID);
  const printerActive = PRINTER_ACTIVE_STATES.has(printer.data?.state ?? "");

  if (running.length === 0 && !printerActive) return null;

  return (
    <HStack gap="6px" align="center">
      {running.map(({ id, Icon, label }) => (
        <Box
          key={id}
          fontSize="10px"
          color="#22c55e"
          lineHeight="1"
          aria-label={`${label} running`}
        >
          <Icon />
        </Box>
      ))}
      {printerActive && (
        <Box
          fontSize="10px"
          color="#22c55e"
          lineHeight="1"
          aria-label="3d printer running"
        >
          <PrinterNozzleIcon />
        </Box>
      )}
    </HStack>
  );
}
