import { describe, expect, it } from "vitest";
import {
  BROADCAST,
  BROADCAST_FROM,
  SCOREBOARD_BOX,
  WIDE,
  WIDE_FROM,
  scoreboardLayoutFor,
  scoreboardUnit,
  u,
  unitCss,
  type ScoreboardLayout,
} from "../../src/lib/scoreboardLayout";

// 0.178.1: the /football score bug goes by its own box. These are the
// numbers; that the stylesheet says the same in a real page is
// football.spec's.

// The scoreboard's box on the screens it is drawn for: the page less the
// header, the nav and the gutters.
const BOXES = {
  // The frame, 1600x2400, the bar under the page.
  frame: [1544, 2127],
  // The frame with a game pinned over the app: a 1600x1490 window.
  shared: [1548, 1236],
  // The same, the screen split down the middle.
  halved: [1559, 979],
  // A 1920x1080 desktop, the rail beside the page.
  desktop: [1769, 990],
  // A phone, and the phone on its side.
  phone: [396, 699],
  phoneOnItsSide: [735, 284],
} as const;

describe("scoreboardLayoutFor", () => {
  it("stacks the teams on the upright frame and a phone", () => {
    expect(scoreboardLayoutFor(...BOXES.frame)).toBe("tall");
    expect(scoreboardLayoutFor(...BOXES.phone)).toBe("tall");
  });

  it("keeps them stacked, the score beside the name, where the frame's screen is shared", () => {
    // Landscape by a hair: the broadcast row was drawn here until 0.178.1.
    expect(scoreboardLayoutFor(...BOXES.shared)).toBe("wide");
    expect(scoreboardLayoutFor(...BOXES.halved)).toBe("wide");
  });

  it("lays them across one row on a desktop and a phone on its side", () => {
    expect(scoreboardLayoutFor(...BOXES.desktop)).toBe("broadcast");
    expect(scoreboardLayoutFor(...BOXES.phoneOnItsSide)).toBe("broadcast");
  });

  it("changes at the shapes it names, as a min-aspect-ratio query does", () => {
    const [ww, wh] = WIDE_FROM;
    expect(scoreboardLayoutFor(ww * 100 - 1, wh * 100)).toBe("tall");
    expect(scoreboardLayoutFor(ww * 100, wh * 100)).toBe("wide");
    const [bw, bh] = BROADCAST_FROM;
    expect(scoreboardLayoutFor(bw * 100 - 1, bh * 100)).toBe("wide");
    expect(scoreboardLayoutFor(bw * 100, bh * 100)).toBe("broadcast");
  });

  it("gives two games on one day, half the frame each, a board that fits its half", () => {
    // Each is wider than tall there, where the whole frame is not.
    expect(scoreboardLayoutFor(1544, 1049)).toBe("wide");
  });
});

describe("scoreboardUnit", () => {
  it("is the frame's vmin on the frame, as every size there was drawn", () => {
    // 1vmin of 1600x2400.
    expect(scoreboardUnit(...BOXES.frame)).toBeCloseTo(16, 1);
  });

  it("never draws an arrangement larger than the box it is in", () => {
    for (const [width, height] of Object.values(BOXES)) {
      const unit = scoreboardUnit(width, height);
      const box = SCOREBOARD_BOX[scoreboardLayoutFor(width, height)];
      expect(box.width * unit).toBeLessThanOrEqual(width + 1e-6);
      expect(box.height * unit).toBeLessThanOrEqual(height + 1e-6);
    }
  });

  it("goes by whichever of the box's sides runs out first", () => {
    // A box much wider than the rows need: its height.
    expect(scoreboardUnit(...BOXES.halved)).toBeCloseTo(979 / SCOREBOARD_BOX.wide.height, 5);
    // A desktop's row with a 28 in it: its width, not the window's height.
    expect(scoreboardUnit(...BOXES.desktop)).toBeCloseTo(1769 / SCOREBOARD_BOX.broadcast.width, 5);
  });

  it("doesn't jump as a box goes from the tall rows to the wide ones", () => {
    const [w, h] = WIDE_FROM;
    const tall = scoreboardUnit(w * 100 - 1, h * 100);
    const wide = scoreboardUnit(w * 100, h * 100);
    expect(Math.abs(wide - tall) / tall).toBeLessThan(0.01);
  });

  it("is smaller on the shared frame than on the whole one, and still a scoreboard's", () => {
    const shared = scoreboardUnit(...BOXES.shared);
    expect(shared).toBeLessThan(scoreboardUnit(...BOXES.frame));
    // The score is 22 units: over 250px of the 1236 there are.
    expect(shared * 22).toBeGreaterThan(250);
  });
});

describe("the stylesheet's half", () => {
  it("works a unit out from the container's own width and height", () => {
    const layouts: ScoreboardLayout[] = ["tall", "wide", "broadcast"];
    for (const layout of layouts) {
      const { width, height } = SCOREBOARD_BOX[layout];
      const [, perWidth, perHeight] = unitCss(layout).match(/^min\(([\d.]+)cqw, ([\d.]+)cqh\)$/) ?? [];
      // 1cqw is a hundredth of the container's width.
      expect(Number(perWidth)).toBeCloseTo(100 / width, 3);
      expect(Number(perHeight)).toBeCloseTo(100 / height, 3);
    }
  });

  it("asks the scoreboard's container for the shapes the numbers name", () => {
    expect(BROADCAST).toBe("@container scoreboard (min-aspect-ratio: 17/10)");
    // Not both at once: the wide rows stop where the row begins.
    expect(WIDE).toBe("@container scoreboard (min-aspect-ratio: 24/25) and (not (min-aspect-ratio: 17/10))");
  });

  it("writes a length as so many units, with a floor where one is given", () => {
    expect(u(22)).toBe("calc(var(--scoreboard-unit) * 22)");
    expect(u(-0.4)).toBe("calc(var(--scoreboard-unit) * -0.4)");
    expect(u(2.2, "0.6875rem")).toBe("max(calc(var(--scoreboard-unit) * 2.2), 0.6875rem)");
  });
});
