import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The screen's file goes in a temp dir, named before the module reads the
// env.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "frame14-screen-"));
process.env.FRAME14_DATA_DIR = dir;
const screen = await import("../../screen.js");

const HOURS = { enabled: true, on: "06:30", off: "23:00" };
const DARK = { enabled: true, from: "21:00", to: "06:30" };
const file = path.join(dir, "screen.json");
const AUTO = { enabled: true, min: 25, max: 255 };
const fresh = () => ({
  state: "on",
  schedule: { ...screen.DEFAULT_SCHEDULE },
  brightness: null,
  dark: { ...screen.DEFAULT_DARK },
  auto: { ...screen.DEFAULT_AUTO },
  lux: null,
});

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

describe("the dark hours", () => {
  it("are on or off, and two different HH:MM times, from and to", () => {
    expect(screen.normaliseDark(DARK)).toEqual(DARK);
    expect(screen.normaliseDark({ enabled: false, from: "22:00", to: "07:00", on: "x" })).toEqual({
      enabled: false,
      from: "22:00",
      to: "07:00",
    });
    for (const bad of [null, {}, HOURS, { enabled: true, from: "21:00", to: "21:00" }, { enabled: true, from: "21:00" }]) {
      expect(screen.normaliseDark(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it("hold across midnight, and not at all while off", () => {
    expect(screen.inDarkHours(DARK, new Date(2026, 9, 31, 20, 59))).toBe(false);
    expect(screen.inDarkHours(DARK, new Date(2026, 9, 31, 21, 0))).toBe(true);
    expect(screen.inDarkHours(DARK, new Date(2026, 9, 31, 3, 0))).toBe(true);
    expect(screen.inDarkHours(DARK, new Date(2026, 9, 31, 6, 29))).toBe(true);
    expect(screen.inDarkHours(DARK, new Date(2026, 9, 31, 6, 30))).toBe(false);
    expect(screen.inDarkHours({ ...DARK, enabled: false }, new Date(2026, 9, 31, 3, 0))).toBe(false);
  });
});

describe("a brightness", () => {
  it("is a whole number from 0 to 255, as a number or a string of digits", () => {
    expect(screen.normaliseBrightness(0)).toBe(0);
    expect(screen.normaliseBrightness(255)).toBe(255);
    expect(screen.normaliseBrightness("120")).toBe(120);
    for (const bad of [-1, 256, 1.5, "1.5", "abc", "", null, undefined, true]) {
      expect(screen.normaliseBrightness(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});

describe("brightness from the room's light (0.137)", () => {
  it("is on or off and a range of levels, min below max", () => {
    expect(screen.normaliseAuto(AUTO)).toEqual(AUTO);
    expect(screen.normaliseAuto({ enabled: false, min: "0", max: "255" })).toEqual({ enabled: false, min: 0, max: 255 });
    for (const bad of [null, {}, { ...AUTO, enabled: "yes" }, { ...AUTO, min: 300 }, { ...AUTO, min: 200, max: 100 }, { ...AUTO, min: 100, max: 100 }, { ...AUTO, max: -1 }]) {
      expect(screen.normaliseAuto(bad)).toBeNull();
    }
  });

  it("reads a lux value, rounded, and nothing else", () => {
    expect(screen.normaliseLux(120.6)).toBe(121);
    expect(screen.normaliseLux("35")).toBe(35);
    expect(screen.normaliseLux(0)).toBe(0);
    for (const bad of [-1, NaN, Infinity, "", "bright", null, undefined, {}]) expect(screen.normaliseLux(bad)).toBeNull();
  });

  it("puts the level on a log curve from min in the dark to max at LUX_FULL", () => {
    expect(screen.levelForLux(0, AUTO)).toBe(25);
    expect(screen.levelForLux(screen.LUX_FULL, AUTO)).toBe(255);
    expect(screen.levelForLux(5000, AUTO)).toBe(255);
    // A tenth of LUX_FULL is two thirds of the way, not a tenth.
    const tenth = screen.levelForLux(screen.LUX_FULL / 10, AUTO);
    expect(tenth).toBeGreaterThan(25 + 230 * 0.6);
    expect(tenth).toBeLessThan(25 + 230 * 0.7);
    expect(screen.levelForLux(300, { enabled: true, min: 0, max: 100 })).toBe(83);
  });
});

describe("the screen", () => {
  let io;
  let run;
  const sent = (event = "screen") => io.emit.mock.calls.filter((c) => c[0] === event).map((c) => c[1]);
  const saved = () => JSON.parse(fs.readFileSync(file, "utf-8"));

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

  it("starts on with no schedule, no level and no dark hours, and turns the frames off and on when asked", () => {
    run = screen.startScreen(io);
    expect(run.state()).toEqual(fresh());
    run.set("off");
    expect(sent()).toEqual(["off"]);
    expect(io.emit).toHaveBeenCalledWith("screen_state", { ...fresh(), state: "off" });
    run.set("on");
    expect(run.state().state).toBe("on");
    // No level known: none sent with the screen coming on.
    expect(sent("brightness")).toEqual([]);
  });

  it("saves a schedule, applies it at once, and has it back after a restart", () => {
    vi.setSystemTime(new Date(2026, 9, 31, 23, 30));
    run = screen.startScreen(io);
    expect(run.setSchedule(HOURS)).toEqual({ ...fresh(), state: "off", schedule: HOURS });
    // 23:30 is outside the hours: off now.
    expect(sent()).toEqual(["off"]);
    expect(saved()).toEqual({ schedule: HOURS, brightness: null, dark: screen.DEFAULT_DARK, auto: screen.DEFAULT_AUTO });
    run.stop();
    run = screen.startScreen(io);
    expect(run.state().schedule).toEqual(HOURS);
  });

  it("reads the file 0.129 wrote, the schedule by itself", () => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(HOURS));
    run = screen.startScreen(io);
    expect(run.state()).toEqual({ ...fresh(), schedule: HOURS });
  });

  it("turning the schedule off keeps the hours and tells the clients, without touching the screen", () => {
    run = screen.startScreen(io);
    run.setSchedule({ ...HOURS, enabled: false });
    expect(sent()).toEqual([]);
    expect(io.emit).toHaveBeenCalledWith("screen_state", { ...fresh(), schedule: { ...HOURS, enabled: false } });
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

  it("sets the brightness now, keeps it, and sends it again with the screen coming on", () => {
    vi.setSystemTime(new Date(2026, 9, 31, 12, 0));
    run = screen.startScreen(io);
    expect(run.setBrightness(120)).toEqual({ ...fresh(), brightness: 120 });
    expect(sent("brightness")).toEqual([120]);
    expect(saved().brightness).toBe(120);
    io.emit.mockClear();
    run.set("off");
    expect(sent("brightness")).toEqual([]);
    run.set("on");
    expect(sent("brightness")).toEqual([120]);
    run.stop();
    run = screen.startScreen(io);
    expect(run.state().brightness).toBe(120);
  });

  it("takes a frame's own brightness as the level while none is set, outside the dark hours", () => {
    vi.setSystemTime(new Date(2026, 9, 31, 12, 0));
    run = screen.startScreen(io);
    run.report("abc");
    expect(run.state().brightness).toBeNull();
    run.report(15);
    expect(run.state().brightness).toBe(15);
    expect(io.emit).toHaveBeenCalledWith("screen_state", { ...fresh(), brightness: 15 });
    // Set once, a frame arriving says nothing new.
    run.report(200);
    expect(run.state().brightness).toBe(15);
    // In the dark hours a frame is at the dark level, which is not the one to keep.
    run.stop();
    fs.rmSync(file, { force: true });
    vi.setSystemTime(new Date(2026, 9, 31, 23, 0));
    run = screen.startScreen(io);
    run.setDark(DARK);
    run.report(0);
    expect(run.state().brightness).toBeNull();
  });

  it("dims at the dark hours' start, gives the level back at their end, and wakes dark in between", () => {
    vi.setSystemTime(new Date(2026, 9, 31, 12, 0));
    run = screen.startScreen(io);
    run.setBrightness(120);
    // Set in the day: nothing to do now.
    io.emit.mockClear();
    expect(run.setDark(DARK)).toEqual({ ...fresh(), brightness: 120, dark: DARK });
    expect(sent("brightness")).toEqual([120]);
    expect(saved().dark).toEqual(DARK);
    // 20:59:50 → 21:00:10 → 21:00:30: dark, once.
    io.emit.mockClear();
    vi.setSystemTime(new Date(2026, 9, 31, 20, 59, 50));
    vi.advanceTimersByTime(40_000);
    expect(sent("brightness")).toEqual([screen.DARK_BRIGHTNESS]);
    // A wake in the dark hours comes up dark.
    io.emit.mockClear();
    vi.setSystemTime(new Date(2026, 9, 31, 23, 30));
    run.set("on");
    expect(sent("brightness")).toEqual([screen.DARK_BRIGHTNESS]);
    // The slider is live, dark hours or not.
    io.emit.mockClear();
    run.setBrightness(40);
    expect(sent("brightness")).toEqual([40]);
    // 06:29:50 → 06:30:10: the level set comes back.
    io.emit.mockClear();
    vi.setSystemTime(new Date(2026, 10, 1, 6, 29, 50));
    vi.advanceTimersByTime(40_000);
    expect(sent("brightness")).toEqual([40]);
  });

  it("dark hours set during them dim at once, and turned off give the level back", () => {
    vi.setSystemTime(new Date(2026, 9, 31, 23, 0));
    run = screen.startScreen(io);
    run.setBrightness(120);
    io.emit.mockClear();
    run.setDark(DARK);
    expect(sent("brightness")).toEqual([screen.DARK_BRIGHTNESS]);
    io.emit.mockClear();
    run.setDark({ ...DARK, enabled: false });
    expect(sent("brightness")).toEqual([120]);
    // No level known: dark hours turned off have nothing to give back.
    run.stop();
    fs.rmSync(file, { force: true });
    run = screen.startScreen(io);
    io.emit.mockClear();
    run.setDark(DARK);
    expect(sent("brightness")).toEqual([screen.DARK_BRIGHTNESS]);
    io.emit.mockClear();
    run.setDark({ ...DARK, enabled: false });
    expect(sent("brightness")).toEqual([]);
  });

  it("sets the brightness from the room's light while auto is on, a step at a time, and keeps the setting (0.137)", () => {
    vi.setSystemTime(new Date(2026, 9, 31, 12, 0));
    run = screen.startScreen(io);
    // Off by default: a reading is kept for the card and changes nothing.
    run.reportLux(300);
    expect(run.state()).toEqual({ ...fresh(), lux: 300 });
    expect(sent("brightness")).toEqual([]);
    // Turned on, the room's level goes out at once and is the level kept.
    const level = screen.levelForLux(300, AUTO);
    expect(run.setAuto(AUTO)).toEqual({ ...fresh(), auto: AUTO, lux: 300, brightness: level });
    expect(sent("brightness")).toEqual([level]);
    expect(saved()).toEqual({ schedule: screen.DEFAULT_SCHEDULE, brightness: level, dark: screen.DEFAULT_DARK, auto: AUTO });
    // A reading a few lux off asks for a level within AUTO_STEP: nothing sent.
    run.reportLux(320);
    expect(sent("brightness")).toEqual([level]);
    // A darker room: a new level.
    run.reportLux(20);
    const dim = screen.levelForLux(20, AUTO);
    expect(sent("brightness")).toEqual([level, dim]);
    expect(run.state().brightness).toBe(dim);
    // Nothing but lux is a reading.
    run.reportLux("dark");
    expect(run.state().lux).toBe(20);
    // The slider is the end of the room's say.
    run.setBrightness(200);
    expect(run.state().auto).toEqual({ ...AUTO, enabled: false });
    expect(saved().auto.enabled).toBe(false);
    run.reportLux(1000);
    expect(run.state().brightness).toBe(200);
    // The setting is back after a restart; the reading is not.
    run.setAuto(AUTO);
    run.stop();
    run = screen.startScreen(io);
    expect(run.state().auto).toEqual(AUTO);
    expect(run.state().lux).toBeNull();
  });

  it("lets the dark hours win over the room's light, and gives the room's level back at their end", () => {
    vi.setSystemTime(new Date(2026, 9, 31, 22, 0));
    run = screen.startScreen(io);
    run.setDark(DARK);
    run.setAuto(AUTO);
    io.emit.mockClear();
    run.reportLux(500);
    // Inside the dark hours: the reading is kept, the screen stays dark.
    expect(run.state().lux).toBe(500);
    expect(sent("brightness")).toEqual([]);
    // Their end gives the room's level, not the slider's.
    vi.setSystemTime(new Date(2026, 10, 1, 6, 30));
    run.tick();
    expect(sent("brightness")).toEqual([screen.levelForLux(500, AUTO)]);
  });
});
