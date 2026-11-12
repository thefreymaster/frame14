import { expect, test, type Page } from "@playwright/test";
import { lightTile, resetStub, stub } from "./helpers";
import { STUB_URL } from "./ports";

// The Lights page's Scenes card (0.165.0): the scenes, scripts and
// automations `scene_entities` names — in frame14.test.json the house's
// movie-mode automation and a scene — each a tile a tap runs.

/** The board titled `title`. */
function board(page: Page, title: string) {
  return page
    .locator(".chakra-card__root")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) })
    .first();
}

const scene = (page: Page, name: string) => page.getByRole("button", { name: `Run ${name}`, exact: true });

test.describe("the Lights page's scenes", () => {
  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  test("are the page's first card, a tile each, named and iconed by Home Assistant", async ({ page }) => {
    await page.goto("/lights");
    const scenes = board(page, "Scenes");
    await expect(scenes).toBeVisible();
    await expect
      .poll(() => scenes.locator("[data-scene-entry]").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label"))))
      .toEqual(["Run Living Room Movie Mode", "Run Reading"]);
    // The scene has an icon in Home Assistant, the automation none.
    await expect(scene(page, "Reading").locator("[data-mdi-icon=book-open-variant]")).toBeVisible();
    await expect(scene(page, "Living Room Movie Mode").locator("[data-mdi-icon]")).toHaveCount(0);
    await expect(scene(page, "Living Room Movie Mode").locator("svg")).toBeVisible();

    // Above every room, and as wide as the page's cards together. Polled:
    // the page's scale-in draws every box a little short until it ends.
    const rooms = ["Living Room", "Kitchen", "Outside"];
    await expect
      .poll(async () => {
        const top = (await scenes.boundingBox())!;
        const boxes = await Promise.all(rooms.map(async (room) => (await board(page, room).boundingBox())!));
        const left = Math.min(...boxes.map((b) => b.x));
        const right = Math.max(...boxes.map((b) => b.x + b.width));
        return {
          above: boxes.every((box) => top.y + top.height <= box.y),
          flushLeft: Math.abs(top.x - left) <= 1,
          fullWidth: Math.abs(top.width - (right - left)) <= 1,
        };
      })
      .toEqual({ above: true, flushLeft: true, fullWidth: true });
  });

  test("a tap runs movie mode: the living room dims to a quarter and the kitchen goes dark", async ({ page, request }) => {
    await stub(request, "/_stub/service", { delay_ms: 800 });
    await page.goto("/lights");
    await expect(lightTile(page, "Living Room")).toHaveAttribute("aria-label", "Living Room: 80%");
    await expect(lightTile(page, "Kitchen Cabinet")).toHaveAttribute("aria-pressed", "true");

    const movie = scene(page, "Living Room Movie Mode");
    await movie.click();
    // Busy until Home Assistant has run it, then a tick, then as it was.
    await expect(movie).toHaveAttribute("aria-busy", "true");
    await expect(movie).toHaveAttribute("data-scene-phase", "done");
    await expect(movie).toHaveAttribute("aria-busy", "false");
    await expect(lightTile(page, "Living Room")).toHaveAttribute("aria-label", "Living Room: 25%");
    await expect(lightTile(page, "Kitchen Cabinet")).toHaveAttribute("aria-label", "Kitchen Cabinet: Off");
    await expect(lightTile(page, "Kitchen Main")).toHaveAttribute("aria-label", "Kitchen Main: Off");
    await expect(movie).toHaveAttribute("data-scene-phase", "idle");
    await expect(page.locator('[data-scope="toast"][data-part="root"]')).toHaveCount(0);
  });

  test("a scene turns its lights on", async ({ page }) => {
    await page.goto("/lights");
    const lamp = lightTile(page, "Reading Nook");
    await expect(lamp).toHaveAttribute("aria-label", "Reading Nook: Off");
    await scene(page, "Reading").click();
    await expect(lamp).toHaveAttribute("aria-label", "Reading Nook: 60%");
  });

  test("one Home Assistant refuses says so and changes nothing", async ({ page, request }) => {
    await stub(request, "/_stub/service", { fail: { "automation.living_room_movie_mode": "Automation is disabled" } });
    await page.goto("/lights");
    const movie = scene(page, "Living Room Movie Mode");
    await movie.click();
    await expect(page.getByText("Couldn't run Living Room Movie Mode")).toBeVisible();
    await expect(page.getByText("Automation is disabled")).toBeVisible();
    await expect(movie).toHaveAttribute("data-scene-phase", "idle");
    await expect(lightTile(page, "Living Room")).toHaveAttribute("aria-label", "Living Room: 80%");
  });

  test("one Home Assistant loses leaves the card, and the card goes with the last", async ({ page, request }) => {
    await page.goto("/lights");
    await expect(scene(page, "Reading")).toBeVisible();
    await stub(request, "/_stub/state", { entity_id: "scene.reading", state: "unavailable" });
    await expect(scene(page, "Reading")).toHaveCount(0);
    await expect(scene(page, "Living Room Movie Mode")).toBeVisible();
    await stub(request, "/_stub/state", { entity_id: "automation.living_room_movie_mode", state: "unavailable" });
    await expect(page.getByRole("heading", { name: "Scenes", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Living Room", exact: true })).toBeVisible();
  });

  test("the server runs only what the option names, and only runs it", async ({ page }) => {
    await page.goto("/lights");
    await expect(scene(page, "Living Room Movie Mode")).toBeVisible();
    // Asked over the socket, as a page could: a script and an automation
    // Home Assistant has that scene_entities doesn't list, and the listed
    // automation switched off rather than run.
    await page.addScriptTag({ url: "/socket.io/socket.io.js" });
    const answers = await page.evaluate(async () => {
      type Io = (opts: object) => { emit: (...a: unknown[]) => void; close: () => void; on: (e: string, f: () => void) => void };
      const socket = (window as unknown as { io: Io }).io({ transports: ["websocket"] });
      await new Promise<void>((resolve) => socket.on("connect", resolve));
      const ask = (domain: string, service: string, entity_id: string) =>
        new Promise((resolve) => socket.emit("entity:call", { domain, service, entity_id }, resolve));
      const out = [
        await ask("script", "turn_on", "script.good_night"),
        await ask("automation", "trigger", "automation.vacation_mode"),
        await ask("automation", "turn_off", "automation.living_room_movie_mode"),
      ];
      socket.close();
      return out;
    });
    const refused = { ok: false, error: "The server doesn't pass that call on" };
    expect(answers).toEqual([refused, refused, refused]);
    const states = (await (await page.request.get(`${STUB_URL}/api/states`)).json()) as { entity_id: string; state: string; attributes: { last_triggered?: string | null } }[];
    const of = (id: string) => states.find((s) => s.entity_id === id)!;
    expect(of("script.good_night").attributes.last_triggered).toBeNull();
    expect(of("automation.vacation_mode").attributes.last_triggered).toBeNull();
    expect(of("automation.living_room_movie_mode").state).toBe("on");
  });

  test("the card isn't on Home", async ({ page }) => {
    await page.goto("/home");
    await expect(page.getByRole("heading", { name: "Lights", exact: true })).toBeVisible();
    await expect(page.locator("[data-scene-entry]")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Scenes", exact: true })).toHaveCount(0);
  });
});
