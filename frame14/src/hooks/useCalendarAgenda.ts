import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEntities } from "./useEntity";
import type { HomeCalendarEvent } from "./useHomeData";

export interface AgendaDay {
  /** The local date, "YYYY-MM-DD". */
  date: string;
  events: HomeCalendarEvent[];
}

export interface CalendarAgenda {
  /** The first day, and the day after the last, "YYYY-MM-DD". */
  start: string;
  end: string;
  calendars: { entity_id: string; name: string }[];
  /** One entry per day, in order, empty days included. */
  days: AgendaDay[];
}

/** How far /calendar looks ahead. */
export const AGENDA_DAYS = 14;

// A stable empty list until the agenda names the calendars: useEntities
// re-subscribes when the array changes identity.
const NO_IDS: string[] = [];

/**
 * /api/home/calendar/agenda: every calendar's events for the next `days`
 * days, bucketed by day. Refetched every five minutes, and as soon as a
 * calendar entity changes over the socket (its next event moved).
 */
export function useCalendarAgenda(days = AGENDA_DAYS) {
  const queryClient = useQueryClient();
  const query = useQuery<CalendarAgenda>({
    queryKey: ["calendar", "agenda", days],
    queryFn: async () => {
      const res = await fetch(`/api/home/calendar/agenda?days=${days}`);
      if (!res.ok) throw new Error(`Calendar agenda fetch failed: ${res.status}`);
      return res.json();
    },
    refetchInterval: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 5,
  });

  const calendars = query.data?.calendars;
  const ids = useMemo(
    () => (calendars ? calendars.map((c) => c.entity_id) : NO_IDS),
    [calendars],
  );
  const states = useEntities(ids);
  const revision = states
    .map((result) => result.data?.last_updated ?? "")
    .join("|");
  useEffect(() => {
    if (!revision) return;
    void queryClient.invalidateQueries({ queryKey: ["calendar", "agenda"] });
  }, [queryClient, revision]);

  return query;
}
