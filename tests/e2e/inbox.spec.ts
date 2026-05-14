import { expect, test } from "@playwright/test";

test("inbox supports search, AI draft, and compose", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByPlaceholder("Search mail")).toBeVisible();
  await page.getByPlaceholder("Search mail").fill("assignment");
  const assignment = page.getByRole("button", { name: /Claude Code assignment follow-up/ });
  await expect(assignment).toBeVisible();

  await assignment.click();
  await page.getByRole("button", { name: "Draft" }).click();
  await expect(page.getByRole("region", { name: "Compose" })).toBeVisible();
  await expect(page.getByPlaceholder("Subject")).toHaveValue(/Re: Claude Code assignment follow-up/);
});

test("desktop inbox supports account switch and archive", async ({ page }) => {
  test.skip(test.info().project.name.includes("mobile"), "desktop-only account rail flow");

  await page.goto("/");

  await page.getByRole("button", { name: "Office 365 2" }).click();
  const vendorMessage = page.getByRole("button", { name: /Vendor security questionnaire/ });
  await expect(vendorMessage).toBeVisible();
  await vendorMessage.click();
  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByRole("button", { name: /Vendor security questionnaire/ })).toHaveCount(0);
});
