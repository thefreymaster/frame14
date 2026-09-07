import { Box, HStack, Text } from "@chakra-ui/react";
import { text, type Game, type Side } from "../lib/teamTracker";

/**
 * The band under the score bug: everything the sensor carries that the home
 * card has no room for — the full down-and-distance including the yard line,
 * ESPN's description of the last play, where the game is and who is showing it.
 *
 * Deliberately dim. A bright block sitting still at the bottom of the panel for
 * three hours is the burn-in the OLED constraints warn about, and none of this
 * is what you look up to check.
 */

function Line({
  children,
  size,
  dim,
}: {
  children: React.ReactNode;
  size: string;
  dim?: boolean;
}) {
  return (
    <Text
      fontSize={size}
      color={dim ? "var(--theme-fg-faint)" : "var(--theme-fg-dim)"}
      letterSpacing="0.06em"
      textAlign="center"
      width="100%"
      overflow="hidden"
      whiteSpace="nowrap"
      textOverflow="ellipsis"
    >
      {children}
    </Text>
  );
}

export function FootballDetail({
  game,
  away,
  home,
}: {
  game: Game;
  away: Side;
  home: Side;
}) {
  const a = game.attributes;

  // The card trims the yard line off ("3RD & 5"); a whole page can say where.
  const down = game.state === "IN" ? text(a.down_distance_text) : null;
  const lastPlay = game.state === "IN" ? text(a.last_play) : null;

  // Records are already on the panels before kickoff — repeat them only once
  // the scores have taken that spot.
  const records =
    away.record && home.record && game.state !== "PRE"
      ? `${away.abbr} ${away.record}   ·   ${home.abbr} ${home.record}`
      : null;

  const place = [text(a.tv_network), text(a.venue) ?? text(a.location)]
    .filter(Boolean)
    .join("   ·   ");

  if (!down && !lastPlay && !records && !place) return null;

  return (
    <Box
      flexShrink={0}
      bg="var(--theme-bg)"
      px="3vmin"
      py="2vmin"
      display="flex"
      flexDirection="column"
      gap="1vmin"
      alignItems="center"
    >
      {down && (
        <Line size="3vmin">
          <Text as="span" color="var(--theme-fg)" letterSpacing="0.08em">
            {down.toUpperCase()}
          </Text>
        </Line>
      )}

      {lastPlay && <Line size="2.4vmin">{lastPlay}</Line>}

      {(records || place) && (
        <HStack gap="3vmin" justify="center" width="100%" minW="0">
          {records && (
            <Line size="2.2vmin" dim>
              {records}
            </Line>
          )}
          {place && (
            <Line size="2.2vmin" dim>
              {place}
            </Line>
          )}
        </HStack>
      )}
    </Box>
  );
}
