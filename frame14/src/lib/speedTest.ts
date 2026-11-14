// The Speed test page's measurement (0.167.0): how fast this device and the
// Frame14 server reach each other — the Wi-Fi, the LAN, a tunnel from outside
// — and nothing of the internet beyond the server. Three phases against
// routes/speedtest.js: round trips timed one after another, then a download
// and an upload, each a few requests at once for TRANSFER_MS, counted as the
// bytes move and stopped when the time is up.

export type SpeedPhase = "ping" | "download" | "upload";

/** Round trips timed for the ping, after one more that opens the connection. */
export const PING_COUNT = 10;
/** How long the download runs, and then the upload, ms. */
export const TRANSFER_MS = 5_000;
/**
 * The start of a transfer left out of its result: the connections opening
 * and TCP finding its pace, which say nothing of the link's speed.
 */
export const WARMUP_MS = 1_000;
/** Requests at once in a transfer: one alone can sit under a link's speed. */
export const STREAMS = 4;
/** How often a transfer is read: the live figure and a point on its trace. */
export const TICK_MS = 250;
/** The stretch the live figure is the speed over. */
export const LIVE_WINDOW_MS = 1_000;
/** The points a whole transfer's trace has, one a tick. */
export const TRACE_POINTS = TRANSFER_MS / TICK_MS;

/** One download request's bytes; a stream that gets them all asks again. */
const DOWNLOAD_BYTES = 64 * 1024 * 1024;
/** One upload request's body; a stream that has sent it sends it again. */
const UPLOAD_BYTES = 16 * 1024 * 1024;

/** The share of the run's progress bar the ping takes; the transfers halve the rest. */
const PING_SHARE = 0.04;
const TRANSFER_SHARE = (1 - PING_SHARE) / 2;

/** What has been measured so far; null for what hasn't. */
export interface SpeedReading {
  /** The round trip, ms: the median of the timed ones. */
  ping: number | null;
  /** How far one round trip strays from the next, ms. */
  jitter: number | null;
  /** Mbps; the live figure while its phase runs, then its result. */
  download: number | null;
  upload: number | null;
  /** Each transfer's live figure, a tick apart: its sparkline. */
  downloadTrace: number[];
  uploadTrace: number[];
}

export interface SpeedProgress extends SpeedReading {
  phase: SpeedPhase;
  /** How far through the whole run, 0 to 1. */
  progress: number;
}

/** A finished test, as the page keeps it (`speed-test:last`). */
export interface SpeedResult {
  /** When it finished, ms. */
  at: number;
  ping: number;
  jitter: number;
  download: number;
  upload: number;
  downloadTrace: number[];
  uploadTrace: number[];
  /** What the test moved, bytes. */
  downloadBytes: number;
  uploadBytes: number;
}

export const NO_READING: SpeedReading = {
  ping: null,
  jitter: null,
  download: null,
  upload: null,
  downloadTrace: [],
  uploadTrace: [],
};

// ---- the arithmetic ----

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** The mean difference between one round trip and the next, ms. */
export function jitterOf(samples: number[]): number {
  if (samples.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < samples.length; i += 1) {
    sum += Math.abs(samples[i] - samples[i - 1]);
  }
  return sum / (samples.length - 1);
}

/** Megabits a second: `bytes` moved in `ms`. */
export function mbps(bytes: number, ms: number): number {
  return ms > 0 ? (bytes * 8) / (ms * 1000) : 0;
}

/** A transfer's bytes so far at a moment (ms); the first mark is its start. */
export interface Mark {
  t: number;
  bytes: number;
}

/** The speed over the last `windowMs` of the marks (all of them, if shorter). */
export function liveRate(marks: Mark[], windowMs = LIVE_WINDOW_MS): number {
  const last = marks.at(-1);
  if (!last || marks.length < 2) return 0;
  // The latest mark at least a window back, else the start.
  let from = marks[0];
  for (const mark of marks) {
    if (mark.t > last.t - windowMs) break;
    from = mark;
  }
  return mbps(last.bytes - from.bytes, last.t - from.t);
}

/**
 * A transfer's result: its speed from the first mark past the warm-up to the
 * last — or over the whole of one too short to have any.
 */
export function settledRate(marks: Mark[], warmupMs = WARMUP_MS): number {
  const last = marks.at(-1);
  if (!last || marks.length < 2) return 0;
  const warm = marks.find((m) => m.t >= marks[0].t + warmupMs);
  const from = warm && warm !== last ? warm : marks[0];
  return mbps(last.bytes - from.bytes, last.t - from.t);
}

/**
 * A transfer's trace with the reading taken `elapsed` ms in: one more point,
 * or — after a tick that came late, the page busy with the bytes — as many
 * as bring it to that moment, so a point's place along the strip is still its
 * time. Never more than TRACE_POINTS.
 */
export function extendTrace(
  trace: number[],
  rate: number,
  elapsed: number,
): number[] {
  const points = Math.min(
    TRACE_POINTS,
    Math.max(trace.length + 1, Math.round(elapsed / TICK_MS)),
  );
  return points > trace.length
    ? [...trace, ...Array<number>(points - trace.length).fill(rate)]
    : trace;
}

// ---- how the figures read ----

/**
 * A speed as the page writes it: two decimals under 10 Mbps, one under 100,
 * none above, and Gbps from a thousand ("8.45", "84.5", "845", "1.24 Gbps").
 * The thresholds sit where the rounding does, so nothing reads "1000 Mbps".
 */
export function speedParts(value: number): {
  value: number;
  digits: number;
  unit: "Mbps" | "Gbps";
} {
  if (value >= 999.5) {
    const gbps = value / 1000;
    return { value: gbps, digits: gbps >= 9.995 ? 1 : 2, unit: "Gbps" };
  }
  return {
    value,
    digits: value >= 99.95 ? 0 : value >= 9.995 ? 1 : 2,
    unit: "Mbps",
  };
}

/** A round trip or its jitter: "2.4 ms" under ten, "24 ms" from there. */
export function fmtMs(ms: number | null): string {
  if (ms == null || !isFinite(ms)) return "—";
  return `${ms >= 9.95 ? Math.round(ms) : ms.toFixed(1)} ms`;
}

/** What a test moved: "812 MB", "1.2 GB" (a thousand to the next, as Mbps). */
export function fmtData(bytes: number): string {
  if (bytes >= 999.5e6) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`;
  return `${Math.round(bytes / 1e3)} KB`;
}

// ---- the last result, kept on this device ----

const STORAGE_KEY = "speed-test:last";

const isCount = (v: unknown): v is number =>
  typeof v === "number" && isFinite(v) && v >= 0;
const isTrace = (v: unknown): v is number[] =>
  Array.isArray(v) && v.every(isCount);

export function loadSpeedResult(): SpeedResult | null {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "null",
    ) as Partial<SpeedResult> | null;
    if (
      saved &&
      isCount(saved.at) &&
      isCount(saved.ping) &&
      isCount(saved.jitter) &&
      isCount(saved.download) &&
      isCount(saved.upload) &&
      isCount(saved.downloadBytes) &&
      isCount(saved.uploadBytes) &&
      isTrace(saved.downloadTrace) &&
      isTrace(saved.uploadTrace)
    ) {
      return saved as SpeedResult;
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveSpeedResult(result: SpeedResult) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch {
    // ignore
  }
}

// ---- the run ----

/**
 * What a test asks of the network, one request at a time; the browser's is
 * `browserTransport`. Each rejects when its signal aborts.
 */
export interface SpeedTransport {
  /** One round trip to the server. */
  ping(signal: AbortSignal): Promise<void>;
  /** One download, to its end; `onBytes` as its bytes arrive. */
  download(signal: AbortSignal, onBytes: (bytes: number) => void): Promise<void>;
  /** One upload, to its end; `onBytes` as its bytes leave. */
  upload(signal: AbortSignal, onBytes: (bytes: number) => void): Promise<void>;
}

const stopped = () => new DOMException("The test was stopped", "AbortError");

/** Whether a failed run was only stopped (Stop, or leaving the page). */
export function isStopped(error: unknown): boolean {
  return (error as { name?: unknown } | null)?.name === "AbortError";
}

/** Why a run failed, for the page to say. */
export function speedTestError(error: unknown): string {
  // fetch's own failure: no route to the server, or the connection dropped.
  if (error instanceof TypeError) return "The server couldn't be reached";
  return error instanceof Error && error.message
    ? error.message
    : "The test couldn't finish";
}

/**
 * One transfer: STREAMS requests at once, each begun again as it ends, read
 * every TICK_MS and stopped at TRANSFER_MS. Resolves with the marks; rejects
 * if a request fails or `signal` aborts.
 */
function transfer(
  request: SpeedTransport["download"],
  signal: AbortSignal,
  onTick: (marks: Mark[], elapsed: number) => void,
): Promise<Mark[]> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(stopped());
      return;
    }
    // Ends this transfer's requests: its time is up, it failed, or the run
    // was stopped.
    const phase = new AbortController();
    const started = performance.now();
    const marks: Mark[] = [{ t: started, bytes: 0 }];
    let bytes = 0;
    let done = false;

    const timer = setInterval(() => {
      const t = performance.now();
      marks.push({ t, bytes });
      onTick(marks, t - started);
      if (t - started >= TRANSFER_MS) finish();
    }, TICK_MS);

    function finish(error?: unknown) {
      if (done) return;
      done = true;
      clearInterval(timer);
      signal.removeEventListener("abort", onStop);
      phase.abort();
      if (error === undefined) resolve(marks);
      else reject(error);
    }
    function onStop() {
      finish(stopped());
    }
    signal.addEventListener("abort", onStop);

    const stream = async () => {
      while (!phase.signal.aborted) {
        let moved = 0;
        await request(phase.signal, (n) => {
          moved += n;
          bytes += n;
        });
        // An answer with nothing in it would be asked for again at once,
        // forever.
        if (moved === 0) throw new Error("The server moved no data");
      }
    };
    for (let i = 0; i < STREAMS; i += 1) {
      // A request the transfer's own end cut short fails too: not a failure.
      stream().catch((error: unknown) => {
        if (!phase.signal.aborted) finish(error);
      });
    }
  });
}

/**
 * Runs one test: the ping, the download, the upload. `onProgress` hears the
 * reading as it fills in — after each round trip and at each tick of a
 * transfer. Rejects with an AbortError (`isStopped`) when `signal` aborts,
 * and with the failure when the server can't be reached or refuses.
 */
export async function runSpeedTest({
  signal = new AbortController().signal,
  onProgress,
  transport = browserTransport,
}: {
  signal?: AbortSignal;
  onProgress?: (progress: SpeedProgress) => void;
  transport?: SpeedTransport;
} = {}): Promise<SpeedResult> {
  const reading: SpeedReading = { ...NO_READING };
  const report = (phase: SpeedPhase, progress: number) =>
    onProgress?.({ ...reading, phase, progress });

  const pings: number[] = [];
  for (let i = 0; i <= PING_COUNT; i += 1) {
    if (signal.aborted) throw stopped();
    const started = performance.now();
    await transport.ping(signal);
    // The first opens the connection, and takes as long as that does.
    if (i === 0) continue;
    pings.push(performance.now() - started);
    reading.ping = median(pings);
    reading.jitter = jitterOf(pings);
    report("ping", PING_SHARE * (i / PING_COUNT));
  }
  if (signal.aborted) throw stopped();

  const run = async (
    phase: "download" | "upload",
    base: number,
  ): Promise<Mark[]> => {
    let trace: number[] = [];
    const marks = await transfer(transport[phase], signal, (soFar, elapsed) => {
      const rate = liveRate(soFar);
      trace = extendTrace(trace, rate, elapsed);
      reading[phase] = rate;
      if (phase === "download") reading.downloadTrace = trace;
      else reading.uploadTrace = trace;
      report(
        phase,
        base + TRANSFER_SHARE * Math.min(1, elapsed / TRANSFER_MS),
      );
    });
    reading[phase] = settledRate(marks);
    return marks;
  };

  const down = await run("download", PING_SHARE);
  // The download's figure settles as the upload starts.
  report("upload", PING_SHARE + TRANSFER_SHARE);
  const up = await run("upload", PING_SHARE + TRANSFER_SHARE);

  return {
    at: Date.now(),
    ping: reading.ping ?? 0,
    jitter: reading.jitter ?? 0,
    download: reading.download ?? 0,
    upload: reading.upload ?? 0,
    downloadTrace: reading.downloadTrace,
    uploadTrace: reading.uploadTrace,
    downloadBytes: down.at(-1)?.bytes ?? 0,
    uploadBytes: up.at(-1)?.bytes ?? 0,
  };
}

// ---- the browser's requests ----

const refused = (status: number) =>
  new Error(`The server answered ${status}`);

// The upload's body: a megabyte of random bytes (nothing on the way can
// compress them and flatter the figure) repeated to UPLOAD_BYTES, made once
// and sent by every request.
let uploadBody: Blob | null = null;
function uploadBlob(): Blob {
  if (uploadBody) return uploadBody;
  const block = new Uint8Array(1024 * 1024);
  // getRandomValues fills 64 KB at most a call.
  for (let i = 0; i < block.length; i += 65_536) {
    crypto.getRandomValues(block.subarray(i, i + 65_536));
  }
  uploadBody = new Blob(
    Array.from({ length: UPLOAD_BYTES / block.length }, () => block),
    { type: "application/octet-stream" },
  );
  return uploadBody;
}

export const browserTransport: SpeedTransport = {
  async ping(signal) {
    const res = await fetch("/api/speedtest/ping", {
      cache: "no-store",
      signal,
    });
    if (!res.ok) throw refused(res.status);
  },

  async download(signal, onBytes) {
    const res = await fetch(`/api/speedtest/download?bytes=${DOWNLOAD_BYTES}`, {
      cache: "no-store",
      signal,
    });
    if (!res.ok) throw refused(res.status);
    if (!res.body) throw new Error("This browser can't read a download as it arrives");
    // Counted as it arrives and dropped: nothing of it is kept.
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      onBytes(value.byteLength);
    }
  },

  // An XMLHttpRequest, not a fetch: its upload reports progress, which a
  // fetch's request body doesn't anywhere but Chromium over HTTP/2.
  upload(signal, onBytes) {
    return new Promise<void>((resolve, reject) => {
      if (signal.aborted) {
        reject(stopped());
        return;
      }
      const body = uploadBlob();
      const xhr = new XMLHttpRequest();
      let sent = 0;
      const count = (loaded: number) => {
        if (loaded <= sent) return;
        onBytes(loaded - sent);
        sent = loaded;
      };
      const onStop = () => xhr.abort();
      signal.addEventListener("abort", onStop);
      xhr.upload.onprogress = (e) => count(e.loaded);
      xhr.onloadend = () => signal.removeEventListener("abort", onStop);
      xhr.onload = () => {
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(refused(xhr.status));
          return;
        }
        // Whatever the last progress event left uncounted.
        count(body.size);
        resolve();
      };
      xhr.onerror = () => reject(new TypeError("The upload failed"));
      xhr.onabort = () => reject(stopped());
      xhr.open("POST", "/api/speedtest/upload");
      xhr.send(body);
    });
  },
};
