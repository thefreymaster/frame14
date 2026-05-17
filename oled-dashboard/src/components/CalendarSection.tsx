import { Box, HStack, VStack, Text } from "@chakra-ui/react";
import { IoCalendarOutline } from "react-icons/io5";
import type { HomeCalendarEvent } from "../hooks/useHomeData";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { Board } from "./Board";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatEventTime(isoStr: string | null) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  const h = d.getHours() % 12 || 12;
  const m = pad(d.getMinutes());
  const ampm = d.getHours() < 12 ? "a" : "p";
  return `${h}:${m}${ampm}`;
}

const NUMBER_WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
];

function numWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

function eventCountLabel(n: number, when: string): string {
  if (n === 0) return `No events ${when}`;
  if (n === 1) return `One event ${when}`;
  return `${numWord(n)} events ${when}`;
}

function isPast(event: HomeCalendarEvent): boolean {
  if (event.allDay) return false;
  const end = event.end ?? event.start;
  if (!end) return false;
  return new Date(end) < new Date();
}

function EventList({
  events,
  max = 5,
}: {
  events: HomeCalendarEvent[];
  max?: number;
}) {
  return (
    <VStack gap="1vmin" align="stretch" width="100%">
      {events.slice(0, max).map((event, i) => {
        const past = isPast(event);
        return (
          <HStack key={i} justify="space-between" align="baseline" width="100%">
            <Text
              fontSize="3.8vmin"
              fontWeight="300"
              overflow="hidden"
              whiteSpace="nowrap"
              textOverflow="ellipsis"
              flex="1"
              mr="3vmin"
              textDecoration={past ? "line-through" : undefined}
              color={past ? "var(--theme-fg-faint)" : undefined}
            >
              {event.summary}
            </Text>
            <Text
              fontSize="3.2vmin"
              color={past ? "var(--theme-fg-faint)" : "var(--theme-fg)"}
              fontWeight="300"
              flexShrink={0}
              textDecoration={past ? "line-through" : undefined}
            >
              {event.allDay ? "all day" : formatEventTime(event.start)}
            </Text>
          </HStack>
        );
      })}
    </VStack>
  );
}

export function CalendarSection({
  today,
  tomorrow,
}: {
  today: HomeCalendarEvent[];
  tomorrow: HomeCalendarEvent[];
}) {
  return (
    <Board
      collapsible
      storageKey="calendar"
      title={
        <HStack width="100%" align="center" gap="1.5vmin">
          <SectionTitle icon={<IoCalendarOutline />}>CALENDAR</SectionTitle>
          <Box flex="1" minW="0" />
          <Text
            fontSize="1.8vmin"
            color="var(--theme-fg-dim)"
            letterSpacing="0.06em"
            fontWeight="500"
          >
            {eventCountLabel(today.length, "today")}
          </Text>
        </HStack>
      }
    >
      <SectionTitle icon={<IoCalendarOutline />}>TODAY</SectionTitle>
      {today.length > 0 ? (
        <EventList events={today} />
      ) : (
        <Text fontSize="3.8vmin" fontWeight="300" color="var(--theme-fg-faint)">
          No events today
        </Text>
      )}
      {tomorrow.length > 0 && (
        <Box mt="2.5vmin">
          <SectionTitle icon={<IoCalendarOutline />}>TOMORROW</SectionTitle>
          <EventList events={tomorrow} />
        </Box>
      )}
    </Board>
  );
}
