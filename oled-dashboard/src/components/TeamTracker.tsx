import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import { IoTrophyOutline } from "react-icons/io5";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { useEntities, type HAState } from "../hooks/useEntity";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { Board } from "./Board";
import {
  CHIP_GAP,
  CHIP_PADDING_X,
  CHIP_PADDING_Y,
  CHIP_RADIUS,
} from "../lib/surfaces";

/**
 * TeamTracker (HACS) publishes one sensor per tracked team. The state is the
 * game phase and the whole game rides along in the attributes — HA keeps the
 * keys even when the integration has nothing to report, so every field is
 * nullable. Fields we don't render yet are typed anyway: this card is the data
 * connection, and the designed version will want them.
 */
export interface TeamTrackerAttributes {
  sport?: string | null;
  league?: string | null;
  team_abbr?: string | null;
  team_name?: string | null;
  team_score?: string | null;
  team_record?: string | null;
  team_homeaway?: string | null;
  team_logo?: string | null;
  opponent_abbr?: string | null;
  opponent_name?: string | null;
  opponent_score?: string | null;
  opponent_record?: string | null;
  opponent_homeaway?: string | null;
  opponent_logo?: string | null;
  date?: string | null;
  kickoff_in?: string | null;
  venue?: string | null;
  quarter?: string | number | null;
  clock?: string | null;
  tv_network?: string | null;
  last_play?: string | null;
  friendly_name?: string | null;
}

type Game = HAState<TeamTrackerAttributes>;

/** PRE = scheduled, IN = playing, POST = finished. BYE and NOT_FOUND hide. */
const ACTIVE = new Set(["PRE", "IN", "POST"]);
const SCORED = new Set(["IN", "POST"]);

const NO_DATA = new Set(["", "unknown", "unavailable", "none"]);

const EMPTY: string[] = [];

function text(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return NO_DATA.has(trimmed.toLowerCase()) ? null : trimmed;
}

function kickoff(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  return at.toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusLine(state: string, a: TeamTrackerAttributes): string {
  switch (state) {
    case "IN": {
      // Football counts quarters, other sports report halves or periods by
      // name — only dress up the value when it's a bare number.
      const raw = text(a.quarter);
      const period = raw ? (/^\d+$/.test(raw) ? `Q${raw}` : raw) : null;
      return [period, text(a.clock)].filter(Boolean).join("  ") || "Live";
    }
    case "POST":
      return "Final";
    default:
      return kickoff(a.date) ?? text(a.kickoff_in) ?? "Scheduled";
  }
}

function GameChip({ game }: { game: Game }) {
  const a = game.attributes;
  const name =
    text(a.friendly_name) ??
    text(a.team_name) ??
    text(a.team_abbr) ??
    game.entity_id;
  const league = text(a.league) ?? text(a.sport);
  const teamAbbr = text(a.team_abbr);
  const opponentAbbr = text(a.opponent_abbr);
  const away = a.team_homeaway === "away";
  const live = game.state === "IN";
  const network = text(a.tv_network);

  const scores = SCORED.has(game.state)
    ? [text(a.team_score) ?? "0", text(a.opponent_score) ?? "0"]
    : null;

  return (
    <VStack
      align="stretch"
      gap="0.6vmin"
      minW="0"
      bg={live ? "var(--theme-surface-2-on)" : "var(--theme-surface-2)"}
      borderRadius={CHIP_RADIUS}
      px={CHIP_PADDING_X}
      py={CHIP_PADDING_Y}
    >
      <HStack justify="space-between" align="baseline" gap="1vmin" minW="0">
        <Text
          fontSize="2vmin"
          color="var(--theme-fg-faint)"
          letterSpacing="0.06em"
          overflow="hidden"
          whiteSpace="nowrap"
          textOverflow="ellipsis"
          minW="0"
        >
          {name}
        </Text>
        {league && (
          <Text
            fontSize="1.8vmin"
            color="var(--theme-fg-faint)"
            letterSpacing="0.08em"
            flexShrink={0}
          >
            {league}
          </Text>
        )}
      </HStack>

      <HStack justify="space-between" align="baseline" gap="1.5vmin" minW="0">
        <Text
          fontSize="3vmin"
          color="var(--theme-fg-dim)"
          fontWeight="300"
          letterSpacing="0.04em"
          overflow="hidden"
          whiteSpace="nowrap"
          textOverflow="ellipsis"
          minW="0"
        >
          {teamAbbr ?? "—"}
          <Text as="span" color="var(--theme-fg-faint)" mx="1vmin">
            {away ? "@" : "vs"}
          </Text>
          {opponentAbbr ?? "—"}
        </Text>
        {scores && (
          <Text
            className="display-numeral"
            fontSize="3.4vmin"
            color="var(--theme-fg)"
            fontWeight="300"
            lineHeight="1"
            flexShrink={0}
          >
            {scores[0]}–{scores[1]}
          </Text>
        )}
      </HStack>

      <HStack justify="space-between" align="baseline" gap="1vmin" minW="0">
        <Text
          fontSize="2vmin"
          color={live ? "var(--theme-fg-dim)" : "var(--theme-fg-faint)"}
          letterSpacing="0.06em"
          overflow="hidden"
          whiteSpace="nowrap"
          textOverflow="ellipsis"
          minW="0"
        >
          {statusLine(game.state, a)}
        </Text>
        {network && (
          <Text
            fontSize="1.8vmin"
            color="var(--theme-fg-faint)"
            letterSpacing="0.08em"
            flexShrink={0}
          >
            {network}
          </Text>
        )}
      </HStack>
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

  const games = results
    .map((r) => r.data)
    .filter((s): s is Game => !!s && ACTIVE.has(s.state));

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
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fill, minmax(34vmin, 1fr))"
        gap={CHIP_GAP}
        width="100%"
      >
        {games.map((game) => (
          <GameChip key={game.entity_id} game={game} />
        ))}
      </Box>
    </Board>
  );
}
