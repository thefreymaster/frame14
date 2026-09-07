import { Box, Text } from "@chakra-ui/react";
import { text, type Game } from "../lib/teamTracker";

/**
 * The band under the scoreboard: the situation, and what just happened.
 *
 * Network, venue and records used to live here too; they moved to the header
 * strip and the team rows, where they read as context rather than as a pile of
 * footnotes. What is left is the part that changes play to play.
 *
 * Deliberately dim. A bright block sitting still at the bottom of the panel for
 * three hours is the burn-in the OLED constraints warn about, and none of this
 * is what you look up to check.
 */
export function FootballDetail({ game }: { game: Game }) {
  const a = game.attributes;

  // The team row shows the short form ("3RD & 5") against whoever has the ball;
  // here there is room for the yard line that goes with it.
  const down = game.state === "IN" ? text(a.down_distance_text) : null;
  const lastPlay = game.state === "IN" ? text(a.last_play) : null;

  // On game day the route is up long before kickoff, so the page is a preview
  // until the ball is snapped. How long until it starts is the one thing the
  // score bug above can't already say.
  const upcoming = game.state === "PRE" ? text(a.kickoff_in) : null;

  if (!down && !upcoming && !lastPlay) return null;

  return (
    <Box
      flexShrink={0}
      bg="var(--theme-bg)"
      px="3vmin"
      py="2.4vmin"
      display="flex"
      flexDirection="column"
      gap="1.2vmin"
      alignItems="center"
    >
      {/* Mutually exclusive by state: the situation while it's on, the
          countdown before it starts. */}
      {(down || upcoming) && (
        <Text
          fontSize="3vmin"
          fontWeight="500"
          color="var(--theme-fg)"
          letterSpacing="0.1em"
          textAlign="center"
          width="100%"
          overflow="hidden"
          whiteSpace="nowrap"
          textOverflow="ellipsis"
        >
          {(down ?? upcoming)!.toUpperCase()}
        </Text>
      )}

      {lastPlay && (
        <Text
          fontSize="2.4vmin"
          color="var(--theme-fg-faint)"
          letterSpacing="0.02em"
          textAlign="center"
          width="100%"
          lineHeight="1.4"
        >
          {lastPlay}
        </Text>
      )}
    </Box>
  );
}
