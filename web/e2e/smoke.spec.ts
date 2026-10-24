import { expect, test } from "@playwright/test";

// Smoke: every page renders without a client error, even with no API/chain reachable.
const PAGES = ["/", "/explore", "/register", "/portfolio", "/challenges", "/verify", "/security", "/how-it-works", "/market"];

for (const path of PAGES) {
  test(`renders ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(path);
    await expect(page.getByRole("link", { name: "VeriCanopy" }).first()).toBeVisible();
    expect(errors, `client errors on ${path}`).toEqual([]);
  });
}

test("register wizard pre-checks overlap against the API", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("button", { name: /Example: overlaps the Tapajós block/ }).click();
  await page.getByRole("button", { name: /Compute H3 cells/ }).click();
  // either the API answers (conflict/ok panel) or it is down (error box); both must be visible, never a blank page
  await expect(page.locator("text=/Overlap detected|No overlap|Something went wrong|fetch|Failed/").first()).toBeVisible({ timeout: 20_000 });
});

test("security page states the post-quantum scope honestly", async ({ page }) => {
  await page.goto("/security");
  await expect(page.getByText("zk proofs (Halo2 + KZG)")).toBeVisible();
  await expect(page.getByText(/❌ No \(pairing-based\)/)).toBeVisible();
});
