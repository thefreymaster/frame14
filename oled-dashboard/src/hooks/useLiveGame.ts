import { useEffect, useState } from "react";
import { useEntitiesConfig } from "./useEntitiesConfig";
import { useEntities } from "./useEntity";
import {
  ACTIVE,
  EMPTY,
  TICK_MS,
  inRouteWindow,
  isLive,
  type Game,
  type TeamTrackerAttributes,
} from "../lib/teamTracker";

/**
 * The tracked games worth showing right now.
 *
 * TeamTracker is not part of useHomeData — it talks to the entity rooms
 * directly, one sensor per team. Both the home card and the /football route
 * read through here so they can never disagree about what is on.
 *
 * `window` picks how generous to be: the home card's day-long window, or the
 * route's tighter one. See lib/teamTracker.ts.
 */
export function useGames(window: (game: Game, now: number) => boolean) {
  const { data: config } = useEntitiesConfig();
  // useEntities memoises on the joined ID string, so a fresh array each render
  // doesn't churn the socket subscriptions.
  const results = useEntities<TeamTrackerAttributes>(
    config?.teamTracker ?? EMPTY,
  );

  // The windows below turn on and off with the clock, not with a state change,
  // so re-check them on a timer rather than waiting for the next HA update.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const games = results
    .map((r) => r.data)
    .filter((s): s is Game => !!s && ACTIVE.has(s.state) && window(s, now));

  return { games, anyLive: games.some(isLive) };
}

/** The games the /football route and its nav item exist for. */
export function useLiveGame() {
  return useGames(inRouteWindow);
}
