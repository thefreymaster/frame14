import { describe, expect, it } from "vitest";
import { pageOf } from "../../src/lib/pagePath";

describe("pageOf", () => {
  it("is the pathname's first segment: a page, with or without its tab", () => {
    expect(pageOf("/energy")).toBe("/energy");
    expect(pageOf("/energy/circuits")).toBe("/energy");
    expect(pageOf("/weather/radar")).toBe("/weather");
    expect(pageOf("/control/device")).toBe("/control");
    expect(pageOf("/home")).toBe("/home");
    expect(pageOf("/")).toBe("/");
  });
});
