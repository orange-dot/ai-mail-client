import { expect, test } from "@playwright/test";

test("setup screen opens from ?setup= and saves Gmail credentials", async ({ page }) => {
  await page.goto("/?setup=gmail&reason=missing-credentials");

  const dialog = page.getByRole("dialog", { name: "Set up credentials" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Add your Google credentials below to connect Gmail.")).toBeVisible();

  await dialog.getByLabel("Client ID").fill("demo-client-id.apps.googleusercontent.com");
  await dialog.getByLabel("Client secret").fill("GOCSPX-demo-secret");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();

  // The settings route persists the encrypted cookie and the Gmail section
  // reports a configured status. No secret value is rendered back.
  await expect(dialog.getByText("Configured")).toBeVisible();
  await expect(dialog.getByText("GOCSPX-demo-secret")).toHaveCount(0);
});

test("setup screen is reachable from the sidebar", async ({ page }) => {
  test.skip(test.info().project.name.includes("mobile"), "desktop-only sidebar entry point");

  await page.goto("/");
  await page.getByRole("button", { name: "Set up credentials" }).click();
  await expect(page.getByRole("dialog", { name: "Set up credentials" })).toBeVisible();
});
