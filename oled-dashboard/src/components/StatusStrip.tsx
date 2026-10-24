import { Flex, Tag } from "@chakra-ui/react";
import { Printer3dOutlineIcon } from "../lib/printerIcons";
import { TbVacuumCleaner } from "react-icons/tb";
import type { HomePrinter, HomeVacuum } from "../hooks/useHomeData";
import { StatusChip } from "./StatusChip";
import { StatusStripSkeleton } from "./skeletons/StatusStripSkeleton";

const PRINTER_ACTIVE = new Set(["running", "printing", "pause"]);
const VACUUM_ACTIVE = new Set(["cleaning", "returning"]);
// A device we can't reach isn't a status worth a chip.
const UNREACHABLE = new Set(["unavailable", "unknown", "none", ""]);

const VACUUM_IDLE_LABEL: Record<string, string> = {
  docked: "Vacuum docked",
  charging: "Vacuum charging",
  idle: "Vacuum idle",
  paused: "Vacuum paused",
  error: "Vacuum error",
};

function ChipText({ children }: { children: React.ReactNode }) {
  return <Tag.Label whiteSpace="nowrap">{children}</Tag.Label>;
}

/**
 * One wrapping row of chips for everything that is idle or ambient.
 *
 * A section that has nothing to report shouldn't spend a full-width band on
 * saying so — it reports as a chip here instead, and takes its tile back only
 * when it becomes active (PrinterSection / VacuumSection render on their own
 * when that happens).
 */
export function StatusStrip({
  printer,
  vacuum,
  loading = false,
}: {
  printer: HomePrinter;
  vacuum: HomeVacuum[];
  /** The vacuums haven't answered yet: placeholder chips. */
  loading?: boolean;
}) {
  if (loading) return <StatusStripSkeleton />;

  const printerStatus = printer.status?.trim().toLowerCase() ?? "";
  // The printer keeps its own tile while active, and says nothing at all when
  // it can't be reached — the chip is only for "here, idle".
  const showPrinterChip =
    !PRINTER_ACTIVE.has(printerStatus) && !UNREACHABLE.has(printerStatus);
  const idleVacuums = vacuum.filter((v) => {
    const state = v.state?.trim().toLowerCase() ?? "";
    return !VACUUM_ACTIVE.has(state) && !UNREACHABLE.has(state);
  });

  return (
    <Flex width="100%" minW="0" gap="2" wrap="wrap" align="center">
      {showPrinterChip && (
        <StatusChip icon={<Printer3dOutlineIcon />}>
          <ChipText>Printer idle</ChipText>
        </StatusChip>
      )}

      {idleVacuums.map((v) => (
        <StatusChip key={v.entity_id} icon={<TbVacuumCleaner />}>
          <ChipText>
            {VACUUM_IDLE_LABEL[v.state] ?? `Vacuum ${v.state}`}
          </ChipText>
        </StatusChip>
      ))}
    </Flex>
  );
}
