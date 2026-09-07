import { useState } from "react";
import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import NumberFlow from "@number-flow/react";
import { IoAmericanFootball } from "react-icons/io5";
import { CARD_RADIUS } from "../lib/surfaces";
import {
  sides,
  stateLabel,
  text,
  type Game,
  type Side,
} from "../lib/teamTracker";
import { FootballDetail } from "./FootballDetail";

/**
 * The /football page's score bug, at the scale of a television scoreboard.
 *
 * **Portrait is the real target.** The frame is a 1600x2400 panel, so the
 * broadcast arrangement — cap | team | clock | team | cap across one row —
 * does not fit: the two caps and the centre block alone claim about two thirds
 * of the width and crush the names and scores into what is left. In portrait
 * the same parts stack instead, one team per full-width row with the clock as
 * a band between them, which is also how a stadium scoreboard reads. Landscape
 * keeps the broadcast row, where there is width to spend.
 *
 * Both layouts are the same DOM, re-flowed with orientation media queries —
 * the pattern LandscapeNav and PageShell already use — so there is one tree to
 * keep correct rather than two.
 *
 * The home card's chip is deliberately a separate component: its sizes are
 * tuned for a tile inside the bento and are far too small here. The game model
 * both draw is shared, in lib/teamTracker.ts.
 */

/** Colour block carrying the helmet logo, with a stripe of the second colour. */
function LogoCap({ side, edge }: { side: Side; edge: "left" | "right" }) {
  const [broken, setBroken] = useState(false);

  return (
    <Box
      position="relative"
      flexShrink={0}
      alignSelf="stretch"
      bg={side.color}
      display="flex"
      alignItems="center"
      justifyContent="center"
      overflow="hidden"
      opacity={side.lost ? 0.45 : 1}
      transition="opacity 400ms ease"
      css={{
        // Portrait: the cap leads every row, so it can be narrower.
        width: "17vmin",
        padding: "0 1.6vmin",
        "@media (orientation: landscape)": { width: "20vmin" },
      }}
    >
      {side.logo && !broken ? (
        // Plain <img>: Chakra v3's polymorphic Box drops the img-only props.
        <img
          src={side.logo}
          alt={side.abbr}
          style={{
            maxHeight: "60%",
            maxWidth: "100%",
            objectFit: "contain",
          }}
          onError={() => setBroken(true)}
        />
      ) : (
        <Text
          fontWeight="700"
          color="#FFFFFF"
          letterSpacing="0.04em"
          maxW="100%"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          css={{
            fontSize: "5vmin",
            "@media (orientation: landscape)": { fontSize: "5vmin" },
          }}
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
        css={{
          // Portrait: every cap is on the left, so the stripe faces inward.
          right: 0,
          left: "auto",
          "@media (orientation: landscape)": {
            ...(edge === "left"
              ? { right: 0, left: "auto" }
              : { left: 0, right: "auto" }),
          },
        }}
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
        py="0.3vmin"
      >
        <Text
          fontSize="2.2vmin"
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
      <HStack
        gap="0.8vmin"
        height="1.2vmin"
        css={{
          width: "22vmin",
          "@media (orientation: landscape)": { width: "11vmin" },
        }}
      >
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

  return (
    <Box
      height="1.2vmin"
      borderRadius="0.4vmin"
      bg={side.color}
      css={{
        width: "22vmin",
        "@media (orientation: landscape)": { width: "11vmin" },
      }}
    />
  );
}

function Score({ side }: { side: Side }) {
  const n = Number(side.score);

  return (
    <Text
      className="display-numeral"
      fontWeight="500"
      lineHeight="1"
      color="var(--theme-fg)"
      opacity={side.lost ? 0.5 : 1}
      transition="opacity 400ms ease"
      flexShrink={0}
      css={{
        // Portrait has a full row per team, so the score can be much bigger.
        fontSize: "22vmin",
        lineHeight: "0.85",
        "@media (orientation: landscape)": { fontSize: "13vmin" },
      }}
    >
      {/* Digits roll the way a stadium scoreboard flips them. */}
      {Number.isFinite(n) ? <NumberFlow value={n} /> : side.score}
    </Text>
  );
}

/**
 * One team: colour cap, name and status, then the score.
 *
 * `edge` is which end of the broadcast row this team sits at, and only matters
 * in landscape — there the home side mirrors so both teams face the clock. In
 * portrait both rows read left to right, like a scoreboard.
 */
function TeamRow({
  side,
  edge,
  venue,
  live,
}: {
  side: Side;
  edge: "left" | "right";
  /** HOME or AWAY — the sensor knows, and the score bug never said. */
  venue: string;
  /** Down and timeouts only mean anything once the ball is in play. */
  live: boolean;
}) {
  const mirrored = edge === "right";

  return (
    <HStack
      flexShrink={0}
      minW="0"
      gap="0"
      align="stretch"
      bg="var(--theme-surface-2)"
      css={{
        // Both orientations fill. The content scales with the row rather than
        // sitting small inside it — a stretched row holding a couple of lines
        // would be the huge static colour slab the OLED constraints rule out,
        // but a filled one is a scoreboard.
        flex: "1 1 0%",
        minHeight: 0,
        flexDirection: "row",
        "@media (orientation: landscape)": {
          flexDirection: mirrored ? "row-reverse" : "row",
        },
      }}
    >
      <LogoCap side={side} edge={edge} />

      <HStack
        flex="1"
        minW="0"
        align="center"
        gap="2.4vmin"
        px="2.6vmin"
        py="4vmin"
        css={{
          flexDirection: "row",
          "@media (orientation: landscape)": {
            flexDirection: mirrored ? "row-reverse" : "row",
          },
        }}
      >
        <VStack
          flex="1"
          minW="0"
          gap="1.6vmin"
          css={{
            alignItems: "stretch",
            "@media (orientation: landscape)": {
              alignItems: mirrored ? "flex-end" : "flex-start",
            },
          }}
        >
          <Text
            fontWeight="600"
            color="var(--theme-fg)"
            letterSpacing="0.03em"
            width="100%"
            opacity={side.lost ? 0.5 : 1}
            transition="opacity 400ms ease"
            overflow="hidden"
            whiteSpace="nowrap"
            textOverflow="ellipsis"
            css={{
              fontSize: "6vmin",
              textAlign: "left",
              "@media (orientation: landscape)": {
                fontSize: "3.2vmin",
                textAlign: mirrored ? "right" : "left",
              },
            }}
          >
            {live && side.down && (
              <Box
                as="span"
                display="inline-flex"
                verticalAlign="-0.4vmin"
                mr="1.4vmin"
                color={side.trim}
                fontSize="3.4vmin"
                aria-label="has possession"
              >
                <IoAmericanFootball />
              </Box>
            )}
            {side.rank && <Rank side={side} />}
            {side.name}
          </Text>
          <HStack
            gap="1.6vmin"
            align="center"
            width="100%"
            minW="0"
            css={{
              justifyContent: "flex-start",
              "@media (orientation: landscape)": {
                justifyContent: mirrored ? "flex-end" : "flex-start",
              },
            }}
          >
            <Text
              fontWeight="500"
              color="var(--theme-fg-faint)"
              letterSpacing="0.12em"
              whiteSpace="nowrap"
              flexShrink={0}
              css={{
                fontSize: "3.2vmin",
                "@media (orientation: landscape)": { fontSize: "1.9vmin" },
              }}
            >
              {venue}
              {side.record ? `  ·  ${side.record}` : ""}
            </Text>
            {live && (
              <Box flexShrink={0}>
                <StatusBar side={side} />
              </Box>
            )}
            <Box flex="1" minW="0" />
            {side.score != null && <Score side={side} />}
          </HStack>
        </VStack>
      </HStack>
    </HStack>
  );
}

/** Game state — period and clock live, kickoff before, FINAL after. */
function CenterBlock({ game }: { game: Game }) {
  return (
    <Box
      flexShrink={0}
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="var(--theme-bg)"
      css={{
        // Portrait: a full-width band between the two teams.
        width: "100%",
        padding: "2vmin 3vmin",
        "@media (orientation: landscape)": {
          width: "auto",
          minWidth: "20vmin",
          alignSelf: "stretch",
        },
      }}
    >
      <Text
        className="display-numeral"
        fontWeight="500"
        color="var(--theme-fg)"
        letterSpacing="0.08em"
        whiteSpace="nowrap"
        textAlign="center"
        css={{
          fontSize: "8vmin",
          "@media (orientation: landscape)": { fontSize: "5vmin" },
        }}
      >
        {stateLabel(game)}
      </Text>
    </Box>
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
    <VStack
      align="stretch"
      gap="1vmin"
      width="100%"
      flexShrink={0}
      bg="var(--theme-surface-1)"
      px="2.6vmin"
      py="2vmin"
    >
      <HStack justify="space-between" align="baseline">
        <Text
          fontSize="2.6vmin"
          fontWeight="600"
          color={away.color === "#3A3A42" ? "var(--theme-fg-dim)" : away.trim}
        >
          {awayPct}%
        </Text>
        <Text
          fontSize="2vmin"
          color="var(--theme-fg-faint)"
          letterSpacing="0.14em"
        >
          WIN PROBABILITY
        </Text>
        <Text
          fontSize="2.6vmin"
          fontWeight="600"
          color={home.color === "#3A3A42" ? "var(--theme-fg-dim)" : home.trim}
        >
          {100 - awayPct}%
        </Text>
      </HStack>
      <Box
        position="relative"
        height="1.4vmin"
        width="100%"
        borderRadius="0.7vmin"
        overflow="hidden"
      >
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
    </VStack>
  );
}

/** Where and on what — the frame at the top of the card. */
function MetaStrip({ game }: { game: Game }) {
  const a = game.attributes;
  const left = [text(a.league) ?? text(a.sport), text(a.tv_network)]
    .filter(Boolean)
    .join("   ·   ");
  const right = text(a.venue) ?? text(a.location);
  if (!left && !right) return null;

  return (
    <HStack
      justify="space-between"
      align="center"
      gap="2vmin"
      flexShrink={0}
      bg="var(--theme-surface-1)"
      px="2.6vmin"
      py="1.8vmin"
    >
      <Text
        fontSize="2.2vmin"
        fontWeight="500"
        color="var(--theme-fg-dim)"
        letterSpacing="0.16em"
        whiteSpace="nowrap"
        textTransform="uppercase"
      >
        {left}
      </Text>
      <Text
        fontSize="2.2vmin"
        color="var(--theme-fg-faint)"
        letterSpacing="0.1em"
        overflow="hidden"
        whiteSpace="nowrap"
        textOverflow="ellipsis"
      >
        {right}
      </Text>
    </HStack>
  );
}

export function FootballScoreboard({ game }: { game: Game }) {
  const [away, home] = sides(game);
  const live = game.state === "IN";

  return (
    <VStack
      align="stretch"
      gap="0"
      minW="0"
      width="100%"
      borderRadius={CARD_RADIUS}
      css={{ flex: "1 1 0%", minHeight: 0 }}
      overflow="hidden"
      bg="var(--theme-surface-1)"
    >
      <MetaStrip game={game} />

      {/* Portrait stacks the two teams with the clock between them; landscape
          lays them out across one broadcast row. */}
      <Box
        display="flex"
        minW="0"
        css={{
          // Fills in both orientations, so the two rows have a height to share
          // rather than leaving the bottom of the card empty.
          flex: "1 1 0%",
          minHeight: 0,
          flexDirection: "column",
          "@media (orientation: landscape)": { flexDirection: "row" },
        }}
      >
        <TeamRow side={away} edge="left" venue="AWAY" live={live} />
        <CenterBlock game={game} />
        <TeamRow side={home} edge="right" venue="HOME" live={live} />
      </Box>

      {game.state === "IN" && <WinBar away={away} home={home} />}

      <FootballDetail game={game} />
    </VStack>
  );
}
