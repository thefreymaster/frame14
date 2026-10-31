import { expect, test } from "@playwright/test";

test.describe("the Settings page", () => {
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
    await expect(page).toHaveURL(/\/control$/);
    await expect(lights).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Clock", exact: true }).click();
    await expect(page).toHaveURL(/\/control$/);
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
});
