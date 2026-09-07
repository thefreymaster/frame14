import { useState } from "react";
import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import NumberFlow from "@number-flow/react";
import { CARD_RADIUS } from "../lib/surfaces";
import { sides, stateLabel, type Game, type Side } from "../lib/teamTracker";
import { FootballDetail } from "./FootballDetail";

/**
 * The /football page's score bug — the same anatomy as the home card's chip
 * (colour caps, names facing a dark centre block, win probability along the
 * bottom) drawn at the scale of a television scoreboard, so it reads from the
 * other side of the room.
 *
 * The card's sizes are tuned for a tile inside the home bento and are far too
 * small here, which is why this is its own component rather than a prop on
 * that one. The game model it draws is shared: lib/teamTracker.ts.
 */

/** Colour cap with a helmet stripe of the school's second colour. */
function LogoCap({ side, edge }: { side: Side; edge: "left" | "right" }) {
  const [broken, setBroken] = useState(false);

  return (
    <Box
      position="relative"
      flexShrink={0}
      width="20vmin"
      alignSelf="stretch"
      bg={side.color}
      display="flex"
      alignItems="center"
      justifyContent="center"
      px="2vmin"
      opacity={side.lost ? 0.45 : 1}
      transition="opacity 400ms ease"
    >
      {side.logo && !broken ? (
        // Plain <img>: Chakra v3's polymorphic Box drops the img-only props.
        <img
          src={side.logo}
          alt={side.abbr}
          style={{
            maxHeight: "14vmin",
            maxWidth: "100%",
            objectFit: "contain",
          }}
          onError={() => setBroken(true)}
        />
      ) : (
        <Text
          fontSize="6vmin"
          fontWeight="700"
          color="#FFFFFF"
          letterSpacing="0.04em"
        >
          {side.abbr}
        </Text>
      )}
      <Box
        position="absolute"
        top="0"
        bottom="0"
        width="1.2vmin"
        bg={side.trim}
        {...(edge === "left" ? { right: 0 } : { left: 0 })}
      />
    </Box>
  );
}

/** AP poll rank, the number college broadcasts put ahead of the name. */
function Rank({ side }: { side: Side }) {
  return (
    <Text
      as="span"
      fontSize="2.6vmin"
      fontWeight="700"
      color={side.trim}
      letterSpacing="0.02em"
      mr="1vmin"
      verticalAlign="0.6vmin"
    >
      #{side.rank}
    </Text>
  );
}

/**
 * The strip under a team's name: the down when that team has the ball,
 * otherwise its remaining timeouts, otherwise a plain colour rule.
 */
function StatusBar({ side }: { side: Side }) {
  if (side.down) {
    return (
      <Box
        alignSelf="flex-start"
        bg={side.color}
        borderRadius="0.4vmin"
        px="1.6vmin"
        py="0.5vmin"
      >
        <Text
          fontSize="2.4vmin"
          fontWeight="600"
          color="#FFFFFF"
          letterSpacing="0.08em"
          whiteSpace="nowrap"
        >
          {side.down}
        </Text>
      </Box>
    );
  }

  if (side.timeouts != null) {
    return (
      <HStack gap="0.8vmin" height="1.4vmin">
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            flex="1"
            height="100%"
            borderRadius="0.4vmin"
            bg={side.color}
            opacity={i < side.timeouts! ? 1 : 0.25}
          />
        ))}
      </HStack>
    );
  }

  return <Box height="1.4vmin" borderRadius="0.4vmin" bg={side.color} />;
}

function Score({ side }: { side: Side }) {
  const n = Number(side.score);

  return (
    <Text
      className="display-numeral"
      fontSize="13vmin"
      fontWeight="500"
      lineHeight="1"
      color="var(--theme-fg)"
      opacity={side.lost ? 0.5 : 1}
      transition="opacity 400ms ease"
      flexShrink={0}
    >
      {/* Digits roll the way a stadium scoreboard flips them. */}
      {Number.isFinite(n) ? <NumberFlow value={n} /> : side.score}
    </Text>
  );
}

function TeamPanel({ side, align }: { side: Side; align: "left" | "right" }) {
  const right = align === "right";

  return (
    <HStack
      flex="1"
      minW="0"
      alignSelf="stretch"
      bg="var(--theme-surface-2)"
      align="center"
      gap="2.4vmin"
      px="2.6vmin"
      py="2vmin"
      flexDirection={right ? "row-reverse" : "row"}
    >
      <VStack
        flex="1"
        minW="0"
        align={right ? "flex-end" : "flex-start"}
        gap="1.4vmin"
      >
        <Text
          fontSize="4.2vmin"
          fontWeight="600"
          color="var(--theme-fg)"
          letterSpacing="0.03em"
          textAlign={align}
          width="100%"
          opacity={side.lost ? 0.5 : 1}
          transition="opacity 400ms ease"
          overflow="hidden"
          whiteSpace="nowrap"
          textOverflow="ellipsis"
        >
          {side.rank && <Rank side={side} />}
          {side.name}
        </Text>
        <Box width="100%" display="flex" justifyContent={align === "right" ? "flex-end" : "flex-start"}>
          <Box width="100%" maxW="24vmin">
            <StatusBar side={side} />
          </Box>
        </Box>
      </VStack>

      {side.score != null ? (
        <Score side={side} />
      ) : (
        side.record && (
          <Text
            fontSize="4vmin"
            color="var(--theme-fg-faint)"
            letterSpacing="0.04em"
            flexShrink={0}
          >
            {side.record}
          </Text>
        )
      )}
    </HStack>
  );
}

/** Game state — period and clock live, kickoff before, FINAL after. */
function CenterBlock({ game }: { game: Game }) {
  return (
    <VStack
      flexShrink={0}
      alignSelf="stretch"
      justify="center"
      bg="var(--theme-bg)"
      px="3vmin"
      py="2vmin"
      minW="26vmin"
    >
      <Text
        className="display-numeral"
        fontSize="5vmin"
        fontWeight="500"
        color="var(--theme-fg)"
        letterSpacing="0.08em"
        whiteSpace="nowrap"
        textAlign="center"
      >
        {stateLabel(game)}
      </Text>
    </VStack>
  );
}

/**
 * Win probability as a tug-of-war: the rope sits where ESPN thinks the game
 * is, and slides as it swings. Live games only — before kickoff it's noise,
 * and after the final it's decided.
 */
function WinBar({ away, home }: { away: Side; home: Side }) {
  const awayProb = away.winProb;
  const homeProb = home.winProb;
  if (awayProb == null || homeProb == null) return null;

  const total = awayProb + homeProb;
  if (!(total > 0)) return null;
  const awayPct = Math.round((awayProb / total) * 100);

  return (
    <Box position="relative" height="1.6vmin" width="100%" flexShrink={0}>
      <HStack gap="0" height="100%" width="100%">
        <Box
          width={`${awayPct}%`}
          height="100%"
          bg={away.color}
          transition="width 900ms ease"
        />
        <Box flex="1" height="100%" bg={home.color} />
      </HStack>
      {/* Two schools can wear nearly the same red, so mark the split itself. */}
      <Box
        position="absolute"
        top="0"
        bottom="0"
        left={`${awayPct}%`}
        width="0.8vmin"
        ml="-0.4vmin"
        bg="var(--theme-bg)"
        transition="left 900ms ease"
      />
    </Box>
  );
}

export function FootballScoreboard({ game }: { game: Game }) {
  const [away, home] = sides(game);

  return (
    <VStack
      align="stretch"
      gap="0"
      minW="0"
      width="100%"
      flex="1"
      minH="0"
      borderRadius={CARD_RADIUS}
      overflow="hidden"
      bg="var(--theme-surface-1)"
    >
      <HStack gap="0" align="stretch" minW="0" flex="1" minH="0">
        <LogoCap side={away} edge="left" />
        <TeamPanel side={away} align="left" />
        <CenterBlock game={game} />
        <TeamPanel side={home} align="right" />
        <LogoCap side={home} edge="right" />
      </HStack>

      {game.state === "IN" && <WinBar away={away} home={home} />}

      <FootballDetail game={game} away={away} home={home} />
    </VStack>
  );
}
