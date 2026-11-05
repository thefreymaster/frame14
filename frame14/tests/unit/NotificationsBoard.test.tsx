import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "./helpers/render";

// 0.160.0: Settings' Notifications card, over lib/push (mocked here: jsdom
// has no service worker or push service; notifications.spec drives the real
// ones).
const push = vi.hoisted(() => ({
  support: "available" as string,
  subscription: null as { endpoint: string } | null,
  enablePush: vi.fn(),
  disablePush: vi.fn(),
  sendTestPush: vi.fn(),
  remindServer: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("../../src/lib/push", () => ({
  pushSupport: () => push.support,
  currentSubscription: async () => push.subscription,
  enablePush: push.enablePush,
  disablePush: push.disablePush,
  sendTestPush: push.sendTestPush,
  remindServer: push.remindServer,
}));
vi.mock("../../src/components/ui/toaster", () => ({ toaster: { create: push.toast } }));

import { NotificationsBoard } from "../../src/components/NotificationsBoard";

const allow = () => screen.getByRole("checkbox", { name: "Allow notifications" });
// The switch's own control: zag's hidden input can lag it under act.
const control = () => allow().closest("label")!.querySelector('[data-part="control"]')!;
const toggle = () => fireEvent.click(screen.getByText("Allow notifications"));

beforeEach(() => {
  push.support = "available";
  push.subscription = null;
  for (const fn of [push.enablePush, push.disablePush, push.sendTestPush, push.remindServer, push.toast]) fn.mockReset();
  push.remindServer.mockResolvedValue(undefined);
});

describe("the Notifications card", () => {
  it("is off until turned on, which asks the browser and offers a test", async () => {
    push.enablePush.mockResolvedValue(true);
    push.sendTestPush.mockResolvedValue(undefined);
    renderWithProviders(<NotificationsBoard />);
    await waitFor(() => expect(allow()).toBeEnabled());
    expect(control()).toHaveAttribute("data-state", "unchecked");
    expect(screen.getByText(/Home Assistant's alerts on this device/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send a test" })).toBeNull();
    toggle();
    await waitFor(() => expect(control()).toHaveAttribute("data-state", "checked"));
    expect(push.enablePush).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Send a test" }));
    await waitFor(() => expect(push.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Test sent" })));
    expect(push.sendTestPush).toHaveBeenCalledTimes(1);
  });

  it("is on with the browser's subscription, reminds the server of it, and turns off", async () => {
    push.subscription = { endpoint: "https://fcm.googleapis.com/fcm/send/abc" };
    push.disablePush.mockResolvedValue(undefined);
    renderWithProviders(<NotificationsBoard />);
    await waitFor(() => expect(control()).toHaveAttribute("data-state", "checked"));
    expect(push.remindServer).toHaveBeenCalledWith(push.subscription);
    toggle();
    await waitFor(() => expect(control()).toHaveAttribute("data-state", "unchecked"));
    expect(push.disablePush).toHaveBeenCalledTimes(1);
  });

  it("says they're blocked when the browser's permission is refused", async () => {
    push.enablePush.mockImplementation(async () => {
      push.support = "denied";
      return false;
    });
    renderWithProviders(<NotificationsBoard />);
    await waitFor(() => expect(allow()).toBeEnabled());
    toggle();
    await waitFor(() => expect(screen.getByText(/Notifications are blocked for Frame14/)).toBeInTheDocument());
    expect(allow()).toBeDisabled();
  });

  it("says what went wrong when turning them on fails", async () => {
    push.enablePush.mockRejectedValue(new Error("push service unavailable"));
    renderWithProviders(<NotificationsBoard />);
    await waitFor(() => expect(allow()).toBeEnabled());
    toggle();
    await waitFor(() =>
      expect(push.toast).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error", title: "Couldn't turn notifications on", description: "push service unavailable" }),
      ),
    );
    expect(control()).toHaveAttribute("data-state", "unchecked");
  });

  it.each([
    ["insecure", /need Frame14's https address/],
    ["install", /add Frame14 to your Home Screen first/],
    ["unsupported", /This browser can't show notifications/],
    ["denied", /Notifications are blocked/],
  ])("can't be turned on when %s, and says why", async (support, why) => {
    push.support = support;
    renderWithProviders(<NotificationsBoard />);
    expect(screen.getByText(why)).toBeInTheDocument();
    expect(allow()).toBeDisabled();
    expect(push.remindServer).not.toHaveBeenCalled();
  });
});
