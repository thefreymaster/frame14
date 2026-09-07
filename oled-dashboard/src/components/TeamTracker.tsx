import { useState } from "react";
import { useNavigate } from "react-router";
import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import NumberFlow from "@number-flow/react";
import { IoTrophyOutline } from "react-icons/io5";
import { useGames } from "../hooks/useLiveGame";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { Board } from "./Board";
import { CHIP_GAP } from "../lib/surfaces";
import { socket } from "../lib/socket";
import { getDeviceMode } from "../lib/deviceMode";
import {
  inWindow,
  sides,
  stateLabel,
  type Game,
  type Side,
} from "../lib/teamTracker";

/**
 * The home screen's sports chip: one score bug per tracked team.
 *
 * It is drawn as a college broadcast score bug — helmet-striped colour caps at
 * the ends, AP rank ahead of each name, both scores facing a dark centre block
 * holding the period and clock, and — while the game is live — ESPN's win
 * probability as a tug-of-war rule along the bottom.
 *
 * The game model itself (what a game is, when it's worth showing, which side is
 * away) lives in lib/teamTracker.ts, shared with the /football route.
 */

/** Colour cap with a helmet stripe of the school's second colour. */
function LogoCap({ side, edge }: { side: Side; edge: "left" | "right" }) {
  const [broken, setBroken] = useState(false);

  return (
    <Box
      position="relative"
      flexShrink={0}
      width="8vmin"
      alignSelf="stretch"
      bg={side.color}
      display="flex"
      alignItems="center"
      justifyContent="center"
      px="1vmin"
      opacity={side.lost ? 0.45 : 1}
      transition="opacity 400ms ease"
    >
      {side.logo && !broken ? (
        // Plain <img>: Chakra v3's polymorphic Box drops the img-only props.
        <img
          src={side.logo}
          alt={side.abbr}
          style={{
            maxHeight: "5.4vmin",
            maxWidth: "100%",
            objectFit: "contain",
          }}
          onError={() => setBroken(true)}
        />
      ) : (
        <Text
          fontSize="2.4vmin"
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
        width="0.5vmin"
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
      fontSize="1.6vmin"
      fontWeight="700"
      color={side.trim}
      letterSpacing="0.02em"
      mr="0.6vmin"
      verticalAlign="0.3vmin"
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
      <Box bg={side.color} borderRadius="0.2vmin" px="0.8vmin" py="0.2vmin">
        <Text
          fontSize="1.5vmin"
          fontWeight="600"
          color="#FFFFFF"
          letterSpacing="0.08em"
          textAlign="center"
          whiteSpace="nowrap"
        >
          {side.down}
        </Text>
      </Box>
    );
  }

  if (side.timeouts != null) {
    return (
      <HStack gap="0.4vmin" height="0.8vmin">
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            flex="1"
            height="100%"
            borderRadius="0.2vmin"
            bg={side.color}
            opacity={i < side.timeouts! ? 1 : 0.25}
          />
        ))}
      </HStack>
    );
  }

  return <Box height="0.8vmin" borderRadius="0.2vmin" bg={side.color} />;
}

function Score({ side }: { side: Side }) {
  const n = Number(side.score);

  return (
    <Text
      className="display-numeral"
      fontSize="4.4vmin"
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
      gap="1.2vmin"
      px="1.2vmin"
      py="1vmin"
      flexDirection={right ? "row-reverse" : "row"}
    >
      <VStack flex="1" minW="0" align="stretch" gap="0.6vmin">
        <Text
          fontSize="1.9vmin"
          fontWeight="600"
          color="var(--theme-fg)"
          letterSpacing="0.03em"
          textAlign={align}
          opacity={side.lost ? 0.5 : 1}
          transition="opacity 400ms ease"
          overflow="hidden"
          whiteSpace="nowrap"
          textOverflow="ellipsis"
        >
          {side.rank && <Rank side={side} />}
          {side.name}
        </Text>
        <StatusBar side={side} />
      </VStack>

      {side.score != null ? (
        <Score side={side} />
      ) : (
        side.record && (
          <Text
            fontSize="2vmin"
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
      gap="0.4vmin"
      bg="var(--theme-bg)"
      px="1.4vmin"
      py="1vmin"
      minW="12vmin"
    >
      <Text
        fontSize="2vmin"
        fontWeight="500"
        color="var(--theme-fg)"
        letterSpacing="0.08em"
        whiteSpace="nowrap"
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
    <Box position="relative" height="0.7vmin" width="100%">
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
        width="0.4vmin"
        ml="-0.2vmin"
        bg="var(--theme-bg)"
        transition="left 900ms ease"
      />
    </Box>
  );
}

function ScoreBug({ game }: { game: Game }) {
  const [away, home] = sides(game);

  return (
    <VStack
      align="stretch"
      gap="0"
      minW="0"
      width="100%"
      borderRadius="1.2vmin"
      overflow="hidden"
    >
      <HStack gap="0" align="stretch" minW="0">
        <LogoCap side={away} edge="left" />
        <TeamPanel side={away} align="left" />
        <CenterBlock game={game} />
        <TeamPanel side={home} align="right" />
        <LogoCap side={home} edge="right" />
      </HStack>
      {game.state === "IN" && <WinBar away={away} home={home} />}
    </VStack>
  );
}

export function TeamTracker({ span }: { span?: 1 | 2 }) {
  const { games, anyLive } = useGames(inWindow);
  const navigate = useNavigate();

  // The chip is a doorway to the full-screen game. Same rule the nav bar uses:
  // on a frame the tap takes the other panels with it, on a phone it doesn't.
  function openFootball() {
    void navigate("/football");
    if (getDeviceMode() === "frame") socket.emit("change", "football");
  }

  if (games.length === 0) return null;

  return (
    <Board
      span={span}
      collapsible
      storageKey="teamtracker"
      title={
        <HStack width="100%" align="center" gap="1.5vmin">
          <SectionTitle icon={<IoTrophyOutline />}>TEAMS</SectionTitle>
          <Box flex="1" minW="0" />
          {anyLive && (
            <Text
              fontSize="1.8vmin"
              color="var(--theme-fg-dim)"
              letterSpacing="0.06em"
              fontWeight="500"
            >
              LIVE
            </Text>
          )}
        </HStack>
      }
    >
      <VStack align="stretch" gap={CHIP_GAP} width="100%">
        {games.map((game) => (
          <Box
            key={game.entity_id}
            as="button"
            onClick={openFootball}
            display="block"
            width="100%"
            textAlign="left"
            bg="transparent"
            cursor="pointer"
            _active={{ opacity: 0.6 }}
            transition="opacity 0.1s"
            aria-label={`Open ${game.attributes.team_name ?? "game"} full screen`}
          >
            <ScoreBug game={game} />
          </Box>
        ))}
      </VStack>
    </Board>
  );
}
