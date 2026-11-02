import { expect, test } from "@playwright/test";
import { lightButtons, resetStub, stub } from "./helpers";

const PERSON = "binary_sensor.front_porch_person_detected";

test.describe("the front-door pop-up", () => {
  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  test("someone at the door pops the camera up, and it goes full screen with the porch's lights (0.144)", async ({ page, request }) => {
    await page.goto("/home");
    await expect(page.getByRole("heading", { name: "Climate" })).toBeVisible();
    await expect(page.getByText("Person detected")).toHaveCount(0);

    // The person sensor's rising edge, over the socket.
    await stub(request, "/_stub/state", { entity_id: PERSON, state: "on" });
    const card = page.locator(".chakra-card__root").filter({ hasText: "Person detected" });
    await expect(card).toBeVisible();
    // Named for the doorbell camera (camera_entity: Front Porch High).
    await expect(card.getByText("Front Porch High")).toBeVisible();
    await expect(card.locator("video, img").first()).toBeAttached();

    await card.getByRole("button", { name: "Full screen" }).click();
    const dialog = page.getByRole("dialog", { name: "Front Porch High" });
    await expect(dialog).toBeVisible();
    // In place of the card, with the picture and the Outside room's lights.
    await expect(card).toHaveCount(0);
    await expect(dialog.locator("video, img").first()).toBeAttached();
    await expect.poll(() => lightButtons(dialog)).toEqual(["Backyard", "Front Porch", "Front Yard"]);
    const porch = dialog.getByRole("button", { name: "Front Porch" });
    await porch.click();
    await expect(porch).toHaveAttribute("aria-pressed", "true");

    // Closing the full screen dismisses the card.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Person detected")).toHaveCount(0);
  });
});
