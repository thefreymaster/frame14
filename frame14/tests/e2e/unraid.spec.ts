import { expect, test, type Locator, type Page } from "@playwright/test";
import { pageErrors, resetStub, splashGone, stub } from "./helpers";
import { STUB_URL } from "./ports";

// The Unraid page (0.151.0), read only: the stub's UnServer as Home
// Assistant's Unraid integration has it — found by the server in the
// registries, by unique id — with its health, its six containers (a hidden
// seventh left out) and its two VMs. Since 0.152.0 without a page header,
// the Containers and VMs collapsible, and on a desktop two columns.

type Kind = "container" | "vm";
const tile = (page: Page, name: string, kind: Kind = "container") =>
  page.locator(`[data-kind="${kind}"][data-guest="${name}"]`);
/** A card by its title. */
const card = (page: Page, title: string) =>
  page.locator(".chakra-card__root", { has: page.getByRole("heading", { name: title, exact: true }) });
const box = async (l: Locator) => (await l.boundingBox())!;
/** The page's entrance played (PageTransition's scale-in draws it smaller meanwhile). */
const entered = (page: Page) =>
  page.locator("[data-page-shell]").evaluate((el) => Promise.all(el.parentElement!.getAnimations().map((a) => a.finished)));
const names = (page: Page, kind: Kind) =>
  page.locator(`[data-kind="${kind}"]`).evaluateAll((els) => els.map((el) => el.getAttribute("data-guest")));

/** The stub's state of an entity: what Home Assistant would say now. */
async function stubState(page: Page, id: string) {
  const res = await page.request.get(`${STUB_URL}/api/states`);
  const all = (await res.json()) as { entity_id: string; state: string }[];
  return all.find((s) => s.entity_id === id);
}

test.beforeEach(async ({ request }) => {
  await resetStub(request);
});

test("the server's CPU, memory and figures, and its containers in name order", async ({ page }) => {
  const errors = pageErrors(page);
  await page.goto("/unraid");
  await expect(page.getByRole("heading", { name: "UnServer" })).toBeVisible();
  // No page header (0.152.0): the server's card names the page.
  await expect(page.getByRole("heading", { name: "Unraid", exact: true })).toHaveCount(0);
  await expect(page.getByText("Unraid 7.3.4")).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "CPU usage" })).toHaveAttribute("aria-valuenow", "13.7");
  await expect(page.getByRole("progressbar", { name: "Memory usage" })).toHaveAttribute("aria-valuenow", "82.2");
  await expect(page.getByText("10 cores · 16 threads")).toBeVisible();
  await expect(page.getByText("5.5 GB available of 31.1 GB")).toBeVisible();
  for (const [label, value] of [
    ["CPU temperature", "75.2°F"],
    ["CPU power", "16.6 W"],
    ["Containers' CPU", "6.6%"],
    ["Containers' memory", "8.6 GiB"],
    ["Up for", "1d 19h"],
  ]) {
    const stat = page.locator(".chakra-stat__root", { hasText: label });
    await expect(stat.locator(".chakra-stat__valueText")).toHaveText(value);
  }

  // The containers by name, the area-prefixed Immich-Server's among them;
  // never the hidden one, the array or an autostart switch.
  await expect(page.getByText("4 of 6 running")).toBeVisible();
  await expect
    .poll(() => names(page, "container"))
    .toEqual(["AdGuard-Home", "binhex-filebrowser", "Immich-Server", "Plex", "radarr", "Valheim2026"]);
  await expect(tile(page, "Immich-Server")).toContainText("Paused");
  await expect(tile(page, "Valheim2026")).toContainText("Stopped");
  // Plex's CPU and memory sensors are enabled; radarr's CPU sensor isn't.
  await expect(tile(page, "Plex")).toContainText("2.1% CPU · 512 MB");
  await expect(tile(page, "radarr")).not.toContainText("CPU");
  // A name cut short on a narrow tile is whole on hover.
  await expect(tile(page, "binhex-filebrowser").getByText("binhex-filebrowser")).toHaveAttribute("title", "binhex-filebrowser");
  expect(errors).toEqual([]);
});

test("Containers and VMs fold away from their headers, the counts still showing, and stay folded through a reload", async ({ page }) => {
  await page.goto("/unraid");
  const header = (title: string) => card(page, title).getByRole("button", { name: new RegExp(title) });
  for (const [title, guest, kind, count] of [
    ["Containers", "Plex", "container", "4 of 6 running"],
    ["VMs", "Windows 11", "vm", "1 of 2 running"],
  ] as const) {
    await expect(tile(page, guest, kind)).toBeVisible();
    await expect(header(title)).toHaveAttribute("aria-expanded", "true");
    await header(title).click();
    await expect(tile(page, guest, kind)).toBeHidden();
    await expect(header(title)).toHaveAttribute("aria-expanded", "false");
    await expect(card(page, title).getByText(count)).toBeVisible();
  }

  await page.reload();
  await expect(header("Containers")).toHaveAttribute("aria-expanded", "false");
  await expect(header("VMs")).toHaveAttribute("aria-expanded", "false");
  await expect(tile(page, "Plex")).toBeHidden();
  await header("Containers").click();
  await expect(tile(page, "Plex")).toBeVisible();
  await expect(tile(page, "Windows 11", "vm")).toBeHidden();
});

test("on a desktop, the server and its VMs are a column beside the containers, kept in view as the page scrolls", async ({ page, isMobile }) => {
  test.skip(isMobile, "a phone's cards are one column (the next test)");
  await page.goto("/unraid");
  await expect(page.getByText("4 of 6 running")).toBeVisible();
  await entered(page);
  const server = await box(card(page, "UnServer"));
  const vms = await box(card(page, "VMs"));
  const containers = await box(card(page, "Containers"));
  // The server's card over its VMs', the containers to their right, level
  // with the server's, and the whole column on a 1080p screen.
  expect(Math.abs(vms.x - server.x)).toBeLessThan(1);
  expect(vms.y).toBeGreaterThan(server.y + server.height);
  expect(containers.x).toBeGreaterThan(server.x + server.width);
  expect(Math.abs(containers.y - server.y)).toBeLessThan(1);
  expect(vms.y + vms.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  // In the column the meters stack, and the VMs are two across.
  const cpu = await box(page.getByRole("progressbar", { name: "CPU usage" }));
  const memory = await box(page.getByRole("progressbar", { name: "Memory usage" }));
  expect(memory.y).toBeGreaterThan(cpu.y + cpu.height);
  const ha = await box(tile(page, "Home Assistant", "vm"));
  const windows = await box(tile(page, "Windows 11", "vm"));
  expect(Math.abs(windows.y - ha.y)).toBeLessThan(1);
  expect(windows.x).toBeGreaterThan(ha.x + ha.width);

  // Dozens of containers, as a real server has (a stand-in for them: the
  // card made tall): scrolled past them, the column stays where it was.
  await card(page, "Containers").evaluate((el) => void ((el as HTMLElement).style.minHeight = "3000px"));
  await splashGone(page);
  await page.mouse.move(containers.x + 40, containers.y + 40);
  await page.mouse.wheel(0, 1500);
  await expect.poll(async () => (await box(card(page, "Containers"))).y).toBeLessThan(containers.y - 1000);
  const stuck = await box(card(page, "UnServer"));
  expect(Math.abs(stuck.y - server.y)).toBeLessThan(1);
  expect((await box(card(page, "VMs"))).y).toBeCloseTo(vms.y, 0);
});

test("on a phone, one column: the server, its VMs, then the containers", async ({ page, isMobile }) => {
  test.skip(!isMobile, "a desktop has two columns (the test before)");
  await page.goto("/unraid");
  await expect(page.getByText("4 of 6 running")).toBeVisible();
  await entered(page);
  const server = await box(card(page, "UnServer"));
  const vms = await box(card(page, "VMs"));
  const containers = await box(card(page, "Containers"));
  for (const b of [vms, containers]) {
    expect(Math.abs(b.x - server.x)).toBeLessThan(1);
    expect(Math.abs(b.width - server.width)).toBeLessThan(1);
  }
  expect(vms.y).toBeGreaterThan(server.y + server.height);
  expect(containers.y).toBeGreaterThan(vms.y + vms.height);
});

test("the VMs, read from libvirt's state", async ({ page }) => {
  await page.goto("/unraid");
  await expect(page.getByRole("heading", { name: "VMs" })).toBeVisible();
  await expect(page.getByText("1 of 2 running")).toBeVisible();
  await expect.poll(() => names(page, "vm")).toEqual(["Home Assistant", "Windows 11"]);
  await expect(tile(page, "Home Assistant", "vm")).toContainText("Running");
  await expect(tile(page, "Windows 11", "vm")).toContainText("Stopped");
});

test("read only: no switch on the page, and the server won't switch a container or a VM if asked", async ({ page }) => {
  await page.goto("/unraid");
  await expect(page.getByText("4 of 6 running")).toBeVisible();
  await expect(page.locator('[data-guest] [data-scope="switch"]')).toHaveCount(0);
  await expect(page.locator("[data-guest]").getByRole("checkbox")).toHaveCount(0);

  // Asked over the socket anyway, as a page could, the server turns it away
  // (ha-socket.js's callableSwitch) and Home Assistant never hears of it.
  await page.addScriptTag({ url: "/socket.io/socket.io.js" });
  const answers = await page.evaluate(async () => {
    type Io = (opts: object) => { emit: (...a: unknown[]) => void; close: () => void; on: (e: string, f: () => void) => void };
    const socket = (window as unknown as { io: Io }).io({ transports: ["websocket"] });
    await new Promise<void>((resolve) => socket.on("connect", resolve));
    const ask = (entity_id: string) =>
      new Promise((resolve) => socket.emit("entity:call", { domain: "switch", service: "turn_off", entity_id }, resolve));
    const out = [await ask("switch.unserver_container_plex"), await ask("switch.unserver_vm_home_assistant")];
    socket.close();
    return out;
  });
  expect(answers).toEqual([
    { ok: false, error: "The server doesn't pass that call on" },
    { ok: false, error: "The server doesn't pass that call on" },
  ]);
  expect((await stubState(page, "switch.unserver_container_plex"))?.state).toBe("on");
  expect((await stubState(page, "switch.unserver_vm_home_assistant"))?.state).toBe("on");
});

test("a container's state from elsewhere shows live", async ({ page, request }) => {
  await page.goto("/unraid");
  await expect(tile(page, "radarr")).toContainText("Running");
  await stub(request, "/_stub/state", { entity_id: "switch.unserver_container_radarr", state: "off", attributes: { status: "EXITED" } });
  await expect(tile(page, "radarr")).toContainText("Stopped");
  await expect(page.getByText("3 of 6 running")).toBeVisible();
});

test("the rail offers Unraid while Home Assistant has a server", async ({ page, isMobile }) => {
  test.skip(isMobile, "a remote starts with Unraid off in its nav");
  await page.goto("/home");
  const rail = page.locator('[data-nav="rail"]');
  await rail.getByRole("tab", { name: "Unraid" }).click();
  await expect(page).toHaveURL(/\/unraid$/);
  await expect(page.getByRole("heading", { name: "UnServer" })).toBeVisible();
});
