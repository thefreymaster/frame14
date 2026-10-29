import { describe, expect, it } from "vitest";
import {
  downLabel,
  inRouteWindow,
  inWindow,
  isLive,
  kickoff,
  NEUTRAL,
  periodLabel,
  POST_WINDOW_MS,
  PRE_WINDOW_MS,
  sides,
  stateLabel,
  text,
  type Game,
  type TeamTrackerAttributes,
} from "../../src/lib/teamTracker";

const now = new Date(2026, 9, 29, 15, 0, 0).getTime();
const at = (ms: number) => new Date(ms).toISOString();

const game = (state: string, attributes: TeamTrackerAttributes = {}, lastChanged = at(now - 3600e3)): Game => ({
  entity_id: "sensor.teamtracker_fsu",
  state,
  attributes,
  last_changed: lastChanged,
  last_updated: lastChanged,
});

describe("text", () => {
  it("trims, and treats Home Assistant's nothings as nothing", () => {
    expect(text(" FSU ")).toBe("FSU");
    expect(text("unknown")).toBe(null);
    expect(text("Unavailable")).toBe(null);
    expect(text("")).toBe(null);
    expect(text(null)).toBe(null);
    expect(text(0)).toBe("0");
  });
});

describe("inWindow (the home card)", () => {
  it("shows a live game, and one within a day of kickoff", () => {
    expect(inWindow(game("IN"), now)).toBe(true);
    expect(inWindow(game("PRE", { date: at(now + 2 * 3600e3) }), now)).toBe(true);
    expect(inWindow(game("PRE", { date: at(now + PRE_WINDOW_MS + 1) }), now)).toBe(false);
  });

  it("keeps a game whose timing it can't read", () => {
    expect(inWindow(game("PRE", { date: "not a date" }), now)).toBe(true);
    expect(inWindow(game("PRE"), now)).toBe(true);
  });

  it("holds a final for a few hours after the whistle", () => {
    expect(inWindow(game("POST", {}, at(now - 3600e3)), now)).toBe(true);
    expect(inWindow(game("POST", {}, at(now - POST_WINDOW_MS - 1)), now)).toBe(false);
  });
});

describe("inRouteWindow (game day)", () => {
  it("is the whole local day of the kickoff", () => {
    expect(inRouteWindow(game("PRE", { date: at(new Date(2026, 9, 29, 23, 30).getTime()) }), now)).toBe(true);
    expect(inRouteWindow(game("POST", { date: at(new Date(2026, 9, 29, 0, 30).getTime()) }), now)).toBe(true);
    expect(inRouteWindow(game("PRE", { date: at(new Date(2026, 9, 30, 0, 30).getTime()) }), now)).toBe(false);
  });

  it("falls back to last_changed without a date, and always shows a live game", () => {
    expect(inRouteWindow(game("POST", {}, at(now - 60e3)), now)).toBe(true);
    expect(inRouteWindow(game("POST", {}, at(now - 2 * 86400e3)), now)).toBe(false);
    expect(inRouteWindow(game("IN", { date: at(now - 2 * 86400e3) }), now)).toBe(true);
  });

  it("isLive is IN alone", () => {
    expect(isLive(game("IN"))).toBe(true);
    expect(isLive(game("PRE"))).toBe(false);
  });
});

describe("labels", () => {
  it("periods: quarters, then overtime", () => {
    expect(periodLabel(null)).toBe(null);
    expect(periodLabel("1")).toBe("1ST");
    expect(periodLabel("4")).toBe("4TH");
    expect(periodLabel("5")).toBe("OT");
    expect(periodLabel("7")).toBe("3OT");
    expect(periodLabel("Half")).toBe("HALF");
  });

  it("down and distance without the yard line", () => {
    expect(downLabel("3rd & 5 at NMSU 31")).toBe("3RD & 5");
    expect(downLabel("1st & 10")).toBe("1ST & 10");
    expect(downLabel(null)).toBe(null);
  });

  it("kickoff as a short weekday and time, upper case", () => {
    expect(kickoff(null)).toBe(null);
    expect(kickoff("nope")).toBe(null);
    const label = kickoff(at(now));
    expect(label).toMatch(/\d:\d\d/);
    expect(label).toBe(label?.toUpperCase());
  });
});

describe("sides", () => {
  const attrs: TeamTrackerAttributes = {
    team_name: "Florida St",
    team_abbr: "FSU",
    team_id: "52",
    team_score: "21",
    team_record: "3-3",
    team_colors: ["#782f40", "#ceb888"],
    team_homeaway: "away",
    opponent_name: "Miami",
    opponent_abbr: "MIA",
    opponent_id: "2390",
    opponent_score: "28",
    opponent_rank: 3,
    possession: "52",
    down_distance_text: "3rd & 5 at MIA 31",
  };

  it("reads away first", () => {
    const [away, home] = sides(game("IN", attrs));
    expect(away.abbr).toBe("FSU");
    expect(home.abbr).toBe("MIA");
    const [a2] = sides(game("IN", { ...attrs, team_homeaway: "home" }));
    expect(a2.abbr).toBe("MIA");
  });

  it("upper-cases names, keeps records and ranks, and falls back on colours", () => {
    const [team, opp] = sides(game("IN", attrs));
    expect(team.name).toBe("FLORIDA ST");
    expect(team.record).toBe("3-3");
    expect(team.color).toBe("#782f40");
    expect(opp.rank).toBe("3");
    expect(opp.color).toBe(NEUTRAL);
  });

  it("shows scores only once the game is on", () => {
    expect(sides(game("PRE", attrs))[0].score).toBe(null);
    expect(sides(game("IN", attrs))[0].score).toBe("21");
    expect(sides(game("IN", { ...attrs, team_score: null }))[0].score).toBe("0");
  });

  it("marks the down on the side with the ball", () => {
    const [team, opp] = sides(game("IN", attrs));
    expect(team.down).toBe("3RD & 5");
    expect(opp.down).toBe(null);
  });

  it("dims the loser after the final, by the flag or the score", () => {
    const [team, opp] = sides(game("POST", attrs));
    expect(team.lost).toBe(true);
    expect(opp.lost).toBe(false);
    const [t2, o2] = sides(game("POST", { ...attrs, team_winner: true, opponent_winner: false }));
    expect(t2.lost).toBe(false);
    expect(o2.lost).toBe(true);
    expect(sides(game("IN", attrs))[0].lost).toBe(false);
  });
});

describe("stateLabel", () => {
  it("FINAL after", () => {
    expect(stateLabel(game("POST"))).toBe("FINAL");
  });

  it("period and clock during, once each", () => {
    expect(stateLabel(game("IN", { quarter: "3", clock: "13:06" }))).toBe("3RD  13:06");
    expect(stateLabel(game("IN", { quarter: "3", clock: "13:06 - 3rd" }))).toBe("3RD  13:06");
    expect(stateLabel(game("IN", { quarter: "2", clock: "Halftime" }))).toBe("HALFTIME");
    expect(stateLabel(game("IN"))).toBe("LIVE");
  });

  it("the kickoff before, or TeamTracker's words, or SCHEDULED", () => {
    expect(stateLabel(game("PRE", { date: at(now) }))).toBe(kickoff(at(now)));
    expect(stateLabel(game("PRE", { kickoff_in: "in 5 hours" }))).toBe("IN 5 HOURS");
    expect(stateLabel(game("PRE"))).toBe("SCHEDULED");
  });
});
