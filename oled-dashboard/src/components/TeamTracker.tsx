import { useEffect, useState } from "react";
import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import NumberFlow from "@number-flow/react";
import { IoTrophyOutline } from "react-icons/io5";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { useEntities, type HAState } from "../hooks/useEntity";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { Board } from "./Board";
import { CHIP_GAP } from "../lib/surfaces";

/**
 * TeamTracker (HACS) publishes one sensor per tracked team. The state is the
 * game phase and the whole game rides along in the attributes — HA keeps the
 * keys even when the integration has nothing to report, so every field is
 * nullable.
 *
 * The card is drawn as a college broadcast score bug: helmet-striped colour
 * caps at the ends, AP rank ahead of each name, both scores facing a dark
 * centre block holding the period and clock, and — while the game is live —
 * ESPN's win probability as a tug-of-war rule along the bottom.
 */
export interface TeamTrackerAttributes {
  sport?: string | null;
  league?: string | null;
  team_abbr?: string | null;
  team_name?: string | null;
  team_long_name?: string | null;
  team_score?: string | null;
  team_record?: string | null;
  team_rank?: string | number | null;
  team_homeaway?: string | null;
  team_logo?: string | null;
  team_colors?: string[] | null;
  team_timeouts?: number | null;
  team_win_probability?: number | null;
  team_winner?: boolean | null;
  team_id?: string | null;
  opponent_abbr?: string | null;
  opponent_name?: string | null;
  opponent_long_name?: string | null;
  opponent_score?: string | null;
  opponent_record?: string | null;
  opponent_rank?: string | number | null;
  opponent_homeaway?: string | null;
  opponent_logo?: string | null;
  opponent_colors?: string[] | null;
  opponent_timeouts?: number | null;
  opponent_win_probability?: number | null;
  opponent_winner?: boolean | null;
  opponent_id?: string | null;
  date?: string | null;
  kickoff_in?: string | null;
  venue?: string | null;
  location?: string | null;
  quarter?: string | number | null;
  clock?: string | null;
  possession?: string | null;
  down_distance_text?: string | null;
  tv_network?: string | null;
  last_play?: string | null;
  friendly_name?: string | null;
}

type Game = HAState<TeamTrackerAttributes>;

/** PRE = scheduled, IN = playing, POST = finished. BYE and NOT_FOUND hide. */
const ACTIVE = new Set(["PRE", "IN", "POST"]);
const SCORED = new Set(["IN", "POST"]);

// TeamTracker sits on PRE as soon as ESPN schedules the next game — days out —
// and holds POST until it rolls over to that next game, so the raw state would
// leave the card up all season. Show a game only near its own kickoff.
const PRE_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Measured from the flip to POST, which lands on the final whistle. */
const POST_WINDOW_MS = 6 * 60 * 60 * 1000;

const TICK_MS = 60 * 1000;

const NO_DATA = new Set(["", "unknown", "unavailable", "none"]);

const EMPTY: string[] = [];

/** Fallback colours when ESPN gives a school no palette. */
const NEUTRAL = "#3A3A42";
const NEUTRAL_TRIM = "#5A5A66";

const ORDINALS = ["", "1ST", "2ND", "3RD", "4TH"];

function text(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return NO_DATA.has(trimmed.toLowerCase()) ? null : trimmed;
}

function timestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const at = new Date(value).getTime();
  return Number.isNaN(at) ? null : at;
}

/**
 * A game earns its chip while it's on, in the day before kickoff, and for a
 * few hours after the final. A game whose timing we can't read stays visible —
 * better a stale chip than a missing one.
 */
function inWindow(game: Game, now: number): boolean {
  if (game.state === "IN") return true;

  if (game.state === "PRE") {
    const kickoff = timestamp(game.attributes.date);
    return kickoff == null || kickoff - now <= PRE_WINDOW_MS;
  }

  const final = timestamp(game.last_changed);
  return final == null || now - final <= POST_WINDOW_MS;
}

/** Football counts quarters; anything past regulation is overtime. */
function periodLabel(raw: string | null): string | null {
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return raw.toUpperCase();
  const n = Number(raw);
  if (n <= 4) return ORDINALS[n];
  return n === 5 ? "OT" : `${n - 4}OT`;
}

function kickoff(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  return at
    .toLocaleString(undefined, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    })
    .toUpperCase();
}

/** "3rd & 5 at NMSU 31" → "3RD & 5" — the yard line is the venue's job. */
function downLabel(raw: string | null): string | null {
  if (!raw) return null;
  return raw
    .split(/\s+at\s+/i)[0]
    .trim()
    .toUpperCase();
}

interface Side {
  name: string;
  abbr: string;
  rank: string | null;
  score: string | null;
  record: string | null;
  logo: string | null;
  color: string;
  trim: string;
  timeouts: number | null;
  down: string | null;
  winProb: number | null;
  lost: boolean;
}

/** Split the sensor into away/home, since a score bug always reads away-first. */
function sides(game: Game): [Side, Side] {
  const a = game.attributes;
  const scored = SCORED.has(game.state);
  const down = downLabel(text(a.down_distance_text));
  const possession = text(a.possession);
  const final = game.state === "POST";

  // ESPN only fills team_winner once it's official; before that the scoreboard
  // is the honest answer, and a tie leaves both sides at full strength.
  const teamScore = Number(a.team_score);
  const oppScore = Number(a.opponent_score);
  const decided = Number.isFinite(teamScore) && Number.isFinite(oppScore);
  const teamLost = final
    ? (a.opponent_winner ?? (decided && oppScore > teamScore)) === true
    : false;
  const oppLost = final
    ? (a.team_winner ?? (decided && teamScore > oppScore)) === true
    : false;

  const team: Side = {
    name: (text(a.team_name) ?? text(a.team_abbr) ?? "—").toUpperCase(),
    abbr: text(a.team_abbr) ?? "—",
    rank: text(a.team_rank),
    score: scored ? (text(a.team_score) ?? "0") : null,
    record: text(a.team_record),
    logo: text(a.team_logo),
    color: text(a.team_colors?.[0]) ?? NEUTRAL,
    trim: text(a.team_colors?.[1]) ?? NEUTRAL_TRIM,
    timeouts: typeof a.team_timeouts === "number" ? a.team_timeouts : null,
    down: possession && possession === text(a.team_id) ? down : null,
    winProb:
      typeof a.team_win_probability === "number"
        ? a.team_win_probability
        : null,
    lost: teamLost,
  };

  const opponent: Side = {
    name: (text(a.opponent_name) ?? text(a.opponent_abbr) ?? "—").toUpperCase(),
    abbr: text(a.opponent_abbr) ?? "—",
    rank: text(a.opponent_rank),
    score: scored ? (text(a.opponent_score) ?? "0") : null,
    record: text(a.opponent_record),
    logo: text(a.opponent_logo),
    color: text(a.opponent_colors?.[0]) ?? NEUTRAL,
    trim: text(a.opponent_colors?.[1]) ?? NEUTRAL_TRIM,
    timeouts:
      typeof a.opponent_timeouts === "number" ? a.opponent_timeouts : null,
    down: possession && possession === text(a.opponent_id) ? down : null,
    winProb:
      typeof a.opponent_win_probability === "number"
        ? a.opponent_win_probability
        : null,
    lost: oppLost,
  };

  return a.team_homeaway === "away" ? [team, opponent] : [opponent, team];
}

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
  const a = game.attributes;

  let state: string;
  if (game.state === "POST") {
    state = "FINAL";
  } else if (game.state === "IN") {
    // ESPN sometimes tacks the period onto the clock ("13:06 - 3rd"), which
    // the period label in front of it would only say again.
    const clock =
      text(a.clock)
        ?.split(/\s+-\s+/)[0]
        .trim() ?? null;
    const period = periodLabel(text(a.quarter));
    state =
      clock && !clock.includes(":")
        ? clock.toUpperCase()
        : [period, clock].filter(Boolean).join("  ");
    if (!state) state = "LIVE";
  } else {
    state = kickoff(a.date) ?? text(a.kickoff_in)?.toUpperCase() ?? "SCHEDULED";
  }

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
        {state}
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
  const { data: config } = useEntitiesConfig();
  // useEntities memoises on the joined ID string, so a fresh array each render
  // doesn't churn the socket subscriptions.
  const results = useEntities<TeamTrackerAttributes>(
    config?.teamTracker ?? EMPTY,
  );

  // The windows below turn on and off with the clock, not with a state change,
  // so re-check them on a timer rather than waiting for the next HA update.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const games = results
    .map((r) => r.data)
    .filter((s): s is Game => !!s && ACTIVE.has(s.state) && inWindow(s, now));

  if (games.length === 0) return null;

  const anyLive = games.some((g) => g.state === "IN");

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
          <ScoreBug key={game.entity_id} game={game} />
        ))}
      </VStack>
    </Board>
  );
}
