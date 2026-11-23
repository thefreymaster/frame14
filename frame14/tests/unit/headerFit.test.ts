import { afterEach, describe, expect, it, vi } from "vitest";
import { fitHeader, watchHeaderFit } from "../../src/lib/headerFit";

// 0.176.0: the header's buttons sit in its middle, and when the row has no
// room for everything it gives up the name, then the theme's toggle, then
// (0.181.0) the arrows of an update being installed (StatusBanner). Which is found from the layout: jsdom has none, so the
// columns each level would come to are made up here — what a real page
// lays out is header.spec's.

/** A row 374px wide inside, whose columns are whatever `columns` says for the level it wears. */
function row(columns: (level: string | undefined) => string) {
  const el = document.createElement("div");
  document.body.append(el);
  Object.defineProperty(el, "clientWidth", { value: 390 });
  const real = window.getComputedStyle;
  vi.spyOn(window, "getComputedStyle").mockImplementation((target, pseudo) => {
    if (target !== el) return real(target, pseudo);
    return {
      gridTemplateColumns: columns(el.dataset.headerFit),
      paddingLeft: "8px",
      paddingRight: "8px",
    } as CSSStyleDeclaration;
  });
  return el;
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("the header's fit", () => {
  it("keeps everything while the columns fit the row", () => {
    const el = row(() => "116px 176px 82px");
    expect(fitHeader(el)).toBe("all");
    expect(el.dataset.headerFit).toBe("all");
  });

  it("gives up the name when the columns are wider than the row with it", () => {
    // With the name the three come to 440px; without it they fit.
    const el = row((level) => (level === "all" ? "116px 324px 0px" : "32px 324px 18px"));
    expect(fitHeader(el)).toBe("icon");
    expect(el.dataset.headerFit).toBe("icon");
  });

  it("gives up the theme's toggle too when the icon alone still leaves no room", () => {
    const el = row((level) => (level === "tight" ? "32px 324px 18px" : level === "icon" ? "32px 360px 0px" : "116px 360px 0px"));
    expect(fitHeader(el)).toBe("tight");
    expect(el.dataset.headerFit).toBe("tight");
  });

  // 0.181.0: an update being installed is one more status icon, and on the
  // busiest day the one that gives way — after the theme's toggle.
  it("gives up the arrows of an install when the toggle's going still leaves no room", () => {
    const widths: Record<string, string> = {
      all: "116px 180px 220px",
      icon: "32px 180px 220px",
      tight: "32px 144px 220px",
      bare: "32px 144px 184px",
    };
    const el = row((level) => widths[level ?? "all"]);
    expect(fitHeader(el)).toBe("bare");
    expect(el.dataset.headerFit).toBe("bare");
  });

  it("stops at the least it can be when nothing fits", () => {
    const el = row(() => "32px 500px 0px");
    expect(fitHeader(el)).toBe("bare");
  });

  it("counts a column that fills the row to the half pixel as fitting", () => {
    expect(fitHeader(row(() => "116.3px 248px 10.1px"))).toBe("all");
    // A whole pixel over is over.
    expect(fitHeader(row((level) => (level === "all" ? "116px 248px 11px" : "32px 248px 94px")))).toBe("icon");
  });

  it("gives up nothing where there is no layout to read", () => {
    expect(fitHeader(row(() => "1fr auto 1fr"))).toBe("all");
    expect(fitHeader(row(() => ""))).toBe("all");
    expect(fitHeader(row(() => "none"))).toBe("all");
  });
});

describe("watching the header's fit", () => {
  it("fits at once, again when a button comes or goes, and no more once stopped", async () => {
    let buttons = 5;
    const el = row(() => (buttons > 5 && el.dataset.headerFit === "all" ? "116px 324px 0px" : "32px 176px 166px"));
    const group = document.createElement("div");
    el.append(group);
    const stop = watchHeaderFit(el, group);
    expect(el.dataset.headerFit).toBe("all");

    // A washer starts: its icon joins the group.
    buttons = 9;
    group.append(document.createElement("button"));
    await vi.waitFor(() => expect(el.dataset.headerFit).toBe("icon"));

    // The fit's own writing — an attribute on the row — isn't a change it watches.
    const fits = vi.mocked(window.getComputedStyle).mock.calls.length;
    await new Promise((done) => setTimeout(done, 20));
    expect(vi.mocked(window.getComputedStyle).mock.calls.length).toBe(fits);

    stop();
    buttons = 5;
    group.replaceChildren();
    await new Promise((done) => setTimeout(done, 20));
    expect(el.dataset.headerFit).toBe("icon");
  });

  // 0.176.1: the status icons (the appliances, the connection) are a group
  // of their own, apart from the buttons, and an appliance starting is a
  // change in it.
  it("watches every group it is handed: the buttons and the status icons", async () => {
    let icons = 2;
    const el = row(() => (icons > 2 && el.dataset.headerFit === "all" ? "116px 176px 200px" : "32px 176px 166px"));
    const buttons = document.createElement("div");
    const status = document.createElement("div");
    el.append(buttons, status);
    const stop = watchHeaderFit(el, [buttons, status]);
    expect(el.dataset.headerFit).toBe("all");

    // A dishwasher starts: its icon joins the status icons.
    icons = 3;
    status.append(document.createElement("button"));
    await vi.waitFor(() => expect(el.dataset.headerFit).toBe("icon"));

    // And it ends: the other group changes too, and is heard as well.
    icons = 2;
    status.replaceChildren();
    buttons.append(document.createElement("button"));
    await vi.waitFor(() => expect(el.dataset.headerFit).toBe("all"));
    stop();
  });
});
