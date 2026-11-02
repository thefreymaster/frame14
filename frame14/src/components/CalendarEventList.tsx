import { Badge, Card, HStack, Stack, Text } from "@chakra-ui/react";
import type { HomeCalendarEvent } from "../hooks/useHomeData";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** The compact time the Home card uses: "3:15p". */
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

/**
 * Events as rows in subtle `sm` wells: the summary and, at the right, the
 * start time or "all day"; an event that has ended is dimmed and struck
 * through. With `palettes` (a Chakra palette per calendar name, the page's
 * with several calendars) each row leads with its calendar as a Badge. The
 * Home calendar card's (the first `max`) and /calendar's day cards'.
 */
export function CalendarEventList({
  events,
  max,
  palettes,
}: {
  events: HomeCalendarEvent[];
  max?: number;
  palettes?: Map<string, string>;
}) {
  const shown = max == null ? events : events.slice(0, max);
  return (
    <Stack gap="2">
      {shown.map((event, i) => {
        const past = isPast(event);
        const palette = palettes?.get(event.calendar);
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
              <HStack gap="2" minW="0" align="baseline">
                {palette && (
                  <Badge colorPalette={palette} size="sm" flexShrink={0}>
                    {event.calendar}
                  </Badge>
                )}
                <Text
                  textStyle="lg"
                  truncate
                  minW="0"
                  textDecoration={past ? "line-through" : undefined}
                >
                  {event.summary}
                </Text>
              </HStack>
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
