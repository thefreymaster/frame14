import { useEffect, useState } from "react";
import { callService } from "../lib/callService";
import { Switch } from "./ui/switch";

// Show the light as asked for this long at most, if the printer never agrees.
const PENDING_MS = 10_000;

/**
 * The printer's chamber light as a labelled Switch, for a card's header. It
 * shows the entity's state, and a flick shows the asked-for state until the
 * printer reports it (Bambuddy polls, so that can take a moment), or gives
 * up after PENDING_MS. The entity is a light in ha-bambulab and a switch in
 * Bambuddy; both take turn_on / turn_off.
 */
export function ChamberLightSwitch({
  entityId,
  on,
}: {
  entityId: string;
  on: boolean;
}) {
  const [wanted, setWanted] = useState<boolean | null>(null);
  // The flick has taken once the printer agrees.
  if (wanted != null && wanted === on) setWanted(null);

  useEffect(() => {
    if (wanted == null) return;
    const timer = setTimeout(() => setWanted(null), PENDING_MS);
    return () => clearTimeout(timer);
  }, [wanted]);

  return (
    <Switch
      colorPalette="yellow"
      checked={wanted ?? on}
      onCheckedChange={(e) => {
        setWanted(e.checked);
        callService(entityId, e.checked ? "turn_on" : "turn_off");
      }}
      // The label reads first, at the header's right: "Chamber light [o]".
      flexDirection="row-reverse"
    >
      Chamber light
    </Switch>
  );
}
