import { useEffect, useState } from "react";
import { Button } from "@chakra-ui/react";
import { IoPowerOutline } from "react-icons/io5";
import { callClimateService } from "../lib/callService";

// Stop spinning if Home Assistant still reports a unit on after this long.
const PENDING_MS = 10_000;

/**
 * The climate card's header action: sets every thermostat that's on to off.
 * The card shows it only while one is on, so it goes away once Home Assistant
 * reports them all off; until then it spins.
 */
export function ClimateAllOffButton({ entityIds }: { entityIds: string[] }) {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setPending(false), PENDING_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  return (
    <Button
      size="xs"
      variant="outline"
      // Taller than the title row; don't let it grow the header.
      my="-1"
      loading={pending}
      aria-label="Turn off all thermostats"
      onClick={() => {
        for (const id of entityIds) {
          callClimateService(id, "set_hvac_mode", { hvac_mode: "off" });
        }
        setPending(true);
      }}
    >
      <IoPowerOutline />
      All off
    </Button>
  );
}
