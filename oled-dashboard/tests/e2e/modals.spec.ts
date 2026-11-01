import { expect, test } from "@playwright/test";
import { resetStub } from "./helpers";

test.describe("modals", () => {
  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  // 0.134: on a phone every modal is a drawer that comes in from the bottom
  // (components/Modal); the frame and a desktop keep centred dialogs.
  test("a phone's modal is a drawer from the bottom, a wider screen's a centred dialog", async ({ page, isMobile }) => {
    await page.goto("/home");
    await page.getByRole("button", { name: "Show energy detail" }).click();
    const modal = page.getByRole("dialog");
    await expect(modal.getByText("Solar produced")).toBeVisible();
    const viewport = page.viewportSize()!;

    if (isMobile) {
      await expect(modal).toHaveClass(/chakra-drawer__content/);
      // The screen's width, on its bottom edge, short of its top.
      await expect
        .poll(async () => {
          const box = await modal.boundingBox();
          return box && [box.x, Math.round(box.width), Math.round(box.y + box.height)];
        })
        .toEqual([0, viewport.width, viewport.height]);
      expect((await modal.boundingBox())!.y).toBeGreaterThan(0);
      // The cards' corners at its top, square at the bottom.
      const corners = await modal.evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.borderTopLeftRadius, s.borderBottomLeftRadius];
      });
      expect(corners[0]).not.toBe("0px");
      expect(corners[1]).toBe("0px");
    } else {
      await expect(modal).toHaveClass(/chakra-dialog__content/);
      await expect
        .poll(async () => {
          const box = await modal.boundingBox();
          return box && Math.round(box.x + box.width / 2);
        })
        .toBe(Math.round(viewport.width / 2));
      expect((await modal.boundingBox())!.width).toBeLessThan(viewport.width / 2);
    }

    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
  });
});
