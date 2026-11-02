import { useEffect } from "react";
import { useEntitiesConfig } from "./useEntitiesConfig";
import { entitiesAnswered, useEntitiesAnswered } from "./useEntity";
import { pageReady, releaseSplash } from "../lib/splash";

/**
 * Take the launch splash down (lib/splash) once `ready`, and once the page's
 * live entity states are in: cards like TeamTracker's subscribe only when the
 * entity config has loaded, and would otherwise arrive after the hand-off and
 * re-pack the board under it. A launch that held the logo back (index.html's
 * "pending") has no hand-off to protect: the page shows as soon as it is
 * `ready`, and the states update it as they land.
 *
 * Call it from the component that owns the page: its effect runs after its
 * children's, so by then they have all subscribed.
 */
export function useReleaseSplash(ready: boolean) {
  const { isPending: configPending } = useEntitiesConfig();
  const answered = useEntitiesAnswered();
  useEffect(() => {
    if (!ready || configPending) return;
    pageReady();
    // Asked again rather than trusted from this render: the children may
    // have subscribed in the effects that just ran.
    if (answered && entitiesAnswered()) void releaseSplash();
  }, [ready, configPending, answered]);
}
