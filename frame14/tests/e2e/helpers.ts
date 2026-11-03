import { expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { STUB_URL } from "./ports";

/** A test-only call on the stub Home Assistant (see tests/stub/stub-ha.mjs). */
export async function stub(request: APIRequestContext, path: string, body: unknown = {}) {
  const res = await request.post(`${STUB_URL}${path}`, { data: body });
  expect(res.ok(), `${path} answered ${res.status()}`).toBeTruthy();
  return res.json();
}

/** Every state, registry and service behaviour back as at the stub's start. */
export const resetStub = (request: APIRequestContext) => stub(request, "/_stub/reset");

/** Collects the page's uncaught errors, for a test to assert there were none. */
export function pageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

/**
 * Until the launch splash has left (`#splash`, lib/splash): it covers the
 * page for a second or so after a route mounts while its hand-off plays. A
 * locator's click waits for that itself; a `page.mouse` gesture doesn't, and
 * lands on the splash.
 */
export const splashGone = (page: Page) => page.locator("#splash").waitFor({ state: "detached" });

/** The names of the Lights group's buttons in a camera's full screen (0.144), in order. */
export const lightButtons = (dialog: Locator) =>
  dialog
    .getByRole("group", { name: "Lights" })
    .getByRole("button")
    .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));

/** A light or switch tile, by the name it shows. */
export function lightTile(page: Page, name: string) {
  return page.getByRole("button", { name: new RegExp(`^${name}: `) });
}

/** A nested corner rounder than concentric, as cornersRounderThanConcentric reports it. */
export type CornerFinding = {
  el: string;
  container: string;
  corner: "tl" | "tr" | "br" | "bl";
  radius: number;
  containerRadius: number;
  gap: number;
  max: number;
};

/**
 * Rounded boxes nested in rounded boxes whose corner is rounder than
 * concentric with the container's (0.145.4): an inset outline's radius is the
 * container's less the gap between them, never less than `sm` (a quarter rem)
 * here. Pills and circles are left out, and so are corners too far from the
 * container's to read against it (a gap past twice the two radii). Each
 * one found is described — the element, its container, the corner and the
 * radii — for the test's message; none is the expectation.
 */
export function cornersRounderThanConcentric(page: Page): Promise<CornerFinding[]> {
  return page.evaluate(() => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const floor = 0.25 * rem;
    const corners = (cs: CSSStyleDeclaration) =>
      [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(
        (v) => parseFloat(v) || 0,
      );
    const transparent = (c: string) => !c || c === "transparent" || /rgba\([^)]*,\s*0\)$/.test(c) || /\/\s*0\)$/.test(c);
    // A box that draws something: a picture, a fill, an edge or a shadow.
    const drawn = (el: Element, cs: CSSStyleDeclaration) =>
      ["IMG", "VIDEO", "CANVAS", "IFRAME"].includes(el.tagName) ||
      !transparent(cs.backgroundColor) ||
      (parseFloat(cs.borderTopWidth) > 0 && !transparent(cs.borderTopColor)) ||
      (cs.boxShadow !== "" && cs.boxShadow !== "none");
    const shown = (el: Element, r: DOMRect) =>
      r.width > 1 && r.height > 1 && getComputedStyle(el).visibility !== "hidden";
    const describe = (el: Element) => {
      const label = el.getAttribute("aria-label") ?? el.getAttribute("data-part") ?? "";
      const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 28);
      return `${el.tagName.toLowerCase()}${label ? `[${label}]` : ""} "${text}"`;
    };
    const names = ["tl", "tr", "br", "bl"] as const;
    const out: CornerFinding[] = [];
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (!shown(el, r) || !drawn(el, cs)) continue;
      const ec = corners(cs);
      const rE = Math.max(...ec);
      if (rE <= 0.5 || rE >= Math.min(r.width, r.height) / 2 - 1) continue; // square, or a pill or a circle
      // The nearest rounded container that draws something.
      let container: Element | null = el.parentElement;
      while (container && container !== document.body) {
        const ccs = getComputedStyle(container);
        if (Math.max(...corners(ccs)) > 0.5 && drawn(container, ccs) && shown(container, container.getBoundingClientRect())) break;
        container = container.parentElement;
      }
      if (!container || container === document.body) continue;
      const ac = corners(getComputedStyle(container));
      const aR = container.getBoundingClientRect();
      // Each corner against the container's same corner.
      const gaps = [
        [r.left - aR.left, r.top - aR.top],
        [aR.right - r.right, r.top - aR.top],
        [aR.right - r.right, aR.bottom - r.bottom],
        [r.left - aR.left, aR.bottom - r.bottom],
      ];
      gaps.forEach(([dx, dy], i) => {
        if (dx < -0.5 || dy < -0.5) return; // not inside there
        const gap = Math.max(dx, dy);
        if (gap > 2 * (ac[i] + ec[i])) return; // too far to read against it
        const max = Math.max(ac[i] - gap, floor);
        if (ec[i] > max + 0.75) {
          out.push({
            el: describe(el),
            container: describe(container),
            corner: names[i],
            radius: +ec[i].toFixed(1),
            containerRadius: +ac[i].toFixed(1),
            gap: +gap.toFixed(1),
            max: +max.toFixed(1),
          });
        }
      });
    }
    // One per element and container.
    const seen = new Set<string>();
    return out.filter((f) => !seen.has(`${f.el}|${f.container}`) && !!seen.add(`${f.el}|${f.container}`));
  });
}
