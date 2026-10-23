import { useEffect, useState } from "react";
import { Button } from "@chakra-ui/react";
import { IoPowerOutline } from "react-icons/io5";
import { callService } from "../lib/callService";

// Stop spinning if Home Assistant still reports a light on after this long.
const PENDING_MS = 10_000;

/**
 * The Lights page's header action: turns off every light and switch that's on.
 * The page shows it only while one is on, so it goes away once Home Assistant
 * reports them all off; until then it spins. The climate card's All off,
 * for lights.
 */
export function LightsAllOffButton({ entityIds }: { entityIds: string[] }) {
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
      aria-label="Turn off all lights"
      onClick={() => {
        for (const id of entityIds) callService(id, "turn_off");
        setPending(true);
      }}
    >
      <IoPowerOutline />
      All off
    </Button>
  );
}
