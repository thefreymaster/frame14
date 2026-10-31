import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The schedule's file goes in a temp dir, named before the module reads
// the env.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "frame14-screen-"));
process.env.FRAME14_DATA_DIR = dir;
const screen = await import("../../screen.js");

const HOURS = { enabled: true, on: "06:30", off: "23:00" };
const file = path.join(dir, "screen.json");

afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("a schedule", () => {
  it("is on or off, and two different HH:MM times", () => {
    expect(screen.normaliseSchedule(HOURS)).toEqual(HOURS);
    expect(screen.normaliseSchedule({ enabled: false, on: "20:00", off: "02:00", extra: 1 })).toEqual({
      enabled: false,
      on: "20:00",
      off: "02:00",
    });
    for (const bad of [
      null,
      "x",
      {},
      { enabled: "yes", on: "06:30", off: "23:00" },
      { enabled: true, on: "6:30", off: "23:00" },
      { enabled: true, on: "06:30", off: "24:00" },
      { enabled: true, on: "06:30", off: "06:30" },
    ]) {
      expect(screen.normaliseSchedule(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it("says when the screen is on, across midnight too", () => {
    expect(screen.scheduledOn(HOURS, new Date(2026, 9, 31, 6, 29))).toBe(false);
    expect(screen.scheduledOn(HOURS, new Date(2026, 9, 31, 6, 30))).toBe(true);
    expect(screen.scheduledOn(HOURS, new Date(2026, 9, 31, 22, 59))).toBe(true);
    expect(screen.scheduledOn(HOURS, new Date(2026, 9, 31, 23, 0))).toBe(false);
    const night = { enabled: true, on: "20:00", off: "02:00" };
    expect(screen.scheduledOn(night, new Date(2026, 9, 31, 23, 30))).toBe(true);
    expect(screen.scheduledOn(night, new Date(2026, 9, 31, 1, 59))).toBe(true);
    expect(screen.scheduledOn(night, new Date(2026, 9, 31, 2, 0))).toBe(false);
    expect(screen.scheduledOn(night, new Date(2026, 9, 31, 12, 0))).toBe(false);
  });
});

describe("the screen", () => {
  let io;
  let run;
  const sent = () => io.emit.mock.calls.filter((c) => c[0] === "screen").map((c) => c[1]);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "log").mockImplementation(() => {});
    io = { emit: vi.fn() };
  });
  afterEach(() => {
    run?.stop();
    run = null;
    vi.useRealTimers();
    vi.restoreAllMocks();
    fs.rmSync(file, { force: true });
  });

  it("starts on with no schedule, and turns the frames off and on when asked", () => {
    run = screen.startScreen(io);
    expect(run.state()).toEqual({ state: "on", schedule: { ...screen.DEFAULT_SCHEDULE } });
    run.set("off");
    expect(sent()).toEqual(["off"]);
    expect(io.emit).toHaveBeenCalledWith("screen_state", { state: "off", schedule: { ...screen.DEFAULT_SCHEDULE } });
    run.set("on");
    expect(run.state().state).toBe("on");
  });

  it("saves a schedule, applies it at once, and has it back after a restart", () => {
    vi.setSystemTime(new Date(2026, 9, 31, 23, 30));
    run = screen.startScreen(io);
    expect(run.setSchedule(HOURS)).toEqual({ state: "off", schedule: HOURS });
    // 23:30 is outside the hours: off now.
    expect(sent()).toEqual(["off"]);
    expect(JSON.parse(fs.readFileSync(file, "utf-8"))).toEqual(HOURS);
    run.stop();
    run = screen.startScreen(io);
    expect(run.state().schedule).toEqual(HOURS);
  });

  it("turning the schedule off keeps the hours and tells the clients, without touching the screen", () => {
    run = screen.startScreen(io);
    run.setSchedule({ ...HOURS, enabled: false });
    expect(sent()).toEqual([]);
    expect(io.emit).toHaveBeenCalledWith("screen_state", { state: "on", schedule: { ...HOURS, enabled: false } });
  });

  it("turns the screen on and off at the scheduled minutes, once each", () => {
    vi.setSystemTime(new Date(2026, 9, 31, 6, 29, 30));
    run = screen.startScreen(io);
    run.setSchedule(HOURS);
    io.emit.mockClear();
    // 06:29:50 — not yet.
    vi.advanceTimersByTime(20_000);
    expect(sent()).toEqual([]);
    // 06:30:10 and 06:30:30 — once.
    vi.advanceTimersByTime(40_000);
    expect(sent()).toEqual(["on"]);
    // 22:59:50 → 23:00:10 → 23:00:30 — off, once.
    io.emit.mockClear();
    vi.setSystemTime(new Date(2026, 9, 31, 22, 59, 50));
    vi.advanceTimersByTime(40_000);
    expect(sent()).toEqual(["off"]);
    expect(run.state().state).toBe("off");
  });

  it("does nothing at those minutes while the schedule is off", () => {
    vi.setSystemTime(new Date(2026, 9, 31, 6, 29, 50));
    run = screen.startScreen(io);
    run.setSchedule({ ...HOURS, enabled: false });
    io.emit.mockClear();
    vi.advanceTimersByTime(60_000);
    expect(io.emit).not.toHaveBeenCalled();
  });
});
