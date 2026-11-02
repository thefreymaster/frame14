import { useEffect, useState } from "react";
import { toaster } from "../components/ui/toaster";
import { callService } from "../lib/callService";

// A tap's pending spinner gives up — with a toast — if Home Assistant hasn't
// reported the light in its new state by then. Longer than the call's own
// timeout (lib/callService), so a rejected call shows its error first.
export const STATE_TIMEOUT_MS = 15_000;

/**
 * A tap turning a light or switch off or on, as the Lights tiles do it
 * (0.125; its own hook since 0.144, for the camera's header buttons too): the
 * explicit service, not toggle, so the state waited for is known. `pending`
 * is that state from the tap until Home Assistant reports the entity in it
 * (reset during render, as React allows for a derived reset) — the caller
 * shows a spinner meanwhile — and further taps are ignored. The server's ack
 * carries Home Assistant's answer: a refusal, or no new state within
 * STATE_TIMEOUT_MS, ends it with an error toast naming `label`.
 */
export function useLightToggle(
  entityId: string,
  label: string,
  state: string | undefined,
) {
  const [pending, setPending] = useState<"on" | "off" | null>(null);
  if (pending && state === pending) setPending(null);

  // Give up, and say so, if it never does.
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => {
      setPending(null);
      toaster.create({
        type: "error",
        title: `${label} didn't turn ${pending}`,
        description:
          "Home Assistant took the call, but the light hasn't reported the change.",
      });
    }, STATE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [pending, label]);

  async function toggle() {
    if (pending) return;
    const target = state === "on" ? "off" : "on";
    setPending(target);
    const result = await callService(
      entityId,
      target === "off" ? "turn_off" : "turn_on",
    );
    if (!result.ok) {
      setPending(null);
      toaster.create({
        type: "error",
        title: `Couldn't turn ${target} ${label}`,
        description: result.error,
      });
    }
  }

  return { pending, toggle };
}
