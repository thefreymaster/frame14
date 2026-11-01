import { expect, test } from "@playwright/test";
import { resetStub, stub } from "./helpers";

test.describe("the Settings page", () => {
  test.describe("with a newer version in the store", () => {
    test.afterEach(async ({ request }) => {
      await resetStub(request);
    });

    test("the Software card lists the version's changes, and an install's progress", async ({ page, request, isMobile }) => {
      const { version } = await (await request.get("/api")).json();
      const attributes = { title: "Frame14", installed_version: version, latest_version: "9.9.9", release_url: "https://example.test" };
      await stub(request, "/_stub/state", { entity_id: "update.frame14_update", state: "on", attributes });
      await page.goto("/control");
      if (isMobile) await page.getByRole("tab", { name: "Device" }).click();
      await expect(page.getByText("Update available")).toBeVisible();
      await expect(page.getByText("Frame14 9.9.9 is ready to download.")).toBeVisible();
      // The version's section of the CHANGELOG, from Home Assistant's release
      // notes (0.136) — the stub's, for the store's version only — in the
      // install prompt, not the card (the user's call).
      const notes = page.getByRole("list", { name: "What's new in 9.9.9" });
      await expect(notes).toHaveCount(0);
      await page.getByRole("button", { name: "Install 9.9.9" }).click();
      const prompt = page.getByRole("alertdialog");
      await expect(prompt.getByText("Install Frame14 9.9.9?")).toBeVisible();
      await expect(notes.getByText("a stub's new thing, for 9.9.9")).toBeVisible();
      await expect(notes.getByText("Added:")).toBeVisible();
      await expect(prompt.getByText("what the installed version changed")).toHaveCount(0);
      await prompt.getByRole("button", { name: "Not now" }).click();
      await expect(prompt).toBeHidden();
      // An install under way — from here or from Home Assistant's add-on page
      // — shows as such, live (0.136), with an indeterminate bar (0.138: the
      // Supervisor's percentage never came).
      await stub(request, "/_stub/state", {
        entity_id: "update.frame14_update",
        state: "on",
        attributes: { ...attributes, in_progress: true, update_percentage: 42 },
      });
      await expect(page.getByText(/Installing Frame14 9\.9\.9/)).toBeVisible();
      const bar = page.getByRole("progressbar", { name: "Install progress" });
      await expect(bar).toBeVisible();
      await expect(bar).not.toHaveAttribute("aria-valuenow", /./);
      await expect(page.getByText("42%")).toHaveCount(0);
      await expect(notes).toHaveCount(0);
    });
  });

  test("the Software card shows the installed version, up to date", async ({ page, request, isMobile }) => {
    const { version } = await (await request.get("/api")).json();
    await page.goto("/control");
    // A phone keeps the sections in tabs; Software is under Device.
    if (isMobile) await page.getByRole("tab", { name: "Device" }).click();
    await expect(page.getByRole("heading", { name: "Software" })).toBeVisible();
    await expect(page.getByText("Up to date")).toBeVisible();
    await expect(page.getByText(version, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Check for updates" })).toBeVisible();
  });

  test("the device mode switches the navigation between frame and remote", async ({ page, isMobile }) => {
    test.skip(isMobile, "a phone starts as a remote; the frame's switch is a desktop's");
    await page.goto("/control");
    await expect(page.getByRole("tab", { name: "Clock" })).toBeVisible();

    await page.getByText("Use as remote").click();
    await expect(page.getByRole("tab", { name: "Clock" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Views" })).toBeVisible();

    await page.getByText("Use as frame").click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole("tab", { name: "Clock" })).toBeVisible();
  });

  test("the Views card sends every view to the frames, and this remote stays on Settings", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the Views card is a remote's");
    await page.goto("/control");
    // Lights (with Climate, Weather, Calendar and Timer) used to open on the
    // remote itself (0.127).
    const lights = page.getByRole("button", { name: "Lights", exact: true });
    await expect(lights).toHaveAttribute("aria-pressed", "false");
    await lights.click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/control\/views$/);
    await expect(lights).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Clock", exact: true }).click();
    await expect(page).toHaveURL(/\/control\/views$/);
    await expect(page.getByRole("button", { name: "Clock", exact: true })).toHaveAttribute("aria-pressed", "true");
  });

  test("the Screen card turns the frames' screen off and on, and keeps the hours it is on", async ({ page, request, isMobile }) => {
    const screen = async () => (await request.get("/api/screen")).json();
    // As the add-on starts: on, no schedule.
    await request.put("/api/screen/schedule", { data: { enabled: false, on: "06:30", off: "23:00" } });
    await request.get("/api/screen/on");

    await page.goto("/control");
    if (isMobile) await page.getByRole("tab", { name: "Display" }).click();
    await expect(page.getByRole("heading", { name: "Screen", exact: true })).toBeVisible();
    const power = page.getByRole("checkbox", { name: "Screen on" });
    await expect(power).toBeChecked();
    await page.getByText("Screen on", { exact: true }).click();
    await expect(power).not.toBeChecked();
    await expect.poll(async () => (await screen()).state).toBe("off");

    // The hours, saved as they are set (0.129).
    await page.getByText("On a schedule", { exact: true }).click();
    await page.getByLabel("On at").fill("07:00");
    await page.getByLabel("Off at").fill("22:00");
    await expect.poll(async () => (await screen()).schedule).toEqual({ enabled: true, on: "07:00", off: "22:00" });
    // Kept by the add-on: a fresh page has them.
    await page.reload();
    if (isMobile) await page.getByRole("tab", { name: "Display" }).click();
    await expect(page.getByRole("checkbox", { name: "On a schedule" })).toBeChecked();
    await expect(page.getByLabel("On at")).toHaveValue("07:00");
    await expect(page.getByLabel("Off at")).toHaveValue("22:00");

    // Back as it was, for the specs after this one.
    await request.put("/api/screen/schedule", { data: { enabled: false, on: "06:30", off: "23:00" } });
    await request.get("/api/screen/on");
  });

  // 0.131: the brightness slider and the dark hours are a phone's and the
  // frame's; a desktop's card has neither.
  test("the Screen card's brightness and dark hours are kept by the add-on, and are not a desktop's", async ({ page, request, isMobile }) => {
    const screen = async () => (await request.get("/api/screen")).json();
    await request.put("/api/screen/dark", { data: { enabled: false, from: "21:00", to: "06:30" } });
    await request.put("/api/screen/auto", { data: { enabled: false, min: 25, max: 255 } });

    await page.goto("/control");
    if (isMobile) await page.getByRole("tab", { name: "Display" }).click();
    await expect(page.getByRole("heading", { name: "Screen", exact: true })).toBeVisible();
    const slider = page.getByRole("slider", { name: "Brightness" });
    if (!isMobile) {
      await expect(page.getByRole("checkbox", { name: "Screen on" })).toBeVisible();
      await expect(slider).toHaveCount(0);
      await expect(page.getByRole("checkbox", { name: "Adjust to the room" })).toHaveCount(0);
      await expect(page.getByRole("checkbox", { name: "Dark hours" })).toHaveCount(0);
      return;
    }

    // Brightness from the room's light (0.137): the switch is the add-on's
    // setting, and the range's thumbs are its levels. No frame reports here.
    await expect(page.getByText(/Room light now: \d+ lx|No reading from the light sensor yet/)).toBeVisible();
    await page.getByText("Adjust to the room", { exact: true }).click();
    await expect.poll(async () => (await screen()).auto).toEqual({ enabled: true, min: 25, max: 255 });
    const dimmest = page.getByRole("slider", { name: "Dimmest" });
    await dimmest.focus();
    await page.keyboard.press("Home");
    await expect.poll(async () => (await screen()).auto.min).toBe(0);
    await expect(page.getByText("0%–100%")).toBeVisible();

    // The slider sets the frames' level — Home is the slider's lowest.
    await slider.focus();
    await page.keyboard.press("Home");
    await expect.poll(async () => (await screen()).brightness).toBe(0);
    await expect(page.getByText("0%", { exact: true })).toBeVisible();

    // The dark hours, saved as they are set.
    await page.getByText("Dark hours", { exact: true }).click();
    await page.getByLabel("Dark from").fill("20:00");
    await page.getByLabel("Dark until").fill("05:00");
    await expect.poll(async () => (await screen()).dark).toEqual({ enabled: true, from: "20:00", to: "05:00" });
    // Kept by the add-on: a fresh page has them.
    await page.reload();
    await page.getByRole("tab", { name: "Display" }).click();
    await expect(page.getByRole("checkbox", { name: "Dark hours" })).toBeChecked();
    await expect(page.getByLabel("Dark from")).toHaveValue("20:00");
    await expect(page.getByLabel("Dark until")).toHaveValue("05:00");
    await expect(page.getByRole("slider", { name: "Brightness" })).toHaveAttribute("aria-valuenow", "0");

    // The slider by hand is the end of the room's say.
    await page.getByRole("slider", { name: "Brightness" }).focus();
    await page.keyboard.press("End");
    await expect.poll(async () => (await screen()).auto.enabled).toBe(false);
    await expect(page.getByRole("checkbox", { name: "Adjust to the room" })).not.toBeChecked();

    // Back as it was, for the specs after this one.
    await request.put("/api/screen/dark", { data: { enabled: false, from: "21:00", to: "06:30" } });
    await request.put("/api/screen/auto", { data: { enabled: false, min: 25, max: 255 } });
    await request.get("/api/screen/brightness/255");
  });
});
