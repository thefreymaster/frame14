import { HStack } from "@chakra-ui/react";
import {
  TbWashMachine,
  TbWashTumbleDry,
  TbBowlSpoon,
  TbVacuumCleaner,
} from "react-icons/tb";
import type { IconType } from "react-icons";
import { useEntities, useEntity } from "../hooks/useEntity";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { useNow } from "../hooks/useNow";
import { fmtDuration, fmtWhen, toMinutes } from "../lib/format";
import { printerEntityIds } from "../lib/printerEntities";
import { printerStatus } from "../lib/printerStatus";
import { HeaderMenu } from "./HeaderMenu";
import { DataListItem, DataListRoot } from "./ui/data-list";

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

const APPLIANCES: { id: string; Icon: IconType; name: string }[] = [
  {
    id: "binary_sensor.cloths_washer_clothes_washer_running",
    Icon: TbWashMachine,
    name: "Washer",
  },
  {
    id: "binary_sensor.drier_dryer_running",
    Icon: TbWashTumbleDry,
    name: "Dryer",
  },
  {
    id: "binary_sensor.dishwasher_running",
    Icon: TbBowlSpoon,
    name: "Dishwasher",
  },
];

const PRINTER_ACTIVE_STATES = new Set(["running", "printing", "pause"]);
// The same states that give a vacuum its card on /home (VacuumSection).
const VACUUM_STATUS: Record<string, string> = {
  cleaning: "Cleaning",
  returning: "Returning to the dock",
};
const NO_VACUUMS: string[] = [];

/** "12m" for a run that started at `since` (an HA timestamp); "Just started"
 *  inside the first minute. */
function runningFor(since: string | undefined, now: number): string {
  if (!since) return "—";
  const minutes = (now - new Date(since).getTime()) / 60_000;
  if (!isFinite(minutes)) return "—";
  return minutes < 1 ? "Just started" : fmtDuration(minutes);
}

/**
 * The rows every appliance menu has: its status, how long it has been
 * running (the entity's `last_changed` is when it went into that state) and
 * since when. Ticks while on screen (the menu mounts only while open).
 */
function RunningRows({
  status,
  since,
  children,
}: {
  status: string;
  since: string | undefined;
  children?: React.ReactNode;
}) {
  const now = useNow();
  return (
    <DataListRoot orientation="horizontal" size="sm" gap="1.5">
      <DataListItem label="Status" value={status} />
      <DataListItem label="Running for" value={runningFor(since, now)} />
      <DataListItem
        label="Since"
        value={since ? fmtWhen(new Date(since)) : "—"}
      />
      {children}
    </DataListRoot>
  );
}

/** The printer's progress and time left, subscribed only while its menu is
 *  open. */
function PrinterRows({ statusId }: { statusId: string }) {
  const ids = printerEntityIds(statusId);
  const progress = useEntity(ids.progress).data;
  const remaining = useEntity(ids.remainingTime).data;
  const pct = Number(progress?.state);
  const minutes = toMinutes(
    remaining ? Number(remaining.state) : null,
    remaining?.attributes?.unit_of_measurement as string | undefined,
  );
  return (
    <>
      <DataListItem
        label="Progress"
        value={isFinite(pct) ? `${Math.round(pct)}%` : "—"}
      />
      <DataListItem label="Time left" value={fmtDuration(minutes)} />
    </>
  );
}

/**
 * The header's running appliances, in green: the washer, dryer and
 * dishwasher, the 3D printer while it prints (or is paused mid-print) and
 * each vacuum while it cleans or heads back to its dock. Idle, they show
 * nothing. A tap on one opens a small menu (HeaderMenu) with its status and
 * how long it has been running; the printer's adds its progress and time
 * left.
 */
export function ApplianceIndicators() {
  const queries = useEntities(APPLIANCES.map((a) => a.id));
  const running = APPLIANCES.map((appliance, i) => ({
    ...appliance,
    since: queries[i].data?.last_changed,
    on: queries[i].data?.state === "on",
  })).filter((a) => a.on);
  const entitiesQuery = useEntitiesConfig();
  const printerStatusId = printerEntityIds(entitiesQuery.data?.printer).status;
  const printer = useEntity(printerStatusId);
  const printerState = printer.data?.state?.toLowerCase() ?? "";
  const printerActive = PRINTER_ACTIVE_STATES.has(printerState);
  const vacuumIds = entitiesQuery.data?.vacuums ?? NO_VACUUMS;
  const vacuumQueries = useEntities(vacuumIds);
  const vacuums = vacuumIds
    .map((id, i) => ({
      id,
      name:
        (vacuumQueries[i]?.data?.attributes?.friendly_name as
          | string
          | undefined) ?? "Vacuum",
      status: VACUUM_STATUS[vacuumQueries[i]?.data?.state ?? ""],
      since: vacuumQueries[i]?.data?.last_changed,
    }))
    .filter((v) => v.status);

  if (running.length === 0 && !printerActive && vacuums.length === 0)
    return null;

  return (
    <HStack gap="3" align="center">
      {running.map(({ id, Icon: ApplianceIcon, name, since }) => (
        <HeaderMenu
          key={id}
          icon={<ApplianceIcon />}
          label={`${name} running`}
          title={name}
          color="fg.success"
        >
          <RunningRows status="Running" since={since} />
        </HeaderMenu>
      ))}
      {printerActive && (
        <HeaderMenu
          icon={<PrinterNozzleIcon />}
          label="3D printer running"
          title="3D printer"
          color="fg.success"
        >
          <RunningRows
            status={printerStatus(printerState).label}
            since={printer.data?.last_changed}
          >
            <PrinterRows statusId={printerStatusId} />
          </RunningRows>
        </HeaderMenu>
      )}
      {vacuums.map(({ id, name, status, since }) => (
        <HeaderMenu
          key={id}
          icon={<TbVacuumCleaner />}
          label={`${name} ${status.toLowerCase()}`}
          title={name}
          color="fg.success"
        >
          <RunningRows status={status} since={since} />
        </HeaderMenu>
      ))}
    </HStack>
  );
}
