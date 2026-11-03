import { act, fireEvent, screen as dom, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "./helpers/render";

// The socket (its handlers kept, so a test can play the server's
// screen_state), the toaster, and whether this is a desktop.
const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (v: unknown) => void>(),
  toast: vi.fn(),
  desktop: false,
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
vi.mock("../../src/hooks/useDesktop", () => ({
  useDesktop: () => mocks.desktop,
}));

import { ScreenBoard } from "../../src/components/ScreenBoard";

const HOURS = { enabled: false, on: "06:30", off: "23:00" };
const DARK = { enabled: false, from: "21:00", to: "06:30" };
const AUTO = { enabled: false, min: 25, max: 255 };
const SERVER = { state: "on", schedule: HOURS, brightness: 128, dark: DARK, auto: AUTO, lux: null };
const fromServer = (v: unknown) => act(() => mocks.handlers.get("screen_state")?.(v));

describe("the Screen card", () => {
  const fetchMock = vi.fn();
  const puts = (path: string) =>
    fetchMock.mock.calls
      .filter((c) => c[0] === path && (c[1] as RequestInit | undefined)?.method === "PUT")
      .map((c) => JSON.parse(String((c[1] as RequestInit).body)) as Record<string, unknown>);

  beforeEach(() => {
    mocks.desktop = false;
    fetchMock.mockReset();
    // The server: a state or brightness command is taken; a pair of hours
    // comes back applied, unless its two times are the same.
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        const body = JSON.parse(String(init.body)) as Record<string, string | boolean | number>;
        if (url.endsWith("/auto")) {
          if (Number(body.min) >= Number(body.max)) return { ok: false, status: 400, json: async () => ({}) };
          return { ok: true, status: 200, json: async () => ({ ...SERVER, auto: body }) };
        }
        const dark = url.endsWith("/dark");
        const [start, end] = dark ? [body.from, body.to] : [body.on, body.off];
        if (start === end) return { ok: false, status: 400, json: async () => ({}) };
        const next = dark ? { ...SERVER, dark: body } : { ...SERVER, schedule: body };
        return { ok: true, status: 200, json: async () => next };
      }
      return { ok: true, status: 200, json: async () => SERVER };
    });
    vi.stubGlobal("fetch", fetchMock);
    fromServer(SERVER);
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
    expect(puts("/api/screen/schedule").at(-1)).toEqual({ ...HOURS, enabled: true });
    fireEvent.change(dom.getByLabelText("On at"), { target: { value: "07:00" } });
    await waitFor(() => expect(puts("/api/screen/schedule").at(-1)).toEqual({ enabled: true, on: "07:00", off: "23:00" }));
    await waitFor(() => expect(dom.getByLabelText("On at")).toHaveValue("07:00"));
    fireEvent.change(dom.getByLabelText("Off at"), { target: { value: "22:00" } });
    await waitFor(() => expect(puts("/api/screen/schedule").at(-1)).toEqual({ enabled: true, on: "07:00", off: "22:00" }));
  });

  it("keeps what it had when the server refuses, and says so", async () => {
    renderWithProviders(<ScreenBoard />);
    fireEvent.change(dom.getByLabelText("Off at"), { target: { value: "06:30" } });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ type: "error" })));
    expect(dom.getByLabelText("Off at")).toHaveValue("23:00");
  });

  it("follows the frames' screen as the server reports it", () => {
    renderWithProviders(<ScreenBoard />);
    fromServer({ state: "off", schedule: { enabled: true, on: "08:00", off: "21:00" }, brightness: 51, dark: { enabled: true, from: "22:00", to: "05:00" }, auto: AUTO, lux: null });
    expect(dom.getByRole("checkbox", { name: "Screen on" })).not.toBeChecked();
    expect(dom.getByRole("checkbox", { name: "On a schedule" })).toBeChecked();
    expect(dom.getByLabelText("On at")).toHaveValue("08:00");
    expect(dom.getByLabelText("Off at")).toHaveValue("21:00");
    expect(dom.getByRole("slider", { name: "Brightness" })).toHaveAttribute("aria-valuenow", "51");
    expect(dom.getByText("20%")).toBeInTheDocument();
    expect(dom.getByRole("checkbox", { name: "Dark hours" })).toBeChecked();
    expect(dom.getByLabelText("Dark from")).toHaveValue("22:00");
    expect(dom.getByLabelText("Dark until")).toHaveValue("05:00");
  });

  it("sets the frames' brightness from the slider (0.131)", async () => {
    renderWithProviders(<ScreenBoard />);
    const slider = dom.getByRole("slider", { name: "Brightness" });
    expect(slider).toHaveAttribute("aria-valuenow", "128");
    expect(dom.getByText("50%")).toBeInTheDocument();
    // The thumb takes keys once focused, as in a browser.
    fireEvent.focus(slider);
    fireEvent.keyDown(slider, { key: "Home" });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/screen/brightness/0"));
    expect(dom.getByText("0%")).toBeInTheDocument();
  });

  it("shows no level until the server has one", () => {
    renderWithProviders(<ScreenBoard />);
    fromServer({ ...SERVER, brightness: null });
    expect(dom.getByText("—")).toBeInTheDocument();
  });

  it("saves the dark hours: on, and the range (0.131)", async () => {
    renderWithProviders(<ScreenBoard />);
    fireEvent.click(dom.getByRole("checkbox", { name: "Dark hours" }));
    await waitFor(() => expect(dom.getByRole("checkbox", { name: "Dark hours" })).toBeChecked());
    expect(puts("/api/screen/dark").at(-1)).toEqual({ ...DARK, enabled: true });
    fireEvent.change(dom.getByLabelText("Dark from"), { target: { value: "20:00" } });
    await waitFor(() => expect(puts("/api/screen/dark").at(-1)).toEqual({ enabled: true, from: "20:00", to: "06:30" }));
    fireEvent.change(dom.getByLabelText("Dark until"), { target: { value: "05:00" } });
    await waitFor(() => expect(puts("/api/screen/dark").at(-1)).toEqual({ enabled: true, from: "20:00", to: "05:00" }));
    // Refused: the same two times.
    fireEvent.change(dom.getByLabelText("Dark until"), { target: { value: "20:00" } });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "The dark hours weren't saved" })));
    expect(dom.getByLabelText("Dark until")).toHaveValue("05:00");
  });

  it("turns the brightness from the room's light on, with its range, and shows the room's light (0.137)", async () => {
    renderWithProviders(<ScreenBoard />);
    expect(dom.getByText(/No reading from the light sensor yet/)).toBeInTheDocument();
    fromServer({ ...SERVER, lux: 120 });
    expect(dom.getByText(/Room light now: 120 lx/)).toBeInTheDocument();
    expect(dom.getByText("10%–100%")).toBeInTheDocument();
    fireEvent.click(dom.getByRole("checkbox", { name: "Adjust to the room" }));
    await waitFor(() => expect(dom.getByRole("checkbox", { name: "Adjust to the room" })).toBeChecked());
    expect(puts("/api/screen/auto").at(-1)).toEqual({ ...AUTO, enabled: true });
    // The range's thumbs take keys once focused, as in a browser.
    const dimmest = dom.getByRole("slider", { name: "Dimmest" });
    expect(dimmest).toHaveAttribute("aria-valuenow", "25");
    expect(dom.getByRole("slider", { name: "Brightest" })).toHaveAttribute("aria-valuenow", "255");
    fireEvent.focus(dimmest);
    fireEvent.keyDown(dimmest, { key: "Home" });
    await waitFor(() => expect(puts("/api/screen/auto").at(-1)).toEqual({ enabled: true, min: 0, max: 255 }));
    expect(dom.getByText("0%–100%")).toBeInTheDocument();
  });

  it("keeps the brightness, the room's light and the dark hours off a desktop", () => {
    mocks.desktop = true;
    renderWithProviders(<ScreenBoard />);
    expect(dom.getByRole("checkbox", { name: "Screen on" })).toBeInTheDocument();
    expect(dom.getByRole("checkbox", { name: "On a schedule" })).toBeInTheDocument();
    expect(dom.queryByRole("slider", { name: "Brightness" })).toBeNull();
    expect(dom.queryByRole("checkbox", { name: "Adjust to the room" })).toBeNull();
    expect(dom.queryByRole("slider", { name: "Dimmest" })).toBeNull();
    expect(dom.queryByRole("checkbox", { name: "Dark hours" })).toBeNull();
    expect(dom.queryByLabelText("Dark from")).toBeNull();
  });
});
