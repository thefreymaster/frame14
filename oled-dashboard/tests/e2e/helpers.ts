import { expect, type APIRequestContext, type Page } from "@playwright/test";
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

/** A light or switch tile, by the name it shows. */
export function lightTile(page: Page, name: string) {
  return page.getByRole("button", { name: new RegExp(`^${name}: `) });
}
