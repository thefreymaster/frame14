import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SpeedProgress, SpeedResult } from "../../src/lib/speedTest";
import { renderWithProviders } from "./helpers/render";

// The run itself (lib/speedTest's runSpeedTest, which the page starts) as
// the test plays it: what it was started with, and its end in the test's
// hands. The rest of the lib is the real one.
const live = vi.hoisted(() => ({
  run: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("../../src/lib/speedTest", async (original) => ({
  ...(await original<typeof import("../../src/lib/speedTest")>()),
  runSpeedTest: live.run,
}));
vi.mock("../../src/components/ui/toaster", () => ({
  toaster: { create: live.toast },
}));
vi.mock("../../src/hooks/useConnectionInfo", () => ({
  useConnectionInfo: () => ({ data: { client: { address: "192.168.1.42" } } }),
}));

import { SpeedTest } from "../../src/routes/SpeedTest";

type Started = {
  signal: AbortSignal;
  onProgress: (progress: SpeedProgress) => void;
  finish: (result: SpeedResult) => void;
  fail: (error: unknown) => void;
};

/** The runs the page has started, each with its end to call. */
let runs: Started[];

const RESULT: SpeedResult = {
  at: new Date("2026-11-13T15:45:00").getTime(),
  ping: 3.24,
  jitter: 0.42,
  download: 487.2,
  upload: 21.25,
  downloadTrace: [120, 430, 480, 490],
  uploadTrace: [9, 19, 21, 21],
  downloadBytes: 300_000_000,
  uploadBytes: 13_000_000,
};

const reading = (over: Partial<SpeedProgress>): SpeedProgress => ({
  phase: "ping",
  progress: 0,
  ping: null,
  jitter: null,
  download: null,
  upload: null,
  downloadTrace: [],
  uploadTrace: [],
  ...over,
});

const card = () => document.querySelector("[data-speed-test]")!;
const readout = (kind: "download" | "upload") => document.querySelector(`[data-speed-readout="${kind}"]`)!;
const stat = (label: string) =>
  [...document.querySelectorAll(".chakra-stat__root")].find((s) => s.textContent.startsWith(label))!.querySelector(".chakra-stat__valueText")!;
const status = () => document.querySelector("[data-speed-status]")!;
const button = (name: string) => screen.getByRole("button", { name });

beforeEach(() => {
  runs = [];
  live.toast.mockReset();
  live.run.mockReset();
  live.run.mockImplementation(({ signal, onProgress }: Pick<Started, "signal" | "onProgress">) =>
    new Promise<SpeedResult>((finish, fail) => {
      runs.push({ signal, onProgress, finish, fail });
      // As the real one: stopped, it ends with an AbortError.
      signal.addEventListener("abort", () => fail(new DOMException("stopped", "AbortError")));
    }),
  );
  // Today, for "Last tested 3:45 PM"; only the date is faked.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-13T16:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("the Speed test page", () => {
  it("before any test: Start, no figures, and what it measures", () => {
    renderWithProviders(<SpeedTest />);
    expect(screen.getByRole("heading", { name: "Speed test" })).toBeInTheDocument();
    expect(button("Start")).toBeInTheDocument();
    expect(card()).toHaveAttribute("data-speed-test", "idle");
    for (const kind of ["download", "upload"] as const) {
      expect(readout(kind)).toHaveAttribute("data-value", "");
      expect(readout(kind)).toHaveTextContent("—");
      expect(readout(kind).querySelector("[data-speed-trace]")).toHaveAttribute("data-speed-trace", "0");
    }
    expect(stat("Ping")).toHaveTextContent("—");
    expect(stat("Jitter")).toHaveTextContent("—");
    // The two ends of what is measured.
    expect(stat("This device")).toHaveTextContent("192.168.1.42");
    expect(stat("Server")).toHaveTextContent(window.location.host);
    expect(status()).toHaveTextContent("between this device and the Frame14 server, not the internet");
    // Nothing runs until asked.
    expect(live.run).not.toHaveBeenCalled();
  });

  it("Start runs a test, and the figures fill in as it goes", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SpeedTest />);
    await user.click(button("Start"));
    expect(live.run).toHaveBeenCalledTimes(1);
    expect(card()).toHaveAttribute("data-speed-test", "running");
    expect(card()).toHaveAttribute("data-speed-phase", "ping");
    expect(button("Stop")).toBeInTheDocument();
    expect(status()).toHaveTextContent("Timing the round trip…");

    act(() => runs[0].onProgress(reading({ phase: "ping", progress: 0.04, ping: 3.24, jitter: 0.42 })));
    expect(stat("Ping")).toHaveTextContent("3.2 ms");
    expect(stat("Jitter")).toHaveTextContent("0.4 ms");

    // Mid-download: its figure is the speed now, its trace three ticks in.
    act(() =>
      runs[0].onProgress(
        reading({ phase: "download", progress: 0.2, ping: 3.24, jitter: 0.42, download: 462.4, downloadTrace: [120, 430, 462.4] }),
      ),
    );
    expect(card()).toHaveAttribute("data-speed-phase", "download");
    expect(status()).toHaveTextContent("Testing the download…");
    expect(readout("download")).toHaveAttribute("data-value", "462 Mbps");
    expect(readout("download")).toHaveAttribute("data-active");
    expect(readout("download").querySelector("[data-speed-trace]")).toHaveAttribute("data-speed-trace", "3");
    expect(readout("download").querySelector("[data-speed-dot]")).not.toBeNull();
    expect(readout("upload")).toHaveAttribute("data-value", "");
    expect(readout("upload")).not.toHaveAttribute("data-active");
    expect(screen.getByRole("progressbar", { name: "Speed test progress" })).toHaveAttribute("aria-valuenow", "20");

    // The upload's turn: the download's figure has settled, without its dot.
    act(() =>
      runs[0].onProgress(
        reading({ phase: "upload", progress: 0.7, ping: 3.24, jitter: 0.42, download: 487.2, downloadTrace: RESULT.downloadTrace, upload: 19.31, uploadTrace: [9, 19.31] }),
      ),
    );
    expect(status()).toHaveTextContent("Testing the upload…");
    expect(readout("download")).toHaveAttribute("data-value", "487 Mbps");
    expect(readout("download").querySelector("[data-speed-dot]")).toBeNull();
    expect(readout("upload")).toHaveAttribute("data-value", "19.3 Mbps");
    expect(readout("upload")).toHaveAttribute("data-active");
  });

  it("a finished test stays on the page, is kept on the device, and can be run again", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SpeedTest />);
    await user.click(button("Start"));
    await act(async () => runs[0].finish(RESULT));

    expect(card()).toHaveAttribute("data-speed-test", "done");
    expect(readout("download")).toHaveAttribute("data-value", "487 Mbps");
    expect(readout("upload")).toHaveAttribute("data-value", "21.3 Mbps");
    expect(readout("upload")).not.toHaveAttribute("data-active");
    expect(stat("Ping")).toHaveTextContent("3.2 ms");
    expect(status()).toHaveTextContent("Last tested 3:45 PM · 313 MB of data used");
    expect(JSON.parse(localStorage.getItem("speed-test:last")!)).toEqual(RESULT);

    await user.click(button("Test again"));
    expect(live.run).toHaveBeenCalledTimes(2);
    // The new run starts from nothing, not from the last one's figures.
    expect(readout("download")).toHaveAttribute("data-value", "");
    expect(stat("Ping")).toHaveTextContent("—");
  });

  it("shows the last test this device ran, on arriving", () => {
    localStorage.setItem("speed-test:last", JSON.stringify({ ...RESULT, download: 1240, at: new Date("2026-11-12T09:00:00").getTime() }));
    renderWithProviders(<SpeedTest />);
    expect(card()).toHaveAttribute("data-speed-test", "done");
    expect(readout("download")).toHaveAttribute("data-value", "1.24 Gbps");
    expect(readout("download")).toHaveTextContent("1.24Gbps");
    expect(readout("download").querySelector("[data-speed-trace]")).toHaveAttribute("data-speed-trace", "4");
    expect(status()).toHaveTextContent("Last tested yesterday · 313 MB of data used");
    expect(button("Test again")).toBeInTheDocument();
    expect(live.run).not.toHaveBeenCalled();
  });

  it("Stop ends the run with nothing kept, and no complaint", async () => {
    const user = userEvent.setup();
    localStorage.setItem("speed-test:last", JSON.stringify(RESULT));
    renderWithProviders(<SpeedTest />);
    await user.click(button("Test again"));
    act(() => runs[0].onProgress(reading({ phase: "download", progress: 0.3, download: 90, downloadTrace: [90] })));
    expect(readout("download")).toHaveAttribute("data-value", "90.0 Mbps");

    await user.click(button("Stop"));
    expect(runs[0].signal.aborted).toBe(true);
    // Back to the last finished test's figures.
    await waitFor(() => expect(card()).toHaveAttribute("data-speed-test", "done"));
    expect(readout("download")).toHaveAttribute("data-value", "487 Mbps");
    expect(button("Test again")).toBeInTheDocument();
    expect(live.toast).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem("speed-test:last")!)).toEqual(RESULT);
  });

  it("a test that fails says why, and the page is ready for another", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SpeedTest />);
    await user.click(button("Start"));
    await act(async () => runs[0].fail(new TypeError("Failed to fetch")));

    expect(live.toast).toHaveBeenCalledWith({
      type: "error",
      title: "The speed test didn't finish",
      description: "The server couldn't be reached",
    });
    expect(card()).toHaveAttribute("data-speed-test", "idle");
    expect(localStorage.getItem("speed-test:last")).toBeNull();
    await user.click(button("Start"));
    expect(live.run).toHaveBeenCalledTimes(2);
  });

  it("leaving the page ends a test under way", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(<SpeedTest />);
    await user.click(button("Start"));
    expect(runs[0].signal.aborted).toBe(false);
    unmount();
    expect(runs[0].signal.aborted).toBe(true);
  });
});
