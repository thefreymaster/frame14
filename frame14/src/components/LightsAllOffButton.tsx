import { useEffect, useState } from "react";
import { Button } from "@chakra-ui/react";
import { IoPowerOutline } from "react-icons/io5";
import { callService } from "../lib/callService";

// Stop spinning if Home Assistant still reports a light on after this long.
const PENDING_MS = 10_000;

// Lights All off leaves on (0.125): the kid's hatch light is a night light,
// and the user asked for it to be spared — hard-coded here by their word.
const SPARED = new Set(["light.aidens_hatch_light"]);

/**
 * The Lights page's header action: turns off every light and switch that's on
 * — but for SPARED. The page shows it only while one is on; it goes away once
 * Home Assistant reports them all off (or only spared ones remain), and until
 * then it spins. The climate card's All off, for lights.
 */
export function LightsAllOffButton({ entityIds }: { entityIds: string[] }) {
  const [pending, setPending] = useState(false);
  const targets = entityIds.filter((id) => !SPARED.has(id));

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setPending(false), PENDING_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  if (targets.length === 0) return null;

  return (
    <Button
      size="xs"
      variant="outline"
      // Taller than the title row; don't let it grow the header.
      my="-1"
      loading={pending}
      aria-label="Turn off all lights"
      onClick={() => {
        for (const id of targets) void callService(id, "turn_off");
        setPending(true);
      }}
    >
      <IoPowerOutline />
      All off
    </Button>
  );
}
