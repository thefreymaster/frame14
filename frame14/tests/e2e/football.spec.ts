import { expect, test, type APIRequestContext, type Browser, type BrowserContextOptions, type Page } from "@playwright/test";
import { scoreboardLayoutFor, scoreboardUnit } from "../../src/lib/scoreboardLayout";
import { resetStub, splashGone, stub } from "./helpers";
import { APP_URL } from "./ports";

// The /football score bug goes by its own box (0.178.1). It went by the
// window — every size a vmin, the broadcast row whenever the window was
// landscape — and with a game pinned over the app on the frame, a window a
// hair wider than tall, that row was drawn in a third less width than it
// takes: the names cut to "F…", both scores over the clock (the user: "the
// football should be more responsive for smaller screen sizes like this").
// A 16:9 desktop had the same fault with a score of two figures.

// The fourth quarter of a game with two figures a side, the ball with the
// visitors: the widest a team's line gets.
const GAME = {
  league: "NCAAF",
  tv_network: "ACC Network",
  venue: "Doak Campbell Stadium",
  team_name: "Florida State",
  team_abbr: "FSU",
  team_id: "52",
  team_homeaway: "home",
  team_record: "5-5",
  team_rank: 12,
  team_score: "24",
  team_timeouts: 3,
  team_win_probability: 0.75,
  team_colors: ["#782f40", "#ceb888"],
  opponent_name: "NC State",
  opponent_abbr: "NCSU",
  opponent_id: "152",
  opponent_homeaway: "away",
  opponent_record: "4-6",
  opponent_rank: null,
  opponent_score: "28",
  opponent_timeouts: 2,
  opponent_win_probability: 0.25,
  opponent_colors: ["#cc0000", "#ffffff"],
  quarter: 4,
  clock: "12:45",
  possession: "152",
  down_distance_text: "2nd & 13 at NCSU 31",
  last_play:
    "(08:37) No Huddle-Shotgun #11 C.Bailey pass complete short left to #7 D.Gause caught at NCS28, for 2 yards to the NCS31 (#12 N.Chandler)",
};

const kickOff = (request: APIRequestContext) =>
  stub(request, "/_stub/state", { entity_id: "sensor.teamtracker_fsu", state: "IN", attributes: GAME });

// The frame: an upright 1600x2400 Android tablet. And the same tablet with a
// game pinned over the app — Android's split screen: the window is the
// screen's width and a little over half its height, on the same screen.
const TABLET =
  "Mozilla/5.0 (Linux; Android 14; SM-X910 Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Safari/537.36";
const FRAME: BrowserContextOptions = {
  viewport: { width: 1600, height: 2400 },
  screen: { width: 1600, height: 2400 },
  userAgent: TABLET,
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1,
};
const SHARED: BrowserContextOptions = { ...FRAME, viewport: { width: 1600, height: 1490 } };

/** /football on a frame of that shape. */
async function frame(browser: Browser, options: BrowserContextOptions): Promise<Page> {
  const context = await browser.newContext({ baseURL: APP_URL, ...options });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem("device-mode", "frame"));
  await page.goto("/football");
  await splashGone(page);
  await expect(page.locator("[data-scoreboard]")).toBeVisible();
  return page;
}

/** The scoreboard as laid out: its box, the arrangement and unit the stylesheet picked, and where each part is. */
const scoreboard = (page: Page) =>
  page.locator("[data-scoreboard]").evaluate((root) => {
    const box = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    };
    const cut = (el: Element) => el.scrollWidth - el.clientWidth;
    const board = root.querySelector("[data-scoreboard-board]")!;
    // A unit, measured: a hundred of them, as a width.
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;height:0;width:calc(var(--scoreboard-unit) * 100)";
    board.append(probe);
    const unit = probe.getBoundingClientRect().width / 100;
    probe.remove();
    const teams = [...root.querySelectorAll("[data-team]")].map((team) => {
      const name = team.querySelector("[data-team-name]")!;
      const status = team.querySelector("[data-team-status]")!;
      const score = team.querySelector("[data-team-score]");
      // The digits' box is half as tall again as its type, the room they
      // roll through: the figures themselves are the middle of it.
      const type = score ? parseFloat(getComputedStyle(score).fontSize) : 0;
      const figures = score ? box(score) : null;
      if (figures) {
        figures.top += type * 0.25;
        figures.bottom -= type * 0.25;
      }
      return {
        row: box(team),
        body: box(team.querySelector("[data-team-body]")!),
        name: name.textContent,
        nameBox: box(name),
        nameCut: cut(name),
        statusCut: Math.max(cut(status), ...[...status.children].map(cut)),
        statusEnd: box(status.lastElementChild!).right,
        statusBox: box(status),
        figures,
        type,
      };
    });
    const r = root.getBoundingClientRect();
    const clock = root.querySelector("[data-scoreboard-clock] > *")!;
    const last = board.lastElementChild!;
    return {
      width: r.width,
      height: r.height,
      layout: getComputedStyle(board).getPropertyValue("--scoreboard-layout").trim(),
      unit,
      teams,
      clock: box(clock),
      clockCut: cut(clock),
      // The board's last band — the play, the odds or the teams — against its foot.
      over: last.getBoundingClientRect().bottom - r.bottom,
    };
  });

type Scoreboard = Awaited<ReturnType<typeof scoreboard>>;
type Box = Scoreboard["clock"];

/** Where the teams' rows are, to tell a layout that is still moving from one that has come to rest. */
const rowsOf = (board: Scoreboard) => board.teams.map((team) => `${team.row.top},${team.row.bottom}`).join(" ");

const overlap = (a: Box, b: Box) =>
  a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;

/** Everything whole and in its own place: no name cut, no score over the clock, nothing past its row. */
function expectWhole(board: Scoreboard, { scores = true } = {}) {
  expect(board.teams).toHaveLength(2);
  // The stylesheet's pick and its unit are the numbers' (lib/scoreboardLayout).
  expect(board.layout).toBe(scoreboardLayoutFor(board.width, board.height));
  expect(board.unit).toBeCloseTo(scoreboardUnit(board.width, board.height), 1);
  expect(board.clockCut).toBeLessThanOrEqual(1);
  expect(board.over).toBeLessThanOrEqual(1);
  for (const team of board.teams) {
    // The whole name, and the whole line under it.
    expect(team.nameCut, `${team.name} is cut`).toBeLessThanOrEqual(1);
    expect(team.statusCut, `${team.name}'s record or timeouts are cut`).toBeLessThanOrEqual(1);
    // Inside the team's own row.
    expect(team.nameBox.top).toBeGreaterThanOrEqual(team.row.top - 1);
    expect(team.statusBox.bottom).toBeLessThanOrEqual(team.row.bottom + 1);
    expect(team.nameBox.left).toBeGreaterThanOrEqual(team.body.left - 1);
    expect(team.nameBox.right).toBeLessThanOrEqual(team.body.right + 1);
    if (!scores) {
      expect(team.figures).toBeNull();
      continue;
    }
    const figures = team.figures!;
    expect(figures.left).toBeGreaterThanOrEqual(team.body.left - 1);
    expect(figures.right).toBeLessThanOrEqual(team.body.right + 1);
    expect(figures.top).toBeGreaterThanOrEqual(team.row.top - 1);
    expect(figures.bottom).toBeLessThanOrEqual(team.row.bottom + 1);
    // The line under the name ends before the score begins…
    expect(team.statusEnd).toBeLessThanOrEqual(figures.left + 1);
    // …and neither score is over the clock, nor the name.
    expect(overlap(figures, board.clock), `${team.name}'s score is over the clock`).toBe(false);
    expect(overlap(figures, team.nameBox), `${team.name}'s score is over its name`).toBe(false);
  }
}

test.describe("the scoreboard in the box it is given", () => {
  test.beforeEach(async ({ request }) => {
    await resetStub(request);
    await kickOff(request);
  });

  test.describe("on the frame", () => {
    test.beforeEach(({ isMobile }) => {
      test.skip(isMobile, "the frame's own windows, opened once");
    });

    test("with a game pinned over the app: the teams still a row each, the score beside the name, all of it whole", async ({ browser }) => {
      const page = await frame(browser, SHARED);
      try {
        await expect.poll(async () => (await scoreboard(page)).layout).toBe("wide");
        const board = await scoreboard(page);
        // Landscape by a hair: this was the broadcast row's until 0.178.1.
        expect(board.width).toBeGreaterThan(board.height);
        expectWhole(board);
        // One team over the other, the clock between them.
        const [away, home] = board.teams;
        expect(away.row.bottom).toBeLessThanOrEqual(board.clock.top);
        expect(board.clock.bottom).toBeLessThanOrEqual(home.row.top);
        for (const team of board.teams) {
          // The score stands beside the name and its line, as tall as both.
          expect(team.figures!.left).toBeGreaterThanOrEqual(team.nameBox.right - 1);
          expect(team.figures!.top).toBeLessThan(team.nameBox.bottom);
          expect(team.figures!.bottom).toBeGreaterThan(team.statusBox.top);
        }
        // Still a scoreboard: figures over 250px tall in type, the names a quarter of that.
        expect(away.type).toBeGreaterThan(250);
      } finally {
        await page.context().close();
      }
    });

    test("upright and whole: the name over its score, at the sizes it always had", async ({ browser }) => {
      const page = await frame(browser, FRAME);
      try {
        await expect.poll(async () => (await scoreboard(page)).layout).toBe("tall");
        const board = await scoreboard(page);
        expectWhole(board);
        // A unit is a vmin of 1600x2400, as every size here was written.
        expect(board.unit).toBeCloseTo(16, 1);
        for (const team of board.teams) {
          expect(team.type).toBeCloseTo(352, 0);
          // The name has a line to itself, over the score's.
          expect(team.nameBox.bottom).toBeLessThanOrEqual(team.figures!.top + 1);
        }
      } finally {
        await page.context().close();
      }
    });

    test("goes from one arrangement to the next as the divider is dragged up the screen", async ({ browser }) => {
      const page = await frame(browser, FRAME);
      try {
        // The window alone changes, on the same upright screen — which
        // setViewportSize can't say: it resizes the screen with the window.
        const cdp = await page.context().newCDPSession(page);
        for (const [height, layout] of [
          [2400, "tall"],
          [1700, "wide"],
          [1490, "wide"],
          [1180, "wide"],
          [800, "broadcast"],
        ] as const) {
          await cdp.send("Emulation.setDeviceMetricsOverride", {
            width: 1600,
            height,
            deviceScaleFactor: 1,
            mobile: true,
            screenWidth: 1600,
            screenHeight: 2400,
            screenOrientation: { type: "portraitPrimary", angle: 0 },
          });
          // (Laid out again a moment after the resize, not at once: until
          // two looks in a row are the same.)
          let last = "";
          await expect
            .poll(async () => {
              const board = await scoreboard(page);
              const now = `${board.width}x${board.height} ${board.layout} ${rowsOf(board)}`;
              const still = now === last;
              last = now;
              return still && board.layout;
            }, { message: `a 1600x${height} window` })
            .toBe(layout);
          const board = await scoreboard(page);
          expectWhole(board);
          // The bar is still under it: the board is the window's width.
          expect(board.width).toBeGreaterThan(1500);
        }
      } finally {
        await page.context().close();
      }
    });

    test("before kickoff, a preview with no scores, inside its rows all the same", async ({ browser, request }) => {
      // (Kickoff today, whatever the hour the suite runs at: the page is the game day's.)
      await stub(request, "/_stub/state", {
        entity_id: "sensor.teamtracker_fsu",
        state: "PRE",
        attributes: { ...GAME, date: new Date().toISOString(), kickoff_in: "in a moment", possession: null, down_distance_text: null, last_play: null },
      });
      const page = await frame(browser, SHARED);
      try {
        await expect.poll(async () => (await scoreboard(page)).layout).toBe("wide");
        expectWhole(await scoreboard(page), { scores: false });
      } finally {
        await page.context().close();
      }
    });
  });

  test("a desktop keeps the broadcast row, with room for a score of two figures beside the down", async ({ page, isMobile }) => {
    test.skip(isMobile, "a desktop's");
    await page.addInitScript(() => localStorage.setItem("device-mode", "frame"));
    await page.goto("/football");
    await splashGone(page);
    await expect.poll(async () => (await scoreboard(page)).layout).toBe("broadcast");
    const board = await scoreboard(page);
    // By the window's height alone the 28 ran into "4TH 12:45".
    expectWhole(board);
    // Cap, team, clock, team, cap across one row.
    const [away, home] = board.teams;
    expect(away.row.right).toBeLessThanOrEqual(board.clock.left);
    expect(board.clock.right).toBeLessThanOrEqual(home.row.left);
    expect(Math.abs(away.row.top - home.row.top)).toBeLessThanOrEqual(1);
  });

  test("a phone's stacks the teams and fills the page under the header", async ({ page, isMobile }) => {
    test.skip(!isMobile, "a phone's");
    await page.goto("/football");
    await splashGone(page);
    await expect.poll(async () => (await scoreboard(page)).layout).toBe("tall");
    const board = await scoreboard(page);
    expectWhole(board);
    // A remote's page scrolls, and a size container has no height of its
    // own: it takes the page's, between the header and the bar.
    const bar = await page.locator('[data-nav="bar"]').boundingBox();
    expect(board.height).toBeGreaterThan(page.viewportSize()!.height / 2);
    expect(board.teams[1].row.bottom).toBeLessThan(bar!.y);
  });
});
