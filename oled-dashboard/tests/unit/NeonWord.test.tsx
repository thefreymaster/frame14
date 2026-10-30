import { describe, expect, it } from "vitest";
import { NeonWord } from "../../src/components/halloween/NeonWord";
import { NEON } from "../../src/lib/halloween";
import { renderWithProviders } from "./helpers/render";

describe("NeonWord", () => {
  it("is a tube per letter in the neon colours in turn, hidden from a reader, with glints over it", () => {
    const { container } = renderWithProviders(
      <NeonWord word="Boo" size="2rem" from={2} flicker={1} sparkles={5} />,
    );
    const letters = [...container.querySelectorAll('span[aria-hidden="true"]')];
    expect(letters.map((l) => l.textContent)).toEqual(["B", "o", "o"]);
    // Styles via Chakra's class names aren't readable here; the inline ones are.
    expect(letters[1].getAttribute("style")).toContain("hw-flicker");
    expect(letters[0].getAttribute("style")).toContain("hw-shimmer");
    expect(letters[0].getAttribute("style")).not.toContain("hw-flicker");
    // The glints: five, decorative, each on its own cycle.
    const glints = container.querySelectorAll('[aria-hidden="true"] svg');
    expect(glints).toHaveLength(5);
    for (const g of glints) expect(g.getAttribute("style")).toContain("hw-glint");
    expect(NEON).toHaveLength(4);
  });
});
