import { Badge, Card, HStack, Stack, Text } from "@chakra-ui/react";
import type { HomeCalendarEvent } from "../hooks/useHomeData";
import { Well } from "./Well";

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
 * Events as rows, each a `Well`: the summary and, at the right, the start
 * time or "all day"; an event that has ended is dimmed and struck through.
 * With `palettes` (a Chakra palette per calendar name, the page's with
 * several calendars) each row leads with its calendar as a Badge. The Home
 * calendar card's (the first `max`) and /calendar's day cards'.
 *
 * A row is read, not pressed, so in Embossed it is pressed into its card as
 * the forecast's hours are (0.176.0, the user: "Calendar event sould be
 * concave in embossed theme"; flat there until then) — and the flat grey
 * panel it always was in every other theme. `data-calendar-event`.
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
          <Well
            key={i}
            // Where /home's card can be cut to fit the screen (usePackedGrid).
            data-fit-row=""
            data-calendar-event=""
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
          </Well>
        );
      })}
    </Stack>
  );
}
