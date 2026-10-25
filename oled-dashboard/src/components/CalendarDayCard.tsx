import { Flex, Text } from "@chakra-ui/react";
import type { HomeCalendarEvent } from "../hooks/useHomeData";
import { Board } from "./Board";
import { CalendarEventList } from "./CalendarEventList";
import { SectionTitle } from "./SectionTitle/SectionTitle";

/** A "YYYY-MM-DD" as a local Date (not UTC midnight, which is the day before). */
function localDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

/**
 * One day of /calendar: a card titled Today, Tomorrow or the day ("Mon, Oct
 * 27"), its date and event count as the header's summary, and its events as
 * CalendarEventList rows with their calendar's Badge. A day with nothing on
 * is the header alone.
 */
export function CalendarDayCard({
  date,
  events,
  palettes,
}: {
  date: string;
  events: HomeCalendarEvent[];
  /** A Chakra palette per calendar name; none with a single calendar. */
  palettes?: Map<string, string>;
}) {
  const now = new Date();
  const day = localDate(date);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const dateLabel = day.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const title = sameDay(day, now)
    ? "Today"
    : sameDay(day, tomorrow)
      ? "Tomorrow"
      : dateLabel;
  const count =
    events.length === 0
      ? "Nothing planned"
      : events.length === 1
        ? "1 event"
        : `${events.length} events`;
  const summary = title === dateLabel ? count : `${dateLabel} · ${count}`;

  return (
    <Board
      title={
        <Flex align="center" gap="3" rowGap="1" wrap="wrap" width="100%">
          <SectionTitle>{title}</SectionTitle>
          <Text textStyle="sm" color="fg.muted" ms="auto">
            {summary}
          </Text>
        </Flex>
      }
    >
      {events.length > 0 ? (
        <CalendarEventList events={events} palettes={palettes} />
      ) : null}
    </Board>
  );
}
