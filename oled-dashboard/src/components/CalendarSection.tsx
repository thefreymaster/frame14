import { Box, Card, Flex, Stack, Text } from "@chakra-ui/react";
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
    <Stack gap="2" mt="3">
      {events.slice(0, max).map((event, i) => {
        const past = isPast(event);
        return (
          <Card.Root
            key={i}
            size="sm"
            variant="subtle"
            borderRadius="sm"
            opacity={past ? 0.6 : 1}
          >
            <Card.Body
              flexDirection="row"
              justifyContent="space-between"
              alignItems="baseline"
              gap="4"
            >
              <Text
                textStyle="lg"
                truncate
                minW="0"
                textDecoration={past ? "line-through" : undefined}
              >
                {event.summary}
              </Text>
              <Text
                color="fg.muted"
                flexShrink={0}
                textDecoration={past ? "line-through" : undefined}
              >
                {event.allDay ? "all day" : formatEventTime(event.start)}
              </Text>
            </Card.Body>
          </Card.Root>
        );
      })}
    </Stack>
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
        // Wraps the count under the title when the card is too narrow for
        // both, like the Energy card's badge.
        <Flex align="center" gap="3" rowGap="1" wrap="wrap" width="100%">
          <SectionTitle icon={<IoCalendarOutline />}>Calendar</SectionTitle>
          <Text textStyle="sm" color="fg.muted" ms="auto">
            {eventCountLabel(today.length, "today")}
          </Text>
        </Flex>
      }
    >
      <SectionTitle>Today</SectionTitle>
      {today.length > 0 ? (
        <EventList events={today} />
      ) : (
        <Text color="fg.muted" mt="2">
          No events today
        </Text>
      )}
      {tomorrow.length > 0 && (
        <Box mt="6">
          <SectionTitle>Tomorrow</SectionTitle>
          <EventList events={tomorrow} />
        </Box>
      )}
    </Board>
  );
}
