import { describe, expect, it, vi } from "vitest";
import { ECHO_TIMEOUT_MS, installSocketWake, wakeSocket } from "../../src/lib/socketWake";

// The socket as socketWake sees it: connected or not, and the timed echo's
// ack, answered by hand.
function fakeSocket(connected: boolean) {
  const acks: Array<(err: Error | null) => void> = [];
  const s = {
    connected,
    connect: vi.fn(),
    disconnect: vi.fn(),
    timeout: vi.fn(() => ({ emit: vi.fn((_event: string, ack: (err: Error | null) => void) => acks.push(ack)) })),
    acks,
  };
  return s;
}

describe("the socket on the page's return (0.139)", () => {
  it("opens a fresh connection when the socket is down", () => {
    const s = fakeSocket(false);
    wakeSocket(s);
    expect(s.disconnect).toHaveBeenCalledTimes(1);
    expect(s.connect).toHaveBeenCalledTimes(1);
    expect(s.timeout).not.toHaveBeenCalled();
  });

  it("asks a connected socket for an echo, and reconnects only when none comes", () => {
    const s = fakeSocket(true);
    wakeSocket(s);
    expect(s.timeout).toHaveBeenCalledWith(ECHO_TIMEOUT_MS);
    expect(s.acks).toHaveLength(1);
    s.acks[0](null);
    expect(s.disconnect).not.toHaveBeenCalled();
    wakeSocket(s);
    s.acks[1](new Error("operation has timed out"));
    expect(s.disconnect).toHaveBeenCalledTimes(1);
    expect(s.connect).toHaveBeenCalledTimes(1);
  });

  it("listens for the page's return, and only acts while it is visible", () => {
    const s = fakeSocket(false);
    const doc = { addEventListener: vi.fn(), visibilityState: "hidden" as DocumentVisibilityState };
    const win = { addEventListener: vi.fn() };
    const onReturn = installSocketWake(s, doc, win);
    expect(doc.addEventListener).toHaveBeenCalledWith("visibilitychange", onReturn);
    expect(win.addEventListener).toHaveBeenCalledWith("pageshow", onReturn);
    expect(win.addEventListener).toHaveBeenCalledWith("online", onReturn);
    onReturn();
    expect(s.connect).not.toHaveBeenCalled();
    doc.visibilityState = "visible";
    onReturn();
    expect(s.connect).toHaveBeenCalledTimes(1);
  });
});
