import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "./helpers/render";
import { openSettingsCard } from "./helpers/settingsCard";

// 0.168.0: Settings' Account card. The server's answer is a fetch here, and
// the socket's "people" is handed to whoever listens for it.
const mocks = vi.hoisted(() => ({
  account: true,
  device: "iPhone",
  handlers: new Map<string, (v: unknown) => void>(),
  answer: null as unknown,
  toast: vi.fn(),
}));

vi.mock("../../src/components/ui/toaster", () => ({ toaster: { create: mocks.toast } }));

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
  openSettingsCard("account");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-14T15:30:00Z"));
  mocks.account = true;
  mocks.device = "iPhone";
  mocks.answer = { enabled: true, user: { email: "evan@example.com" }, people: PEOPLE };
  queryClient.clear();
  mocks.toast.mockReset();
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

  // 0.173.0, the user: "All settings should be collapsed by default".
  it("starts out folded to its header, opens on a tap and stays as it was left", async () => {
    localStorage.removeItem("board-collapsed:settings-account");
    const first = show();
    const header = await screen.findByRole("button", { name: "Account" });
    expect(header).toHaveAttribute("aria-expanded", "false");
    // Nothing of its body is on show: not who, not the list.
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.getByText(/Signed in as/)).not.toBeVisible();
    fireEvent.click(header);
    await waitFor(() => expect(header).toHaveAttribute("aria-expanded", "true"));
    await waitFor(() => expect(rows()).toHaveLength(3));
    // Opened, it is open the next time the page is: kept on the device.
    first.unmount();
    show();
    expect(await screen.findByRole("button", { name: "Account" })).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => expect(rows()).toHaveLength(3));
    // And folded by hand, folded.
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Account" })).toHaveAttribute("aria-expanded", "false"));
    expect(localStorage.getItem("board-collapsed:settings-account")).toBe("1");
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

  // 0.173.0, the user: "Allow for the customization of the name of a device
  // found here. It should propagate across all devices so not just saved to
  // that local device", then "Just add an edit icon button to the far right
  // of each that allows the editing of the name. Maybe let us set an alias
  // instead actually."
  describe("a device's alias", () => {
    const edit = (row: HTMLElement) => within(row).getByRole("button", { name: /^Set an alias for / });
    const field = (row: HTMLElement) => within(row).getByRole("textbox") as HTMLInputElement;
    /** What the page sent the server to save. */
    const sent = () =>
      fetched.mock.calls
        .filter(([url]) => url === "/api/account/alias")
        .map(([, init]) => ({ method: (init as RequestInit).method, body: JSON.parse((init as RequestInit).body as string) as unknown }));
    /** The server saving it: the list again, with the alias on its row. */
    function saves() {
      fetched.mockImplementation(async (url: string, init?: RequestInit) => {
        if (url !== "/api/account/alias") return new Response(JSON.stringify(mocks.answer));
        const { email, device, alias } = JSON.parse(init!.body as string) as { email: string; device: string; alias: string };
        const account = mocks.answer as { people: { email: string; device: string; alias?: string }[] };
        mocks.answer = {
          ...account,
          people: account.people.map((p) => {
            if (p.email !== email || p.device !== device) return p;
            const next = { ...p, alias };
            if (!alias) delete (next as { alias?: string }).alias;
            return next;
          }),
        };
        return new Response(JSON.stringify(mocks.answer));
      });
    }

    it("is what a row goes by, where it has one", async () => {
      mocks.answer = {
        enabled: true,
        user: { email: "evan@example.com" },
        people: [{ ...PEOPLE[0], alias: "Evan's phone" }, PEOPLE[1], { ...PEOPLE[2], alias: "Kitchen iPad" }],
      };
      show();
      await waitFor(() => expect(rows()).toHaveLength(3));
      const [phone, mac, liz] = rows();
      expect(phone).toHaveTextContent("Evan's phone · This device");
      expect(phone).not.toHaveTextContent("iPhone");
      // What kind of device it is stays the row's own, alias or none.
      expect(phone).toHaveAttribute("data-device", "iPhone");
      expect(phone).toHaveAttribute("data-alias", "Evan's phone");
      expect(mac).toHaveTextContent("Mac · Here now");
      expect(mac).not.toHaveAttribute("data-alias");
      expect(liz).toHaveTextContent("Kitchen iPad · Last here yesterday");
    });

    it("has an edit button on every row, someone else's too", async () => {
      show();
      await waitFor(() => expect(rows()).toHaveLength(3));
      expect(rows().map((row) => edit(row).getAttribute("aria-label"))).toEqual([
        "Set an alias for evan@example.com's iPhone",
        "Set an alias for evan@example.com's Mac",
        "Set an alias for liz@example.com's iPad",
      ]);
      // No field until one is asked for.
      expect(screen.queryByRole("textbox")).toBeNull();
    });

    it("is typed in the row and saved by the server, which every device reads it from", async () => {
      saves();
      show();
      await waitFor(() => expect(rows()).toHaveLength(3));
      fireEvent.click(edit(rows()[1]));
      const input = field(rows()[1]);
      // The field has the focus, says what empty reads as, and holds to the server's length.
      expect(input).toHaveFocus();
      expect(input).toHaveValue("");
      expect(input).toHaveAttribute("placeholder", "Mac");
      expect(input).toHaveAttribute("maxlength", "40");
      expect(input).toHaveAccessibleName("Alias for evan@example.com's Mac");
      // The other rows are as they were.
      expect(screen.getAllByRole("textbox")).toHaveLength(1);
      fireEvent.change(input, { target: { value: "  Office   MacBook " } });
      fireEvent.click(within(rows()[1]).getByRole("button", { name: "Save alias" }));
      await waitFor(() => expect(rows()[1]).toHaveTextContent("Office MacBook · Here now"));
      // Tidied, and for that row: the person and the kind of device.
      expect(sent()).toEqual([{ method: "PUT", body: { email: "evan@example.com", device: "Mac", alias: "Office MacBook" } }]);
      expect(screen.queryByRole("textbox")).toBeNull();
      expect(edit(rows()[1])).toBeInTheDocument();
      expect(mocks.toast).not.toHaveBeenCalled();
    });

    it("saves on Enter, someone else's row as well as one's own", async () => {
      saves();
      show();
      await waitFor(() => expect(rows()).toHaveLength(3));
      fireEvent.click(edit(rows()[2]));
      fireEvent.change(field(rows()[2]), { target: { value: "Kitchen iPad" } });
      fireEvent.submit(field(rows()[2]).closest("form")!);
      await waitFor(() => expect(rows()[2]).toHaveTextContent("Kitchen iPad · Last here yesterday"));
      expect(sent()).toEqual([{ method: "PUT", body: { email: "liz@example.com", device: "iPad", alias: "Kitchen iPad" } }]);
    });

    it("follows an alias set on another device, over the socket", async () => {
      show();
      await waitFor(() => expect(rows()).toHaveLength(3));
      act(() => {
        mocks.handlers.get("people")!([PEOPLE[0], { ...PEOPLE[1], alias: "Office MacBook" }, PEOPLE[2]]);
      });
      await waitFor(() => expect(rows()[1]).toHaveTextContent("Office MacBook · Here now"));
      expect(sent()).toEqual([]);
    });

    it("is taken away by saving the field empty, and the row goes by its kind again", async () => {
      mocks.answer = { enabled: true, user: { email: "evan@example.com" }, people: [PEOPLE[0], { ...PEOPLE[1], alias: "Office MacBook" }, PEOPLE[2]] };
      saves();
      show();
      await waitFor(() => expect(rows()[1]).toHaveTextContent("Office MacBook"));
      fireEvent.click(edit(rows()[1]));
      // The alias it has is what is there to change.
      expect(field(rows()[1])).toHaveValue("Office MacBook");
      fireEvent.change(field(rows()[1]), { target: { value: "   " } });
      fireEvent.click(within(rows()[1]).getByRole("button", { name: "Save alias" }));
      await waitFor(() => expect(rows()[1]).toHaveTextContent("Mac · Here now"));
      expect(sent()).toEqual([{ method: "PUT", body: { email: "evan@example.com", device: "Mac", alias: "" } }]);
      expect(rows()[1]).not.toHaveAttribute("data-alias");
    });

    it("asks the server nothing when left by Cancel or Escape, or saved as it was", async () => {
      mocks.answer = { enabled: true, user: { email: "evan@example.com" }, people: [PEOPLE[0], { ...PEOPLE[1], alias: "Office MacBook" }, PEOPLE[2]] };
      saves();
      show();
      await waitFor(() => expect(rows()).toHaveLength(3));
      fireEvent.click(edit(rows()[1]));
      fireEvent.change(field(rows()[1]), { target: { value: "Something else" } });
      fireEvent.click(within(rows()[1]).getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("textbox")).toBeNull();
      expect(rows()[1]).toHaveTextContent("Office MacBook · Here now");
      fireEvent.click(edit(rows()[1]));
      // What was typed and left isn't kept for the next time.
      expect(field(rows()[1])).toHaveValue("Office MacBook");
      fireEvent.change(field(rows()[1]), { target: { value: "Another" } });
      fireEvent.keyDown(field(rows()[1]), { key: "Escape" });
      expect(screen.queryByRole("textbox")).toBeNull();
      // Saved as it was, give or take its spaces: nothing to save.
      fireEvent.click(edit(rows()[1]));
      fireEvent.change(field(rows()[1]), { target: { value: " Office MacBook  " } });
      fireEvent.click(within(rows()[1]).getByRole("button", { name: "Save alias" }));
      expect(screen.queryByRole("textbox")).toBeNull();
      await act(async () => {});
      expect(sent()).toEqual([]);
      expect(rows()[1]).toHaveTextContent("Office MacBook · Here now");
    });

    it("says so when the server refuses, and leaves the field as typed", async () => {
      fetched.mockImplementation(async (url: string) =>
        url === "/api/account/alias"
          ? new Response(JSON.stringify({ error: "Nobody is signed in on that device" }), { status: 404 })
          : new Response(JSON.stringify(mocks.answer)),
      );
      show();
      await waitFor(() => expect(rows()).toHaveLength(3));
      fireEvent.click(edit(rows()[1]));
      fireEvent.change(field(rows()[1]), { target: { value: "Office MacBook" } });
      fireEvent.click(within(rows()[1]).getByRole("button", { name: "Save alias" }));
      await waitFor(() =>
        expect(mocks.toast).toHaveBeenCalledWith({ type: "error", title: "The alias wasn't saved", description: "Nobody is signed in on that device" }),
      );
      expect(field(rows()[1])).toHaveValue("Office MacBook");
      expect(field(rows()[1])).toBeEnabled();
      expect(rows()[1]).not.toHaveAttribute("data-alias");
      // And when the server can't be reached at all.
      fetched.mockImplementation(async (url: string) => {
        if (url === "/api/account/alias") throw new TypeError("Failed to fetch");
        return new Response(JSON.stringify(mocks.answer));
      });
      fireEvent.click(within(rows()[1]).getByRole("button", { name: "Save alias" }));
      await waitFor(() => expect(mocks.toast).toHaveBeenCalledTimes(2));
      expect(mocks.toast.mock.calls[1][0]).toMatchObject({ type: "error", description: "The server couldn't be reached." });
      expect(field(rows()[1])).toHaveValue("Office MacBook");
    });
  });
});
