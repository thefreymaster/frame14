import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  extendTrace,
  fmtData,
  fmtMs,
  isStopped,
  jitterOf,
  liveRate,
  loadSpeedResult,
  mbps,
  median,
  PING_COUNT,
  runSpeedTest,
  saveSpeedResult,
  settledRate,
  speedParts,
  speedTestError,
  STREAMS,
  TRACE_POINTS,
  type Mark,
  type SpeedProgress,
  type SpeedResult,
  type SpeedTransport,
} from "../../src/lib/speedTest";

describe("the arithmetic", () => {
  it("median: the middle, or the middle two's mean", () => {
    expect(median([5, 1, 9])).toBe(5);
    expect(median([4, 1, 9, 6])).toBe(5);
    expect(median([])).toBe(0);
  });

  it("jitter: how far one round trip is from the next, on average", () => {
    expect(jitterOf([4, 6, 4, 6])).toBe(2);
    expect(jitterOf([10, 10, 10])).toBe(0);
    expect(jitterOf([7])).toBe(0);
  });

  it("mbps: megabits a second", () => {
    // 12.5 MB in a second is 100 megabits.
    expect(mbps(12_500_000, 1000)).toBe(100);
    expect(mbps(1_250_000, 100)).toBe(100);
    expect(mbps(1000, 0)).toBe(0);
  });

  // A megabyte every quarter second, but a slow first second: half of it.
  const marks: Mark[] = [
    { t: 0, bytes: 0 },
    { t: 250, bytes: 500_000 },
    { t: 500, bytes: 1_000_000 },
    { t: 750, bytes: 1_500_000 },
    { t: 1000, bytes: 2_000_000 },
    { t: 1250, bytes: 3_000_000 },
    { t: 1500, bytes: 4_000_000 },
    { t: 1750, bytes: 5_000_000 },
    { t: 2000, bytes: 6_000_000 },
  ];

  it("the live figure is the speed over the last second", () => {
    expect(liveRate(marks)).toBe(mbps(4_000_000, 1000));
    // Before a second has passed: over what there is.
    expect(liveRate(marks.slice(0, 3))).toBe(mbps(1_000_000, 500));
    expect(liveRate(marks.slice(0, 1))).toBe(0);
  });

  it("the result leaves the warm-up out", () => {
    expect(settledRate(marks)).toBe(mbps(4_000_000, 1000));
    // The whole of it would have read a third lower.
    expect(mbps(6_000_000, 2000)).toBeLessThan(settledRate(marks) * 0.8);
    // Too short to have a warm-up: all of it.
    expect(settledRate(marks.slice(0, 4))).toBe(mbps(1_500_000, 750));
    expect(settledRate(marks.slice(0, 5))).toBe(mbps(2_000_000, 1000));
  });
});

describe("a transfer's trace", () => {
  it("gains a point a tick", () => {
    expect(extendTrace([], 100, 250)).toEqual([100]);
    expect(extendTrace([100], 200, 500)).toEqual([100, 200]);
    // A timer a little early or late is still its own tick.
    expect(extendTrace([100], 200, 480)).toEqual([100, 200]);
    expect(extendTrace([100], 200, 610)).toEqual([100, 200]);
  });

  it("fills the points a late tick skipped, so each keeps its time", () => {
    // Two ticks in, the third comes at 1.5 s: where the sixth belongs.
    expect(extendTrace([100, 200], 300, 1500)).toEqual([100, 200, 300, 300, 300, 300]);
  });

  it("never has more points than a whole transfer's", () => {
    const whole = Array.from({ length: TRACE_POINTS }, () => 100);
    expect(extendTrace(whole, 200, 5250)).toBe(whole);
    expect(extendTrace(whole.slice(0, -2), 200, 9000)).toHaveLength(TRACE_POINTS);
  });
});

describe("how the figures read", () => {
  it("a speed keeps three figures or so, and turns to Gbps at a thousand", () => {
    expect(speedParts(8.449)).toEqual({ value: 8.449, digits: 2, unit: "Mbps" });
    expect(speedParts(84.5)).toMatchObject({ digits: 1, unit: "Mbps" });
    expect(speedParts(845)).toMatchObject({ digits: 0, unit: "Mbps" });
    expect(speedParts(1240)).toEqual({ value: 1.24, digits: 2, unit: "Gbps" });
    expect(speedParts(12_400)).toMatchObject({ digits: 1, unit: "Gbps" });
  });

  it("never rounds up into the next size's digits", () => {
    // 9.996 would read "10.00", 99.96 "100.0", 999.6 "1000".
    expect(speedParts(9.996).digits).toBe(1);
    expect(speedParts(99.96).digits).toBe(0);
    expect(speedParts(999.6)).toMatchObject({ unit: "Gbps", digits: 2 });
  });

  it("a round trip has a decimal under ten milliseconds", () => {
    expect(fmtMs(2.44)).toBe("2.4 ms");
    expect(fmtMs(9.96)).toBe("10 ms");
    expect(fmtMs(23.6)).toBe("24 ms");
    expect(fmtMs(null)).toBe("—");
  });

  it("the data a test moved", () => {
    expect(fmtData(812_400_000)).toBe("812 MB");
    expect(fmtData(1_240_000_000)).toBe("1.2 GB");
    expect(fmtData(999_700_000)).toBe("1.0 GB");
    expect(fmtData(48_000)).toBe("48 KB");
  });
});

describe("the last result", () => {
  const result: SpeedResult = {
    at: 1_700_000_000_000,
    ping: 3.2,
    jitter: 0.4,
    download: 487,
    upload: 212,
    downloadTrace: [100, 400, 480],
    uploadTrace: [90, 200, 210],
    downloadBytes: 300_000_000,
    uploadBytes: 130_000_000,
  };

  it("is kept on this device", () => {
    expect(loadSpeedResult()).toBeNull();
    saveSpeedResult(result);
    expect(loadSpeedResult()).toEqual(result);
  });

  it("is nothing when what's stored isn't one", () => {
    for (const stored of ["{", "[]", '"fast"', JSON.stringify({ ...result, download: "fast" }), JSON.stringify({ ...result, uploadTrace: [1, null] }), JSON.stringify({ ping: 3 })]) {
      localStorage.setItem("speed-test:last", stored);
      expect(loadSpeedResult(), stored).toBeNull();
    }
  });
});

describe("why a run failed", () => {
  it("says the server's answer, or that it couldn't be reached", () => {
    expect(speedTestError(new Error("The server answered 403"))).toBe("The server answered 403");
    expect(speedTestError(new TypeError("Failed to fetch"))).toBe("The server couldn't be reached");
    expect(speedTestError("?")).toBe("The test couldn't finish");
  });

  it("knows a stop from a failure", () => {
    expect(isStopped(new DOMException("stopped", "AbortError"))).toBe(true);
    expect(isStopped(new Error("The server answered 403"))).toBe(false);
    expect(isStopped(null)).toBe(false);
  });
});

// ---- a run, over a network the test makes up ----

/** `ms` from now on the fake clock, or a rejection the moment `signal` aborts. */
function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const stop = () => {
      clearTimeout(timer);
      reject(new DOMException("aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", stop);
      resolve();
    }, ms);
    signal.addEventListener("abort", stop);
  });
}

/** How often a made-up request moves its bytes, ms. */
const STEP_MS = 10;

/**
 * A request that moves `rate(elapsed)` bytes a second, a step at a time, and
 * ends after `lasts` ms (never, by default: the test's time runs out first).
 */
function requestAt(rate: (elapsedMs: number) => number, lasts = Infinity): SpeedTransport["download"] {
  return async (signal, onBytes) => {
    const started = performance.now();
    while (performance.now() - started < lasts) {
      await wait(STEP_MS, signal);
      onBytes((rate(performance.now() - started) * STEP_MS) / 1000);
    }
  };
}

/** A network: 5 ms round trips, 12.5 MB/s down and 2.5 MB/s up on each stream. */
function network(over: Partial<SpeedTransport> = {}) {
  const calls = { ping: 0, download: 0, upload: 0 };
  const counted =
    <K extends keyof SpeedTransport>(name: K, fn: SpeedTransport[K]) =>
    (...args: Parameters<SpeedTransport[K]>) => {
      calls[name] += 1;
      return (fn as (...a: Parameters<SpeedTransport[K]>) => Promise<void>)(...args);
    };
  const transport: SpeedTransport = {
    ping: counted("ping", over.ping ?? ((signal) => wait(5, signal))),
    download: counted("download", over.download ?? requestAt(() => 12_500_000)),
    upload: counted("upload", over.upload ?? requestAt(() => 2_500_000)),
  };
  return { transport, calls };
}

/** Starts a run and plays the clock until it settles. */
async function play(transport: SpeedTransport, signal?: AbortSignal) {
  const seen: SpeedProgress[] = [];
  const run = runSpeedTest({ transport, signal, onProgress: (p) => seen.push(p) });
  const settled = run.then(
    (result) => ({ result, error: null }),
    (error: unknown) => ({ result: null, error }),
  );
  await vi.advanceTimersByTimeAsync(15_000);
  return { ...(await settled), seen };
}

describe("runSpeedTest", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-13T15:45:00"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("measures the ping, then the download, then the upload", async () => {
    const { transport } = network();
    const { result, seen } = await play(transport);
    expect(result).not.toBeNull();
    expect(result!.ping).toBeCloseTo(5, 5);
    expect(result!.jitter).toBeCloseTo(0, 5);
    // Four streams of 100 Mbps, and of 20.
    expect(result!.download).toBeCloseTo(100 * STREAMS, 0);
    expect(result!.upload).toBeCloseTo(20 * STREAMS, 0);
    // Finished ten seconds and the ping after it began.
    const began = new Date("2026-11-13T15:45:00").getTime();
    expect(result!.at).toBeGreaterThanOrEqual(began + 10_000);
    expect(result!.at).toBeLessThan(began + 10_200);
    // About five seconds of each, give or take a step of the made-up bytes.
    expect(result!.downloadBytes / 1e6).toBeCloseTo(12.5 * STREAMS * 5, -1);
    expect(result!.uploadBytes / 1e6).toBeCloseTo(2.5 * STREAMS * 5, -1);

    // In that order, the progress only ever forward, to the end.
    const phases = seen.map((p) => p.phase).filter((p, i, all) => p !== all[i - 1]);
    expect(phases).toEqual(["ping", "download", "upload"]);
    for (let i = 1; i < seen.length; i += 1) {
      expect(seen[i].progress).toBeGreaterThanOrEqual(seen[i - 1].progress);
    }
    expect(seen.at(-1)!.progress).toBeCloseTo(1, 5);
  });

  it("times the round trips after the one that opens the connection", async () => {
    // The first takes as long as a handshake; the rest go 4, 6, 4, 6…
    let n = 0;
    const { transport, calls } = network({
      ping: (signal) => wait(n++ === 0 ? 180 : n % 2 ? 6 : 4, signal),
    });
    const { result, seen } = await play(transport);
    expect(calls.ping).toBe(PING_COUNT + 1);
    expect(result!.ping).toBeCloseTo(5, 5);
    expect(result!.jitter).toBeCloseTo(2, 5);
    // A reading after each timed one.
    expect(seen.filter((p) => p.phase === "ping")).toHaveLength(PING_COUNT);
    expect(seen[0]).toMatchObject({ phase: "ping", ping: 4, download: null, upload: null });
  });

  it("leaves a transfer's slow start out of its result", async () => {
    // A quarter of the pace for the first 900 ms, as a connection finding
    // its speed.
    const { transport } = network({
      download: requestAt((elapsed) => (elapsed <= 900 ? 3_125_000 : 12_500_000)),
    });
    const { result } = await play(transport);
    expect(result!.download).toBeCloseTo(100 * STREAMS, 0);
  });

  it("reads each transfer a tick at a time: the live figure and its trace", async () => {
    const { transport } = network();
    const { result, seen } = await play(transport);
    expect(result!.downloadTrace).toHaveLength(TRACE_POINTS);
    expect(result!.uploadTrace).toHaveLength(TRACE_POINTS);
    // Each within a step of the made-up network's bytes of the link's speed.
    for (const rate of result!.downloadTrace) expect(Math.abs(rate - 100 * STREAMS)).toBeLessThan(20);

    const downloading = seen.filter((p) => p.phase === "download");
    expect(downloading).toHaveLength(TRACE_POINTS);
    // The trace grows by a point a tick, and the figure is its last.
    downloading.forEach((p, i) => {
      expect(p.downloadTrace).toHaveLength(i + 1);
      expect(p.download).toBe(p.downloadTrace.at(-1));
      expect(p.upload).toBeNull();
    });
    // As the upload starts the download's figure is its result.
    const uploading = seen.filter((p) => p.phase === "upload");
    expect(uploading[0].download).toBe(result!.download);
    expect(uploading[0].uploadTrace).toEqual([]);
  });

  it("asks again as each request ends, for the whole of the time", async () => {
    // Requests that end after 400 ms: a dozen or so a stream.
    const { transport, calls } = network({ download: requestAt(() => 12_500_000, 400) });
    const { result } = await play(transport);
    expect(calls.download).toBeGreaterThan(STREAMS * 10);
    expect(result!.download).toBeCloseTo(100 * STREAMS, 0);
    // The upload's requests outlast it: one a stream.
    expect(calls.upload).toBe(STREAMS);
  });

  it("stops every request when its time is up", async () => {
    const signals: AbortSignal[] = [];
    const moving = requestAt(() => 12_500_000);
    const { transport } = network({
      download: (signal, onBytes) => {
        signals.push(signal);
        return moving(signal, onBytes);
      },
    });
    await play(transport);
    expect(signals).toHaveLength(STREAMS);
    expect(signals.every((s) => s.aborted)).toBe(true);
  });

  it("stopped midway: ends with a stop, its requests cut, and nothing more reported", async () => {
    const stop = new AbortController();
    const signals: AbortSignal[] = [];
    const moving = requestAt(() => 12_500_000);
    const { transport, calls } = network({
      download: (signal, onBytes) => {
        signals.push(signal);
        return moving(signal, onBytes);
      },
    });
    const seen: SpeedProgress[] = [];
    const run = runSpeedTest({ transport, signal: stop.signal, onProgress: (p) => seen.push(p) });
    const settled = run.then(
      () => null,
      (error: unknown) => error,
    );
    // The ping, and two seconds of the download.
    await vi.advanceTimersByTimeAsync(2_055);
    expect(seen.at(-1)!.phase).toBe("download");
    stop.abort();
    const error = await settled;
    expect(isStopped(error)).toBe(true);
    expect(signals.every((s) => s.aborted)).toBe(true);
    const reported = seen.length;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(seen).toHaveLength(reported);
    expect(calls.upload).toBe(0);
  });

  it("stopped before it starts: nothing is asked", async () => {
    const stop = new AbortController();
    stop.abort();
    const { transport, calls } = network();
    const { error } = await play(transport, stop.signal);
    expect(isStopped(error)).toBe(true);
    expect(calls).toEqual({ ping: 0, download: 0, upload: 0 });
  });

  it("fails when the server refuses, at once and without the upload", async () => {
    const { transport, calls } = network({
      download: async (signal) => {
        await wait(20, signal);
        throw new Error("The server answered 403");
      },
    });
    const { result, error, seen } = await play(transport);
    expect(result).toBeNull();
    expect(speedTestError(error)).toBe("The server answered 403");
    expect(calls.upload).toBe(0);
    expect(seen.some((p) => p.phase === "upload")).toBe(false);
  });

  it("fails when the server can't be reached for the ping", async () => {
    const { transport, calls } = network({
      ping: () => Promise.reject(new TypeError("Failed to fetch")),
    });
    const { error } = await play(transport);
    expect(speedTestError(error)).toBe("The server couldn't be reached");
    expect(calls.download).toBe(0);
  });

  it("fails on answers with nothing in them, rather than asking forever", async () => {
    const { transport, calls } = network({ download: (signal) => wait(1, signal) });
    const { error } = await play(transport);
    expect(speedTestError(error)).toBe("The server moved no data");
    expect(calls.download).toBe(STREAMS);
  });
});
