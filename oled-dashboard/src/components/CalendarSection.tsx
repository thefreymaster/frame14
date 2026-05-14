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
    <Board>
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
