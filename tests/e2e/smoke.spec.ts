import { expect, test } from "@playwright/test";

test("landing page renders the Google CTA", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Save, organize, and sync your bookmarks effortlessly",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
});

test("unauthenticated users are redirected away from the app route", async ({
  page,
}) => {
  await page.goto("/app");

  await expect(page).toHaveURL(/\/(\?auth=signin-required)?$/);
});
