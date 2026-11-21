import { Box, Text } from "@chakra-ui/react";
import { text, type Game } from "../lib/teamTracker";
import { u } from "../lib/scoreboardLayout";

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
 *
 * Sized in the scoreboard's own unit (lib/scoreboardLayout's `u`), so it is
 * drawn inside FootballScoreboard's board; its words have a floor, since a
 * phone's unit takes them under 10px.
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
      data-scoreboard-detail=""
      flexShrink={0}
      bg="bg"
      px={u(3)}
      py={u(2.4)}
      display="flex"
      flexDirection="column"
      gap={u(1.2)}
      alignItems="center"
    >
      {/* Mutually exclusive by state: the situation while it's on, the
          countdown before it starts. */}
      {(down || upcoming) && (
        <Text
          fontSize={u(3, "0.8125rem")}
          lineHeight="1.5"
          fontWeight="500"
          color="fg"
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
          fontSize={u(2.4, "0.6875rem")}
          color="fg.muted"
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
