import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ request }) => {
  const response = await request.post("/api/reset");
  expect(response.ok()).toBeTruthy();
});

async function chooseScenario(page: Page, id: string, buttonName: RegExp): Promise<void> {
  if ((page.viewportSize()?.width ?? 1_024) <= 820) {
    await page.getByLabel("Test scenario").selectOption(id);
    return;
  }
  await page.getByRole("button", { name: buttonName }).click();
}

test("runs clean, blocked, and approval workflows", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Normal order lookup" })).toBeVisible();

  await page.getByRole("button", { name: /Run protected request/i }).click();
  await expect(page.getByText("completed", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("lookup order", { exact: true })).toBeVisible();

  await chooseScenario(page, "direct-prompt-injection", /Input attack/i);
  await page.getByRole("button", { name: /Run protected request/i }).click();
  await expect(page.getByText("blocked input", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/stopped before the message reached the model/i)).toBeVisible();

  await chooseScenario(page, "safe-address-change", /Human approval/i);
  await page.getByRole("button", { name: /Run protected request/i }).click();
  await expect(page.getByRole("button", { name: /Approve sandbox action/i })).toBeVisible();
  await page.getByRole("button", { name: /Approve sandbox action/i }).click();

  await page.getByRole("button", { name: "Support" }).click();
  await expect(
    page
      .getByRole("complementary", { name: "Customer and order context" })
      .getByText("8 Bourdillon Road, Ikoyi", { exact: true }),
  ).toBeVisible();
});

test("exposes evidence and integration provenance", async ({ page }) => {
  await page.goto("/");
  await chooseScenario(page, "poisoned-policy", /Context attack/i);
  await page.getByRole("button", { name: /Run protected request/i }).click();
  await expect(page.getByText("blocked context", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Evidence" }).click();
  await expect(page.getByRole("heading", { name: "Security evidence" })).toBeVisible();
  await expect(page.getByText("Context attack", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Integration" }).click();
  await expect(page.getByRole("heading", { name: "Integration map" })).toBeVisible();
  await expect(page.getByText(/simulator · (detect|enforce)/i)).toBeVisible();
});

test("has no horizontal page overflow at representative viewport", async ({ page }) => {
  await page.goto("/");
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(hasOverflow).toBe(false);
});

test("keeps primary navigation reachable on mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile navigation check");
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Primary navigation" });
  await expect(navigation).toBeVisible();
  const navigationBox = await navigation.boundingBox();
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  expect(navigationBox).not.toBeNull();
  expect(
    Math.abs((navigationBox?.y ?? 0) + (navigationBox?.height ?? 0) - viewportHeight),
  ).toBeLessThan(2);

  await page.getByLabel("Test scenario").selectOption("direct-prompt-injection");
  await expect(page.getByRole("heading", { name: "Direct prompt injection" })).toBeVisible();
});

test("has no automatically detectable accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Normal order lookup" })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
