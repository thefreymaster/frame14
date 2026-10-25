import { Badge, Grid, HStack, Skeleton, Text } from "@chakra-ui/react";
import { IoCalendarOutline } from "react-icons/io5";
import { Board } from "../components/Board";
import { CalendarDayCard } from "../components/CalendarDayCard";
import { PageHeader } from "../components/PageHeader";
import { PageShell } from "../components/PageShell";
import { EmptyState } from "../components/ui/empty-state";
import { AGENDA_DAYS, useCalendarAgenda } from "../hooks/useCalendarAgenda";

/** A colour per calendar, in the order Home Assistant lists them. */
const PALETTES = [
  "blue",
  "green",
  "purple",
  "orange",
  "teal",
  "pink",
  "cyan",
  "yellow",
];

/** The day cards: one across on a phone, as many as fit at 22rem elsewhere. */
const DAY_COLUMNS = "repeat(auto-fill, minmax(min(100%, 22rem), 1fr))";

/**
 * The calendar as an agenda: the next AGENDA_DAYS days as CalendarDayCards
 * (every day, so a free day shows as free), each event tagged with its
 * calendar when there is more than one. The header counts the events and
 * names the calendars.
 */
export function Calendar() {
  const agenda = useCalendarAgenda();
  const data = agenda.data;
  const calendars = data?.calendars ?? [];
  const several = calendars.length > 1;
  const palettes = several
    ? new Map(calendars.map((c, i) => [c.name, PALETTES[i % PALETTES.length]]))
    : undefined;
  const total = data?.days.reduce((n, day) => n + day.events.length, 0) ?? 0;

  return (
    <PageShell>
      <PageHeader
        icon={<IoCalendarOutline />}
        title="Calendar"
        actions={
          data && (
            <Text textStyle="sm" color="fg.muted">
              {total === 1 ? "1 event" : `${total} events`} in the next{" "}
              {AGENDA_DAYS} days
            </Text>
          )
        }
      >
        {several && (
          <HStack gap="2" wrap="wrap">
            {calendars.map((c) => (
              <Badge key={c.entity_id} colorPalette={palettes?.get(c.name)}>
                {c.name}
              </Badge>
            ))}
          </HStack>
        )}
      </PageHeader>

      {agenda.isPending ? (
        <Grid templateColumns={DAY_COLUMNS} gap="gutter" alignItems="start">
          {[0, 1, 2, 3].map((i) => (
            <Board key={i}>
              <Skeleton height="3.5rem" />
            </Board>
          ))}
        </Grid>
      ) : !data || calendars.length === 0 ? (
        <Board>
          <EmptyState
            icon={<IoCalendarOutline />}
            title="No calendars"
            description="Home Assistant has no calendar to show."
          />
        </Board>
      ) : (
        <Grid templateColumns={DAY_COLUMNS} gap="gutter" alignItems="start">
          {data.days.map((day) => (
            <CalendarDayCard
              key={day.date}
              date={day.date}
              events={day.events}
              palettes={palettes}
            />
          ))}
        </Grid>
      )}
    </PageShell>
  );
}
