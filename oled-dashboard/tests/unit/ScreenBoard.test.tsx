import { act, fireEvent, screen as dom, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "./helpers/render";

// The socket (its handlers kept, so a test can play the server's
// screen_state) and the toaster.
const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (v: unknown) => void>(),
  toast: vi.fn(),
}));
vi.mock("../../src/lib/socket", () => ({
  socket: {
    emit: vi.fn(),
    on: (event: string, fn: (v: unknown) => void) => {
      mocks.handlers.set(event, fn);
    },
    off: vi.fn(),
  },
}));
vi.mock("../../src/components/ui/toaster", () => ({
  toaster: { create: mocks.toast },
}));

import { ScreenBoard } from "../../src/components/ScreenBoard";

const HOURS = { enabled: false, on: "06:30", off: "23:00" };
const fromServer = (v: unknown) => act(() => mocks.handlers.get("screen_state")?.(v));

describe("the Screen card", () => {
  const fetchMock = vi.fn();
  const puts = () =>
    fetchMock.mock.calls
      .filter((c) => (c[1] as RequestInit | undefined)?.method === "PUT")
      .map((c) => JSON.parse(String((c[1] as RequestInit).body)) as typeof HOURS);

  beforeEach(() => {
    fetchMock.mockReset();
    // The server: a state command is taken; a schedule comes back applied,
    // unless its two times are the same.
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        const schedule = JSON.parse(String(init.body)) as typeof HOURS;
        if (schedule.on === schedule.off) return { ok: false, status: 400, json: async () => ({}) };
        return { ok: true, status: 200, json: async () => ({ state: "on", schedule }) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);
    fromServer({ state: "on", schedule: HOURS });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    mocks.toast.mockReset();
  });

  it("turns the frames' screen off and on, as an automation would", async () => {
    renderWithProviders(<ScreenBoard />);
    const power = dom.getByRole("checkbox", { name: "Screen on" });
    expect(power).toBeChecked();
    fireEvent.click(power);
    expect(power).not.toBeChecked();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/screen/off"));
    fireEvent.click(power);
    expect(power).toBeChecked();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/screen/on"));
  });

  it("saves the schedule: on, and the hours", async () => {
    renderWithProviders(<ScreenBoard />);
    fireEvent.click(dom.getByRole("checkbox", { name: "On a schedule" }));
    await waitFor(() => expect(dom.getByRole("checkbox", { name: "On a schedule" })).toBeChecked());
    expect(puts().at(-1)).toEqual({ ...HOURS, enabled: true });
    fireEvent.change(dom.getByLabelText("On at"), { target: { value: "07:00" } });
    await waitFor(() => expect(puts().at(-1)).toEqual({ enabled: true, on: "07:00", off: "23:00" }));
    await waitFor(() => expect(dom.getByLabelText("On at")).toHaveValue("07:00"));
    fireEvent.change(dom.getByLabelText("Off at"), { target: { value: "22:00" } });
    await waitFor(() => expect(puts().at(-1)).toEqual({ enabled: true, on: "07:00", off: "22:00" }));
  });

  it("keeps what it had when the server refuses, and says so", async () => {
    renderWithProviders(<ScreenBoard />);
    fireEvent.change(dom.getByLabelText("Off at"), { target: { value: "06:30" } });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ type: "error" })));
    expect(dom.getByLabelText("Off at")).toHaveValue("23:00");
  });

  it("follows the frames' screen as the server reports it", () => {
    renderWithProviders(<ScreenBoard />);
    fromServer({ state: "off", schedule: { enabled: true, on: "08:00", off: "21:00" } });
    expect(dom.getByRole("checkbox", { name: "Screen on" })).not.toBeChecked();
    expect(dom.getByRole("checkbox", { name: "On a schedule" })).toBeChecked();
    expect(dom.getByLabelText("On at")).toHaveValue("08:00");
    expect(dom.getByLabelText("Off at")).toHaveValue("21:00");
  });
});
