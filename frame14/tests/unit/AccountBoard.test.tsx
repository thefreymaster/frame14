import { act, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "./helpers/render";

// 0.168.0: Settings' Account card. The server's answer is a fetch here, and
// the socket's "people" is handed to whoever listens for it.
const mocks = vi.hoisted(() => ({
  account: true,
  device: "iPhone",
  handlers: new Map<string, (v: unknown) => void>(),
  answer: null as unknown,
}));

vi.mock("../../src/hooks/useFeatures", () => ({
  useFeatures: () => ({ account: mocks.account }),
}));
vi.mock("../../src/lib/deviceName", () => ({ deviceName: () => mocks.device }));
vi.mock("../../src/lib/socket", () => ({
  socket: {
    on: (name: string, handler: (v: unknown) => void) => mocks.handlers.set(name, handler),
    off: vi.fn(),
    emit: vi.fn(),
  },
}));
// The hook's socket listener writes to the app's query client: the card under
// test reads the same one.
vi.mock("../../src/lib/queryClient", async () => {
  const { QueryClient } = await import("@tanstack/react-query");
  return { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) };
});

import { QueryClientProvider } from "@tanstack/react-query";
import { AccountBoard } from "../../src/components/AccountBoard";
import { queryClient } from "../../src/lib/queryClient";

const PEOPLE = [
  { email: "evan@example.com", device: "iPhone", online: true, lastSeen: "2026-11-14T15:00:00.000Z" },
  { email: "evan@example.com", device: "Mac", online: true, lastSeen: "2026-11-14T14:00:00.000Z" },
  { email: "liz@example.com", device: "iPad", online: false, lastSeen: "2026-11-13T20:30:00.000Z" },
];

const fetched = vi.fn();

function show() {
  return renderWithProviders(
    <QueryClientProvider client={queryClient}>
      <AccountBoard />
    </QueryClientProvider>,
  );
}

const rows = () =>
  within(screen.getByRole("list", { name: "People signed in" })).getAllByRole("listitem");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-14T15:30:00Z"));
  mocks.account = true;
  mocks.device = "iPhone";
  mocks.answer = { enabled: true, user: { email: "evan@example.com" }, people: PEOPLE };
  queryClient.clear();
  fetched.mockReset();
  fetched.mockImplementation(async () => new Response(JSON.stringify(mocks.answer)));
  vi.stubGlobal("fetch", fetched);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("the Account card", () => {
  it("says who Cloudflare Access signed this device in as, and lists everyone signed in", async () => {
    show();
    expect(await screen.findByText("Account")).toBeInTheDocument();
    expect(screen.getByText("evan@example.com", { selector: "span" }).parentElement).toHaveTextContent("Signed in as evan@example.com");
    expect(fetched).toHaveBeenCalledWith("/api/account");
    const [phone, mac, liz] = rows();
    // The one in hand says so, where the others say they are here now.
    expect(phone).toHaveTextContent("evan@example.com");
    expect(phone).toHaveTextContent("iPhone · This device");
    expect(phone).not.toHaveTextContent("Here now");
    expect(phone).toHaveAttribute("data-self");
    expect(phone).toHaveAttribute("data-online");
    // The same person's other device is a row of its own, and not this one.
    expect(mac).toHaveTextContent("Mac · Here now");
    expect(mac).not.toHaveAttribute("data-self");
    // Gone: when their last page closed (the day before, New York's time).
    expect(liz).toHaveTextContent("liz@example.com");
    expect(liz).toHaveTextContent("iPad · Last here yesterday");
    expect(liz).not.toHaveAttribute("data-online");
  });

  it("follows the people coming and going over the socket", async () => {
    show();
    await waitFor(() => expect(rows()).toHaveLength(3));
    act(() => {
      mocks.handlers.get("people")!([
        { email: "evan@example.com", device: "iPhone", online: true, lastSeen: "2026-11-14T15:00:00.000Z" },
        { email: "liz@example.com", device: "iPad", online: true, lastSeen: "2026-11-14T15:29:00.000Z" },
        { email: "evan@example.com", device: "Mac", online: false, lastSeen: "2026-11-14T15:20:00.000Z" },
      ]);
    });
    await waitFor(() => expect(rows()[1]).toHaveTextContent("iPad · Here now"));
    expect(rows()[2]).toHaveTextContent(/Mac · Last here \d+:20/);
    // Still who it was: the list alone changed.
    expect(screen.getByText(/Signed in as/)).toHaveTextContent("evan@example.com");
  });

  it("isn't there on a device Access didn't sign in, which is asked nothing more", async () => {
    mocks.answer = { enabled: true, user: null, people: [] };
    const { container } = show();
    await waitFor(() => expect(fetched).toHaveBeenCalledTimes(1));
    await act(async () => {});
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Account")).toBeNull();
  });

  it("isn't there, and asks the server nothing, on an install that names nobody", async () => {
    mocks.account = false;
    const { container } = show();
    await act(async () => {});
    expect(container).toBeEmptyDOMElement();
    expect(fetched).not.toHaveBeenCalled();
  });

  it("shows no list until someone is in it", async () => {
    mocks.answer = { enabled: true, user: { email: "evan@example.com" }, people: [] };
    show();
    expect(await screen.findByText(/Signed in as/)).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByText("People signed in")).toBeNull();
  });
});
