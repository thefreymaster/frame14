import type { HAState } from "../hooks/useEntity";

/**
 * TeamTracker (HACS) publishes one sensor per tracked team. The state is the
 * game phase and the whole game rides along in the attributes — HA keeps the
 * keys even when the integration has nothing to report, so every field is
 * nullable.
 *
 * Everything here is shared between the home card, the /football route and the
 * nav item that shows that route, so all three agree on what a game is and when
 * it counts as worth showing.
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

export type Game = HAState<TeamTrackerAttributes>;

/** PRE = scheduled, IN = playing, POST = finished. BYE and NOT_FOUND hide. */
export const ACTIVE = new Set(["PRE", "IN", "POST"]);
export const SCORED = new Set(["IN", "POST"]);

// TeamTracker sits on PRE as soon as ESPN schedules the next game — days out —
// and holds POST until it rolls over to that next game, so the raw state would
// leave the card up all season. Show a game only near its own kickoff.
export const PRE_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Measured from the flip to POST, which lands on the final whistle. */
export const POST_WINDOW_MS = 6 * 60 * 60 * 1000;

export const TICK_MS = 60 * 1000;

const NO_DATA = new Set(["", "unknown", "unavailable", "none"]);

/** Stable empty array — useEntities memoises on identity, not contents. */
export const EMPTY: string[] = [];

/** Fallback colours when ESPN gives a school no palette. */
export const NEUTRAL = "#3A3A42";
export const NEUTRAL_TRIM = "#5A5A66";

const ORDINALS = ["", "1ST", "2ND", "3RD", "4TH"];

export function text(value: unknown): string | null {
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
 * The home card's window: a game is worth a chip while it's on, in the day
 * before kickoff, and for a few hours after the final. A game whose timing we
 * can't read stays visible — better a stale chip than a missing one.
 */
export function inWindow(game: Game, now: number): boolean {
  if (game.state === "IN") return true;

  if (game.state === "PRE") {
    const kickoff = timestamp(game.attributes.date);
    return kickoff == null || kickoff - now <= PRE_WINDOW_MS;
  }

  const final = timestamp(game.last_changed);
  return final == null || now - final <= POST_WINDOW_MS;
}

function sameLocalDay(a: number, b: number): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}

/**
 * The /football route's window: game day, all of it.
 *
 * The route and its nav tab are there from midnight to midnight on the day of
 * the game, so the run-up and the whole evening after the final are one tap
 * away. Keyed on the game's own kickoff rather than the sensor's last_changed,
 * which is the more honest answer for "which day is this game on" and survives
 * a Home Assistant restart; last_changed is only the fallback for a sensor not
 * reporting a date. A live game always shows, including one that runs past
 * midnight.
 */
export function inRouteWindow(game: Game, now: number): boolean {
  if (game.state === "IN") return true;
  const at = timestamp(game.attributes.date) ?? timestamp(game.last_changed);
  return at == null || sameLocalDay(at, now);
}

/** Ball actually in play, as opposed to merely scheduled or finished. */
export function isLive(game: Game): boolean {
  return game.state === "IN";
}

/** Football counts quarters; anything past regulation is overtime. */
export function periodLabel(raw: string | null): string | null {
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return raw.toUpperCase();
  const n = Number(raw);
  if (n <= 4) return ORDINALS[n];
  return n === 5 ? "OT" : `${n - 4}OT`;
}

export function kickoff(iso: string | null | undefined): string | null {
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
export function downLabel(raw: string | null): string | null {
  if (!raw) return null;
  return raw
    .split(/\s+at\s+/i)[0]
    .trim()
    .toUpperCase();
}

export interface Side {
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
export function sides(game: Game): [Side, Side] {
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

/**
 * Game state as a score bug says it — FINAL after, period and clock during,
 * kickoff time before.
 */
export function stateLabel(game: Game): string {
  const a = game.attributes;

  if (game.state === "POST") return "FINAL";

  if (game.state === "IN") {
    // ESPN sometimes tacks the period onto the clock ("13:06 - 3rd"), which
    // the period label in front of it would only say again.
    const clock =
      text(a.clock)
        ?.split(/\s+-\s+/)[0]
        .trim() ?? null;
    const period = periodLabel(text(a.quarter));
    const label =
      clock && !clock.includes(":")
        ? clock.toUpperCase()
        : [period, clock].filter(Boolean).join("  ");
    return label || "LIVE";
  }

  return kickoff(a.date) ?? text(a.kickoff_in)?.toUpperCase() ?? "SCHEDULED";
}
