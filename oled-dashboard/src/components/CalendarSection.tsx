import { Box, Flex, IconButton, Skeleton, Text } from "@chakra-ui/react";
import { IoCalendarOutline, IoChevronForward } from "react-icons/io5";
import { useNavigate } from "react-router";
import type { HomeCalendarEvent } from "../hooks/useHomeData";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { Board } from "./Board";
import { CalendarEventList } from "./CalendarEventList";
import { CalendarSkeleton } from "./skeletons/CalendarSkeleton";

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

/**
 * /home's calendar card: today's events (the first five) and tomorrow's,
 * the count in the header, and a chevron in the header that opens /calendar
 * for the fortnight.
 */
export function CalendarSection({
  today,
  tomorrow,
  loading = false,
}: {
  today: HomeCalendarEvent[];
  tomorrow: HomeCalendarEvent[];
  /** The calendars haven't answered: placeholders for the count and events. */
  loading?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <Board
      collapsible
      storageKey="calendar"
      title={
        // Wraps the count under the title when the card is too narrow for
        // both, like the Energy card's badge.
        <Flex align="center" gap="3" rowGap="1" wrap="wrap" width="100%">
          <SectionTitle icon={<IoCalendarOutline />}>Calendar</SectionTitle>
          {loading ? (
            <Skeleton
              height="4"
              width="6rem"
              ms="auto"
              flexShrink="1"
              minW="0"
            />
          ) : (
            <Text textStyle="sm" color="fg.muted" ms="auto">
              {eventCountLabel(today.length, "today")}
            </Text>
          )}
        </Flex>
      }
      action={
        <IconButton
          size="xs"
          variant="ghost"
          // Taller than the title row; don't let it grow the header.
          my="-1"
          aria-label="Open the calendar"
          onClick={() => void navigate("/calendar")}
        >
          <IoChevronForward />
        </IconButton>
      }
    >
      {loading ? (
        <CalendarSkeleton />
      ) : (
        <>
          <SectionTitle>Today</SectionTitle>
          {today.length > 0 ? (
            <Box mt="3">
              <CalendarEventList events={today} max={5} />
            </Box>
          ) : (
            <Text color="fg.muted" mt="2">
              No events today
            </Text>
          )}
          {tomorrow.length > 0 && (
            <Box mt="6">
              <SectionTitle>Tomorrow</SectionTitle>
              <Box mt="3">
                <CalendarEventList events={tomorrow} max={5} />
              </Box>
            </Box>
          )}
        </>
      )}
    </Board>
  );
}
