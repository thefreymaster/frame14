import { expect, test, type Page } from "@playwright/test";
import { resetStub, splashGone, stub } from "./helpers";

// 0.159.0, the user: "if the entities are not provided then those cards and
// routes are not shown to the user". The stub's config has everything; each
// test hands the page a config with some of it left empty, as an install
// that never set it would have, by rewriting /api/entities on its way in.

type Config = Record<string, unknown> & {
  energy: Record<string, string>;
  circuits: { main: string; balance?: string; items: unknown[] };
};

async function withConfig(page: Page, change: (config: Config) => void) {
  await page.route("**/api/entities", async (route) => {
    const response = await route.fetch();
    const config = (await response.json()) as Config;
    change(config);
    await route.fulfill({ response, json: config });
  });
}

const noSolar = (c: Config) => {
  c.energy = { currentProduction: "", currentConsumption: "", productionToday: "", consumptionToday: "" };
};
const noCircuits = (c: Config) => {
  c.circuits = { main: "", balance: "", items: [] };
};

/** Weather, energy, fans, the printer, vacuums, cameras and football left empty. */
function bare(c: Config) {
  noSolar(c);
  noCircuits(c);
  c.weather = { current: "", forecast: "", temperature: "" };
  c.fans = [];
  c.printer = "";
  c.vacuums = [];
  c.cameras = [];
  c.camera = "";
  c.teamTracker = [];
}

const GONE = ["Energy", "Weather", "Printer", "Vacuum", "Cameras"];

test.describe("a feature without its entities", () => {
  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  test("has no Home card, and its data is never asked for", async ({ page }) => {
    await withConfig(page, bare);
    const asked: string[] = [];
    page.on("request", (r) => {
      const path = new URL(r.url()).pathname;
      if (/^\/api\/(energy|circuits|home\/(weather|fan|vacuum))/.test(path)) asked.push(path);
    });
    await page.goto("/home");
    await splashGone(page);
    await expect(page.locator('[data-card="climate"]')).toBeVisible();
    await expect(page.locator('[data-card="calendar"]')).toBeVisible();
    for (const id of ["header", "energy", "radar", "fan", "printer", "vacuum", "teamTracker"]) {
      await expect(page.locator(`[data-card="${id}"]`), id).toHaveCount(0);
    }
    // Not even while arranging, where a hidden card comes back as a stand-in:
    // press and hold.
    const box = (await page.locator('[data-card="calendar"]').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 40);
    await page.mouse.down();
    await page.waitForTimeout(800);
    await page.mouse.up();
    await expect(page.getByRole("button", { name: "Done" })).toBeVisible();
    await expect(page.locator('[data-card="energy"]')).toHaveCount(0);
    await expect(page.locator('[data-card="fan"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Done" }).click();
    expect(asked).toEqual([]);
  });

  test("has no nav entry, and a visit to its page goes Home", async ({ page, isMobile }) => {
    await withConfig(page, bare);
    await page.goto("/home");
    if (!isMobile) {
      // The desktop's rail has room for every entry.
      await expect(page.getByRole("tab", { name: "Lights" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Climate" })).toBeVisible();
      for (const name of GONE) await expect(page.getByRole("tab", { name }), name).toHaveCount(0);
    }
    for (const path of ["/energy", "/energy/circuits", "/weather/radar", "/radar", "/printer", "/vacuum", "/cameras", "/football"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/home$/);
    }
  });

  test("has no row in Settings' Navigation card, nor a remote's Views tile", async ({ page, isMobile }) => {
    await withConfig(page, bare);
    await page.goto("/control/device");
    await expect(page.getByRole("checkbox", { name: "Show Lights in the nav" })).toHaveCount(1);
    for (const name of GONE) {
      await expect(page.getByRole("checkbox", { name: `Show ${name} in the nav` }), name).toHaveCount(0);
    }
    if (!isMobile) return;
    // The phone project is a remote: its Views tab sends the frames places.
    await page.goto("/control/views");
    await expect(page.getByRole("button", { name: "Climate", exact: true })).toBeVisible();
    for (const name of [...GONE, "Football"]) {
      await expect(page.getByRole("button", { name, exact: true }), name).toHaveCount(0);
    }
  });

  test("Energy with circuits alone: the Circuits tab, no Now card or Solar", async ({ page }) => {
    await withConfig(page, noSolar);
    await page.goto("/energy");
    await expect(page).toHaveURL(/\/energy\/circuits$/);
    await expect(page.getByRole("tab", { name: "Circuits" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Solar" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Now" })).toHaveCount(0);
    await page.goto("/energy/solar");
    await expect(page).toHaveURL(/\/energy\/circuits$/);
    // No solar, no Home Energy card.
    await page.goto("/home");
    await splashGone(page);
    await expect(page.locator('[data-card="climate"]')).toBeVisible();
    await expect(page.locator('[data-card="energy"]')).toHaveCount(0);
  });

  test("Energy with solar alone: no Circuits tab on the page or in the Home card's detail", async ({ page }) => {
    await withConfig(page, noCircuits);
    await page.goto("/energy");
    await expect(page).toHaveURL(/\/energy\/solar$/);
    await expect(page.getByRole("tab", { name: "Solar" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Circuits" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Now" })).toBeVisible();
    await page.goto("/energy/circuits");
    await expect(page).toHaveURL(/\/energy\/solar$/);
    await page.goto("/home");
    await splashGone(page);
    await page.getByRole("button", { name: "Show energy detail" }).click();
    const detail = page.getByRole("dialog");
    await expect(detail.getByRole("heading", { name: "Today" })).toBeVisible();
    await expect(detail.getByRole("tab")).toHaveCount(0);
  });

  test.describe("on the frame", () => {
    test.use({
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; NXTPAPER 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      viewport: { width: 1600, height: 2400 },
    });

    test("without weather the first card keeps the date and the clock", async ({ page }) => {
      test.skip(test.info().project.name !== "desktop", "one run is enough; the phone project is the phone");
      await page.addInitScript(() => localStorage.setItem("device-mode", "frame"));
      await withConfig(page, bare);
      await page.goto("/home");
      await splashGone(page);
      const header = page.locator('[data-card="header"]');
      await expect(header).toBeVisible();
      await expect(header).toContainText(/^\w+day, \w+ \d{1,2}/);
      // Nothing to open: no weather to show.
      await expect(header.getByRole("button", { name: "Show the weather" })).toHaveCount(0);
      await expect(page.locator('[data-card="radar"]')).toHaveCount(0);
    });
  });
});

// 0.159.0: the weather cards' Offline alert watched binary_sensor.1_1_1_1 by
// name; it is the `internet_entity` option now, and none when that's empty.
test.describe("the internet sensor", () => {
  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  const offline = (page: Page) => page.getByText("Internet outage detected.");

  test("the configured one going off says Offline", async ({ page, request }) => {
    await withConfig(page, (c) => {
      c.internet = "binary_sensor.wan_ping";
    });
    await stub(request, "/_stub/state", { entity_id: "binary_sensor.wan_ping", state: "on" });
    await page.goto("/home");
    await splashGone(page);
    await expect(page.getByRole("button", { name: "Show the weather" })).toBeVisible();
    await expect(offline(page)).toHaveCount(0);
    // The old hard-coded sensor is nothing to it now.
    await stub(request, "/_stub/state", { entity_id: "binary_sensor.1_1_1_1", state: "off" });
    await page.waitForTimeout(500);
    await expect(offline(page)).toHaveCount(0);
    await stub(request, "/_stub/state", { entity_id: "binary_sensor.wan_ping", state: "off" });
    await expect(offline(page)).toBeVisible();
    await stub(request, "/_stub/state", { entity_id: "binary_sensor.wan_ping", state: "on" });
    await expect(offline(page)).toHaveCount(0);
  });

  test("with none set nothing is watched", async ({ page, request }) => {
    await withConfig(page, (c) => {
      c.internet = "";
    });
    await stub(request, "/_stub/state", { entity_id: "binary_sensor.1_1_1_1", state: "off" });
    await page.goto("/home");
    await splashGone(page);
    await expect(page.getByRole("button", { name: "Show the weather" })).toBeVisible();
    await page.waitForTimeout(500);
    await expect(offline(page)).toHaveCount(0);
  });
});
